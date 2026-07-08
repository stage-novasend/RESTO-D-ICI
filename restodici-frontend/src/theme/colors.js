/* ═══════════════════════════════════════════════════════════════
   theme/colors.js — Source UNIQUE des couleurs de l'application
   Toute la charte est ici : ne plus redéfinir `const ORANGE = '#...'`
   dans les fichiers. Importer depuis ce module.

     import { COLORS } from '../theme/colors';
     // ou, pour la compat avec le code existant :
     import { ORANGE, ACCENT, BG, SURFACE } from '../theme/colors';
   ═══════════════════════════════════════════════════════════════ */

/* ── Marque : orange RESTODICI ── */
export const ORANGE      = '#EA580C'; // CTA principal
export const ORANGE_DARK = '#C2410C'; // hover / dégradé foncé
export const ORANGE_LIGHT = '#FFF4ED'; // fond orange clair (surfaces)

/* ── Fonds & surfaces ── */
export const BG      = '#FFF4ED'; // fond de page (orange clair)
export const SURFACE = '#FFFFFF'; // cartes / panneaux
export const CARD    = '#FFFFFF';

/* ── Texte ── */
export const TEXT       = '#1A0C00'; // texte principal (brun très foncé)
export const TEXT_DARK  = '#111827'; // titres (gris anthracite)
export const TEXT_MUTED = '#9CA3AF'; // texte secondaire
export const NAVY       = '#1A0C00';
export const NAVY2      = '#374151';

/* ── Bordures ── */
export const BORDER      = 'rgba(0,0,0,0.08)';
export const BORDER_SOFT = 'rgba(0,0,0,0.07)';

/* ── Couleurs sémantiques ── */
export const YELLOW       = '#F59E0B';
export const YELLOW_LIGHT = '#FFFBEB';
export const GOLD         = '#FFB800';

export const RED       = '#EF4444';
export const RED_LIGHT = '#FFF1F2';

export const GREEN       = '#22C55E';
export const GREEN_DARK  = '#16A34A';
export const GREEN_LIGHT = '#F0FDF4';

export const BLUE       = '#2563EB';
export const BLUE_LIGHT = '#EFF6FF';

/* ── Alias historiques (compat avec le code existant) ── */
export const ACCENT       = ORANGE;
export const ACCENT_DARK  = ORANGE_DARK;
export const ACCENT_LIGHT = ORANGE_LIGHT;
export const ORANGE_D     = ORANGE_DARK;
export const ORANGE_L     = ORANGE_LIGHT;
export const MUTED        = TEXT_MUTED;
export const DARK         = TEXT_DARK;
export const YELLOW_L     = YELLOW_LIGHT;
export const RED_L        = RED_LIGHT;
export const GREEN_L      = GREEN_LIGHT;

/* ── Dégradés prêts à l'emploi ── */
export const GRADIENT_ORANGE = `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DARK})`;

/* ── Objet regroupé (import unique pratique) ── */
export const COLORS = {
  orange: ORANGE, orangeDark: ORANGE_DARK, orangeLight: ORANGE_LIGHT,
  bg: BG, surface: SURFACE, card: CARD,
  text: TEXT, textDark: TEXT_DARK, textMuted: TEXT_MUTED, navy: NAVY, navy2: NAVY2,
  border: BORDER, borderSoft: BORDER_SOFT,
  yellow: YELLOW, yellowLight: YELLOW_LIGHT, gold: GOLD,
  red: RED, redLight: RED_LIGHT,
  green: GREEN, greenDark: GREEN_DARK, greenLight: GREEN_LIGHT,
  blue: BLUE, blueLight: BLUE_LIGHT,
  gradientOrange: GRADIENT_ORANGE,
};

export default COLORS;
