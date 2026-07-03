/* ═══════════════════════════════════════════════════════════════
   clientDashboard.jsx — Espace personnel du client
   5 onglets : Vue d'ensemble · Commandes · Paiement · Profil · Sécurité
   Données temps réel via WebSocket + cache localStorage 10 min
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Clock, CheckCircle, Star, Download, Eye,
  User, Shield, ChefHat, Package, X, Send,
  Printer, RefreshCcw, Receipt, Truck, ArrowRight,
  UtensilsCrossed, Wallet, AlertCircle, MessageSquare, CreditCard,
  Plus, Trash2, Phone, Mail, MapPin, Camera, TrendingUp, Award,
  Zap, Lock, Key, Smartphone, Globe, ChevronRight, BarChart3,
  Heart, Gift, Percent, BadgeCheck, Star as StarIcon,
  LogOut, Menu as MenuIcon,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { commandesService as svcTs, createCommandesSocket } from '../../services/commandes.service';
import { authAPI, commandesService, paiementsAPI, modulesAPI } from '../../services/api';
import SecurityPanel from '../../components/security/SecurityPanel';
import NotificationBell from '../../components/notifications/NotificationBell';
import { formatFCFA } from '../../utils/formatters';
import OnboardingWizard from '../../components/wizard/OnboardingWizard';

import orangeMoneyLogo  from '../../assets/payments/orange-money.svg';
import mtnMomoLogo      from '../../assets/payments/mtn-momo.svg';
import moovMoneyLogo    from '../../assets/payments/moov-money.svg';
import carteBancaireLogo from '../../assets/payments/carte-bancaire.svg';

/* ── Palette client — orange + blanc ── */
const ACCENT       = '#EA580C';
const ACCENT_DARK  = '#C2410C';
const ACCENT_LIGHT = '#FFF4ED';
const ORANGE       = '#EA580C';
const ORANGE_D     = '#C2410C';
const ORANGE_L     = '#FFF4ED';
const YELLOW       = '#F59E0B';
const YELLOW_L     = '#FFFBEB';
const RED          = '#EF4444';
const RED_L        = '#FFF1F2';
const SURFACE      = '#FFFFFF';
const BORDER       = 'rgba(0,0,0,0.08)';
const DARK         = '#111827';
const NAVY         = '#1A0C00';
const NAVY2        = '#374151';
const BG           = '#FFF4ED';

const ORDER_STATUS = {
  RECUE:        { label: 'Reçue',          bg: '#FFFBEB', color: '#D97706' },
  CONFIRMEE:    { label: 'Confirmée',      bg: '#F0FDF4', color: '#16A34A' },
  EN_PREP:      { label: 'En préparation', bg: '#FEF3C7', color: '#B45309' },
  PRETE:        { label: 'Prête',          bg: '#F0FDF4', color: '#16A34A' },
  EN_LIVRAISON: { label: 'En livraison',   bg: '#EFF6FF', color: '#2563EB' },
  LIVREE:       { label: 'Livrée',         bg: '#F0FDF4', color: '#15803D' },
  ANNULEE:      { label: 'Annulée',        bg: '#FFF1F2', color: '#E11D48' },
};

const STEPS     = ['RECUE', 'CONFIRMEE', 'EN_PREP', 'PRETE', 'EN_LIVRAISON', 'LIVREE'];
const MODE_LABELS = { SUR_PLACE: 'Sur place', EMPORTER: 'À emporter', LIVRAISON: 'Livraison' };
const MODE_ICONS  = { SUR_PLACE: UtensilsCrossed, EMPORTER: Package, LIVRAISON: Truck };

const PAYMENT_TYPES_FALLBACK = [
  { id: 'ORANGE_MONEY',   label: 'Orange Money',  placeholder: '07 XX XX XX XX', logo: orangeMoneyLogo,   color: '#FF6600', bg: '#FFF3EB' },
  { id: 'MTN_MONEY',      label: 'MTN MoMo',       placeholder: '05 XX XX XX XX', logo: mtnMomoLogo,       color: '#FFCC00', bg: '#FFFDE6' },
  { id: 'WAVE',           label: 'Wave',            placeholder: '01 XX XX XX XX', logo: null,              color: '#1DA1F2', bg: '#E8F5FD' },
  { id: 'MOOV_MONEY',     label: 'Moov Money',      placeholder: '01 XX XX XX XX', logo: moovMoneyLogo,     color: '#0066CC', bg: '#E6F0FF' },
  { id: 'CARTE_BANCAIRE', label: 'Carte Bancaire',  placeholder: 'XXXX XXXX XXXX XXXX', logo: carteBancaireLogo, color: '#1A1A2E', bg: '#F0F0F5' },
];

// Mapping provider API → métadonnées UI pour les modes de paiement dynamiques
const PROVIDER_META = {
  ORANGE: { logo: orangeMoneyLogo,   color: '#FF6600', bg: '#FFF3EB', placeholder: '07 XX XX XX XX' },
  MOMO:   { logo: mtnMomoLogo,       color: '#FFCC00', bg: '#FFFDE6', placeholder: '05 XX XX XX XX' },
  WAVE:   { logo: null,              color: '#1DA1F2', bg: '#E8F5FD', placeholder: '01 XX XX XX XX' },
  MOOV:   { logo: moovMoneyLogo,     color: '#0066CC', bg: '#E6F0FF', placeholder: '01 XX XX XX XX' },
  CARTE:  { logo: carteBancaireLogo, color: '#1A1A2E', bg: '#F0F0F5', placeholder: 'XXXX XXXX XXXX XXXX' },
};
const mapApiMethodToType = (m) => {
  const meta = PROVIDER_META[m.provider] || {};
  return {
    id:          m.provider || m.id,
    label:       m.label,
    placeholder: meta.placeholder || 'XXXXXXXXXX',
    logo:        meta.logo !== undefined ? meta.logo : null,
    color:       meta.color  || '#8B6E50',
    bg:          meta.bg     || '#F9FAFB',
  };
};

function pmKey(uid)              { return uid ? `saved_pm:${uid}` : 'saved_pm'; }
function loadSavedPM(uid)        { try { return JSON.parse(localStorage.getItem(pmKey(uid)) || '[]'); } catch { return []; } }
function savePM(uid, list)       { localStorage.setItem(pmKey(uid), JSON.stringify(list)); }


function ordersKey(uid)   { return uid ? `orders:${uid}` : 'orders'; }
function avisKey(uid)     { return uid ? `avis_given:${uid}` : 'avis_given'; }

function loadCachedOrders(uid) {
  try {
    const raw = localStorage.getItem(ordersKey(uid));
    if (!raw) return [];
    const { orders, ts } = JSON.parse(raw);
    if (Date.now() - ts < 10 * 60 * 1000) return orders || [];
  } catch { /* ignore */ }
  return [];
}
function saveOrdersCache(uid, orders) {
  try { localStorage.setItem(ordersKey(uid), JSON.stringify({ orders, ts: Date.now() })); } catch { /* ignore */ }
}
function loadAvisGiven(uid) {
  try { return new Set(JSON.parse(localStorage.getItem(avisKey(uid)) || '[]')); } catch { return new Set(); }
}
function saveAvisGiven(uid, set) {
  try { localStorage.setItem(avisKey(uid), JSON.stringify([...set])); } catch { /* ignore */ }
}

/* ── Modal reçu ── */
function ReceiptModal({ order, onClose, onDownload }) {
  const printRef = useRef(null);
  const date  = new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const total = order.total || order.montantTotal || 0;

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Reçu ${order.numero}</title><style>
      body{font-family:sans-serif;max-width:360px;margin:20px auto;color:#1a1a1a}
      h2{margin:0 0 4px}p{margin:2px 0;font-size:13px;color:#555}
      .divider{border:none;border-top:1px dashed #ccc;margin:12px 0}
      .row{display:flex;justify-content:space-between;font-size:13px;margin:4px 0}
      .total{font-size:16px;font-weight:bold;color:${ACCENT}}
    </style></head><body>${content}</body></html>`);
    win.document.close(); win.print();
  };

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(139,110,80,0.45)', backdropFilter: 'blur(2px)', zIndex: 999, animation: 'fadeIn 0.2s ease' }} />
      {/* Panel */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16, pointerEvents: 'none' }}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
        style={{ animation: 'slideInUp 0.28s cubic-bezier(0.32,0.72,0,1)', pointerEvents: 'auto' }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: ACCENT }}>
          <div>
            <h3 className="text-white font-extrabold flex items-center gap-2">
              <Receipt className="w-4 h-4" /> Reçu de commande
            </h3>
            <p className="text-white/70 text-xs">#{order.numero}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          <div ref={printRef}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>RestoDici</h2>
            <p style={{ margin: '0 0 2px', fontSize: 13, color: '#555' }}>{date}</p>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#555' }}>
              {MODE_LABELS[order.modeLivraison] || order.modeLivraison} · #{order.numero}
            </p>
            <hr style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
            {(order.lignes || []).map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, margin: '4px 0' }}>
                <span>{l.quantite}× {l.article?.nom || l.nom}</span>
                <span>{formatFCFA((l.prixUnitaire || l.prix || 0) * l.quantite)}</span>
              </div>
            ))}
            <hr style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 'bold', color: ACCENT }}>
              <span>Total</span><span>{formatFCFA(total)}</span>
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: ACCENT_LIGHT, color: ACCENT_DARK }}>
            <Printer className="w-3.5 h-3.5" /> Imprimer
          </button>
          <button onClick={() => onDownload(order.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white"
            style={{ background: ACCENT }}>
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>
      </div>
    </>
  );
}

/* ── Modal avis ── */
function AvisModal({ order, onClose, onSubmit }) {
  const [note, setNote] = useState(5);
  const [commentaire, setCommentaire] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try { await onSubmit(order.id, note, commentaire); onClose(); }
    finally { setSubmitting(false); }
  };

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(139,110,80,0.45)', backdropFilter: 'blur(2px)', zIndex: 999, animation: 'fadeIn 0.2s ease' }} />
      {/* Panel */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '92vh', background: '#fff', borderRadius: '20px 20px 0 0', zIndex: 1000, animation: 'slideInUp 0.28s cubic-bezier(0.32,0.72,0,1)', overflowY: 'auto' }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: ACCENT }}>
          <div>
            <h3 className="text-white font-extrabold">Laisser un avis</h3>
            <p className="text-white/70 text-xs">{order.restaurant?.nom || 'Restaurant'} · #{order.numero}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-[#1A1A1A] mb-3">Votre note</p>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setNote(n)}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all"
                  style={{ background: n <= note ? ACCENT : ACCENT_LIGHT, transform: n === note ? 'scale(1.15)' : 'scale(1)' }}>
                  <Star className="w-5 h-5" fill={n <= note ? '#fff' : 'none'} stroke={n <= note ? '#fff' : ACCENT} />
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-[#8B6E50] mt-2 font-medium">
              {['', 'Très décevant', 'Décevant', 'Correct', 'Bien', 'Excellent !'][note]}
            </p>
          </div>
          <div>
            <label className="text-sm font-semibold text-[#1A1A1A] block mb-1.5">Commentaire (optionnel)</label>
            <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)}
              rows={3} placeholder="Partagez votre expérience…"
              className="w-full border rounded-2xl px-4 py-3 text-sm text-[#1A1A1A] placeholder-gray-400 focus:outline-none resize-none"
              style={{ background: SURFACE, borderColor: BORDER }} />
          </div>
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 text-white transition"
            style={{ background: ACCENT }}>
            {submitting
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Send className="w-3.5 h-3.5" />}
            Envoyer l'avis
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Carte commande active ── */
function ActiveOrderCard({ order, onTrack, onReceipt, onConfirmReceipt }) {
  const idx = STEPS.indexOf(order.statut);
  const progress = idx >= 0 ? Math.round(((idx + 1) / STEPS.length) * 100) : 0;
  const status = ORDER_STATUS[order.statut] || { label: order.statut, bg: '#F3F4F6', color: '#8B6E50' };
  const ModeIcon = MODE_ICONS[order.modeLivraison] || Package;

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: BORDER, background: '#fff' }}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: ACCENT_LIGHT }}>
          <ModeIcon className="w-4 h-4" style={{ color: ACCENT }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-[#1A0C00]">#{order.numero}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: status.bg, color: status.color }}>
              {status.label}
            </span>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </div>
          <p className="text-xs text-[#9CA3AF] mt-1">
            {order.restaurant?.nom && `${order.restaurant.nom} · `}
            {MODE_LABELS[order.modeLivraison]}
          </p>
        </div>
        <p className="text-sm font-bold text-[#1A0C00] shrink-0">
          {formatFCFA(order.montantTotal || 0)} <span className="text-xs font-normal text-[#9CA3AF]">CFA</span>
        </p>
      </div>
      <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden mb-3">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, background: order.statut === 'LIVREE' ? '#16A34A' : ACCENT }} />
      </div>
      <div className="flex gap-2">
        <button onClick={onTrack}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-[#374151] border transition hover:border-[#973100] hover:text-[#973100]"
          style={{ borderColor: BORDER }}>
          <Eye className="w-3.5 h-3.5" /> Suivre
        </button>
        {order.statut === 'EN_LIVRAISON' && !order.receptionConfirmeeAt && onConfirmReceipt && (
          <button onClick={() => onConfirmReceipt(order)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white"
            style={{ background: '#16A34A' }}>
            <CheckCircle className="w-3.5 h-3.5" /> Reçu
          </button>
        )}
        {order.estPaye && order.statut !== 'EN_LIVRAISON' && (
          <button onClick={onReceipt}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white"
            style={{ background: ACCENT }}>
            <Receipt className="w-3.5 h-3.5" /> Reçu
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Ligne historique ── */
function PastOrderRow({ order, onReceipt, onDownload, onAvis, canAvis, onReorder }) {
  const date = new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
  const status = ORDER_STATUS[order.statut] || { label: order.statut, bg: '#F3F4F6', color: '#8B6E50' };

  return (
    <div className="rounded-3xl border bg-white p-4 shadow-sm grid gap-3 sm:grid-cols-[1fr_auto] items-center"
      style={{ borderColor: BORDER }}>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: order.statut === 'ANNULEE' ? '#FFF1F2' : '#F0FDF4' }}>
          {order.statut === 'ANNULEE'
            ? <X className="w-4 h-4 text-red-500" />
            : <CheckCircle className="w-4 h-4 text-green-600" />}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[#1A0C00]">#{order.numero}</span>
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full"
              style={{ background: status.bg, color: status.color }}>{status.label}</span>
          </div>
          <p className="text-xs text-[#9CA3AF] mt-1">
            {date}{order.restaurant?.nom ? ` · ${order.restaurant.nom}` : ''} · {order.lignes?.length || 0} article{(order.lignes?.length || 0) > 1 ? 's' : ''}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <p className="text-sm font-bold text-[#1A0C00]">{formatFCFA(order.montantTotal || 0)}</p>
        {(order.estPaye || order.statut === 'LIVREE') && (
          <button onClick={onReceipt} title="Voir reçu"
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition"
            style={{ background: ACCENT_LIGHT, color: ACCENT_DARK }}>
            <Receipt className="w-4 h-4" />
          </button>
        )}
        <button onClick={onDownload} title="Télécharger PDF"
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-[#8B6E50] bg-[#F3F4F6] transition hover:text-[#1A0C00]">
          <Download className="w-4 h-4" />
        </button>
        {order.statut === 'LIVREE' && onReorder && (
          <button onClick={() => onReorder(order)} title="Commander à nouveau"
            className="flex items-center gap-2 px-3 h-10 rounded-2xl text-xs font-semibold text-white"
            style={{ background: ACCENT_DARK }}>
            <RefreshCcw className="w-3 h-3" /> Renouveler
          </button>
        )}
        {canAvis && (
          <button onClick={onAvis} title="Laisser un avis"
            className="flex items-center gap-2 px-3 h-10 rounded-2xl text-xs font-semibold text-white"
            style={{ background: ACCENT }}>
            <Star className="w-3 h-3" /> Avis
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Prompt avis ── */
function AvisPromptCard({ order, onAvis }) {
  const items = (order.lignes || []).slice(0, 2).map(l => l.article?.nom || 'Article').join(', ');
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed"
      style={{ borderColor: ACCENT + '40', background: ACCENT_LIGHT + '60' }}>
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: ACCENT }}>
        <MessageSquare className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#1A0C00]">{order.restaurant?.nom || 'Votre commande'}</p>
        <p className="text-xs text-[#8B6E50] truncate">{items || 'Commande livrée'}</p>
      </div>
      <button onClick={onAvis}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white shrink-0 transition"
        style={{ background: ACCENT }}>
        <Star className="w-3.5 h-3.5" /> Donner un avis
      </button>
    </div>
  );
}

/* ── Modal suivi ── */
function OrderTrackModal({ order, onClose, onReceipt }) {
  const currentIdx = STEPS.indexOf(order.statut);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    svcTs.getHistory(order.id)
      .then(res => setHistory(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, [order.id]);

  const tsForStep = (step) => {
    const entry = history.find(h => h.statutNouvel === step);
    if (!entry) return null;
    return new Date(entry.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(139,110,80,0.45)', backdropFilter: 'blur(2px)', zIndex: 999, animation: 'fadeIn 0.2s ease' }} />
      {/* Panel */}
      <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 420, maxWidth: '95vw', background: '#fff', zIndex: 1000, animation: 'slideInRight 0.28s cubic-bezier(0.32,0.72,0,1)', overflowY: 'auto' }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: ACCENT }}>
          <div>
            <h3 className="text-white font-extrabold">Suivi commande</h3>
            <p className="text-white/70 text-xs">#{order.numero} · {MODE_LABELS[order.modeLivraison]}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">
          <div className="space-y-2.5">
            {STEPS.map((step, i) => {
              const done   = i < currentIdx;
              const active = i === currentIdx;
              const ts     = tsForStep(step);
              return (
                <div key={step} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{
                      background: active ? ORANGE : done ? ACCENT : '#F3F4F6',
                      color: active || done ? '#fff' : '#9CA3AF',
                      boxShadow: active ? `0 0 0 4px ${ORANGE_L}` : 'none',
                    }}>
                    {done ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <p className="text-sm font-medium flex-1"
                    style={{ color: active ? ORANGE : done ? ACCENT : '#9CA3AF' }}>
                    {ORDER_STATUS[step]?.label || step}
                  </p>
                  {ts && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: done ? ACCENT_LIGHT : active ? ORANGE_L : '#F3F4F6', color: done ? ACCENT : active ? ORANGE : '#9CA3AF' }}>
                      {ts}
                    </span>
                  )}
                  {active && !ts && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: ORANGE_L, color: ORANGE }}>
                      En cours
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t space-y-1.5" style={{ borderColor: BORDER }}>
            {(order.lignes || []).map((l, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-[#8B6E50]">{l.quantite}× {l.article?.nom || l.nom}</span>
                <span className="font-semibold text-[#1A1A1A]">{formatFCFA((l.prixUnitaire || l.prix || 0) * l.quantite)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-[#1A1A1A] pt-2 border-t" style={{ borderColor: BORDER }}>
              <span>Total</span>
              <span style={{ color: ACCENT }}>{formatFCFA(order.montantTotal || 0)}</span>
            </div>
          </div>
          {(order.estPaye || order.statut === 'LIVREE') && (
            <button onClick={() => { onClose(); onReceipt(order); }}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white"
              style={{ background: ACCENT }}>
              <Receipt className="w-3.5 h-3.5" /> Voir le reçu
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   ──  OVERVIEW TAB  ──────────────────────────────────────────────
   ════════════════════════════════════════════════════════════════ */
function OverviewTab({ user, orders, activeOrders, delivered, cancelled, pendingAvis, totalSpent, avgOrder, loadingOrders, canAvis, setTab, setTrackOrder, setReceiptOrder, setAvisOrder, downloadPdf, handleReorder, handleConfirmReceipt }) {
  const initials = ((user?.prenom || user?.nom || 'U').charAt(0)).toUpperCase();
  const firstName = user?.prenom || user?.nom?.split(' ')[0] || 'Vous';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <div className="space-y-6">

      {/* ── Hero ── */}
      <div className="rounded-3xl overflow-hidden bg-white" style={{ border: `1.5px solid ${ACCENT}22`, boxShadow: `0 4px 20px ${ACCENT}18` }}>
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-2xl text-white shrink-0"
            style={{ background: ACCENT }}>
            {initials}
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: ACCENT }}>{greeting}</p>
            <h2 className="font-extrabold text-2xl leading-tight" style={{ color: '#111827' }}>{firstName} !</h2>
            <p className="text-sm mt-1 text-[#9CA3AF]">Commandez, suivez, savourez.</p>
          </div>
          <Link to="/menu"
            className="shrink-0 flex items-center gap-2 rounded-xl px-5 py-3 font-bold text-sm text-white"
            style={{ background: ACCENT, textDecoration: 'none' }}>
            <ChefHat className="w-4 h-4" /> Commander
          </Link>
        </div>
        <div className="grid grid-cols-3" style={{ borderTop: `1px solid ${ACCENT}18` }}>
          {[
            { label: 'En cours', value: loadingOrders ? '—' : activeOrders.length },
            { label: 'Livrées',  value: loadingOrders ? '—' : delivered.length },
            { label: 'Dépensé',  value: loadingOrders ? '—' : formatFCFA(totalSpent) },
          ].map((s, i) => (
            <div key={i} className="py-4 text-center"
              style={{ borderRight: i < 2 ? `1px solid ${ACCENT}18` : 'none' }}>
              <p className="font-extrabold text-xl" style={{ color: ACCENT }}>{s.value}</p>
              <p className="text-xs mt-0.5 text-[#9CA3AF]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPI ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'En cours',    value: loadingOrders ? '—' : activeOrders.length,  sub: 'commandes actives' },
          { label: 'Dépensé',     value: loadingOrders ? '—' : formatFCFA(totalSpent), sub: avgOrder > 0 ? `moy. ${formatFCFA(avgOrder)}` : '—' },
          { label: 'Livrées',     value: loadingOrders ? '—' : delivered.length,     sub: `sur ${orders.length} au total` },
          { label: 'Avis',        value: loadingOrders ? '—' : pendingAvis.length,   sub: 'en attente' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border" style={{ borderColor: BORDER }}>
            <p className="text-2xl font-extrabold mb-1" style={{ color: ACCENT }}>{kpi.value}</p>
            <p className="text-sm font-bold text-[#111827]">{kpi.label}</p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── 2-col layout: commandes actives + sidebar ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Active orders */}
        <div className="lg:col-span-2 space-y-5">

          {/* Avis pending */}
          {!loadingOrders && pendingAvis.length > 0 && (
            <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: BORDER }}>
              <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: BORDER }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: YELLOW_L }}>
                  <Star className="w-3.5 h-3.5" style={{ color: YELLOW }} />
                </div>
                <span className="text-sm font-bold text-[#1A0C00]">Vos avis nous intéressent</span>
                <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: YELLOW, color: '#fff' }}>
                  {pendingAvis.length} en attente
                </span>
              </div>
              <div className="p-4 space-y-3">
                {pendingAvis.slice(0, 3).map(o => (
                  <AvisPromptCard key={o.id} order={o} onAvis={() => setAvisOrder(o)} />
                ))}
              </div>
            </div>
          )}

          {/* Active orders */}
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: BORDER }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: ORANGE_L }}>
                  <Package className="w-3.5 h-3.5" style={{ color: ORANGE }} />
                </div>
                <span className="text-sm font-bold text-[#1A0C00]">Commandes en cours</span>
                {activeOrders.length > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: ORANGE_L, color: ORANGE }}>
                    {activeOrders.length}
                  </span>
                )}
              </div>
              <button onClick={() => setTab('orders')}
                className="flex items-center gap-1 text-xs font-semibold" style={{ color: ORANGE }}>
                Voir tout <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {loadingOrders ? (
              <div className="p-5 space-y-3">
                {[1, 2].map(i => <div key={i} className="h-24 rounded-xl bg-[#F3F4F6] animate-pulse" />)}
              </div>
            ) : activeOrders.length === 0 ? (
              <div className="py-14 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: ORANGE_L }}>
                  <ShoppingBag className="w-7 h-7" style={{ color: ORANGE }} />
                </div>
                <p className="text-sm font-semibold text-[#374151] mb-1">Aucune commande en cours</p>
                <p className="text-xs text-[#9CA3AF] mb-4">Passez votre première commande !</p>
                <Link to="/menu"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_D})`, textDecoration: 'none', boxShadow: `0 4px 14px ${ORANGE}44` }}>
                  <ChefHat className="w-4 h-4" /> Parcourir le menu
                </Link>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {activeOrders.slice(0, 3).map(o => (
                  <ActiveOrderCard key={o.id} order={o}
                    onTrack={() => setTrackOrder(o)}
                    onReceipt={() => setReceiptOrder(o)}
                    onConfirmReceipt={handleConfirmReceipt} />
                ))}
              </div>
            )}
          </div>

          {/* Historique récent */}
          {delivered.length > 0 && (
            <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: BORDER }}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <span className="text-sm font-bold text-[#1A0C00]">Historique récent</span>
                </div>
                <button onClick={() => setTab('orders')}
                  className="text-xs font-semibold flex items-center gap-1" style={{ color: ACCENT }}>
                  Historique complet <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                {delivered.slice(0, 4).map(o => (
                  <PastOrderRow key={o.id} order={o}
                    onReceipt={() => setReceiptOrder(o)}
                    onDownload={() => downloadPdf(o.id)}
                    onAvis={() => setAvisOrder(o)}
                    canAvis={canAvis(o)}
                    onReorder={handleReorder} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">

          {/* CTA Commander */}
          <div className="rounded-2xl p-5 text-white space-y-4"
            style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)` }}>
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-lg leading-tight">Nouvelle commande</p>
              <p className="text-sm text-white/75 mt-1">Plats frais disponibles, livraison express</p>
            </div>
            <Link to="/menu"
              className="flex items-center justify-center gap-2 bg-white rounded-xl py-3 text-sm font-extrabold"
              style={{ color: ACCENT, textDecoration: 'none' }}>
              Parcourir le menu <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Profil rapide */}
          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: BORDER }}>
            <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-4">Mon compte</p>
            {[
              { label: 'Profil', icon: User, tab: 'profile' },
              { label: 'Paiement', icon: CreditCard, tab: 'payment' },
              { label: 'Sécurité', icon: Shield, tab: 'security' },
            ].map(item => (
              <button key={item.tab} onClick={() => setTab(item.tab)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#374151] hover:text-[#1A0C00] transition-colors mb-1"
                style={{ background: 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.background = ACCENT_LIGHT}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: ACCENT_LIGHT }}>
                  <item.icon className="w-4 h-4" style={{ color: ACCENT }} />
                </div>
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
              </button>
            ))}
          </div>

          {/* Dernière livraison */}
          {delivered.length > 0 && (
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: BORDER }}>
              <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Dernière livraison</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1A0C00]">#{delivered[0].numero}</p>
                  <p className="text-xs text-[#9CA3AF]">{formatFCFA(delivered[0].montantTotal || 0)}</p>
                </div>
                <button onClick={() => setReceiptOrder(delivered[0])}
                  className="p-2 rounded-xl" style={{ background: ACCENT_LIGHT }}>
                  <Receipt className="w-4 h-4" style={{ color: ACCENT }} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ──  PROFILE TAB  ───────────────────────────────────────────────
   ════════════════════════════════════════════════════════════════ */
function ProfileTab({ user, profileForm, setProfileForm, profileMsg, handleProfileSave, orders, totalSpent, delivered, savedAddresses, addrForm, setAddrForm, addAddress, removeAddress }) {
  const initials = ((user?.prenom || user?.nom || 'U').charAt(0)).toUpperCase();
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : 'Nouveau membre';

  const filled = [profileForm.nom, profileForm.email, profileForm.telephone].filter(Boolean).length;
  const completion = Math.round((filled / 3) * 100);

  return (
    <div className="space-y-5">

      {/* ── Carte identité ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: BORDER, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        {/* Bande orange haut */}
        <div style={{ height: 4, background: ACCENT }} />
        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl"
              style={{ background: ACCENT, boxShadow: `0 4px 16px ${ACCENT}44` }}
            >
              {initials}
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-white border border-gray-100 shadow flex items-center justify-center cursor-pointer">
              <Camera className="w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black text-[#1A0C00] leading-tight">
              {user?.prenom || user?.nom || 'Mon profil'}
            </h2>
            <p className="text-sm text-[#8B6E50] mt-0.5 truncate">{user?.email || ''}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100">
                <BadgeCheck className="w-3 h-3" /> Compte vérifié
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                Membre depuis {memberSince}
              </span>
            </div>
          </div>

          {/* Complétion */}
          <div className="shrink-0 sm:text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Profil complété</p>
            <div className="flex items-center gap-3 sm:justify-end">
              <div className="w-32 h-1.5 rounded-full bg-gray-100">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${completion}%`, background: completion === 100 ? '#10B981' : ACCENT }} />
              </div>
              <span className="text-base font-black" style={{ color: completion === 100 ? '#10B981' : ACCENT }}>
                {completion}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Commandes', value: orders.length, icon: ShoppingBag, accent: ACCENT },
          { label: 'Total dépensé', value: formatFCFA(totalSpent), icon: Wallet, accent: '#1A0C00' },
          { label: 'Livrées', value: delivered.length, icon: CheckCircle, accent: '#10B981' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border p-4 flex flex-col gap-2" style={{ borderColor: BORDER, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <s.icon className="w-5 h-5" style={{ color: s.accent }} />
            <p className="text-xl font-black text-[#1A0C00]">{s.value}</p>
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Formulaire ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: BORDER, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
          <div>
            <h3 className="text-sm font-black text-[#1A0C00]">Informations personnelles</h3>
            <p className="text-xs text-gray-400 mt-0.5">Gérez vos coordonnées de compte</p>
          </div>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: ACCENT_LIGHT }}>
            <User className="w-4 h-4" style={{ color: ACCENT }} />
          </div>
        </div>

        <form onSubmit={handleProfileSave} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nom */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Nom complet</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-300 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={profileForm.nom}
                  onChange={e => setProfileForm(p => ({ ...p, nom: e.target.value }))}
                  placeholder="Votre nom complet"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-[#1A0C00] placeholder-gray-300 outline-none border transition-colors"
                  style={{ borderColor: 'rgba(0,0,0,0.1)', background: '#FAFAFA' }}
                  onFocus={e => { e.target.style.borderColor = ACCENT; e.target.style.background = '#fff'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.1)'; e.target.style.background = '#FAFAFA'; }}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-300 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="votre@email.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-[#1A0C00] placeholder-gray-300 outline-none border transition-colors"
                  style={{ borderColor: 'rgba(0,0,0,0.1)', background: '#FAFAFA' }}
                  onFocus={e => { e.target.style.borderColor = ACCENT; e.target.style.background = '#fff'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.1)'; e.target.style.background = '#FAFAFA'; }}
                />
              </div>
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Téléphone</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-300 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  value={profileForm.telephone}
                  onChange={e => setProfileForm(p => ({ ...p, telephone: e.target.value }))}
                  placeholder="07 XX XX XX XX"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-[#1A0C00] placeholder-gray-300 outline-none border transition-colors"
                  style={{ borderColor: 'rgba(0,0,0,0.1)', background: '#FAFAFA' }}
                  onFocus={e => { e.target.style.borderColor = ACCENT; e.target.style.background = '#fff'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.1)'; e.target.style.background = '#FAFAFA'; }}
                />
              </div>
            </div>
          </div>

          {profileMsg && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border"
              style={{
                background: profileMsg.includes('Erreur') ? '#FFF1F2' : '#F0FDF4',
                borderColor: profileMsg.includes('Erreur') ? '#FECDD3' : '#BBF7D0',
              }}>
              {profileMsg.includes('Erreur')
                ? <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                : <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />}
              <p className="text-sm font-semibold" style={{ color: profileMsg.includes('Erreur') ? '#DC2626' : '#16A34A' }}>
                {profileMsg}
              </p>
            </div>
          )}

          <div className="flex items-center gap-4 pt-1">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: ACCENT, boxShadow: `0 2px 12px ${ACCENT}33` }}
            >
              <CheckCircle className="w-4 h-4" /> Enregistrer
            </button>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Lock className="w-3 h-3" /> Données sécurisées
            </div>
          </div>
        </form>
      </div>

      {/* ── Adresses de livraison ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: BORDER }}>
        <div className="px-6 py-5 border-b flex items-center gap-3" style={{ borderColor: BORDER }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: ACCENT_LIGHT }}>
            <MapPin className="w-4 h-4" style={{ color: ACCENT }} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#1A0C00]">Adresses de livraison</h3>
            <p className="text-xs text-[#9CA3AF]">{savedAddresses.length} adresse{savedAddresses.length !== 1 ? 's' : ''} enregistrée{savedAddresses.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="p-6 space-y-3">
          {savedAddresses.length === 0 ? (
            <p className="text-sm text-[#9CA3AF] text-center py-4">Aucune adresse enregistrée</p>
          ) : (
            savedAddresses.map(a => (
              <div key={a.id} className="flex items-start gap-3 p-4 rounded-xl border" style={{ borderColor: BORDER, background: SURFACE }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: ACCENT_LIGHT }}>
                  <MapPin className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1A0C00]">{a.label}</p>
                  <p className="text-xs text-[#8B6E50] mt-0.5 truncate">{a.adresse}</p>
                </div>
                <button onClick={() => removeAddress(a.id)} className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-red-50" title="Supprimer">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            ))
          )}
          <form onSubmit={addAddress} className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text" value={addrForm.label} onChange={e => setAddrForm(p => ({ ...p, label: e.target.value }))}
              placeholder="Libellé (ex: Maison)"
              className="sm:col-span-1 px-4 py-3 rounded-xl text-sm outline-none transition"
              style={{ background: SURFACE, border: '1.5px solid rgba(0,0,0,0.08)' }}
              onFocus={e => e.target.style.borderColor = ACCENT}
              onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'}
            />
            <input
              type="text" value={addrForm.adresse} onChange={e => setAddrForm(p => ({ ...p, adresse: e.target.value }))}
              placeholder="Adresse complète"
              className="sm:col-span-1 px-4 py-3 rounded-xl text-sm outline-none transition"
              style={{ background: SURFACE, border: '1.5px solid rgba(0,0,0,0.08)' }}
              onFocus={e => e.target.style.borderColor = ACCENT}
              onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'}
            />
            <button type="submit" className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition hover:opacity-90" style={{ background: `linear-gradient(135deg,${ACCENT},${ACCENT_DARK})` }}>
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ──  PAYMENT TAB  ───────────────────────────────────────────────
   ════════════════════════════════════════════════════════════════ */
function PaymentTab({ savedPM, setSavedPM, pmForm, setPmForm, pmMsg, setPmMsg, addPM, removePM, setDefaultPM, userId, paymentTypes }) {
  const PAYMENT_TYPES = paymentTypes || PAYMENT_TYPES_FALLBACK;
  const currentType = PAYMENT_TYPES.find(t => t.id === pmForm.type) || PAYMENT_TYPES[0];

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
        style={{ background: `linear-gradient(135deg, #1A1A2E 0%, #16213E 60%, #0F3460 100%)` }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
            <CreditCard className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Moyens de paiement</h2>
            <p className="text-white/60 text-sm mt-1">
              {savedPM.length} moyen{savedPM.length !== 1 ? 's' : ''} enregistré{savedPM.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="sm:ml-auto flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-white/80 text-xs font-semibold">Stockage local sécurisé</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Cartes enregistrées ────────────────────────────────────── */}
        <div className="space-y-4">
          <h3 className="text-base font-extrabold text-[#1A0C00]">Cartes & comptes enregistrés</h3>

          {savedPM.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed p-10 text-center"
              style={{ borderColor: ACCENT + '30' }}>
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: ACCENT_LIGHT }}>
                <CreditCard className="w-7 h-7" style={{ color: ACCENT }} />
              </div>
              <p className="text-sm font-bold text-[#374151] mb-1">Aucun moyen de paiement enregistré</p>
              <p className="text-xs text-[#9CA3AF]">Ajoutez Orange Money, MTN MoMo ou une carte pour payer plus vite.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedPM.map(m => {
                const type = PAYMENT_TYPES.find(t => t.id === m.type) || PAYMENT_TYPES[0];
                return (
                  <div key={m.id} className="relative overflow-hidden rounded-2xl border p-5 transition hover:shadow-md"
                    style={{ borderColor: m.isDefault ? type.color + '40' : BORDER, background: '#fff',
                      boxShadow: m.isDefault ? `0 0 0 2px ${type.color}25` : 'none' }}>

                    {m.isDefault && (
                      <div className="absolute top-3 right-3">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full text-white"
                          style={{ background: type.color }}>
                          Par défaut
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
                        style={{ background: type.bg, border: `1px solid ${type.color}20` }}>
                        {type.logo
                          ? <img src={type.logo} alt={type.label} className="w-10 h-10 object-contain" />
                          : <CreditCard className="w-6 h-6" style={{ color: type.color }} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-extrabold text-[#1A0C00] truncate">{m.label}</p>
                        <p className="text-xs font-medium mt-0.5" style={{ color: type.color }}>{type.label}</p>
                        {m.numero && (
                          <p className="text-xs text-[#9CA3AF] mt-0.5 font-mono">
                            {'•'.repeat(4)} {m.numero.slice(-4)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!m.isDefault && (
                          <button onClick={() => setDefaultPM(m.id)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition"
                            style={{ color: ACCENT, borderColor: ACCENT + '40', background: ACCENT_LIGHT }}>
                            Défaut
                          </button>
                        )}
                        <button onClick={() => removePM(m.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-red-50"
                          title="Supprimer">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Formulaire ajout ───────────────────────────────────────── */}
        <div>
          <h3 className="text-base font-extrabold text-[#1A0C00] mb-4">Ajouter un moyen de paiement</h3>
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: BORDER }}>

            {/* Type selector */}
            <div className="p-5 border-b" style={{ borderColor: BORDER }}>
              <label className="block text-xs font-bold text-[#374151] mb-3 uppercase tracking-wider">Type de compte</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {PAYMENT_TYPES.map(t => (
                  <button key={t.id} type="button"
                    onClick={() => setPmForm(p => ({ ...p, type: t.id }))}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition"
                    style={{
                      borderColor: pmForm.type === t.id ? t.color : 'rgba(0,0,0,0.07)',
                      background: pmForm.type === t.id ? t.bg : '#fff',
                    }}>
                    <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center"
                      style={{ background: t.bg }}>
                      {t.logo
                        ? <img src={t.logo} alt={t.label} className="w-8 h-8 object-contain" />
                        : <CreditCard className="w-5 h-5" style={{ color: t.color }} />}
                    </div>
                    <span className="text-[10px] font-bold text-center leading-tight" style={{ color: t.color }}>
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fields */}
            <form onSubmit={addPM} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#374151] mb-2 uppercase tracking-wider">
                  Libellé <span className="text-red-400">*</span>
                </label>
                <input
                  type="text" required
                  placeholder={`Mon ${currentType.label}`}
                  value={pmForm.label}
                  onChange={e => setPmForm(p => ({ ...p, label: e.target.value }))}
                  className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition"
                  style={{ background: SURFACE, border: '1.5px solid rgba(0,0,0,0.08)' }}
                  onFocus={e => e.target.style.borderColor = ACCENT}
                  onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#374151] mb-2 uppercase tracking-wider">
                  Numéro <span className="text-[#9CA3AF]">(optionnel)</span>
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Phone className="w-4 h-4 text-[#9CA3AF]" />
                  </div>
                  <input
                    type="text"
                    placeholder={currentType.placeholder}
                    value={pmForm.numero}
                    onChange={e => setPmForm(p => ({ ...p, numero: e.target.value }))}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none transition"
                    style={{ background: SURFACE, border: '1.5px solid rgba(0,0,0,0.08)' }}
                    onFocus={e => e.target.style.borderColor = ACCENT}
                    onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'}
                  />
                </div>
              </div>

              {pmMsg && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                  style={{
                    background: pmMsg.includes('Erreur') || pmMsg.includes('Ajoutez') ? '#FFF1F2' : '#F0FDF4',
                    border: `1px solid ${pmMsg.includes('Erreur') || pmMsg.includes('Ajoutez') ? '#FECDD3' : '#BBF7D0'}`,
                  }}>
                  <p className="text-sm font-semibold"
                    style={{ color: pmMsg.includes('Erreur') || pmMsg.includes('Ajoutez') ? '#DC2626' : '#16A34A' }}>
                    {pmMsg}
                  </p>
                </div>
              )}

              <button type="submit"
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-extrabold text-sm text-white transition hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)`, boxShadow: `0 4px 16px ${ACCENT}44` }}>
                <Plus className="w-4 h-4" /> Ajouter ce moyen
              </button>
            </form>
          </div>

          <p className="text-xs text-[#9CA3AF] text-center mt-3 px-4">
            Vos informations sont stockées localement et ne sont jamais partagées.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ──  SECURITY TAB  ──────────────────────────────────────────────
   ════════════════════════════════════════════════════════════════ */
function SecurityTab({ user }) {
  const hasPhone  = !!user?.telephone;
  const has2FA    = !!user?.twoFactorEnabled;
  const hasEmail  = !!user?.email;

  const securityScore = [hasEmail, hasPhone, has2FA, true].filter(Boolean).length;
  const scorePercent  = Math.round((securityScore / 4) * 100);
  const scoreColor    = scorePercent >= 75 ? '#10B981' : scorePercent >= 50 ? ACCENT : '#EF4444';
  const scoreLabel    = scorePercent >= 75 ? 'Excellent' : scorePercent >= 50 ? 'Moyen' : 'Faible';

  return (
    <div className="space-y-6">

      {/* ── Score sécurité ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
        style={{ background: `linear-gradient(135deg, #973100 0%, #C04000 100%)` }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Score ring */}
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <circle cx="48" cy="48" r="40" fill="none" stroke={scoreColor} strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - scorePercent / 100)}`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-extrabold text-white">{scorePercent}%</span>
            </div>
          </div>

          <div>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Score de sécurité</p>
            <h2 className="text-2xl font-extrabold text-white mb-2">{scoreLabel}</h2>
            <p className="text-white/60 text-sm">
              {scorePercent < 100
                ? 'Activez la 2FA pour maximiser la protection de votre compte.'
                : 'Votre compte est parfaitement protégé.'}
            </p>
          </div>

          {/* Checklist */}
          <div className="sm:ml-auto space-y-2">
            {[
              { label: 'Email vérifié',        done: hasEmail },
              { label: 'Téléphone renseigné',  done: hasPhone },
              { label: 'Mot de passe fort',     done: true },
              { label: 'Double auth. (2FA)',    done: has2FA },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: item.done ? '#10B981' : 'rgba(255,255,255,0.1)' }}>
                  {item.done
                    ? <CheckCircle className="w-3 h-3 text-white" />
                    : <X className="w-3 h-3 text-white/40" />}
                </div>
                <span className="text-xs font-medium" style={{ color: item.done ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Info rapide sécurité ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Appareils connectés', value: '1', icon: Smartphone, color: '#3B82F6', bg: '#EFF6FF' },
          { label: 'Dernière connexion',   value: 'Aujourd\'hui', icon: Globe, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Sessions actives',     value: '1 session',   icon: Zap,       color: ACCENT,   bg: ACCENT_LIGHT },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border p-5 flex items-center gap-4" style={{ borderColor: BORDER }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-base font-extrabold text-[#1A0C00]">{s.value}</p>
              <p className="text-xs text-[#9CA3AF]">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── SecurityPanel (mot de passe + 2FA) ─────────────────────── */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: BORDER }}>
        <div className="px-6 py-5 border-b flex items-center gap-3" style={{ borderColor: BORDER }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: ACCENT_LIGHT }}>
            <Shield className="w-4 h-4" style={{ color: ACCENT }} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#1A0C00]">Authentification & protection</h3>
            <p className="text-xs text-[#9CA3AF]">Gérez votre mot de passe et la double authentification</p>
          </div>
        </div>
        <div className="p-6">
          <SecurityPanel user={user} accentColor={ACCENT} />
        </div>
      </div>

      {/* ── Conseils sécurité ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: BORDER }}>
        <div className="px-6 py-5 border-b flex items-center gap-3" style={{ borderColor: BORDER }}>
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="text-sm font-extrabold text-[#1A0C00]">Bonnes pratiques</h3>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: Key,        title: 'Mot de passe fort',      desc: 'Utilisez 12 caractères minimum avec chiffres et symboles.' },
            { icon: Smartphone, title: 'Activez la 2FA',         desc: 'La double authentification bloque 99% des intrusions.' },
            { icon: Globe,      title: 'Connexions suspectes',    desc: 'Déconnectez-vous sur les appareils partagés.' },
            { icon: Lock,       title: 'Ne partagez jamais',      desc: 'Restodici ne vous demandera jamais votre mot de passe.' },
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-2xl" style={{ background: SURFACE }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: ACCENT_LIGHT }}>
                <tip.icon className="w-4 h-4" style={{ color: ACCENT }} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#1A0C00] mb-0.5">{tip.title}</p>
                <p className="text-xs text-[#8B6E50] leading-relaxed">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ──  MODULE LIVRAISON  ──────────────────────────────────────────
   Activé/désactivé depuis Admin › Config › delivery_enabled
   ════════════════════════════════════════════════════════════════ */
function DeliveryTab({ module: mod }) {
  if (!mod?.enabled) {
    return (
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: BORDER }}>
        <div className="p-10 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: ACCENT_LIGHT }}>
            <Truck className="w-8 h-8" style={{ color: ACCENT }} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#1A0C00] mb-1">Module Livraison</h3>
            <p className="text-sm text-[#8B6E50] max-w-xs">
              Ce module n'est pas encore activé. L'administrateur peut l'activer depuis le dashboard admin
              en configurant un prestataire de livraison (Shipday, Lalamove, etc.).
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: ACCENT_LIGHT }}>
            <Zap className="w-3.5 h-3.5" style={{ color: ACCENT }} />
            <span className="text-xs font-bold" style={{ color: ACCENT }}>Admin › Paramètres › delivery_enabled</span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg,${ACCENT},${ACCENT_DARK})` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Module actif</p>
            <h2 className="text-base font-extrabold text-white">Livraison — {mod.provider || 'Prestataire configuré'}</h2>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border p-6" style={{ borderColor: BORDER }}>
        <p className="text-sm text-[#8B6E50] mb-4">Intégration active via <strong>{mod.provider || 'prestataire'}</strong>.</p>
        {mod.apiUrl && (
          <a href={mod.apiUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: ACCENT, textDecoration: 'none' }}>
            <ArrowRight className="w-4 h-4" /> Accéder au portail livraison
          </a>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ──  MODULE MESSAGERIE  ─────────────────────────────────────────
   Activé/désactivé depuis Admin › Config › messaging_enabled
   ════════════════════════════════════════════════════════════════ */
function MessagingTab({ module: mod }) {
  if (!mod?.enabled) {
    return (
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: BORDER }}>
        <div className="p-10 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: ACCENT_LIGHT }}>
            <MessageSquare className="w-8 h-8" style={{ color: ACCENT }} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#1A0C00] mb-1">Module Messagerie</h3>
            <p className="text-sm text-[#8B6E50] max-w-xs">
              Ce module n'est pas encore activé. L'administrateur peut l'activer depuis le dashboard admin
              en configurant un prestataire de messagerie (Sendbird, Tawk.to, etc.).
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: ACCENT_LIGHT }}>
            <Zap className="w-3.5 h-3.5" style={{ color: ACCENT }} />
            <span className="text-xs font-bold" style={{ color: ACCENT }}>Admin › Paramètres › messaging_enabled</span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg,${ACCENT},${ACCENT_DARK})` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Module actif</p>
            <h2 className="text-base font-extrabold text-white">Messagerie — {mod.provider || 'Prestataire configuré'}</h2>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border p-6" style={{ borderColor: BORDER }}>
        <p className="text-sm text-[#8B6E50] mb-4">Intégration active via <strong>{mod.provider || 'prestataire'}</strong>.</p>
        {mod.apiUrl && (
          <a href={mod.apiUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: ACCENT, textDecoration: 'none' }}>
            <ArrowRight className="w-4 h-4" /> Ouvrir la messagerie
          </a>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ──  COMPOSANT PRINCIPAL  ───────────────────────────────────────
   ════════════════════════════════════════════════════════════════ */
export default function ClientDashboard() {
  const { user, logout, refreshProfile } = useAuth();
  const navigate  = useNavigate();
  const [tab, setTab] = useState('overview');
  const [sideOpen, setSideOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const changeTab = (key) => { setTab(key); setSideOpen(false); };
  const [orders, setOrders] = useState(() => loadCachedOrders(user?.id));
  const [loadingOrders, setLoadingOrders]   = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [ordersError, setOrdersError]       = useState('');
  const [trackOrder, setTrackOrder]         = useState(null);
  const [receiptOrder, setReceiptOrder]     = useState(null);
  const [avisOrder, setAvisOrder]           = useState(null);
  const [avisGiven, setAvisGiven]           = useState(() => loadAvisGiven(user?.id));
  const [profileForm, setProfileForm]       = useState({ nom: user?.nom || '', email: user?.email || '', telephone: user?.telephone || '' });
  const [profileMsg, setProfileMsg]         = useState('');
  const [orderFilter, setOrderFilter]       = useState('all');
  const [savedPM, setSavedPM]               = useState(() => loadSavedPM(user?.id));
  const [pmForm, setPmForm]                 = useState({ type: 'ORANGE_MONEY', label: '', numero: '' });
  const [pmMsg, setPmMsg]                   = useState('');
  // Adresses depuis la BD (user.adressesSauvegardees, sync via refreshProfile)
  const [savedAddresses, setSavedAddresses] = useState(() => user?.adressesSauvegardees || []);
  const [addrForm, setAddrForm]             = useState({ label: '', adresse: '' });
  // Modes de paiement dynamiques depuis l'API
  const [paymentTypes, setPaymentTypes]     = useState(PAYMENT_TYPES_FALLBACK);
  // Modules client — plug-and-play depuis l'admin
  const [clientModules, setClientModules]   = useState({ delivery: { enabled: false }, messaging: { enabled: false } });

  const userId = user?.id;

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoadingOrders(true); else setRefreshing(true);
    setOrdersError('');
    try {
      const res  = await svcTs.getMyOrders();
      const data = Array.isArray(res.data) ? res.data : [];
      setOrders(data);
      saveOrdersCache(userId, data);
    } catch {
      setOrdersError('Impossible de charger vos commandes. Vérifiez votre connexion.');
    } finally {
      setLoadingOrders(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    const cached = loadCachedOrders(userId);
    if (cached.length > 0) { setOrders(cached); setLoadingOrders(false); loadOrders(true); }
    else loadOrders(false);
  }, [loadOrders, userId]);

  useEffect(() => {
    if (user) {
      setProfileForm({ nom: user.nom || '', email: user.email || '', telephone: user.telephone || '' });
      setSavedAddresses(user.adressesSauvegardees || []);
    }
  }, [user]);

  // Charge les modules client depuis la BD (plug-and-play admin)
  useEffect(() => {
    modulesAPI.getClientModules()
      .then(r => { if (r.data) setClientModules(r.data); })
      .catch(() => {});
  }, []);

  // Charge les méthodes de paiement depuis l'agrégateur NovaSend
  useEffect(() => {
    paiementsAPI.getMethods()
      .then(r => {
        const list = r.data?.methods || r.data || [];
        if (Array.isArray(list) && list.length > 0) {
          const mapped = list.map(mapApiMethodToType);
          setPaymentTypes(mapped);
          setPmForm(p => ({ ...p, type: p.type || mapped[0]?.id || 'ORANGE_MONEY' }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    const socket = createCommandesSocket(user);
    const refresh = () => loadOrders(true);
    socket.on('commande.creee', refresh);
    socket.on('commande.statut', refresh);
    socket.on('commande.paiement', refresh);
    return () => { socket.disconnect(); };
  }, [user, loadOrders]);

  const handleAvisSubmit = async (orderId, note, commentaire) => {
    try {
      await svcTs.submitAvis(orderId, note, commentaire);
      const next = new Set([...avisGiven, orderId]);
      setAvisGiven(next);
      saveAvisGiven(userId, next);
    } catch (e) { console.error(e); }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      await authAPI.updateProfile(profileForm);
      await refreshProfile();
      setProfileMsg('Profil mis à jour !');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch { setProfileMsg('Erreur lors de la mise à jour'); }
  };

  const downloadPdf = async (orderId) => {
    try {
      const res = await svcTs.getReceiptPdf(orderId);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a   = document.createElement('a');
      a.href = url; a.download = `recu-${orderId}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch { alert('Reçu PDF non disponible'); }
  };

  const canAvis = (o) => o.statut === 'LIVREE' && !avisGiven.has(o.id) && !o.avis;

  const handleConfirmReceipt = async (order) => {
    if (!window.confirm(`Confirmer la réception de la commande #${order.numero} ?`)) return;
    try {
      await commandesService.confirmerReception(order.id);
      await loadOrders(true);
    } catch (e) {
      alert(e?.response?.data?.message ?? 'Erreur lors de la confirmation');
    }
  };

  const handleReorder = (order) => {
    const items = (order.lignes || []).map(l => ({
      articleId: l.article?.id || l.articleId,
      nom: l.article?.nom || 'Article',
      prix: Number(l.prixUnitaire || l.article?.prix || 0),
      quantite: l.quantite || 1,
      restaurantId: order.restaurant?.id || order.restaurantId,
    }));
    if (!items.length) { alert('Impossible de renouveler : détail des articles indisponible'); return; }
    localStorage.setItem('pendingOrder', JSON.stringify({
      restaurantId: order.restaurant?.id || order.restaurantId,
      restaurantName: order.restaurant?.nom || 'Restaurant',
      orderMode: order.modeLivraison || 'SUR_PLACE',
      deliveryAddress: order.adresseLivraison || '',
      items,
      total: items.reduce((s, i) => s + i.prix * i.quantite, 0),
    }));
    navigate('/checkout');
  };

  const addPM = (e) => {
    e.preventDefault();
    if (!pmForm.label.trim()) { setPmMsg('Ajoutez un libellé.'); return; }
    const entry = { id: `${Date.now()}`, type: pmForm.type, label: pmForm.label.trim(), numero: pmForm.numero.trim(), isDefault: savedPM.length === 0 };
    const next  = [...savedPM, entry];
    setSavedPM(next);
    savePM(userId, next);
    setPmForm({ type: 'ORANGE_MONEY', label: '', numero: '' });
    setPmMsg('Moyen de paiement ajouté !');
    setTimeout(() => setPmMsg(''), 3000);
  };

  const removePM = (id) => {
    const next = savedPM.filter(m => m.id !== id);
    setSavedPM(next);
    savePM(userId, next);
  };

  const setDefaultPM = (id) => {
    const next = savedPM.map(m => ({ ...m, isDefault: m.id === id }));
    setSavedPM(next);
    savePM(userId, next);
  };

  const addAddress = async (e) => {
    e.preventDefault();
    if (!addrForm.label.trim() || !addrForm.adresse.trim()) return;
    const entry = { id: `${Date.now()}`, label: addrForm.label.trim(), adresse: addrForm.adresse.trim() };
    const next = [...savedAddresses, entry];
    setSavedAddresses(next);
    setAddrForm({ label: '', adresse: '' });
    try { await authAPI.updateProfile({ adressesSauvegardees: next }); await refreshProfile(); } catch {}
  };
  const removeAddress = async (id) => {
    const next = savedAddresses.filter(a => a.id !== id);
    setSavedAddresses(next);
    try { await authAPI.updateProfile({ adressesSauvegardees: next }); await refreshProfile(); } catch {}
  };

  const activeOrders  = orders.filter(o => !['LIVREE', 'ANNULEE'].includes(o.statut));
  const delivered     = orders.filter(o => o.statut === 'LIVREE');
  const cancelled     = orders.filter(o => o.statut === 'ANNULEE');
  const pendingAvis   = delivered.filter(o => canAvis(o));
  const totalSpent    = delivered.reduce((s, o) => s + (Number(o.montantTotal) || 0), 0);
  const avgOrder      = delivered.length > 0 ? Math.round(totalSpent / delivered.length) : 0;

  const filteredOrders = orderFilter === 'actives'  ? activeOrders
                       : orderFilter === 'livrees'  ? delivered
                       : orderFilter === 'annulees' ? cancelled
                       : orders;

  const TABS = [
    { key: 'overview', label: "Vue d'ensemble", icon: ShoppingBag },
    { key: 'orders',   label: 'Commandes',       icon: Package, badge: activeOrders.length || undefined },
    { key: 'payment',  label: 'Paiement',         icon: CreditCard },
    { key: 'profile',  label: 'Profil',           icon: User },
    { key: 'security', label: 'Sécurité',         icon: Shield },
    // Modules plug-and-play — apparaissent automatiquement quand activés par l'admin
    ...(clientModules.delivery?.enabled  ? [{ key: 'delivery',  label: 'Livraison', icon: Truck }]         : []),
    ...(clientModules.messaging?.enabled ? [{ key: 'messaging', label: 'Messages',  icon: MessageSquare }] : []),
  ];

  /* ── Sidebar nav component — fond orange clair ── */
  const Sidebar = ({ mobile = false }) => (
    <div className="flex flex-col h-full" style={{ background: BG, borderRight: `1px solid ${ACCENT}18` }}>
      {/* Brand */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})` }}>
            <UtensilsCrossed className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-none" style={{ color: '#1A0C00' }}>Resto d'ici</p>
            <p className="text-[10px] mt-0.5 font-semibold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>
              Espace client
            </p>
          </div>
          {mobile && (
            <button onClick={() => setSideOpen(false)} style={{ color: '#8B6E50', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Section label */}
      <div className="px-4 pt-5 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#D1D5DB' }}>
          Navigation
        </p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto pb-4">
        {TABS.map(item => {
          const Icon = item.icon;
          const active = tab === item.key;
          return (
            <button key={item.key} onClick={() => changeTab(item.key)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all"
              style={{
                background: active ? ACCENT_LIGHT : 'transparent',
                color: active ? ACCENT : '#8B6E50',
                border: 'none',
                cursor: 'pointer',
              }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: active ? ACCENT : '#F3F4F6' }}>
                <Icon className="w-3.5 h-3.5" style={{ color: active ? '#fff' : '#9CA3AF' }} />
              </div>
              <span className="flex-1 text-left font-semibold">{item.label}</span>
              {(item.badge ?? 0) > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                  style={{ background: active ? ACCENT : '#FEE2E2', color: active ? '#fff' : '#DC2626' }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '0 16px' }} />

      {/* User block */}
      <div className="px-3 py-4">
        <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl"
          style={{ background: '#F9FAFB', border: '1px solid rgba(0,0,0,0.07)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
            style={{ background: ACCENT }}>
            {(user?.prenom || user?.nom || 'C')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: '#1A0C00' }}>{user?.prenom || user?.nom || 'Client'}</p>
            <p className="text-[10px] truncate" style={{ color: '#9CA3AF' }}>
              {user?.email || ''}
            </p>
          </div>
          <button onClick={() => setShowLogoutConfirm(true)} title="Déconnexion"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition"
            style={{ background: '#FFF1F2', border: 'none', cursor: 'pointer' }}>
            <LogOut className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>

      {/* ── Desktop sidebar ── */}
      <div className="hidden lg:flex flex-col w-[220px] shrink-0 h-full border-r"
        style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
        <Sidebar />
      </div>

      {/* ── Mobile sidebar overlay ── */}
      {sideOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="w-[220px] h-full"><Sidebar mobile /></div>
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setSideOpen(false)} />
        </div>
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar — profile button + notifications only */}
        <header className="shrink-0 flex items-center justify-between px-4 sm:px-6 h-14"
          style={{ background: BG, borderBottom: `1px solid ${ACCENT}20` }}>
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${ACCENT}20` }}
              onClick={() => setSideOpen(true)}>
              <MenuIcon className="w-4 h-4 text-gray-500" />
            </button>
            {/* Tab name — mobile only (sidebar masquée) */}
            <p className="lg:hidden text-[13px] font-bold" style={{ color: '#1A0C00' }}>
              {TABS.find(t => t.key === tab)?.label || 'Mon compte'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell accentColor={ACCENT} light />
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto" style={{ background: BG }}>
          <div className="w-full px-4 sm:px-6 py-6">

            {ordersError && (
              <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-2xl border"
                style={{ background: '#FFF1F2', borderColor: '#FECDD3' }}>
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-700 flex-1">{ordersError}</p>
                <button onClick={() => loadOrders(false)} className="text-xs font-bold text-red-700 underline shrink-0">
                  Réessayer
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
            {tab === 'overview' && (
              <OverviewTab
                user={user} orders={orders} activeOrders={activeOrders}
                delivered={delivered} cancelled={cancelled} pendingAvis={pendingAvis}
                totalSpent={totalSpent} avgOrder={avgOrder} loadingOrders={loadingOrders}
                canAvis={canAvis} setTab={changeTab}
                setTrackOrder={setTrackOrder} setReceiptOrder={setReceiptOrder} setAvisOrder={setAvisOrder}
                downloadPdf={downloadPdf} handleReorder={handleReorder}
                handleConfirmReceipt={handleConfirmReceipt}
              />
            )}

            {tab === 'orders' && (
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {[
                    { k: 'all',      label: `Toutes (${orders.length})`,           color: DARK,   bg: DARK },
                    { k: 'actives',  label: `En cours (${activeOrders.length})`,   color: ORANGE, bg: ORANGE },
                    { k: 'livrees',  label: `Livrées (${delivered.length})`,        color: ACCENT, bg: ACCENT },
                    { k: 'annulees', label: `Annulées (${cancelled.length})`,       color: RED,    bg: RED },
                  ].map(f => (
                    <button key={f.k} onClick={() => setOrderFilter(f.k)}
                      className="px-4 py-1.5 rounded-full text-sm font-semibold border transition"
                      style={{
                        background: orderFilter === f.k ? f.bg : '#fff',
                        color: orderFilter === f.k ? '#fff' : f.color,
                        borderColor: orderFilter === f.k ? f.bg : `${f.color}44`,
                      }}>
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: BORDER }}>
                  <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1A0C00]">Mes commandes</span>
                      <span className="text-xs text-[#9CA3AF]">
                        {filteredOrders.length} résultat{filteredOrders.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <Link to="/menu" className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: ORANGE }}>
                      <ShoppingBag className="w-3.5 h-3.5" /> Commander
                    </Link>
                  </div>

                  {loadingOrders ? (
                    <div className="flex justify-center py-12">
                      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: ORANGE, borderTopColor: 'transparent' }} />
                    </div>
                  ) : filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center" style={{ background: ORANGE_L }}>
                      <ShoppingBag className="w-12 h-12 mb-3" style={{ color: ORANGE, opacity: 0.5 }} />
                      <p className="text-sm font-medium mb-1" style={{ color: '#1A0C00' }}>
                        {orders.length === 0 ? "Vous n'avez pas encore passé de commande" : 'Aucune commande dans cette catégorie'}
                      </p>
                      <p className="text-xs mb-4" style={{ color: '#A89070' }}>Explorez notre menu et passez votre première commande.</p>
                      <Link to="/menu"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                        style={{ background: ORANGE, textDecoration: 'none' }}>
                        Commander maintenant
                      </Link>
                    </div>
                  ) : (
                    filteredOrders.map(o =>
                      ['LIVREE', 'ANNULEE'].includes(o.statut) ? (
                        <PastOrderRow key={o.id} order={o}
                          onReceipt={() => setReceiptOrder(o)}
                          onDownload={() => downloadPdf(o.id)}
                          onAvis={() => setAvisOrder(o)}
                          canAvis={canAvis(o)}
                          onReorder={handleReorder} />
                      ) : (
                        <div key={o.id} className="p-4 border-b last:border-0" style={{ borderColor: BORDER }}>
                          <ActiveOrderCard order={o}
                            onTrack={() => setTrackOrder(o)}
                            onReceipt={() => setReceiptOrder(o)}
                            onConfirmReceipt={handleConfirmReceipt} />
                        </div>
                      )
                    )
                  )}
                </div>
              </div>
            )}

            {tab === 'payment' && (
              <PaymentTab
                savedPM={savedPM} setSavedPM={setSavedPM}
                pmForm={pmForm} setPmForm={setPmForm}
                pmMsg={pmMsg} setPmMsg={setPmMsg}
                addPM={addPM} removePM={removePM} setDefaultPM={setDefaultPM}
                userId={userId}
                paymentTypes={paymentTypes}
              />
            )}

            {tab === 'profile' && (
              <ProfileTab
                user={user}
                profileForm={profileForm} setProfileForm={setProfileForm}
                profileMsg={profileMsg} handleProfileSave={handleProfileSave}
                orders={orders} totalSpent={totalSpent} delivered={delivered}
                savedAddresses={savedAddresses} addrForm={addrForm} setAddrForm={setAddrForm}
                addAddress={addAddress} removeAddress={removeAddress}
              />
            )}

            {tab === 'security'  && <SecurityTab  user={user} />}
            {tab === 'delivery'  && <DeliveryTab  module={clientModules.delivery}  />}
            {tab === 'messaging' && <MessagingTab module={clientModules.messaging} />}
            </motion.div>
            </AnimatePresence>
          </div>{/* max-w-5xl */}
        </div>{/* flex-1 overflow-y-auto */}
      </div>{/* flex-1 flex-col main area */}

      {/* ── Modals ──────────────────────────────────────────────────── */}
      {trackOrder   && <OrderTrackModal order={trackOrder}   onClose={() => setTrackOrder(null)}   onReceipt={o => { setTrackOrder(null); setReceiptOrder(o); }} />}
      {receiptOrder && <ReceiptModal    order={receiptOrder} onClose={() => setReceiptOrder(null)} onDownload={downloadPdf} />}
      {avisOrder    && <AvisModal       order={avisOrder}    onClose={() => setAvisOrder(null)}    onSubmit={handleAvisSubmit} />}
      <OnboardingWizard />

      {/* ── Logout confirmation ─────────────────────────────────────── */}
      {showLogoutConfirm && (
        <>
          <div onClick={() => setShowLogoutConfirm(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(139,110,80,0.5)', backdropFilter: 'blur(3px)', zIndex: 999, animation: 'fadeIn 0.2s ease' }} />
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
              style={{ animation: 'slideInUp 0.25s cubic-bezier(0.32,0.72,0,1)' }}>
              <div className="px-6 pt-6 pb-2 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: `${RED}15` }}>
                  <LogOut className="w-6 h-6" style={{ color: RED }} />
                </div>
                <h3 className="text-lg font-extrabold text-[#1A0C00] mb-1">Déconnexion</h3>
                <p className="text-sm text-[#8B6E50]">Voulez-vous vous déconnecter ?</p>
              </div>
              <div className="px-6 pb-6 pt-5 flex gap-3">
                <button onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-[#374151] border transition hover:bg-gray-50"
                  style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                  Annuler
                </button>
                <button onClick={() => { setShowLogoutConfirm(false); logout?.(); navigate('/login'); }}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                  style={{ background: RED }}>
                  Se déconnecter
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
