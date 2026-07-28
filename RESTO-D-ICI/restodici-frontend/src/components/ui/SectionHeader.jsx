import { ORANGE, ORANGE_LIGHT, TEXT_DARK } from '../../theme/colors';

/* En-tête de section : icône + titre (+ badge) + action à droite.
   Remplace les barres de titre de cartes répétées dans les dashboards. */
export default function SectionHeader({ icon: Icon, title, badge, action, className = '' }) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-2">
        {Icon && (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: ORANGE_LIGHT }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: ORANGE }} />
          </div>
        )}
        <span className="text-sm font-bold" style={{ color: TEXT_DARK }}>{title}</span>
        {badge}
      </div>
      {action}
    </div>
  );
}
