// ── Design tokens shared by B2BDashboard.jsx and its extracted sections/*.jsx ──
// Mirrors the aliasing used in B2BDashboard.jsx so the two stay visually identical.
// Kept as a small standalone file (rather than exporting from B2BDashboard.jsx)
// to avoid touching the orchestrator's existing imports.
import {
  BG, SURFACE as CARD, BROWN_COFFEE as NAVY, BROWN_COFFEE_HOVER as NAVY2,
  TEXT, MUTED_WARM as MUTED, FAINT_WARM as FAINT, BORDER_SLATE as BORDER,
  ORANGE, ORANGE_TINT as ORANGE_L, ORANGE_DARK as ORANGE_D,
  GREEN_DARK as GREEN, GREEN_MINT as GREEN_L, GREEN_FOREST as GREEN_D,
  RED_STRONG as RED, RED_ROSE as RED_L, AMBER, YELLOW_LIGHT as AMBER_L,
} from '../../theme/colors';

export {
  BG, CARD, NAVY, NAVY2, TEXT, MUTED, FAINT, BORDER,
  ORANGE, ORANGE_L, ORANGE_D,
  GREEN, GREEN_L, GREEN_D,
  RED, RED_L, AMBER, AMBER_L,
};

// Ombres neutres (slate) — mêmes valeurs que dans B2BDashboard.jsx.
export const SH  = '0 1px 3px rgba(15,23,42,0.06),0 1px 2px rgba(15,23,42,0.04)';
export const SH2 = '0 4px 12px rgba(15,23,42,0.08),0 2px 4px rgba(15,23,42,0.05)';
export const SH3 = '0 12px 28px rgba(15,23,42,0.12),0 4px 8px rgba(15,23,42,0.06)';
