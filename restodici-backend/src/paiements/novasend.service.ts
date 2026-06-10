import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { randomUUID } from 'crypto';

// Providers internes — utilisés pour tracker le mode de paiement côté webhook
// CARTE : réservé pour l'intégration carte bancaire NovaSend (à venir)
export type NovaSendProvider = 'WAVE' | 'NOVASEND' | 'ORANGE' | 'MOMO' | 'MOOV' | 'CARTE';

export interface InitiatePaymentParams {
  reference:    string;
  amount:       number;
  customerName: string;
  telephone?:   string;
  provider:     NovaSendProvider; // tracking interne uniquement, non envoyé à l'API
}

export interface InitiatePaymentResult {
  sessionId:   string;
  paymentUrl?: string;
  simulated:   boolean;
}

@Injectable()
export class NovaSendService {
  private readonly logger = new Logger(NovaSendService.name);
  private readonly BASE   = 'https://business.novasend.app/v1';

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

  async initiate(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    this.pendingMap.set(params.reference, params.provider);

    if (!this.isConfigured) {
      return this.simulateInitiation(params);
    }
    return this.callApi(params);
  }

  private async callApi(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    const apiKey      = this.config.get<string>('NOVASEND_API_KEY')!;
    const apiSecret   = this.config.get<string>('NOVASEND_API_SECRET')!;
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const appUrl      = this.config.get<string>('APP_URL') || 'http://localhost:5173';

    // Endpoint documenté : POST /v1/payin/sessions
    // L'opérateur est déduit automatiquement par NovaSend depuis le préfixe msisdn
    const payload: Record<string, any> = {
      reference:    params.reference,
      amount:       params.amount,
      customerName: params.customerName,
      country:      'CI',
      action: {
        successUrl: `${appUrl}/paiement/success`,
        failureUrl: `${appUrl}/paiement/failure`,
      },
    };

    if (params.telephone) {
      payload.msisdn = params.telephone;
    }

    try {
      const { data } = await axios.post(`${this.BASE}/payin/sessions`, payload, {
        headers: {
          Authorization:       `Basic ${credentials}`,
          'X-Idempotency-Key': randomUUID(),
          'Content-Type':      'application/json',
        },
        timeout: 15_000,
      });
      return { sessionId: data.id, paymentUrl: data.paymentUrl, simulated: false };
    } catch (err: any) {
      this.logger.error('NovaSend API error', err?.response?.data ?? err.message);
      throw err;
    }
  }

  private simulateInitiation(params: InitiatePaymentParams): InitiatePaymentResult {
    const sessionId = `sim_${randomUUID().slice(0, 8)}`;
    const appUrl    = this.config.get<string>('APP_URL') || 'http://localhost:5173';

    return {
      sessionId,
      paymentUrl: `${appUrl}/paiement/preview?ref=${params.reference}&session=${sessionId}&montant=${params.amount}`,
      simulated: true,
    };
  }
}
