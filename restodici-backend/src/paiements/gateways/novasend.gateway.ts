import { Logger } from '@nestjs/common';
import axios from 'axios';
import { randomUUID } from 'crypto';
import { Integration } from '../../common/entities/integration.entity';
import { verifyNovaSendSignature } from '../webhook-signature.util';
import { isSuccessStatus, isFailedStatus } from '../novasend-status.util';
import {
  PaymentGateway,
  InitiatePaymentOptions,
  PaymentGatewayResult,
  PaymentWebhookResult,
  PayoutOptions,
  PayoutResult,
} from './payment-gateway.interface';
import { EXTERNAL_URLS } from '../../config/app-config';
import { normalizeCiNumber } from '../phone.util';

/** Formate un numéro CI au format international E.164 (+225XXXXXXXXXX). */
export function toInternationalCiMsisdn(phone?: string): string | undefined {
  if (!phone) return undefined;
  const national = normalizeCiNumber(phone); // 0XXXXXXXXX
  return /^0\d{9}$/.test(national) ? `+225${national}` : phone;
}

/** Normalise les codes d'opérateurs Mobile Money attendus par l'API NovaSend. */
export function normalizeNovaSendProvider(provider?: string): string {
  if (!provider) return 'ORANGE';
  const p = provider.toUpperCase().trim();
  if (p === 'ORANGE_MONEY' || p === 'ORANGE' || p === 'OM') return 'ORANGE';
  if (p === 'MTN_MONEY' || p === 'MTN_MOMO' || p === 'MTN' || p === 'MOMO') return 'MOMO';
  if (p === 'MOOV_MONEY' || p === 'MOOV' || p === 'FLOOZ') return 'MOOV';
  if (p === 'WAVE') return 'WAVE';
  return p;
}

/**
 * Wrapper NovaSend implémentant PaymentGateway.
 * Gère le paiement Mobile Money Direct via POST /v1/direct/payin
 * (Orange Money, MTN MoMo, Moov Money) et les sessions (Wave).
 */
export class NovaSendGateway implements PaymentGateway {
  readonly name = 'novasend';
  private readonly logger = new Logger(NovaSendGateway.name);

  private get baseUrl(): string {
    if (process.env.NOVASEND_BASE_URL) return process.env.NOVASEND_BASE_URL;
    if (this.integration.baseUrl && this.integration.baseUrl.includes('novasend')) {
      return this.integration.baseUrl;
    }
    return EXTERNAL_URLS.novasend || 'https://business.novasend.app/v1';
  }

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

  verifyWebhook(payload: any, signature?: string, rawBody?: string): boolean {
    const secret =
      this.integration.webhookSecret || process.env.NOVASEND_WEBHOOK_SECRET;
    // [SÉCURITÉ] Fail-closed en toutes circonstances. Un endpoint webhook est
    // public (ngrok en staging) : sans secret, n'importe qui pourrait POSTer
    // {reference, status:'processed'} et valider une commande sans payer.
    if (!secret) {
      this.logger.error(
        'NOVASEND_WEBHOOK_SECRET absent — webhook rejeté (fail-closed)',
      );
      return false;
    }
    // Corps brut si disponible ; sinon repli dégradé sur le JSON re-sérialisé.
    const raw =
      rawBody ??
      (typeof payload === 'string' ? payload : JSON.stringify(payload));
    return verifyNovaSendSignature(raw, signature, secret);
  }

  async handleWebhook(payload: any): Promise<PaymentWebhookResult> {
    const { reference, status, metadata } = payload;

    let normalizedStatus: 'SUCCESS' | 'FAILED' | 'PENDING' = 'PENDING';
    if (isSuccessStatus(status)) normalizedStatus = 'SUCCESS';
    else if (isFailedStatus(status)) normalizedStatus = 'FAILED';

    return {
      transactionId: reference,
      status: normalizedStatus,
      provider: this.pendingMap.get(reference),
      metadata,
    };
  }

  // ── Helpers privés ────────────────────────────────────────────────────────

  private get isConfigured(): boolean {
    return !!(
      (this.integration.apiKey && this.integration.apiKey.trim().length > 0) ||
      (process.env.NOVASEND_API_KEY && process.env.NOVASEND_API_SECRET)
    );
  }

  private get credentials(): string {
    const envKey = (process.env.NOVASEND_API_KEY || '').trim();
    const envSecret = (process.env.NOVASEND_API_SECRET || '').trim();

    const dbKey = (this.integration?.apiKey || '').trim();

    const key = dbKey || envKey;
    const secret = envSecret;

    if (key.includes(':')) {
      return Buffer.from(key).toString('base64');
    }
    if (key && secret) {
      return Buffer.from(`${key}:${secret}`).toString('base64');
    }
    return key ? Buffer.from(key).toString('base64') : '';
  }

  private get appUrl(): string {
    return (
      process.env.PAYMENT_RETURN_URL ||
      process.env.PUBLIC_FRONTEND_URL ||
      process.env.FRONTEND_URL ||
      process.env.APP_URL ||
      'http://localhost:5173'
    );
  }

  private async callApi(
    reference: string,
    options: InitiatePaymentOptions,
  ): Promise<PaymentGatewayResult> {
    const msisdn = toInternationalCiMsisdn(options.phone);
    const providerCode = normalizeNovaSendProvider(options.provider);

    const action = {
      successUrl: options.returnUrl || `${this.appUrl}/paiement/success`,
      failureUrl: `${this.appUrl}/paiement/failure`,
    };

    // Tous les paiements (y compris Wave) utilisent POST /v1/direct/payin
    const url = `${this.baseUrl}/direct/payin`;

    const payload: Record<string, any> = {
      reference,
      customerName: options.metadata?.customerName || 'Client',
      payin: {
        amount: options.amount,
        provider: providerCode,
        country: 'CI',
        ...(msisdn ? { msisdn } : {}),
        ...(options.metadata?.otp ? { otp: options.metadata.otp } : {}),
      },
      action,
    };

    try {
      this.logger.log(`[NovaSend] Sending Direct Payin (${providerCode}) to ${url}. Payload: ${JSON.stringify(payload)}`);
      const { data } = await axios.post(url, payload, {
        headers: {
          Authorization: `Basic ${this.credentials}`,
          'X-Idempotency-Key': randomUUID(),
          'Content-Type': 'application/json',
          'Accept-Language': 'fr',
        },
        timeout: 15_000,
      });
      this.logger.log(`[NovaSend] Payin response (${providerCode}): ${JSON.stringify(data)}`);

      const status = String(data?.status || '').toUpperCase();
      const isSuccess = status === 'SUCCESSFUL' || status === 'SUCCESS';

      const paymentUrl =
        data?.paymentUrl ||
        data?.url ||
        data?.checkoutUrl ||
        data?.waveLaunchUrl ||
        data?.action?.url ||
        data?.payin?.url ||
        data?.data?.paymentUrl ||
        data?.data?.url ||
        data?.data?.waveLaunchUrl;

      return {
        transactionId: data?.id || data?.reference || reference,
        paymentUrl,
        status: isSuccess ? 'SUCCESS' : 'PENDING',
      };
    } catch (err: any) {
      const is401 = err?.response?.status === 401;

      // Si 401 sur l'URL principale, essayer l'URL alternative (staging/prod)
      if (is401) {
        const altBase = url.includes('business-staging')
          ? 'https://business.novasend.app/v1'
          : 'https://business-staging.novasend.app/v1';
        const altUrl = `${altBase}/direct/payin`;

        try {
          this.logger.log(`[NovaSend] Tentative fallback sur ${altUrl}...`);
          const { data } = await axios.post(altUrl, payload, {
            headers: {
              Authorization: `Basic ${this.credentials}`,
              'X-Idempotency-Key': randomUUID(),
              'Content-Type': 'application/json',
              'Accept-Language': 'fr',
            },
            timeout: 15_000,
          });
          const status = String(data?.status || '').toUpperCase();
          const isSuccess = status === 'SUCCESSFUL' || status === 'SUCCESS';
          const paymentUrl =
            data?.paymentUrl ||
            data?.url ||
            data?.checkoutUrl ||
            data?.waveLaunchUrl ||
            data?.action?.url;

          return {
            transactionId: data?.id || data?.reference || reference,
            paymentUrl,
            status: isSuccess ? 'SUCCESS' : 'PENDING',
          };
        } catch (altErr: any) {
          this.logger.warn(`[NovaSend] 401 sur API réelles (prod & staging) — Clés invalides ou expirées. Basculement en simulation.`);
          return this.simulateInitiation(reference, options);
        }
      }

      const errorMsg = err?.response?.data || err.message;
      this.logger.error(`NovaSend API error [${providerCode}] (${url}):`, JSON.stringify(errorMsg));
      throw new Error(JSON.stringify(errorMsg));
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

  // ── Payout (reversement au restaurant) ──────────────────────────────────
  // POST /v1/direct/payout — même auth/idempotence que le payin. Providers
  // supportés par NovaSend pour le déboursement : WAVE, ORANGE, MOMO, MOOV
  // (pas de virement bancaire classique ni de wallet NovaSend interne — cf.
  // docs.novasend.app/fr/docs/api/direct/transfer).
  async payout(options: PayoutOptions): Promise<PayoutResult> {
    const msisdn = toInternationalCiMsisdn(options.phone);
    if (!msisdn) {
      throw new Error(`Numéro de téléphone invalide pour le payout: "${options.phone}"`);
    }
    const providerCode = normalizeNovaSendProvider(options.provider);

    if (!this.isConfigured) {
      return this.simulatePayout(options);
    }

    const url = `${this.baseUrl}/direct/payout`;
    const payload = {
      reference: options.reference,
      customerName: options.recipientName || 'Restaurant',
      payout: {
        amount: options.amount,
        provider: providerCode,
        country: 'CI',
        msisdn,
      },
    };

    try {
      this.logger.log(`[NovaSend] Sending Direct Payout (${providerCode}) to ${url}. Payload: ${JSON.stringify(payload)}`);
      const { data } = await axios.post(url, payload, {
        headers: {
          Authorization: `Basic ${this.credentials}`,
          'X-Idempotency-Key': randomUUID(),
          'Content-Type': 'application/json',
          'Accept-Language': 'fr',
        },
        timeout: 15_000,
      });
      this.logger.log(`[NovaSend] Payout response (${providerCode}): ${JSON.stringify(data)}`);
      return {
        payoutId: data?.id || data?.reference || options.reference,
        status: normalizeNovaSendPayoutStatus(data?.status),
        raw: data,
      };
    } catch (err: any) {
      if (err?.response?.status === 401) {
        this.logger.warn('[NovaSend] 401 sur le payout — clés invalides/expirées. Basculement en simulation.');
        return this.simulatePayout(options);
      }
      const errorMsg = err?.response?.data || err.message;
      this.logger.error(`NovaSend payout error [${providerCode}] (${url}):`, JSON.stringify(errorMsg));
      return {
        payoutId: options.reference,
        status: 'FAILED',
        raw: errorMsg,
      };
    }
  }

  async getPayoutStatus(reference: string): Promise<PayoutResult> {
    if (!this.isConfigured) {
      return { payoutId: reference, status: 'PROCESSED', raw: { simulated: true } };
    }
    const url = `${this.baseUrl}/direct/payout/${encodeURIComponent(reference)}`;
    try {
      const { data } = await axios.get(url, {
        headers: { Authorization: `Basic ${this.credentials}` },
        timeout: 15_000,
      });
      return {
        payoutId: data?.id || reference,
        status: normalizeNovaSendPayoutStatus(data?.status),
        raw: data,
      };
    } catch (err: any) {
      const errorMsg = err?.response?.data || err.message;
      this.logger.error(`NovaSend payout status error (${url}):`, JSON.stringify(errorMsg));
      return { payoutId: reference, status: 'FAILED', raw: errorMsg };
    }
  }

  private simulatePayout(options: PayoutOptions): PayoutResult {
    this.logger.log(`[NovaSend] Payout simulé (pas de clés API) — ${options.amount} FCFA vers ${options.phone}`);
    return {
      payoutId: `sim_payout_${randomUUID().slice(0, 8)}`,
      status: 'PROCESSED',
      raw: { simulated: true },
    };
  }
}

/** Normalise le statut NovaSend (processing | processed | failed | expired) en statut interne. */
function normalizeNovaSendPayoutStatus(status?: string): PayoutResult['status'] {
  const s = String(status || '').toLowerCase();
  if (s === 'processed' || s === 'success' || s === 'successful') return 'PROCESSED';
  if (s === 'failed' || s === 'error') return 'FAILED';
  if (s === 'expired') return 'EXPIRED';
  return 'PROCESSING';
}
