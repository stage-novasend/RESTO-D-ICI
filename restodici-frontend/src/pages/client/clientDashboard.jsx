// src/pages/client/clientDashboard.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag, Clock, CheckCircle, Star, Download, Eye,
  User, Shield, ChefHat, Package, TrendingUp, X, Send,
  Printer, RefreshCw, Receipt, MapPin, Truck, ArrowRight,
  UtensilsCrossed, Wallet
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { commandesService as svcTs, createCommandesSocket } from '../../services/commandes.service';
import { authAPI } from '../../services/api';
import SecurityPanel from '../../components/security/SecurityPanel';
import NotificationBell from '../../components/notifications/NotificationBell';
import { formatFCFA } from '../../utils/formatters';

const ORDER_STATUS = {
  RECUE:        { label: 'Reçue',           bg: '#FFFBEB', color: '#D97706' },
  CONFIRMEE:    { label: 'Confirmée',       bg: '#F0FDF4', color: '#16A34A' },
  EN_PREP:      { label: 'En préparation',  bg: '#FEF3C7', color: '#B45309' },
  PRETE:        { label: 'Prête',           bg: '#F0FDF4', color: '#16A34A' },
  EN_LIVRAISON: { label: 'En livraison',    bg: '#EFF6FF', color: '#2563EB' },
  LIVREE:       { label: 'Livrée ✓',        bg: '#F0FDF4', color: '#15803D' },
  ANNULEE:      { label: 'Annulée',         bg: '#FFF1F2', color: '#E11D48' },
};

const STEPS = ['RECUE', 'CONFIRMEE', 'EN_PREP', 'PRETE', 'EN_LIVRAISON', 'LIVREE'];
const MODE_LABELS = { SUR_PLACE: 'Sur place', EMPORTER: 'À emporter', LIVRAISON: 'Livraison' };
const MODE_ICONS  = { SUR_PLACE: UtensilsCrossed, EMPORTER: Package, LIVRAISON: Truck };

function currentMonthYear() {
  return new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

// ── localStorage helpers ───────────────────────────────────────────────────────
function ordersKey(userId) { return userId ? `orders:${userId}` : 'orders'; }
function avisKey(userId)   { return userId ? `avis_given:${userId}` : 'avis_given'; }

function loadCachedOrders(userId) {
  try {
    const raw = localStorage.getItem(ordersKey(userId));
    if (!raw) return [];
    const { orders, ts } = JSON.parse(raw);
    if (Date.now() - ts < 10 * 60 * 1000) return orders || [];
  } catch { /* ignore */ }
  return [];
}
function saveOrdersCache(userId, orders) {
  try { localStorage.setItem(ordersKey(userId), JSON.stringify({ orders, ts: Date.now() })); }
  catch { /* ignore */ }
}
function loadAvisGiven(userId) {
  try { const raw = localStorage.getItem(avisKey(userId)); return raw ? new Set(JSON.parse(raw)) : new Set(); }
  catch { return new Set(); }
}
function saveAvisGiven(userId, set) {
  try { localStorage.setItem(avisKey(userId), JSON.stringify([...set])); }
  catch { /* ignore */ }
}

// ── Receipt Modal ─────────────────────────────────────────────────────────────
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
      .total{font-size:16px;font-weight:bold;color:#D97706}
    </style></head><body>${content}</body></html>`);
    win.document.close(); win.print();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: '#D97706' }}>
          <div>
            <h3 className="text-white font-extrabold flex items-center gap-2"><Receipt className="w-4 h-4" />Reçu de commande</h3>
            <p className="text-white/70 text-xs">#{order.numero}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          <div ref={printRef}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>Resto d'ici</h2>
            <p style={{ margin: '0 0 2px', fontSize: 13, color: '#555' }}>{date}</p>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#555' }}>
              {MODE_LABELS[order.mode] || order.mode} · Commande #{order.numero}
            </p>
            <hr style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
            {(order.lignes || []).map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, margin: '4px 0' }}>
                <span>{l.quantite}× {l.article?.nom || l.nom}</span>
                <span>{formatFCFA((l.prixUnitaire || l.prix || 0) * l.quantite)}</span>
              </div>
            ))}
            <hr style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 'bold', color: '#D97706' }}>
              <span>Total</span><span>{formatFCFA(total)}</span>
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm bg-[#FEF3C7] text-[#B45309]">
            <Printer className="w-3.5 h-3.5" />Imprimer
          </button>
          <button onClick={() => onDownload(order.id)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white bg-[#D97706]">
            <Download className="w-3.5 h-3.5" />PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Avis Modal ────────────────────────────────────────────────────────────────
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between bg-[#D97706]">
          <div>
            <h3 className="text-white font-extrabold">Laisser un avis</h3>
            <p className="text-white/70 text-xs">Commande #{order.numero}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-[#1A1A1A] mb-2">Votre note</p>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setNote(n)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                  style={{ background: n <= note ? '#D97706' : '#FEF3C7', color: n <= note ? '#fff' : '#B45309' }}>
                  <Star className="w-4.5 h-4.5" fill={n <= note ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-[#1A1A1A] block mb-1.5">Commentaire (optionnel)</label>
            <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)}
              rows={3} placeholder="Partagez votre expérience…"
              className="w-full bg-[#FEF3C7] border-0 rounded-2xl px-4 py-3 text-sm text-[#1A1A1A] placeholder-gray-400 focus:outline-none resize-none" />
          </div>
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 text-white bg-[#D97706]">
            {submitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Envoyer l'avis
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Active Order Card (compact, visual progress) ───────────────────────────────
function ActiveOrderCard({ order, onTrack, onReceipt }) {
  const currentIdx = STEPS.indexOf(order.statut);
  const progress = currentIdx >= 0 ? Math.round(((currentIdx + 1) / STEPS.length) * 100) : 0;
  const status = ORDER_STATUS[order.statut] || { label: order.statut, bg: '#F3F4F6', color: '#6B7280' };
  const ModeIcon = MODE_ICONS[order.modeLivraison] || Package;
  const restaurantName = order.restaurant?.nom || '';

  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid #F9FAFB' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ModeIcon style={{ width: 17, height: 17, color: '#6B7280' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>#{order.numero}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: status.color, background: status.bg, padding: '2px 8px', borderRadius: 99 }}>
              {status.label}
            </span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', animation: 'pulse 2s infinite', flexShrink: 0 }} />
          </div>
          <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
            {restaurantName && `${restaurantName} · `}{MODE_LABELS[order.modeLivraison] || order.modeLivraison}
          </p>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>
            {formatFCFA(order.total || order.montantTotal || 0)} <span style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF' }}>CFA</span>
          </p>
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ height: 4, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{
          height: '100%', width: `${progress}%`, borderRadius: 99,
          background: order.statut === 'LIVREE' ? '#16A34A' : '#D97706',
          transition: 'width 0.5s',
        }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onTrack} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '7px 0', borderRadius: 10, border: '1.5px solid #E8ECE8', background: '#fff',
          fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer',
        }}>
          <Eye style={{ width: 13, height: 13 }} /> Suivre
        </button>
        {order.estPaye && (
          <button onClick={onReceipt} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 10, border: 'none',
            background: '#D97706', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer',
          }}>
            <Receipt style={{ width: 13, height: 13 }} /> Reçu
          </button>
        )}
      </div>
    </div>
  );
}

// ── Delivered Order Row ───────────────────────────────────────────────────────
function DeliveredOrderRow({ order, onReceipt, onDownload, onAvis, canAvis }) {
  const date = new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
  const restaurantName = order.restaurant?.nom || '';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', borderBottom: '1px solid #F9FAFB' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <CheckCircle style={{ width: 16, height: 16, color: '#16A34A' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>#{order.numero}</p>
        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
          {date}{restaurantName ? ` · ${restaurantName}` : ''} · {order.lignes?.length || 0} article(s)
        </p>
      </div>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', flexShrink: 0 }}>
        {formatFCFA(order.total || order.montantTotal || 0)}
      </p>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {(order.estPaye || order.statut === 'LIVREE') && (
          <button onClick={onReceipt} title="Voir reçu" style={{
            width: 28, height: 28, borderRadius: 8, border: 'none',
            background: '#FEF3C7', color: '#B45309', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Receipt style={{ width: 12, height: 12 }} />
          </button>
        )}
        <button onClick={onDownload} title="PDF" style={{
          width: 28, height: 28, borderRadius: 8, border: 'none',
          background: '#F3F4F6', color: '#6B7280', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Download style={{ width: 12, height: 12 }} />
        </button>
        {canAvis && (
          <button onClick={onAvis} title="Avis" style={{
            width: 28, height: 28, borderRadius: 8, border: 'none',
            background: '#FFFBEB', color: '#D97706', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Star style={{ width: 12, height: 12 }} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Order Track Modal ─────────────────────────────────────────────────────────
function OrderTrackModal({ order, onClose, onReceipt }) {
  const currentIdx = STEPS.indexOf(order.statut);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between bg-[#D97706]">
          <div>
            <h3 className="text-white font-extrabold">Suivi commande</h3>
            <p className="text-white/70 text-xs">#{order.numero} · {MODE_LABELS[order.modeLivraison] || order.modeLivraison}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">
          <div className="space-y-2.5">
            {STEPS.map((step, i) => {
              const done = i < currentIdx;
              const active = i === currentIdx;
              return (
                <div key={step} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ background: active ? '#D97706' : done ? '#22C55E' : '#F3F4F6', color: active || done ? '#fff' : '#9CA3AF', boxShadow: active ? '0 0 0 4px #FEF3C7' : 'none' }}>
                    {done ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <p className="text-sm font-medium" style={{ color: active ? '#D97706' : done ? '#16A34A' : '#9CA3AF' }}>
                    {ORDER_STATUS[step]?.label || step}
                  </p>
                  {active && <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309]">Statut actuel</span>}
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5">
            {(order.lignes || []).map((l, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600">{l.quantite}× {l.article?.nom || l.nom}</span>
                <span className="font-semibold text-[#1A1A1A]">{formatFCFA((l.prixUnitaire || l.prix || 0) * l.quantite)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-[#1A1A1A] pt-2 border-t border-gray-100">
              <span>Total</span>
              <span className="text-[#D97706]">{formatFCFA(order.total || order.montantTotal || 0)}</span>
            </div>
          </div>
          {(order.estPaye || order.statut === 'LIVREE') && (
            <button onClick={() => { onClose(); onReceipt(order); }}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white bg-[#D97706]">
              <Receipt className="w-3.5 h-3.5" />Voir le reçu
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ClientDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [orders, setOrders] = useState(() => loadCachedOrders(user?.id));
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trackOrder, setTrackOrder] = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [avisOrder, setAvisOrder] = useState(null);
  const [avisGiven, setAvisGiven] = useState(() => loadAvisGiven(user?.id));
  const [profileForm, setProfileForm] = useState({ nom: user?.nom || '', email: user?.email || '', telephone: user?.telephone || '' });
  const [profileMsg, setProfileMsg] = useState('');
  const [orderFilter, setOrderFilter] = useState('all');

  const userId = user?.id;

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoadingOrders(true); else setRefreshing(true);
    try {
      const res = await svcTs.getMyOrders();
      const data = res.data || [];
      setOrders(data);
      saveOrdersCache(userId, data);
    } catch { /* keep cached data on error */ }
    finally { setLoadingOrders(false); setRefreshing(false); }
  }, [userId]);

  useEffect(() => {
    const cached = loadCachedOrders(userId);
    if (cached.length > 0) { setOrders(cached); setLoadingOrders(false); loadOrders(true); }
    else { loadOrders(false); }
  }, [loadOrders, userId]);

  useEffect(() => {
    if (user) setProfileForm({ nom: user.nom || '', email: user.email || '', telephone: user.telephone || '' });
  }, [user]);

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
      setProfileMsg('Profil mis à jour !');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch { setProfileMsg('Erreur lors de la mise à jour'); }
  };

  const downloadPdf = async (orderId) => {
    try {
      const res = await svcTs.getReceiptPdf(orderId);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = `recu-${orderId}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch { alert('Reçu PDF non disponible'); }
  };

  const activeOrders = orders.filter(o => !['LIVREE','ANNULEE'].includes(o.statut));
  const delivered    = orders.filter(o => o.statut === 'LIVREE');
  const cancelled    = orders.filter(o => o.statut === 'ANNULEE');
  const totalSpent   = delivered.reduce((s, o) => s + (o.total || o.montantTotal || 0), 0);
  const avgOrderValue = delivered.length > 0 ? Math.round(totalSpent / delivered.length) : 0;

  const filteredOrders = orderFilter === 'actives'  ? activeOrders
                       : orderFilter === 'livrees'  ? delivered
                       : orderFilter === 'annulees' ? cancelled
                       : orders;

  const S = {
    page:  { minHeight: '100vh', background: '#F0F2F0', padding: '28px 32px' },
    card:  { background: '#fff', borderRadius: 20, border: '1px solid #E8ECE8', overflow: 'hidden' },
    hdr:   { fontSize: 15, fontWeight: 700, color: '#111827', padding: '14px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  };

  return (
    <div style={S.page}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: 0 }}>Mon Espace</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
            Bonjour {user?.prenom || user?.nom} · Vos commandes pour {currentMonthYear()}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {[
            { key: 'overview', label: 'Vue d\'ensemble' },
            { key: 'orders',   label: 'Commandes', badge: activeOrders.length },
            { key: 'profile',  label: 'Profil' },
            { key: 'security', label: 'Sécurité' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              background: tab === t.key ? '#D97706' : '#fff',
              color: tab === t.key ? '#fff' : '#6B7280',
              boxShadow: tab === t.key ? '0 2px 8px rgba(217,119,6,0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              {t.label}
              {t.badge > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, width: 17, height: 17, borderRadius: '50%',
                  background: tab === t.key ? 'rgba(255,255,255,0.3)' : '#D97706',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
          <button onClick={() => loadOrders(true)} disabled={refreshing} style={{
            width: 36, height: 36, borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280',
          }}>
            <RefreshCw style={{ width: 14, height: 14 }} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <div style={{ background: '#1C3A1C', borderRadius: 10, padding: 4 }}>
            <NotificationBell accentColor="#D97706" />
          </div>
        </div>
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* 3 KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

            {/* Commandes actives */}
            <div style={{ ...S.card, padding: 22 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Clock style={{ width: 16, height: 16, color: '#D97706' }} />
              </div>
              <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 6px' }}>Commandes actives</p>
              {loadingOrders ? (
                <div style={{ height: 44, background: '#F3F4F6', borderRadius: 8 }} />
              ) : (
                <p style={{ fontSize: 40, fontWeight: 800, color: '#111827', lineHeight: 1, margin: 0 }}>
                  {activeOrders.length}
                </p>
              )}
              {activeOrders.length > 0 && (
                <p style={{ fontSize: 12, color: '#D97706', marginTop: 8, fontWeight: 600 }}>
                  En cours de traitement
                </p>
              )}
            </div>

            {/* Total dépensé */}
            <div style={{ ...S.card, padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet style={{ width: 16, height: 16, color: '#16A34A' }} />
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 6px' }}>Total dépensé</p>
              {loadingOrders ? (
                <div style={{ height: 44, background: '#F3F4F6', borderRadius: 8 }} />
              ) : (
                <p style={{ fontSize: 28, fontWeight: 800, color: '#111827', lineHeight: 1.1, margin: 0 }}>
                  {formatFCFA(totalSpent)}
                  <span style={{ fontSize: 16, fontWeight: 600, marginLeft: 4 }}>CFA</span>
                </p>
              )}
              {avgOrderValue > 0 && (
                <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>
                  Ticket moyen : {formatFCFA(avgOrderValue)} CFA
                </p>
              )}
            </div>

            {/* Commandes livrées */}
            <div style={{ ...S.card, padding: 22 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <CheckCircle style={{ width: 16, height: 16, color: '#2563EB' }} />
              </div>
              <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 6px' }}>Commandes livrées</p>
              {loadingOrders ? (
                <div style={{ height: 44, background: '#F3F4F6', borderRadius: 8 }} />
              ) : (
                <p style={{ fontSize: 40, fontWeight: 800, color: '#111827', lineHeight: 1, margin: 0 }}>
                  {delivered.length}
                </p>
              )}
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>
                {orders.length} commande{orders.length !== 1 ? 's' : ''} au total
              </p>
            </div>
          </div>

          {/* 2-col: active orders + CTA */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

            {/* Active orders */}
            <div style={S.card}>
              <div style={S.hdr}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>Commandes en cours</span>
                  {activeOrders.length > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#D97706', background: '#FFFBEB', padding: '2px 8px', borderRadius: 99 }}>
                      {activeOrders.length} active{activeOrders.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <button onClick={() => setTab('orders')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: '#D97706', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Voir tout <ArrowRight style={{ width: 12, height: 12 }} />
                </button>
              </div>
              {loadingOrders ? (
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1,2].map(i => <div key={i} style={{ height: 70, background: '#F3F4F6', borderRadius: 12 }} />)}
                </div>
              ) : activeOrders.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center' }}>
                  <ShoppingBag style={{ width: 36, height: 36, color: '#D1D5DB', margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Aucune commande en cours</p>
                </div>
              ) : (
                activeOrders.slice(0, 3).map(o => (
                  <ActiveOrderCard key={o.id} order={o}
                    onTrack={() => setTrackOrder(o)}
                    onReceipt={() => setReceiptOrder(o)} />
                ))
              )}
            </div>

            {/* Right column: Commander CTA + quick stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Commander CTA */}
              <div style={{
                borderRadius: 20, padding: 22, background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChefHat style={{ width: 18, height: 18, color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>Commander maintenant</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', margin: 0 }}>Plats frais disponibles</p>
                </div>
                <Link to="/menu" style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: '#fff', color: '#D97706', fontWeight: 700, fontSize: 13,
                  padding: '9px 18px', borderRadius: 10, textDecoration: 'none',
                }}>
                  Parcourir le menu <ArrowRight style={{ width: 14, height: 14 }} />
                </Link>
              </div>

              {/* Last delivery */}
              {delivered.length > 0 && (
                <div style={{ ...S.card, padding: 18 }}>
                  <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 8px' }}>Dernière livraison</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle style={{ width: 15, height: 15, color: '#16A34A' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>#{delivered[0].numero}</p>
                      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                        {formatFCFA(delivered[0].total || delivered[0].montantTotal || 0)} CFA
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent delivered */}
          {delivered.length > 0 && (
            <div style={S.card}>
              <div style={S.hdr}>
                <span>Dernières commandes livrées</span>
                <button onClick={() => setTab('orders')} style={{ fontSize: 13, fontWeight: 600, color: '#D97706', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Historique complet <ArrowRight style={{ width: 12, height: 12 }} />
                </button>
              </div>
              {delivered.slice(0, 4).map(o => (
                <DeliveredOrderRow key={o.id} order={o}
                  onReceipt={() => setReceiptOrder(o)}
                  onDownload={() => downloadPdf(o.id)}
                  onAvis={() => setAvisOrder(o)}
                  canAvis={o.statut === 'LIVREE' && !avisGiven.has(o.id) && !o.avis}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ORDERS ── */}
      {tab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Filter bar */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { k: 'all',      label: `Toutes (${orders.length})` },
              { k: 'actives',  label: `En cours (${activeOrders.length})` },
              { k: 'livrees',  label: `Livrées (${delivered.length})` },
              { k: 'annulees', label: `Annulées (${cancelled.length})` },
            ].map(f => (
              <button key={f.k} onClick={() => setOrderFilter(f.k)} style={{
                padding: '7px 14px', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: orderFilter === f.k ? '#D97706' : '#fff',
                color: orderFilter === f.k ? '#fff' : '#6B7280',
                border: `1.5px solid ${orderFilter === f.k ? '#D97706' : '#E5E7EB'}`,
              }}>
                {f.label}
              </button>
            ))}
          </div>

          <div style={S.card}>
            <div style={S.hdr}>
              <div>
                <span>Mes commandes</span>
                <span style={{ marginLeft: 8, fontSize: 12, color: '#9CA3AF', fontWeight: 400 }}>
                  {filteredOrders.length} résultat{filteredOrders.length !== 1 ? 's' : ''}
                </span>
              </div>
              <Link to="/menu" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#D97706', textDecoration: 'none' }}>
                <ShoppingBag style={{ width: 13, height: 13 }} /> Commander
              </Link>
            </div>
            {loadingOrders ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <div className="w-8 h-8 border-2 border-[#D97706] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <ShoppingBag style={{ width: 40, height: 40, color: '#D1D5DB', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>Aucune commande dans cette catégorie</p>
                <Link to="/menu" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16,
                  background: '#D97706', color: '#fff', fontWeight: 700, fontSize: 13,
                  padding: '9px 18px', borderRadius: 10, textDecoration: 'none',
                }}>
                  Commander maintenant
                </Link>
              </div>
            ) : (
              filteredOrders.map(o =>
                ['LIVREE','ANNULEE'].includes(o.statut) ? (
                  <DeliveredOrderRow key={o.id} order={o}
                    onReceipt={() => setReceiptOrder(o)}
                    onDownload={() => downloadPdf(o.id)}
                    onAvis={() => setAvisOrder(o)}
                    canAvis={o.statut === 'LIVREE' && !avisGiven.has(o.id) && !o.avis}
                  />
                ) : (
                  <ActiveOrderCard key={o.id} order={o}
                    onTrack={() => setTrackOrder(o)}
                    onReceipt={() => setReceiptOrder(o)} />
                )
              )
            )}
          </div>
        </div>
      )}

      {/* ── PROFILE ── */}
      {tab === 'profile' && (
        <div style={{ maxWidth: 480 }}>
          <div style={S.card}>
            <div style={S.hdr}>Mon profil</div>
            <form onSubmit={handleProfileSave} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { k: 'nom',       label: 'Nom complet',  type: 'text' },
                { k: 'email',     label: 'Email',        type: 'email' },
                { k: 'telephone', label: 'Téléphone',    type: 'tel' },
              ].map(f => (
                <div key={f.k}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{f.label}</label>
                  <input value={profileForm[f.k]} type={f.type}
                    onChange={e => setProfileForm(p => ({ ...p, [f.k]: e.target.value }))}
                    style={{ width: '100%', background: '#F3F4F6', border: 'none', borderRadius: 12, padding: '12px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              {profileMsg && (
                <p style={{ fontSize: 13, fontWeight: 600, color: profileMsg.includes('Erreur') ? '#EF4444' : '#16A34A', margin: 0 }}>{profileMsg}</p>
              )}
              <button type="submit" style={{ background: '#D97706', color: '#fff', fontWeight: 700, fontSize: 14, padding: 13, borderRadius: 14, border: 'none', cursor: 'pointer' }}>
                Enregistrer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── SECURITY ── */}
      {tab === 'security' && (
        <div style={{ maxWidth: 560 }}>
          <SecurityPanel user={user} accentColor="#D97706" />
        </div>
      )}

      {/* Modals */}
      {trackOrder   && <OrderTrackModal order={trackOrder}   onClose={() => setTrackOrder(null)}   onReceipt={o => { setTrackOrder(null); setReceiptOrder(o); }} />}
      {receiptOrder && <ReceiptModal    order={receiptOrder} onClose={() => setReceiptOrder(null)} onDownload={downloadPdf} />}
      {avisOrder    && <AvisModal       order={avisOrder}    onClose={() => setAvisOrder(null)}    onSubmit={handleAvisSubmit} />}
    </div>
  );
}
