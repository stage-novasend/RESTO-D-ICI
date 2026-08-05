import { Link } from 'react-router-dom';
import { CalendarDays, Plus, ShoppingBag, ChevronRight } from 'lucide-react';
import { formatFCFA } from '../../../utils/formatters';
import { StatusPill } from '../B2BDashboard';
import {
  BG, CARD, TEXT, MUTED, FAINT, BORDER, ORANGE, ORANGE_L, ORANGE_D, SH, SH2,
} from '../_colors';

// Extrait de B2BDashboard.jsx — bloc { tab === 'orders' && (...) }.
export default function OrdersSection({
  activeOrders, orders, doneOrders, orderFilter, setOrderFilter, loading,
  displayed, highlightOrderId, navigate,
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold" style={{ color: TEXT }}>Commandes d'équipe</h2>
          <p className="text-[12px] mt-0.5" style={{ color: FAINT }}>
            {activeOrders.length} active{activeOrders.length !== 1 ? 's' : ''} · {orders.length} au total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/b2b/order?mode=schedule"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition hover:opacity-80"
            style={{ background: '#FFF5ED', color: '#CC2402', border: '1px solid #FED7AA' }}>
            <CalendarDays className="w-4 h-4" /> Planifier
          </Link>
          <Link to="/b2b/order?mode=instant"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_D})`, boxShadow: `0 2px 8px ${ORANGE}40` }}>
            <Plus className="w-4 h-4" /> Nouvelle commande
          </Link>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { k: 'all',    label: `Toutes (${orders.length})` },
          { k: 'active', label: `En cours (${activeOrders.length})` },
          { k: 'done',   label: `Terminées (${doneOrders.length})` },
        ].map(f => (
          <button key={f.k} onClick={() => setOrderFilter(f.k)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition"
            style={{
              background: orderFilter === f.k ? ORANGE : CARD,
              color: orderFilter === f.k ? '#fff' : MUTED,
              border: `1.5px solid ${orderFilter === f.k ? ORANGE : BORDER}`,
              boxShadow: orderFilter === f.k ? `0 2px 8px ${ORANGE}30` : SH,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg overflow-hidden" style={{ background: CARD, boxShadow: SH2 }}>
        {loading ? (
          <div className="p-4 space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: BG }} />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-lg mx-auto mb-4 flex items-center justify-center"
              style={{ background: ORANGE_L }}>
              <ShoppingBag className="w-7 h-7" style={{ color: ORANGE }} />
            </div>
            <p className="text-sm font-bold mb-1" style={{ color: TEXT }}>Aucune commande</p>
            <p className="text-xs mb-5" style={{ color: FAINT }}>Passez votre première commande d'équipe</p>
            <Link to="/b2b/order?mode=instant"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white"
              style={{ background: ORANGE }}>
              <Plus className="w-4 h-4" /> Commander maintenant
            </Link>
          </div>
        ) : displayed.map((o, idx, arr) => {
          const st = o.statut ?? o.status ?? '';
          const isGroupee = o.numero?.startsWith('GRP-') || o.type === 'GROUPEE';
          const isHighlighted = highlightOrderId === o.id;
          return (
            <button key={o.id}
              className="w-full flex items-center gap-4 px-5 py-4 transition text-left"
              style={{
                borderBottom: idx < arr.length - 1 ? `1px solid ${BORDER}` : 'none',
                background: isHighlighted ? `${ORANGE}15` : 'transparent',
                outline: isHighlighted ? `2px solid ${ORANGE}40` : 'none',
                outlineOffset: '-2px',
              }}
              onMouseEnter={e => { if (!isHighlighted) e.currentTarget.style.background = BG; }}
              onMouseLeave={e => { if (!isHighlighted) e.currentTarget.style.background = 'transparent'; }}
              onClick={() => {
                if (isGroupee) navigate(`/b2b/suivi/${o.id}`);
                else navigate(`/suivi/${o.id}`);
              }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: isGroupee ? '#F5F5F4' : ORANGE_L }}>
                <ShoppingBag className="w-4.5 h-4.5" style={{ color: isGroupee ? '#78716C' : ORANGE }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold truncate" style={{ color: TEXT }}>
                  {o.numero || o.restaurantNom || `#${o.id?.slice(0, 8)}`}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: FAINT }}>
                  {isGroupee ? 'Groupée · ' : ''}
                  {o.dateLivraison ? new Date(o.dateLivraison).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  {o.lieuLivraison ? ` · ${o.lieuLivraison}` : ''}
                </p>
              </div>
              <StatusPill statut={st} />
              <p className="text-[13px] font-bold shrink-0 hidden sm:block" style={{ color: TEXT }}>
                {formatFCFA(o.total || o.totalEstime || o.montantTotal || 0)}
              </p>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: FAINT }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
