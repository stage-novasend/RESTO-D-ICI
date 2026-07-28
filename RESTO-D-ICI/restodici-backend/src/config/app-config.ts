/* ═══════════════════════════════════════════════════════════════
   config/app-config.ts — Source UNIQUE des URLs & origines
   Plus aucune URL/CORS en dur dispersée dans le code : tout passe
   par des variables d'environnement, avec des valeurs de repli
   uniquement en développement.
   ═══════════════════════════════════════════════════════════════ */

import { Logger } from '@nestjs/common';

/** Origines autorisées en développement (front Vite, proxies locaux). */
const DEV_ORIGINS: string[] = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:3000',
];

/**
 * Origines CORS autorisées.
 * - Production : uniquement celles listées dans `CORS_ORIGINS` (ou `FRONTEND_URL`).
 * - Développement : les defaults locaux + celles de l'environnement.
 */
export function getCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '';
  const fromEnv = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV === 'production') {
    return fromEnv;
  }
  return [...new Set([...DEV_ORIGINS, ...fromEnv])];
}

/**
 * Validation de l'environnement au démarrage.
 * - Dev : avertit seulement (des valeurs de repli existent).
 * - Production : refuse de démarrer si une variable critique manque.
 * (JWT_SECRET est déjà vérifié séparément dans main.ts.)
 */
export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === 'production';

  const recommended = ['DB_HOST', 'DB_DATABASE', 'REDIS_HOST'];
  const missingRecommended = recommended.filter((k) => !process.env[k]);
  if (missingRecommended.length) {
    new Logger('Config').warn(
      `Variables recommandées absentes (valeurs par défaut utilisées) : ${missingRecommended.join(', ')}`,
    );
  }

  if (isProd) {
    const prodCritical: string[] = [];
    if (!process.env.CORS_ORIGINS && !process.env.FRONTEND_URL) {
      prodCritical.push('CORS_ORIGINS (ou FRONTEND_URL)');
    }
    if (!process.env.NOVASEND_WEBHOOK_SECRET) {
      prodCritical.push('NOVASEND_WEBHOOK_SECRET');
    }
    if (!process.env.REDIS_PASSWORD) {
      prodCritical.push('REDIS_PASSWORD');
    }
    // Clé dédiée du chiffrement au repos — ne doit pas dépendre du JWT_SECRET.
    if (
      !process.env.TOTP_ENCRYPTION_KEY ||
      !process.env.TOTP_ENCRYPTION_KEY.trim()
    ) {
      prodCritical.push('TOTP_ENCRYPTION_KEY');
    }
    if (prodCritical.length) {
      throw new Error(
        `[FATAL] Variables obligatoires en production manquantes : ${prodCritical.join(', ')}`,
      );
    }
  }
}

/* ── Cookie du refresh token (HttpOnly, anti-XSS) ── */
export const REFRESH_COOKIE = 'refreshToken';
export const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 jours

/**
 * Options du cookie de refresh token.
 * - httpOnly : inaccessible au JavaScript (protège contre le vol par XSS).
 * - secure   : HTTPS uniquement en production.
 * - sameSite : 'lax' par défaut (surcharge via COOKIE_SAMESITE pour du cross-site).
 * - path     : limité aux routes d'auth.
 */
export function refreshCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (process.env.COOKIE_SAMESITE as 'lax' | 'strict' | 'none') || 'lax',
    path: '/api/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  };
}

/** Base URLs des services externes — surchargées par l'environnement. */
export const EXTERNAL_URLS = {
  novasend: process.env.NOVASEND_BASE_URL || 'https://business.novasend.app/v1',
  novasendPayments:
    process.env.NOVASEND_PAYMENTS_URL || 'https://api.novasend.ci/v1/payments',
  fcmSend: process.env.FCM_SEND_URL || 'https://fcm.googleapis.com/fcm/send',
};
