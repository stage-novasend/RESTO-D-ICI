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
