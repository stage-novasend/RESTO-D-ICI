import { ORANGE, ORANGE_LIGHT, TEXT_DARK, TEXT_MUTED } from '../../theme/colors';

/* État vide (aucune donnée) — icône ronde + titre + sous-titre + action.
   Remplace les blocs « Aucun … » répétés dans les listes. */
export default function EmptyState({ icon: Icon, title, subtitle, action, className = '' }) {
  return (
    <div className={`py-14 text-center ${className}`}>
      {Icon && (
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: ORANGE_LIGHT }}
        >
          <Icon className="w-7 h-7" style={{ color: ORANGE }} />
        </div>
      )}
      {title && <p className="text-sm font-semibold mb-1" style={{ color: TEXT_DARK }}>{title}</p>}
      {subtitle && <p className="text-xs mb-4" style={{ color: TEXT_MUTED }}>{subtitle}</p>}
      {action}
    </div>
  );
}
