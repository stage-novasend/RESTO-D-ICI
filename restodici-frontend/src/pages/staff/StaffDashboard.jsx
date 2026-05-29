// src/pages/staff/StaffDashboard.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, BarChart2, CheckCircle2, ChefHat,
  CircleDollarSign, Flame, Mail, Package, Phone,
  RefreshCw, Save, ShieldCheck, User, Clock,
  Wallet, Truck, Calendar, Activity, X,
  Boxes, LayoutDashboard, ListOrdered, UtensilsCrossed,
  TrendingUp, Minus, Plus,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import OnboardingWizard from '../../components/wizard/OnboardingWizard';
import { commandesService, createCommandesSocket } from '../../services/commandes.service';
import { stocksAPI, authAPI, b2bAPI } from '../../services/api';
import SecurityPanel from '../../components/security/SecurityPanel';
import NotificationBell from '../../components/notifications/NotificationBell';
import {
  formatDate, formatDeliveryMode, formatFCFA,
  STATUS_LABELS, timeAgo,
} from '../../utils/formatters';

// ─── Design tokens ──────────────────────────────────────────────────────────
const ACCENT     = '#E04E1A';
const ACCENT_DARK = '#B83A00';
const SURFACE    = '#F9F7F5';
const BORDER     = '#E8E2D9';
const TEXT       = '#2D2720';
const MUTED      = '#8B7355';

// ─── Order pipeline ──────────────────────────────────────────────────────────
const STATUS_FLOW = {
  RECUE:       ['CONFIRMEE'],
  CONFIRMEE:   ['EN_PREP'],
  EN_PREP:     ['PRETE'],
  PRETE:       ['EN_LIVRAISON', 'LIVREE'],
  EN_LIVRAISON:['LIVREE'],
  LIVREE:      [],
  ANNULEE:     [],
};
const ACTION_LABELS = {
  CONFIRMEE:    'Accepter',
  EN_PREP:      'Commencer',
  PRETE:        'Prêt !',
  EN_LIVRAISON: 'En livraison',
  LIVREE:       'Livré',
};

const B2B_STATUS_FLOW = {
  EN_ATTENTE:    ['CONFIRMEE'],
  CONFIRMEE:     ['EN_PREPARATION'],
  EN_PREPARATION:['LIVREE'],
  LIVREE:        [],
  ANNULEE:       [],
};
const B2B_STATUS_LABELS = {
  EN_ATTENTE:    'En attente',
  CONFIRMEE:     'Confirmée',
  EN_PREPARATION:'En préparation',
  LIVREE:        'Livrée',
  ANNULEE:       'Annulée',
};
const B2B_ACTION_LABELS = {
  CONFIRMEE:     'Confirmer',
  EN_PREPARATION:'Démarrer',
  LIVREE:        'Livrer',
};

// Statut badge colors
const BADGE = {
  RECUE:         { bg: '#DBEAFE', text: '#1D4ED8' },
  CONFIRMEE:     { bg: '#EDE9FE', text: '#6D28D9' },
  EN_PREP:       { bg: '#FEF3C7', text: '#B45309' },
  PRETE:         { bg: '#D1FAE5', text: '#065F46' },
  EN_LIVRAISON:  { bg: '#FCE7F3', text: '#9D174D' },
  LIVREE:        { bg: '#D1FAE5', text: '#065F46' },
  ANNULEE:       { bg: '#FEE2E2', text: '#991B1B' },
  EN_ATTENTE:    { bg: '#FEF9C3', text: '#854D0E' },
  EN_PREPARATION:{ bg: '#FEF3C7', text: '#B45309' },
};

const WEEK_DAYS = [
  { init: 'LU', name: 'Lundi'    },
  { init: 'MA', name: 'Mardi'    },
  { init: 'ME', name: 'Mercredi' },
  { init: 'JE', name: 'Jeudi'    },
  { init: 'VE', name: 'Vendredi' },
  { init: 'SA', name: 'Samedi'   },
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

// ─── Small components ────────────────────────────────────────────────────────

function Spinner({ size = 14, color = '#fff' }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: '50%',
      border: `2px solid rgba(${color === '#fff' ? '255,255,255' : '0,0,0'},0.25)`,
      borderTopColor: color, animation: 'staff-spin 0.7s linear infinite', flexShrink: 0,
    }} />
  );
}

function Badge({ label, bg, color }) {
  return (
    <span style={{ background: bg, color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function KpiCard({ icon: Icon, iconBg, iconColor, label, value, unit, sub, subOk = true }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E2D9] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide">{label}</p>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon style={{ width: 18, height: 18, color: iconColor }} />
        </div>
      </div>
      <p style={{ fontSize: 28, fontWeight: 800, color: TEXT, margin: 0, lineHeight: 1, letterSpacing: '-0.02em' }}>
        {value}
        {unit && <span style={{ fontSize: 13, fontWeight: 600, color: MUTED, marginLeft: 4 }}>{unit}</span>}
      </p>
      {sub && (
        <p style={{ fontSize: 11, color: subOk ? '#16A34A' : '#D97706', margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Order card ───────────────────────────────────────────────────────────────
function StaffOrderCard({ order, onAction, onPayment, paymentDraft, setPaymentDraft, saving }) {
  const age = order.createdAt ? Date.now() - new Date(order.createdAt).getTime() : 0;
  const isUrgent = age >= 15 * 60 * 1000;
  const minutesAgo = Math.floor(age / 60000);
  const timeStr = order.createdAt
    ? new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '';
  const nextStatuses = STATUS_FLOW[order.statut] || [];
  const [primary] = nextStatuses;
  const showPayment = !order.estPaye && ['PRETE', 'EN_LIVRAISON', 'LIVREE'].includes(order.statut) === false
    ? !order.estPaye
    : !order.estPaye;
  const draft = paymentDraft || {};
  const statBadge = BADGE[order.statut] || { bg: '#F3F4F6', text: '#6B7280' };
  const canCancel = order.statut === 'RECUE' && age < 5 * 60 * 1000;

  return (
    <div className={`rounded-2xl border p-4 ${isUrgent ? 'bg-red-50 border-red-200' : 'bg-white border-[#E8E2D9]'}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div style={{ width: 42, height: 42, borderRadius: 13, background: isUrgent ? '#FEE2E2' : '#F9F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ChefHat style={{ width: 20, height: 20, color: isUrgent ? '#DC2626' : MUTED }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <Badge label={`#${order.numero}`} bg="#F3F4F6" color={TEXT} />
              <Badge label={statBadge ? STATUS_LABELS[order.statut] || order.statut : order.statut}
                bg={statBadge.bg} color={statBadge.text} />
              {order.modeLivraison && (
                <Badge label={formatDeliveryMode(order.modeLivraison)} bg="#FFF5EB" color={ACCENT} />
              )}
              {isUrgent && <Badge label="URGENT" bg="#FEE2E2" color="#DC2626" />}
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {(order.lignes || []).map(l => l.article?.nom).filter(Boolean).join(', ') || `Commande ${order.numero}`}
            </p>
            <p style={{ fontSize: 11, color: MUTED, margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock style={{ width: 10, height: 10 }} />
              Reçue à {timeStr} · {minutesAgo} min
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p style={{ fontSize: 11, color: MUTED, margin: '0 0 2px' }}>Total</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#D97706', margin: 0, lineHeight: 1 }}>
            {(Number(order.montantTotal) || 0).toLocaleString('fr-FR')}
          </p>
          <p style={{ fontSize: 10, color: MUTED, margin: '2px 0 0' }}>CFA</p>
        </div>
      </div>

      {/* Items chips */}
      {(order.lignes || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {order.lignes.slice(0, 5).map((l, i) => (
            <span key={i} style={{ background: '#F9F7F5', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '3px 9px', fontSize: 11, color: TEXT }}>
              {l.quantite}× {l.article?.nom || 'Article'}
            </span>
          ))}
          {order.lignes.length > 5 && (
            <span style={{ background: '#F9F7F5', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '3px 9px', fontSize: 11, color: MUTED }}>
              +{order.lignes.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Payment section */}
      {showPayment && (
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 12px', marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: TEXT, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <CircleDollarSign style={{ width: 12, height: 12, color: ACCENT }} /> Encaissement
          </p>
          <div className="flex gap-2">
            <select
              value={draft.modePaiement || 'ESPECES'}
              onChange={e => setPaymentDraft({ ...draft, modePaiement: e.target.value })}
              style={{ flex: 1, borderRadius: 9, border: `1px solid ${BORDER}`, padding: '6px 10px', fontSize: 12, outline: 'none', background: '#fff', color: TEXT }}
            >
              <option value="ESPECES">Espèces</option>
              <option value="CARTE">Carte</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
            </select>
            <input
              type="number" min="0"
              value={draft.montantRemis ?? Number(order.montantTotal)}
              onChange={e => setPaymentDraft({ ...draft, montantRemis: e.target.value })}
              style={{ width: 88, borderRadius: 9, border: `1px solid ${BORDER}`, padding: '6px 10px', fontSize: 12, outline: 'none', background: '#fff', color: TEXT }}
            />
            <button
              onClick={() => onPayment(order)}
              disabled={saving}
              style={{ borderRadius: 9, border: 'none', background: ACCENT, color: '#fff', padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, whiteSpace: 'nowrap' }}
            >
              {saving ? '...' : 'Encaisser'}
            </button>
          </div>
          {Number(draft.montantRemis) > Number(order.montantTotal) && (
            <p style={{ fontSize: 12, color: '#16A34A', fontWeight: 700, margin: '6px 0 0' }}>
              Rendu : {formatFCFA(Number(draft.montantRemis) - Number(order.montantTotal))}
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      {nextStatuses.length > 0 && (
        <div className="flex gap-2">
          {nextStatuses.map((ns, i) => (
            <button
              key={ns}
              onClick={() => onAction(order.id, ns)}
              disabled={saving}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: 11,
                border: i === 0 ? 'none' : `1.5px solid ${ACCENT}`,
                background: i === 0 ? ACCENT : '#fff',
                color: i === 0 ? '#fff' : ACCENT,
                fontSize: 13, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {saving && i === 0 ? <Spinner /> : null}
              {ACTION_LABELS[ns] || ns}
            </button>
          ))}
        </div>
      )}
      {canCancel && (
        <button
          onClick={() => onAction(order.id, 'ANNULEE')}
          disabled={saving}
          style={{ width: '100%', marginTop: 6, padding: '8px', borderRadius: 10, border: '1px solid #FECACA', background: '#FFF5F5', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
        >
          Annuler
        </button>
      )}
    </div>
  );
}

function B2BOrderCard({ order, onAction, saving }) {
  const age = order.createdAt ? Date.now() - new Date(order.createdAt).getTime() : 0;
  const isUrgent = age >= 15 * 60 * 1000;
  const timeStr = order.createdAt
    ? new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '';
  const nextStatuses = B2B_STATUS_FLOW[order.statut] || [];
  const statBadge = BADGE[order.statut] || { bg: '#FEF3C7', text: '#B45309' };

  return (
    <div className={`rounded-2xl border p-4 ${isUrgent ? 'bg-amber-50 border-amber-300' : 'bg-[#FFFDF5] border-amber-200'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div style={{ width: 42, height: 42, borderRadius: 13, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Package style={{ width: 20, height: 20, color: '#D97706' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <Badge label={`#${order.numero}`} bg="#FEF3C7" color="#B45309" />
              <Badge label="B2B" bg="#D97706" color="#fff" />
              <Badge label={B2B_STATUS_LABELS[order.statut] || order.statut} bg={statBadge.bg} color={statBadge.text} />
              {isUrgent && <Badge label="URGENT" bg="#FEE2E2" color="#DC2626" />}
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {order.entreprise || 'Entreprise B2B'}
            </p>
            <p style={{ fontSize: 11, color: MUTED, margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock style={{ width: 10, height: 10 }} /> Reçue à {timeStr}
            </p>
            {(order.dateLivraison || order.heureLivraison) && (
              <p style={{ fontSize: 11, color: '#B45309', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Truck style={{ width: 10, height: 10 }} />
                {order.dateLivraison ? new Date(order.dateLivraison).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : ''}
                {order.heureLivraison ? ` à ${order.heureLivraison}` : ''}
                {order.lieuLivraison ? ` · ${order.lieuLivraison}` : ''}
              </p>
            )}
          </div>
        </div>
        {order.totalEstime != null && (
          <div className="text-right shrink-0">
            <p style={{ fontSize: 11, color: MUTED, margin: '0 0 2px' }}>Estimé</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#D97706', margin: 0 }}>
              {(Number(order.totalEstime) || 0).toLocaleString('fr-FR')}
            </p>
            <p style={{ fontSize: 10, color: MUTED, margin: '2px 0 0' }}>CFA</p>
          </div>
        )}
      </div>

      {(order.lignes || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {order.lignes.slice(0, 4).map((l, i) => (
            <span key={i} style={{ background: '#FEF9C3', border: '1px solid #FEF08A', borderRadius: 8, padding: '3px 9px', fontSize: 11, color: '#713F12' }}>
              {l.quantite}× {l.nomArticle || 'Article'}
            </span>
          ))}
          {order.lignes.length > 4 && (
            <span style={{ background: '#FEF9C3', border: '1px solid #FEF08A', borderRadius: 8, padding: '3px 9px', fontSize: 11, color: MUTED }}>
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
              style={{
                flex: 1, padding: '10px 8px', borderRadius: 11,
                border: i === 0 ? 'none' : '1.5px solid #D97706',
                background: i === 0 ? '#D97706' : '#fff',
                color: i === 0 ? '#fff' : '#D97706',
                fontSize: 13, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {B2B_ACTION_LABELS[ns] || ns}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Weekly Schedule ──────────────────────────────────────────────────────────
function WeeklySchedule({ openingTime, closingTime }) {
  const todayIdx = (new Date().getDay() + 6) % 7;
  const week = buildWeek(openingTime, closingTime);
  const inService = isInService(openingTime, closingTime);

  return (
    <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: 0 }}>Planning semaine</h3>
        <Calendar style={{ width: 15, height: 15, color: MUTED }} />
      </div>
      <div className="flex items-center gap-2 mb-4">
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: inService ? '#22C55E' : '#9CA3AF', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: inService ? '#16A34A' : MUTED, fontWeight: 600 }}>
          {inService ? 'En service' : 'Hors service'}
        </span>
        {openingTime && closingTime && (
          <span style={{ fontSize: 11, color: '#D1D5DB', marginLeft: 'auto' }}>{openingTime}–{closingTime}</span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {week.map((day, i) => {
          const isToday = i === todayIdx;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10,
              background: isToday ? '#FFF5EB' : 'transparent',
              border: isToday ? `1px solid rgba(224,78,26,0.15)` : '1px solid transparent',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: isToday ? ACCENT : '#F3F4F6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700,
                color: isToday ? '#fff' : MUTED,
              }}>
                {day.init}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, color: TEXT, margin: 0 }}>{day.name}</p>
                <p style={{ fontSize: 10, color: day.rest ? '#EF4444' : MUTED, margin: '1px 0 0' }}>{day.hours}</p>
              </div>
              {isToday && (
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: inService ? '#22C55E' : '#D97706', flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Profile slide panel ──────────────────────────────────────────────────────
function PanelField({ label, type = 'text', icon: Icon, value, onChange, placeholder }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        {Icon && <Icon style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: MUTED, pointerEvents: 'none' }} />}
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: '100%', boxSizing: 'border-box', padding: `10px 12px 10px ${Icon ? 34 : 12}px`, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, color: TEXT, outline: 'none', background: SURFACE }}
          onFocus={e => (e.target.style.borderColor = ACCENT)}
          onBlur={e => (e.target.style.borderColor = BORDER)}
        />
      </div>
    </div>
  );
}

function ProfilePanel({ user, onClose, form, setForm, onSave, saving, error, success }) {
  const [tab, setTab] = useState('profil');
  const initials = ((user?.prenom?.[0] ?? '') + (user?.nom?.[0] ?? '')).toUpperCase() || 'S';
  const fullName = [user?.prenom, user?.nom].filter(Boolean).join(' ') || 'Mon Profil';

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(440px,100vw)', background: '#fff', zIndex: 50, overflowY: 'auto', boxShadow: '-20px 0 60px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)`, padding: '28px 24px 20px' }}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff' }}>
                {initials}
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{fullName}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', margin: 0 }}>{user?.email}</p>
                <span style={{ display: 'inline-block', marginTop: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 99, padding: '2px 10px', fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '0.1em' }}>STAFF</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', lineHeight: 0 }}>
              <X style={{ width: 16, height: 16, color: '#fff' }} />
            </button>
          </div>
          <div className="flex gap-1">
            {[{ id: 'profil', label: 'Profil', icon: User }, { id: 'securite', label: 'Sécurité', icon: ShieldCheck }].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 700, background: tab === id ? 'rgba(255,255,255,0.2)' : 'transparent', color: tab === id ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                <Icon style={{ width: 13, height: 13 }} />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 24, flex: 1 }}>
          {tab === 'profil' && (
            <>
              {error   && <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#EF4444', fontSize: 13, marginBottom: 14 }}>{error}</div>}
              {success && <div style={{ padding: '10px 14px', borderRadius: 10, background: '#F0FDF4', border: '1px solid #86EFAC', color: '#16A34A', fontSize: 13, marginBottom: 14 }}>{success}</div>}
              <form onSubmit={onSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <PanelField label="Prénom" icon={User}  value={form.prenom}    onChange={v => setForm(p => ({ ...p, prenom: v }))} placeholder="Jean" />
                  <PanelField label="Nom"    icon={User}  value={form.nom}       onChange={v => setForm(p => ({ ...p, nom: v }))}    placeholder="Kouassi" />
                </div>
                <PanelField label="Email"     type="email" icon={Mail}  value={form.email}     onChange={v => setForm(p => ({ ...p, email: v }))}     placeholder="jean@staff.ci" />
                <PanelField label="Téléphone" type="tel"   icon={Phone} value={form.telephone} onChange={v => setForm(p => ({ ...p, telephone: v }))} placeholder="+225 07 00 00 00" />
                <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: saving ? MUTED : ACCENT, color: '#fff', border: 'none', borderRadius: 11, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', marginTop: 4 }}>
                  {saving ? <><Spinner />Enregistrement…</> : <><Save style={{ width: 15, height: 15 }} />Enregistrer</>}
                </button>
              </form>
            </>
          )}
          {tab === 'securite' && <SecurityPanel user={user} accentColor={ACCENT} />}
        </div>
      </div>
    </>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function StaffDashboard() {
  const { user, syncUser, refreshProfile } = useAuth();
  const navigate    = useNavigate();
  const location    = useLocation();
  const activeTab   = new URLSearchParams(location.search).get('tab') || 'dashboard';
  const goTab       = (id) => navigate(id === 'dashboard' ? '/staff' : `/staff?tab=${id}`);

  // activeTab driven by URL — see goTab() above
  const [showPanel, setShowPanel]       = useState(false);
  const [isAvailable, setIsAvailable]   = useState(true);
  const [orders, setOrders]             = useState([]);
  const [b2bOrders, setB2bOrders]       = useState([]);
  const [stocks, setStocks]             = useState([]);
  const [stockFilter, setStockFilter]   = useState('all');
  const [orderFilter, setOrderFilter]   = useState('active'); // active | all | b2b
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [savingOrderId, setSavingOrderId]   = useState('');
  const [savingB2BId, setSavingB2BId]       = useState('');
  const [savingStockId, setSavingStockId]   = useState('');
  const [paymentDrafts, setPaymentDrafts]   = useState({});
  const [actionHistory, setActionHistory]   = useState([]);

  const [serverActivity, setServerActivity] = useState([]);

  const [form, setForm]                 = useState({ nom: '', prenom: '', email: '', telephone: '' });
  const [savingProfile, setSavingProfile]   = useState(false);
  const [profileError, setProfileError]     = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

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
      try { localStorage.setItem(historyKey, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  }, [historyKey]);

  const loadActivity = useCallback(async () => {
    try {
      const res = await commandesService.getRestaurantActivity(20);
      setServerActivity(Array.isArray(res.data) ? res.data : []);
    } catch { /* non-bloquant */ }
  }, []);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const [kdsRes, b2bRes, stocksRes] = await Promise.allSettled([
        commandesService.getKDS(),
        b2bAPI.getRestaurantKDS(),
        stocksAPI.getAll(),
      ]);
      setOrders(kdsRes.status === 'fulfilled' ? (kdsRes.value.data || []) : []);
      setB2bOrders(b2bRes.status === 'fulfilled' ? (b2bRes.value.data || []) : []);
      setStocks(stocksRes.status === 'fulfilled' ? (stocksRes.value.data || []) : []);
    } catch {
      if (!silent) setError('Impossible de charger le tableau de bord');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProfile();
    void refresh();
    void loadActivity();
    try {
      const stored = JSON.parse(localStorage.getItem(historyKey) || '[]');
      setActionHistory(Array.isArray(stored) ? stored : []);
    } catch { setActionHistory([]); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // WebSocket + polling
  const userId      = user?.id;
  const restaurantId = user?.restaurant?.id;
  const userRole    = user?.role;

  useEffect(() => {
    if (!userId) return;
    const poll = setInterval(() => void refresh({ silent: true }), 8000);
    const socket = createCommandesSocket({ id: userId, role: userRole, restaurant: restaurantId ? { id: restaurantId } : undefined });

    socket.on('commande.nouvelle',     p => { appendHistory('commande', `Commande #${p?.numero || ''}`, 'Nouvelle commande reçue'); void refresh({ silent: true }); });
    socket.on('commande.statut',       p => { appendHistory('statut',   `#${p?.numero || ''} mis à jour`, `→ ${STATUS_LABELS[p?.statut] || p?.statut || '?'}`); void refresh({ silent: true }); });
    socket.on('commande.paiement',     p => { appendHistory('paiement', `Paiement #${p?.numero || ''}`, 'Encaissement validé'); void refresh({ silent: true }); });
    socket.on('commande.b2b.nouvelle', p => { appendHistory('b2b',     `B2B #${p?.numero || ''}`, p?.entreprise || 'Commande B2B'); void refresh({ silent: true }); });
    socket.on('commande.b2b.statut',   () => void refresh({ silent: true }));
    socket.on('reconnect',             () => void refresh({ silent: true }));

    return () => { clearInterval(poll); socket.disconnect(); };
  }, [appendHistory, refresh, userId, restaurantId, userRole]);

  // Derived data
  const activeOrders = useMemo(
    () => orders.filter(o => ['RECUE','CONFIRMEE','EN_PREP','PRETE','EN_LIVRAISON'].includes(o.statut)),
    [orders],
  );
  const urgentOrders = useMemo(
    () => activeOrders.filter(o => o.createdAt && Date.now() - new Date(o.createdAt).getTime() >= 15 * 60 * 1000),
    [activeOrders],
  );
  const todayStr = useMemo(() => new Date().toDateString(), []);
  const completedToday = useMemo(
    () => orders.filter(o => o.statut === 'LIVREE' && new Date(o.updatedAt || o.createdAt).toDateString() === todayStr),
    [orders, todayStr],
  );
  const encaissementsToday = useMemo(
    () => completedToday.reduce((s, o) => s + Number(o.montantTotal || 0), 0),
    [completedToday],
  );
  const activeB2B = useMemo(
    () => b2bOrders.filter(o => !['LIVREE','ANNULEE'].includes(o.statut)),
    [b2bOrders],
  );
  const allActive = useMemo(
    () => [
      ...activeOrders.map(o => ({ ...o, _type: 'client' })),
      ...activeB2B.map(o => ({ ...o, _type: 'b2b' })),
    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [activeOrders, activeB2B],
  );
  const stockAlerts = useMemo(() => stocks.filter(s => s.stock <= s.seuil), [stocks]);
  const displayedStocks = useMemo(
    () => stockFilter === 'alerts' ? stockAlerts : stocks,
    [stocks, stockAlerts, stockFilter],
  );

  // Orders by filter tab
  const filteredOrders = useMemo(() => {
    if (orderFilter === 'active') return allActive;
    if (orderFilter === 'b2b')    return activeB2B.map(o => ({ ...o, _type: 'b2b' }));
    // all = active + completed today
    return [
      ...activeOrders.map(o => ({ ...o, _type: 'client' })),
      ...completedToday.map(o => ({ ...o, _type: 'client' })),
      ...b2bOrders.map(o => ({ ...o, _type: 'b2b' })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [orderFilter, allActive, activeB2B, activeOrders, completedToday, b2bOrders]);

  // Actions
  const updateStatus = async (id, next) => {
    try {
      setSavingOrderId(id); setError('');
      await commandesService.updateStatut(id, next);
      appendHistory('action', `Commande mise à jour`, `→ ${STATUS_LABELS[next] || next}`);
      void loadActivity();
      await refresh({ silent: true });
    } catch { setError('Mise à jour impossible'); }
    finally { setSavingOrderId(''); }
  };

  const registerPayment = async (order) => {
    const draft = paymentDrafts[order.id] || {};
    const montantRemis = Number(draft.montantRemis ?? order.montantTotal);
    const modePaiement = draft.modePaiement || 'ESPECES';
    if (!Number.isFinite(montantRemis)) { setError('Montant invalide'); return; }
    try {
      setSavingOrderId(order.id); setError('');
      await commandesService.registerPayment(order.id, { montantRemis, modePaiement });
      appendHistory('paiement', `Encaissement #${order.numero}`, modePaiement);
      await refresh({ silent: true });
    } catch { setError('Encaissement refusé'); }
    finally { setSavingOrderId(''); }
  };

  const updateB2BStatus = async (id, statut) => {
    try {
      setSavingB2BId(id); setError('');
      await b2bAPI.updateCommandeGroupeeStatut(id, statut);
      appendHistory('b2b', 'Commande B2B mise à jour', `→ ${B2B_STATUS_LABELS[statut] || statut}`);
      await refresh({ silent: true });
    } catch { setError('Mise à jour B2B impossible'); }
    finally { setSavingB2BId(''); }
  };

  const adjustStock = async (id, qty, motif) => {
    try {
      setSavingStockId(id); setError('');
      await stocksAPI.adjust(id, qty, motif);
      appendHistory('stock', 'Stock ajusté', `${motif} (${qty > 0 ? '+' : ''}${qty})`);
      await refresh({ silent: true });
    } catch { setError('Ajustement impossible'); }
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
    } catch (err) { setProfileError(err?.response?.data?.message || 'Erreur de mise à jour'); }
    finally { setSavingProfile(false); }
  };

  const initials = ((user?.prenom?.[0] ?? '') + (user?.nom?.[0] ?? '')).toUpperCase() || 'S';
  const firstName = user?.prenom || user?.nom || 'vous';

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F7F5] flex items-center justify-center">
        <div style={{ width: 40, height: 40, border: `4px solid ${BORDER}`, borderTopColor: ACCENT, borderRadius: '50%', animation: 'staff-spin 0.8s linear infinite' }} />
        <style>{`@keyframes staff-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const TABS = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'commandes', label: 'Commandes',        icon: ListOrdered,
      badge: allActive.length || undefined },
    { id: 'stocks',    label: 'Stocks',           icon: Boxes,
      badge: stockAlerts.length || undefined, badgeRed: true },
  ];

  return (
    <div className="min-h-screen bg-[#F9F7F5]">
      <style>{`@keyframes staff-spin{to{transform:rotate(360deg)}}`}</style>
      <OnboardingWizard />

      {/* ── TOP BAR ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-[#E8E2D9] px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3 max-w-6xl mx-auto">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div style={{ width: 36, height: 36, borderRadius: 10, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <UtensilsCrossed style={{ width: 18, height: 18, color: '#fff' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: 0, lineHeight: 1.2 }}>Resto d'ici</p>
              <p style={{ fontSize: 10, color: MUTED, margin: 0, fontWeight: 600, letterSpacing: '0.06em' }}>STAFF PORTAL</p>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* KDS shortcut */}
            <Link to="/staff/kds" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: ACCENT, color: '#fff', padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
              <UtensilsCrossed style={{ width: 13, height: 13 }} />
              <span className="hidden sm:inline">KDS</span>
              <ArrowRight style={{ width: 12, height: 12 }} />
            </Link>
            <NotificationBell accentColor={ACCENT} light />
            <button
              onClick={() => void refresh()}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#E8E2D9] bg-white hover:bg-[#F9F7F5] transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw style={{ width: 15, height: 15, color: MUTED }} />
            </button>
            {/* Avatar */}
            <button
              onClick={() => setShowPanel(true)}
              style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}
              title="Mon profil"
            >
              {initials}
            </button>
          </div>
        </div>
      </div>

      {/* ── HERO SECTION ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900, color: TEXT, margin: '0 0 4px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Bonjour, {firstName}&nbsp;👋
            </h1>
            <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' · '}
              {allActive.length === 0 ? 'Aucune commande active' : `${allActive.length} commande${allActive.length > 1 ? 's' : ''} active${allActive.length > 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Status toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 99, padding: '4px 5px' }}>
            <button
              onClick={() => setIsAvailable(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.2s', background: isAvailable ? ACCENT : 'transparent', color: isAvailable ? '#fff' : MUTED }}
            >
              {isAvailable && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80' }} />}
              Disponible
            </button>
            <button
              onClick={() => setIsAvailable(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.2s', background: !isAvailable ? '#6B7280' : 'transparent', color: !isAvailable ? '#fff' : MUTED }}
            >
              {!isAvailable && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D1D5DB' }} />}
              Occupé
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />{error}
            <button onClick={() => setError('')} className="ml-auto" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', lineHeight: 0 }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        )}

        {/* ── TABS NAV ── */}
        <div className="flex gap-1 border-b border-[#E8E2D9] mb-6 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon, badge, badgeRed }) => (
            <button
              key={id}
              onClick={() => goTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px',
                border: 'none', borderBottom: activeTab === id ? `2px solid ${ACCENT}` : '2px solid transparent',
                background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap',
                fontSize: 13, fontWeight: activeTab === id ? 700 : 500,
                color: activeTab === id ? ACCENT : MUTED,
                transition: 'all 0.15s', marginBottom: -1,
              }}
            >
              <Icon style={{ width: 15, height: 15 }} />
              {label}
              {badge != null && badge > 0 && (
                <span style={{ background: badgeRed ? '#EF4444' : ACCENT, color: '#fff', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 99, minWidth: 18, textAlign: 'center' }}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD TAB ── */}
        {activeTab === 'dashboard' && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <KpiCard
                icon={Clock}
                iconBg="#FFF5EB"
                iconColor={ACCENT}
                label="Commandes actives"
                value={allActive.length}
                sub={urgentOrders.length > 0 ? `⚠ ${urgentOrders.length} urgente${urgentOrders.length > 1 ? 's' : ''}` : 'Tout sous contrôle'}
                subOk={urgentOrders.length === 0}
              />
              <KpiCard
                icon={Wallet}
                iconBg="#F0FDF4"
                iconColor="#16A34A"
                label="Encaissements du jour"
                value={encaissementsToday > 0 ? formatFCFA(encaissementsToday) : '—'}
                sub={completedToday.length > 0 ? `${completedToday.length} commande${completedToday.length > 1 ? 's' : ''} livrée${completedToday.length > 1 ? 's' : ''}` : 'Aucun encaissement'}
                subOk={encaissementsToday > 0}
              />
              <KpiCard
                icon={Boxes}
                iconBg={stockAlerts.length > 0 ? '#FEF2F2' : '#F0FDF4'}
                iconColor={stockAlerts.length > 0 ? '#EF4444' : '#16A34A'}
                label="Alertes stock"
                value={stockAlerts.length}
                sub={stockAlerts.length > 0 ? `${stockAlerts.length} article${stockAlerts.length > 1 ? 's' : ''} en rupture/faible` : 'Stocks OK'}
                subOk={stockAlerts.length === 0}
              />
            </div>

            {/* Main 2-col grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
              {/* Orders — 3/5 */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                <div className="bg-white rounded-2xl border border-[#E8E2D9] overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E2D9]">
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: 0 }}>
                      Commandes en cours
                      {allActive.length > 0 && (
                        <span style={{ marginLeft: 8, background: ACCENT, color: '#fff', fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 99 }}>
                          {allActive.length}
                        </span>
                      )}
                    </h3>
                    <button onClick={() => goTab('commandes')} style={{ fontSize: 11, color: ACCENT, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
                      Tout voir →
                    </button>
                  </div>

                  {allActive.length === 0 ? (
                    <div className="py-10 text-center">
                      <div style={{ width: 52, height: 52, borderRadius: 16, background: SURFACE, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <ChefHat style={{ width: 24, height: 24, color: BORDER }} />
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: '0 0 4px' }}>Aucune commande active</p>
                      <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>Les nouvelles commandes apparaissent ici en temps réel.</p>
                    </div>
                  ) : (
                    <div className="p-4 flex flex-col gap-3">
                      {allActive.slice(0, 5).map(order => order._type === 'b2b' ? (
                        <B2BOrderCard
                          key={order.id}
                          order={order}
                          onAction={updateB2BStatus}
                          saving={savingB2BId === order.id}
                        />
                      ) : (
                        <StaffOrderCard
                          key={order.id}
                          order={order}
                          onAction={updateStatus}
                          onPayment={registerPayment}
                          paymentDraft={paymentDrafts[order.id]}
                          setPaymentDraft={v => setPaymentDrafts(p => ({ ...p, [order.id]: v }))}
                          saving={savingOrderId === order.id}
                        />
                      ))}
                      {allActive.length > 5 && (
                        <button onClick={() => goTab('commandes')} style={{ width: '100%', padding: '10px', borderRadius: 11, border: `1px solid ${BORDER}`, background: '#fff', color: ACCENT, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                          Voir les {allActive.length - 5} autres commandes
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right sidebar — 2/5 */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <WeeklySchedule
                  openingTime={user?.restaurant?.openingTime}
                  closingTime={user?.restaurant?.closingTime}
                />

                {/* Quick stock alerts */}
                {stockAlerts.length > 0 && (
                  <div className="bg-white border border-red-200 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#DC2626', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle style={{ width: 15, height: 15 }} /> Alertes stock
                      </h3>
                      <button onClick={() => goTab('stocks')} style={{ fontSize: 11, color: ACCENT, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>Gérer →</button>
                    </div>
                    <div className="flex flex-col gap-2">
                      {stockAlerts.slice(0, 4).map(item => (
                        <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-xl" style={{ background: item.stock <= 0 ? '#FFF5F5' : '#FFFDF5', border: `1px solid ${item.stock <= 0 ? '#FECACA' : '#FDE68A'}` }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: TEXT, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nom}</p>
                            <p style={{ fontSize: 10, color: MUTED, margin: '1px 0 0' }}>Stock: {item.stock} · Min: {item.seuil}</p>
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: item.stock <= 0 ? '#FEE2E2' : '#FEF3C7', color: item.stock <= 0 ? '#DC2626' : '#D97706' }}>
                            {item.stock <= 0 ? 'RUPTURE' : 'FAIBLE'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activity — server-side log prioritized over localStorage */}
                {(serverActivity.length > 0 || actionHistory.length > 0) && (
                  <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: 0 }}>Activité récente</h3>
                      <Activity style={{ width: 15, height: 15, color: MUTED }} />
                    </div>
                    <div className="flex flex-col gap-2">
                      {serverActivity.length > 0
                        ? serverActivity.slice(0, 8).map(entry => {
                            const statusColor =
                              entry.statutNouvel === 'LIVREE' ? '#16A34A' :
                              entry.statutNouvel === 'ANNULEE' ? '#EF4444' :
                              entry.statutNouvel === 'EN_PREP' ? '#D97706' : ACCENT;
                            return (
                              <div key={entry.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 10px', background: SURFACE, borderRadius: 10 }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: statusColor }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: 11, fontWeight: 600, color: TEXT, margin: 0 }}>
                                    #{entry.commandeNumero || entry.commandeId?.slice(0, 8)}
                                    <span style={{ color: statusColor, marginLeft: 5 }}>→ {STATUS_LABELS[entry.statutNouvel] || entry.statutNouvel}</span>
                                  </p>
                                  {entry.actorNom && (
                                    <p style={{ fontSize: 10, color: MUTED, margin: '1px 0 0' }}>par {entry.actorNom}</p>
                                  )}
                                </div>
                                <p style={{ fontSize: 9, color: '#D1D5DB', margin: 0, flexShrink: 0 }}>
                                  {timeAgo(entry.createdAt)}
                                </p>
                              </div>
                            );
                          })
                        : actionHistory.slice(0, 5).map(entry => (
                            <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', background: SURFACE, borderRadius: 10 }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: entry.type === 'paiement' ? '#16A34A' : entry.type === 'commande' ? ACCENT : entry.type === 'b2b' ? '#D97706' : MUTED }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 11, fontWeight: 600, color: TEXT, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.title}</p>
                                <p style={{ fontSize: 10, color: MUTED, margin: '1px 0 0' }}>{entry.desc}</p>
                              </div>
                              <p style={{ fontSize: 9, color: '#D1D5DB', margin: 0, flexShrink: 0 }}>{timeAgo(entry.at)}</p>
                            </div>
                          ))
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── COMMANDES TAB ── */}
        {activeTab === 'commandes' && (
          <div>
            {/* Filter pills */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              {[
                { id: 'active', label: 'Actives', count: allActive.length },
                { id: 'b2b',    label: 'B2B',     count: activeB2B.length },
                { id: 'all',    label: 'Toutes',   count: null },
              ].map(({ id, label, count }) => (
                <button
                  key={id}
                  onClick={() => setOrderFilter(id)}
                  style={{
                    padding: '7px 16px', borderRadius: 99, border: `1.5px solid ${orderFilter === id ? ACCENT : BORDER}`,
                    background: orderFilter === id ? ACCENT : '#fff',
                    color: orderFilter === id ? '#fff' : MUTED,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {label}
                  {count != null && count > 0 && (
                    <span style={{ background: orderFilter === id ? 'rgba(255,255,255,0.25)' : '#F3F4F6', color: orderFilter === id ? '#fff' : TEXT, fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 99 }}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: MUTED, fontWeight: 500 }}>
                Màj auto toutes les 8s
              </span>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E8E2D9] py-14 text-center">
                <ChefHat style={{ width: 32, height: 32, color: BORDER, margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: '0 0 4px' }}>Aucune commande</p>
                <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
                  {orderFilter === 'active' ? 'Aucune commande en cours.' : 'Aucune commande pour cette vue.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredOrders.map(order => order._type === 'b2b' ? (
                  <B2BOrderCard
                    key={order.id}
                    order={order}
                    onAction={updateB2BStatus}
                    saving={savingB2BId === order.id}
                  />
                ) : (
                  <StaffOrderCard
                    key={order.id}
                    order={order}
                    onAction={updateStatus}
                    onPayment={registerPayment}
                    paymentDraft={paymentDrafts[order.id]}
                    setPaymentDraft={v => setPaymentDrafts(p => ({ ...p, [order.id]: v }))}
                    saving={savingOrderId === order.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STOCKS TAB ── */}
        {activeTab === 'stocks' && (
          <div>
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT, margin: '0 0 2px' }}>Inventaire en temps réel</h2>
                <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>{stocks.length} article{stocks.length > 1 ? 's' : ''} · {stockAlerts.length} alerte{stockAlerts.length !== 1 ? 's' : ''}</p>
              </div>
              <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 10, padding: '3px', gap: 2 }}>
                {[['all', 'Tous'], ['alerts', `Alertes (${stockAlerts.length})`]].map(([key, label]) => (
                  <button key={key} onClick={() => setStockFilter(key)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: stockFilter === key ? '#fff' : 'transparent', color: stockFilter === key ? TEXT : MUTED, boxShadow: stockFilter === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {displayedStocks.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E8E2D9] py-12 text-center">
                <CheckCircle2 style={{ width: 32, height: 32, color: '#16A34A', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: '0 0 4px' }}>
                  {stockFilter === 'alerts' ? 'Aucune alerte stock' : 'Aucun article en stock'}
                </p>
                <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
                  {stockFilter === 'alerts' ? 'Tous les stocks sont suffisants.' : 'Configurez les stocks dans le panneau gérant.'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E8E2D9] overflow-hidden">
                <div className="divide-y divide-[#E8E2D9]">
                  {displayedStocks.map(item => {
                    const isRupture = item.stock <= 0;
                    const isLow = !isRupture && item.stock <= item.seuil;
                    const pct = item.seuil > 0 ? Math.min(100, Math.round((item.stock / (item.seuil * 3)) * 100)) : 50;

                    return (
                      <div key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: isRupture ? '#FEE2E2' : isLow ? '#FEF3C7' : '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isRupture
                            ? <AlertTriangle style={{ width: 15, height: 15, color: '#EF4444' }} />
                            : isLow
                              ? <Flame style={{ width: 15, height: 15, color: '#D97706' }} />
                              : <CheckCircle2 style={{ width: 15, height: 15, color: '#16A34A' }} />
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="flex items-center gap-2 mb-1">
                            <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nom}</p>
                            {item.categorie && (
                              <span style={{ fontSize: 9, color: MUTED, background: '#F3F4F6', borderRadius: 99, padding: '1px 6px', flexShrink: 0 }}>{item.categorie}</span>
                            )}
                          </div>
                          <div style={{ height: 4, background: '#E8E2D9', borderRadius: 99, overflow: 'hidden', marginBottom: 2 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: isRupture ? '#EF4444' : isLow ? '#F59E0B' : '#22C55E', borderRadius: 99, transition: 'width 0.4s' }} />
                          </div>
                          <p style={{ fontSize: 10, color: MUTED, margin: 0 }}>
                            {item.stock} {item.unite || ''} en stock · seuil min {item.seuil}
                          </p>
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, flexShrink: 0, background: isRupture ? '#FEE2E2' : isLow ? '#FEF3C7' : '#F0FDF4', color: isRupture ? '#EF4444' : isLow ? '#D97706' : '#16A34A' }}>
                          {isRupture ? 'RUPTURE' : isLow ? 'FAIBLE' : 'OK'}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => void adjustStock(item.id, -1, 'Correction stock')}
                            disabled={savingStockId === item.id || item.stock <= 0}
                            style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', color: '#EF4444', cursor: item.stock <= 0 ? 'not-allowed' : 'pointer', opacity: item.stock <= 0 ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Minus style={{ width: 12, height: 12 }} />
                          </button>
                          <button
                            onClick={() => void adjustStock(item.id, 1, 'Réception stock')}
                            disabled={savingStockId === item.id}
                            style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Plus style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom padding */}
        <div className="h-10" />
      </div>

      {/* ── PROFILE PANEL ── */}
      {showPanel && (
        <ProfilePanel
          user={user}
          onClose={() => setShowPanel(false)}
          form={form}
          setForm={setForm}
          onSave={handleSaveProfile}
          saving={savingProfile}
          error={profileError}
          success={profileSuccess}
        />
      )}
    </div>
  );
}
