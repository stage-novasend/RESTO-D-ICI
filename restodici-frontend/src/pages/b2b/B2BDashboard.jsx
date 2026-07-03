import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, Users, FileText, Settings,
  Plus, X, RefreshCw, AlertCircle, UtensilsCrossed, Download,
  CalendarDays, Bell, CheckCircle, Trash2, Send, Search,
  Menu, LogOut, Star, MapPin, Activity, ChevronRight, Shield,
  Package, CreditCard, UserPlus, TrendingUp, Clock, Pencil, Check, Eye,
} from 'lucide-react';
import { b2bAPI, authAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { createCommandesSocket, commandesService } from '../../services/commandes.service';
import SecurityPanel from '../../components/security/SecurityPanel';
import { formatFCFA } from '../../utils/formatters';
import B2BOnboardingWizard from './B2BOnboardingWizard';
import OnboardingTour from '../../components/onboarding/OnboardingTour';
import { buildSyscohadaBlob, buildFactureBlob } from '../../utils/syscohada-pdf';

// ── Design tokens ──────────────────────────────────────────────────────────────
const BG       = '#F5F6F8';      // fond principal
const CARD     = '#FFFFFF';
const NAVY     = '#0B4A33';      // sidebar & header — vert forêt
const NAVY2    = '#155C40';      // secondary dark green
const TEXT     = '#111827';
const MUTED    = '#6B7280';
const FAINT    = '#6B7280';
const BORDER   = 'rgba(0,0,0,0.07)';

// Couleurs sémantiques
const ORANGE   = '#EA580C';      // CTA principal standard
const ORANGE_L = '#FFF0DF';      // fond orange léger
const ORANGE_D = '#C2410C';      // orange foncé hover

const GREEN    = '#16A34A';      // exports PDF / succès / confirmé
const GREEN_L  = '#DCFCE7';      // fond vert léger
const GREEN_D  = '#15803D';      // vert foncé hover

const RED      = '#DC2626';      // actions risquées (supprimer, déconnexion, bloquer)
const RED_L    = '#FEF2F2';      // fond rouge léger

const AMBER    = '#D97706';      // alertes, en attente
const AMBER_L  = '#FFFBEB';      // fond ambre léger

const SH  = '0 1px 3px rgba(15,23,42,0.07),0 1px 2px rgba(15,23,42,0.04)';
const SH2 = '0 4px 16px rgba(15,23,42,0.10),0 2px 4px rgba(15,23,42,0.06)';
const SH3 = '0 20px 40px rgba(15,23,42,0.15),0 4px 8px rgba(15,23,42,0.06)';

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
  RECUE:          { label: 'Reçue',          color: '#2563EB', bg: '#EFF6FF', dot: '#60A5FA' },
  CONFIRMEE:      { label: 'Confirmée',      color: GREEN,    bg: GREEN_L,  dot: '#34D399' },
  EN_PREP:        { label: 'En préparation', color: AMBER,    bg: AMBER_L,  dot: '#FBBF24' },
  EN_PREPARATION: { label: 'En préparation', color: AMBER,    bg: AMBER_L,  dot: '#FBBF24' },
  PRETE:          { label: 'Prête',          color: GREEN,    bg: GREEN_L,  dot: '#34D399' },
  EN_LIVRAISON:   { label: 'En livraison',   color: '#7C3AED', bg: '#F5F3FF', dot: '#A78BFA' },
  LIVREE:         { label: 'Livrée',         color: GREEN,    bg: GREEN_L,  dot: '#34D399' },
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

// ── Abonnements helpers ────────────────────────────────────────────────────────
const SUBS_KEY = (cid) => cid ? `b2b_subs:${cid}` : 'b2b_subs';
const loadSubs = (cid) => {
  try {
    const raw = localStorage.getItem(SUBS_KEY(cid));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};
const saveSubs = (cid, subs) => {
  try { localStorage.setItem(SUBS_KEY(cid), JSON.stringify(subs)); } catch { /* ignore */ }
};
const nextDelivery = (freq) => {
  const d = new Date();
  if (freq === 'HEBDO') d.setDate(d.getDate() + (7 - d.getDay() + 1) % 7 || 7);
  else d.setMonth(d.getMonth() + 1, 1);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

// Maps event type to { icon, label, color }
const NOTIF_TYPES = {
  'commande.creee':       { type: 'new_order',    label: 'Nouvelle commande',         color: '#2563EB', iconBg: '#EFF6FF' },
  'commande.nouvelle':    { type: 'new_order',    label: 'Nouvelle commande',         color: '#2563EB', iconBg: '#EFF6FF' },
  'commande.b2b.nouvelle':{ type: 'new_order',    label: 'Commande B2B créée',        color: '#2563EB', iconBg: '#EFF6FF' },
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
function Avatar({ name = '', size = 32 }) {
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

function StatusPill({ statut }) {
  const s = STATUS[statut] || { label: statut, color: '#6B7280', bg: '#F3F4F6', dot: '#D1D5DB' };
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

function BudgetBar({ spent, budget }) {
  if (!budget) return null;
  const pct = Math.min(100, Math.round((spent / budget) * 100));
  const color = pct >= 90 ? '#DC2626' : pct >= 70 ? '#D97706' : '#16A34A';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280' }}>Budget mensuel</span>
        <span style={{ fontSize: 11, fontWeight: 800, color }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 99, width: `${pct}%`,
          background: pct >= 90
            ? 'linear-gradient(90deg, #EF4444, #DC2626)'
            : pct >= 70
            ? 'linear-gradient(90deg, #F59E0B, #D97706)'
            : 'linear-gradient(90deg, #22C55E, #16A34A)',
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
      <div className="rounded-2xl w-full max-w-sm overflow-hidden" style={{ background: CARD, boxShadow: SH3 }}>

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
            <button onClick={onClose} className="mt-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
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
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition"
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
      <div className="rounded-3xl w-full max-w-lg overflow-hidden"
        style={{ background: '#FFFFFF', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        onContextMenu={e => e.preventDefault()}>

        {/* Header */}
        <div className="relative overflow-hidden px-7 py-6 flex items-center justify-between"
          style={{
            background: isPaid
              ? `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_D} 100%)`
              : `linear-gradient(135deg, #0F172A 0%, #1E293B 100%)`,
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
            <div className="relative space-y-0 z-10 rounded-2xl overflow-hidden border"
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
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white transition hover:opacity-90"
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
      <div className="rounded-3xl w-full max-w-md overflow-hidden" style={{ background: CARD, boxShadow: SH3 }}>

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
                className="w-full py-3 rounded-xl text-sm font-bold text-white"
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
                  className="flex-1 py-3 rounded-xl text-sm font-semibold border"
                  style={{ borderColor: BORDER, color: MUTED }}>
                  Annuler
                </button>
                <button onClick={doPay}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: ORANGE }}>
                  Réessayer
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Détail facture */}
              <div className="rounded-2xl p-4 mb-5 space-y-3" style={{ background: BG }}>
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
                  className="flex-1 py-3 rounded-xl text-sm font-semibold border transition hover:opacity-80"
                  style={{ borderColor: BORDER, color: MUTED, background: BG }}>
                  Annuler
                </button>
                <button onClick={doPay} disabled={step === 'paying'}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition hover:opacity-90"
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
        width: 360, background: CARD, boxShadow: SH3,
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
      <div className="syscohada-viewer-modal rounded-2xl overflow-hidden w-full max-w-4xl max-h-[90vh] flex flex-col relative"
           style={{ background: '#fff', boxShadow: '0 24px 64px rgba(0,0,0,0.45)' }}
           onContextMenu={e => e.preventDefault()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
             style={{ background: '#0F172A', borderBottom: '2.5px solid #EA580C' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(234,88,12,0.20)' }}>
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
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#16A34A,#15803D)', opacity: downloading ? 0.7 : 1 }}>
                {downloading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {downloading ? 'Génération…' : 'Télécharger PDF'}
              </button>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold"
                    style={{ background: '#FFFBEB', color: '#D97706' }}>
                <Clock className="w-3.5 h-3.5" /> Dispo le {lastDayDisplay}
              </span>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#9CA3AF' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Blur guard */}
        {captureGuard && (
          <div className="absolute inset-0 z-[300] flex flex-col items-center justify-center rounded-2xl"
               style={{ background: 'rgba(15,23,42,0.96)' }}>
            <Shield className="w-12 h-12 mb-3" style={{ color: '#EA580C' }} />
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
            <div className="rounded-2xl p-5" style={{ background: '#0F172A' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#EA580C' }}>Rapport Mensuel SYSCOHADA</p>
                  <p className="text-white font-bold text-base">Resto d'ici · Plateforme B2B</p>
                  <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>contact@restodici.ci · Abidjan, Côte d'Ivoire</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold text-white" style={{ background: '#EA580C' }}>SYSCOHADA</span>
                  <p className="text-[11px] mt-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Période : {mois}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { title: 'PRESTATAIRE', lines: ["Resto d'ici", 'NIF : CI-ABJ-2024-001', 'RCCM : CI-ABJ-2024-B-001', "Abidjan, Côte d'Ivoire"] },
                  { title: 'CLIENT', lines: [compte?.raisonSociale || 'Entreprise', `NIF : ${compte?.numeroContribuable || '—'}`, `RCCM : ${compte?.numeroRCCM || '—'}`, compte?.secteurActivite ? `Secteur : ${compte.secteurActivite}` : ''] },
                ].map(({ title, lines }) => (
                  <div key={title} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#EA580C' }}>{title}</p>
                    {lines.filter(Boolean).map((l, i) => (
                      <p key={i} className="text-[12px]" style={{ color: i === 0 ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: i === 0 ? 600 : 400 }}>{l}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Section 1 — Collaborateurs */}
            <div>
              <div className="rounded-t-xl px-4 py-2.5" style={{ background: '#0F172A' }}>
                <p className="text-white font-bold text-[12px] uppercase tracking-wider">1. Synthèse budgétaire par collaborateur</p>
              </div>
              <div className="rounded-b-xl overflow-x-auto border border-t-0" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                {collabs.length === 0 ? (
                  <div className="py-8 text-center text-[13px]" style={{ color: '#6B7280' }}>Aucun collaborateur enregistré</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
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
                            <td style={{ padding: '9px 12px', textAlign: 'center', color: '#6B7280' }}>{i + 1}</td>
                            <td style={{ padding: '9px 12px', fontWeight: 600, color: '#111827' }}>{c.nom || '—'}</td>
                            <td style={{ padding: '9px 12px', color: '#6B7280' }}>{c.poste || '—'}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#111827' }}>{fcfa(bgt)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#111827' }}>{fcfa(dep)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: sol > 0 ? '#16A34A' : '#DC2626' }}>{fcfa(sol)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: pct >= 100 ? '#DC2626' : pct >= 80 ? '#D97706' : '#16A34A' }}>{pct} %</td>
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
                            <td style={{ padding: '9px 12px', color: '#111827' }}>TOTAL</td>
                            <td style={{ padding: '9px 12px' }}></td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#111827' }}>{fcfa(tb)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#111827' }}>{fcfa(td)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: ts > 0 ? '#16A34A' : '#DC2626' }}>{fcfa(ts)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#111827' }}>{tp} %</td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Section 2 — Factures */}
            <div>
              <div className="rounded-t-xl px-4 py-2.5" style={{ background: '#0F172A' }}>
                <p className="text-white font-bold text-[12px] uppercase tracking-wider">2. Détail des factures mensuelles</p>
              </div>
              <div className="rounded-b-xl overflow-x-auto border border-t-0" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                {factures.length === 0 ? (
                  <div className="py-8 text-center text-[13px]" style={{ color: '#6B7280' }}>Aucune facture émise</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
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
                            <td style={{ padding: '9px 12px', textAlign: 'center', color: '#6B7280' }}>{i + 1}</td>
                            <td style={{ padding: '9px 12px', fontWeight: 600, color: '#111827' }}>{f.numeroFacture || `FAC-${String(i+1).padStart(3,'0')}`}</td>
                            <td style={{ padding: '9px 12px', color: '#6B7280' }}>{f.periode || f.mois || '—'}</td>
                            <td style={{ padding: '9px 12px', color: '#6B7280' }}>{f.echeance ? new Date(f.echeance).toLocaleDateString('fr-FR') : '—'}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#111827' }}>{fcfa(ht)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#111827' }}>{fcfa(tva)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>{fcfa(ttc)}</td>
                            <td style={{ padding: '9px 12px' }}>
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                                    style={{ background: paid ? '#DCFCE7' : '#FFFBEB', color: paid ? '#15803D' : '#D97706' }}>
                                {paid ? 'PAYÉE' : 'EN ATTENTE'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Section 3 — Récapitulatif fiscal */}
            <div>
              <div className="rounded-t-xl px-4 py-2.5" style={{ background: '#0F172A' }}>
                <p className="text-white font-bold text-[12px] uppercase tracking-wider">3. Récapitulatif fiscal (SYSCOHADA / DGI-CI)</p>
              </div>
              <div className="rounded-b-xl overflow-hidden border border-t-0" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead style={{ background: '#F8FAFC' }}>
                    <tr>{['Désignation','Base HT','Taux TVA','Montant TVA','Total TTC'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Désignation' ? 'left' : 'right', fontWeight: 700, color: '#374151', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: '#fff' }}>
                      <td style={{ padding: '9px 12px', color: '#111827' }}>Restauration collective B2B</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#111827' }}>{fcfa(totalHT)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#6B7280' }}>18 %</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#111827' }}>{fcfa(totalTVA)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>{fcfa(totalTTC)}</td>
                    </tr>
                    <tr style={{ background: '#F1F5F9', fontWeight: 700 }}>
                      <td style={{ padding: '9px 12px', color: '#111827' }}>TOTAL GÉNÉRAL</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#111827' }}>{fcfa(totalHT)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#6B7280' }}>18 %</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#111827' }}>{fcfa(totalTVA)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#EA580C' }}>{fcfa(totalTTC)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mentions légales */}
            <div className="rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid rgba(0,0,0,0.06)' }}>
              <p className="text-[11px] italic" style={{ color: '#6B7280' }}>
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
  const [sideOpen, setSideOpen]     = useState(false);
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
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData(!!readCache(uid)); }, [loadData, uid]);
  useEffect(() => {
    if (user) setProfileForm({ prenom: user.prenom || '', nom: user.nom || '', email: user.email || '', telephone: user.telephone || '' });
  }, [user?.prenom, user?.nom, user?.email, user?.telephone]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    const socket = createCommandesSocket(user);
    const refresh = () => loadData(true);
    ['commande.creee','commande.nouvelle','commande.statut','commande.b2b.nouvelle','commande.b2b.statut']
      .forEach(ev => socket.on(ev, refresh));
    return () => { socket.disconnect(); };
  }, [user, loadData]);

  useEffect(() => {
    if (tab !== 'historique') return;
    setAuditLoading(true);
    b2bAPI.getAuditLogs()
      .then(res => setAuditLogs(Array.isArray(res.data) ? res.data : []))
      .catch(() => setAuditLogs([]))
      .finally(() => setAuditLoading(false));
  }, [tab]);

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  const datePrelevementDisplay = compte?.datePrelevement
    ? new Date(compte.datePrelevement).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
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

  const NAV = [
    { key: 'overview',       label: 'Vue d\'ensemble', icon: LayoutDashboard },
    { key: 'orders',         label: 'Commandes',       icon: ShoppingBag,  badge: activeOrders.length },
    { key: 'collaborateurs', label: 'Équipe',           icon: Users,        badge: collabs.length },
    { key: 'abonnements',    label: 'Abonnements',     icon: CalendarDays },
    { key: 'factures',       label: 'Facturation',     icon: FileText,     badge: unpaidInvoices },
    { key: 'historique',     label: 'Historique',      icon: Activity },
    { key: 'notifications',  label: 'Notifications',   icon: Bell,         badge: unreadCount },
    { key: 'settings',       label: 'Paramètres',      icon: Settings },
  ];

  const goTo = (key) => { setTab(key); setSideOpen(false); };

  // ── Sidebar — dark navy avec accents orange ───────────────────────────────────
  const Sidebar = ({ mobile = false }) => (
    <div className="flex flex-col h-full" style={{ background: NAVY }}>

      {/* Brand */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_D})` }}>
              <UtensilsCrossed className="w-4.5 h-4.5 text-white" />
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-1"
                style={{ background: RED, boxShadow: `0 0 0 2px ${NAVY}` }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-none">Resto d'ici</p>
            <p className="text-[10px] mt-0.5 font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Entreprise B2B
            </p>
          </div>
          {mobile && (
            <button onClick={() => setSideOpen(false)} style={{ color: 'rgba(255,255,255,0.5)' }}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Section label */}
      <div className="px-4 pt-5 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Navigation
        </p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto pb-4">
        {NAV.map(item => {
          const Icon = item.icon;
          const active = tab === item.key;
          return (
            <button key={item.key} onClick={() => goTo(item.key)}
              data-tour={item.key === 'collaborateurs' ? 'b2b-collab-tab' : item.key === 'overview' ? 'b2b-overview-tab' : undefined}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium relative"
              style={{
                background: active ? `${ORANGE}18` : 'transparent',
                color: active ? ORANGE : 'rgba(255,255,255,0.65)',
                borderLeft: active ? `3px solid ${ORANGE}` : '3px solid transparent',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; } }}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {(item.badge ?? 0) > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                  style={{
                    background: item.key === 'factures' && unpaidInvoices > 0
                      ? `${RED}33` : `${ORANGE}33`,
                    color: item.key === 'factures' && unpaidInvoices > 0 ? '#FCA5A5' : ORANGE,
                  }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 16px' }} />

      {/* User block */}
      <div className="px-3 py-4">
        <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Avatar name={user?.nom || 'B2B'} size={32} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate text-white">{user?.nom || 'Gestionnaire'}</p>
            <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {compte?.raisonSociale || 'Entreprise B2B'}
            </p>
          </div>
          {/* Logout — action risquée → rouge */}
          <button onClick={() => setShowLogoutModal(true)} title="Déconnexion"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:opacity-80"
            style={{ background: `${RED}22`, color: '#FCA5A5' }}>
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-[220px] shrink-0 h-full border-r" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      {sideOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="w-[220px] h-full"><Sidebar mobile /></div>
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setSideOpen(false)} />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="shrink-0 relative" style={{ background: NAVY, boxShadow: '0 1px 0 rgba(255,255,255,0.06), 0 2px 16px rgba(0,0,0,0.22)' }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${ORANGE} 0%, ${ORANGE_D} 60%, transparent 100%)` }} />
          <div className="h-16 px-4 lg:px-6 flex items-center gap-4">
            <button className="lg:hidden p-1.5 rounded-lg" onClick={() => setSideOpen(true)}
              style={{ color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.08)' }}>
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Tableau de bord entreprise
              </p>
              <h1 className="text-base font-bold mt-0.5 leading-tight" style={{ color: '#fff' }}>
                Bonjour, {user?.prenom || user?.nom?.split(' ')[0] || 'Gestionnaire'} 👋
              </h1>
            </div>

            {/* Search */}
            <div className="hidden md:flex flex-1 max-w-sm relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'rgba(255,255,255,0.4)' }} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher commande, centre de coûts…"
                className="w-full rounded-xl border pl-9 pr-8 py-2 text-sm outline-none transition"
                style={{ borderColor: searchQuery ? ORANGE : 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.08)', color: '#fff', boxShadow: searchQuery ? `0 0 0 3px ${ORANGE}30` : 'none' }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center transition hover:opacity-70"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => loadData(true)} disabled={refreshing}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:opacity-70"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)' }}>
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => goTo('notifications')}
                className="relative w-8 h-8 rounded-lg flex items-center justify-center transition hover:opacity-70"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)' }}>
                <Bell className="w-3.5 h-3.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                    style={{ background: RED }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {/* Avatar profil */}
              <div className="relative group">
                <button
                  onClick={() => setShowProfile(true)}
                  className="flex items-center rounded-full transition-all"
                  style={{
                    padding: '4px 10px 4px 4px',
                    border: `1.5px solid rgba(234,88,12,0.45)`,
                    background: `rgba(234,88,12,0.12)`,
                    cursor: 'pointer',
                    gap: 6,
                  }}
                >
                  <Avatar name={[user?.prenom, user?.nom].filter(Boolean).join(' ') || user?.nom || 'B2B'} size={30} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
                    <span className="text-[10px] font-bold hidden sm:block" style={{ color: 'rgba(255,255,255,0.9)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {[user?.prenom, user?.nom].filter(Boolean).join(' ') || user?.nom || 'Gestionnaire'}
                    </span>
                    <span className="text-[9px] hidden sm:flex items-center gap-1" style={{ color: ORANGE }}>
                      <Shield className="w-2.5 h-2.5" /> Mon profil
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">

          {error && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border"
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
            <div className="mb-4 flex items-center gap-3 px-5 py-4 rounded-2xl border"
              style={{
                background: paymentBanner.type === 'success' ? GREEN_L : AMBER_L,
                borderColor: paymentBanner.type === 'success' ? '#BBF7D0' : '#FDE68A',
              }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
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
                  style={{ color: paymentBanner.type === 'success' ? '#15803D' : '#92400E' }}>
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
            <div className="space-y-8">

              {/* ── KPI strip ─────────────────────────────────────────────────── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Dépenses du mois',  value: loading ? '—' : formatFCFA(monthlyExp),        sub: `${budgetPct}% du budget`,                                    color: ORANGE,                          bg: ORANGE_L,  Icon: TrendingUp  },
                  { label: 'Commandes actives',  value: loading ? '—' : String(activeOrders.length),  sub: `${orders.length} au total`,                                  color: ORANGE,                          bg: ORANGE_L,  Icon: ShoppingBag },
                  { label: 'Collaborateurs',     value: loading ? '—' : String(collabs.length),       sub: 'Budgets maîtrisés',                                           color: GREEN,                           bg: GREEN_L,   Icon: Users       },
                  { label: 'Factures impayées',  value: loading ? '—' : String(unpaidInvoices),       sub: unpaidInvoices > 0 ? 'À régler rapidement' : 'Tout est à jour', color: unpaidInvoices > 0 ? RED : MUTED, bg: unpaidInvoices > 0 ? RED_L : BG, Icon: FileText },
                ].map(({ label, value, sub, color, bg, Icon }) => (
                  <div key={label}
                    className="rounded-2xl px-5 py-4 flex items-center gap-4 transition-transform hover:-translate-y-0.5"
                    style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: SH, cursor: 'default' }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl font-black leading-none" style={{ color }}>{value}</p>
                      <p className="text-[12px] font-semibold mt-1 truncate" style={{ color: TEXT }}>{label}</p>
                      <p className="text-[10px] mt-0.5 truncate" style={{ color: FAINT }}>{sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Blocked banner */}
              {isBlocked && (
                <div className="rounded-2xl border px-5 py-4 flex items-start gap-4"
                  style={{ background: RED_L, borderColor: '#FECACA' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#FEE2E2' }}>
                    <Shield className="w-5 h-5" style={{ color: RED }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm" style={{ color: '#991B1B' }}>Compte suspendu — commandes désactivées</p>
                    <p className="text-xs mt-1" style={{ color: '#B91C1C' }}>
                      Une facture mensuelle est impayée. Réglez votre solde pour rétablir l'accès.
                    </p>
                  </div>
                  <button onClick={() => goTo('factures')}
                    className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: RED }}>
                    Voir les factures
                  </button>
                </div>
              )}

              {/* ── BENTO GRID ─────────────────────────────────────────────────── */}
              <div className="grid grid-cols-12 gap-5">

                {/* ── Facturation mensuelle — col 8 ─────────────────────────── */}
                <div className="col-span-12 lg:col-span-8 rounded-[32px] p-8 flex flex-col md:flex-row gap-6 transition-all duration-200 hover:-translate-y-1 cursor-default"
                  style={{
                    background: CARD,
                    boxShadow: '0 2px 16px rgba(15,23,42,0.08)',
                    border: `1px solid ${BORDER}`,
                    animation: 'kpiIn 0.45s cubic-bezier(0.22,1,0.36,1) both',
                  }}>
                  {/* Left */}
                  <div className="flex-1 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: ORANGE_L }}>
                        <Download className="w-6 h-6" style={{ color: ORANGE }} />
                      </div>
                      <p className="text-lg font-bold" style={{ color: TEXT }}>Facturation Mensuelle</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>
                        Montant cumulé en cours
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <span className="px-3 py-1.5 rounded-full text-[11px] font-bold"
                        style={{
                          background: budgetPct > 85 ? RED_L : budgetPct > 65 ? ORANGE_L : '#DCFCE7',
                          color: budgetPct > 85 ? RED : budgetPct > 65 ? ORANGE_D : GREEN,
                        }}>
                        Budget utilisé : {budgetPct}%
                      </span>
                      <span className="px-3 py-1.5 rounded-full text-[11px] font-bold"
                        style={{ background: ORANGE_L, color: ORANGE }}>
                        {orders.length} commande{orders.length !== 1 ? 's' : ''} ce mois
                      </span>
                      {activeOrders.length > 0 && (
                        <span className="px-3 py-1.5 rounded-full text-[11px] font-bold"
                          style={{ background: AMBER_L, color: AMBER }}>
                          {activeOrders.length} en cours
                        </span>
                      )}
                    </div>
                    {budgetTotal > 0 && (
                      <div>
                        <div className="flex justify-between text-[11px] mb-1.5" style={{ color: MUTED }}>
                          <span>Consommation</span>
                          <span style={{ fontWeight: 700, color: budgetPct > 85 ? RED : budgetPct > 65 ? ORANGE : GREEN }}>
                            {formatFCFA(monthlyExp)} / {formatFCFA(budgetTotal)}
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: BG }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${budgetPct}%`,
                              background: budgetPct > 85
                                ? 'linear-gradient(90deg,#EF4444,#F87171)'
                                : budgetPct > 65
                                  ? `linear-gradient(90deg,${ORANGE},#FFA040)`
                                  : 'linear-gradient(90deg,#16A34A,#4ADE80)',
                            }} />
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Right panel */}
                  <div className="rounded-2xl p-6 flex flex-col justify-between min-w-[200px]"
                    style={{
                      background: isBlocked ? RED_L : BG,
                      border: `1px solid ${isBlocked ? '#FECACA' : BORDER}`,
                    }}>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]"
                        style={{ color: isBlocked ? RED : MUTED }}>
                        {isBlocked ? 'COMPTE BLOQUÉ' : 'PROCHAIN PRÉLÈVEMENT'}
                      </p>
                      <p className="text-xl font-bold mt-2" style={{ color: isBlocked ? RED : TEXT }}>
                        {loading ? '—' : isBlocked ? 'Facture impayée' : (prochainFactureDisplay || 'Fin du mois')}
                      </p>
                      {!isBlocked && (
                        <p className="text-[11px] mt-1" style={{ color: FAINT }}>Génération automatique</p>
                      )}
                    </div>
                    <button
                      onClick={() => isBlocked ? goTo('factures') : goTo('factures')}
                      className="mt-5 w-full py-3 rounded-xl font-bold text-sm transition hover:opacity-90"
                      style={{
                        background: isBlocked ? RED : NAVY,
                        color: '#fff',
                      }}>
                      {isBlocked ? 'Régler maintenant' : 'Voir Détails'}
                    </button>
                  </div>
                </div>

                {/* ── Commandes groupées — col 4 ────────────────────────────── */}
                <div className="col-span-12 lg:col-span-4 rounded-[32px] p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:-translate-y-1 cursor-default"
                  style={{
                    background: `linear-gradient(135deg, ${ORANGE} 0%, #FF6B00 50%, ${ORANGE_D} 100%)`,
                    boxShadow: `0 8px 28px ${ORANGE}50`,
                    animation: 'kpiIn 0.45s 0.1s cubic-bezier(0.22,1,0.36,1) both',
                  }}>
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.20)' }}>
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-white">Commandes Groupées</h4>
                    <p className="text-sm text-white/70 leading-relaxed">
                      Planifiez les repas groupés de la semaine pour vos {collabs.length > 0 ? `${collabs.length} collaborateur${collabs.length > 1 ? 's' : ''}` : 'équipes'}.
                    </p>
                  </div>
                  {isBlocked ? (
                    <button disabled
                      className="relative mt-8 w-full py-3.5 rounded-xl font-bold text-sm"
                      style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.5)', cursor: 'not-allowed' }}>
                      Commandes désactivées
                    </button>
                  ) : (
                    <div className="mt-8 flex flex-col gap-2">
                      <button onClick={() => navigate('/b2b/order?mode=instant')}
                        className="w-full py-3 rounded-xl font-bold text-sm transition hover:opacity-90"
                        style={{ background: 'rgba(255,255,255,0.22)', color: '#fff', border: '1px solid rgba(255,255,255,0.30)' }}>
                        ⚡ Commander maintenant
                      </button>
                      <button onClick={() => navigate('/b2b/order?mode=schedule')}
                        className="w-full py-2.5 rounded-xl font-semibold text-sm transition hover:opacity-80"
                        style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.20)' }}>
                        <span className="flex items-center justify-center gap-1.5">
                          <CalendarDays className="w-4 h-4" /> Planifier pour plus tard
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Historique commandes — col 12 ─────────────────────────── */}
                <div className="col-span-12 rounded-[32px] overflow-hidden transition-all duration-200 hover:-translate-y-1"
                  style={{ background: CARD, boxShadow: '0 2px 16px rgba(15,23,42,0.07)', border: `1px solid ${BORDER}` }}>

                  {/* Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 px-8 py-6"
                    style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="w-5 h-5" style={{ color: ORANGE }} />
                      <h4 className="text-lg font-bold" style={{ color: TEXT }}>Historique des Commandes</h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Cost center tabs */}
                      <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: BG }}>
                        {[
                          { k: 'all',    label: 'Tous' },
                          { k: 'active', label: `En cours (${activeOrders.length})` },
                          { k: 'done',   label: `Terminées (${doneOrders.length})` },
                        ].map(f => (
                          <button key={f.k} onClick={() => setOrderFilter(f.k)}
                            className="px-4 py-2 rounded-lg text-[12px] font-semibold transition"
                            style={{
                              background: orderFilter === f.k ? CARD : 'transparent',
                              color: orderFilter === f.k ? TEXT : MUTED,
                              boxShadow: orderFilter === f.k ? '0 1px 4px rgba(15,23,42,0.08)' : 'none',
                            }}>
                            {f.label}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => goTo('orders')}
                        className="px-4 py-2 rounded-xl text-[12px] font-semibold transition hover:opacity-80"
                        style={{ background: ORANGE_L, color: ORANGE }}>
                        Voir tout →
                      </button>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <tr>
                          {['COMMANDE #', 'DATE', 'CENTRE DE COÛTS', 'ARTICLES', 'MONTANT', 'STATUT'].map(h => (
                            <th key={h} className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.18em]"
                              style={{ color: FAINT }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          [1,2,3,4].map(i => (
                            <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                              <td colSpan={6} className="px-8 py-5">
                                <div className="h-5 rounded-full animate-pulse w-3/4" style={{ background: BG }} />
                              </td>
                            </tr>
                          ))
                        ) : displayed.slice(0, 6).map((o, idx, arr) => {
                          const st = o.statut ?? o.status ?? '';
                          const center = o.centreDeCout || o.centre || o.costCenter || 'Autres';
                          const items  = o.lignes?.length || o.nombrePlats || '—';
                          return (
                            <tr key={o.id}
                              className="cursor-pointer transition-colors"
                              style={{ borderBottom: idx < arr.length - 1 ? `1px solid ${BORDER}` : 'none' }}
                              onMouseEnter={e => e.currentTarget.style.background = BG}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              onClick={() => navigate(o.numero?.startsWith('GRP-') ? `/b2b/suivi/${o.id}` : `/suivi/${o.id}`)}>
                              <td className="px-8 py-5 font-bold text-[13px]" style={{ color: TEXT }}>
                                {o.numero || `#${o.id?.slice(0, 8)}`}
                              </td>
                              <td className="px-8 py-5 text-[13px]" style={{ color: MUTED }}>
                                {o.dateLivraison
                                  ? new Date(o.dateLivraison).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                                  : '—'}
                              </td>
                              <td className="px-8 py-5">
                                <span className="px-3 py-1 rounded-full text-[11px] font-bold"
                                  style={{ background: ORANGE_L, color: ORANGE_D }}>
                                  {center}
                                </span>
                              </td>
                              <td className="px-8 py-5 text-[13px]" style={{ color: MUTED }}>
                                {items !== '—' ? `${items} article${items > 1 ? 's' : ''}` : '—'}
                              </td>
                              <td className="px-8 py-5 font-bold text-[13px]" style={{ color: ORANGE }}>
                                {formatFCFA(o.total || o.totalEstime || o.montantTotal || 0)}
                              </td>
                              <td className="px-8 py-5"><StatusPill statut={st} /></td>
                            </tr>
                          );
                        })}
                        {!loading && orders.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-8 py-16 text-center text-sm" style={{ color: FAINT }}>
                              Aucune commande ce mois — passez votre première commande d'équipe
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── SYSCOHADA — col 5 ─────────────────────────────────────── */}
                <div className="col-span-12 lg:col-span-5 rounded-[32px] p-8 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1"
                  style={{ background: BG, border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(15,23,42,0.06)' }}>
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: GREEN_L }}>
                        <Download className="w-6 h-6" style={{ color: GREEN }} />
                      </div>
                      <h4 className="text-lg font-bold" style={{ color: TEXT }}>Reporting SYSCOHADA</h4>
                    </div>
                    <p className="text-sm leading-relaxed mb-6" style={{ color: MUTED }}>
                      Générez automatiquement vos rapports de conformité fiscale pour la comptabilité OHADA en un clic.
                    </p>
                    {/* Latest facture preview */}
                    {factures.length > 0 && (
                      <div className="rounded-xl border p-4 flex items-center justify-between"
                        style={{ background: CARD, borderColor: BORDER }}>
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 shrink-0" style={{ color: GREEN }} />
                          <p className="text-[13px] font-semibold" style={{ color: TEXT }}>
                            {factures[0].numeroFacture || `Rapport ${factures[0].periode || ''}`}
                          </p>
                        </div>
                        <p className="text-[11px] font-bold" style={{ color: MUTED }}>
                          {formatFCFA(factures[0].montantTTC || 0)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-8 space-y-2.5">
                    <button onClick={() => setViewingSyscohada(true)}
                      className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition hover:opacity-80"
                      style={{ background: BG, border: `1.5px solid ${BORDER}`, color: TEXT }}>
                      <Eye className="w-4 h-4" /> Voir le rapport
                    </button>
                    {isLastDayOfMonth ? (
                      <button onClick={downloadSyscohadaReport} disabled={downloading}
                        className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition hover:opacity-90"
                        style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_D})`, boxShadow: `0 4px 16px ${GREEN}40`, opacity: downloading ? 0.7 : 1 }}>
                        {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {downloading ? 'Génération…' : 'Télécharger Rapport Mensuel'}
                      </button>
                    ) : (
                      <div className="rounded-2xl p-3.5 flex items-center gap-3"
                        style={{ background: AMBER_L, border: `1px solid #FDE68A` }}>
                        <Clock className="w-4 h-4 shrink-0" style={{ color: AMBER }} />
                        <div>
                          <p className="text-[12px] font-bold" style={{ color: AMBER }}>Téléchargement le {lastDayDisplay}</p>
                          <p className="text-[11px]" style={{ color: '#92400E' }}>
                            {daysUntilExport > 1 ? `encore ${daysUntilExport} jours` : 'demain'} · OHADA · TVA 18%
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Centres de coûts — bar chart — col 7 ─────────────────── */}
                <div className="col-span-12 lg:col-span-7 rounded-[32px] p-8 relative overflow-hidden transition-all duration-200 hover:-translate-y-1"
                  style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: '0 2px 16px rgba(15,23,42,0.07)' }}>
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-bold" style={{ color: TEXT }}>Centres de Coûts</h4>
                    {Object.keys(centerCounts).length > 0 && (
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: ORANGE_L, color: ORANGE }}>
                        {orders.length} commandes
                      </span>
                    )}
                  </div>
                  {Object.keys(centerCounts).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-2">
                      <span style={{ fontSize: 28, opacity: 0.35 }}>📊</span>
                      <p className="text-[13px] font-semibold" style={{ color: MUTED }}>0 commande enregistrée</p>
                      <p className="text-[11px]" style={{ color: FAINT }}>Les centres de coûts apparaîtront ici</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(centerCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 6)
                        .map(([name, value], i) => {
                          const BAR_COLORS = [ORANGE, '#4F46E5', GREEN, '#7C3AED', '#0EA5E9', AMBER];
                          const color = BAR_COLORS[i % BAR_COLORS.length];
                          const total = orders.length || 1;
                          const pct = Math.round((value / total) * 100);
                          const barW = Math.max(4, Math.round((value / Math.max(...Object.values(centerCounts), 1)) * 100));
                          return (
                            <div key={name} className="group flex items-center gap-3 rounded-xl px-3 py-2 transition-colors" style={{ background: 'transparent' }}
                              onMouseEnter={e => e.currentTarget.style.background = BG}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                              <span className="text-[12px] font-semibold shrink-0" style={{ color: TEXT, minWidth: 80, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: BORDER }}>
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${barW}%`, background: `linear-gradient(90deg, ${color}, ${color}bb)` }} />
                              </div>
                              <span className="text-[11px] font-bold shrink-0 w-5 text-right" style={{ color }}>{value}</span>
                              <span className="text-[10px] shrink-0 w-9 text-right" style={{ color: FAINT }}>{pct}%</span>
                            </div>
                          );
                        })}
                      <div className="mt-2 pt-3 flex items-center justify-between" style={{ borderTop: `1px solid ${BORDER}` }}>
                        <span className="text-[11px]" style={{ color: FAINT }}>Total</span>
                        <span className="text-[12px] font-bold" style={{ color: TEXT }}>{orders.length} commandes</span>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ══ COMMANDES ════════════════════════════════════════════════════════ */}
          {tab === 'orders' && (
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
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition hover:opacity-80"
                    style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
                    <CalendarDays className="w-4 h-4" /> Planifier
                  </Link>
                  <Link to="/b2b/order?mode=instant"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
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
                    className="px-3 py-1.5 rounded-xl text-[12px] font-semibold transition"
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

              <div className="rounded-2xl overflow-hidden" style={{ background: CARD, boxShadow: SH2 }}>
                {loading ? (
                  <div className="p-4 space-y-2">
                    {[1,2,3,4].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: BG }} />)}
                  </div>
                ) : displayed.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                      style={{ background: ORANGE_L }}>
                      <ShoppingBag className="w-7 h-7" style={{ color: ORANGE }} />
                    </div>
                    <p className="text-sm font-bold mb-1" style={{ color: TEXT }}>Aucune commande</p>
                    <p className="text-xs mb-5" style={{ color: FAINT }}>Passez votre première commande d'équipe</p>
                    <Link to="/b2b/order?mode=instant"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
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
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: isGroupee ? '#EFF6FF' : ORANGE_L }}>
                        <ShoppingBag className="w-4.5 h-4.5" style={{ color: isGroupee ? '#3B82F6' : ORANGE }} />
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
          )}

          {/* ══ ÉQUIPE ═══════════════════════════════════════════════════════════ */}
          {tab === 'collaborateurs' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold" style={{ color: TEXT }}>Équipe</h2>
                  <p className="text-[12px] mt-0.5" style={{ color: FAINT }}>
                    {collabs.length} collaborateur{collabs.length !== 1 ? 's' : ''} · budgets mensuels
                  </p>
                </div>
                {/* Inviter — orange */}
                <button onClick={() => setShowInvite(true)}
                  data-tour="b2b-invite-btn"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_D})`, boxShadow: `0 2px 8px ${ORANGE}40` }}>
                  <Plus className="w-4 h-4" /> Inviter un collaborateur
                </button>
              </div>

              <div className="rounded-2xl overflow-hidden" style={{ background: CARD, boxShadow: SH2 }}>
                {loading ? (
                  <div className="p-4 space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: BG }} />)}
                  </div>
                ) : collabs.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                      style={{ background: ORANGE_L }}>
                      <Users className="w-7 h-7" style={{ color: ORANGE }} />
                    </div>
                    <p className="text-sm font-bold mb-1" style={{ color: TEXT }}>Aucun collaborateur</p>
                    <p className="text-xs mb-5" style={{ color: FAINT }}>Invitez votre équipe pour gérer les déjeuners ensemble</p>
                    <button onClick={() => setShowInvite(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                      style={{ background: ORANGE }}>
                      <Plus className="w-4 h-4" /> Inviter
                    </button>
                  </div>
                ) : collabs.map((c, idx, arr) => {
                  const budget = Number(c.limiteBudget || c.budgetMax || 0);
                  const spent  = Number(c.depenseActuelle || c.depenses || 0);
                  const isConfirming = confirmDeleteId === c.id;
                  const isEditing = editBudgetId === c.id;
                  return (
                    <div key={c.id} className="transition"
                      style={{ borderBottom: idx < arr.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                      {/* Row principale */}
                      <div className="flex items-center gap-4 px-5 py-4">
                        <Avatar name={c.nom || ''} size={40} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold" style={{ color: TEXT }}>{c.nom || 'Collaborateur'}</p>
                          <p className="text-[11px] mt-0.5 mb-2" style={{ color: FAINT }}>{c.poste || c.email}</p>
                          <BudgetBar spent={spent} budget={budget} />
                        </div>
                        <div className="text-right shrink-0 hidden sm:block ml-4">
                          <p className="text-[11px]" style={{ color: FAINT }}>Budget mensuel</p>
                          <p className="text-sm font-bold" style={{ color: TEXT }}>{formatFCFA(budget)}</p>
                        </div>
                        <button
                          onClick={() => {
                            setEditBudgetId(isEditing ? null : c.id);
                            setEditBudgetVal(String(budget));
                            setEditBudgetError('');
                            setConfirmDeleteId(null);
                          }}
                          className="w-9 h-9 rounded-xl flex items-center justify-center border transition hover:opacity-90"
                          style={{ borderColor: BORDER, background: isEditing ? ORANGE_L : BG, color: isEditing ? ORANGE : MUTED }}
                          title="Modifier le budget">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setConfirmDeleteId(isConfirming ? null : c.id); setDeleteError(''); setEditBudgetId(null); }}
                          disabled={deletingId === c.id}
                          className="w-9 h-9 rounded-xl flex items-center justify-center border transition hover:opacity-90"
                          style={{ borderColor: '#FECACA', background: isConfirming ? RED : RED_L, color: isConfirming ? '#fff' : RED }}
                          title="Supprimer ce collaborateur">
                          {deletingId === c.id
                            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {/* Inline edit budget */}
                      {isEditing && (
                        <div className="mx-5 mb-3 px-4 py-3 rounded-xl" style={{ background: ORANGE_L, border: `1px solid ${ORANGE}30` }}>
                          <p className="text-[11px] font-semibold mb-2" style={{ color: ORANGE_D }}>Modifier le budget mensuel de {c.nom}</p>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              value={editBudgetVal}
                              onChange={e => setEditBudgetVal(e.target.value)}
                              placeholder="Ex : 50000"
                              className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                              style={{ background: CARD, border: `1.5px solid ${BORDER}`, color: TEXT }}
                              onKeyDown={e => e.key === 'Enter' && handleEditBudget(c.id)}
                            />
                            <span className="text-xs font-semibold shrink-0" style={{ color: MUTED }}>FCFA</span>
                            <button onClick={() => handleEditBudget(c.id)} disabled={editBudgetSaving}
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition"
                              style={{ background: editBudgetSaving ? MUTED : ORANGE }}>
                              {editBudgetSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => { setEditBudgetId(null); setEditBudgetError(''); }}
                              className="w-9 h-9 rounded-xl flex items-center justify-center border text-sm"
                              style={{ borderColor: BORDER, color: MUTED, background: CARD }}>
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {editBudgetError && <p className="text-xs font-semibold mt-1.5" style={{ color: RED }}>{editBudgetError}</p>}
                        </div>
                      )}
                      {/* Bandeau de confirmation inline */}
                      {isConfirming && (
                        <div className="mx-5 mb-3 px-4 py-3 rounded-xl flex items-center gap-3"
                          style={{ background: RED_L, border: `1px solid #FECACA` }}>
                          <AlertCircle className="w-4 h-4 shrink-0" style={{ color: RED }} />
                          <p className="flex-1 text-xs font-semibold" style={{ color: '#991B1B' }}>
                            Supprimer <strong>{c.nom}</strong> ? Action irréversible.
                          </p>
                          <button onClick={() => setConfirmDeleteId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                            style={{ borderColor: BORDER, color: MUTED, background: CARD }}>
                            Annuler
                          </button>
                          <button onClick={() => handleDeleteCollab(c.id)}
                            disabled={deletingId === c.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5"
                            style={{ background: RED }}>
                            {deletingId === c.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                            Confirmer
                          </button>
                        </div>
                      )}
                      {/* Message d'erreur */}
                      {isConfirming && deleteError && (
                        <p className="mx-5 mb-3 text-xs font-semibold" style={{ color: RED }}>{deleteError}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ ABONNEMENTS ══════════════════════════════════════════════════════ */}
          {tab === 'abonnements' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold" style={{ color: TEXT }}>Plans repas récurrents</h2>
                  <p className="text-[12px] mt-0.5" style={{ color: FAINT }}>
                    {subs.length} plan{subs.length !== 1 ? 's' : ''} · Commandes groupées automatiques
                  </p>
                </div>
                <button onClick={() => { setShowSubForm(true); setSubFormErr(''); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_D})`, boxShadow: `0 2px 8px ${ORANGE}40` }}>
                  <Plus className="w-4 h-4" /> Nouveau plan
                </button>
              </div>

              {/* Add form */}
              {showSubForm && (
                <div className="rounded-2xl p-5 space-y-3" style={{ background: CARD, boxShadow: SH2 }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm" style={{ color: TEXT }}>Nouveau plan repas</p>
                    <button onClick={() => { setShowSubForm(false); setSubFormErr(''); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:opacity-70"
                      style={{ background: BG }}>
                      <X className="w-3.5 h-3.5" style={{ color: MUTED }} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold mb-1.5" style={{ color: MUTED }}>Nom du plan *</label>
                      <input type="text" value={subForm.nom}
                        onChange={e => setSubForm(p => ({ ...p, nom: e.target.value }))}
                        placeholder="Ex : Déjeuner équipe commerciale"
                        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                        style={{ background: BG, border: `1.5px solid ${BORDER}`, color: TEXT }} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold mb-1.5" style={{ color: MUTED }}>Fréquence</label>
                      <select value={subForm.frequence}
                        onChange={e => setSubForm(p => ({ ...p, frequence: e.target.value }))}
                        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                        style={{ background: BG, border: `1.5px solid ${BORDER}`, color: TEXT }}>
                        <option value="HEBDO">Hebdomadaire</option>
                        <option value="MENSUEL">Mensuelle</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold mb-1.5" style={{ color: MUTED }}>Nb repas / livraison</label>
                      <input type="number" min="1" value={subForm.nbRepas}
                        onChange={e => setSubForm(p => ({ ...p, nbRepas: e.target.value }))}
                        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                        style={{ background: BG, border: `1.5px solid ${BORDER}`, color: TEXT }} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold mb-1.5" style={{ color: MUTED }}>Budget par repas (FCFA) *</label>
                      <input type="number" min="0" value={subForm.budgetRepas}
                        onChange={e => setSubForm(p => ({ ...p, budgetRepas: e.target.value }))}
                        placeholder="Ex : 5000"
                        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                        style={{ background: BG, border: `1.5px solid ${BORDER}`, color: TEXT }} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold mb-1.5" style={{ color: MUTED }}>Notes / instructions</label>
                      <textarea value={subForm.notes} rows={2}
                        onChange={e => setSubForm(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Allergènes, préférences, instructions particulières…"
                        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
                        style={{ background: BG, border: `1.5px solid ${BORDER}`, color: TEXT }} />
                    </div>
                  </div>
                  {subFormErr && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: RED_L }}>
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: RED }} />
                      <p className="text-xs font-medium" style={{ color: RED }}>{subFormErr}</p>
                    </div>
                  )}
                  <button onClick={handleAddSub} disabled={subSaving}
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition hover:opacity-90"
                    style={{ background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_D})`, opacity: subSaving ? 0.7 : 1 }}>
                    {subSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {subSaving ? 'Enregistrement…' : 'Créer le plan'}
                  </button>
                </div>
              )}

              {/* Subscription list */}
              <div className="rounded-2xl overflow-hidden" style={{ background: CARD, boxShadow: SH2 }}>
                {subs.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                      style={{ background: ORANGE_L }}>
                      <CalendarDays className="w-7 h-7" style={{ color: ORANGE }} />
                    </div>
                    <p className="text-sm font-bold mb-1" style={{ color: TEXT }}>Aucun plan repas</p>
                    <p className="text-xs mb-5" style={{ color: FAINT }}>
                      Planifiez des commandes récurrentes pour votre équipe
                    </p>
                    <button onClick={() => setShowSubForm(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                      style={{ background: ORANGE }}>
                      <Plus className="w-4 h-4" /> Créer un plan
                    </button>
                  </div>
                ) : subs.map((s, idx, arr) => (
                  <div key={s.id} className="transition"
                    style={{ borderBottom: idx < arr.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                    <div className="flex items-start gap-4 px-5 py-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: s.actif ? ORANGE_L : BG }}>
                        <CalendarDays className="w-5 h-5" style={{ color: s.actif ? ORANGE : FAINT }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[13px] font-bold" style={{ color: TEXT }}>{s.nom}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: s.actif ? GREEN_L : BG, color: s.actif ? GREEN : FAINT }}>
                            {s.actif ? '● Actif' : '⏸ En pause'}
                          </span>
                        </div>
                        <p className="text-[11px] mt-0.5" style={{ color: FAINT }}>
                          {s.frequence === 'HEBDO' ? 'Hebdomadaire' : 'Mensuelle'} · {s.nbRepas} repas · {formatFCFA(s.budgetRepas)}/repas
                        </p>
                        {s.actif && (
                          <p className="text-[11px] mt-1 font-medium" style={{ color: ORANGE }}>
                            Prochaine livraison : {s.prochaineLivraison}
                          </p>
                        )}
                        {s.notes && (
                          <p className="text-[11px] mt-1 italic" style={{ color: MUTED }}>"{s.notes}"</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleToggleSub(s.id)}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold border transition"
                          style={{
                            borderColor: s.actif ? BORDER : ORANGE,
                            background: s.actif ? BG : ORANGE_L,
                            color: s.actif ? MUTED : ORANGE,
                          }}>
                          {s.actif ? 'Pause' : 'Activer'}
                        </button>
                        <button onClick={() => handleDeleteSub(s.id)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center border transition"
                          style={{ borderColor: '#FECACA', background: RED_L, color: RED }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {subs.length > 0 && (
                <div className="rounded-xl px-4 py-3 flex items-start gap-3"
                  style={{ background: AMBER_L, border: `1px solid ${AMBER}30` }}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: AMBER }} />
                  <p className="text-[11px]" style={{ color: AMBER }}>
                    <strong>Note :</strong> Les plans repas génèrent automatiquement une demande de commande groupée à la date prévue.
                    Votre équipe en est notifiée par email.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ══ FACTURATION ══════════════════════════════════════════════════════ */}
          {tab === 'factures' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: TEXT }}>Facturation</h2>
                  <p className="text-[12px] mt-0.5" style={{ color: FAINT }}>
                    Factures mensuelles consolidées · SYSCOHADA TVA 18%
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => setViewingSyscohada(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition hover:opacity-80"
                    style={{ background: BG, border: `1.5px solid ${BORDER}`, color: TEXT }}>
                    <Eye className="w-4 h-4" /> Voir SYSCOHADA
                  </button>
                  {isLastDayOfMonth ? (
                    <button onClick={downloadSyscohadaReport} disabled={downloading}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                      style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_D})`, boxShadow: `0 2px 8px ${GREEN}40`, opacity: downloading ? 0.7 : 1 }}>
                      {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {downloading ? 'Génération…' : 'Télécharger PDF'}
                    </button>
                  ) : (
                    <span className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background: AMBER_L, color: AMBER }}>
                      <Clock className="w-4 h-4" /> Export le {lastDayDisplay}
                    </span>
                  )}
                </div>
              </div>

              {/* KPI factures */}
              {factures.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {[
                    {
                      label: 'Total facturé',
                      value: formatFCFA(factures.reduce((s, f) => s + Number(f.montantTTC || f.montantTotal || 0), 0)),
                      color: NAVY, bg: BG,
                    },
                    {
                      label: 'En attente',
                      value: `${factures.filter(f => f.statut !== 'PAYEE').length} facture${factures.filter(f => f.statut !== 'PAYEE').length !== 1 ? 's' : ''}`,
                      color: AMBER, bg: AMBER_L,
                    },
                    {
                      label: 'Réglées',
                      value: `${factures.filter(f => f.statut === 'PAYEE').length} facture${factures.filter(f => f.statut === 'PAYEE').length !== 1 ? 's' : ''}`,
                      color: GREEN, bg: GREEN_L,
                    },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl px-5 py-4" style={{ background: s.bg, boxShadow: SH }}>
                      <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-[11px] mt-1" style={{ color: MUTED }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-2xl overflow-hidden" style={{ background: CARD, boxShadow: SH2 }}>
                {loading ? (
                  <div className="p-4 space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: BG }} />)}
                  </div>
                ) : factures.length === 0 ? (
                  <div className="py-24 text-center px-6">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                      style={{ background: '#F5F3FF' }}>
                      <FileText className="w-8 h-8" style={{ color: '#7C3AED' }} />
                    </div>
                    <p className="text-base font-bold mb-1" style={{ color: TEXT }}>Aucune facture disponible</p>
                    <p className="text-sm mb-6" style={{ color: FAINT }}>Générées automatiquement en fin de mois</p>
                    <button
                      onClick={async () => {
                        try {
                          await b2bAPI.seedFactureTest();
                          await loadData(true);
                        } catch (e) {
                          alert(e.response?.data?.message || 'Erreur lors de la création');
                        }
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                      style={{ background: `linear-gradient(135deg, #7C3AED, #6D28D9)`, boxShadow: '0 3px 12px rgba(124,58,237,0.35)' }}>
                      <Plus className="w-4 h-4" /> Créer une facture de test
                    </button>
                    <p className="text-[11px] mt-3" style={{ color: FAINT }}>
                      Génère une facture fictive de 50 000 FCFA pour tester le paiement
                    </p>
                  </div>
                ) : factures.map((f, idx, arr) => {
                  const isPaid   = f.statut === 'PAYEE' || f.statut === 'paid';
                  const isLate   = f.statut === 'RETARDEE' || f.statut === 'OVERDUE';
                  const montant  = Number(f.montantTTC || f.montantTotal || 0);
                  const montantHT = Math.round(montant / 1.18);
                  const tva       = montant - montantHT;
                  return (
                    <div key={f.id} className="transition"
                      style={{ borderBottom: idx < arr.length - 1 ? `1px solid ${BORDER}` : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = BG}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div className="flex items-center gap-4 px-6 py-5">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: isPaid ? GREEN_L : isLate ? RED_L : AMBER_L }}>
                          <FileText className="w-5 h-5"
                            style={{ color: isPaid ? GREEN : isLate ? RED : AMBER }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[14px] font-bold" style={{ color: TEXT }}>
                              {f.numeroFacture || `Facture ${f.periode || idx + 1}`}
                            </p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{
                                background: isPaid ? GREEN_L : isLate ? RED_L : AMBER_L,
                                color: isPaid ? GREEN : isLate ? RED : AMBER,
                              }}>
                              {isPaid ? 'Payée ✓' : isLate ? 'En retard !' : 'En attente'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 mt-1">
                            <p className="text-[11px]" style={{ color: FAINT }}>
                              {f.periode || ''}
                              {f.echeance ? ` · Échéance ${new Date(f.echeance).toLocaleDateString('fr-FR')}` : ''}
                            </p>
                            <p className="text-[11px]" style={{ color: FAINT }}>
                              HT : {formatFCFA(montantHT)} · TVA 18% : {formatFCFA(tva)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 hidden sm:block">
                          <p className="text-[15px] font-bold" style={{ color: TEXT }}>{formatFCFA(montant)}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: FAINT }}>TTC</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Voir le reçu — icône œil ; modal gère download si payée */}
                          <button
                            onClick={() => setViewingFacture(f)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[12px] font-semibold transition hover:opacity-80"
                            style={{
                              borderColor: isPaid ? '#BBF7D0' : BORDER,
                              background: isPaid ? GREEN_L : BG,
                              color: isPaid ? GREEN : MUTED,
                            }}
                            title={isPaid ? 'Voir et télécharger le reçu' : 'Visualiser (lecture seule)'}>
                            <FileText className="w-3.5 h-3.5" />
                            {isPaid ? 'Reçu PDF' : 'Voir'}
                          </button>
                          {/* Payer — orange si en attente / rouge si en retard */}
                          {!isPaid && (
                            <button
                              onClick={() => setPayingFacture(f)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white transition hover:opacity-90"
                              style={{
                                background: isLate
                                  ? `linear-gradient(135deg, ${RED}, #B91C1C)`
                                  : `linear-gradient(135deg, ${ORANGE}, ${ORANGE_D})`,
                                boxShadow: `0 2px 8px ${isLate ? '#DC262640' : '#EA580C40'}`,
                              }}>
                              <CreditCard className="w-3.5 h-3.5" />
                              {isLate ? 'Régler !' : 'Payer'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ HISTORIQUE ═══════════════════════════════════════════════════════ */}
          {tab === 'historique' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold" style={{ color: TEXT }}>Historique d'activité</h2>
                  <p className="text-[12px] mt-0.5" style={{ color: FAINT }}>Toutes les actions enregistrées sur votre compte</p>
                </div>
                <button
                  onClick={() => {
                    setAuditLoading(true);
                    b2bAPI.getAuditLogs()
                      .then(res => setAuditLogs(Array.isArray(res.data) ? res.data : []))
                      .catch(() => {})
                      .finally(() => setAuditLoading(false));
                  }}
                  disabled={auditLoading}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold border transition hover:opacity-80 disabled:opacity-50"
                  style={{ borderColor: BORDER, color: MUTED, background: CARD }}>
                  <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
                  Actualiser
                </button>
              </div>

              {auditLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: ORANGE, borderTopColor: 'transparent' }} />
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-20 text-center rounded-2xl" style={{ background: CARD, boxShadow: SH }}>
                  <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: BG }}>
                    <Activity className="w-6 h-6" style={{ color: FAINT }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: MUTED }}>Aucun événement enregistré</p>
                  <p className="text-xs mt-1" style={{ color: FAINT }}>Les connexions, commandes et actions apparaissent ici</p>
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden" style={{ background: CARD, boxShadow: SH2 }}>
                  {auditLogs.map((entry, idx, arr) => {
                    const LABELS = {
                      CONNEXION: 'Connexion', CREATION_COLLABORATEUR: 'Ajout collaborateur',
                      CREATION_COMMANDE_GROUPEE: 'Commande groupée', VALIDATION_BUDGET: 'Validation budget',
                      GENERATION_FACTURE: 'Génération facture', PAIEMENT_FACTURE: 'Paiement facture',
                    };
                    const COLORS = {
                      CONNEXION: { bg: '#EFF6FF', color: '#2563EB' },
                      CREATION_COLLABORATEUR: { bg: GREEN_L, color: GREEN },
                      CREATION_COMMANDE_GROUPEE: { bg: ORANGE_L, color: ORANGE },
                      VALIDATION_BUDGET: { bg: AMBER_L, color: AMBER },
                      GENERATION_FACTURE: { bg: GREEN_L, color: GREEN },
                      PAIEMENT_FACTURE: { bg: GREEN_L, color: GREEN_D },
                    };
                    const s = COLORS[entry.type] || { bg: BG, color: MUTED };
                    const date = new Date(entry.createdAt);
                    return (
                      <div key={entry.id || idx} className="flex items-center gap-4 px-5 py-3.5"
                        style={{ borderBottom: idx < arr.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: s.bg }}>
                          <Activity className="w-3.5 h-3.5" style={{ color: s.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold" style={{ color: TEXT }}>
                            {LABELS[entry.type] || entry.type}
                          </p>
                          {entry.actorEmail && (
                            <p className="text-[11px] mt-0.5" style={{ color: FAINT }}>{entry.actorEmail}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] font-medium" style={{ color: MUTED }}>
                            {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-[10px]" style={{ color: FAINT }}>
                            {date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ NOTIFICATIONS ════════════════════════════════════════════════════ */}
          {tab === 'notifications' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: TEXT }}>Notifications</h2>
                  <p className="text-[12px] mt-0.5" style={{ color: FAINT }}>
                    {unreadCount > 0
                      ? `${unreadCount} non lue${unreadCount !== 1 ? 's' : ''} · ${notifications.length} au total`
                      : `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
                {notifications.length > 0 && (
                  <div className="flex items-center gap-3">
                    <button onClick={markAllRead}
                      className="px-4 py-2 rounded-xl text-[12px] font-semibold border transition hover:opacity-80"
                      style={{ borderColor: BORDER, color: MUTED, background: CARD }}>
                      Tout marquer lu
                    </button>
                    <button onClick={() => setNotifications([])}
                      className="px-4 py-2 rounded-xl text-[12px] font-semibold border transition hover:opacity-80"
                      style={{ borderColor: '#FECACA', color: RED, background: RED_L }}>
                      Effacer tout
                    </button>
                  </div>
                )}
              </div>

              {/* Unread banner */}
              {unreadCount > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: ORANGE_L, border: `1px solid ${ORANGE}33` }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: ORANGE }}>
                    <Bell className="w-4.5 h-4.5 text-white" />
                  </div>
                  <p className="text-sm font-semibold flex-1" style={{ color: ORANGE }}>
                    {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''} notification{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}
                  </p>
                  <button onClick={markAllRead}
                    className="text-[12px] font-bold px-3 py-1.5 rounded-lg transition hover:opacity-80"
                    style={{ background: ORANGE, color: '#fff' }}>
                    Tout lire
                  </button>
                </div>
              )}

              <div className="rounded-2xl overflow-hidden" style={{ background: CARD, boxShadow: SH2 }}>
                {notifications.length === 0 ? (
                  <div className="py-28 text-center">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                      style={{ background: BG }}>
                      <Bell className="w-8 h-8" style={{ color: FAINT }} />
                    </div>
                    <p className="text-base font-bold mb-1" style={{ color: TEXT }}>Aucune notification</p>
                    <p className="text-sm mt-1" style={{ color: FAINT }}>
                      Les mises à jour de commandes en temps réel apparaissent ici
                    </p>
                  </div>
                ) : notifications.map((n, idx, arr) => {
                  const color  = n.color || ORANGE;
                  const iconBg = n.iconBg || ORANGE_L;
                  const NotifIcon = n.type === 'new_order' ? Package
                    : n.type === 'payment' ? CreditCard
                    : n.type === 'invoice' ? FileText
                    : n.type === 'team'    ? UserPlus
                    : n.type === 'status'  ? TrendingUp
                    : Bell;
                  const hasTarget = n.orderId || n.type === 'new_order' || n.type === 'status'
                    || n.type === 'payment' || n.type === 'invoice' || n.type === 'team';
                  return (
                    <div key={n.id}
                      className="flex items-center gap-4 px-6 py-5 transition"
                      style={{
                        background: n.read ? 'transparent' : `${color}08`,
                        borderBottom: idx < arr.length - 1 ? `1px solid ${BORDER}` : 'none',
                        borderLeft: n.read ? '3px solid transparent' : `3px solid ${color}`,
                        cursor: hasTarget ? 'pointer' : 'default',
                      }}
                      onMouseEnter={e => { if (hasTarget) e.currentTarget.style.background = n.read ? BG : `${color}12`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = n.read ? 'transparent' : `${color}08`; }}
                      onClick={() => handleNotifClick(n)}>
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: n.read ? BG : iconBg }}>
                        <NotifIcon className="w-5 h-5" style={{ color: n.read ? FAINT : color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold leading-snug" style={{ color: TEXT }}>{n.msg}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3" style={{ color: FAINT }} />
                          <p className="text-[12px]" style={{ color: FAINT }}>
                            {new Date(n.ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            {' · '}{new Date(n.ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                          </p>
                          {hasTarget && !n.read && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: `${color}20`, color }}>
                              Cliquer pour voir
                            </span>
                          )}
                        </div>
                      </div>
                      {!n.read && (
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ PARAMÈTRES ═══════════════════════════════════════════════════════ */}
          {tab === 'settings' && (
            <div className="space-y-6 max-w-4xl">

              {/* ── En-tête */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: TEXT }}>Paramètres</h2>
                  <p className="text-[12px] mt-0.5" style={{ color: FAINT }}>Gérez votre profil, votre entreprise et vos accès</p>
                </div>
                <button onClick={() => setShowLogoutModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-semibold border transition hover:opacity-80"
                  style={{ borderColor: BORDER, color: MUTED, background: CARD }}>
                  <LogOut className="w-3.5 h-3.5" /> Déconnexion
                </button>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">

                {/* ── Colonne gauche */}
                <div className="space-y-5">

                  {/* Profil */}
                  <div className="rounded-2xl overflow-hidden" style={{ background: CARD, boxShadow: SH2 }}>
                    <div className="flex items-center gap-4 px-6 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <Avatar name={user?.nom || 'B2B'} size={52} />
                      <div>
                        <p className="text-base font-bold" style={{ color: TEXT }}>{user?.prenom ? `${user.prenom} ${user.nom || ''}`.trim() : (user?.nom || 'Gestionnaire')}</p>
                        <p className="text-[12px] mt-0.5" style={{ color: FAINT }}>{user?.email || ''}</p>
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ background: `${ORANGE}18`, color: ORANGE }}>
                          Gestionnaire B2B
                        </span>
                      </div>
                    </div>
                    <form onSubmit={handleProfileSave} className="p-6 space-y-4">
                      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: FAINT }}>Informations personnelles</p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {[
                          { k: 'prenom',    label: 'Prénom',     type: 'text'  },
                          { k: 'nom',       label: 'Nom',        type: 'text'  },
                          { k: 'email',     label: 'Email',      type: 'email' },
                          { k: 'telephone', label: 'Téléphone',  type: 'tel'   },
                        ].map(f => (
                          <div key={f.k} className={f.k === 'email' ? 'sm:col-span-2' : ''}>
                            <label className="block text-[11px] font-bold mb-1.5" style={{ color: MUTED }}>{f.label}</label>
                            <input value={profileForm[f.k] || ''} type={f.type}
                              onChange={e => setProfileForm(p => ({ ...p, [f.k]: e.target.value }))}
                              className="w-full rounded-xl px-3.5 py-3 text-sm outline-none transition"
                              style={{ background: BG, border: `1.5px solid ${BORDER}`, color: TEXT }} />
                          </div>
                        ))}
                      </div>
                      {profileMsg && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                          style={{ background: profileMsg.includes('Erreur') ? RED_L : GREEN_L, border: `1px solid ${profileMsg.includes('Erreur') ? '#FECACA' : '#BBF7D0'}` }}>
                          {profileMsg.includes('Erreur')
                            ? <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: RED }} />
                            : <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: GREEN }} />}
                          <p className="text-xs font-semibold" style={{ color: profileMsg.includes('Erreur') ? RED : GREEN }}>{profileMsg}</p>
                        </div>
                      )}
                      <button type="submit"
                        className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                        style={{ background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_D})`, boxShadow: `0 2px 8px ${ORANGE}40` }}>
                        Enregistrer les modifications
                      </button>
                    </form>
                  </div>

                  {/* Sécurité */}
                  <SecurityPanel user={user} accentColor={ORANGE} />
                </div>

                {/* ── Colonne droite */}
                <div className="space-y-5">

                  {/* Entreprise */}
                  {compte && (
                    <div className="rounded-2xl p-6" style={{ background: CARD, boxShadow: SH2 }}>
                      <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: FAINT }}>Entreprise</p>
                      {[
                        { label: 'Raison sociale', value: compte.raisonSociale },
                        { label: 'Secteur', value: compte.secteurActivite },
                        { label: 'RCCM', value: compte.numeroRCCM },
                        { label: 'NIF', value: compte.numeroContribuable },
                        { label: 'Budget mensuel', value: formatFCFA(compte.budgetMensuel || 0) },
                        { label: 'Collaborateurs', value: collabs.length ? `${collabs.length} membre${collabs.length > 1 ? 's' : ''}` : null },
                      ].filter(r => r.value).map(r => (
                        <div key={r.label} className="flex items-center justify-between py-2.5"
                          style={{ borderBottom: `1px solid ${BORDER}` }}>
                          <p className="text-[12px]" style={{ color: MUTED }}>{r.label}</p>
                          <p className="text-[13px] font-semibold" style={{ color: TEXT }}>{r.value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Rapport SYSCOHADA */}
                  <div className="rounded-2xl p-6" style={{ background: CARD, boxShadow: SH2 }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: GREEN_L }}>
                        <FileText className="w-5 h-5" style={{ color: GREEN }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: TEXT }}>Rapport SYSCOHADA</p>
                        <p className="text-[11px]" style={{ color: FAINT }}>TVA 18% · Norme OHADA · Côte d'Ivoire</p>
                      </div>
                    </div>

                    {/* Voir — toujours disponible */}
                    <button onClick={() => setViewingSyscohada(true)}
                      className="w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 transition hover:opacity-80 mb-3"
                      style={{ background: BG, border: `1.5px solid ${BORDER}`, color: TEXT }}>
                      <Eye className="w-4 h-4" /> Consulter le rapport
                    </button>

                    {/* Télécharger — fin de mois uniquement */}
                    {isLastDayOfMonth ? (
                      <button onClick={downloadSyscohadaReport} disabled={downloading}
                        className="w-full rounded-xl py-3 text-sm font-bold text-white flex items-center justify-center gap-2 transition hover:opacity-90"
                        style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_D})`, opacity: downloading ? 0.7 : 1 }}>
                        {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {downloading ? 'Génération…' : 'Télécharger (PDF)'}
                      </button>
                    ) : (
                      <div className="rounded-xl p-3.5 flex items-center gap-3"
                        style={{ background: AMBER_L, border: `1px solid #FDE68A` }}>
                        <Clock className="w-4 h-4 shrink-0" style={{ color: AMBER }} />
                        <div>
                          <p className="text-[12px] font-bold" style={{ color: AMBER }}>Téléchargement le {lastDayDisplay}</p>
                          <p className="text-[11px]" style={{ color: '#92400E' }}>
                            {daysUntilExport > 1 ? `encore ${daysUntilExport} jours` : 'disponible demain'} · Format PDF OHADA
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
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
          <div className="rounded-2xl p-6 w-full max-w-sm" style={{ background: CARD, boxShadow: SH3 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: RED_L }}>
                <LogOut className="w-6 h-6" style={{ color: RED }} />
              </div>
              <div>
                <p className="text-base font-bold" style={{ color: TEXT }}>Déconnexion</p>
                <p className="text-xs" style={{ color: MUTED }}>Vous serez redirigé vers la connexion.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border text-sm font-semibold transition hover:opacity-80"
                style={{ borderColor: BORDER, color: TEXT, background: BG }}>
                Annuler
              </button>
              <button onClick={() => { logout?.(); navigate('/login'); setShowLogoutModal(false); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
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
          <div className="rounded-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
            style={{ background: CARD, boxShadow: SH3 }}>
            <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
              style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
              <div>
                <p className="text-sm font-bold" style={{ color: TEXT }}>{selectedOrder.numero}</p>
                <StatusPill statut={selectedOrder.statut} />
              </div>
              <button onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: BG, color: MUTED }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="rounded-xl p-4 space-y-2" style={{ background: BG }}>
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
                  <div className="rounded-xl overflow-hidden border" style={{ borderColor: BORDER }}>
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
                <div className="rounded-xl border p-4" style={{ borderColor: BORDER }}>
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
                    className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none mb-3"
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
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition"
                    style={{ background: ORANGE, opacity: avisForm.note === 0 || avisSubmitting ? 0.5 : 1 }}>
                    {avisSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" fill="white" />}
                    Envoyer l'avis
                  </button>
                </div>
              )}
              {selectedOrder.avisNote && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: GREEN_L }}>
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
            accentColor="#EA580C"
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
