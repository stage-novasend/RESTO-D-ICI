import { SURFACE, BORDER, ORANGE, TEXT_DARK, RED } from '../../theme/colors';

/* Champ de formulaire : label + input contrôlé + message d'erreur.
   Défini au niveau module (jamais dans un render) → pas de remontage / perte de focus.
   Transmet les contraintes de format (pattern, title, inputMode…) — voir utils/validators.js. */
export default function Field({
  label,
  error,
  hint,
  as = 'input',
  className = '',
  inputClassName = '',
  style = {},
  ...inputProps
}) {
  const Tag = as; // 'input' | 'textarea' | 'select'
  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-[13px] font-bold" style={{ color: TEXT_DARK }}>
          {label}
        </label>
      )}
      <Tag
        className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors ${inputClassName}`}
        style={{
          background: SURFACE,
          border: `1px solid ${error ? RED : BORDER}`,
          color: TEXT_DARK,
          boxSizing: 'border-box',
          ...style,
        }}
        onFocus={(e) => { e.target.style.borderColor = error ? RED : ORANGE; }}
        onBlur={(e) => { e.target.style.borderColor = error ? RED : BORDER; }}
        {...inputProps}
      />
      {error && <p className="mt-1 text-xs" style={{ color: RED }}>{error}</p>}
      {!error && hint && <p className="mt-1 text-xs" style={{ color: '#9CA3AF' }}>{hint}</p>}
    </div>
  );
}
