/**
 * Régénère src/email/logo-asset.ts depuis le logo source du frontend.
 *
 * À lancer après toute modification de restodici-frontend/public/logo-mark.svg,
 * sinon le logo des emails divergera de celui affiché dans l'application :
 *
 *   node scripts/build-email-logo.mjs
 *
 * Nécessite Chromium via @playwright/test (devDependency du frontend) : c'est
 * lui qui rastérise le SVG, aucun outil système n'étant requis.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const SVG_SOURCE = resolve(HERE, '../../restodici-frontend/public/logo-mark.svg');
const TARGET = resolve(HERE, '../src/email/logo-asset.ts');

/** Affiché à 56 px dans l'email : 128 px couvre les écrans 2x sans surpoids. */
const SIZE = 128;

/* Playwright est une devDependency du frontend, pas du backend : on résout
   depuis là. createRequire est nécessaire car le paquet est en CommonJS. */
const requireFromFrontend = createRequire(
  resolve(HERE, '../../restodici-frontend/package.json'),
);
const { chromium } = requireFromFrontend('@playwright/test');

const svg = readFileSync(SVG_SOURCE, 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: SIZE, height: SIZE },
  deviceScaleFactor: 1,
});
/* La taille est imposée en CSS (elle prime sur les attributs de présentation) :
   un SVG source dimensionné en dur, ou en pourcentage, déborderait sinon du
   conteneur et le PNG se retrouverait rogné. */
await page.setContent(
  `<body style="margin:0;padding:0">
     <style>svg { display:block; width:${SIZE}px !important; height:${SIZE}px !important; }</style>
     ${svg}
   </body>`,
  { waitUntil: 'load' },
);

const svgBox = await page.locator('svg').boundingBox();
if (!svgBox || Math.round(svgBox.width) !== SIZE || Math.round(svgBox.height) !== SIZE) {
  throw new Error(
    `Rendu inattendu : le SVG mesure ${svgBox?.width}×${svgBox?.height} au lieu de ${SIZE}×${SIZE}. ` +
      'Le PNG serait rogné — vérifier logo-mark.svg.',
  );
}

const png = await page.locator('svg').screenshot({ omitBackground: true });
await browser.close();

const base64 = png.toString('base64');
const chunks = base64.match(/.{1,100}/g) ?? [];
const literal = chunks
  .map((c, i) => `  '${c}'${i === chunks.length - 1 ? ';' : ' +'}`)
  .join('\n');

writeFileSync(
  TARGET,
  `/* ═══════════════════════════════════════════════════════════════
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

   Source : restodici-frontend/public/logo-mark.svg, rendu à ${SIZE}×${SIZE}.
   ═══════════════════════════════════════════════════════════════ */

/** PNG ${SIZE}×${SIZE} encodé en base64 (${png.length} octets une fois décodé). */
export const EMAIL_LOGO_PNG_BASE64 =
${literal}

/** Identifiant référencé dans le HTML des emails via \`cid:\`. */
export const EMAIL_LOGO_CID = 'restodici-logo';

/** Nom de fichier présenté par le client de messagerie. */
export const EMAIL_LOGO_FILENAME = 'restodici-logo.png';
`,
  'utf8',
);

console.log(`${TARGET} régénéré — PNG ${png.length} octets, base64 ${base64.length} caractères`);
