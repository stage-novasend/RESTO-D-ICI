/* ═══════════════════════════════════════════════════════════════
   email/logo-asset.ts — logo Resto d'ici embarqué pour les emails.

   FICHIER GÉNÉRÉ — ne pas éditer à la main.
   Régénérer avec : node scripts/build-email-logo.mjs

   Le logo est joint à chaque email en pièce intégrée (CID) plutôt que
   référencé par une URL. Deux raisons :

   1. Aucune dépendance à FRONTEND_URL. Une variable d'environnement mal
      renseignée en production ne peut plus produire une image cassée chez le
      destinataire — l'image voyage avec le message.
   2. Les clients de messagerie bloquent fréquemment les images distantes
      (Gmail demande confirmation, Outlook les bloque par défaut). Une pièce
      intégrée s'affiche sans invite.

   Source : restodici-frontend/public/logo-mark.svg, rendu à 128×128.
   ═══════════════════════════════════════════════════════════════ */

/** PNG 128×128 encodé en base64 (9681 octets une fois décodé). */
export const EMAIL_LOGO_PNG_BASE64 =
  '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' +
  'TkSuQmCC';

/** Identifiant référencé dans le HTML des emails via `cid:`. */
export const EMAIL_LOGO_CID = 'restodici-logo';

/** Nom de fichier présenté par le client de messagerie. */
export const EMAIL_LOGO_FILENAME = 'restodici-logo.png';
