/* ═══════════════════════════════════════════════════════════════
   validators.js — Contraintes de format partagées (source unique)
   Formats Côte d'Ivoire : téléphone (+225 + 10 chiffres), email,
   mot de passe, montants, URL. Utilisé par tous les formulaires.
   ═══════════════════════════════════════════════════════════════ */

/* ── Expressions régulières ─────────────────────────────────── */
// Email pratique (pas de RFC complète, mais couvre les cas réels)
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Téléphone Côte d'Ivoire : préfixe +225 optionnel puis 10 chiffres
// commençant par 0 (07, 05, 01 mobile ; 27, 25, 21 fixe).
export const CI_PHONE_REGEX = /^(?:\+?225)?0\d{9}$/;

// Attributs HTML `pattern` (tolèrent espaces / points / tirets à la saisie)
export const EMAIL_PATTERN    = '[^@\\s]+@[^@\\s]+\\.[^@\\s]{2,}';
export const CI_PHONE_PATTERN = '(?:\\+?225)?[\\s.-]?0\\d([\\s.-]?\\d{2}){4}';
export const URL_PATTERN      = 'https?://.+';

/* ── Normalisation ──────────────────────────────────────────── */
// Retire espaces, points, tirets, parenthèses d'un numéro
export const normalizePhone = (v) => String(v ?? '').replace(/[\s.\-()]/g, '');

// Formate un numéro CI en « +225 07 12 34 56 78 » (affichage)
export const formatCIPhone = (v) => {
  let n = normalizePhone(v).replace(/^\+?225/, '');
  if (!n) return '';
  const groups = n.slice(0, 10).match(/.{1,2}/g) || [];
  return '+225 ' + groups.join(' ');
};

/* ── Opérateurs mobiles Côte d'Ivoire (préfixe = 2 premiers chiffres) ──
   Plan ARTCI 2021 : Moov 01/02/03 · MTN 04/05/06 · Orange 07/08/09. */
export const CI_OPERATOR_PREFIXES = {
  ORANGE: ['07', '08', '09', '47', '48', '49', '57', '58', '59', '77', '78', '79', '87', '88', '89', '97', '98', '99'],
  MOMO:   ['04', '05', '06', '44', '45', '46', '54', '55', '56', '74', '75', '76', '84', '85', '86', '94', '95', '96'],
  MOOV:   ['01', '02', '03', '41', '42', '43', '51', '52', '53', '71', '72', '73', '81', '82', '83', '91', '92', '93'],
};
export const OPERATOR_LABEL = { ORANGE: 'Orange Money', MOMO: 'MTN MoMo', MOOV: 'Moov Money' };

// Numéro national à 10 chiffres (retire +225 / 225 et séparateurs)
export const toCINationalNumber = (v) => normalizePhone(v).replace(/^\+?225/, '');

// Détecte l'opérateur ('ORANGE' | 'MOMO' | 'MOOV') d'un numéro, ou null
export const detectCIOperator = (v) => {
  const n = toCINationalNumber(v);
  if (!/^0\d{9}$/.test(n)) return null;
  const p = n.slice(0, 2);
  return Object.keys(CI_OPERATOR_PREFIXES).find(op => CI_OPERATOR_PREFIXES[op].includes(p)) || null;
};

// Vrai si le numéro correspond bien à l'opérateur attendu (souple si non reconnu)
export const phoneMatchesOperator = (v, expected) => {
  const detected = detectCIOperator(v);
  return !detected || detected === expected;
};

/* ── Validateurs (retournent true / false) ─────────────────── */
export const isValidEmail   = (v) => EMAIL_REGEX.test(String(v ?? '').trim());
export const isValidCIPhone = (v) => CI_PHONE_REGEX.test(normalizePhone(v));
export const isValidPassword = (v) => String(v ?? '').length >= 8;
export const isValidUrl = (v) => /^https?:\/\/.+/i.test(String(v ?? '').trim());
export const isPositiveNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0;
};
export const isRequired = (v) => String(v ?? '').trim().length > 0;

/* ── Messages d'erreur normalisés (français) ───────────────── */
export const MSG = {
  required: 'Ce champ est requis',
  email:    'Email invalide (ex. nom@domaine.com)',
  phone:    'Numéro invalide (ex. +225 07 12 34 56 78)',
  password: 'Minimum 8 caractères',
  url:      'URL invalide (doit commencer par http:// ou https://)',
  number:   'Doit être un nombre positif',
};

/* ── Aide : renvoie le message d'erreur ou '' si valide ─────
   validateField('email', value, { required: true }) → '' | message   */
export const validateField = (type, value, { required = false } = {}) => {
  const empty = !isRequired(value);
  if (required && empty) return MSG.required;
  if (empty) return ''; // champ optionnel vide → OK
  switch (type) {
    case 'email':    return isValidEmail(value)    ? '' : MSG.email;
    case 'phone':    return isValidCIPhone(value)  ? '' : MSG.phone;
    case 'password': return isValidPassword(value) ? '' : MSG.password;
    case 'url':      return isValidUrl(value)      ? '' : MSG.url;
    case 'number':   return isPositiveNumber(value)? '' : MSG.number;
    default:         return '';
  }
};
