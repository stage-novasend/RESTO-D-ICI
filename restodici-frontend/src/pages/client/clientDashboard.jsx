/* ═══════════════════════════════════════════════════════════════
   clientDashboard.jsx — Espace personnel du client (Design Pro & Sérieux)
   5 onglets principaux : Vue d'ensemble · Commandes · Paiement · Profil · Sécurité
   Design épuré, typographie soignée, zéro émoticône, icônes Lucide SVG.
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
  BadgeCheck, LogOut, Menu as MenuIcon, Filter, Layers, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { commandesService as svcTs, createCommandesSocket } from '../../services/commandes.service';
import { authAPI, commandesService, paiementsAPI, modulesAPI } from '../../services/api';
import SecurityPanel from '../../components/security/SecurityPanel';
import NotificationBell from '../../components/notifications/NotificationBell';
import { formatFCFA } from '../../utils/formatters';
import { EMAIL_PATTERN, CI_PHONE_PATTERN, MSG } from '../../utils/validators';
import { KpiCard } from '../../components/ui';
import OnboardingWizard from '../../components/wizard/OnboardingWizard';

import orangeMoneyLogo  from '../../assets/payments/orange-money.svg';
import mtnMomoLogo      from '../../assets/payments/mtn-momo.svg';
import moovMoneyLogo    from '../../assets/payments/moov-money.svg';
import carteBancaireLogo from '../../assets/payments/carte-bancaire.svg';

/* ── Palette épurée et professionnelle ── */
const ACCENT       = '#EA580C'; // Orange Terracotta
const ACCENT_DARK  = '#C2410C';
const ACCENT_LIGHT = '#FFF7ED';
const BG           = '#F8FAFC'; // Slate très clair
const SURFACE      = '#FFFFFF';
const BORDER       = '#E2E8F0';
const TEXT_DARK    = '#0F172A'; // Slate 900
const TEXT_MUTED   = '#64748B'; // Slate 500
const DARK_NAVY    = '#0F172A';

const ORDER_STATUS = {
  RECUE:        { label: 'Reçue',          bg: '#FEF3C7', color: '#D97706' },
  CONFIRMEE:    { label: 'Confirmée',      bg: '#ECFDF5', color: '#059669' },
  EN_PREP:      { label: 'En préparation', bg: '#FFF7ED', color: '#EA580C' },
  PRETE:        { label: 'Prête',          bg: '#ECFDF5', color: '#059669' },
  EN_LIVRAISON: { label: 'En livraison',   bg: '#EFF6FF', color: '#2563EB' },
  LIVREE:       { label: 'Livrée',         bg: '#ECFDF5', color: '#16A34A' },
  ANNULEE:      { label: 'Annulée',        bg: '#FEF2F2', color: '#DC2626' },
};

const STEPS       = ['RECUE', 'CONFIRMEE', 'EN_PREP', 'PRETE', 'EN_LIVRAISON', 'LIVREE'];
const MODE_LABELS = { SUR_PLACE: 'Sur place', EMPORTER: 'À emporter', LIVRAISON: 'Livraison' };
const MODE_ICONS  = { SUR_PLACE: UtensilsCrossed, EMPORTER: Package, LIVRAISON: Truck };

const PAYMENT_TYPES_FALLBACK = [
  { id: 'ORANGE_MONEY',   label: 'Orange Money',  placeholder: '07 XX XX XX XX', logo: orangeMoneyLogo,   color: '#FF6600', bg: '#FFF3EB' },
  { id: 'MTN_MONEY',      label: 'MTN MoMo',       placeholder: '05 XX XX XX XX', logo: mtnMomoLogo,       color: '#D97706', bg: '#FEF3C7' },
  { id: 'WAVE',           label: 'Wave',            placeholder: '01 XX XX XX XX', logo: null,              color: '#1DA1F2', bg: '#E8F5FD' },
  { id: 'MOOV_MONEY',     label: 'Moov Money',      placeholder: '01 XX XX XX XX', logo: moovMoneyLogo,     color: '#0066CC', bg: '#E6F0FF' },
  { id: 'CARTE_BANCAIRE', label: 'Carte Bancaire',  placeholder: 'XXXX XXXX XXXX XXXX', logo: carteBancaireLogo, color: '#0F172A', bg: '#F1F5F9' },
];

const PROVIDER_META = {
  ORANGE: { logo: orangeMoneyLogo,   color: '#FF6600', bg: '#FFF3EB', placeholder: '07 XX XX XX XX' },
  MOMO:   { logo: mtnMomoLogo,       color: '#D97706', bg: '#FEF3C7', placeholder: '05 XX XX XX XX' },
  WAVE:   { logo: null,              color: '#1DA1F2', bg: '#E8F5FD', placeholder: '01 XX XX XX XX' },
  MOOV:   { logo: moovMoneyLogo,     color: '#0066CC', bg: '#E6F0FF', placeholder: '01 XX XX XX XX' },
  CARTE:  { logo: carteBancaireLogo, color: '#0F172A', bg: '#F1F5F9', placeholder: 'XXXX XXXX XXXX XXXX' },
};

const mapApiMethodToType = (m) => {
  const meta = PROVIDER_META[m.provider] || {};
  return {
    id:          m.provider || m.id,
    label:       m.label,
    placeholder: meta.placeholder || 'XXXXXXXXXX',
    logo:        meta.logo !== undefined ? meta.logo : null,
    color:       meta.color  || '#64748B',
    bg:          meta.bg     || '#F8FAFC',
  };
};

function pmKey(uid)       { return uid ? `saved_pm:${uid}` : 'saved_pm'; }
function loadSavedPM(uid) { try { return JSON.parse(localStorage.getItem(pmKey(uid)) || '[]'); } catch { return []; } }

const PM_TYPE_TO_CHECKOUT = {
  ORANGE_MONEY: 'orange_money', ORANGE: 'orange_money',
  MTN_MONEY:    'mtn_momo',     MOMO:   'mtn_momo',
  WAVE:         'wave',
  MOOV_MONEY:   'moov_money',   MOOV:   'moov_money',
  CARTE_BANCAIRE: 'card',       CARTE:  'card',
};

const toCheckoutMethod = (type) => PM_TYPE_TO_CHECKOUT[type] || 'orange_money';
function quickPayKey(uid)       { return uid ? `quick_pay:${uid}` : 'quick_pay'; }
function loadQuickPay(uid)      { try { return JSON.parse(localStorage.getItem(quickPayKey(uid)) || 'null') || { enabled: false }; } catch { return { enabled: false }; } }
function saveQuickPay(uid, cfg) { localStorage.setItem(quickPayKey(uid), JSON.stringify(cfg)); }
function savePM(uid, list)      { localStorage.setItem(pmKey(uid), JSON.stringify(list)); }

function ordersKey(uid)  { return uid ? `orders:${uid}` : 'orders'; }
function avisKey(uid)    { return uid ? `avis_given:${uid}` : 'avis_given'; }

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

/* ── Modal Reçu Officiel SYSCOHADA ── */
function ReceiptModal({ order, onClose, onDownload }) {
  const printRef = useRef(null);
  const date     = new Date(order.createdAt || order.payeAt || Date.now()).toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const total    = order.total || order.montantTotal || 0;
  const totalHT  = total / 1.18;
  const tva      = total - totalHT;
  const restoNom = order.restaurant?.nom || 'Resto d\'ici';
  const paye     = ['PAYEE', 'LIVREE', 'RECUE', 'CONFIRMEE', 'PREPARATION', 'PRETE'].includes(order.statut) || !!order.payeAt;
  const modePaiement = order.modePaiement || order.paiement?.provider || null;

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Reçu ${order.numero}</title><style>
      *{box-sizing:border-box}
      body{font-family:'Inter',system-ui,sans-serif;max-width:400px;margin:24px auto;color:#0F172A;padding:0 16px}
      .rc-brand{font-size:20px;font-weight:800;margin:0}
      .rc-sub{font-size:12px;color:#64748B;margin:2px 0 0}
      .rc-pill{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#15803D;border:1px solid #86EFAC;border-radius:3px;padding:3px 8px;margin:10px 0}
      .rc-meta{display:flex;justify-content:space-between;font-size:12px;color:#475569;margin:4px 0}
      .rc-meta b{color:#0F172A;font-weight:700}
      .rc-divider{border:none;border-top:1px solid #CBD5E1;margin:12px 0}
      .rc-row{display:flex;justify-content:space-between;font-size:13px;margin:6px 0}
      .rc-tot{display:flex;justify-content:space-between;font-size:12px;color:#64748B;margin:4px 0}
      .rc-ttc{display:flex;justify-content:space-between;font-size:16px;font-weight:800;color:#0F172A;margin-top:10px;padding-top:10px;border-top:2px solid #0F172A}
      .rc-foot{font-size:10px;color:#94A3B8;text-align:center;margin-top:20px;line-height:1.5}
    </style></head><body>${content}</body></html>`);
    win.document.close(); win.print();
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', zIndex: 999 }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'none' }}>
        {/* Document comptable : pas d'animation d'entrée, angles peu marqués,
            aucun aplat de couleur décoratif. */}
        <div className="bg-white rounded-md w-full max-w-sm shadow-xl overflow-hidden border border-slate-300"
          style={{ pointerEvents: 'auto' }}>
          <div className="px-5 py-4 flex items-center justify-between border-b-2" style={{ background: DARK_NAVY, borderBottomColor: '#334155' }}>
            <div>
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-300" /> Reçu officiel de paiement
              </h3>
              <p className="text-slate-400 text-xs">Commande N° {order.numero}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-5 max-h-[70vh] overflow-y-auto">
            <div ref={printRef}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <p className="rc-brand" style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{restoNom}</p>
                  <p className="rc-sub" style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>Reçu de transaction · Resto d'ici</p>
                </div>
                {paye && (
                  <span className="rc-pill flex items-center gap-1" style={{ display: 'inline-flex', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#15803D', background: 'transparent', border: '1px solid #86EFAC', borderRadius: 3, padding: '3px 8px' }}>
                    <CheckCircle2 className="w-3 h-3" /> Payé
                  </span>
                )}
              </div>

              <hr className="rc-divider" style={{ border: 'none', borderTop: '1px solid #CBD5E1', margin: '12px 0' }} />

              {[
                ['Date & Heure', date],
                ['Référence N°', order.numero],
                ['Mode de remise', MODE_LABELS[order.modeLivraison] || order.modeLivraison || 'Sur place'],
                ...(modePaiement ? [['Moyen de paiement', modePaiement]] : []),
              ].map(([k, v]) => (
                <div key={k} className="rc-meta" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569', margin: '4px 0' }}>
                  <span>{k}</span><b style={{ color: '#0F172A', fontWeight: 700 }}>{v}</b>
                </div>
              ))}

              <hr className="rc-divider" style={{ border: 'none', borderTop: '1px solid #CBD5E1', margin: '12px 0' }} />

              {(order.lignes || []).map((l, i) => (
                <div key={i} className="rc-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, margin: '6px 0' }}>
                  <span style={{ color: '#334155' }}>{l.quantite}× {l.article?.nom || l.nom}</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{formatFCFA((l.prixUnitaire || l.prix || 0) * l.quantite)}</span>
                </div>
              ))}

              <hr className="rc-divider" style={{ border: 'none', borderTop: '1px solid #CBD5E1', margin: '12px 0' }} />

              <div className="rc-tot" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748B', margin: '4px 0' }}>
                <span>Sous-total HT</span><span>{formatFCFA(totalHT)}</span>
              </div>
              <div className="rc-tot" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748B', margin: '4px 0' }}>
                <span>TVA (18%)</span><span>{formatFCFA(tva)}</span>
              </div>
              <div className="rc-ttc" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, color: '#0F172A', marginTop: 10, paddingTop: 10, borderTop: '2px solid #0F172A' }}>
                <span>Total TTC</span><span>{formatFCFA(total)}</span>
              </div>

              <p className="rc-foot" style={{ fontSize: 10, color: '#94A3B8', textAlign: 'center', marginTop: 18, lineHeight: 1.5 }}>
                Merci pour votre commande chez {restoNom}<br />
                Document valant reçu officiel · Conforme normes SYSCOHADA
              </p>
            </div>
          </div>
          <div className="px-5 pb-5 pt-2 flex gap-3 border-t border-slate-100 bg-slate-50">
            <button onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded font-semibold text-xs border border-slate-300 bg-white text-slate-700 hover:bg-slate-100">
              <Printer className="w-3.5 h-3.5" /> Imprimer
            </button>
            <button onClick={() => onDownload(order.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded font-bold text-xs text-white hover:opacity-90"
              style={{ background: DARK_NAVY }}>
              <Download className="w-3.5 h-3.5" /> Télécharger PDF
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Modal Avis ── */
function AvisModal({ order, onClose, onSubmit }) {
  const [note, setNote] = useState(5);
  const [commentaire, setCommentaire] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try { await onSubmit(order.id, note, commentaire); onClose(); }
    finally { setSubmitting(false); }
  };

  const labels = ['', 'Très décevant', 'Décevant', 'Satisfaisant', 'Très bien', 'Excellent'];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', zIndex: 999 }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'none' }}>
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-200"
          style={{ pointerEvents: 'auto', animation: 'slideInUp 0.25s ease-out' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ background: DARK_NAVY }}>
            <div>
              <h3 className="text-white font-bold text-sm">Évaluer votre expérience</h3>
              <p className="text-slate-400 text-xs">{order.restaurant?.nom || 'Restaurant'} · Commande #{order.numero}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg transition"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-5 space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 text-center">Votre note globale</p>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setNote(n)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all border"
                    style={{
                      background: n <= note ? ACCENT_LIGHT : '#F8FAFC',
                      borderColor: n <= note ? ACCENT : '#E2E8F0',
                      transform: n === note ? 'scale(1.1)' : 'scale(1)'
                    }}>
                    <Star className="w-5 h-5" fill={n <= note ? ACCENT : 'none'} stroke={n <= note ? ACCENT : '#94A3B8'} />
                  </button>
                ))}
              </div>
              <p className="text-center text-xs text-slate-600 mt-2 font-semibold">
                {labels[note]}
              </p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">Commentaire (optionnel)</label>
              <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)}
                rows={3} placeholder="Partagez vos remarques avec l'établissement…"
                className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 resize-none bg-slate-50" />
            </div>
            <button onClick={handleSubmit} disabled={submitting}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 text-white shadow-sm transition hover:opacity-90"
              style={{ background: ACCENT }}>
              {submitting
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Send className="w-4 h-4" />}
              Soumettre l'avis
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Carte Commande Active ── */
function ActiveOrderCard({ order, onTrack, onReceipt, onConfirmReceipt }) {
  const idx = STEPS.indexOf(order.statut);
  const progress = idx >= 0 ? Math.round(((idx + 1) / STEPS.length) * 100) : 0;
  const status = ORDER_STATUS[order.statut] || { label: order.statut, bg: '#F1F5F9', color: '#475569' };
  const ModeIcon = MODE_ICONS[order.modeLivraison] || Package;

  return (
    <div className="rounded-xl border border-slate-200 p-4 bg-white shadow-sm hover:shadow transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: ACCENT_LIGHT }}>
          <ModeIcon className="w-5 h-5" style={{ color: ACCENT }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-900">Commande #{order.numero}</span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: status.bg, color: status.color }}>
              {status.label}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {order.restaurant?.nom && `${order.restaurant.nom} · `}
            {MODE_LABELS[order.modeLivraison]}
          </p>
        </div>
        <p className="text-sm font-bold text-slate-900 shrink-0">
          {formatFCFA(order.montantTotal || 0)}
        </p>
      </div>

      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, background: order.statut === 'LIVREE' ? '#16A34A' : ACCENT }} />
      </div>

      <div className="flex gap-2">
        <button onClick={onTrack}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition">
          <Eye className="w-3.5 h-3.5 text-slate-500" /> Suivi en direct
        </button>
        {order.statut === 'EN_LIVRAISON' && !order.receptionConfirmeeAt && onConfirmReceipt && (
          <button onClick={() => onConfirmReceipt(order)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition">
            <CheckCircle2 className="w-3.5 h-3.5" /> Réceptionner
          </button>
        )}
        {order.estPaye && order.statut !== 'EN_LIVRAISON' && (
          <button onClick={onReceipt}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white transition hover:opacity-90"
            style={{ background: ACCENT }}>
            <Receipt className="w-3.5 h-3.5" /> Reçu
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Ligne Historique Commande ── */
function PastOrderRow({ order, onReceipt, onDownload, onAvis, canAvis, onReorder }) {
  const date = new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  const status = ORDER_STATUS[order.statut] || { label: order.statut, bg: '#F1F5F9', color: '#475569' };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: order.statut === 'ANNULEE' ? '#FEF2F2' : '#ECFDF5' }}>
          {order.statut === 'ANNULEE'
            ? <X className="w-4 h-4 text-red-500" />
            : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-900">N° {order.numero}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: status.bg, color: status.color }}>{status.label}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {date}{order.restaurant?.nom ? ` · ${order.restaurant.nom}` : ''} · {order.lignes?.length || 0} article{(order.lignes?.length || 0) > 1 ? 's' : ''}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
        <p className="text-sm font-extrabold text-slate-900 mr-2">{formatFCFA(order.montantTotal || 0)}</p>
        {(order.estPaye || order.statut === 'LIVREE') && (
          <button onClick={onReceipt} title="Voir le reçu"
            className="p-2 rounded-lg border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 transition">
            <Receipt className="w-4 h-4" />
          </button>
        )}
        <button onClick={onDownload} title="Télécharger le reçu PDF"
          className="p-2 rounded-lg border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 transition">
          <Download className="w-4 h-4" />
        </button>
        {order.statut === 'LIVREE' && onReorder && (
          <button onClick={() => onReorder(order)} title="Commander à nouveau"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition hover:opacity-90"
            style={{ background: DARK_NAVY }}>
            <RefreshCcw className="w-3 h-3" /> Recommander
          </button>
        )}
        {canAvis && (
          <button onClick={onAvis} title="Donner un avis"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition hover:opacity-90"
            style={{ background: ACCENT }}>
            <Star className="w-3 h-3" /> Avis
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Modal Suivi de Commande ── */
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
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', zIndex: 999 }} />
      <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 420, maxWidth: '95vw', background: '#fff', zIndex: 1000, animation: 'slideInRight 0.25s ease-out', overflowY: 'auto' }} className="border-l border-slate-200">
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: DARK_NAVY }}>
          <div>
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-orange-400" /> Suivi de commande en direct
            </h3>
            <p className="text-slate-400 text-xs">Commande N° {order.numero} · {MODE_LABELS[order.modeLivraison]}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg transition"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {STEPS.map((step, i) => {
              const done   = i < currentIdx;
              const active = i === currentIdx;
              const ts     = tsForStep(step);
              return (
                <div key={step} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-colors"
                    style={{
                      background: active ? ACCENT : done ? '#10B981' : '#F1F5F9',
                      color: active || done ? '#FFFFFF' : '#94A3B8',
                      boxShadow: active ? `0 0 0 4px ${ACCENT_LIGHT}` : 'none',
                    }}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: active ? ACCENT : done ? '#0F172A' : '#94A3B8' }}>
                      {ORDER_STATUS[step]?.label || step}
                    </p>
                  </div>
                  {ts && (
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {ts}
                    </span>
                  )}
                  {active && !ts && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                      En cours
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Détail des articles</h4>
            {(order.lignes || []).map((l, i) => (
              <div key={i} className="flex justify-between text-xs text-slate-700">
                <span>{l.quantite}× {l.article?.nom || l.nom}</span>
                <span className="font-semibold text-slate-900">{formatFCFA((l.prixUnitaire || l.prix || 0) * l.quantite)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-sm text-slate-900 pt-3 border-t border-slate-200">
              <span>Total TTC</span>
              <span style={{ color: ACCENT }}>{formatFCFA(order.montantTotal || 0)}</span>
            </div>
          </div>

          {(order.estPaye || order.statut === 'LIVREE') && (
            <button onClick={() => { onClose(); onReceipt(order); }}
              className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs text-white shadow-sm transition hover:opacity-90"
              style={{ background: ACCENT }}>
              <Receipt className="w-4 h-4" /> Consulter le reçu
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   ──  TAB VUE D'ENSEMBLE  ───────────────────────────────────────
   ════════════════════════════════════════════════════════════════ */
function OverviewTab({ user, orders, activeOrders, delivered, cancelled, pendingAvis, totalSpent, avgOrder, loadingOrders, canAvis, setTab, setTrackOrder, setReceiptOrder, setAvisOrder, downloadPdf, handleReorder, handleConfirmReceipt }) {
  const initials = ((user?.prenom || user?.nom || 'U').charAt(0)).toUpperCase();
  const firstName = user?.prenom || user?.nom?.split(' ')[0] || 'Client';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <div className="space-y-6">

      {/* ── Banner d'accueil Corporate / Premium ── */}
      <div className="rounded-2xl overflow-hidden text-white p-6 sm:p-8 relative shadow-lg"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #334155 100%)' }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl text-white shrink-0 border border-slate-700 shadow"
              style={{ background: ACCENT }}>
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{greeting}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <BadgeCheck className="w-3 h-3" /> Membre vérifié
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">{firstName}</h2>
              <p className="text-xs text-slate-300 mt-1">Accédez à vos commandes et moyens de paiement en toute sécurité.</p>
            </div>
          </div>
          <Link to="/menu"
            className="flex items-center gap-2 rounded-xl px-5 py-3 font-bold text-xs text-white shadow transition hover:opacity-90 shrink-0"
            style={{ background: ACCENT, textDecoration: 'none' }}>
            <ChefHat className="w-4 h-4" /> Passer une commande
          </Link>
        </div>
      </div>

      {/* ── Métriques KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Commandes en cours', value: loadingOrders ? '—' : activeOrders.length,  sub: 'Commandes actives', icon: Package, color: ACCENT },
          { label: 'Total dépensé',     value: loadingOrders ? '—' : formatFCFA(totalSpent), sub: avgOrder > 0 ? `Panier moyen ${formatFCFA(avgOrder)}` : 'Historique cumulé', icon: Wallet, color: '#0F172A' },
          { label: 'Commandes livrées',  value: loadingOrders ? '—' : delivered.length,     sub: `${orders.length} commandes au total`, icon: CheckCircle2, color: '#16A34A' },
          { label: 'Avis en attente',    value: loadingOrders ? '—' : pendingAvis.length,   sub: 'Évaluations à compléter', icon: Star, color: '#D97706' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${kpi.color}15` }}>
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 mb-0.5">{kpi.value}</p>
              <p className="text-[11px] font-medium text-slate-500">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Grille 2 colonnes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Colonne Gauche : Commandes en cours & Historique */}
        <div className="lg:col-span-2 space-y-6">

          {/* Alert Avis */}
          {!loadingOrders && pendingAvis.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-900">Évaluez vos expériences récents</p>
                  <p className="text-xs text-amber-700">{pendingAvis.length} commande(s) en attente d'évaluation.</p>
                </div>
              </div>
              <button onClick={() => setAvisOrder(pendingAvis[0])}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition shrink-0">
                Donner un avis
              </button>
            </div>
          )}

          {/* Section Commandes en cours */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-600" />
                <h3 className="text-sm font-bold text-slate-900">Commandes en cours</h3>
                {activeOrders.length > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                    {activeOrders.length}
                  </span>
                )}
              </div>
              <button onClick={() => setTab('orders')} className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1">
                Voir tout <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {loadingOrders ? (
              <div className="p-5 space-y-3">
                {[1, 2].map(i => <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />)}
              </div>
            ) : activeOrders.length === 0 ? (
              <div className="py-12 text-center px-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <ShoppingBag className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-900 mb-1">Aucune commande en cours</p>
                <p className="text-xs text-slate-500 mb-4">Vos nouvelles commandes apparaîtront ici avec suivi temps réel.</p>
                <Link to="/menu"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow transition hover:opacity-90"
                  style={{ background: ACCENT, textDecoration: 'none' }}>
                  <ChefHat className="w-4 h-4" /> Parcourir le catalogue
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
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">Dernières commandes livrées</h3>
                </div>
                <button onClick={() => setTab('orders')} className="text-xs font-bold text-slate-600 hover:underline flex items-center gap-1">
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

        {/* Colonne Droite : Liens rapides et résumé */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Accès rapide</h3>
            <div className="space-y-1">
              {[
                { label: 'Informations personnelles', icon: User, tab: 'profile' },
                { label: 'Portefeuille & Paiement', icon: CreditCard, tab: 'payment' },
                { label: 'Sécurité du compte', icon: Shield, tab: 'security' },
              ].map(item => (
                <button key={item.tab} onClick={() => setTab(item.tab)}
                  className="w-full flex items-center justify-between p-3 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition border border-transparent hover:border-slate-200">
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 text-slate-500" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-md">
            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center mb-3">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <h4 className="text-sm font-bold mb-1">Double Authentification</h4>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">Protégez votre compte avec la validation 2FA pour chaque connexion.</p>
            <button onClick={() => setTab('security')}
              className="w-full py-2.5 rounded-lg text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 transition">
              Gérer la sécurité
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ──  TAB PROFIL  ────────────────────────────────────────────────
   ════════════════════════════════════════════════════════════════ */
function ProfileTab({ user, profileForm, setProfileForm, profileMsg, handleProfileSave, orders, totalSpent, delivered, savedAddresses, addrForm, setAddrForm, addAddress, removeAddress }) {
  const initials = ((user?.prenom || user?.nom || 'U').charAt(0)).toUpperCase();
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : 'Récemment';

  const filled = [profileForm.nom, profileForm.email, profileForm.telephone].filter(Boolean).length;
  const completion = Math.round((filled / 3) * 100);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white shrink-0 shadow"
            style={{ background: ACCENT }}>
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user?.prenom || user?.nom || 'Mon Profil'}</h2>
            <p className="text-xs text-slate-500">{user?.email || ''}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <BadgeCheck className="w-3.5 h-3.5" /> Compte actif
              </span>
              <span className="text-xs text-slate-400">· Membre depuis {memberSince}</span>
            </div>
          </div>
        </div>
        <div className="w-full sm:w-48 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex justify-between text-xs font-bold mb-1">
            <span className="text-slate-600">Complétion profil</span>
            <span style={{ color: completion === 100 ? '#16A34A' : ACCENT }}>{completion}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full transition-all duration-500 rounded-full" style={{ width: `${completion}%`, background: completion === 100 ? '#16A34A' : ACCENT }} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
          <User className="w-4 h-4 text-orange-600" />
          <h3 className="text-sm font-bold text-slate-900">Coordonnées personnelles</h3>
        </div>
        <form onSubmit={handleProfileSave} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Nom complet</label>
              <input type="text" value={profileForm.nom} onChange={e => setProfileForm(p => ({ ...p, nom: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-orange-500 bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Adresse Email</label>
              <input type="email" pattern={EMAIL_PATTERN} title={MSG.email} value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-orange-500 bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Numéro de Téléphone</label>
              <input type="tel" pattern={CI_PHONE_PATTERN} title={MSG.phone} value={profileForm.telephone} onChange={e => setProfileForm(p => ({ ...p, telephone: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-orange-500 bg-slate-50" />
            </div>
          </div>

          {profileMsg && (
            <div className="p-3 rounded-xl text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {profileMsg}
            </div>
          )}

          <div className="pt-2">
            <button type="submit" className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow transition hover:opacity-90"
              style={{ background: ACCENT }}>
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-600" />
            <h3 className="text-sm font-bold text-slate-900">Adresses de livraison enregistrées</h3>
          </div>
          <span className="text-xs text-slate-500">{savedAddresses.length} adresse(s)</span>
        </div>
        <div className="p-6 space-y-3">
          {savedAddresses.map(a => (
            <div key={a.id} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <div>
                <p className="text-xs font-bold text-slate-900">{a.label}</p>
                <p className="text-xs text-slate-600 mt-0.5">{a.adresse}</p>
              </div>
              <button onClick={() => removeAddress(a.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <form onSubmit={addAddress} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <input type="text" placeholder="Libellé (ex: Domicile)" value={addrForm.label} onChange={e => setAddrForm(p => ({ ...p, label: e.target.value }))}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 outline-none focus:border-orange-500" />
            <input type="text" placeholder="Adresse complète" value={addrForm.adresse} onChange={e => setAddrForm(p => ({ ...p, adresse: e.target.value }))}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 outline-none focus:border-orange-500" />
            <button type="submit" className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition">
              Ajouter l'adresse
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ──  TAB PAIEMENT / PORTEFEUILLE  ───────────────────────────────
   ════════════════════════════════════════════════════════════════ */
function PaymentTab({ savedPM, setSavedPM, pmForm, setPmForm, pmMsg, setPmMsg, addPM, removePM, setDefaultPM, userId, paymentTypes, quickPay, toggleQuickPay }) {
  const PAYMENT_TYPES = paymentTypes || PAYMENT_TYPES_FALLBACK;
  const currentType   = PAYMENT_TYPES.find(t => t.id === pmForm.type) || PAYMENT_TYPES[0];
  const defaultPM     = savedPM.find(m => m.isDefault) || savedPM[0] || null;
  const qpOn          = !!quickPay?.enabled && !!defaultPM;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Moyens de paiement</h2>
          <p className="text-xs text-slate-500">Gérez vos options Mobile Money et Cartes Bancaires enregistrées</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
          <Shield className="w-3.5 h-3.5" /> Sécurisé SSL 256-bit
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Comptes enregistrés</h3>
          {savedPM.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center bg-white">
              <CreditCard className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">Aucun moyen enregistre</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Ajoutez Orange Money, MTN MoMo, Moov ou Wave.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedPM.map(m => {
                const type = PAYMENT_TYPES.find(t => t.id === m.type) || PAYMENT_TYPES[0];
                return (
                  <div key={m.id} className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-slate-100 bg-slate-50">
                        {type.logo ? <img src={type.logo} alt={type.label} className="w-7 h-7 object-contain" /> : <CreditCard className="w-5 h-5 text-slate-700" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{m.label}</p>
                        <p className="text-[11px] text-slate-500">{type.label} · {m.numero}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!m.isDefault && (
                        <button onClick={() => setDefaultPM(m.id)} className="text-[11px] font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200">
                          Défaut
                        </button>
                      )}
                      {m.isDefault && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700">Défaut</span>
                      )}
                      <button onClick={() => removePM(m.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Nouveau moyen de paiement</h3>
          <form onSubmit={addPM} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Opérateur / Type</label>
              <select value={pmForm.type} onChange={e => setPmForm(p => ({ ...p, type: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 text-slate-900 outline-none">
                {PAYMENT_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Libellé du compte</label>
              <input type="text" required placeholder="ex: Mon Orange Money principal" value={pmForm.label} onChange={e => setPmForm(p => ({ ...p, label: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 text-slate-900 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Numéro de téléphone</label>
              <input type="text" placeholder={currentType.placeholder} value={pmForm.numero} onChange={e => setPmForm(p => ({ ...p, numero: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 text-slate-900 outline-none" />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-xl text-xs font-bold text-white shadow transition hover:opacity-90"
              style={{ background: ACCENT }}>
              Enregistrer ce moyen
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ──  TAB SÉCURITÉ  ───────────────────────────────────────────────
   ════════════════════════════════════════════════════════════════ */
function SecurityTab({ user }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <Shield className="w-5 h-5 text-slate-800" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Paramètres de sécurité du compte</h2>
            <p className="text-xs text-slate-500">Mettez à jour votre mot de passe et votre double authentification (2FA)</p>
          </div>
        </div>
        <SecurityPanel user={user} accentColor={ACCENT} />
      </div>
    </div>
  );
}

/* ── Module Livraison ── */
function DeliveryTab({ module: mod }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <h2 className="text-base font-bold text-slate-900 mb-2">Module Suivi de Livraison</h2>
      <p className="text-xs text-slate-500">Prestataire configuré : {mod?.provider || 'Standard'}</p>
    </div>
  );
}

/* ── Module Messagerie ── */
function MessagingTab({ module: mod }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <h2 className="text-base font-bold text-slate-900 mb-2">Centre de Messagerie Support</h2>
      <p className="text-xs text-slate-500">Prestataire actif : {mod?.provider || 'Interne'}</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ──  COMPOSANT RACINE CLIENT DASHBOARD  ─────────────────────────
   ════════════════════════════════════════════════════════════════ */
export default function ClientDashboard() {
  const { user, logout, refreshProfile } = useAuth();
  const navigate  = useNavigate();
  const [tab, setTab] = useState('overview');
  const [sideOpen, setSideOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const changeTab = (key) => { setTab(key); setSideOpen(false); };

  const [orders, setOrders] = useState(() => loadCachedOrders(user?.id));
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [ordersError, setOrdersError]     = useState('');
  const [trackOrder, setTrackOrder]       = useState(null);
  const [receiptOrder, setReceiptOrder]   = useState(null);
  const [avisOrder, setAvisOrder]         = useState(null);
  const [avisGiven, setAvisGiven]         = useState(() => loadAvisGiven(user?.id));
  const [profileForm, setProfileForm]     = useState({ nom: user?.nom || '', email: user?.email || '', telephone: user?.telephone || '' });
  const [profileMsg, setProfileMsg]       = useState('');
  const [orderFilter, setOrderFilter]     = useState('all');
  const [savedPM, setSavedPM]             = useState(() => loadSavedPM(user?.id));
  const [pmForm, setPmForm]               = useState({ type: 'ORANGE_MONEY', label: '', numero: '' });
  const [pmMsg, setPmMsg]                 = useState('');
  const [quickPay, setQuickPay]           = useState(() => loadQuickPay(user?.id));
  const [savedAddresses, setSavedAddresses] = useState(() => user?.adressesSauvegardees || []);
  const [addrForm, setAddrForm]           = useState({ label: '', adresse: '' });
  const [paymentTypes, setPaymentTypes]   = useState(PAYMENT_TYPES_FALLBACK);
  const [clientModules, setClientModules] = useState({ delivery: { enabled: false }, messaging: { enabled: false } });

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
      setOrdersError('Impossible de charger vos commandes.');
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

  useEffect(() => {
    modulesAPI.getClientModules().then(r => { if (r.data) setClientModules(r.data); }).catch(() => {});
  }, []);

  useEffect(() => {
    paiementsAPI.getMethods().then(r => {
      const list = r.data?.methods || r.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const mapped = list.map(mapApiMethodToType);
        setPaymentTypes(mapped);
        setPmForm(p => ({ ...p, type: p.type || mapped[0]?.id || 'ORANGE_MONEY' }));
      }
    }).catch(() => {});
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
      setProfileMsg('Profil mis à jour avec succès');
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
    } catch { alert('Reçu PDF temporairement indisponible'); }
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
    if (!items.length) { alert('Détail des articles indisponible pour cette commande.'); return; }
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

  const applyQuickPay = useCallback((enabled, list) => {
    const def = list.find(m => m.isDefault) || list[0];
    const cfg = def && enabled
      ? { enabled: true, method: toCheckoutMethod(def.type), phone: def.numero || '', label: def.label }
      : { enabled: false };
    setQuickPay(cfg);
    saveQuickPay(userId, cfg);
  }, [userId]);

  const addPM = (e) => {
    e.preventDefault();
    if (!pmForm.label.trim()) { setPmMsg('Veuillez indiquer un libellé.'); return; }
    const entry = { id: `${Date.now()}`, type: pmForm.type, label: pmForm.label.trim(), numero: pmForm.numero.trim(), isDefault: savedPM.length === 0 };
    const next  = [...savedPM, entry];
    setSavedPM(next);
    savePM(userId, next);
    applyQuickPay(quickPay.enabled, next);
    setPmForm({ type: 'ORANGE_MONEY', label: '', numero: '' });
    setPmMsg('Moyen de paiement ajouté');
    setTimeout(() => setPmMsg(''), 3000);
  };

  const removePM = (id) => {
    const next = savedPM.filter(m => m.id !== id);
    setSavedPM(next);
    savePM(userId, next);
    applyQuickPay(quickPay.enabled, next);
  };

  const setDefaultPM = (id) => {
    const next = savedPM.map(m => ({ ...m, isDefault: m.id === id }));
    setSavedPM(next);
    savePM(userId, next);
    applyQuickPay(quickPay.enabled, next);
  };

  const toggleQuickPay = () => applyQuickPay(!quickPay.enabled, savedPM);

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
    ...(clientModules.delivery?.enabled  ? [{ key: 'delivery',  label: 'Livraison', icon: Truck }]         : []),
    ...(clientModules.messaging?.enabled ? [{ key: 'messaging', label: 'Messages',  icon: MessageSquare }] : []),
  ];

  /* ── Sidebar Navigation ── */
  const Sidebar = ({ mobile = false }) => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 text-slate-900 font-extrabold text-base" style={{ textDecoration: 'none' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: ACCENT }}>
            <UtensilsCrossed className="w-4 h-4" />
          </div>
          <span>Resto d'ici</span>
        </Link>
        {mobile && (
          <button onClick={() => setSideOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        )}
      </div>

      <div className="p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">Espace Client</p>
        <nav className="space-y-1">
          {TABS.map(item => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button key={item.key} onClick={() => changeTab(item.key)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                style={{
                  background: active ? ACCENT_LIGHT : 'transparent',
                  color: active ? ACCENT : '#475569',
                }}>
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" style={{ color: active ? ACCENT : '#94A3B8' }} />
                  <span>{item.label}</span>
                </div>
                {(item.badge ?? 0) > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: ACCENT }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-3 border-t border-slate-100">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: DARK_NAVY }}>
              {(user?.prenom || user?.nom || 'C')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{user?.prenom || user?.nom || 'Client'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email || ''}</p>
            </div>
          </div>
          <button onClick={() => setShowLogoutConfirm(true)} title="Déconnexion" className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg transition">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="hidden lg:flex flex-col w-56 shrink-0 h-full">
        <Sidebar />
      </div>

      {sideOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="w-64 h-full"><Sidebar mobile /></div>
          <div className="flex-1 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSideOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="shrink-0 flex items-center justify-between px-4 sm:px-6 h-14 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600" onClick={() => setSideOpen(true)}>
              <MenuIcon className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-900 lg:hidden">
              {TABS.find(t => t.key === tab)?.label || 'Mon Compte'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell accentColor={ACCENT} light />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6" style={{ background: BG }}>
          <div className="max-w-5xl mx-auto">
            {ordersError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center justify-between">
                <span>{ordersError}</span>
                <button onClick={() => loadOrders(false)} className="font-bold underline">Réessayer</button>
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
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
                        { k: 'all',      label: `Toutes (${orders.length})` },
                        { k: 'actives',  label: `En cours (${activeOrders.length})` },
                        { k: 'livrees',  label: `Livrées (${delivered.length})` },
                        { k: 'annulees', label: `Annulées (${cancelled.length})` },
                      ].map(f => (
                        <button key={f.k} onClick={() => setOrderFilter(f.k)}
                          className="px-3.5 py-1.5 rounded-full text-xs font-bold transition border"
                          style={{
                            background: orderFilter === f.k ? DARK_NAVY : '#FFFFFF',
                            color: orderFilter === f.k ? '#FFFFFF' : '#475569',
                            borderColor: orderFilter === f.k ? DARK_NAVY : '#E2E8F0',
                          }}>
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">Historique des commandes</span>
                        <Link to="/menu" className="text-xs font-bold text-orange-600 flex items-center gap-1">
                          <ShoppingBag className="w-3.5 h-3.5" /> Catalogue
                        </Link>
                      </div>

                      {loadingOrders ? (
                        <div className="p-8 text-center text-xs text-slate-500">Chargement de vos commandes…</div>
                      ) : filteredOrders.length === 0 ? (
                        <div className="p-12 text-center text-xs text-slate-500">Aucune commande disponible dans ce filtre.</div>
                      ) : (
                        <div className="p-4 space-y-3">
                          {filteredOrders.map(o =>
                            ['LIVREE', 'ANNULEE'].includes(o.statut) ? (
                              <PastOrderRow key={o.id} order={o}
                                onReceipt={() => setReceiptOrder(o)}
                                onDownload={() => downloadPdf(o.id)}
                                onAvis={() => setAvisOrder(o)}
                                canAvis={canAvis(o)}
                                onReorder={handleReorder} />
                            ) : (
                              <ActiveOrderCard key={o.id} order={o}
                                onTrack={() => setTrackOrder(o)}
                                onReceipt={() => setReceiptOrder(o)}
                                onConfirmReceipt={handleConfirmReceipt} />
                            )
                          )}
                        </div>
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
                    userId={userId} paymentTypes={paymentTypes}
                    quickPay={quickPay} toggleQuickPay={toggleQuickPay}
                  />
                )}

                {tab === 'profile' && (
                  <ProfileTab
                    user={user} profileForm={profileForm} setProfileForm={setProfileForm}
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
          </div>
        </div>
      </div>

      {trackOrder   && <OrderTrackModal order={trackOrder}   onClose={() => setTrackOrder(null)}   onReceipt={o => { setTrackOrder(null); setReceiptOrder(o); }} />}
      {receiptOrder && <ReceiptModal    order={receiptOrder} onClose={() => setReceiptOrder(null)} onDownload={downloadPdf} />}
      {avisOrder    && <AvisModal       order={avisOrder}    onClose={() => setAvisOrder(null)}    onSubmit={handleAvisSubmit} />}
      <OnboardingWizard />

      {showLogoutConfirm && (
        <>
          <div onClick={() => setShowLogoutConfirm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', zIndex: 999 }} />
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 p-6 text-center">
              <LogOut className="w-8 h-8 text-red-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 mb-1">Confirmation de déconnexion</h3>
              <p className="text-xs text-slate-500 mb-5">Êtes-vous sûr de vouloir fermer votre session client ?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  Annuler
                </button>
                <button onClick={() => { setShowLogoutConfirm(false); logout?.(); navigate('/login'); }} className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700">
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
