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

/* ═══════════════════════════════════════════════════════════════
   Nuances conservées — teintes exactes utilisées par certains écrans
   (drift historique volontairement préservé pour ne rien changer
   visuellement). Chaque fichier les importe avec un alias.
   ═══════════════════════════════════════════════════════════════ */

/* Neutres chauds (bruns / taupe / pierre) */
export const MUTED_WARM   = '#8B6E50';
export const FAINT_WARM   = '#A89070';
export const MUTED_TAUPE  = '#9E8B7A';
export const MUTED_STONE  = '#78716C';
export const TEXT_STONE   = '#1C1917';
export const DARK_STONE   = '#1C1C1E';
export const BROWN_COFFEE       = '#3D1500';
export const BROWN_COFFEE_HOVER = '#5C2400';
export const GRAY_SLATE   = '#4B5563';
export const BLACK_SOFT   = '#111111';

/* Bordures */
export const BORDER_SLATE   = '#E2E8F0';
export const BORDER_GRAY    = '#E5E7EB';
export const BORDER_SAND    = '#E8E2D9';
export const BORDER_STRONG  = 'rgba(0,0,0,0.12)';
export const BORDER_WARM    = 'rgba(255,140,0,0.12)';
export const BORDER_WARM_14 = 'rgba(255,140,0,0.14)';
export const BORDER_WARM_09 = 'rgba(255,140,0,0.09)';
export const BORDER_WARM_08 = 'rgba(255,140,0,0.08)';
export const BORDER_BROWN   = 'rgba(89,67,42,0.10)';
export const LINE_BROWN     = 'rgba(89,67,42,0.12)';
export const BORDER_WHITE_07 = 'rgba(255,255,255,0.07)';

/* Oranges clairs / dérivés */
export const ORANGE_PEACH  = '#FFF0DF';
export const ORANGE_CREAM  = '#FFF3E0';
export const ORANGE_CREAM_2 = '#FFF5E8';
export const ORANGE_TINT   = '#FFF7ED';
export const ORANGE_TINT_2 = '#FFF8F0';
export const ORANGE_WARM   = '#E07800';
export const ORANGE_GLOW   = 'rgba(255,140,0,0.12)';

/* Verts */
export const GREEN_MINT   = '#DCFCE7';
export const GREEN_FOREST = '#15803D';
export const GREEN_BORDER = '#86EFAC';
export const GREEN_GLOW   = 'rgba(22,163,74,0.12)';
export const GREEN_BRIGHT = '#22C55E';

/* Rouges / ambre */
export const RED_STRONG  = '#DC2626';
export const RED_ROSE    = '#FEF2F2';
export const RED_SALMON  = '#FFDAD6';
export const DANGER_GLOW = 'rgba(220,38,38,0.12)';
export const AMBER       = '#D97706';
export const AMBER_CREAM = '#FEF3C7';

/* Bleu / violet */
export const BLUE_BRIGHT = '#3B82F6';
export const BLUE_GLOW   = 'rgba(59,130,246,0.09)';
export const PURPLE      = '#8B5CF6';
export const PURPLE_GLOW  = 'rgba(139,92,246,0.09)';

/* Surfaces */
export const SURFACE_ELEVATED = '#F5F5F8';

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
