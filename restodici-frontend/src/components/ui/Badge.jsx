import {
  ORANGE, ORANGE_LIGHT, GREEN_DARK, GREEN_LIGHT, RED, RED_LIGHT,
  YELLOW, YELLOW_LIGHT, BLUE, BLUE_LIGHT, TEXT_MUTED,
} from '../../theme/colors';

/* Pastille / badge coloré — variantes sémantiques.
   Remplace les <span> pilule réécrits partout. */
const TONES = {
  orange:  { bg: ORANGE_LIGHT, color: ORANGE },
  green:   { bg: GREEN_LIGHT,  color: GREEN_DARK },
  red:     { bg: RED_LIGHT,    color: RED },
  yellow:  { bg: YELLOW_LIGHT, color: YELLOW },
  blue:    { bg: BLUE_LIGHT,   color: BLUE },
  neutral: { bg: '#F1F5F9',    color: TEXT_MUTED },
};

export default function Badge({ tone = 'neutral', className = '', style = {}, children }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${className}`}
      style={{ background: t.bg, color: t.color, ...style }}
    >
      {children}
    </span>
  );
}
