/**
 * Validation & normalisation des numéros Mobile Money — Côte d'Ivoire.
 *
 * Plan de numérotation ARTCI 2021 : numéros mobiles à 10 chiffres commençant
 * par 0. L'opérateur se lit sur les 2 premiers chiffres :
 *   - Moov Africa CI : 01, 02, 03
 *   - MTN CI         : 04, 05, 06
 *   - Orange CI      : 07, 08, 09
 * Indicatif pays : +225 (accepté sous les formes 225 / 00225 / +225).
 */

export type MobileOperator = 'ORANGE' | 'MOMO' | 'MOOV';

export const CI_COUNTRY_CODE = '225';

// Préfixes (2 chiffres) par opérateur.
export const CI_OPERATOR_PREFIXES: Record<MobileOperator, string[]> = {
  ORANGE: ['07', '08', '09'],
  MOMO: ['04', '05', '06'],
  MOOV: ['01', '02', '03'],
};

export const OPERATOR_LABEL: Record<MobileOperator, string> = {
  ORANGE: 'Orange Money',
  MOMO: 'MTN MoMo',
  MOOV: 'Moov Money',
};

/**
 * Nettoie un numéro : ne garde que les chiffres et retire l'indicatif pays
 * (225 / 00225 / +225). Retourne le numéro national attendu à 10 chiffres.
 */
export function normalizeCiNumber(raw: string | undefined | null): string {
  let digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.startsWith('00' + CI_COUNTRY_CODE)) {
    digits = digits.slice(2 + CI_COUNTRY_CODE.length);
  } else if (digits.startsWith(CI_COUNTRY_CODE)) {
    digits = digits.slice(CI_COUNTRY_CODE.length);
  }
  return digits;
}

/** Vrai si le numéro est un mobile ivoirien valide (10 chiffres, commence par 0). */
export function isValidCiMobile(raw: string | undefined | null): boolean {
  return /^0\d{9}$/.test(normalizeCiNumber(raw));
}

/** Détecte l'opérateur d'un numéro ivoirien, ou null si inconnu/invalide. */
export function detectCiOperator(
  raw: string | undefined | null,
): MobileOperator | null {
  const n = normalizeCiNumber(raw);
  if (!/^0\d{9}$/.test(n)) return null;
  const prefix = n.slice(0, 2);
  for (const op of Object.keys(CI_OPERATOR_PREFIXES) as MobileOperator[]) {
    if (CI_OPERATOR_PREFIXES[op].includes(prefix)) return op;
  }
  return null;
}

export interface PhoneCheck {
  ok: boolean;
  normalized: string; // numéro national à 10 chiffres (msisdn envoyé à NovaSend)
  operator: MobileOperator | null;
  reason?: string;
}

/**
 * Valide qu'un numéro correspond bien à l'opérateur attendu et le normalise.
 * Ne lève pas d'exception (fonction pure) — le service traduit `reason` en 400.
 */
export function checkPhoneForOperator(
  raw: string | undefined | null,
  expected: MobileOperator,
): PhoneCheck {
  const normalized = normalizeCiNumber(raw);
  if (!String(raw ?? '').trim()) {
    return {
      ok: false,
      normalized,
      operator: null,
      reason: `Numéro requis pour un paiement ${OPERATOR_LABEL[expected]}.`,
    };
  }
  if (!/^0\d{9}$/.test(normalized)) {
    return {
      ok: false,
      normalized,
      operator: null,
      reason:
        'Numéro invalide : un numéro ivoirien comporte 10 chiffres (ex. 07 XX XX XX XX).',
    };
  }
  const operator = detectCiOperator(normalized);
  if (operator !== expected) {
    const got = operator ? OPERATOR_LABEL[operator] : 'un opérateur inconnu';
    return {
      ok: false,
      normalized,
      operator,
      reason: `Ce numéro (préfixe ${normalized.slice(0, 2)}) n'est pas un numéro ${OPERATOR_LABEL[expected]} — il correspond à ${got}. Choisissez le bon opérateur ou saisissez un numéro ${OPERATOR_LABEL[expected]}.`,
    };
  }
  return { ok: true, normalized, operator };
}
