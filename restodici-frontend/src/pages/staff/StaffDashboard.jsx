import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, CheckCircle2, ChefHat,
  CircleDollarSign, Clock, Package, RefreshCw, Save,
  ShieldCheck, User, Wallet, Truck, Calendar, Activity,
  X, Boxes, LayoutDashboard, ListOrdered, UtensilsCrossed,
  Minus, Plus, Zap, CheckCircle, Coffee, Bell, Search,
  Filter, MoreVertical, TrendingUp, DollarSign, AlertCircle,
  Settings, LogOut, Menu
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import OnboardingWizard from '../../components/wizard/OnboardingWizard';
import { commandesService, createCommandesSocket } from '../../services/commandes.service';
import { stocksAPI, authAPI, b2bAPI } from '../../services/api';
import NewOrderModal from '../../components/staff/NewOrderModal';
import SecurityPanel from '../../components/security/SecurityPanel';
import NotificationBell from '../../components/notifications/NotificationBell';
import {
  formatDeliveryMode, formatFCFA,
  STATUS_LABELS, timeAgo,
} from '../../utils/formatters';
import DispatchModal from '../../components/livraison/DispatchModal';
import EconomicReconciliation from '../../components/staff/EconomicReconciliation';

// ─── Palette ──────────────────────────────────────────────────────────────────
const BG        = '#F9F7F5';
const SURFACE   = '#FFFFFF';
const TEXT      = '#2D2720';
const TEXT_LIGHT = '#8B7355';
const BORDER    = '#E8E2D9';
const ORANGE    = '#FF8C00';
const GREEN     = '#16A34A';
const GREEN_LIGHT = '#22C55E';
const GREEN_BG  = '#F0FDF4';
const GREEN_BORDER = '#BBF7D0';
const DANGER    = '#EF4444';
const SHADOW    = '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)';
const RADIUS    = '12px';

// ─── Domain constants ─────────────────────────────────────────────────────────
const STATUS_FLOW = {
  RECUE: ['CONFIRMEE'],
  CONFIRMEE: ['EN_PREP'],
  EN_PREP: ['PRETE'],
  PRETE: ['EN_LIVRAISON', 'LIVREE'],
  EN_LIVRAISON: ['LIVREE'],
  LIVREE: [],
  ANNULEE: [],
};

const ACTION_LABELS = {
  CONFIRMEE: 'Confirmer',
  EN_PREP: 'Démarrer',
  PRETE: 'Prête',
  EN_LIVRAISON: 'En livraison',
  LIVREE: 'Livrée',
};

const B2B_STATUS_FLOW = {
  EN_ATTENTE: ['CONFIRMEE'],
  CONFIRMEE: ['EN_PREPARATION'],
  EN_PREPARATION: ['LIVREE'],
  LIVREE: [],
  ANNULEE: [],
};

const B2B_STATUS_LABELS = {
  EN_ATTENTE: 'En attente',
  CONFIRMEE: 'Confirmée',
  EN_PREPARATION: 'En préparation',
  LIVREE: 'Livrée',
  ANNULEE: 'Annulée',
};

const B2B_ACTION_LABELS = {
  CONFIRMEE: 'Confirmer',
  EN_PREPARATION: 'Démarrer',
  LIVREE: 'Livrer',
};

const STATUS_CONFIG = {
  RECUE:        { bg: '#DBEAFE', text: '#1D4ED8', border: '#93C5FD', dot: '#2563EB', label: 'Reçue' },
  CONFIRMEE:    { bg: '#EDE9FE', text: '#5B21B6', border: '#C4B5FD', dot: '#7C3AED', label: 'Confirmée' },
  EN_PREP:      { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D', dot: '#D97706', label: 'En préparation' },
  PRETE:        { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC', dot: '#16A34A', label: 'Prête' },
  EN_LIVRAISON: { bg: '#E0E7FF', text: '#3730A3', border: '#A5B4FC', dot: '#4F46E5', label: 'En livraison' },
  LIVREE:       { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC', dot: '#16A34A', label: 'Livrée' },
  ANNULEE:      { bg: '#FFE4E6', text: '#BE123C', border: '#FCA5A5', dot: DANGER,    label: 'Annulée' },
  EN_ATTENTE:   { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1', dot: '#64748B', label: 'En attente' },
  EN_PREPARATION: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D', dot: '#D97706', label: 'En préparation' },
};

const KDS_COLS = [
  { key: 'new',   label: 'Nouvelles',      dot: '#3B82F6', statuses: ['RECUE', 'CONFIRMEE'] },
  { key: 'prep',  label: 'En préparation', dot: '#F59E0B', statuses: ['EN_PREP'] },
  { key: 'ready', label: 'Prêtes',         dot: GREEN_LIGHT, statuses: ['PRETE'] },
  { key: 'deliv', label: 'En livraison',   dot: '#6366F1', statuses: ['EN_LIVRAISON'] },
];

const PIPELINE_STEPS = ['RECUE', 'CONFIRMEE', 'EN_PREP', 'PRETE', 'EN_LIVRAISON', 'LIVREE'];
const PIPELINE_LABELS = ['Reçue', 'Confirmée', 'Prép.', 'Prête', 'Livraison', 'Livrée'];

const WEEK_DAYS = [
  { init: 'LU', name: 'Lundi' },
  { init: 'MA', name: 'Mardi' },
  { init: 'ME', name: 'Mercredi' },
  { init: 'JE', name: 'Jeudi' },
  { init: 'VE', name: 'Vendredi' },
  { init: 'SA', name: 'Samedi' },
  { init: 'DI', name: 'Dimanche' },
];

function buildWeek(open, close) {
  const label = open && close ? `${open} – ${close}` : null;
  return WEEK_DAYS.map(({ init, name }) => ({ init, name, hours: label || 'Non configuré', rest: !label }));
}

function isInService(open, close) {
  if (!open || !close) return false;
  const now = new Date();
  const [oh, om] = open.split(':').map(Number);
  const [ch, cm] = close.split(':').map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur >= oh * 60 + om && cur < ch * 60 + cm;
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function Spinner({ size = 16 }) {
  return (
    <div style={{ width: size, height: size }} className="animate-spin">
      <div className="w-full h-full rounded-full border-2 border-current border-t-transparent" />
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.RECUE;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
      style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {STATUS_LABELS[status] || cfg.label || status}
    </span>
  );
}

function TimerBadge({ minutesAgo }) {
  const isLate = minutesAgo >= 20;
  const isWarn = !isLate && minutesAgo >= 10;
  return (
    <div
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${isLate ? 'animate-pulse' : ''}`}
      style={
        isLate
          ? { background: '#FFF1F2', color: '#BE123C', borderColor: '#FECDD3' }
          : isWarn
          ? { background: '#FFFBEB', color: '#B45309', borderColor: '#FDE68A' }
          : { background: '#F9F7F5', color: TEXT_LIGHT, borderColor: BORDER }
      }
    >
      <Clock className="w-3 h-3" />
      {minutesAgo}m
    </div>
  );
}

// ─── Pipeline progress bar ────────────────────────────────────────────────────
function PipelineBar({ status }) {
  const currentIdx = PIPELINE_STEPS.indexOf(status);
  return (
    <div className="mt-3 mb-1">
      <div className="flex gap-1">
        {PIPELINE_STEPS.map((step, i) => (
          <div
            key={step}
            title={PIPELINE_LABELS[i]}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: i < currentIdx ? GREEN : i === currentIdx ? ORANGE : BORDER,
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span style={{ fontSize: '0.6rem', color: TEXT_LIGHT }}>{PIPELINE_LABELS[Math.max(0, currentIdx)]}</span>
        {currentIdx < PIPELINE_STEPS.length - 1 && (
          <span style={{ fontSize: '0.6rem', color: TEXT_LIGHT }}>{PIPELINE_LABELS[currentIdx + 1]} →</span>
        )}
      </div>
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, value, label, color, bg, border }) {
  return (
    <div
      className="relative flex flex-col rounded-2xl border overflow-hidden"
      style={{ background: SURFACE, borderColor: BORDER, boxShadow: SHADOW }}
    >
      {/* Bande couleur haut */}
      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${color}, ${color}99)` }} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: color + '15', border: `1px solid ${color}25` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div className="text-right">
            <p className="text-[2rem] font-black leading-none tracking-tight" style={{ color: TEXT }}>{value}</p>
          </div>
        </div>
        <p className="text-[0.68rem] font-black uppercase tracking-widest mt-1" style={{ color: TEXT_LIGHT }}>{label}</p>
        <div className="mt-2 h-0.5 rounded-full" style={{ background: `linear-gradient(90deg, ${color}40, transparent)`, width: '60%' }} />
      </div>
    </div>
  );
}

// ─── StaffOrderCard ───────────────────────────────────────────────────────────
function StaffOrderCard({ order, onAction, onPayment, paymentDraft, setPaymentDraft, saving, onDispatch }) {
  const age = order.createdAt ? Date.now() - new Date(order.createdAt).getTime() : 0;
  const minutesAgo = Math.floor(age / 60000);
  const isUrgent = age >= 15 * 60 * 1000;
  const timeStr = order.createdAt ? new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
  const nextStatuses = STATUS_FLOW[order.statut] || [];
  const canCancel = order.statut === 'RECUE' && age < 5 * 60 * 1000;
  const note = order.notes || order.commentaire;
  const draft = paymentDraft || {};
  const statusCfg = STATUS_CONFIG[order.statut] || STATUS_CONFIG.RECUE;
  const leftBorderColor = isUrgent ? DANGER : statusCfg.dot;

  return (
    <div
      className="rounded-xl border overflow-hidden transition-all duration-200"
      style={{
        background: isUrgent ? '#FFF5F5' : SURFACE,
        borderColor: isUrgent ? '#FECDD3' : BORDER,
        boxShadow: SHADOW,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 24px -6px rgba(0,0,0,0.14)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = SHADOW; }}
    >
      {/* Barre couleur statut en haut */}
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${leftBorderColor}, ${leftBorderColor}66)` }} />
      <div className="p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: isUrgent ? '#FECDD3' : statusCfg.bg }}
          >
            <ChefHat className="w-4 h-4" style={{ color: isUrgent ? '#BE123C' : statusCfg.dot }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="px-2 py-0.5 rounded-md text-xs font-bold" style={{ background: '#F9F7F5', color: TEXT }}>
                #{order.numero}
              </span>
              <StatusBadge status={order.statut} />
              {order.modeLivraison && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border" style={{ background: '#FFF7ED', color: ORANGE, borderColor: '#FDBA74' }}>
                  {formatDeliveryMode(order.modeLivraison)}
                </span>
              )}
              {isUrgent && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black animate-pulse" style={{ background: DANGER, color: '#FFF' }}>
                  URGENT
                </span>
              )}
            </div>
            <p className="font-semibold text-sm truncate" style={{ color: TEXT }}>
              {(order.lignes || []).map(l => l.article?.nom).filter(Boolean).join(', ') || `Commande ${order.numero}`}
            </p>
            <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: TEXT_LIGHT }}>
              <Clock className="w-3 h-3" /> {timeStr}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <TimerBadge minutesAgo={minutesAgo} />
          <p className="text-base font-black" style={{ color: ORANGE }}>
            {(Number(order.montantTotal) || 0).toLocaleString('fr-FR')}{' '}
            <span className="text-[10px] font-normal" style={{ color: TEXT_LIGHT }}>FCFA</span>
          </p>
        </div>
      </div>

      {/* Articles */}
      {(order.lignes || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {order.lignes.slice(0, 4).map((l, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs border" style={{ background: BG, borderColor: BORDER, color: TEXT }}>
              <span className="font-black" style={{ color: ORANGE }}>{l.quantite}×</span>
              {l.article?.nom || 'Article'}
            </span>
          ))}
          {order.lignes.length > 4 && (
            <span className="px-2 py-1 rounded-lg text-xs border" style={{ background: BG, borderColor: BORDER, color: TEXT_LIGHT }}>
              +{order.lignes.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Note */}
      {note && (
        <div className="flex gap-2 rounded-xl p-2.5 mb-3 border" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#D97706' }} />
          <span className="text-sm font-medium" style={{ color: '#92400E' }}>{note}</span>
        </div>
      )}

      {/* Pipeline */}
      <PipelineBar status={order.statut} />

      {/* Payment */}
      {!order.estPaye && (
        <div className="rounded-xl p-3 mb-3 border mt-3" style={{ background: BG, borderColor: BORDER }}>
          <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: TEXT_LIGHT }}>
            <CircleDollarSign className="w-3.5 h-3.5" style={{ color: GREEN }} /> Encaissement
          </p>
          <div className="flex gap-2">
            <select
              value={draft.modePaiement || 'ESPECES'}
              onChange={e => setPaymentDraft({ ...draft, modePaiement: e.target.value })}
              className="flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium focus:outline-none"
              style={{ borderColor: BORDER, background: SURFACE, color: TEXT }}
            >
              <option value="ESPECES">Espèces</option>
              <option value="CARTE_BANCAIRE">Carte</option>
              <option value="WAVE">Wave</option>
              <option value="ORANGE_MONEY">Orange Money</option>
              <option value="MTN_MONEY">MTN Money</option>
            </select>
            <input
              type="number"
              min="0"
              value={draft.montantRemis ?? Number(order.montantTotal)}
              onChange={e => setPaymentDraft({ ...draft, montantRemis: e.target.value })}
              className="w-24 rounded-lg border px-2.5 py-1.5 text-xs font-medium focus:outline-none"
              style={{ borderColor: BORDER, background: SURFACE, color: TEXT }}
            />
            <button
              onClick={() => onPayment(order)}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-black text-white transition-all disabled:opacity-50"
              style={{ background: saving ? '#94A3B8' : GREEN }}
            >
              {saving ? <Spinner size={14} /> : 'OK'}
            </button>
          </div>
          {Number(draft.montantRemis) > Number(order.montantTotal) && (
            <p className="text-xs font-bold mt-2" style={{ color: GREEN }}>
              Rendu : {formatFCFA(Number(draft.montantRemis) - Number(order.montantTotal))}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      {nextStatuses.length > 0 && (
        <div className="flex gap-2 mt-2">
          {nextStatuses.map((ns, i) => (
            <button
              key={ns}
              onClick={() => onAction(order.id, ns)}
              disabled={saving}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={
                i === 0
                  ? { background: GREEN, color: '#FFF', boxShadow: `0 4px 12px ${GREEN}40` }
                  : { background: SURFACE, color: GREEN, border: `2px solid ${GREEN}` }
              }
            >
              {ACTION_LABELS[ns] || ns}
            </button>
          ))}
        </div>
      )}

      {canCancel && (
        <button
          onClick={() => onAction(order.id, 'ANNULEE')}
          disabled={saving}
          className="w-full mt-2 py-2 px-3 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-50"
          style={{ background: '#FFF5F5', color: '#BE123C', borderColor: '#FECDD3' }}
        >
          Annuler
        </button>
      )}

      {order.modeLivraison === 'LIVRAISON' && ['PRETE', 'EN_LIVRAISON'].includes(order.statut) && onDispatch && (
        <button
          onClick={() => onDispatch(order)}
          className="w-full mt-2 py-2 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5"
          style={{ background: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' }}
        >
          <Truck className="w-3 h-3" /> Dispatcher la livraison
        </button>
      )}
      </div>{/* fin p-4 */}
    </div>
  );
}

// ─── B2BOrderCard ─────────────────────────────────────────────────────────────
function B2BOrderCard({ order, onAction, saving }) {
  const age = order.createdAt ? Date.now() - new Date(order.createdAt).getTime() : 0;
  const minutesAgo = Math.floor(age / 60000);
  const isUrgent = age >= 15 * 60 * 1000;
  const timeStr = order.createdAt ? new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
  const nextStatuses = B2B_STATUS_FLOW[order.statut] || [];

  return (
    <div
      className="rounded-xl border p-4 transition-all duration-200"
      style={{
        background: '#FFFBEB',
        borderColor: isUrgent ? '#FCD34D' : '#FDE68A',
        borderLeft: `3px solid ${isUrgent ? '#D97706' : '#F59E0B'}`,
        boxShadow: SHADOW,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 16px -4px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = SHADOW; }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FEF3C7' }}>
            <Package className="w-4 h-4" style={{ color: '#D97706' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black" style={{ background: ORANGE, color: '#FFF' }}>B2B</span>
              <span className="px-2 py-0.5 rounded-md text-xs font-bold" style={{ background: '#FEF3C7', color: '#92400E' }}>#{order.numero}</span>
              <StatusBadge status={order.statut} />
              {isUrgent && <span className="px-2 py-0.5 rounded-md text-[10px] font-black animate-pulse" style={{ background: DANGER, color: '#FFF' }}>URGENT</span>}
            </div>
            <p className="font-semibold text-sm truncate" style={{ color: TEXT }}>{order.entreprise || 'Entreprise B2B'}</p>
            <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: TEXT_LIGHT }}>
              <Clock className="w-3 h-3" /> {timeStr}
            </p>
            {(order.dateLivraison || order.heureLivraison) && (
              <p className="text-[11px] mt-0.5 flex items-center gap-1 font-semibold" style={{ color: '#92400E' }}>
                <Truck className="w-3 h-3" />
                {order.dateLivraison ? new Date(order.dateLivraison).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : ''}
                {order.heureLivraison ? ` à ${order.heureLivraison}` : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <TimerBadge minutesAgo={minutesAgo} />
          {order.totalEstime != null && (
            <p className="text-base font-black" style={{ color: '#D97706' }}>
              {(Number(order.totalEstime) || 0).toLocaleString('fr-FR')}{' '}
              <span className="text-[10px] font-normal" style={{ color: TEXT_LIGHT }}>FCFA</span>
            </p>
          )}
        </div>
      </div>

      {(order.lignes || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {order.lignes.slice(0, 4).map((l, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs border" style={{ background: SURFACE, borderColor: '#FDE68A', color: '#92400E' }}>
              <span className="font-black">{l.quantite}×</span> {l.nomArticle || 'Article'}
            </span>
          ))}
          {order.lignes.length > 4 && (
            <span className="px-2 py-1 rounded-lg text-xs border" style={{ background: SURFACE, borderColor: '#FDE68A', color: TEXT_LIGHT }}>
              +{order.lignes.length - 4}
            </span>
          )}
        </div>
      )}

      {nextStatuses.length > 0 && (
        <div className="flex gap-2">
          {nextStatuses.map((ns, i) => (
            <button
              key={ns}
              onClick={() => onAction(order.id, ns)}
              disabled={saving}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={
                i === 0
                  ? { background: '#D97706', color: '#FFF', boxShadow: '0 4px 12px #D9770640' }
                  : { background: SURFACE, color: '#D97706', border: '2px solid #D97706' }
              }
            >
              {B2B_ACTION_LABELS[ns] || ns}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── KDSBoard ─────────────────────────────────────────────────────────────────
function KDSBoard({ orders, b2bOrders, onAction, onB2BAction, onPayment, paymentDrafts, setPaymentDrafts, savingOrderId, savingB2BId, onDispatch }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {KDS_COLS.map(col => {
        const colOrders = orders
          .filter(o => col.statuses.includes(o.statut))
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const colB2B = b2bOrders
          .filter(o => col.statuses.some(s => s === o.statut || (s === 'RECUE' && o.statut === 'EN_ATTENTE') || (s === 'EN_PREP' && o.statut === 'EN_PREPARATION')))
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const total = colOrders.length + colB2B.length;

        return (
          <div key={col.key} className="rounded-xl overflow-hidden min-h-[400px]" style={{ background: BG, border: `1px solid ${BORDER}` }}>
            {/* En-tête colonne avec barre couleur */}
            <div className="h-1" style={{ background: col.dot }} />
            <div className="flex items-center justify-between px-4 py-3" style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.dot, boxShadow: `0 0 6px ${col.dot}66` }} />
                <span className="text-sm font-black" style={{ color: TEXT }}>{col.label}</span>
              </div>
              <span
                className="text-xs font-black px-2.5 py-1 rounded-full"
                style={total > 0
                  ? { background: col.dot + '18', color: col.dot, border: `1px solid ${col.dot}33` }
                  : { background: BG, color: TEXT_LIGHT, border: `1px solid ${BORDER}` }
                }
              >
                {total}
              </span>
            </div>
            <div className="p-3 space-y-3">
              {colOrders.map(o => (
                <StaffOrderCard
                  key={o.id}
                  order={o}
                  onAction={onAction}
                  onPayment={onPayment}
                  paymentDraft={paymentDrafts[o.id]}
                  setPaymentDraft={v => setPaymentDrafts(p => ({ ...p, [o.id]: v }))}
                  saving={savingOrderId === o.id}
                  onDispatch={onDispatch}
                />
              ))}
              {colB2B.map(o => (
                <B2BOrderCard key={o.id} order={o} onAction={onB2BAction} saving={savingB2BId === o.id} />
              ))}
              {total === 0 && (
                <div className="text-center py-10 px-3 rounded-xl border-2 border-dashed" style={{ background: SURFACE, borderColor: BORDER }}>
                  <ChefHat className="w-8 h-8 mx-auto mb-2" style={{ color: BORDER }} />
                  <p className="text-xs font-semibold" style={{ color: TEXT_LIGHT }}>Aucune commande</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── WeeklySchedule ───────────────────────────────────────────────────────────
function WeeklySchedule({ openingTime, closingTime }) {
  const todayIdx = (new Date().getDay() + 6) % 7;
  const week = buildWeek(openingTime, closingTime);
  const inService = isInService(openingTime, closingTime);

  return (
    <div className="rounded-xl border p-4" style={{ background: SURFACE, borderColor: BORDER, boxShadow: SHADOW }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-black" style={{ color: TEXT }}>Planning semaine</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full" style={{ background: inService ? GREEN_LIGHT : '#94A3B8' }} />
            <span className="text-xs font-bold" style={{ color: inService ? GREEN : TEXT_LIGHT }}>
              {inService ? 'En service' : 'Fermé'}
            </span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: BG }}>
          <Calendar className="w-4 h-4" style={{ color: TEXT_LIGHT }} />
        </div>
      </div>
      <div className="space-y-1">
        {week.map((day, i) => {
          const isToday = i === todayIdx;
          return (
            <div
              key={i}
              className="flex items-center gap-3 p-2 rounded-xl transition-colors"
              style={isToday ? { background: GREEN_BG, border: `1px solid ${GREEN_BORDER}` } : { border: '1px solid transparent' }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                style={isToday ? { background: GREEN, color: '#FFF' } : { background: BG, color: TEXT_LIGHT }}
              >
                {day.init}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate" style={{ color: isToday ? '#14532D' : TEXT }}>{day.name}</p>
                <p className="text-[10px] truncate" style={{ color: day.rest ? '#F43F5E' : TEXT_LIGHT }}>{day.hours}</p>
              </div>
              {isToday && (
                <span className="w-2 h-2 rounded-full" style={{ background: inService ? GREEN_LIGHT : '#F59E0B' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ToastList ────────────────────────────────────────────────────────────────
function ToastList({ toasts }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="rounded-xl p-4 shadow-2xl min-w-[300px] max-w-md pointer-events-auto border animate-[slideIn_0.3s_ease-out]"
          style={{ background: SURFACE, borderColor: BORDER }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: t.ok ? GREEN_BG : '#FFF7ED' }}
            >
              {t.ok
                ? <CheckCircle className="w-5 h-5" style={{ color: GREEN }} />
                : <UtensilsCrossed className="w-5 h-5" style={{ color: ORANGE }} />
              }
            </div>
            <div>
              <p className="text-sm font-black" style={{ color: TEXT }}>{t.title}</p>
              <p className="text-xs mt-0.5" style={{ color: TEXT_LIGHT }}>{t.msg}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StaffDashboard() {
  const { user, syncUser, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = new URLSearchParams(location.search).get('tab') || 'dashboard';
  const goTab = (id) => navigate(id === 'dashboard' ? '/staff' : `/staff?tab=${id}`);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showCloture, setShowCloture] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [orders, setOrders] = useState([]);
  const [b2bOrders, setB2bOrders] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [stockFilter, setStockFilter] = useState('all');
  const [orderFilter, setOrderFilter] = useState('board');
  const [loading, setLoading] = useState(true);
  const [savingOrderId, setSavingOrderId] = useState('');
  const [savingB2BId, setSavingB2BId] = useState('');
  const [savingStockId, setSavingStockId] = useState('');
  const [paymentDrafts, setPaymentDrafts] = useState({});
  const [actionHistory, setActionHistory] = useState([]);
  const [serverActivity, setServerActivity] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', telephone: '' });
  const [dispatchOrder, setDispatchOrder] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const pushToast = useCallback((title, msg, ok = false) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, title, msg, ok }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3800);
  }, []);

  useEffect(() => {
    if (user) setForm({ nom: user.nom ?? '', prenom: user.prenom ?? '', email: user.email ?? '', telephone: user.telephone ?? '' });
  }, [user]);

  const historyKey = user?.restaurant?.id
    ? `staff-history:${user.restaurant.id}`
    : `staff-history:${user?.id ?? 'global'}`;

  const appendHistory = useCallback((type, title, desc) => {
    const entry = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, type, title, desc, at: new Date().toISOString() };
    setActionHistory(cur => {
      const next = [entry, ...cur].slice(0, 10);
      try { localStorage.setItem(historyKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [historyKey]);

  const loadActivity = useCallback(async () => {
    try {
      const res = await commandesService.getRestaurantActivity(20);
      setServerActivity(Array.isArray(res.data) ? res.data : []);
    } catch {}
  }, []);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const [kdsRes, b2bRes, stocksRes] = await Promise.allSettled([
        commandesService.getKDS(),
        b2bAPI.getRestaurantKDS(),
        stocksAPI.getAll(),
      ]);
      setOrders(kdsRes.status === 'fulfilled' ? (kdsRes.value.data || []) : []);
      setB2bOrders(b2bRes.status === 'fulfilled' ? (b2bRes.value.data || []) : []);
      setStocks(stocksRes.status === 'fulfilled' ? (stocksRes.value.data || []) : []);
    } catch {}
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => {
    void refreshProfile();
    void refresh();
    void loadActivity();
    try {
      const stored = JSON.parse(localStorage.getItem(historyKey) || '[]');
      setActionHistory(Array.isArray(stored) ? stored : []);
    } catch { setActionHistory([]); }
  }, []);

  const userId = user?.id;
  const restaurantId = user?.restaurant?.id;
  const userRole = user?.role;

  useEffect(() => {
    if (!userId) return;
    const poll = setInterval(() => void refresh({ silent: true }), 8000);
    const socket = createCommandesSocket({ id: userId, role: userRole, restaurant: restaurantId ? { id: restaurantId } : undefined });

    socket.on('commande.nouvelle', p => {
      appendHistory('commande', `Commande #${p?.numero || ''}`, 'Nouvelle commande reçue');
      pushToast(`Commande #${p?.numero || ''}`, 'Nouvelle commande arrivée', true);
      void refresh({ silent: true });
    });
    socket.on('commande.statut', p => {
      appendHistory('statut', `#${p?.numero || ''} mis à jour`, `→ ${STATUS_LABELS[p?.statut] || p?.statut || '?'}`);
      void refresh({ silent: true });
    });
    socket.on('commande.paiement', p => {
      appendHistory('paiement', `Paiement #${p?.numero || ''}`, 'Encaissement validé');
      pushToast(`Paiement #${p?.numero || ''}`, 'Encaissement confirmé', true);
      void refresh({ silent: true });
    });
    socket.on('commande.b2b.nouvelle', p => {
      appendHistory('b2b', `B2B #${p?.numero || ''}`, p?.entreprise || 'Commande B2B');
      pushToast(`B2B #${p?.numero || ''}`, p?.entreprise || 'Commande entreprise', true);
      void refresh({ silent: true });
    });
    socket.on('commande.b2b.statut', () => void refresh({ silent: true }));
    socket.on('reconnect', () => void refresh({ silent: true }));

    return () => { clearInterval(poll); socket.disconnect(); };
  }, [appendHistory, pushToast, refresh, userId, restaurantId, userRole]);

  const activeOrders = useMemo(() => orders.filter(o => ['RECUE','CONFIRMEE','EN_PREP','PRETE','EN_LIVRAISON'].includes(o.statut)), [orders]);
  const urgentOrders = useMemo(() => activeOrders.filter(o => o.createdAt && Date.now() - new Date(o.createdAt).getTime() >= 15 * 60 * 1000), [activeOrders]);
  const todayStr = useMemo(() => new Date().toDateString(), []);
  const completedToday = useMemo(() => orders.filter(o => o.statut === 'LIVREE' && new Date(o.updatedAt || o.createdAt).toDateString() === todayStr), [orders, todayStr]);
  const encaissementsToday = useMemo(() => completedToday.reduce((s, o) => s + Number(o.montantTotal || 0), 0), [completedToday]);
  const activeB2B = useMemo(() => b2bOrders.filter(o => !['LIVREE','ANNULEE'].includes(o.statut)), [b2bOrders]);
  const allActive = useMemo(() => [...activeOrders.map(o => ({ ...o, _type: 'client' })), ...activeB2B.map(o => ({ ...o, _type: 'b2b' }))].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)), [activeOrders, activeB2B]);
  const stockAlerts = useMemo(() => stocks.filter(s => s.stock <= s.seuil), [stocks]);
  const displayedStocks = useMemo(() => stockFilter === 'alerts' ? stockAlerts : stocks, [stocks, stockAlerts, stockFilter]);

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'board') return allActive;
    if (orderFilter === 'b2b') return activeB2B.map(o => ({ ...o, _type: 'b2b' }));
    return [...activeOrders.map(o => ({ ...o, _type: 'client' })), ...completedToday.map(o => ({ ...o, _type: 'client' })), ...b2bOrders.map(o => ({ ...o, _type: 'b2b' }))].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [orderFilter, allActive, activeB2B, activeOrders, completedToday, b2bOrders]);

  const updateStatus = async (id, next) => {
    try {
      setSavingOrderId(id);
      await commandesService.updateStatut(id, next);
      appendHistory('action', 'Commande mise à jour', `→ ${STATUS_LABELS[next] || next}`);
      pushToast('Statut mis à jour', STATUS_LABELS[next] || next, true);
      void loadActivity();
      await refresh({ silent: true });
    } catch { pushToast('Erreur', 'Mise à jour impossible'); }
    finally { setSavingOrderId(''); }
  };

  const registerPayment = async (order) => {
    const draft = paymentDrafts[order.id] || {};
    const montantRemis = Number(draft.montantRemis ?? order.montantTotal);
    const modePaiement = draft.modePaiement || 'ESPECES';
    if (!Number.isFinite(montantRemis)) { pushToast('Erreur', 'Montant invalide'); return; }
    try {
      setSavingOrderId(order.id);
      await commandesService.registerPayment(order.id, { montantRemis, modePaiement });
      appendHistory('paiement', `Encaissement #${order.numero}`, modePaiement);
      pushToast(`Encaissement #${order.numero}`, 'Reçu envoyé', true);
      await refresh({ silent: true });
    } catch { pushToast('Erreur', 'Encaissement refusé'); }
    finally { setSavingOrderId(''); }
  };

  const updateB2BStatus = async (id, statut) => {
    try {
      setSavingB2BId(id);
      await b2bAPI.updateCommandeGroupeeStatut(id, statut);
      appendHistory('b2b', 'Commande B2B mise à jour', `→ ${B2B_STATUS_LABELS[statut] || statut}`);
      pushToast('B2B mis à jour', B2B_STATUS_LABELS[statut] || statut, true);
      await refresh({ silent: true });
    } catch { pushToast('Erreur', 'Mise à jour B2B impossible'); }
    finally { setSavingB2BId(''); }
  };

  const adjustStock = async (id, qty, motif) => {
    try {
      setSavingStockId(id);
      await stocksAPI.adjust(id, qty, motif);
      appendHistory('stock', 'Stock ajusté', `${motif} (${qty > 0 ? '+' : ''}${qty})`);
      pushToast('Stock ajusté', `${qty > 0 ? '+' : ''}${qty} unité${Math.abs(qty) > 1 ? 's' : ''}`, true);
      await refresh({ silent: true });
    } catch { pushToast('Erreur', 'Ajustement impossible'); }
    finally { setSavingStockId(''); }
  };

  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    setProfileError(''); setProfileSuccess('');
    if (!form.nom.trim() || !form.email.trim()) { setProfileError('Nom et email requis'); return; }
    setSavingProfile(true);
    try {
      const res = await authAPI.updateProfile(form);
      syncUser(res.data);
      setProfileSuccess('Profil mis à jour.');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) { setProfileError(err?.response?.data?.message || 'Erreur'); }
    finally { setSavingProfile(false); }
  };

  const initials = ((user?.prenom?.[0] ?? '') + (user?.nom?.[0] ?? '')).toUpperCase() || 'S';
  const firstName = user?.prenom || user?.nom || 'vous';
  const fullName = [user?.prenom, user?.nom].filter(Boolean).join(' ') || 'Mon Profil';

  // ── Tab config ──
  const TABS = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'commandes', label: 'Commandes',        icon: ListOrdered, badge: allActive.length || undefined },
    { id: 'stocks',    label: 'Stocks',           icon: Boxes, badge: stockAlerts.length || undefined, badgeRed: true },
  ];

  const pageTitle = TABS.find(t => t.id === activeTab)?.label || 'Tableau de bord';

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `linear-gradient(135deg, ${GREEN}, #15803D)` }}>
            <UtensilsCrossed className="w-7 h-7 text-white" />
          </div>
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: `${GREEN}40`, borderTopColor: 'transparent' }} />
          <p className="text-sm font-semibold" style={{ color: TEXT_LIGHT }}>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <OnboardingWizard />

      {/* ── SIDEBAR ── */}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 240,
          height: '100vh',
          background: SURFACE,
          borderRight: `1px solid ${BORDER}`,
          flexDirection: 'column',
          zIndex: 50,
          overflowY: 'auto',
          transform: sidebarOpen ? 'translateX(0)' : undefined,
          transition: 'transform 0.3s ease',
        }}
        className={sidebarOpen ? 'flex' : 'hidden lg:flex'}
      >
        {/* Logo */}
        <div style={{ padding: '1.5rem 1rem 1rem', borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${ORANGE}, #EA6C00)` }}
            >
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-black text-sm leading-tight" style={{ color: TEXT }}>Resto d'ici</p>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_LIGHT }}>Espace Staff</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {TABS.map(({ id, label, icon: Icon, badge, badgeRed }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => { goTab(id); setSidebarOpen(false); }}
                className="flex items-center gap-2.5 w-full text-left text-sm font-semibold transition-all rounded-xl"
                style={{
                  padding: '0.65rem 0.85rem',
                  background: isActive ? '#FFF7ED' : 'transparent',
                  color: isActive ? ORANGE : TEXT_LIGHT,
                  borderLeft: isActive ? `3px solid ${ORANGE}` : '3px solid transparent',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = BG; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {badge != null && badge > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-md text-[10px] font-black"
                    style={badgeRed ? { background: DANGER, color: '#FFF' } : { background: GREEN, color: '#FFF' }}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Clôture link */}
          <button
            onClick={() => { setShowCloture(true); setSidebarOpen(false); }}
            className="flex items-center gap-2.5 w-full text-left text-sm font-semibold transition-all rounded-xl mt-1"
            style={{ padding: '0.65rem 0.85rem', color: TEXT_LIGHT, borderLeft: '3px solid transparent' }}
            onMouseEnter={e => { e.currentTarget.style.background = BG; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Wallet className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">Clôture caisse</span>
          </button>

          {/* KDS link */}
          <Link
            to="/staff/kds"
            className="flex items-center gap-2.5 w-full text-sm font-semibold transition-all rounded-xl"
            style={{ padding: '0.65rem 0.85rem', color: TEXT_LIGHT, borderLeft: '3px solid transparent', textDecoration: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.background = BG; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <ChefHat className="w-4 h-4 flex-shrink-0" />
            <span>Mode KDS</span>
          </Link>
        </nav>

        {/* Nouvelle commande button */}
        <div style={{ padding: '0 0.75rem', marginBottom: '0.75rem' }}>
          <button
            onClick={() => { setShowNewOrder(true); setSidebarOpen(false); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${GREEN}, #15803D)`, boxShadow: `0 4px 12px ${GREEN}30` }}
          >
            <Plus className="w-4 h-4" />
            Nouvelle commande
          </button>
        </div>

        {/* Staff profile */}
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: '0.85rem 1rem' }}>
          <button
            onClick={() => setShowPanel(true)}
            className="flex items-center gap-2.5 w-full text-left transition-all rounded-xl hover:opacity-80"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm text-white flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${ORANGE}, #EA6C00)` }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: TEXT }}>{fullName}</p>
              <p className="text-[11px] truncate" style={{ color: TEXT_LIGHT }}>{user?.email || 'staff@restodici.ci'}</p>
            </div>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="lg:ml-[240px] min-h-screen flex flex-col">

        {/* Top bar */}
        <div
          className="sticky top-0 z-30 flex items-center justify-between px-5 py-3.5"
          style={{
            background: SURFACE,
            borderBottom: `1px solid ${BORDER}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          {/* Left: hamburger + title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl transition-colors"
              style={{ color: TEXT_LIGHT }}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-black" style={{ color: TEXT }}>{pageTitle}</h1>
              {activeTab === 'dashboard' && (
                <p className="text-[11px] hidden sm:block" style={{ color: TEXT_LIGHT }}>
                  {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              )}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: isAvailable ? GREEN_LIGHT : '#94A3B8' }} />
              <span className="text-xs font-semibold hidden sm:block" style={{ color: isAvailable ? GREEN : TEXT_LIGHT }}>
                {isAvailable ? 'Disponible' : 'Occupé'}
              </span>
            </div>

            <NotificationBell accentColor={GREEN} />

            <button
              onClick={() => void refresh()}
              className="p-2 rounded-xl transition-colors"
              style={{ color: TEXT_LIGHT }}
              title="Rafraîchir"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Avatar */}
            <button
              onClick={() => setShowPanel(true)}
              className="w-8 h-8 rounded-full font-black text-sm flex items-center justify-center text-white transition-all hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${ORANGE}, #EA6C00)` }}
            >
              {initials}
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-5 lg:p-6">

          {/* ── DASHBOARD TAB ── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-5">

              {/* Hero welcome card */}
              <div className="rounded-2xl overflow-hidden" style={{ background: SURFACE, boxShadow: SHADOW, border: `1px solid ${BORDER}` }}>
                {/* Bande dégradé haut */}
                <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${GREEN}, ${GREEN_LIGHT}, ${ORANGE})` }} />
                <div className="p-5 lg:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div
                          className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg"
                          style={{ background: `linear-gradient(135deg, ${ORANGE}, #C96200)` }}
                        >
                          {initials}
                        </div>
                        <div
                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white"
                          style={{ background: isAvailable ? GREEN_LIGHT : '#94A3B8' }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: GREEN }}>
                          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        <h2 className="text-xl font-black mb-1 truncate" style={{ color: TEXT }}>
                          Bonjour, {firstName} !
                        </h2>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: allActive.length > 0 ? ORANGE : GREEN_LIGHT }} />
                          <p className="text-sm truncate" style={{ color: TEXT_LIGHT }}>
                            {allActive.length === 0
                              ? 'Aucune commande active pour le moment'
                              : `${allActive.length} commande${allActive.length > 1 ? 's' : ''} active${allActive.length > 1 ? 's' : ''}${urgentOrders.length > 0 ? ` · ${urgentOrders.length} urgente${urgentOrders.length > 1 ? 's' : ''}` : ' · Tout sous contrôle'}`}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Disponibilité toggle */}
                    <div className="flex items-center gap-1 rounded-xl p-1 flex-shrink-0" style={{ background: BG, border: `1px solid ${BORDER}` }}>
                      <button
                        onClick={() => setIsAvailable(true)}
                        className="px-4 py-2 rounded-lg text-sm font-black transition-all"
                        style={isAvailable
                          ? { background: GREEN, color: '#FFF', boxShadow: `0 4px 12px ${GREEN}40` }
                          : { color: TEXT_LIGHT }
                        }
                      >
                        Disponible
                      </button>
                      <button
                        onClick={() => setIsAvailable(false)}
                        className="px-4 py-2 rounded-lg text-sm font-black transition-all"
                        style={!isAvailable
                          ? { background: SURFACE, color: TEXT, boxShadow: '0 2px 8px #0001' }
                          : { color: TEXT_LIGHT }
                        }
                      >
                        Occupé
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-5" style={{ borderTop: `1px solid ${BORDER}` }}>
                    <StatCard
                      icon={CheckCircle}
                      value={completedToday.length}
                      label="Livrées aujourd'hui"
                      color={GREEN}
                      bg={GREEN_BG}
                      border={GREEN_BORDER}
                    />
                    <StatCard
                      icon={Wallet}
                      value={encaissementsToday > 0 ? formatFCFA(encaissementsToday) : '—'}
                      label="Encaissé aujourd'hui"
                      color={ORANGE}
                      bg="#FFF7ED"
                      border="#FED7AA"
                    />
                    <StatCard
                      icon={Activity}
                      value={allActive.length}
                      label="En cours"
                      color="#6366F1"
                      bg="#EEF2FF"
                      border="#C7D2FE"
                    />
                    <StatCard
                      icon={AlertTriangle}
                      value={urgentOrders.length}
                      label="Urgentes"
                      color={urgentOrders.length > 0 ? '#DC2626' : GREEN}
                      bg={urgentOrders.length > 0 ? '#FFF5F5' : GREEN_BG}
                      border={urgentOrders.length > 0 ? '#FECDD3' : GREEN_BORDER}
                    />
                  </div>
                </div>
              </div>

              {/* Main grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Commandes en cours */}
                <div className="lg:col-span-2">
                  <div className="rounded-xl border overflow-hidden" style={{ background: SURFACE, borderColor: BORDER, boxShadow: SHADOW }}>
                    <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: BORDER }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#FFF7ED' }}>
                          <ChefHat className="w-4 h-4" style={{ color: ORANGE }} />
                        </div>
                        <h3 className="font-black text-sm" style={{ color: TEXT }}>Commandes en cours</h3>
                      </div>
                      <button
                        onClick={() => goTab('commandes')}
                        className="flex items-center gap-1 text-xs font-bold transition-colors"
                        style={{ color: GREEN }}
                      >
                        Voir tout <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {allActive.length === 0 ? (
                      <div className="text-center py-12 px-6">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: GREEN_BG }}>
                          <Coffee className="w-7 h-7" style={{ color: GREEN }} />
                        </div>
                        <p className="font-black text-base mb-1" style={{ color: TEXT }}>Calme plat</p>
                        <p className="text-sm mb-4" style={{ color: TEXT_LIGHT }}>Les nouvelles commandes apparaissent ici en temps réel.</p>
                        <button
                          onClick={() => setShowNewOrder(true)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:scale-105"
                          style={{ background: `linear-gradient(135deg, ${GREEN}, #15803D)`, boxShadow: `0 4px 16px ${GREEN}40` }}
                        >
                          <Plus className="w-4 h-4" /> Nouvelle commande
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 space-y-3">
                        {allActive.slice(0, 4).map(order => order._type === 'b2b' ? (
                          <B2BOrderCard key={order.id} order={order} onAction={updateB2BStatus} saving={savingB2BId === order.id} />
                        ) : (
                          <StaffOrderCard
                            key={order.id}
                            order={order}
                            onAction={updateStatus}
                            onPayment={registerPayment}
                            paymentDraft={paymentDrafts[order.id]}
                            setPaymentDraft={v => setPaymentDrafts(p => ({ ...p, [order.id]: v }))}
                            saving={savingOrderId === order.id}
                            onDispatch={setDispatchOrder}
                          />
                        ))}
                        {allActive.length > 4 && (
                          <button
                            onClick={() => goTab('commandes')}
                            className="w-full py-2.5 text-sm font-black rounded-xl transition-colors"
                            style={{ background: GREEN_BG, color: GREEN }}
                          >
                            Voir les {allActive.length - 4} autres commandes →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right sidebar */}
                <div className="space-y-4">
                  {urgentOrders.length > 0 && (
                    <div
                      className="flex items-center gap-3 rounded-xl px-4 py-3 border"
                      style={{ background: '#FFF5F5', borderColor: '#FECDD3', boxShadow: SHADOW }}
                    >
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#BE123C' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black" style={{ color: '#9F1239' }}>
                          {urgentOrders.length} urgente{urgentOrders.length > 1 ? 's' : ''}
                        </p>
                        <p className="text-[11px]" style={{ color: '#BE123C' }}>+15 min sans traitement</p>
                      </div>
                      <button
                        onClick={() => goTab('commandes')}
                        className="px-3 py-1.5 rounded-xl text-xs font-black text-white flex-shrink-0"
                        style={{ background: '#BE123C' }}
                      >
                        Traiter
                      </button>
                    </div>
                  )}

                  <WeeklySchedule openingTime={user?.restaurant?.openingTime} closingTime={user?.restaurant?.closingTime} />

                  {stockAlerts.length > 0 && (
                    <div className="rounded-xl border p-4" style={{ background: SURFACE, borderColor: '#FECDD3', boxShadow: SHADOW }}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-black text-sm flex items-center gap-2" style={{ color: '#BE123C' }}>
                          <AlertTriangle className="w-4 h-4" /> Alertes stock
                        </h3>
                        <button onClick={() => goTab('stocks')} className="text-xs font-bold" style={{ color: GREEN }}>Gérer →</button>
                      </div>
                      <div className="space-y-2">
                        {stockAlerts.slice(0, 3).map(item => (
                          <div key={item.id} className="p-3 rounded-xl border" style={
                            item.stock <= 0
                              ? { background: '#FFF5F5', borderColor: '#FECDD3' }
                              : { background: '#FFFBEB', borderColor: '#FDE68A' }
                          }>
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-bold truncate flex-1" style={{ color: TEXT }}>{item.nom}</p>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black ml-2" style={
                                item.stock <= 0
                                  ? { background: '#BE123C', color: '#FFF' }
                                  : { background: '#D97706', color: '#FFF' }
                              }>
                                {item.stock <= 0 ? 'RUPTURE' : 'FAIBLE'}
                              </span>
                            </div>
                            <p className="text-[11px] mt-1" style={{ color: TEXT_LIGHT }}>Stock: {item.stock} · Seuil: {item.seuil}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(serverActivity.length > 0 || actionHistory.length > 0) && (
                    <div className="rounded-xl border p-4" style={{ background: SURFACE, borderColor: BORDER, boxShadow: SHADOW }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: GREEN_BG }}>
                            <Activity className="w-3.5 h-3.5" style={{ color: GREEN }} />
                          </div>
                          <h3 className="font-black text-sm" style={{ color: TEXT }}>Activité récente</h3>
                        </div>
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: GREEN_LIGHT }} />
                      </div>
                      <div className="space-y-2">
                        {(serverActivity.length > 0 ? serverActivity.slice(0, 5) : actionHistory.slice(0, 4)).map((entry) => {
                          const isServer = serverActivity.length > 0;
                          const color = isServer
                            ? (entry.statutNouvel === 'LIVREE' ? GREEN : entry.statutNouvel === 'ANNULEE' ? '#F43F5E' : entry.statutNouvel === 'EN_PREP' ? '#D97706' : ORANGE)
                            : (entry.type === 'paiement' ? GREEN : entry.type === 'commande' ? ORANGE : entry.type === 'b2b' ? '#D97706' : TEXT_LIGHT);
                          return (
                            <div key={entry.id} className="flex items-start gap-3 p-2 rounded-xl" style={{ background: BG }}>
                              <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color + '20' }}>
                                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate" style={{ color: TEXT }}>
                                  {isServer ? `#${entry.commandeNumero || entry.commandeId?.slice(0, 8)}` : entry.title}
                                  {isServer && <span className="ml-1" style={{ color }}>→ {STATUS_LABELS[entry.statutNouvel] || entry.statutNouvel}</span>}
                                </p>
                                <p className="text-[10px]" style={{ color: TEXT_LIGHT }}>
                                  {isServer ? (entry.actorNom ? `par ${entry.actorNom}` : '') : entry.desc}
                                </p>
                              </div>
                              <p className="text-[10px] flex-shrink-0" style={{ color: BORDER }}>
                                {timeAgo(isServer ? entry.createdAt : entry.at)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── COMMANDES TAB ── */}
          {activeTab === 'commandes' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { id: 'board', label: 'Tableau KDS', count: allActive.length },
                  { id: 'b2b',   label: 'B2B',         count: activeB2B.length },
                  { id: 'all',   label: 'Historique',  count: null },
                ].map(({ id, label, count }) => (
                  <button
                    key={id}
                    onClick={() => setOrderFilter(id)}
                    className="px-4 py-2 rounded-xl text-sm font-black transition-all"
                    style={
                      orderFilter === id
                        ? { background: GREEN, color: '#FFF', boxShadow: `0 4px 12px ${GREEN}40` }
                        : { background: SURFACE, color: TEXT, border: `1px solid ${BORDER}` }
                    }
                  >
                    {label}
                    {count != null && count > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-black" style={
                        orderFilter === id ? { background: '#fff3', color: '#FFF' } : { background: BG, color: TEXT_LIGHT }
                      }>
                        {count}
                      </span>
                    )}
                  </button>
                ))}
                <span className="ml-auto text-xs font-semibold flex items-center gap-1.5" style={{ color: TEXT_LIGHT }}>
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: GREEN_LIGHT }} />
                  Màj auto 8s
                </span>
              </div>

              {orderFilter === 'board' && (
                allActive.length === 0 ? (
                  <div className="text-center py-16 rounded-xl border" style={{ background: SURFACE, borderColor: BORDER }}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: GREEN_BG }}>
                      <ChefHat className="w-7 h-7" style={{ color: GREEN }} />
                    </div>
                    <p className="font-black text-base mb-1" style={{ color: TEXT }}>Le passe est calme</p>
                    <p className="text-sm mb-4" style={{ color: TEXT_LIGHT }}>Aucune commande active.</p>
                    <button
                      onClick={() => setShowNewOrder(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:scale-105"
                      style={{ background: `linear-gradient(135deg, ${GREEN}, #15803D)`, boxShadow: `0 4px 16px ${GREEN}40` }}
                    >
                      <Plus className="w-4 h-4" /> Nouvelle commande
                    </button>
                  </div>
                ) : (
                  <KDSBoard
                    orders={activeOrders}
                    b2bOrders={activeB2B}
                    onAction={updateStatus}
                    onB2BAction={updateB2BStatus}
                    onPayment={registerPayment}
                    paymentDrafts={paymentDrafts}
                    setPaymentDrafts={setPaymentDrafts}
                    savingOrderId={savingOrderId}
                    savingB2BId={savingB2BId}
                    onDispatch={setDispatchOrder}
                  />
                )
              )}

              {orderFilter === 'b2b' && (
                activeB2B.length === 0 ? (
                  <div className="text-center py-16 rounded-xl border" style={{ background: SURFACE, borderColor: BORDER }}>
                    <Package className="w-12 h-12 mx-auto mb-3" style={{ color: BORDER }} />
                    <p className="font-black" style={{ color: TEXT }}>Aucune commande B2B active</p>
                    <p className="text-sm mt-1" style={{ color: TEXT_LIGHT }}>Les commandes entreprise apparaissent ici.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {activeB2B.map(o => (
                      <B2BOrderCard key={o.id} order={o} onAction={updateB2BStatus} saving={savingB2BId === o.id} />
                    ))}
                  </div>
                )
              )}

              {orderFilter === 'all' && (
                filteredOrders.length === 0 ? (
                  <div className="text-center py-16 rounded-xl border" style={{ background: SURFACE, borderColor: BORDER }}>
                    <p className="font-black" style={{ color: TEXT }}>Aucune commande</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredOrders.map(order => order._type === 'b2b' ? (
                      <B2BOrderCard key={order.id} order={order} onAction={updateB2BStatus} saving={savingB2BId === order.id} />
                    ) : (
                      <StaffOrderCard
                        key={order.id}
                        order={order}
                        onAction={updateStatus}
                        onPayment={registerPayment}
                        paymentDraft={paymentDrafts[order.id]}
                        setPaymentDraft={v => setPaymentDrafts(p => ({ ...p, [order.id]: v }))}
                        saving={savingOrderId === order.id}
                        onDispatch={setDispatchOrder}
                      />
                    ))}
                  </div>
                )
              )}
            </div>
          )}

          {/* ── STOCKS TAB ── */}
          {activeTab === 'stocks' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Articles total',  value: stocks.length,                                color: ORANGE,    bg: '#FFF7ED', border: '#FED7AA' },
                  { label: 'Disponibles',     value: stocks.filter(s => s.stock > s.seuil).length, color: GREEN,     bg: GREEN_BG,  border: GREEN_BORDER },
                  { label: 'En alerte',       value: stockAlerts.length,                           color: '#BE123C', bg: '#FFF5F5', border: '#FECDD3' },
                ].map((s, i) => (
                  <div key={i} className="rounded-xl border p-5" style={{ background: s.bg, borderColor: s.border, boxShadow: SHADOW }}>
                    <p className="text-3xl font-black mb-1" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-sm font-bold" style={{ color: TEXT_LIGHT }}>{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border overflow-hidden" style={{ background: SURFACE, borderColor: BORDER, boxShadow: SHADOW }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b" style={{ borderColor: BORDER }}>
                  <div>
                    <h2 className="text-lg font-black" style={{ color: TEXT }}>Inventaire</h2>
                    <p className="text-sm" style={{ color: TEXT_LIGHT }}>
                      {stocks.length} article{stocks.length > 1 ? 's' : ''} ·{' '}
                      <span className="font-bold" style={{ color: stockAlerts.length > 0 ? '#BE123C' : GREEN }}>
                        {stockAlerts.length} alerte{stockAlerts.length !== 1 ? 's' : ''}
                      </span>
                    </p>
                  </div>
                  <div className="flex rounded-xl p-1" style={{ background: BG }}>
                    {[['all', 'Tous'], [`alerts`, `Alertes (${stockAlerts.length})`]].map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setStockFilter(key)}
                        className="px-4 py-1.5 rounded-lg text-sm font-bold transition-all"
                        style={stockFilter === key
                          ? { background: SURFACE, color: TEXT, boxShadow: '0 2px 8px #0001' }
                          : { color: TEXT_LIGHT }
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {displayedStocks.length === 0 ? (
                  <div className="text-center py-14 border-2 border-dashed m-4 rounded-xl" style={{ borderColor: BORDER }}>
                    <Package className="w-12 h-12 mx-auto mb-3" style={{ color: BORDER }} />
                    <p className="font-black" style={{ color: TEXT }}>Aucun article</p>
                    <p className="text-sm mt-1" style={{ color: TEXT_LIGHT }}>
                      {stockFilter === 'alerts' ? 'Tous les stocks sont OK.' : 'Les articles apparaîtront ici.'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: BORDER }}>
                    {displayedStocks.map(item => {
                      const isRupture = item.stock <= 0;
                      const isLow = !isRupture && item.stock <= item.seuil;
                      const pct = item.seuil > 0 ? Math.min(100, Math.round((item.stock / (item.seuil * 3)) * 100)) : 50;
                      const barColor = isRupture ? DANGER : isLow ? '#F59E0B' : GREEN;
                      return (
                        <div key={item.id} className="flex items-center gap-4 px-5 py-4 transition-colors" style={{ background: SURFACE }}
                          onMouseEnter={e => { e.currentTarget.style.background = BG; }}
                          onMouseLeave={e => { e.currentTarget.style.background = SURFACE; }}
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: isRupture ? '#FFF5F5' : isLow ? '#FFFBEB' : GREEN_BG }}
                          >
                            {isRupture
                              ? <AlertTriangle className="w-5 h-5" style={{ color: DANGER }} />
                              : isLow
                              ? <AlertCircle className="w-5 h-5" style={{ color: '#F59E0B' }} />
                              : <CheckCircle className="w-5 h-5" style={{ color: GREEN }} />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <p className="font-bold truncate" style={{ color: TEXT }}>{item.nom}</p>
                              {item.categorie && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold flex-shrink-0" style={{ background: BG, color: TEXT_LIGHT }}>
                                  {item.categorie}
                                </span>
                              )}
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: BORDER }}>
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                            </div>
                            <p className="text-xs" style={{ color: TEXT_LIGHT }}>
                              <span className="font-black" style={{ color: barColor }}>{item.stock}</span>
                              {' '}{item.unite || ''} en stock · seuil {item.seuil}
                            </p>
                          </div>
                          <span
                            className="px-2.5 py-1 rounded-lg text-xs font-black flex-shrink-0"
                            style={
                              isRupture ? { background: '#FFF5F5', color: '#BE123C' }
                              : isLow ? { background: '#FFFBEB', color: '#D97706' }
                              : { background: GREEN_BG, color: GREEN }
                            }
                          >
                            {isRupture ? 'RUPTURE' : isLow ? 'FAIBLE' : 'OK'}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => void adjustStock(item.id, -1, 'Correction')}
                              disabled={savingStockId === item.id || item.stock <= 0}
                              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors border disabled:opacity-40 disabled:cursor-not-allowed"
                              style={{ background: '#FFF5F5', borderColor: '#FECDD3', color: DANGER }}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => void adjustStock(item.id, 1, 'Réception')}
                              disabled={savingStockId === item.id}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-white transition-all hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed"
                              style={{ background: GREEN }}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── PROFILE PANEL ── */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPanel(false)} />
          <div className="relative w-full max-w-md h-full overflow-y-auto shadow-2xl" style={{ background: SURFACE }}>
            <div className="h-1" style={{ background: `linear-gradient(90deg, ${GREEN}, ${GREEN_LIGHT})` }} />
            <div className="p-6 border-b" style={{ borderColor: BORDER }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white"
                    style={{ background: `linear-gradient(135deg, ${ORANGE}, #EA6C00)` }}
                  >
                    {initials}
                  </div>
                  <div>
                    <p className="font-black" style={{ color: TEXT }}>{fullName}</p>
                    <p className="text-sm" style={{ color: TEXT_LIGHT }}>{user?.email}</p>
                  </div>
                </div>
                <button onClick={() => setShowPanel(false)} className="p-2 rounded-xl transition-colors hover:bg-slate-100">
                  <X className="w-5 h-5" style={{ color: TEXT_LIGHT }} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Prénom', key: 'prenom', placeholder: 'Jean', type: 'text' },
                    { label: 'Nom', key: 'nom', placeholder: 'Kouassi', type: 'text' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: TEXT_LIGHT }}>{f.label}</label>
                      <input
                        type={f.type}
                        value={form[f.key]}
                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none transition-all"
                        style={{ borderColor: BORDER, background: BG, color: TEXT }}
                        placeholder={f.placeholder}
                      />
                    </div>
                  ))}
                </div>
                {[
                  { label: 'Email', key: 'email', type: 'email', placeholder: 'jean@staff.ci' },
                  { label: 'Téléphone', key: 'telephone', type: 'tel', placeholder: '+225 07 00 00 00' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: TEXT_LIGHT }}>{f.label}</label>
                    <input
                      type={f.type}
                      value={form[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none transition-all"
                      style={{ borderColor: BORDER, background: BG, color: TEXT }}
                      placeholder={f.placeholder}
                    />
                  </div>
                ))}

                {profileError && (
                  <div className="p-3 rounded-xl border text-sm font-medium" style={{ background: '#FFF5F5', borderColor: '#FECDD3', color: '#BE123C' }}>
                    {profileError}
                  </div>
                )}
                {profileSuccess && (
                  <div className="p-3 rounded-xl border text-sm font-medium" style={{ background: GREEN_BG, borderColor: GREEN_BORDER, color: '#15803D' }}>
                    {profileSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full py-3 rounded-xl text-sm font-black text-white transition-all hover:scale-[1.02] disabled:opacity-60 disabled:scale-100 flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${GREEN}, #15803D)`, boxShadow: `0 4px 16px ${GREEN}40` }}
                >
                  {savingProfile ? <><Spinner size={16} /> Enregistrement...</> : <><Save className="w-4 h-4" /> Enregistrer</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      {showNewOrder && (
        <NewOrderModal
          restaurantId={user?.restaurant?.id || user?.restaurantId}
          onClose={() => setShowNewOrder(false)}
          onSuccess={(order) => {
            appendHistory('commande', `Commande #${order?.numero || 'nouvelle'}`, 'Créée en salle');
            pushToast(`Commande #${order?.numero || 'nouvelle'}`, 'Envoyée en cuisine', true);
            void refresh({ silent: true });
          }}
        />
      )}

      {dispatchOrder && (
        <DispatchModal
          commande={dispatchOrder}
          onClose={() => setDispatchOrder(null)}
          onDispatched={() => { setDispatchOrder(null); void refresh({ silent: true }); }}
        />
      )}

      {showCloture && (
        <EconomicReconciliation onClose={() => setShowCloture(false)} />
      )}

      <ToastList toasts={toasts} />
    </div>
  );
}
