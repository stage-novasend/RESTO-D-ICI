import { ORANGE, ORANGE_DARK, RED, SURFACE, BORDER, TEXT_DARK } from '../../theme/colors';

/* Bouton réutilisable — variantes primary | secondary | danger | ghost.
   Remplace les boutons orange/gris réécrits partout. */
const VARIANTS = {
  primary:   { background: ORANGE, color: '#fff', border: 'none' },
  secondary: { background: SURFACE, color: TEXT_DARK, border: `1px solid ${BORDER}` },
  danger:    { background: RED, color: '#fff', border: 'none' },
  ghost:     { background: 'transparent', color: ORANGE, border: 'none' },
};

export default function Button({
  variant = 'primary',
  icon: Icon,
  loading = false,
  disabled = false,
  className = '',
  style = {},
  children,
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const isDisabled = disabled || loading;
  return (
    <button
      disabled={isDisabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${className}`}
      style={{
        ...v,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.6 : 1,
        ...style,
      }}
      onMouseEnter={(e) => { if (variant === 'primary' && !isDisabled) e.currentTarget.style.background = ORANGE_DARK; }}
      onMouseLeave={(e) => { if (variant === 'primary' && !isDisabled) e.currentTarget.style.background = ORANGE; }}
      {...rest}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}
