import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { randomUUID } from 'crypto';
import { EXTERNAL_URLS } from '../config/app-config';
import { toInternationalCiMsisdn, normalizeNovaSendProvider } from './gateways/novasend.gateway';

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
  provider: NovaSendProvider;
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

  private get baseUrl(): string {
    return (
      this.config.get<string>('NOVASEND_BASE_URL') ||
      EXTERNAL_URLS.novasend ||
      'https://business.novasend.app/v1'
    );
  }

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
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const appUrl =
      this.config.get<string>('PAYMENT_RETURN_URL') ||
      this.config.get<string>('PUBLIC_FRONTEND_URL') ||
      this.config.get<string>('FRONTEND_URL') ||
      this.config.get<string>('APP_URL') ||
      'http://localhost:5173';

    const msisdn = toInternationalCiMsisdn(params.telephone);
    const providerCode = normalizeNovaSendProvider(params.provider);

    const action = {
      successUrl: `${appUrl}/paiement/success`,
      failureUrl: `${appUrl}/paiement/failure`,
    };

    // Règle d'acheminement des flux NovaSend :
    // Tous les providers (WAVE, MTN, MOOV, ORANGE) passent par POST /v1/direct/payin
    const url = `${this.baseUrl}/direct/payin`;

    const payload: Record<string, any> = {
      reference: params.reference,
      customerName: params.customerName || 'Client',
      payin: {
        amount: params.amount,
        provider: providerCode,
        country: 'CI',
        ...(msisdn ? { msisdn } : {}),
        ...(params.otp ? { otp: params.otp } : {}),
      },
      action,
    };

    try {
      this.logger.log(`[NovaSendService] Calling ${url} (${providerCode}). Payload: ${JSON.stringify(payload)}`);
      const { data } = await axios.post(url, payload, {
        headers: {
          Authorization: `Basic ${credentials}`,
          'X-Idempotency-Key': randomUUID(),
          'Content-Type': 'application/json',
        },
        timeout: 15_000,
      });
      return {
        sessionId: data?.id || data?.reference || params.reference,
        paymentUrl:
          data?.paymentUrl ||
          data?.checkoutUrl ||
          data?.waveLaunchUrl ||
          data?.url ||
          data?.action?.url ||
          data?.payin?.url ||
          data?.data?.paymentUrl ||
          data?.data?.waveLaunchUrl,
        simulated: false,
      };
    } catch (err: any) {
      if (err?.response?.status === 401) {
        this.logger.warn(`[NovaSendService] 401 Unauthorized de NovaSend API — Basculement en mode simulation.`);
        return this.simulateInitiation(params);
      }
      this.logger.error(
        `NovaSend API error [${providerCode}] (${url}):`,
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

    return {
      sessionId,
      paymentUrl: `${appUrl}/paiement/preview?ref=${params.reference}&session=${sessionId}&montant=${params.amount}`,
      simulated: true,
    };
  }
}
