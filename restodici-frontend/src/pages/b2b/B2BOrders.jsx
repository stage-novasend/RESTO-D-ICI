import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, Plus, ChevronRight, ArrowLeft, AlertCircle, Lock, CalendarDays } from 'lucide-react';
import { b2bAPI } from '../../services/api';
import { commandesService } from '../../services/commandes.service';
import { formatFCFA } from '../../utils/formatters';

import {
  BG, SURFACE as CARD, TEXT, MUTED_WARM as MUTED, MUTED_WARM as FAINT, BORDER_SOFT as BORDER,
  ORANGE as ACC, ORANGE_PEACH as ACL,
} from '../../theme/colors';
const SH = '0 1px 3px rgba(139,110,80,0.07),0 1px 2px rgba(139,110,80,0.04)';

const STATUS = {
  EN_ATTENTE:     { label: 'En attente',     color: '#D97706', bg: '#FFFBEB', dot: '#FBBF24' },
  RECUE:          { label: 'Reçue',          color: '#2563EB', bg: '#EFF6FF', dot: '#60A5FA' },
  CONFIRMEE:      { label: 'Confirmée',      color: '#059669', bg: '#ECFDF5', dot: '#34D399' },
  EN_PREP:        { label: 'En préparation', color: '#D97706', bg: '#FFFBEB', dot: '#FBBF24' },
  EN_PREPARATION: { label: 'En préparation', color: '#D97706', bg: '#FFFBEB', dot: '#FBBF24' },
  PRETE:          { label: 'Prête',          color: '#059669', bg: '#ECFDF5', dot: '#34D399' },
  EN_LIVRAISON:   { label: 'En livraison',   color: '#7C3AED', bg: '#F5F3FF', dot: '#A78BFA' },
  LIVREE:         { label: 'Livrée',         color: '#059669', bg: '#ECFDF5', dot: '#34D399' },
  ANNULEE:        { label: 'Annulée',        color: '#DC2626', bg: '#FEF2F2', dot: '#F87171' },
};
const ACTIVE = ['EN_ATTENTE','RECUE','CONFIRMEE','EN_PREP','EN_PREPARATION','PRETE','EN_LIVRAISON'];

function StatusPill({ statut }) {
  const s = STATUS[statut] || { label: statut, color: MUTED, bg: BG, dot: BORDER };
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

export default function B2BOrders() {
  const navigate = useNavigate();
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [isBlocked, setBlocked] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      b2bAPI.getOrders(),
      commandesService.getMyOrders(),
      b2bAPI.getCompte(),
    ]).then(([b2bR, menuR, compteR]) => {
      const b2b  = b2bR.status  === 'fulfilled' ? (b2bR.value.data || []) : [];
      const menu = menuR.status === 'fulfilled' ? (menuR.value.data || []).map(o => ({ ...o, _src: 'menu' })) : [];
      setOrders([...b2b, ...menu].sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0)));
      if (compteR.status === 'fulfilled') {
        setBlocked(compteR.value.data?.blocked === true);
      }
    }).finally(() => setLoading(false));
  }, []);

  const active = orders.filter(o => ACTIVE.includes(o.statut ?? o.status ?? ''));
  const done   = orders.filter(o => ['LIVREE','ANNULEE'].includes(o.statut ?? o.status ?? ''));
  const shown  = filter === 'active' ? active : filter === 'done' ? done : orders;

  return (
    <div className="min-h-screen" style={{ background: BG }}>

      {/* Page header — unified white/orange */}
      <div className="sticky top-0 z-10 bg-white" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link to="/b2b" className="flex items-center gap-1.5 text-[12px] font-medium hover:opacity-70 transition"
            style={{ color: '#8B6E50' }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <span style={{ color: 'rgba(0,0,0,0.15)' }}>›</span>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #EA580C, #C2410C)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShoppingBag className="w-3.5 h-3.5 text-white" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1A0C00', margin: 0, flex: 1 }}>Commandes</p>
          {isBlocked ? (
            <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-white"
              style={{ background: '#8B6E50', cursor: 'not-allowed' }}
              title="Compte bloqué — réglez votre facture mensuelle">
              <Lock className="w-3.5 h-3.5" /> Bloqué
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/b2b/order?mode=schedule"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition hover:opacity-80"
                style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
                <CalendarDays className="w-3.5 h-3.5" /> Planifier
              </Link>
              <Link to="/b2b/order?mode=instant"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold text-white transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #EA580C, #C2410C)', boxShadow: '0 2px 8px rgba(255,140,0,0.40)' }}>
                <Plus className="w-3.5 h-3.5" /> Nouvelle commande
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* Blocked account banner */}
        {isBlocked && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">Compte bloqué — commandes désactivées</p>
              <p className="text-xs text-red-600 mt-1">
                Une facture mensuelle est impayée. Réglez-la pour reprendre vos commandes.
              </p>
            </div>
            <Link to="/b2b/invoices"
              className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
              style={{ background: '#DC2626' }}>
              Voir les factures
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total',     value: orders.length, bg: '#1A0C00' },
            { label: 'En cours',  value: active.length, bg: '#EA580C' },
            { label: 'Terminées', value: done.length,   bg: '#10B981' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: s.bg }}>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5 flex-wrap">
          {[
            { k: 'all',    label: `Toutes (${orders.length})` },
            { k: 'active', label: `En cours (${active.length})` },
            { k: 'done',   label: `Terminées (${done.length})` },
          ].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium border transition"
              style={{
                background: filter === f.k ? ACC : CARD,
                color: filter === f.k ? '#fff' : MUTED,
                borderColor: filter === f.k ? ACC : BORDER,
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="rounded-xl overflow-hidden" style={{ background: CARD, boxShadow: SH }}>
          {loading ? (
            <div className="p-4 space-y-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: BG }} />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3" style={{ color: BORDER }} />
              <p className="text-sm font-medium mb-1" style={{ color: MUTED }}>Aucune commande</p>
              <Link to="/b2b/order"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white mt-3"
                style={{ background: ACC }}>
                <ShoppingBag className="w-3.5 h-3.5" /> Commander maintenant
              </Link>
            </div>
          ) : shown.map((o, idx, arr) => {
            const st = o.statut ?? o.status ?? '';
            const isGroupee = o.numero?.startsWith('GRP-') || o.type === 'GROUPEE';
            return (
              <button key={o.id}
                className="w-full flex items-center gap-4 px-5 py-4 transition text-left"
                style={{ borderBottom: idx < arr.length - 1 ? `1px solid ${BORDER}` : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = BG}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onClick={() => navigate(isGroupee ? `/b2b/suivi/${o.id}` : `/suivi/${o.id}`)}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: isGroupee ? '#EFF6FF' : ACL }}>
                  <ShoppingBag className="w-4 h-4" style={{ color: isGroupee ? '#3B82F6' : ACC }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: TEXT }}>
                    {o.numero || o.restaurantNom || `#${o.id?.slice(0, 8)}`}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: FAINT }}>
                    {isGroupee ? 'Groupée · ' : ''}
                    {o.dateLivraison
                      ? new Date(o.dateLivraison).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                    {o.lieuLivraison ? ` · ${o.lieuLivraison}` : ''}
                  </p>
                </div>
                <StatusPill statut={st} />
                <p className="text-[13px] font-semibold shrink-0 hidden sm:block" style={{ color: TEXT }}>
                  {formatFCFA(o.total || o.totalEstime || o.montantTotal || 0)}
                </p>
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: FAINT }} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
