import { Logger } from '@nestjs/common';
import axios from 'axios';
import { randomUUID } from 'crypto';
import * as crypto from 'crypto';
import { Integration } from '../../common/entities/integration.entity';
import {
  PaymentGateway,
  InitiatePaymentOptions,
  PaymentGatewayResult,
  PaymentWebhookResult,
} from './payment-gateway.interface';
import { EXTERNAL_URLS } from '../../config/app-config';

/**
 * Wrapper NovaSend implementant PaymentGateway.
 * Les clés sont passées via l'Integration chargée depuis la table `integrations`.
 * apiKey est au format "key:secret" (base64 sera calculé lors de l'appel).
 * webhookSecret est utilisé pour la vérification HMAC.
 */
export class NovaSendGateway implements PaymentGateway {
  readonly name = 'novasend';

  private readonly logger = new Logger(NovaSendGateway.name);
  private readonly BASE = EXTERNAL_URLS.novasend;

  // Mapping référence → provider pour enrichir le webhook entrant
  private readonly pendingMap = new Map<string, string>();

  constructor(private readonly integration: Integration) {}

  async initiate(options: InitiatePaymentOptions): Promise<PaymentGatewayResult> {
    const reference = options.metadata?.reference ?? randomUUID();
    if (options.provider) {
      this.pendingMap.set(reference, options.provider);
    }

    if (!this.isConfigured) {
      return this.simulateInitiation(reference, options);
    }
    return this.callApi(reference, options);
  }

  verifyWebhook(payload: any, signature?: string): boolean {
    const secret = this.integration.webhookSecret;
    if (!secret || !signature) return true; // pas de secret configuré → on accepte
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    return signature === expected;
  }

  async handleWebhook(payload: any): Promise<PaymentWebhookResult> {
    const { reference, status, metadata } = payload;

    const FAILED_STATUSES = ['FAILED', 'EXPIRED', 'CANCELLED', 'failed', 'expired', 'cancelled'];
    const SUCCESS_STATUSES = ['SUCCESSFUL', 'success'];

    let normalizedStatus: 'SUCCESS' | 'FAILED' | 'PENDING' = 'PENDING';
    if (SUCCESS_STATUSES.includes(status)) normalizedStatus = 'SUCCESS';
    else if (FAILED_STATUSES.includes(status)) normalizedStatus = 'FAILED';

    return {
      transactionId: reference,
      status: normalizedStatus,
      // Le provider est résolu par la stratégie elle-même (référence trackée à
      // l'initiation) → le contexte n'a pas à connaître NovaSend.
      provider: this.pendingMap.get(reference),
      metadata,
    };
  }

  // ── Helpers privés ────────────────────────────────────────────────────────

  private get isConfigured(): boolean {
    return !!(this.integration.apiKey && this.integration.baseUrl !== undefined);
  }

  private get credentials(): string {
    // apiKey stocké au format "key:secret"
    return Buffer.from(this.integration.apiKey!).toString('base64');
  }

  private get appUrl(): string {
    return this.integration.baseUrl || 'http://localhost:5173';
  }

  private async callApi(
    reference: string,
    options: InitiatePaymentOptions,
  ): Promise<PaymentGatewayResult> {
    const payload: Record<string, any> = {
      reference,
      customerName: options.metadata?.customerName || 'Client',
      payin: {
        amount: options.amount,
        provider: options.provider,
        country: options.currency || 'CI',
        ...(options.phone ? { msisdn: options.phone } : {}),
        ...(options.metadata?.otp ? { otp: options.metadata.otp } : {}),
      },
      action: {
        successUrl: options.returnUrl || `${this.appUrl}/paiement/success`,
        failureUrl: `${this.appUrl}/paiement/failure`,
      },
    };

    try {
      const { data } = await axios.post(`${this.BASE}/direct/payin`, payload, {
        headers: {
          Authorization: `Basic ${this.credentials}`,
          'X-Idempotency-Key': randomUUID(),
          'Content-Type': 'application/json',
        },
        timeout: 15_000,
      });
      return {
        transactionId: data.id,
        paymentUrl: data.paymentUrl,
        status: 'PENDING',
      };
    } catch (err: any) {
      this.logger.error('NovaSendGateway API error', err?.response?.data ?? err.message);
      throw err;
    }
  }

  private simulateInitiation(
    reference: string,
    options: InitiatePaymentOptions,
  ): PaymentGatewayResult {
    const sessionId = `sim_${randomUUID().slice(0, 8)}`;
    const base = this.appUrl;
    return {
      transactionId: sessionId,
      paymentUrl: `${base}/paiement/preview?ref=${reference}&session=${sessionId}&montant=${options.amount}`,
      status: 'PENDING',
    };
  }
}
