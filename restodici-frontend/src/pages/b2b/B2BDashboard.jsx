import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Chart from 'chart.js/auto';
import {
  LayoutDashboard, ShoppingBag, Users, FileText, Settings,
  X, RefreshCw, AlertCircle, UtensilsCrossed, Download,
  CalendarDays, Bell, CheckCircle, Send, Search,
  Menu, LogOut, Star, MapPin, Activity, ChevronRight, Shield,
  Clock,
} from 'lucide-react';
import { b2bAPI, authAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { createCommandesSocket, commandesService } from '../../services/commandes.service';
import SecurityPanel from '../../components/security/SecurityPanel';
import { formatFCFA } from '../../utils/formatters';
import B2BOnboardingWizard from './B2BOnboardingWizard';
import OnboardingTour from '../../components/onboarding/OnboardingTour';
import { buildSyscohadaBlob, buildFactureBlob } from '../../utils/syscohada-pdf';
import OverviewSection from './sections/OverviewSection';
import OrdersSection from './sections/OrdersSection';
import CollaborateursSection from './sections/CollaborateursSection';
import AbonnementsSection from './sections/AbonnementsSection';
import FacturesSection from './sections/FacturesSection';
import ActiviteSection from './sections/ActiviteSection';
import SettingsSection from './sections/SettingsSection';

// ── Design tokens (couleurs : theme/colors.js) ──────────────────────────────────
import {
  BG, SURFACE as CARD, BROWN_COFFEE as NAVY, BROWN_COFFEE_HOVER as NAVY2,
  TEXT, MUTED_WARM as MUTED, FAINT_WARM as FAINT, BORDER_SLATE as BORDER,
  // Ces trois alias importaient les tokens BLEUS : tout ce que le code appelle
  // « ORANGE » s'affichait donc en bleu. Ils pointent désormais sur l'orange
  // de la marque, comme le reste de l'application.
  ORANGE, ORANGE_TINT as ORANGE_L, ORANGE_DARK as ORANGE_D,
  GREEN_DARK as GREEN, GREEN_MINT as GREEN_L, GREEN_FOREST as GREEN_D,
  RED_STRONG as RED, RED_ROSE as RED_L, AMBER, YELLOW_LIGHT as AMBER_L,
} from '../../theme/colors';

// Ombres neutres (slate), alignées sur le dashboard client. La teinte brune
// précédente donnait un rendu chaleureux, peu adapté à un outil de gestion.
// SH/SH2 ont migré vers sections/*.jsx via _colors.js — seul SH3 (modales
// restées dans l'orchestrateur) est encore utilisé ici.
const SH3 = '0 12px 28px rgba(15,23,42,0.12),0 4px 8px rgba(15,23,42,0.06)';

// ── PDF helpers ────────────────────────────────────────────────────────────────
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── Status map ─────────────────────────────────────────────────────────────────
const STATUS = {
  EN_ATTENTE:     { label: 'En attente',     color: AMBER,    bg: AMBER_L,  dot: '#FBBF24' },
  RECUE:          { label: 'Reçue',          color: '#FF3A03', bg: '#FFF5ED', dot: '#FF7938' },
  CONFIRMEE:      { label: 'Confirmée',      color: GREEN,    bg: GREEN_L,  dot: '#F59E0B' },
  EN_PREP:        { label: 'En préparation', color: AMBER,    bg: AMBER_L,  dot: '#FBBF24' },
  EN_PREPARATION: { label: 'En préparation', color: AMBER,    bg: AMBER_L,  dot: '#FBBF24' },
  PRETE:          { label: 'Prête',          color: GREEN,    bg: GREEN_L,  dot: '#F59E0B' },
  EN_LIVRAISON:   { label: 'En livraison',   color: '#7C3AED', bg: '#F5F3FF', dot: '#A78BFA' },
  LIVREE:         { label: 'Livrée',         color: GREEN,    bg: GREEN_L,  dot: '#F59E0B' },
  ANNULEE:        { label: 'Annulée',        color: RED,      bg: RED_L,    dot: '#F87171' },
};
const ACTIVE = ['EN_ATTENTE','RECUE','CONFIRMEE','EN_PREP','EN_PREPARATION','PRETE','EN_LIVRAISON'];

// ── Cache ──────────────────────────────────────────────────────────────────────
const cacheKey  = (uid) => uid ? `b2b_v3:${uid}` : 'b2b_v3';
const readCache = (uid) => {
  try {
    const raw = localStorage.getItem(cacheKey(uid));
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts < 10 * 60 * 1000) return data;
  } catch { /* ignore */ }
  return null;
};
const writeCache = (uid, data) => {
  try { localStorage.setItem(cacheKey(uid), JSON.stringify({ data, ts: Date.now() })); } catch { /* ignore */ }
};

// ── Notification helpers ────────────────────────────────────────────────────────
const NOTIF_KEY = (uid) => uid ? `b2b_notifs:${uid}` : 'b2b_notifs';
const loadNotifs = (uid) => {
  try {
    const raw = localStorage.getItem(NOTIF_KEY(uid));
    if (!raw) return [];
    return JSON.parse(raw).map(n => ({ ...n, ts: new Date(n.ts) }));
  } catch { return []; }
};
const saveNotifs = (uid, notifs) => {
  try { localStorage.setItem(NOTIF_KEY(uid), JSON.stringify(notifs.slice(0, 50))); } catch { /* ignore */ }
};

// Maps event type to { icon, label, color }
const NOTIF_TYPES = {
  'commande.creee':       { type: 'new_order',    label: 'Nouvelle commande',         color: '#FF3A03', iconBg: '#FFF5ED' },
  'commande.nouvelle':    { type: 'new_order',    label: 'Nouvelle commande',         color: '#FF3A03', iconBg: '#FFF5ED' },
  'commande.b2b.nouvelle':{ type: 'new_order',    label: 'Commande B2B créée',        color: '#FF3A03', iconBg: '#FFF5ED' },
  'commande.statut':      { type: 'status',       label: 'Statut mis à jour',         color: ORANGE,    iconBg: ORANGE_L  },
  'commande.b2b.statut':  { type: 'status',       label: 'Statut commande B2B',       color: ORANGE,    iconBg: ORANGE_L  },
  'paiement.confirme':    { type: 'payment',      label: 'Paiement confirmé',         color: GREEN,     iconBg: GREEN_L   },
  'facture.generee':      { type: 'invoice',      label: 'Facture générée',           color: AMBER,     iconBg: AMBER_L   },
  'collaborateur.ajoute': { type: 'team',         label: 'Collaborateur ajouté',      color: '#7C3AED', iconBg: '#F5F3FF' },
};

// Status labels in French for richer notification messages
const STATUS_LABELS = {
  EN_ATTENTE: 'En attente', RECUE: 'Reçue', CONFIRMEE: 'Confirmée',
  EN_PREP: 'En préparation', EN_PREPARATION: 'En préparation',
  PRETE: 'Prête', EN_LIVRAISON: 'En livraison', LIVREE: 'Livrée', ANNULEE: 'Annulée',
};

function buildNotifFromEvent(event, data) {
  const meta = NOTIF_TYPES[event] || { type: 'status', label: 'Notification', color: ORANGE, iconBg: ORANGE_L };
  let msg = meta.label;
  if (data.numero) msg += ` · #${data.numero}`;
  if (data.statut) msg += ` → ${STATUS_LABELS[data.statut] || data.statut}`;
  if (data.restaurantNom) msg += ` (${data.restaurantNom})`;
  return {
    id: Date.now() + Math.random(),
    msg,
    ts: new Date(),
    read: false,
    type: meta.type,
    color: meta.color,
    iconBg: meta.iconBg,
    orderId: data.id || data.commandeId || null,
    numero: data.numero || null,
  };
}

// ── Micro components ───────────────────────────────────────────────────────────

export function CostCenterChart({ data, total }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const ctx = chartRef.current.getContext('2d');
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const labels = Object.keys(data).length > 0 ? Object.keys(data) : ['Aucune commande'];
    const values = Object.keys(data).length > 0 ? Object.values(data) : [1];
    
    // Dégradé terracotta de la marque, complété de neutres. Aucun bleu :
    // la teinte doit rester cohérente avec le reste de l'application.
    const bgColors = Object.keys(data).length > 0
      ? ['#9A3412', '#CC2402', '#FF3A03', '#FF7938', '#FDBA74', '#78716C']
      : ['#E2E8F0'];

    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: bgColors,
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              usePointStyle: true,
              padding: 16,
              font: { family: 'inherit', size: 11, weight: '600' },
              color: '#475569'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: (ctx) => {
                if (Object.keys(data).length === 0) return ' 0 commande';
                const val = ctx.raw;
                const pct = Math.round((val / total) * 100);
                return ` ${val} commande${val > 1 ? 's' : ''} (${pct}%)`;
              }
            }
          }
        },
        cutout: '72%',
        layout: { padding: 0 }
      }
    });

    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [data, total]);

  return (
    <div style={{ height: 210, width: '100%', position: 'relative' }}>
      <canvas ref={chartRef} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', paddingRight: '110px' }}>
        <span style={{ fontSize: 24, fontWeight: 900, color: '#1E293B', lineHeight: 1 }}>{total}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginTop: 2 }}>Total</span>
      </div>
    </div>
  );
}

export function Avatar({ name = '', size = 32 }) {
  const initials = name.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.35,
      background: `hsl(${hue}, 60%, 92%)`,
      border: `1.5px solid hsl(${hue}, 50%, 82%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 800, color: `hsl(${hue}, 55%, 35%)`,
      flexShrink: 0, letterSpacing: '-0.02em',
    }}>
      {initials || '?'}
    </div>
  );
}

export function StatusPill({ statut }) {
  const s = STATUS[statut] || { label: statut, color: '#8B6E50', bg: '#F3F4F6', dot: '#D1D5DB' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.01em',
      background: s.bg, color: s.color,
      border: `1px solid ${s.color}30`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

export function BudgetBar({ spent, budget }) {
  if (!budget) return null;
  const pct = Math.min(100, Math.round((spent / budget) * 100));
  const color = pct >= 90 ? '#DC2626' : pct >= 70 ? '#D97706' : '#FF3A03';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#8B6E50' }}>Budget mensuel</span>
        <span style={{ fontSize: 11, fontWeight: 800, color }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 99, width: `${pct}%`,
          background: pct >= 90
            ? 'linear-gradient(90deg, #EF4444, #DC2626)'
            : pct >= 70
            ? 'linear-gradient(90deg, #F59E0B, #D97706)'
            : 'linear-gradient(90deg, #FF3A03, #FF3A03)',
          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <span style={{ fontSize: 10, color: '#9CA3AF' }}>{formatFCFA(spent)} dépensés</span>
        <span style={{ fontSize: 10, color: '#9CA3AF' }}>{formatFCFA(budget)} budget</span>
      </div>
    </div>
  );
}

// ── Invite modal ───────────────────────────────────────────────────────────────
function InviteModal({ onClose, onSave }) {
  const [form, setForm] = useState({ nom: '', email: '', budgetMensuel: '', poste: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rounded-lg w-full max-w-sm overflow-hidden" style={{ background: CARD, boxShadow: SH3 }}>

        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: ORANGE_L }}>
              <Users className="w-4 h-4" style={{ color: ORANGE }} />
            </div>
            <p className="font-semibold text-sm" style={{ color: TEXT }}>Inviter un collaborateur</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:opacity-70 transition"
            style={{ background: BG }}>
            <X className="w-3.5 h-3.5" style={{ color: MUTED }} />
          </button>
        </div>

        {sent ? (
          <div className="p-8 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: GREEN_L }}>
              <CheckCircle className="w-7 h-7" style={{ color: GREEN }} />
            </div>
            <p className="font-bold text-base" style={{ color: TEXT }}>Invitation envoyée !</p>
            <p className="text-xs" style={{ color: MUTED }}>
              Un email a été envoyé à <strong style={{ color: TEXT }}>{form.email}</strong>
            </p>
            <button onClick={onClose} className="mt-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ background: ORANGE }}>Fermer</button>
          </div>
        ) : (
          <div className="p-5 space-y-3">
            {[
              { k: 'nom',           label: 'Nom complet *',         type: 'text',   ph: 'Jean Konan' },
              { k: 'email',         label: 'Email professionnel *',  type: 'email',  ph: 'jean@entreprise.ci' },
              { k: 'poste',         label: 'Poste',                  type: 'text',   ph: 'Directeur commercial' },
              { k: 'budgetMensuel', label: 'Budget mensuel (FCFA)',   type: 'number', ph: '50 000' },
            ].map(f => (
              <div key={f.k}>
                <label className="block text-[11px] font-semibold mb-1.5" style={{ color: MUTED }}>{f.label}</label>
                <input type={f.type} value={form[f.k]} placeholder={f.ph} onChange={set(f.k)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition"
                  style={{ background: BG, border: `1.5px solid ${BORDER}`, color: TEXT }} />
              </div>
            ))}
            {err && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: RED_L }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: RED }} />
                <p className="text-xs font-medium" style={{ color: RED }}>{err}</p>
              </div>
            )}
            <p className="text-[11px]" style={{ color: FAINT }}>Un lien d'activation sera envoyé par email.</p>
            <button
              onClick={async () => {
                if (!form.nom || !form.email) { setErr('Nom et email requis'); return; }
                setSaving(true); setErr('');
                try { await onSave(form); setSent(true); }
                catch (e) { setErr(e.response?.data?.message || 'Erreur'); }
                finally { setSaving(false); }
              }}
              disabled={saving}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition"
              style={{ background: saving ? MUTED : ORANGE, cursor: saving ? 'wait' : 'pointer' }}>
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {saving ? 'Envoi en cours…' : 'Envoyer l\'invitation'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── View facture modal (read-only, before payment) ─────────────────────────────
function ViewFactureModal({ facture, onClose, onDownload }) {
  const montant   = Number(facture.montantTTC || facture.montantTotal || 0);
  const montantHT = Math.round(montant / 1.18);
  const tva       = montant - montantHT;
  const isPaid    = facture.statut === 'PAYEE' || facture.statut === 'paid';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
      onContextMenu={e => e.preventDefault()}
      style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none' }}>
      <div className="rounded-lg w-full max-w-lg overflow-hidden"
        style={{ background: '#FFFFFF', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        onContextMenu={e => e.preventDefault()}>

        {/* Header */}
        <div className="relative overflow-hidden px-7 py-6 flex items-center justify-between"
          style={{
            background: isPaid
              ? `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_D} 100%)`
              : `linear-gradient(135deg, #1A0C00 0%, #1E293B 100%)`,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: isPaid ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)' }}>
              {isPaid ? '✓ REÇU DE PAIEMENT' : 'REÇU — LECTURE SEULE'}
            </p>
            <p className="text-xl font-bold text-white mt-1">
              {facture.numeroFacture || `Facture ${facture.periode || ''}`}
            </p>
            <p className="text-[13px] mt-0.5 font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {formatFCFA(montant)}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center relative z-10"
            style={{ background: 'rgba(255,255,255,0.15)' }}>
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-7 space-y-4" onContextMenu={e => e.preventDefault()}>
          {/* Watermark */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
              style={{
                fontSize: 72, fontWeight: 900,
                color: isPaid ? GREEN : ORANGE,
                opacity: isPaid ? 0.05 : 0.04,
                transform: 'rotate(-30deg)', whiteSpace: 'nowrap', zIndex: 0,
              }}>
              {isPaid ? 'PAYÉE' : 'NON PAYÉE'}
            </div>
            <div className="relative space-y-0 z-10 rounded-lg overflow-hidden border"
              style={{ borderColor: BORDER }}>
              {[
                { label: 'Référence',   value: facture.numeroFacture || `Facture ${facture.periode || ''}` },
                { label: 'Période',     value: facture.periode || '—' },
                { label: 'Statut',      value: isPaid ? '✓ Payée' : '⏳ En attente de paiement',
                  valueColor: isPaid ? GREEN : AMBER },
                { label: 'Montant HT',  value: formatFCFA(montantHT) },
                { label: 'TVA 18%',     value: formatFCFA(tva) },
                { label: 'Total TTC',   value: formatFCFA(montant), bold: true },
                ...(facture.echeance ? [{ label: 'Échéance',
                  value: new Date(facture.echeance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }] : []),
              ].map((r, i, arr) => (
                <div key={r.label}
                  className="flex items-center justify-between px-4 py-3"
                  style={{
                    background: i % 2 === 0 ? BG : CARD,
                    borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none',
                  }}>
                  <p className="text-[12px] font-medium" style={{ color: MUTED }}>{r.label}</p>
                  <p className="text-[13px]"
                    style={{ color: r.valueColor || TEXT, fontWeight: r.bold ? 700 : 500 }}>
                    {r.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-1 flex items-center justify-between gap-3">
            {isPaid ? (
              <>
                <p className="text-[11px]" style={{ color: FAINT }}>
                  Facture réglée · RESTODICI B2B · SYSCOHADA TVA 18%
                </p>
                <button
                  onClick={onDownload}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold text-white transition hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_D})`, boxShadow: `0 2px 8px ${GREEN}40` }}>
                  <Download className="w-3.5 h-3.5" /> Télécharger PDF
                </button>
              </>
            ) : (
              <p className="text-center w-full text-[11px]" style={{ color: FAINT }}>
                🔒 Lecture seule — le téléchargement sera disponible après paiement
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Pay modal ─────────────────────────────────────────────────────────────────
function PayModal({ facture, onClose, onPaid }) {
  const [step, setStep]     = useState('confirm'); // confirm | paying | success | error
  const [errMsg, setErrMsg] = useState('');
  const montant = Number(facture.montantTTC || facture.montantTotal || 0);
  const montantHT = Math.round(montant / 1.18);
  const tva = montant - montantHT;

  const doPay = async () => {
    setStep('paying');
    try {
      const res = await b2bAPI.initierPaiement(facture.id);
      const { paymentUrl } = res.data;
      if (paymentUrl && !paymentUrl.includes('/b2b?payment=success')) {
        // Real Novasend redirect
        window.location.href = paymentUrl;
      } else {
        // Simulation mode (no API key) — already marked as paid
        setStep('success');
      }
    } catch (e) {
      setErrMsg(e.response?.data?.message || 'Erreur lors du paiement');
      setStep('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && step !== 'paying' && onClose()}>
      <div className="rounded-lg w-full max-w-md overflow-hidden" style={{ background: CARD, boxShadow: SH3 }}>

        {/* Header */}
        <div className="relative overflow-hidden px-6 py-8"
          style={{ background: `linear-gradient(135deg, ${ORANGE} 0%, ${ORANGE_D} 100%)` }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">Paiement de facture</p>
              <p className="text-2xl font-bold text-white mt-1">{formatFCFA(montant)}</p>
              <p className="text-sm text-white/70 mt-0.5">{facture.numeroFacture || `Facture ${facture.periode || ''}`}</p>
            </div>
            {step !== 'paying' && (
              <button onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.15)' }}>
                <X className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {step === 'success' ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: GREEN_L }}>
                <CheckCircle className="w-8 h-8" style={{ color: GREEN }} />
              </div>
              <p className="text-lg font-bold mb-1" style={{ color: TEXT }}>Paiement confirmé !</p>
              <p className="text-sm mb-6" style={{ color: MUTED }}>
                La facture a été réglée avec succès.
              </p>
              <button onClick={() => { onPaid(); onClose(); }}
                className="w-full py-3 rounded-lg text-sm font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_D})` }}>
                Fermer
              </button>
            </div>
          ) : step === 'error' ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: RED_L }}>
                <AlertCircle className="w-8 h-8" style={{ color: RED }} />
              </div>
              <p className="text-lg font-bold mb-1" style={{ color: TEXT }}>Échec du paiement</p>
              <p className="text-sm mb-6" style={{ color: MUTED }}>{errMsg}</p>
              <div className="flex gap-3">
                <button onClick={onClose}
                  className="flex-1 py-3 rounded-lg text-sm font-semibold border"
                  style={{ borderColor: BORDER, color: MUTED }}>
                  Annuler
                </button>
                <button onClick={doPay}
                  className="flex-1 py-3 rounded-lg text-sm font-bold text-white"
                  style={{ background: ORANGE }}>
                  Réessayer
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Détail facture */}
              <div className="rounded-lg p-4 mb-5 space-y-3" style={{ background: BG }}>
                {[
                  { label: 'Référence', value: facture.numeroFacture || `Facture ${facture.periode || ''}` },
                  { label: 'Période', value: facture.periode || '—' },
                  { label: 'Montant HT', value: formatFCFA(montantHT) },
                  { label: 'TVA 18%', value: formatFCFA(tva) },
                  { label: 'Total TTC', value: formatFCFA(montant), bold: true },
                  ...(facture.echeance ? [{ label: 'Échéance', value: new Date(facture.echeance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }] : []),
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between">
                    <p className="text-[12px]" style={{ color: MUTED }}>{r.label}</p>
                    <p className="text-[13px]" style={{ color: TEXT, fontWeight: r.bold ? 700 : 500 }}>{r.value}</p>
                  </div>
                ))}
              </div>

              <p className="text-[11px] mb-5 text-center" style={{ color: FAINT }}>
                En confirmant, vous autorisez le débit de <strong style={{ color: TEXT }}>{formatFCFA(montant)}</strong> sur votre compte.
              </p>

              <div className="flex gap-3">
                <button onClick={onClose}
                  className="flex-1 py-3 rounded-lg text-sm font-semibold border transition hover:opacity-80"
                  style={{ borderColor: BORDER, color: MUTED, background: BG }}>
                  Annuler
                </button>
                <button onClick={doPay} disabled={step === 'paying'}
                  className="flex-1 py-3 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2 transition hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_D})`, boxShadow: `0 3px 12px ${ORANGE}50` }}>
                  {step === 'paying'
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Traitement…</>
                    : <>Confirmer le paiement</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── B2B Profile Drawer ─────────────────────────────────────────────────────────
function B2BProfileDrawer({ user, onClose, profileForm, setProfileForm, onSave, profileMsg }) {
  const [drawerTab, setDrawerTab] = useState('profil');
  const fullName = [user?.prenom, user?.nom].filter(Boolean).join(' ') || user?.nom || 'Gestionnaire';

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
        width: 'min(360px, 100vw)', background: CARD, boxShadow: SH3,
        display: 'flex', flexDirection: 'column',
        animation: 'b2b-drawer-in 240ms cubic-bezier(.4,0,.2,1)',
        fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
      }}>
        <style>{`@keyframes b2b-drawer-in { from { transform: translateX(100%); } to { transform: translateX(0); } } @keyframes kpiIn { from { opacity:0; transform:translateY(12px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } } @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }`}</style>

        {/* Header navy */}
        <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY2} 100%)`, padding: '28px 24px 20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 28, height: 28, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} color="rgba(255,255,255,0.7)" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={fullName} size={52} />
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{fullName}</p>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{user?.email || ''}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 18, background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 3 }}>
            {[{ id: 'profil', label: 'Profil' }, { id: 'securite', label: 'Sécurité' }].map(t => (
              <button key={t.id} onClick={() => setDrawerTab(t.id)} style={{
                flex: 1, padding: '7px 0', borderRadius: 8, border: 'none',
                background: drawerTab === t.id ? ORANGE : 'transparent',
                color: drawerTab === t.id ? '#fff' : 'rgba(255,255,255,0.55)',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Body scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {drawerTab === 'profil' && (
            <form onSubmit={onSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { k: 'prenom', label: 'Prénom',    type: 'text'  },
                { k: 'nom',    label: 'Nom',       type: 'text'  },
                { k: 'email',  label: 'Email',     type: 'email' },
                { k: 'telephone', label: 'Téléphone', type: 'tel' },
              ].map(f => (
                <div key={f.k}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 6 }}>{f.label}</label>
                  <input
                    type={f.type}
                    value={profileForm[f.k] || ''}
                    onChange={e => setProfileForm(p => ({ ...p, [f.k]: e.target.value }))}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${BORDER}`, background: BG, fontSize: 13, color: TEXT, outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>
              ))}
              {profileMsg && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: profileMsg.includes('Erreur') ? RED_L : GREEN_L, color: profileMsg.includes('Erreur') ? RED : GREEN, fontSize: 12, fontWeight: 600 }}>
                  {profileMsg}
                </div>
              )}
              <button type="submit" style={{ padding: '12px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_D})`, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 3px 10px ${ORANGE}44`, marginTop: 4 }}>
                Enregistrer les modifications
              </button>
            </form>
          )}
          {drawerTab === 'securite' && (
            <SecurityPanel user={user} accentColor={ORANGE} />
          )}
        </div>
      </div>
    </>
  );
}

// ── SYSCOHADA Viewer Modal ─────────────────────────────────────────────────────
function SyscohadaViewerModal({ collabs, factures, compte, monthlyExp, isLastDayOfMonth, lastDayDisplay, onClose, onDownload, downloading, userEmail }) {
  const [captureGuard, setCaptureGuard] = useState(false);
  const mois = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const TVA = 0.18;
  const totalHT  = Math.round((monthlyExp || 0) / (1 + TVA));
  const totalTVA = Math.round((monthlyExp || 0) - totalHT);
  const totalTTC = Math.round(monthlyExp || 0);
  const fcfa = n => `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} FCFA`;

  useEffect(() => {
    const hide = () => setCaptureGuard(true);
    const show = () => setCaptureGuard(false);
    const onVis = () => { if (document.hidden) hide(); else show(); };
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['s','S','4','3'].includes(e.key)) e.preventDefault();
    };
    window.addEventListener('blur', hide);
    window.addEventListener('focus', show);
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('blur', hide);
      window.removeEventListener('focus', show);
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const WM = `CONFIDENTIEL · ${userEmail || 'B2B'}`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <style>{`@media print { .syscohada-viewer-modal { display: none !important; } }`}</style>
      <div className="syscohada-viewer-modal rounded-lg overflow-hidden w-full max-w-4xl max-h-[90vh] flex flex-col relative"
           style={{ background: '#fff', boxShadow: '0 24px 64px rgba(0,0,0,0.45)' }}
           onContextMenu={e => e.preventDefault()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
             style={{ background: '#1A0C00', borderBottom: '2.5px solid #FF3A03' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(234,60,12,0.20)' }}>
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Rapport SYSCOHADA · {mois}</p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Confidentiel · TVA 18% · Lecture seule · Capture désactivée
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLastDayOfMonth ? (
              <button onClick={onDownload} disabled={downloading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#FF3A03,#CC2402)', opacity: downloading ? 0.7 : 1 }}>
                {downloading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {downloading ? 'Génération…' : 'Télécharger PDF'}
              </button>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold"
                    style={{ background: '#FFFBEB', color: '#D97706' }}>
                <Clock className="w-3.5 h-3.5" /> Dispo le {lastDayDisplay}
              </span>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#9CA3AF' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Blur guard */}
        {captureGuard && (
          <div className="absolute inset-0 z-[300] flex flex-col items-center justify-center rounded-lg"
               style={{ background: 'rgba(15,23,42,0.96)' }}>
            <Shield className="w-12 h-12 mb-3" style={{ color: '#FF3A03' }} />
            <p className="text-white font-bold text-base">Contenu masqué</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Cliquez dans la fenêtre pour afficher le rapport
            </p>
          </div>
        )}

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 relative" style={{ userSelect: 'none' }}>

          {/* Watermark overlay */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5, overflow: 'hidden', display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start' }}>
            {Array.from({ length: 28 }).map((_, i) => (
              <div key={i} style={{ width: '50%', height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-20deg)', color: 'rgba(0,0,0,0.04)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', whiteSpace: 'nowrap', userSelect: 'none' }}>
                {WM}
              </div>
            ))}
          </div>

          <div className="p-6 space-y-5" style={{ position: 'relative', zIndex: 1 }}>

            {/* Report header */}
            <div className="rounded-lg p-5" style={{ background: '#1A0C00' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#FF3A03' }}>Rapport Mensuel SYSCOHADA</p>
                  <p className="text-white font-bold text-base">Resto d'ici · Plateforme B2B</p>
                  <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>akwaba@sankofa-lab.co · +225 01 01 50 00 48 · Abidjan, Côte d'Ivoire</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: '#FF3A03' }}>SYSCOHADA</span>
                  <p className="text-[11px] mt-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Période : {mois}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { title: 'PRESTATAIRE', lines: ["Resto d'ici", 'NIF : CI-ABJ-2024-001', 'RCCM : CI-ABJ-2024-B-001', "Abidjan, Côte d'Ivoire"] },
                  { title: 'CLIENT', lines: [compte?.raisonSociale || 'Entreprise', `NIF : ${compte?.numeroContribuable || '—'}`, `RCCM : ${compte?.numeroRCCM || '—'}`, compte?.secteurActivite ? `Secteur : ${compte.secteurActivite}` : ''] },
                ].map(({ title, lines }) => (
                  <div key={title} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#FF3A03' }}>{title}</p>
                    {lines.filter(Boolean).map((l, i) => (
                      <p key={i} className="text-[12px]" style={{ color: i === 0 ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: i === 0 ? 600 : 400 }}>{l}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Section 1 — Collaborateurs */}
            <div>
              <div className="rounded-t-xl px-4 py-2.5" style={{ background: '#1A0C00' }}>
                <p className="text-white font-bold text-[12px] uppercase tracking-wider">1. Synthèse budgétaire par collaborateur</p>
              </div>
              <div className="rounded-b-xl overflow-x-auto border border-t-0" style={{ borderColor: 'rgba(255,108,0,0.10)' }}>
                {collabs.length === 0 ? (
                  <div className="py-8 text-center text-[13px]" style={{ color: '#8B6E50' }}>Aucun collaborateur enregistré</div>
                ) : (
                  <div className="overflow-x-auto w-full"><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ background: '#F8FAFC' }}>
                      <tr>{['N°','Collaborateur','Poste','Budget','Dépensé','Solde','Taux'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: ['Budget','Dépensé','Solde','Taux'].includes(h) ? 'right' : h === 'N°' ? 'center' : 'left', fontWeight: 700, color: '#374151', borderBottom: '1px solid rgba(0,0,0,0.08)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {collabs.map((c, i) => {
                        const bgt = Number(c.limiteBudget || c.budgetMax || 0);
                        const dep = Number(c.depenseActuelle || c.depenses || 0);
                        const sol = Math.max(0, bgt - dep);
                        const pct = bgt > 0 ? Math.round((dep / bgt) * 100) : 0;
                        return (
                          <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC', transition: 'background 0.15s', cursor: 'default' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#F0F7FF'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#F8FAFC'; }}>
                            <td style={{ padding: '9px 12px', textAlign: 'center', color: '#8B6E50' }}>{i + 1}</td>
                            <td style={{ padding: '9px 12px', fontWeight: 600, color: '#1A0C00' }}>{c.nom || '—'}</td>
                            <td style={{ padding: '9px 12px', color: '#8B6E50' }}>{c.poste || '—'}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#1A0C00' }}>{fcfa(bgt)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#1A0C00' }}>{fcfa(dep)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: sol > 0 ? '#FF3A03' : '#DC2626' }}>{fcfa(sol)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: pct >= 100 ? '#DC2626' : pct >= 80 ? '#D97706' : '#FF3A03' }}>{pct} %</td>
                          </tr>
                        );
                      })}
                      {(() => {
                        const tb = collabs.reduce((s, c) => s + Number(c.limiteBudget || 0), 0);
                        const td = collabs.reduce((s, c) => s + Number(c.depenseActuelle || 0), 0);
                        const ts = Math.max(0, tb - td);
                        const tp = tb > 0 ? Math.round((td / tb) * 100) : 0;
                        return (
                          <tr style={{ background: '#F1F5F9', fontWeight: 700 }}>
                            <td style={{ padding: '9px 12px' }}></td>
                            <td style={{ padding: '9px 12px', color: '#1A0C00' }}>TOTAL</td>
                            <td style={{ padding: '9px 12px' }}></td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#1A0C00' }}>{fcfa(tb)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#1A0C00' }}>{fcfa(td)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: ts > 0 ? '#FF3A03' : '#DC2626' }}>{fcfa(ts)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#1A0C00' }}>{tp} %</td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table></div>
                )}
              </div>
            </div>

            {/* Section 2 — Factures */}
            <div>
              <div className="rounded-t-xl px-4 py-2.5" style={{ background: '#1A0C00' }}>
                <p className="text-white font-bold text-[12px] uppercase tracking-wider">2. Détail des factures mensuelles</p>
              </div>
              <div className="rounded-b-xl overflow-x-auto border border-t-0" style={{ borderColor: 'rgba(255,108,0,0.10)' }}>
                {factures.length === 0 ? (
                  <div className="py-8 text-center text-[13px]" style={{ color: '#8B6E50' }}>Aucune facture émise</div>
                ) : (
                  <div className="overflow-x-auto w-full"><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ background: '#F8FAFC' }}>
                      <tr>{['N°','Référence','Période','Échéance','Montant HT','TVA 18%','TTC','Statut'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: ['Montant HT','TVA 18%','TTC'].includes(h) ? 'right' : h === 'N°' ? 'center' : 'left', fontWeight: 700, color: '#374151', borderBottom: '1px solid rgba(0,0,0,0.08)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {factures.map((f, i) => {
                        const ttc = Number(f.montantTTC || f.montantTotal || 0);
                        const ht = Math.round(ttc / (1 + TVA));
                        const tva = ttc - ht;
                        const paid = f.statut === 'PAYEE' || f.statut === 'paid';
                        return (
                          <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC', transition: 'background 0.15s', cursor: 'default' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#F0F7FF'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#F8FAFC'; }}>
                            <td style={{ padding: '9px 12px', textAlign: 'center', color: '#8B6E50' }}>{i + 1}</td>
                            <td style={{ padding: '9px 12px', fontWeight: 600, color: '#1A0C00' }}>{f.numeroFacture || `FAC-${String(i+1).padStart(3,'0')}`}</td>
                            <td style={{ padding: '9px 12px', color: '#8B6E50' }}>{f.periode || f.mois || '—'}</td>
                            <td style={{ padding: '9px 12px', color: '#8B6E50' }}>{f.echeance ? new Date(f.echeance).toLocaleDateString('fr-FR') : '—'}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#1A0C00' }}>{fcfa(ht)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#1A0C00' }}>{fcfa(tva)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#1A0C00' }}>{fcfa(ttc)}</td>
                            <td style={{ padding: '9px 12px' }}>
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                                    style={{ background: paid ? '#FFECDF' : '#FFFBEB', color: paid ? '#CC2402' : '#D97706' }}>
                                {paid ? 'PAYÉE' : 'EN ATTENTE'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table></div>
                )}
              </div>
            </div>

            {/* Section 3 — Récapitulatif fiscal */}
            <div>
              <div className="rounded-t-xl px-4 py-2.5" style={{ background: '#1A0C00' }}>
                <p className="text-white font-bold text-[12px] uppercase tracking-wider">3. Récapitulatif fiscal (SYSCOHADA / DGI-CI)</p>
              </div>
              <div className="rounded-b-xl overflow-hidden border border-t-0" style={{ borderColor: 'rgba(255,108,0,0.10)' }}>
                <div className="overflow-x-auto w-full"><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead style={{ background: '#F8FAFC' }}>
                    <tr>{['Désignation','Base HT','Taux TVA','Montant TVA','Total TTC'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Désignation' ? 'left' : 'right', fontWeight: 700, color: '#374151', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: '#fff' }}>
                      <td style={{ padding: '9px 12px', color: '#1A0C00' }}>Restauration collective B2B</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#1A0C00' }}>{fcfa(totalHT)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#8B6E50' }}>18 %</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#1A0C00' }}>{fcfa(totalTVA)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#1A0C00' }}>{fcfa(totalTTC)}</td>
                    </tr>
                    <tr style={{ background: '#F1F5F9', fontWeight: 700 }}>
                      <td style={{ padding: '9px 12px', color: '#1A0C00' }}>TOTAL GÉNÉRAL</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#1A0C00' }}>{fcfa(totalHT)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#8B6E50' }}>18 %</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#1A0C00' }}>{fcfa(totalTVA)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#FF3A03' }}>{fcfa(totalTTC)}</td>
                    </tr>
                  </tbody>
                </table></div>
              </div>
            </div>

            {/* Mentions légales */}
            <div className="rounded-lg p-4" style={{ background: '#F8FAFC', border: '1px solid rgba(0,0,0,0.06)' }}>
              <p className="text-[11px] italic" style={{ color: '#8B6E50' }}>
                Conformément au Système Comptable OHADA (SYSCOHADA Révisé) · TVA collectée au taux de 18%
                conformément au Code Général des Impôts de la Côte d'Ivoire — Article 339 CGI-CI.
              </p>
              <p className="text-[11px] mt-1.5 font-semibold" style={{ color: '#9CA3AF' }}>
                Document confidentiel · {userEmail || 'Gestionnaire B2B'} · Généré le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────
export default function B2BDashboard() {
  const { user, logout, syncUser } = useAuth();
  const navigate = useNavigate();
  const uid    = user?.id;
  const cached = readCache(uid);

  const [tab, setTab]               = useState('overview');
  // Bascule interne de l'onglet fusionné « Activité » (ex-Historique + Notifications).
  const [activiteView, setActiviteView] = useState('notifications');
  const [settingsTab, setSettingsTab] = useState('profil');
  const [sideOpen, setSideOpen]         = useState(false);
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [dashboard, setDashboard]   = useState(cached?.dashboard || null);
  const [compte, setCompte]         = useState(cached?.compte || null);
  const [collabs, setCollabs]       = useState(cached?.collabs || []);
  const [orders, setOrders]         = useState(cached?.orders || []);
  const [factures, setFactures]     = useState(cached?.factures || []);
  const [loading, setLoading]       = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [orderFilter, setOrderFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [profileForm, setProfileForm] = useState({ prenom: user?.prenom || '', nom: user?.nom || '', email: user?.email || '', telephone: user?.telephone || '' });
  const [profileMsg, setProfileMsg]   = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [notifications, setNotifications] = useState(() => loadNotifs(uid));
  const [highlightOrderId, setHighlightOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [avisForm, setAvisForm]           = useState({ note: 0, commentaire: '' });
  const [avisSubmitting, setAvisSubmitting] = useState(false);
  const [avisMsg, setAvisMsg]             = useState('');
  const [showWizard, setShowWizard]       = useState(false);
  const [showTour,   setShowTour]         = useState(false);
  const [auditLogs, setAuditLogs]         = useState([]);
  const [auditLoading, setAuditLoading]   = useState(false);
  const [downloading, setDownloading]       = useState(false);
  const [payingFacture, setPayingFacture]   = useState(null);
  const [viewingFacture, setViewingFacture] = useState(null);
  const [paymentBanner, setPaymentBanner]   = useState(null); // { type: 'success'|'cancelled', factureId }
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId]         = useState(null);
  const [deleteError, setDeleteError]       = useState('');
  const [editBudgetId, setEditBudgetId]     = useState(null);
  const [editBudgetVal, setEditBudgetVal]   = useState('');
  const [editBudgetSaving, setEditBudgetSaving] = useState(false);
  const [editBudgetError, setEditBudgetError]   = useState('');
  const [subs, setSubs]                     = useState([]);
  const [subSaving, setSubSaving]           = useState(false);
  const [showSubForm, setShowSubForm]       = useState(false);
  const [subForm, setSubForm]               = useState({ nom: '', frequence: 'HEBDO', nbRepas: 1, budgetRepas: '', notes: '' });
  const [subFormErr, setSubFormErr]         = useState('');
  const [viewingSyscohada, setViewingSyscohada] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const [dashR, collabR, ordersR, menuR, factR, plansR] = await Promise.allSettled([
        b2bAPI.getDashboard(),
        b2bAPI.getCollaborateurs(),
        b2bAPI.getOrders(),
        commandesService.getMyOrders(),
        b2bAPI.getFacturesMensuelles(),
        b2bAPI.getPlansRepas(),
      ]);
      const newDash    = dashR.status    === 'fulfilled' ? dashR.value.data           : dashboard;
      const newCollabs = collabR.status  === 'fulfilled' ? (collabR.value.data || []) : collabs;
      const b2bOrds    = ordersR.status  === 'fulfilled' ? (ordersR.value.data || []) : [];
      const menuOrds   = menuR.status    === 'fulfilled'
        ? (menuR.value.data || []).map(o => ({ ...o, _src: 'menu' })) : [];
      const merged     = [...b2bOrds, ...menuOrds].sort(
        (a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0),
      );
      const newFact    = factR.status  === 'fulfilled' ? (factR.value.data  || []) : factures;
      const newPlans   = plansR.status === 'fulfilled' ? (plansR.value.data || []) : subs;

      if (dashR.status    === 'fulfilled') setDashboard(newDash);
      if (collabR.status  === 'fulfilled') setCollabs(newCollabs);
      setOrders(merged);
      if (factR.status    === 'fulfilled') setFactures(newFact);
      if (plansR.status   === 'fulfilled') setSubs(newPlans);

      let newCompte = compte;
      try { const r = await b2bAPI.getCompte(); newCompte = r.data; setCompte(newCompte); } catch { /* no compte */ }

      writeCache(uid, { dashboard: newDash, collabs: newCollabs, orders: merged, factures: newFact, compte: newCompte });
    } catch {
      setError('Erreur de chargement. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [uid]);  

  useEffect(() => { loadData(!!readCache(uid)); }, [loadData, uid]);
  useEffect(() => {
    if (user) setProfileForm({ prenom: user.prenom || '', nom: user.nom || '', email: user.email || '', telephone: user.telephone || '' });
  }, [user?.prenom, user?.nom, user?.email, user?.telephone]);  

  useEffect(() => {
    if (!user) return;
    const socket = createCommandesSocket(user);
    const refresh = () => loadData(true);
    ['commande.creee','commande.nouvelle','commande.statut','commande.b2b.nouvelle','commande.b2b.statut']
      .forEach(ev => socket.on(ev, refresh));
    return () => { socket.disconnect(); };
  }, [user, loadData]);

  useEffect(() => {
    if (tab !== 'activite' || activiteView !== 'historique') return;
    setAuditLoading(true);
    b2bAPI.getAuditLogs()
      .then(res => setAuditLogs(Array.isArray(res.data) ? res.data : []))
      .catch(() => setAuditLogs([]))
      .finally(() => setAuditLoading(false));
  }, [tab, activiteView]);

  // Persist notifications whenever they change
  useEffect(() => {
    if (uid) saveNotifs(uid, notifications);
  }, [notifications, uid]);

  useEffect(() => {
    if (!user) return;
    const socket = createCommandesSocket(user);
    const handlers = {};
    ['commande.b2b.nouvelle','commande.b2b.statut','commande.creee','commande.statut',
     'paiement.confirme','facture.generee','collaborateur.ajoute'].forEach(ev => {
      const h = (data) => {
        const notif = buildNotifFromEvent(ev, data || {});
        setNotifications(prev => [notif, ...prev.slice(0, 49)]);
      };
      handlers[ev] = h;
      socket.on(ev, h);
    });
    return () => {
      Object.entries(handlers).forEach(([ev, h]) => socket.off(ev, h));
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (!loading && compte === null && uid && !localStorage.getItem(`b2b_onboarded_${uid}`)) {
      setShowWizard(true);
    } else if (!loading && uid && localStorage.getItem(`b2b_onboarded_${uid}`) && !localStorage.getItem(`tour_b2b_${uid}`)) {
      setShowTour(true);
    }
  }, [loading, compte, uid]);


  // Détection retour Novasend (?payment=success|cancelled&factureId=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment   = params.get('payment');
    const factureId = params.get('factureId');
    if (payment === 'success' || payment === 'cancelled') {
      setPaymentBanner({ type: payment, factureId });
      setTab('factures');
      // Rafraîchir les factures pour refléter le nouveau statut
      loadData(true);
      // Nettoyer l'URL sans recharger
      const clean = window.location.pathname;
      window.history.replaceState({}, '', clean);
      // Disparaître après 8s
      setTimeout(() => setPaymentBanner(null), 8000);
    }
  }, []);  

  const handleInvite = async (form) => {
    await b2bAPI.createCollaborateur({
      nom: form.nom, email: form.email, poste: form.poste,
      budgetMensuel: form.budgetMensuel ? parseFloat(form.budgetMensuel) : undefined,
    });
    await loadData(true);
  };

  const handleDeleteCollab = async (id) => {
    setDeletingId(id);
    setDeleteError('');
    try {
      await b2bAPI.deleteCollaborateur(id);
      setConfirmDeleteId(null);
      await loadData(true);
    } catch (e) {
      setDeleteError(e.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddSub = async () => {
    if (!subForm.nom.trim()) { setSubFormErr('Nom du plan requis'); return; }
    if (!subForm.budgetRepas || Number(subForm.budgetRepas) <= 0) { setSubFormErr('Budget par repas requis'); return; }
    setSubSaving(true);
    setSubFormErr('');
    try {
      const res = await b2bAPI.createPlanRepas({
        nom: subForm.nom.trim(),
        frequence: subForm.frequence,
        nbRepas: Number(subForm.nbRepas) || 1,
        budgetRepas: Number(subForm.budgetRepas),
        notes: subForm.notes.trim() || undefined,
      });
      setSubs(prev => [...prev, res.data]);
      setSubForm({ nom: '', frequence: 'HEBDO', nbRepas: 1, budgetRepas: '', notes: '' });
      setShowSubForm(false);
    } catch (err) {
      setSubFormErr(err?.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setSubSaving(false);
    }
  };

  const handleToggleSub = async (id) => {
    try {
      const res = await b2bAPI.togglePlanRepas(id);
      setSubs(prev => prev.map(s => s.id === id ? res.data : s));
    } catch { /* silently fail — UI stays unchanged */ }
  };

  const handleDeleteSub = async (id) => {
    try {
      await b2bAPI.deletePlanRepas(id);
      setSubs(prev => prev.filter(s => s.id !== id));
    } catch { /* silently fail */ }
  };

  const handleEditBudget = async (id) => {
    const val = Number(editBudgetVal);
    if (!editBudgetVal || isNaN(val) || val < 0) {
      setEditBudgetError('Montant invalide');
      return;
    }
    setEditBudgetSaving(true);
    setEditBudgetError('');
    try {
      await b2bAPI.updateCollaborateur(id, { limiteBudget: val });
      setEditBudgetId(null);
      setEditBudgetVal('');
      await loadData(true);
    } catch (e) {
      setEditBudgetError(e.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setEditBudgetSaving(false);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      const res = await authAPI.updateProfile(profileForm);
      const updatedUser = res?.data?.user || res?.data || { ...user, ...profileForm };
      syncUser(updatedUser);
      setProfileMsg('Profil mis à jour avec succès');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch {
      setProfileMsg('Erreur lors de la mise à jour');
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────────
  const activeOrders  = orders.filter(o => ACTIVE.includes(o.statut ?? o.status ?? ''));
  const doneOrders    = orders.filter(o => ['LIVREE','ANNULEE'].includes(o.statut ?? o.status ?? ''));
  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const text = [
      o.numero, o.restaurantNom, o.centreDeCout, o.centre, o.costCenter,
      o.statut, o.status,
    ].filter(Boolean).join(' ').toLowerCase();
    return text.includes(q);
  });
  const displayed = orderFilter === 'active'
    ? filteredOrders.filter(o => ACTIVE.includes(o.statut ?? o.status ?? ''))
    : orderFilter === 'done'
      ? filteredOrders.filter(o => ['LIVREE','ANNULEE'].includes(o.statut ?? o.status ?? ''))
      : filteredOrders;
  const monthlyExp    = dashboard?.monthlyExpenses || 0;
  const budgetTotal   = compte?.budgetMensuel || dashboard?.budgetMensuel || 0;
  const budgetPct     = budgetTotal > 0 ? Math.min(100, Math.round((monthlyExp / budgetTotal) * 100)) : 0;
  const isBlocked     = compte?.blocked === true;
  const prochainFactureDisplay = compte?.prochainFacture
    ? new Date(compte.prochainFacture).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;
  const unpaidInvoices = factures.filter(f => f.statut !== 'PAYEE' && f.statut !== 'paid').length;
  const centerCounts  = orders.reduce((acc, o) => {
    const key = o.centreDeCout || o.centre || o.costCenter || 'Autres';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const unreadCount   = notifications.filter(n => !n.read).length;
  const markAllRead   = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  // Export SYSCOHADA uniquement le dernier jour du mois
  const todayDate = new Date();
  const lastDayOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
  const isLastDayOfMonth = todayDate.getDate() === lastDayOfMonth.getDate();
  const daysUntilExport = lastDayOfMonth.getDate() - todayDate.getDate();
  const lastDayDisplay = lastDayOfMonth.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

  const handleNotifClick = (notif) => {
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    if (notif.type === 'payment' || notif.type === 'invoice') {
      setTab('factures');
    } else if (notif.orderId || notif.type === 'new_order' || notif.type === 'status') {
      setTab('orders');
      if (notif.orderId) {
        setHighlightOrderId(notif.orderId);
        setTimeout(() => setHighlightOrderId(null), 3000);
      }
    } else if (notif.type === 'team') {
      setTab('collaborateurs');
    }
    setSideOpen(false);
  };

  const downloadSyscohadaReport = async () => {
    setDownloading(true);
    try {
      const blob = buildSyscohadaBlob(collabs, factures, compte, monthlyExp);
      downloadBlob(blob, `syscohada-${new Date().toISOString().slice(0, 7)}.pdf`);
    } finally { setDownloading(false); }
  };

  /* Historique + Notifications fusionnés en un seul onglet « Activité » (bascule
     interne, cf. activiteView) : deux flux d'événements dans le temps qui
     n'avaient pas besoin de deux entrées de nav séparées. Le sous-onglet
     Rapports de Paramètres a été retiré pour la même raison : doublon exact
     des boutons SYSCOHADA de l'onglet Facturation. */
  const NAV = [
    { key: 'overview',       label: 'Vue d\'ensemble', icon: LayoutDashboard },
    { key: 'orders',         label: 'Commandes',       icon: ShoppingBag,  badge: activeOrders.length },
    { key: 'collaborateurs', label: 'Équipe',           icon: Users,        badge: collabs.length },
    { key: 'abonnements',    label: 'Abonnements',     icon: CalendarDays },
    { key: 'factures',       label: 'Facturation',     icon: FileText,     badge: unpaidInvoices },
    { key: 'activite',       label: 'Activité',        icon: Activity,     badge: unreadCount },
    { key: 'settings',       label: 'Paramètres',      icon: Settings },
  ];

  const goTo = (key) => { setTab(key); setSideOpen(false); };

  // ── Sidebar — blanc avec accents orange (style GerantLayout) ─────────────────
  const Sidebar = ({ mobile = false }) => {
    const col = sideCollapsed && !mobile;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FFFFFF' }}>

        {/* Brand */}
        <div style={{ padding: col ? '20px 0' : '20px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          {!col ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: ORANGE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                  <UtensilsCrossed style={{ width: 18, height: 18, color: '#fff' }} />
                  {unreadCount > 0 && (
                    <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, background: RED, color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', boxShadow: '0 0 0 2px #fff' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>Espace B2B</p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#1F2937', margin: 0, lineHeight: 1.2 }}>Resto d'ici</p>
                </div>
                {mobile && (
                  <button onClick={() => setSideOpen(false)} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8B6E50', flexShrink: 0 }}>
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                )}
              </div>
              {compte?.raisonSociale && (
                <div style={{ background: 'rgba(234,60,12,0.07)', borderRadius: 8, padding: '6px 10px' }}>
                  <p style={{ fontSize: 10, color: '#9CA3AF', margin: '0 0 1px' }}>Entreprise active</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{compte.raisonSociale}</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: ORANGE, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <UtensilsCrossed style={{ width: 18, height: 18, color: '#fff' }} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, background: RED, color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', boxShadow: '0 0 0 2px #fff' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflowY: 'auto' }}>
          {NAV.map(item => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button key={item.key} onClick={() => goTo(item.key)}
                title={col ? item.label : undefined}
                data-tour={item.key === 'collaborateurs' ? 'b2b-collab-tab' : item.key === 'overview' ? 'b2b-overview-tab' : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: col ? 0 : 12,
                  justifyContent: col ? 'center' : 'flex-start',
                  width: '100%', padding: col ? '12px' : '10px 12px',
                  border: 'none', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  background: active ? ORANGE : 'transparent',
                  boxShadow: active ? `0 4px 14px ${ORANGE}4D` : 'none',
                  transition: 'all 0.18s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(234,60,12,0.08)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(255,255,255,0.22)' : 'rgba(234,60,12,0.10)', color: active ? '#fff' : ORANGE, transition: 'all 0.18s', position: 'relative' }}>
                  <Icon style={{ width: 16, height: 16 }} />
                  {(item.badge ?? 0) > 0 && col && (
                    <span style={{ position: 'absolute', top: -3, right: -3, minWidth: 14, height: 14, borderRadius: 7, background: item.key === 'factures' ? RED : ORANGE, color: '#fff', fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px', boxShadow: '0 0 0 2px #fff' }}>
                      {item.badge}
                    </span>
                  )}
                </span>
                {!col && (
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: active ? '#fff' : '#374151', lineHeight: 1.3 }}>{item.label}</span>
                    <span style={{ display: 'block', fontSize: 10, color: active ? 'rgba(255,255,255,0.70)' : '#9CA3AF', marginTop: 1 }}>
                      {item.key === 'overview' && 'Pilotage global'}
                      {item.key === 'orders' && 'Commandes B2B'}
                      {item.key === 'collaborateurs' && 'Gestion équipe'}
                      {item.key === 'abonnements' && 'Repas récurrents'}
                      {item.key === 'factures' && 'SYSCOHADA'}
                      {item.key === 'activite' && 'Notifications & audit'}
                      {item.key === 'settings' && 'Réglages compte'}
                    </span>
                  </span>
                )}
                {!col && (item.badge ?? 0) > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 99, background: item.key === 'factures' ? `${RED}22` : `${ORANGE}22`, color: item.key === 'factures' ? RED : ORANGE, flexShrink: 0 }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User / logout */}
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: col ? '12px 0' : '12px 10px' }}>
          {!col && (
            <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 9, padding: '8px 12px', marginBottom: 8 }}>
              <p style={{ fontSize: 10, color: '#9CA3AF', margin: '0 0 2px' }}>Connecté en tant que</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.nom}</p>
              {compte?.raisonSociale && <p style={{ fontSize: 10, color: '#9CA3AF', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{compte.raisonSociale}</p>}
            </div>
          )}
          <button onClick={() => setShowLogoutModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: col ? 0 : 10, justifyContent: col ? 'center' : 'flex-start', width: '100%', padding: col ? '10px' : '10px 12px', border: 'none', borderRadius: 9, cursor: 'pointer', background: 'transparent', color: '#9CA3AF', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = '#6B7280'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9CA3AF'; }}>
            <LogOut style={{ width: 16, height: 16, flexShrink: 0 }} />
            {!col && <span style={{ fontSize: 12, fontWeight: 600 }}>Déconnexion</span>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>

      {/* Desktop sidebar — blanc, collapsible */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 h-full transition-all duration-300 ${sideCollapsed ? 'w-20' : 'w-64'}`}
        style={{ background: '#FFFFFF', borderRight: '1px solid rgba(0,0,0,0.07)', boxShadow: '4px 0 20px rgba(0,0,0,0.05)', position: 'relative', zIndex: 10 }}
      >
        {/* Bouton collapse */}
        <button
          onClick={() => setSideCollapsed(c => !c)}
          className="absolute -right-3 top-6 flex h-7 w-7 items-center justify-center rounded-full text-white shadow-md transition"
          style={{ background: ORANGE, border: 'none', cursor: 'pointer', zIndex: 20 }}
          aria-label={sideCollapsed ? 'Développer' : 'Réduire'}
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${sideCollapsed ? '' : 'rotate-180'}`} />
        </button>
        <Sidebar />
      </aside>

      {/* Overlay mobile */}
      {sideOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setSideOpen(false)} />
      )}

      {/* Sidebar mobile — slide depuis la gauche */}
      {sideOpen && (
        <aside className="lg:hidden fixed left-0 top-0 z-50 h-full w-64"
          style={{ background: '#FFFFFF', boxShadow: '4px 0 24px rgba(0,0,0,0.12)' }}>
          <Sidebar mobile />
        </aside>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar — blanc */}
        <header className="shrink-0" style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${ORANGE} 0%, #FFB800 50%, ${ORANGE} 100%)`, pointerEvents: 'none' }} />
          <div className="h-16 px-4 lg:px-6 flex items-center gap-4">
            {/* Hamburger mobile */}
            <button className="lg:hidden p-2 rounded-lg" onClick={() => setSideOpen(true)}
              style={{ background: `${ORANGE}12`, border: `1px solid ${ORANGE}22`, color: ORANGE, cursor: 'pointer' }}>
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#9CA3AF' }}>
                Tableau de bord entreprise
              </p>
              <h1 className="text-base font-bold mt-0.5 leading-tight" style={{ color: TEXT }}>
                Bonjour, {user?.prenom || user?.nom?.split(' ')[0] || 'Gestionnaire'} 👋
              </h1>
            </div>

            {/* Search */}
            <div className="hidden md:flex flex-1 max-w-sm relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#9CA3AF' }} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher commande, centre de coûts…"
                className="w-full rounded-lg border pl-9 pr-8 py-2 text-sm outline-none transition"
                style={{ borderColor: searchQuery ? ORANGE : '#E5E7EB', background: searchQuery ? `${ORANGE}08` : '#F9FAFB', color: TEXT, boxShadow: searchQuery ? `0 0 0 3px ${ORANGE}25` : 'none' }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: '#E5E7EB', color: '#9CA3AF', border: 'none', cursor: 'pointer' }}>
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => loadData(true)} disabled={refreshing}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:opacity-70"
                style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#6B7280', cursor: 'pointer' }}>
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => { setActiviteView('notifications'); goTo('activite'); }}
                className="relative w-8 h-8 rounded-lg flex items-center justify-center transition hover:opacity-70"
                style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#6B7280', cursor: 'pointer' }}>
                <Bell className="w-3.5 h-3.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                    style={{ background: RED }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {/* Avatar profil */}
              <button
                onClick={() => setShowProfile(true)}
                className="flex items-center rounded-full transition-all"
                style={{ padding: '4px 10px 4px 4px', border: `1.5px solid ${ORANGE}44`, background: `${ORANGE}10`, cursor: 'pointer', gap: 6 }}
              >
                <Avatar name={[user?.prenom, user?.nom].filter(Boolean).join(' ') || user?.nom || 'B2B'} size={30} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
                  <span className="text-[10px] font-bold hidden sm:block" style={{ color: TEXT, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {[user?.prenom, user?.nom].filter(Boolean).join(' ') || user?.nom || 'Gestionnaire'}
                  </span>
                  <span className="text-[9px] hidden sm:flex items-center gap-1" style={{ color: ORANGE }}>
                    <Shield className="w-2.5 h-2.5" /> Mon profil
                  </span>
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">

          {/* ── BANNIÈRE EN ATTENTE DE VÉRIFICATION PAR L'ADMIN ── */}
          {compte && (compte.statutValidation === 'EN_ATTENTE' || compte.actif === false) && (
            <div className="mb-6 p-5 rounded-lg border"
              style={{ background: '#FFFBEB', borderColor: '#FDE68A', boxShadow: '0 4px 16px rgba(245,158,11,0.1)' }}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#FEF3C7' }}>
                  <Clock className="w-5 h-5 text-[#D97706] animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-[#92400E]">Compte en cours de vérification par l'administration</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#FEF3C7] text-[#D97706]">
                      Inactif temporairement
                    </span>
                  </div>
                  <p className="text-xs text-[#B45309] mt-1 leading-relaxed">
                    Votre compte entreprise <strong>{compte.raisonSociale}</strong> est bien enregistré. L'équipe d'administration Resto d'ici vérifie actuellement vos informations légales (RCCM & NIF) pour valider et activer votre compte sous 24h.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-[#92400E] font-semibold">
                    <span>🏢 RCCM : {compte.numeroRCCM || 'En cours'}</span>
                    <span>📑 NIF : {compte.numeroContribuable || 'En cours'}</span>
                    <span className="text-[#D97706]">📞 Support : +225 01 01 50 00 48</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── BANNIÈRE COMPTE REJETÉ ── */}
          {compte && compte.statutValidation === 'REJETE' && (
            <div className="mb-6 p-5 rounded-lg border"
              style={{ background: '#FEF2F2', borderColor: '#FCA5A5', boxShadow: '0 4px 16px rgba(239,68,68,0.1)' }}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#FEE2E2' }}>
                  <AlertCircle className="w-5 h-5 text-[#DC2626]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-[#991B1B]">Dossier Entreprise non validé</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#FEE2E2] text-[#DC2626]">
                      Inactif
                    </span>
                  </div>
                  <p className="text-xs text-[#991B1B] mt-1 leading-relaxed">
                    Les informations légales fournies lors de l'inscription n'ont pas pu être validées par l'administration. Veuillez contacter notre service support pour corriger vos pièces justificatives.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg border"
              style={{ background: RED_L, borderColor: '#FECACA' }}>
              <AlertCircle className="w-4 h-4 shrink-0" style={{ color: RED }} />
              <p className="flex-1 text-sm" style={{ color: '#B91C1C' }}>{error}</p>
              <button onClick={() => loadData(false)} className="text-xs font-semibold underline" style={{ color: RED }}>
                Réessayer
              </button>
            </div>
          )}

          {/* Bannière retour Novasend */}
          {paymentBanner && (
            <div className="mb-4 flex items-center gap-3 px-5 py-4 rounded-lg border"
              style={{
                background: paymentBanner.type === 'success' ? GREEN_L : AMBER_L,
                borderColor: paymentBanner.type === 'success' ? '#FFE4CC' : '#FDE68A',
              }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: paymentBanner.type === 'success' ? GREEN : AMBER }}>
                {paymentBanner.type === 'success'
                  ? <CheckCircle className="w-5 h-5 text-white" />
                  : <AlertCircle className="w-5 h-5 text-white" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold"
                  style={{ color: paymentBanner.type === 'success' ? GREEN_D : AMBER }}>
                  {paymentBanner.type === 'success'
                    ? 'Paiement confirmé — votre facture est réglée'
                    : 'Paiement annulé — la facture reste en attente'}
                </p>
                <p className="text-[11px] mt-0.5"
                  style={{ color: paymentBanner.type === 'success' ? '#CC2402' : '#92400E' }}>
                  {paymentBanner.type === 'success'
                    ? 'Le reçu PDF est maintenant disponible en téléchargement'
                    : 'Vous pouvez réessayer le paiement depuis l\'onglet Facturation'}
                </p>
              </div>
              <button onClick={() => setPaymentBanner(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.06)' }}>
                <X className="w-3.5 h-3.5" style={{ color: paymentBanner.type === 'success' ? GREEN_D : AMBER }} />
              </button>
            </div>
          )}

          {/* ══ CONTENU D'ONGLET ════════════════════════════════════════════ */}
          <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
          {/* ══ VUE D'ENSEMBLE — BENTO GRID ════════════════════════════════════ */}
          {tab === 'overview' && (
            <OverviewSection
              loading={loading} monthlyExp={monthlyExp} budgetPct={budgetPct} activeOrders={activeOrders} orders={orders} collabs={collabs} unpaidInvoices={unpaidInvoices}
              isBlocked={isBlocked} goTo={goTo} budgetTotal={budgetTotal} prochainFactureDisplay={prochainFactureDisplay} navigate={navigate}
              doneOrders={doneOrders} orderFilter={orderFilter} setOrderFilter={setOrderFilter} displayed={displayed}
              factures={factures} setViewingSyscohada={setViewingSyscohada} isLastDayOfMonth={isLastDayOfMonth} downloadSyscohadaReport={downloadSyscohadaReport} downloading={downloading}
              lastDayDisplay={lastDayDisplay} daysUntilExport={daysUntilExport} centerCounts={centerCounts}
            />
          )}

          {/* ══ COMMANDES ════════════════════════════════════════════════════════ */}
          {tab === 'orders' && (
            <OrdersSection
              activeOrders={activeOrders} orders={orders} doneOrders={doneOrders} orderFilter={orderFilter} setOrderFilter={setOrderFilter} loading={loading}
              displayed={displayed} highlightOrderId={highlightOrderId} navigate={navigate}
            />
          )}

          {/* ══ ÉQUIPE ═══════════════════════════════════════════════════════════ */}
          {tab === 'collaborateurs' && (
            <CollaborateursSection
              collabs={collabs} setShowInvite={setShowInvite} loading={loading}
              confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} editBudgetId={editBudgetId} setEditBudgetId={setEditBudgetId}
              editBudgetVal={editBudgetVal} setEditBudgetVal={setEditBudgetVal} editBudgetError={editBudgetError} setEditBudgetError={setEditBudgetError} editBudgetSaving={editBudgetSaving}
              handleEditBudget={handleEditBudget} deletingId={deletingId} deleteError={deleteError} setDeleteError={setDeleteError} handleDeleteCollab={handleDeleteCollab}
            />
          )}

          {/* ══ ABONNEMENTS ══════════════════════════════════════════════════════ */}
          {tab === 'abonnements' && (
            <AbonnementsSection
              subs={subs} setShowSubForm={setShowSubForm} setSubFormErr={setSubFormErr} showSubForm={showSubForm} subForm={subForm} setSubForm={setSubForm}
              subFormErr={subFormErr} handleAddSub={handleAddSub} subSaving={subSaving} handleToggleSub={handleToggleSub} handleDeleteSub={handleDeleteSub}
            />
          )}

          {/* ══ FACTURATION ══════════════════════════════════════════════════════ */}
          {tab === 'factures' && (
            <FacturesSection
              setViewingSyscohada={setViewingSyscohada} isLastDayOfMonth={isLastDayOfMonth} downloadSyscohadaReport={downloadSyscohadaReport} downloading={downloading}
              lastDayDisplay={lastDayDisplay} factures={factures} loading={loading} loadData={loadData} setViewingFacture={setViewingFacture} setPayingFacture={setPayingFacture}
            />
          )}

          {/* ══ ACTIVITÉ (Notifications + Historique/Audit fusionnés) ══════════════ */}
          {tab === 'activite' && (
            <ActiviteSection
              unreadCount={unreadCount} activiteView={activiteView} setActiviteView={setActiviteView}
              setAuditLoading={setAuditLoading} setAuditLogs={setAuditLogs} auditLoading={auditLoading} auditLogs={auditLogs}
              notifications={notifications} markAllRead={markAllRead} setNotifications={setNotifications} handleNotifClick={handleNotifClick}
            />
          )}

          {/* ══ PARAMÈTRES ═══════════════════════════════════════════════════════ */}
          {tab === 'settings' && (
            <SettingsSection
              setShowLogoutModal={setShowLogoutModal} settingsTab={settingsTab} setSettingsTab={setSettingsTab} user={user}
              handleProfileSave={handleProfileSave} profileForm={profileForm} setProfileForm={setProfileForm} profileMsg={profileMsg}
              compte={compte} collabs={collabs} setTab={setTab}
            />
          )}

          </motion.div>
          </AnimatePresence>

        </main>
      </div>

      {/* ── SYSCOHADA Viewer */}
      {viewingSyscohada && (
        <SyscohadaViewerModal
          collabs={collabs}
          factures={factures}
          compte={compte}
          monthlyExp={monthlyExp}
          isLastDayOfMonth={isLastDayOfMonth}
          lastDayDisplay={lastDayDisplay}
          onClose={() => setViewingSyscohada(false)}
          onDownload={downloadSyscohadaReport}
          downloading={downloading}
          userEmail={user?.email}
        />
      )}

      {/* ── Invite modal */}
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onSave={handleInvite} />}

      {/* ── View facture modal (read-only / téléchargement si payée) */}
      {viewingFacture && (
        <ViewFactureModal
          facture={viewingFacture}
          onClose={() => setViewingFacture(null)}
          onDownload={() => {
            const blob = buildFactureBlob(viewingFacture, compte);
            downloadBlob(blob, `facture-${viewingFacture.numeroFacture || viewingFacture.id?.slice(0,8) || 'b2b'}.pdf`);
          }}
        />
      )}

      {/* ── Pay modal */}
      {payingFacture && (
        <PayModal
          facture={payingFacture}
          onClose={() => setPayingFacture(null)}
          onPaid={() => { setPayingFacture(null); loadData(true); }}
        />
      )}

      {/* ── Profile drawer */}
      {showProfile && (
        <B2BProfileDrawer
          user={user}
          onClose={() => setShowProfile(false)}
          profileForm={profileForm}
          setProfileForm={setProfileForm}
          onSave={handleProfileSave}
          profileMsg={profileMsg}
        />
      )}

      {/* ── Logout modal — rouge (action risquée) */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setShowLogoutModal(false)}>
          <div className="rounded-lg p-6 w-full max-w-sm" style={{ background: CARD, boxShadow: SH3 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: RED_L }}>
                <LogOut className="w-6 h-6" style={{ color: RED }} />
              </div>
              <div>
                <p className="text-base font-bold" style={{ color: TEXT }}>Déconnexion</p>
                <p className="text-xs" style={{ color: MUTED }}>Vous serez redirigé vers la connexion.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-semibold transition hover:opacity-80"
                style={{ borderColor: BORDER, color: TEXT, background: BG }}>
                Annuler
              </button>
              <button onClick={() => { logout?.(); navigate('/login'); setShowLogoutModal(false); }}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition hover:opacity-90"
                style={{ background: RED }}>
                Déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Order detail modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setSelectedOrder(null)}>
          <div className="rounded-lg w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
            style={{ background: CARD, boxShadow: SH3 }}>
            <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
              style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
              <div>
                <p className="text-sm font-bold" style={{ color: TEXT }}>{selectedOrder.numero}</p>
                <StatusPill statut={selectedOrder.statut} />
              </div>
              <button onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: BG, color: MUTED }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="rounded-lg p-4 space-y-2" style={{ background: BG }}>
                <div className="flex items-center gap-2 text-[13px]" style={{ color: TEXT }}>
                  <CalendarDays className="w-4 h-4 shrink-0" style={{ color: ORANGE }} />
                  <span>
                    <strong>Livraison :</strong>{' '}
                    {selectedOrder.dateLivraison
                      ? new Date(selectedOrder.dateLivraison).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                      : '—'}
                    {selectedOrder.heureLivraison ? ` à ${selectedOrder.heureLivraison}` : ''}
                  </span>
                </div>
                {selectedOrder.lieuLivraison && (
                  <div className="flex items-center gap-2 text-[13px]" style={{ color: TEXT }}>
                    <MapPin className="w-4 h-4 shrink-0" style={{ color: ORANGE }} />
                    <span>{selectedOrder.lieuLivraison}</span>
                  </div>
                )}
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: FAINT }}>
                  Suivi commande
                </p>
                <div className="flex items-center gap-1">
                  {['EN_ATTENTE','CONFIRMEE','EN_PREPARATION','LIVREE'].map((st, i, arr) => {
                    const statuts = ['EN_ATTENTE','RECUE','CONFIRMEE','EN_PREP','EN_PREPARATION','PRETE','EN_LIVRAISON','LIVREE'];
                    const done = statuts.indexOf(selectedOrder.statut) >= statuts.indexOf(st);
                    const STEP_LABELS = { EN_ATTENTE: 'Reçue', CONFIRMEE: 'Confirmée', EN_PREPARATION: 'En prépa.', LIVREE: 'Livrée' };
                    return (
                      <div key={st} className="flex items-center flex-1">
                        <div className="flex flex-col items-center gap-1 flex-1">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                            style={{ background: done ? GREEN : BORDER, color: done ? '#fff' : FAINT }}>
                            {done ? '✓' : i + 1}
                          </div>
                          <p className="text-[9px] text-center leading-tight" style={{ color: FAINT }}>{STEP_LABELS[st]}</p>
                        </div>
                        {i < arr.length - 1 && (
                          <div className="h-0.5 flex-1 mx-1 mb-4 rounded-full"
                            style={{ background: done ? GREEN : BORDER }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedOrder.lignes?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: FAINT }}>Détail</p>
                  <div className="rounded-lg overflow-hidden border" style={{ borderColor: BORDER }}>
                    {selectedOrder.lignes.map((l, i) => (
                      <div key={l.id || i} className="flex items-center justify-between px-4 py-3"
                        style={{ borderBottom: i < selectedOrder.lignes.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                        <p className="text-[13px] font-medium truncate" style={{ color: TEXT }}>{l.nomArticle || l.articleId}</p>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-[11px]" style={{ color: FAINT }}>×{l.quantite}</p>
                          <p className="text-[13px] font-bold" style={{ color: TEXT }}>{formatFCFA(l.quantite * l.prixUnitaire)}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-4 py-3" style={{ background: BG }}>
                      <span className="text-[13px] font-bold" style={{ color: TEXT }}>Total</span>
                      <span className="text-[13px] font-bold" style={{ color: ORANGE }}>{formatFCFA(selectedOrder.totalEstime)}</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedOrder.statut === 'LIVREE' && !selectedOrder.avisNote && (
                <div className="rounded-lg border p-4" style={{ borderColor: BORDER }}>
                  <p className="text-[13px] font-bold mb-3" style={{ color: TEXT }}>Laisser un avis</p>
                  <div className="flex gap-2 mb-3">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setAvisForm(p => ({ ...p, note: n }))}>
                        <Star className="w-6 h-6" strokeWidth={1.5}
                          fill={avisForm.note >= n ? '#F59E0B' : 'none'}
                          color={avisForm.note >= n ? '#F59E0B' : BORDER} />
                      </button>
                    ))}
                  </div>
                  <textarea value={avisForm.commentaire}
                    onChange={e => setAvisForm(p => ({ ...p, commentaire: e.target.value }))}
                    placeholder="Commentaire (optionnel)" rows={2}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none mb-3"
                    style={{ background: BG, border: `1.5px solid ${BORDER}`, color: TEXT }} />
                  {avisMsg && (
                    <p className="text-xs font-medium mb-2"
                      style={{ color: avisMsg.includes('Erreur') ? RED : GREEN }}>
                      {avisMsg}
                    </p>
                  )}
                  <button disabled={avisForm.note === 0 || avisSubmitting}
                    onClick={async () => {
                      if (avisForm.note === 0) return;
                      setAvisSubmitting(true);
                      try {
                        await b2bAPI.submitAvis(selectedOrder.id, { note: avisForm.note, commentaire: avisForm.commentaire });
                        setAvisMsg('Avis enregistré, merci !');
                        setSelectedOrder(o => ({ ...o, avisNote: avisForm.note }));
                        setAvisForm({ note: 0, commentaire: '' });
                      } catch (e) { setAvisMsg(e.response?.data?.message || 'Erreur'); }
                      finally { setAvisSubmitting(false); }
                    }}
                    className="w-full py-2.5 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2 transition"
                    style={{ background: ORANGE, opacity: avisForm.note === 0 || avisSubmitting ? 0.5 : 1 }}>
                    {avisSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" fill="white" />}
                    Envoyer l'avis
                  </button>
                </div>
              )}
              {selectedOrder.avisNote && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg" style={{ background: GREEN_L }}>
                  <CheckCircle className="w-4 h-4 shrink-0" style={{ color: GREEN }} />
                  <p className="text-sm font-semibold" style={{ color: GREEN_D }}>
                    Avis soumis — {selectedOrder.avisNote}/5 étoiles
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Feature tour — première connexion post-setup ── */}
      {showTour && (() => {
        const uid = user?.id;
        const tourKey = uid ? `tour_b2b_${uid}` : null;
        const B2B_TOUR_STEPS = [
          {
            title: 'Bienvenue dans votre espace B2B !',
            body: 'Votre compte entreprise est prêt. Faites un tour rapide pour découvrir les fonctionnalités clés.',
          },
          {
            selector: '[data-tour="b2b-overview-tab"]',
            title: 'Tableau de bord',
            body: 'Consultez en temps réel vos dépenses, commandes en cours et solde disponible pour le mois.',
          },
          {
            selector: '[data-tour="b2b-collab-tab"]',
            title: 'Gestion de l\'équipe',
            body: 'Invitez vos collaborateurs pour qu\'ils puissent commander sous votre compte entreprise avec un budget maîtrisé.',
            onBefore: () => setTab('overview'),
          },
          {
            selector: '[data-tour="b2b-invite-btn"]',
            title: 'Ajouter un collaborateur',
            body: 'Cliquez ici pour inviter un collaborateur par email. Définissez son budget mensuel et suivez ses dépenses.',
            onBefore: () => setTab('collaborateurs'),
          },
          {
            title: 'Vous êtes prêt !',
            body: 'Explorez les autres sections : commandes, factures, et paramètres de votre compte depuis le menu de gauche.',
          },
        ];
        return (
          <OnboardingTour
            steps={B2B_TOUR_STEPS}
            accentColor="#FF3A03"
            storageKey={tourKey}
            onComplete={() => setShowTour(false)}
            onSkip={() => setShowTour(false)}
          />
        );
      })()}

      {/* ── Onboarding wizard */}
      {showWizard && (
        <B2BOnboardingWizard user={user}
          onComplete={(action) => {
            if (uid) localStorage.setItem(`b2b_onboarded_${uid}`, '1');
            setShowWizard(false);
            loadData(true);
            if (action === 'order') navigate('/b2b/order');
            else if (action === 'invite') setShowInvite(true);
          }} />
      )}
    </div>
  );
}
