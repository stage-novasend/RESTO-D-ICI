import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { randomUUID } from 'crypto';
import { EXTERNAL_URLS } from '../config/app-config';

// Providers internes — utilisés pour tracker le mode de paiement côté webhook
// CARTE : réservé pour l'intégration carte bancaire NovaSend (à venir)
export type NovaSendProvider =
  | 'WAVE'
  | 'NOVASEND'
  | 'ORANGE'
  | 'MOMO'
  | 'MOOV'
  | 'CARTE';

export interface InitiatePaymentParams {
  reference: string;
  amount: number;
  customerName: string;
  telephone?: string;
  provider: NovaSendProvider; // tracking interne uniquement, non envoyé à l'API
  otp?: string;
}

export interface InitiatePaymentResult {
  sessionId: string;
  paymentUrl?: string;
  simulated: boolean;
}

@Injectable()
export class NovaSendService {
  private readonly logger = new Logger(NovaSendService.name);
  private readonly BASE = EXTERNAL_URLS.novasend;

  // Mapping référence → provider pour enrichir le webhook entrant
  private readonly pendingMap = new Map<string, NovaSendProvider>();

  constructor(private config: ConfigService) {}

  get isConfigured(): boolean {
    return !!(
      this.config.get<string>('NOVASEND_API_KEY') &&
      this.config.get<string>('NOVASEND_API_SECRET')
    );
  }

  getProvider(reference: string): NovaSendProvider | undefined {
    return this.pendingMap.get(reference);
  }

  async initiate(
    params: InitiatePaymentParams,
  ): Promise<InitiatePaymentResult> {
    this.pendingMap.set(params.reference, params.provider);

    if (!this.isConfigured) {
      return this.simulateInitiation(params);
    }
    return this.callApi(params);
  }

  private async callApi(
    params: InitiatePaymentParams,
  ): Promise<InitiatePaymentResult> {
    const apiKey = this.config.get<string>('NOVASEND_API_KEY')!;
    const apiSecret = this.config.get<string>('NOVASEND_API_SECRET')!;
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString(
      'base64',
    );
    const appUrl =
      this.config.get<string>('APP_URL') || 'http://localhost:5173';

    // Direct Payin (documenté) : POST /v1/direct/payin
    const payload: Record<string, any> = {
      reference: params.reference,
      customerName: params.customerName,
      payin: {
        amount: params.amount,
        provider: params.provider,
        country: 'CI',
        ...(params.telephone ? { msisdn: params.telephone } : {}),
        ...(params.otp ? { otp: params.otp } : {}),
      },
      action: {
        successUrl: `${appUrl}/paiement/success`,
        failureUrl: `${appUrl}/paiement/failure`,
      },
    };

    try {
      const { data } = await axios.post(`${this.BASE}/direct/payin`, payload, {
        headers: {
          Authorization: `Basic ${credentials}`,
          'X-Idempotency-Key': randomUUID(),
          'Content-Type': 'application/json',
        },
        timeout: 15_000,
      });

      const paymentUrl =
        data.paymentUrl ||
        data.payment_url ||
        data.wave_launch_url ||
        data.checkout_url ||
        data.action?.url ||
        data.actionUrl ||
        data.url ||
        data.session_url;

      return {
        sessionId: data.id || data.sessionId || `session_${randomUUID().slice(0, 8)}`,
        paymentUrl,
        simulated: false,
      };
    } catch (err: any) {
      this.logger.error(
        'NovaSend API error',
        err?.response?.data ?? err.message,
      );
      throw err;
    }
  }

  private simulateInitiation(
    params: InitiatePaymentParams,
  ): InitiatePaymentResult {
    const sessionId = `sim_${randomUUID().slice(0, 8)}`;
    const appUrl =
      this.config.get<string>('APP_URL') || 'http://localhost:5173';

    const paymentUrl =
      params.provider === 'WAVE'
        ? `${appUrl}/paiement/preview?ref=${params.reference}&session=${sessionId}&montant=${params.amount}&provider=WAVE`
        : `${appUrl}/paiement/preview?ref=${params.reference}&session=${sessionId}&montant=${params.amount}`;

    return {
      sessionId,
      paymentUrl,
      simulated: true,
    };
  }
}
