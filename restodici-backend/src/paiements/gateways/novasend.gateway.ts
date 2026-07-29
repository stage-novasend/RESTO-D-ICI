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

  verifyWebhook(payload: any, signature?: string): boolean {
    const secret = this.integration.webhookSecret || process.env.NOVASEND_WEBHOOK_SECRET;
    if (!secret) return process.env.NODE_ENV !== 'production';
    if (!signature) return false;
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expected = crypto
      .createHmac('sha256', secret)
      .update(raw)
      .digest('hex');
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
    return (process.env.FRONTEND_URL || 'http://localhost:5173');
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
    const isWave = providerCode === 'WAVE';

    const url = isWave
      ? `${this.baseUrl}/payin/sessions`
      : `${this.baseUrl}/direct/payin`;

    const payload: Record<string, any> = isWave
      ? {
          reference,
          amount: options.amount,
          provider: 'WAVE',
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
            provider: providerCode,
            country: 'CI',
            ...(msisdn ? { msisdn } : {}),
            ...(options.metadata?.otp ? { otp: options.metadata.otp } : {}),
          },
          action,
        };

    try {
      this.logger.log(`[NovaSend] Sending ${isWave ? 'Payin Session' : 'Direct Payin'} (${providerCode}) to ${url} for ${msisdn || 'non-specified phone'}`);
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
        const altUrl = isWave ? `${altBase}/payin/sessions` : `${altBase}/direct/payin`;

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
          const paymentUrl = data?.paymentUrl || data?.url || data?.checkoutUrl || data?.action?.url;

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

      this.logger.error(`NovaSend API error [${providerCode}] (${url}):`, err?.response?.data ?? err.message);
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
