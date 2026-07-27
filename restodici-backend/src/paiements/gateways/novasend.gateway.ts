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
import { normalizeCiNumber } from '../phone.util';

/** Formate un numéro CI au format international attendu par NovaSend (+225XXXXXXXXXX). */
function toInternationalCiMsisdn(phone?: string): string | undefined {
  if (!phone) return undefined;
  const national = normalizeCiNumber(phone); // 0XXXXXXXXX
  return /^0\d{9}$/.test(national) ? `+225${national}` : phone;
}

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
    // Fail-closed en production : sans secret configuré, un webhook n'est pas
    // vérifiable → on le refuse. En dev on tolère (simulation locale).
    if (!secret) return process.env.NODE_ENV !== 'production';
    if (!signature) return false;
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expected = crypto
      .createHmac('sha256', secret)
      .update(raw)
      .digest('hex');
    // Comparaison à temps constant (anti-timing).
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  async handleWebhook(payload: any): Promise<PaymentWebhookResult> {
    const { reference, status, metadata } = payload;

    const s = String(status ?? '').toLowerCase();
    const FAILED_STATUSES = ['failed', 'expired', 'cancelled', 'declined'];
    const SUCCESS_STATUSES = ['successful', 'success', 'succeeded', 'completed'];

    let normalizedStatus: 'SUCCESS' | 'FAILED' | 'PENDING' = 'PENDING';
    if (SUCCESS_STATUSES.includes(s)) normalizedStatus = 'SUCCESS';
    else if (FAILED_STATUSES.includes(s)) normalizedStatus = 'FAILED';

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
    // Deux flux selon l'opérateur (le msisdn doit être en +225XXXXXXXXXX) :
    //  - MTN / Moov / Orange → payin DIRECT : demande d'approbation (USSD) sur le téléphone.
    //  - Wave → SESSION de paiement (lien) : le payin direct échoue pour Wave
    //    (« Transaction failed ») ; la session renvoie un `paymentUrl` (page/QR).
    const msisdn = toInternationalCiMsisdn(options.phone);
    const action = {
      successUrl: options.returnUrl || `${this.appUrl}/paiement/success`,
      failureUrl: `${this.appUrl}/paiement/failure`,
    };
    const isLinkFlow = options.provider === 'WAVE';

    const url = isLinkFlow
      ? `${this.BASE}/payin/sessions`
      : `${this.BASE}/direct/payin`;
    const payload: Record<string, any> = isLinkFlow
      ? {
          reference,
          amount: options.amount,
          country: 'CI',
          customerName: options.metadata?.customerName || 'Client',
          ...(msisdn ? { msisdn } : {}),
          action,
        }
      : {
          reference,
          customerName: options.metadata?.customerName || 'Client',
          payin: {
            amount: options.amount,
            provider: options.provider,
            country: 'CI',
            ...(msisdn ? { msisdn } : {}),
            ...(options.metadata?.otp ? { otp: options.metadata.otp } : {}),
          },
          action,
        };

    try {
      const { data } = await axios.post(url, payload, {
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
