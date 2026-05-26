// src/pages/staff/StaffDashboard.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, BarChart2, CheckCircle2, ChefHat,
  CircleDollarSign, Flame, Mail, Package, Phone,
  RefreshCw, Save, Shield, ShieldCheck, User,
  Eye, EyeOff, X, Pencil, Activity, Clock, Bell,
  Wallet, TrendingUp, Truck, Calendar, Settings,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import OnboardingWizard from '../../components/wizard/OnboardingWizard';
import { commandesService, createCommandesSocket } from '../../services/commandes.service';
import { stocksAPI, authAPI, b2bAPI } from '../../services/api';
import SecurityPanel from '../../components/security/SecurityPanel';
import NotificationBell from '../../components/notifications/NotificationBell';
import {
  formatDate, formatDeliveryMode, formatFCFA,
  STATUS_COLORS, STATUS_LABELS, timeAgo,
} from '../../utils/formatters';

const ACCENT = '#1C3A1C';

const STATUS_FLOW = {
  RECUE: ['CONFIRMEE'], CONFIRMEE: ['EN_PREP'], EN_PREP: ['PRETE'],
  PRETE: ['EN_LIVRAISON', 'LIVREE'], EN_LIVRAISON: ['LIVREE'],
  LIVREE: [], ANNULEE: [],
};
const ACTION_LABELS = {
  CONFIRMEE:    'Accepter la commande',
  EN_PREP:      'Commencer la préparation',
  PRETE:        'Marquer Prêt',
  EN_LIVRAISON: 'Envoyer en livraison',
  LIVREE:       'Confirmer livraison',
};
const PAYMENT_MODES = { SUR_PLACE: 'ESPECES', EMPORTER: 'ESPECES', LIVRAISON: 'ESPECES' };

const B2B_STATUS_FLOW = {
  EN_ATTENTE: ['CONFIRMEE'], CONFIRMEE: ['EN_PREPARATION'],
  EN_PREPARATION: ['LIVREE'], LIVREE: [], ANNULEE: [],
};
const B2B_STATUS_LABELS = {
  EN_ATTENTE: 'En attente', CONFIRMEE: 'Confirmée',
  EN_PREPARATION: 'En préparation', LIVREE: 'Livrée', ANNULEE: 'Annulée',
};
const B2B_ACTION_LABELS = {
  CONFIRMEE: 'Confirmer',
  EN_PREPARATION: 'Démarrer préparation',
  LIVREE: 'Marquer livrée',
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

// Build weekly schedule from restaurant hours (same hours every day per current model)
function buildWeek(openingTime, closingTime) {
  const label = openingTime && closingTime ? `${openingTime} – ${closingTime}` : null;
  return WEEK_DAYS.map(({ init, name }) => ({
    init, name,
    hours: label || 'Horaires non configurés',
    rest: !label,
  }));
}

// Is the restaurant currently in service?
function isInService(openingTime, closingTime) {
  if (!openingTime || !closingTime) return false;
  const now = new Date();
  const [oh, om] = openingTime.split(':').map(Number);
  const [ch, cm] = closingTime.split(':').map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur >= oh * 60 + om && cur < ch * 60 + cm;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
  );
}

function KpiCard({ icon: Icon, iconBg, iconColor, label, value, unit, sub, subColor }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E8ECE8', borderRadius: 20, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ fontSize: 13, color: '#6B7280', margin: 0, fontWeight: 500 }}>{label}</p>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon style={{ width: 18, height: 18, color: iconColor }} />
        </div>
      </div>
      <p style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: '0 0 6px', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value} <span style={{ fontSize: 14, fontWeight: 600, color: '#9CA3AF' }}>{unit}</span>
      </p>
      {sub && (
        <p style={{ fontSize: 12, color: subColor || '#6B7280', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function StaffOrderCard({ order, onAction, onPayment, paymentDraft, setPaymentDraft, saving }) {
  const isUrgent = order.createdAt && Date.now() - new Date(order.createdAt).getTime() >= 15 * 60 * 1000;
  const nextStatuses = STATUS_FLOW[order.statut] || [];
  const [primaryStatus] = nextStatuses;
  const timeStr = order.createdAt
    ? new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '';
  const minutesAgo = order.createdAt
    ? Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)
    : null;
  const articleNames = (order.lignes || []).map(l => l.article?.nom).filter(Boolean).join(', ');
  // All 3 modes can require manual payment: SUR_PLACE/EMPORTER = counter, LIVRAISON = on delivery
  const showPayment = !order.estPaye;
  const draft = paymentDraft || {};

  return (
    <div style={{ background: '#fff', border: `1px solid ${isUrgent ? '#FECACA' : '#E8ECE8'}`, borderRadius: 18, padding: '18px 20px', background: isUrgent ? '#FFFAFA' : '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        {/* Left: icon + info */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: isUrgent ? '#FEE2E2' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ChefHat style={{ width: 20, height: 20, color: isUrgent ? '#DC2626' : '#6B7280' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              <span style={{ background: '#F3F4F6', color: '#374151', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                #{order.numero}
              </span>
              {isUrgent && (
                <span style={{ background: '#FEE2E2', color: '#DC2626', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                  URGENT
                </span>
              )}
              <span style={{ background: '#F0F2F0', color: '#374151', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99 }}>
                {formatDeliveryMode(order.modeLivraison)}
              </span>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {articleNames || `Commande ${order.numero}`}
            </p>
            <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock style={{ width: 11, height: 11 }} />
              Reçue à {timeStr}{minutesAgo !== null ? ` · ${minutesAgo} min` : ''}
            </p>
          </div>
        </div>

        {/* Right: amount */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 2px' }}>À percevoir</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#D97706', margin: 0, lineHeight: 1 }}>
            {(Number(order.montantTotal) || 0).toLocaleString('fr-FR')}
          </p>
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>CFA</p>
        </div>
      </div>

      {/* Order lines */}
      {(order.lignes || []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {order.lignes.slice(0, 4).map((l, i) => (
            <span key={i} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: '#374151' }}>
              {l.quantite}× {l.article?.nom || 'Article'}
            </span>
          ))}
          {order.lignes.length > 4 && (
            <span style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: '#9CA3AF' }}>
              +{order.lignes.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Payment */}
      {showPayment && (
        <div style={{ marginTop: 12, padding: '12px 14px', background: '#F9FAFB', border: '1px solid #E8ECE8', borderRadius: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CircleDollarSign style={{ width: 13, height: 13, color: ACCENT }} />
            Encaissement
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={draft.modePaiement || PAYMENT_MODES[order.modeLivraison] || 'ESPECES'}
              onChange={e => setPaymentDraft({ ...draft, modePaiement: e.target.value })}
              style={{ flex: 1, borderRadius: 10, border: '1px solid #D1D5DB', padding: '6px 10px', fontSize: 12, outline: 'none', background: '#fff' }}>
              <option value="ESPECES">Espèces</option>
              <option value="LIVRAISON">À la livraison</option>
            </select>
            <input type="number" min="0" value={draft.montantRemis ?? Number(order.montantTotal)}
              onChange={e => setPaymentDraft({ ...draft, montantRemis: e.target.value })}
              style={{ width: 90, borderRadius: 10, border: '1px solid #D1D5DB', padding: '6px 10px', fontSize: 12, outline: 'none', background: '#fff' }} />
            <button onClick={() => onPayment(order)} disabled={saving}
              style={{ borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? '...' : 'Encaisser'}
            </button>
          </div>
          {Number(draft.montantRemis) > Number(order.montantTotal) && (
            <p style={{ fontSize: 12, color: '#16A34A', fontWeight: 600, margin: '6px 0 0' }}>
              Rendu : {formatFCFA(Number(draft.montantRemis) - Number(order.montantTotal))}
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      {nextStatuses.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {nextStatuses.map((ns, i) => (
            <button key={ns} onClick={() => onAction(order.id, ns)} disabled={saving}
              style={{
                flex: 1, padding: '10px', borderRadius: 12,
                border: i === 0 ? 'none' : `1px solid ${ACCENT}`,
                background: i === 0 ? ACCENT : '#fff',
                color: i === 0 ? '#fff' : ACCENT,
                fontSize: 13, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}>
              {saving ? '...' : (ACTION_LABELS[ns] || ns)}
            </button>
          ))}
        </div>
      )}
      {order.statut === 'RECUE' && Date.now() - new Date(order.createdAt).getTime() < 5 * 60 * 1000 && (
        <button onClick={() => onAction(order.id, 'ANNULEE')} disabled={saving}
          style={{ width: '100%', marginTop: 6, padding: '8px', borderRadius: 10, border: '1px solid #FECACA', background: '#FFF5F5', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          Annuler la commande
        </button>
      )}
    </div>
  );
}

function B2BStaffOrderCard({ order, onAction, saving }) {
  const nextStatuses = B2B_STATUS_FLOW[order.statut] || [];
  const isUrgent = order.createdAt && Date.now() - new Date(order.createdAt).getTime() >= 15 * 60 * 1000;
  const timeStr = order.createdAt
    ? new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '';
  const minutesAgo = order.createdAt
    ? Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)
    : null;

  return (
    <div style={{ background: isUrgent ? '#FFFAF5' : '#FFFDF5', border: `1px solid ${isUrgent ? '#FBBF24' : '#FDE68A'}`, borderRadius: 18, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Package style={{ width: 20, height: 20, color: '#D97706' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              <span style={{ background: '#FEF3C7', color: '#B45309', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                #{order.numero}
              </span>
              <span style={{ background: '#D97706', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, letterSpacing: '0.05em' }}>
                B2B
              </span>
              {isUrgent && (
                <span style={{ background: '#FEE2E2', color: '#DC2626', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                  URGENT
                </span>
              )}
              <span style={{ background: '#F3F4F6', color: '#6B7280', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, border: '1px solid #E5E7EB' }}>
                {B2B_STATUS_LABELS[order.statut] || order.statut}
              </span>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {order.entreprise || 'Entreprise'}
            </p>
            <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock style={{ width: 11, height: 11 }} />
              Reçue à {timeStr}{minutesAgo !== null ? ` · ${minutesAgo} min` : ''}
            </p>
            {(order.dateLivraison || order.heureLivraison || order.lieuLivraison) && (
              <p style={{ fontSize: 12, color: '#B45309', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Truck style={{ width: 11, height: 11 }} />
                {order.dateLivraison ? new Date(order.dateLivraison).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : ''}
                {order.heureLivraison ? ` à ${order.heureLivraison}` : ''}
                {order.lieuLivraison ? ` · ${order.lieuLivraison}` : ''}
              </p>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 2px' }}>Total estimé</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#D97706', margin: 0, lineHeight: 1 }}>
            {(Number(order.totalEstime) || 0).toLocaleString('fr-FR')}
          </p>
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>CFA</p>
        </div>
      </div>

      {(order.lignes || []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {order.lignes.slice(0, 4).map((l, i) => (
            <span key={i} style={{ background: '#FEF9C3', border: '1px solid #FEF08A', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: '#713F12' }}>
              {l.quantite}× {l.nomArticle || 'Article'}
            </span>
          ))}
          {order.lignes.length > 4 && (
            <span style={{ background: '#FEF9C3', border: '1px solid #FEF08A', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: '#9CA3AF' }}>
              +{order.lignes.length - 4}
            </span>
          )}
        </div>
      )}

      {nextStatuses.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {nextStatuses.map((ns, i) => (
            <button key={ns} onClick={() => onAction(order.id, ns)} disabled={saving}
              style={{
                flex: 1, padding: '10px', borderRadius: 12,
                border: i === 0 ? 'none' : `1px solid ${ACCENT}`,
                background: i === 0 ? ACCENT : '#fff',
                color: i === 0 ? '#fff' : ACCENT,
                fontSize: 13, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}>
              {saving ? '...' : (B2B_ACTION_LABELS[ns] || ns)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function WeeklySchedule({ openingTime, closingTime }) {
  const todayIdx = (new Date().getDay() + 6) % 7;
  const week = buildWeek(openingTime, closingTime);
  const inService = isInService(openingTime, closingTime);

  return (
    <div style={{ background: '#fff', border: '1px solid #E8ECE8', borderRadius: 20, padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>Planning de la semaine</h3>
        <Calendar style={{ width: 16, height: 16, color: '#9CA3AF' }} />
      </div>

      {/* Current service status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: inService ? '#22C55E' : '#9CA3AF', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: inService ? '#16A34A' : '#9CA3AF', fontWeight: 600 }}>
          {inService ? 'En service actuellement' : 'Hors service'}
        </span>
        {openingTime && closingTime && (
          <span style={{ fontSize: 11, color: '#D1D5DB', marginLeft: 'auto' }}>
            {openingTime} – {closingTime}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {week.map((day, i) => {
          const isToday = i === todayIdx;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 12,
              background: isToday ? '#F0F5F0' : 'transparent',
              border: isToday ? '1px solid #D1E0D1' : '1px solid transparent',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: isToday ? ACCENT : '#F3F4F6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                color: isToday ? '#fff' : '#6B7280',
              }}>
                {day.init}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: '#111827', margin: 0 }}>{day.name}</p>
                <p style={{ fontSize: 11, color: day.rest ? '#EF4444' : '#9CA3AF', margin: '1px 0 0' }}>
                  {day.hours}
                </p>
              </div>
              {isToday && (
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: inService ? '#22C55E' : '#D97706',
                  flexShrink: 0,
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Profile Panel ─── */
function PanelField({ label, icon: Icon, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        {Icon && <Icon style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#64748B', pointerEvents: 'none' }} />}
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: '100%', boxSizing: 'border-box', padding: `10px 12px 10px ${Icon ? 36 : 12}px`, border: '1px solid #E8ECE8', borderRadius: 9, fontSize: 13, color: '#0F172A', outline: 'none', background: '#F9FAFB' }}
          onFocus={e => e.target.style.borderColor = ACCENT}
          onBlur={e => e.target.style.borderColor = '#E8ECE8'}
        />
      </div>
    </div>
  );
}

function ProfilePanel({ user, onClose, profileForm, setProfileForm, onSaveProfile, savingProfile, profileError, profileSuccess }) {
  const [tab, setTab] = useState('profil');
  const initials = ((user?.prenom?.[0] ?? '') + (user?.nom?.[0] ?? '')).toUpperCase() || 'S';
  const fullName = [user?.prenom, user?.nom].filter(Boolean).join(' ') || 'Mon Profil';
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(440px,100vw)', background: '#fff', zIndex: 50, overflowY: 'auto', boxShadow: '-20px 0 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: ACCENT, padding: '28px 24px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{initials}</span>
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{fullName}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0 }}>{user?.email}</p>
                <span style={{ display: 'inline-block', marginTop: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 99, padding: '2px 10px', fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '0.1em' }}>STAFF</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', lineHeight: 0 }}>
              <X style={{ width: 16, height: 16, color: '#fff' }} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[{ id: 'profil', label: 'Profil', icon: User }, { id: 'securite', label: 'Sécurité', icon: ShieldCheck }].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 700, background: tab === id ? 'rgba(255,255,255,0.2)' : 'transparent', color: tab === id ? '#fff' : 'rgba(255,255,255,0.55)' }}>
                <Icon style={{ width: 13, height: 13 }} />{label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: 24, flex: 1 }}>
          {tab === 'profil' && (
            <>
              {profileError   && <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{profileError}</div>}
              {profileSuccess && <div style={{ padding: '10px 14px', borderRadius: 10, background: '#F0FDF4', border: '1px solid #86EFAC', color: '#16A34A', fontSize: 13, marginBottom: 12 }}>{profileSuccess}</div>}
              <form onSubmit={onSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <PanelField label="Prénom" icon={User}  value={profileForm.prenom}    onChange={v => setProfileForm(p => ({ ...p, prenom: v }))} placeholder="Jean" />
                  <PanelField label="Nom"    icon={User}  value={profileForm.nom}       onChange={v => setProfileForm(p => ({ ...p, nom: v }))}    placeholder="Kouassi" />
                </div>
                <PanelField label="Email"     icon={Mail}  type="email" value={profileForm.email}     onChange={v => setProfileForm(p => ({ ...p, email: v }))}     placeholder="jean@staff.ci" />
                <PanelField label="Téléphone" icon={Phone} type="tel"   value={profileForm.telephone} onChange={v => setProfileForm(p => ({ ...p, telephone: v }))} placeholder="+225 07 00 00 00" />
                <button type="submit" disabled={savingProfile} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: savingProfile ? '#6B7280' : ACCENT, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: savingProfile ? 'not-allowed' : 'pointer', marginTop: 4 }}>
                  {savingProfile ? <><Spinner />Enregistrement…</> : <><Save style={{ width: 15, height: 15 }} />Enregistrer</>}
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

/* ── MAIN COMPONENT ────────────────────────────────────────────────────────── */
export default function StaffDashboard() {
  const { user, syncUser, refreshProfile } = useAuth();
  const stocksRef = useRef(null);
  const [showPanel,      setShowPanel]      = useState(false);
  const [isAvailable,    setIsAvailable]    = useState(true);
  const [orders,         setOrders]         = useState([]);
  const [stocks,         setStocks]         = useState([]);
  const [stockFilter,    setStockFilter]    = useState('all');
  const [loading,        setLoading]        = useState(true);
  const [savingOrderId,  setSavingOrderId]  = useState('');
  const [savingStockId,  setSavingStockId]  = useState('');
  const [b2bOrders,      setB2bOrders]      = useState([]);
  const [savingB2BId,    setSavingB2BId]    = useState('');
  const [paymentDrafts,  setPaymentDrafts]  = useState({});
  const [error,          setError]          = useState('');
  const [actionHistory,  setActionHistory]  = useState([]);
  const [now,            setNow]            = useState(new Date());

  const [profileForm,    setProfileForm]    = useState({ nom: '', prenom: '', email: '', telephone: '' });
  const [savingProfile,  setSavingProfile]  = useState(false);
  const [profileError,   setProfileError]   = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  useEffect(() => {
    if (user) setProfileForm({ nom: user.nom ?? '', prenom: user.prenom ?? '', email: user.email ?? '', telephone: user.telephone ?? '' });
  }, [user]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const handleProfileUpdate = async (e) => {
    e?.preventDefault();
    setProfileError(''); setProfileSuccess('');
    if (!profileForm.nom.trim() || !profileForm.email.trim()) { setProfileError('Nom et email requis'); return; }
    setSavingProfile(true);
    try {
      const res = await authAPI.updateProfile(profileForm);
      syncUser(res.data);
      setProfileSuccess('Profil mis à jour avec succès.');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) { setProfileError(err?.response?.data?.message || 'Erreur lors de la mise à jour'); }
    finally { setSavingProfile(false); }
  };

  const actionHistoryKey = user?.restaurant?.id
    ? `staff-action-history:${user.restaurant.id}` : user?.id ? `staff-action-history:${user.id}` : 'staff-action-history:global';

  const appendHistory = useCallback((type, title, description) => {
    const entry = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, type, title, description, createdAt: new Date().toISOString() };
    setActionHistory(current => {
      const next = [entry, ...current].slice(0, 8);
      try { localStorage.setItem(actionHistoryKey, JSON.stringify(next)); } catch { localStorage.removeItem(actionHistoryKey); }
      return next;
    });
  }, [actionHistoryKey]);

  const refreshDashboard = useCallback(async ({ silent = false } = {}) => {
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
    } catch { setError('Impossible de charger le dashboard staff'); }
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => {
    // Sync fresh profile from DB (ensures restaurant.id is always up-to-date)
    void refreshProfile();
    void refreshDashboard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    try {
      const stored = JSON.parse(localStorage.getItem(actionHistoryKey) || '[]');
      setActionHistory(Array.isArray(stored) ? stored : []);
    } catch { setActionHistory([]); }
  }, [actionHistoryKey, user?.id]);

  // Stable primitives so the socket effect only re-runs when identity / restaurant changes
  const userId        = user?.id;
  const restaurantId  = user?.restaurant?.id;
  const userRole      = user?.role;

  useEffect(() => {
    if (!userId) return;
    // 8-second fallback poll — covers missed WebSocket events
    const poll = setInterval(() => void refreshDashboard({ silent: true }), 8000);
    const socket = createCommandesSocket({ id: userId, role: userRole, restaurant: restaurantId ? { id: restaurantId } : undefined });

    socket.on('commande.nouvelle',    p => { appendHistory('commande', `Nouvelle commande ${p?.numero || ''}`.trim(), 'Commande reçue en cuisine'); void refreshDashboard({ silent: true }); });
    socket.on('commande.statut',      p => { appendHistory('statut',   `Statut mis à jour ${p?.numero || ''}`.trim(), `→ ${p?.statut || '?'}`);    void refreshDashboard({ silent: true }); });
    socket.on('commande.paiement',    p => { appendHistory('paiement', `Paiement confirmé ${p?.numero || ''}`.trim(), 'Paiement validé');            void refreshDashboard({ silent: true }); });
    socket.on('commande.b2b.nouvelle',p => { appendHistory('commande', `B2B ${p?.entreprise || ''} – ${p?.numero || ''}`.trim(), 'Commande B2B reçue'); void refreshDashboard({ silent: true }); });
    socket.on('commande.b2b.statut',  () => void refreshDashboard({ silent: true }));
    // Refresh immediately after reconnection to catch any missed events
    socket.on('reconnect',            () => void refreshDashboard({ silent: true }));

    return () => { clearInterval(poll); socket.disconnect(); };
  }, [appendHistory, refreshDashboard, userId, restaurantId, userRole]);

  const activeOrders  = useMemo(() => orders.filter(o => ['RECUE','CONFIRMEE','EN_PREP','PRETE','EN_LIVRAISON'].includes(o.statut)), [orders]);
  const urgentOrders  = useMemo(() => activeOrders.filter(o => o.createdAt && Date.now() - new Date(o.createdAt).getTime() >= 15 * 60 * 1000), [activeOrders]);
  const todayStr      = useMemo(() => new Date().toDateString(), []);
  const completedToday = useMemo(() => orders.filter(o => o.statut === 'LIVREE' && new Date(o.updatedAt || o.createdAt).toDateString() === todayStr), [orders, todayStr]);
  const encaissementsToday = useMemo(() => completedToday.reduce((s, o) => s + Number(o.montantTotal || 0), 0), [completedToday]);
  const stockAlerts     = useMemo(() => stocks.filter(s => s.stock <= s.seuil), [stocks]);
  const activeB2BOrders = useMemo(() => b2bOrders.filter(o => !['LIVREE', 'ANNULEE'].includes(o.statut)), [b2bOrders]);
  const allActiveOrders = useMemo(() => [
    ...activeOrders.map(o => ({ ...o, _type: 'client' })),
    ...activeB2BOrders.map(o => ({ ...o, _type: 'b2b' })),
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)), [activeOrders, activeB2BOrders]);
  const displayedStocks = useMemo(() => stockFilter === 'alerts' ? stockAlerts : stocks, [stocks, stockAlerts, stockFilter]);

  const updateStatus = async (id, next) => {
    try { setSavingOrderId(id); setError(''); await commandesService.updateStatut(id, next); appendHistory('action', `Commande ${id} mise à jour`, `→ ${STATUS_LABELS[next] || next}`); await refreshDashboard(); }
    catch { setError('Mise à jour du statut impossible'); }
    finally { setSavingOrderId(''); }
  };

  const registerPayment = async (order) => {
    const draft = paymentDrafts[order.id] || {};
    const montantRemis = Number(draft.montantRemis ?? order.montantTotal);
    const modePaiement = draft.modePaiement || PAYMENT_MODES[order.modeLivraison] || 'ESPECES';
    if (!Number.isFinite(montantRemis)) { setError('Montant remis invalide'); return; }
    try { setSavingOrderId(order.id); setError(''); await commandesService.registerPayment(order.id, { montantRemis, modePaiement }); appendHistory('paiement', `Paiement ${order.numero}`, `Encaissement en ${modePaiement}`); await refreshDashboard(); }
    catch { setError('Paiement refusé: montant doit être exact'); }
    finally { setSavingOrderId(''); }
  };

  const updateB2BStatus = async (id, statut) => {
    try { setSavingB2BId(id); setError(''); await b2bAPI.updateCommandeGroupeeStatut(id, statut); appendHistory('statut', 'B2B commande mise à jour', `→ ${B2B_STATUS_LABELS[statut] || statut}`); await refreshDashboard(); }
    catch { setError('Mise à jour commande B2B impossible'); }
    finally { setSavingB2BId(''); }
  };

  const adjustStock = async (id, qty, motif) => {
    try { setSavingStockId(id); setError(''); await stocksAPI.adjust(id, qty, motif); appendHistory('stock', 'Stock ajusté', `${motif} (${qty > 0 ? '+' : ''}${qty})`); await refreshDashboard(); }
    catch { setError('Ajustement de stock impossible'); }
    finally { setSavingStockId(''); }
  };

  const initials = ((user?.prenom?.[0] ?? '') + (user?.nom?.[0] ?? '')).toUpperCase() || 'S';
  const firstName = user?.prenom || user?.nom || 'vous';

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ width: 40, height: 40, border: `4px solid #E8ECE8`, borderTopColor: ACCENT, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F2F0', padding: '28px 32px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <OnboardingWizard />

      {/* ── TOP BAR ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#374151', margin: 0 }}>Staff Portal</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <NotificationBell accentColor={ACCENT} />
          <button onClick={() => void refreshDashboard()} style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid #E8ECE8', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw style={{ width: 16, height: 16, color: '#6B7280' }} />
          </button>
          <Link to="/staff/kds" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: ACCENT, color: '#fff', padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            KDS <ArrowRight style={{ width: 14, height: 14 }} />
          </Link>
          <button onClick={() => setShowPanel(true)} style={{ width: 38, height: 38, borderRadius: '50%', background: ACCENT, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#fff' }}>
            {initials}
          </button>
        </div>
      </div>

      {/* ── WELCOME + STATUS ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: '#111827', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Bonjour, {firstName}
          </h1>
          <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>
            Voici un résumé de votre journée et vos tâches en cours.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #E8ECE8', borderRadius: 99, padding: '6px 8px' }}>
          <button onClick={() => setIsAvailable(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99,
            border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: isAvailable ? ACCENT : 'transparent',
            color: isAvailable ? '#fff' : '#9CA3AF',
          }}>
            {isAvailable && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', flexShrink: 0 }} />}
            Disponible
          </button>
          <button onClick={() => setIsAvailable(false)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99,
            border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: !isAvailable ? '#6B7280' : 'transparent',
            color: !isAvailable ? '#fff' : '#9CA3AF',
          }}>
            {!isAvailable && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#D1D5DB', flexShrink: 0 }} />}
            Occupé
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 13, marginBottom: 20 }}>
          <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />{error}
        </div>
      )}

      {/* ── 3 KPI CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard
          icon={Wallet}
          iconBg="#F0FDF4"
          iconColor="#16A34A"
          label="Encaissements du jour"
          value={(encaissementsToday / 1000).toFixed(0) + ' k'}
          unit="CFA"
          sub={encaissementsToday > 0 ? `↑ ${completedToday.length} commande${completedToday.length > 1 ? 's' : ''} livrée${completedToday.length > 1 ? 's' : ''}` : 'Aucun encaissement pour l\'instant'}
          subColor={encaissementsToday > 0 ? '#16A34A' : '#9CA3AF'}
        />
        <KpiCard
          icon={Truck}
          iconBg="#FFF7ED"
          iconColor="#D97706"
          label="Livraisons effectuées"
          value={completedToday.length}
          unit=""
          sub={`Objectif journalier : ${Math.max(completedToday.length + activeOrders.length, 10)}`}
          subColor="#9CA3AF"
        />
        <KpiCard
          icon={Clock}
          iconBg="#F0F5FF"
          iconColor="#6366F1"
          label="Commandes en cours"
          value={allActiveOrders.length}
          unit=""
          sub={urgentOrders.length > 0 ? `⚠ ${urgentOrders.length} urgente${urgentOrders.length > 1 ? 's' : ''}` : 'Tout sous contrôle'}
          subColor={urgentOrders.length > 0 ? '#D97706' : '#16A34A'}
        />
      </div>

      {/* ── 2-COLUMN MAIN GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20, alignItems: 'start' }}>

        {/* Left: active orders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid #E8ECE8', borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 16px' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>
                Mes Livraisons / Commandes en cours
              </h3>
              <button onClick={() => void refreshDashboard({ silent: true })} style={{ fontSize: 12, color: '#D97706', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                Voir l'historique
              </button>
            </div>

            {allActiveOrders.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <ChefHat style={{ width: 24, height: 24, color: '#D1D5DB' }} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>Aucune commande active</p>
                <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>Les nouvelles commandes apparaîtront ici en temps réel.</p>
              </div>
            ) : (
              <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {allActiveOrders.map(order => order._type === 'b2b' ? (
                  <B2BStaffOrderCard
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

          {/* Stocks & Inventaire temps réel */}
          {stocks.length > 0 && (
            <div ref={stocksRef} style={{ background: '#fff', border: `1px solid ${stockAlerts.length > 0 ? '#FEE2E2' : '#E8ECE8'}`, borderRadius: 20, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: stockAlerts.length > 0 ? '#FEF2F2' : '#F0F5F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BarChart2 style={{ width: 16, height: 16, color: stockAlerts.length > 0 ? '#EF4444' : ACCENT }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Stocks & Inventaire</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', margin: '1px 0 0' }}>
                      {stocks.length} article{stocks.length > 1 ? 's' : ''}
                      {stockAlerts.length > 0 && ` · ${stockAlerts.length} alerte${stockAlerts.length > 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 10, padding: '3px', gap: 2 }}>
                  {[['all', 'Tous'], ['alerts', 'Alertes']].map(([key, label]) => (
                    <button key={key} onClick={() => setStockFilter(key)}
                      style={{ padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: stockFilter === key ? '#fff' : 'transparent', color: stockFilter === key ? '#111827' : '#9CA3AF', boxShadow: stockFilter === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                      {label}{key === 'alerts' && stockAlerts.length > 0 ? ` (${stockAlerts.length})` : ''}
                    </button>
                  ))}
                </div>
              </div>

              {displayedStocks.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', paddingBottom: 24 }}>
                  <CheckCircle2 style={{ width: 22, height: 22, color: '#16A34A', margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>Tous les stocks sont suffisants</p>
                </div>
              ) : (
                <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
                  {displayedStocks.map(item => {
                    const isRupture = item.stock <= 0;
                    const isLow = !isRupture && item.stock <= item.seuil;
                    const pct = item.seuil > 0 ? Math.min(100, Math.round((item.stock / (item.seuil * 2)) * 100)) : 50;
                    return (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: isRupture ? '#FFF5F5' : isLow ? '#FFFDF5' : '#F9FAFB', border: `1px solid ${isRupture ? '#FCA5A5' : isLow ? '#FDE68A' : '#E5E7EB'}`, borderRadius: 12 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: isRupture ? '#FEE2E2' : isLow ? '#FEF3C7' : '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isRupture ? <AlertTriangle style={{ width: 13, height: 13, color: '#EF4444' }} /> : isLow ? <Flame style={{ width: 13, height: 13, color: '#D97706' }} /> : <CheckCircle2 style={{ width: 13, height: 13, color: '#16A34A' }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nom}</p>
                            {item.categorie && (
                              <span style={{ fontSize: 9, color: '#9CA3AF', background: '#F3F4F6', borderRadius: 99, padding: '1px 5px', flexShrink: 0 }}>{item.categorie}</span>
                            )}
                          </div>
                          <div style={{ height: 3, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: isRupture ? '#EF4444' : isLow ? '#F59E0B' : '#22C55E', borderRadius: 99, transition: 'width 0.4s' }} />
                          </div>
                          <p style={{ fontSize: 10, color: '#9CA3AF', margin: '2px 0 0' }}>
                            {item.stock} en stock · seuil min {item.seuil}
                          </p>
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, flexShrink: 0, background: isRupture ? '#FEE2E2' : isLow ? '#FEF3C7' : '#F0FDF4', color: isRupture ? '#EF4444' : isLow ? '#D97706' : '#16A34A' }}>
                          {isRupture ? 'RUPTURE' : isLow ? 'FAIBLE' : 'OK'}
                        </span>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button onClick={() => void adjustStock(item.id, -1, 'Correction stock')} disabled={savingStockId === item.id || item.stock <= 0}
                            style={{ width: 26, height: 26, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, color: '#EF4444', cursor: item.stock <= 0 ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: item.stock <= 0 ? 0.4 : 1, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                          <button onClick={() => void adjustStock(item.id, 1, 'Réception stock')} disabled={savingStockId === item.id}
                            style={{ width: 26, height: 26, borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 14, cursor: 'pointer', fontWeight: 700, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <WeeklySchedule
            openingTime={user?.restaurant?.openingTime}
            closingTime={user?.restaurant?.closingTime}
          />

          {/* Recent activity */}
          {actionHistory.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #E8ECE8', borderRadius: 20, padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>Activité récente</h3>
                <Activity style={{ width: 16, height: 16, color: '#9CA3AF' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {actionHistory.slice(0, 5).map(entry => (
                  <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#F9FAFB', borderRadius: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.type === 'paiement' ? '#16A34A' : entry.type === 'commande' ? ACCENT : '#D97706', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.title}</p>
                      <p style={{ fontSize: 11, color: '#9CA3AF', margin: '1px 0 0' }}>{entry.description}</p>
                    </div>
                    <p style={{ fontSize: 10, color: '#D1D5DB', margin: 0, flexShrink: 0 }}>{formatDate(entry.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Panel */}
      {showPanel && (
        <ProfilePanel
          user={user}
          onClose={() => setShowPanel(false)}
          profileForm={profileForm}
          setProfileForm={setProfileForm}
          onSaveProfile={handleProfileUpdate}
          savingProfile={savingProfile}
          profileError={profileError}
          profileSuccess={profileSuccess}
        />
      )}
    </div>
  );
}
