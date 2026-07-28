import { SURFACE, BORDER, ORANGE, TEXT_DARK, TEXT_MUTED } from '../../theme/colors';

/* Carte KPI — grand chiffre + libellé + sous-libellé.
   Remplace les cartes statistiques répétées dans les dashboards. */
export default function KpiCard({ value, label, sub, color = ORANGE, className = '', style = {} }) {
  return (
    <div
      className={`rounded-2xl p-5 border ${className}`}
      style={{ background: SURFACE, borderColor: BORDER, ...style }}
    >
      <p className="text-2xl font-extrabold mb-1" style={{ color }}>{value}</p>
      <p className="text-sm font-bold" style={{ color: TEXT_DARK }}>{label}</p>
      {sub != null && <p className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>{sub}</p>}
    </div>
  );
}
