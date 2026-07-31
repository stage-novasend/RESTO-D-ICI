import * as crypto from 'crypto';

/**
 * En-têtes de signature acceptés pour les webhooks NovaSend.
 *
 * La doc officielle (docs.novasend.app/fr/docs/introduction §Webhooks) impose
 * `X-Signature-Value: HMAC_SHA256(body, secret)`. On tolère `X-Webhook-Signature`
 * par tolérance, le temps de confirmer en staging quel en-tête est réellement émis.
 */
export const NOVASEND_SIGNATURE_HEADERS = [
  'x-signature-value',
  'x-webhook-signature',
] as const;

/** Retire un éventuel préfixe d'algorithme (`sha256=…`) et normalise la casse. */
const cleanSignature = (signature: string): string =>
  signature
    .trim()
    .replace(/^sha256=/i, '')
    .toLowerCase();

/**
 * Compare en temps constant la signature reçue au HMAC-SHA256 du corps BRUT.
 *
 * Le corps brut est indispensable : re-sérialiser le JSON déjà parsé change
 * l'ordre des clés et l'espacement, ce qui invalide systématiquement le HMAC.
 */
export function verifyNovaSendSignature(
  rawBody: string,
  signature: string | undefined,
  secret: string | undefined,
): boolean {
  if (!rawBody || !signature || !secret) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');

  const a = Buffer.from(cleanSignature(signature), 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Extrait la signature du premier en-tête connu présent dans la requête. */
export function extractSignature(
  headers: Record<string, any>,
): string | undefined {
  for (const name of NOVASEND_SIGNATURE_HEADERS) {
    const value = headers?.[name];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return undefined;
}
