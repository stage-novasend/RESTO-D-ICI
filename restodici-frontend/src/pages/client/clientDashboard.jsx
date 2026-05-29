import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Clock, CheckCircle, Star, Download, Eye,
  User, Shield, ChefHat, Package, X, Send,
  Printer, RefreshCw, RefreshCcw, Receipt, Truck, ArrowRight,
  UtensilsCrossed, Wallet, AlertCircle, MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { commandesService as svcTs, createCommandesSocket } from '../../services/commandes.service';
import { authAPI } from '../../services/api';
import SecurityPanel from '../../components/security/SecurityPanel';
import NotificationBell from '../../components/notifications/NotificationBell';
import { formatFCFA } from '../../utils/formatters';

// ── Design tokens ─────────────────────────────────────────────────────────────
const ACCENT      = '#C05015';
const ACCENT_DARK = '#9A3E10';
const ACCENT_LIGHT= '#FBE8DC';
const SURFACE     = '#F9F7F5';
const BORDER      = 'rgba(89,67,42,0.10)';

const ORDER_STATUS = {
  RECUE:        { label: 'Reçue',           bg: '#FFFBEB', color: '#D97706' },
  CONFIRMEE:    { label: 'Confirmée',       bg: '#F0FDF4', color: '#16A34A' },
  EN_PREP:      { label: 'En préparation',  bg: '#FEF3C7', color: '#B45309' },
  PRETE:        { label: 'Prête',           bg: '#F0FDF4', color: '#16A34A' },
  EN_LIVRAISON: { label: 'En livraison',    bg: '#EFF6FF', color: '#2563EB' },
  LIVREE:       { label: 'Livrée ✓',        bg: '#F0FDF4', color: '#15803D' },
  ANNULEE:      { label: 'Annulée',         bg: '#FFF1F2', color: '#E11D48' },
};

const STEPS     = ['RECUE', 'CONFIRMEE', 'EN_PREP', 'PRETE', 'EN_LIVRAISON', 'LIVREE'];
const MODE_LABELS = { SUR_PLACE: 'Sur place', EMPORTER: 'À emporter', LIVRAISON: 'Livraison' };
const MODE_ICONS  = { SUR_PLACE: UtensilsCrossed, EMPORTER: Package, LIVRAISON: Truck };

// ── localStorage helpers ───────────────────────────────────────────────────────
function ordersKey(uid) { return uid ? `orders:${uid}` : 'orders'; }
function avisKey(uid)   { return uid ? `avis_given:${uid}` : 'avis_given'; }

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
  try { localStorage.setItem(ordersKey(uid), JSON.stringify({ orders, ts: Date.now() })); }
  catch { /* ignore */ }
}
function loadAvisGiven(uid) {
  try { return new Set(JSON.parse(localStorage.getItem(avisKey(uid)) || '[]')); }
  catch { return new Set(); }
}
function saveAvisGiven(uid, set) {
  try { localStorage.setItem(avisKey(uid), JSON.stringify([...set])); }
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
      .total{font-size:16px;font-weight:bold;color:${ACCENT}}
    </style></head><body>${content}</body></html>`);
    win.document.close(); win.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
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
              <span>Total</span><span>{formatFCFA(total)} FCFA</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: ACCENT }}>
          <div>
            <h3 className="text-white font-extrabold">Laisser un avis</h3>
            <p className="text-white/70 text-xs">
              {order.restaurant?.nom || 'Restaurant'} · #{order.numero}
            </p>
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
            <p className="text-center text-sm text-[#6B7280] mt-2 font-medium">
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
    </div>
  );
}

// ── Active Order Card ─────────────────────────────────────────────────────────
function ActiveOrderCard({ order, onTrack, onReceipt }) {
  const idx = STEPS.indexOf(order.statut);
  const progress = idx >= 0 ? Math.round(((idx + 1) / STEPS.length) * 100) : 0;
  const status = ORDER_STATUS[order.statut] || { label: order.statut, bg: '#F3F4F6', color: '#6B7280' };
  const ModeIcon = MODE_ICONS[order.modeLivraison] || Package;

  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: BORDER, background: '#fff' }}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: ACCENT_LIGHT }}>
          <ModeIcon className="w-4 h-4" style={{ color: ACCENT }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-[#111827]">#{order.numero}</span>
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
        <p className="text-sm font-bold text-[#111827] shrink-0">
          {formatFCFA(order.montantTotal || 0)} <span className="text-xs font-normal text-[#9CA3AF]">CFA</span>
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden mb-3">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, background: order.statut === 'LIVREE' ? '#16A34A' : ACCENT }} />
      </div>

      <div className="flex gap-2">
        <button onClick={onTrack}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-[#374151] border transition hover:border-[#C05015] hover:text-[#C05015]"
          style={{ borderColor: BORDER }}>
          <Eye className="w-3.5 h-3.5" /> Suivre
        </button>
        {order.estPaye && (
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

// ── Past Order Row ────────────────────────────────────────────────────────────
function PastOrderRow({ order, onReceipt, onDownload, onAvis, canAvis, onReorder }) {
  const date = new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
  const status = ORDER_STATUS[order.statut] || { label: order.statut, bg: '#F3F4F6', color: '#6B7280' };

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 border-b last:border-0" style={{ borderColor: BORDER }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: order.statut === 'ANNULEE' ? '#FFF1F2' : '#F0FDF4' }}>
        {order.statut === 'ANNULEE'
          ? <X className="w-4 h-4 text-red-500" />
          : <CheckCircle className="w-4 h-4 text-green-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#111827]">#{order.numero}</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: status.bg, color: status.color }}>{status.label}</span>
        </div>
        <p className="text-xs text-[#9CA3AF] mt-0.5">
          {date}{order.restaurant?.nom ? ` · ${order.restaurant.nom}` : ''} · {order.lignes?.length || 0} art.
        </p>
      </div>
      <p className="text-sm font-bold text-[#111827] shrink-0">
        {formatFCFA(order.montantTotal || 0)}
      </p>
      <div className="flex items-center gap-1.5">
        {(order.estPaye || order.statut === 'LIVREE') && (
          <button onClick={onReceipt} title="Voir reçu"
            className="w-8 h-8 rounded-xl flex items-center justify-center transition"
            style={{ background: ACCENT_LIGHT, color: ACCENT_DARK }}>
            <Receipt className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={onDownload} title="Télécharger PDF"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[#9CA3AF] hover:text-[#6B7280] bg-[#F3F4F6] transition">
          <Download className="w-3.5 h-3.5" />
        </button>
        {order.statut === 'LIVREE' && onReorder && (
          <button onClick={() => onReorder(order)} title="Commander à nouveau"
            className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-semibold text-white transition"
            style={{ background: ACCENT_DARK }}>
            <RefreshCcw className="w-3 h-3" /> Commander à nouveau
          </button>
        )}
        {canAvis && (
          <button onClick={onAvis} title="Laisser un avis"
            className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-semibold text-white transition"
            style={{ background: ACCENT }}>
            <Star className="w-3 h-3" /> Avis
          </button>
        )}
      </div>
    </div>
  );
}

// ── Avis Prompt Card (for recently delivered orders needing review) ─────────
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
        <p className="text-sm font-bold text-[#111827]">{order.restaurant?.nom || 'Votre commande'}</p>
        <p className="text-xs text-[#6B7280] truncate">{items || 'Commande livrée'}</p>
      </div>
      <button onClick={onAvis}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white shrink-0 transition"
        style={{ background: ACCENT }}>
        <Star className="w-3.5 h-3.5" /> Donner un avis
      </button>
    </div>
  );
}

// ── Order Track Modal ─────────────────────────────────────────────────────────
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
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
              const done = i < currentIdx;
              const active = i === currentIdx;
              const ts = tsForStep(step);
              return (
                <div key={step} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{
                      background: active ? ACCENT : done ? '#22C55E' : '#F3F4F6',
                      color: active || done ? '#fff' : '#9CA3AF',
                      boxShadow: active ? `0 0 0 4px ${ACCENT_LIGHT}` : 'none',
                    }}>
                    {done ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <p className="text-sm font-medium flex-1" style={{ color: active ? ACCENT : done ? '#16A34A' : '#9CA3AF' }}>
                    {ORDER_STATUS[step]?.label || step}
                  </p>
                  {ts && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: done || active ? '#F0FDF4' : '#F3F4F6', color: done ? '#16A34A' : active ? ACCENT : '#9CA3AF' }}>
                      {ts}
                    </span>
                  )}
                  {active && !ts && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: ACCENT_LIGHT, color: ACCENT_DARK }}>
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
                <span className="text-[#6B7280]">{l.quantite}× {l.article?.nom || l.nom}</span>
                <span className="font-semibold text-[#1A1A1A]">{formatFCFA((l.prixUnitaire || l.prix || 0) * l.quantite)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-[#1A1A1A] pt-2 border-t" style={{ borderColor: BORDER }}>
              <span>Total</span>
              <span style={{ color: ACCENT }}>{formatFCFA(order.montantTotal || 0)} FCFA</span>
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
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [orders, setOrders] = useState(() => loadCachedOrders(user?.id));
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [trackOrder, setTrackOrder]   = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [avisOrder, setAvisOrder]     = useState(null);
  const [avisGiven, setAvisGiven]     = useState(() => loadAvisGiven(user?.id));
  const [profileForm, setProfileForm] = useState({ nom: user?.nom || '', email: user?.email || '', telephone: user?.telephone || '' });
  const [profileMsg, setProfileMsg]   = useState('');
  const [orderFilter, setOrderFilter] = useState('all');

  const userId = user?.id;

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoadingOrders(true); else setRefreshing(true);
    setOrdersError('');
    try {
      const res = await svcTs.getMyOrders();
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
      const a = document.createElement('a');
      a.href = url; a.download = `recu-${orderId}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch { alert('Reçu PDF non disponible'); }
  };

  const canAvis = (o) => o.statut === 'LIVREE' && !avisGiven.has(o.id) && !o.avis;

  const handleReorder = (order) => {
    const items = (order.lignes || []).map(l => ({
      articleId: l.article?.id || l.articleId,
      nom: l.article?.nom || 'Article',
      prix: Number(l.prixUnitaire || l.article?.prix || 0),
      quantite: l.quantite || 1,
      restaurantId: order.restaurant?.id || order.restaurantId,
    }));
    if (!items.length) {
      alert('Impossible de renouveler : détail des articles indisponible');
      return;
    }
    const pendingOrder = {
      restaurantId: order.restaurant?.id || order.restaurantId,
      restaurantName: order.restaurant?.nom || 'Restaurant',
      orderMode: order.modeLivraison || 'SUR_PLACE',
      deliveryAddress: order.adresseLivraison || '',
      items,
      total: items.reduce((s, i) => s + i.prix * i.quantite, 0),
    };
    localStorage.setItem('pendingOrder', JSON.stringify(pendingOrder));
    navigate('/checkout');
  };

  const activeOrders  = orders.filter(o => !['LIVREE', 'ANNULEE'].includes(o.statut));
  const delivered     = orders.filter(o => o.statut === 'LIVREE');
  const cancelled     = orders.filter(o => o.statut === 'ANNULEE');
  const pendingAvis   = delivered.filter(o => canAvis(o));
  const totalSpent    = delivered.reduce((s, o) => s + (o.montantTotal || 0), 0);
  const avgOrder      = delivered.length > 0 ? Math.round(totalSpent / delivered.length) : 0;

  const filteredOrders = orderFilter === 'actives'  ? activeOrders
                       : orderFilter === 'livrees'  ? delivered
                       : orderFilter === 'annulees' ? cancelled
                       : orders;

  const TABS = [
    { key: 'overview', label: 'Vue d\'ensemble', icon: ShoppingBag },
    { key: 'orders',   label: 'Commandes', icon: Package, badge: activeOrders.length || undefined },
    { key: 'profile',  label: 'Profil', icon: User },
    { key: 'security', label: 'Sécurité', icon: Shield },
  ];

  return (
    <div className="min-h-screen" style={{ background: SURFACE }}>
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b" style={{ borderColor: BORDER }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>Espace client</p>
            <h1 className="text-base font-extrabold text-[#111827] leading-none">
              Bonjour, {user?.prenom || user?.nom || 'Vous'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => loadOrders(true)} disabled={refreshing}
              className="w-9 h-9 rounded-xl flex items-center justify-center border text-[#6B7280] hover:text-[#111827] transition"
              style={{ borderColor: BORDER }}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <NotificationBell accentColor={ACCENT} />
          </div>
        </div>
        {/* Tab nav */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 pb-2 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold whitespace-nowrap transition shrink-0"
              style={{
                background: tab === t.key ? ACCENT : 'transparent',
                color: tab === t.key ? '#fff' : '#6B7280',
              }}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.badge > 0 && (
                <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: tab === t.key ? 'rgba(255,255,255,0.3)' : ACCENT, color: '#fff' }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Global error banner */}
        {ordersError && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl border"
            style={{ background: '#FFF1F2', borderColor: '#FECDD3' }}>
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 flex-1">{ordersError}</p>
            <button onClick={() => loadOrders(false)}
              className="text-xs font-bold text-red-700 underline shrink-0">Réessayer</button>
          </div>
        )}

        {/* ── OVERVIEW ───────────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-5">

            {/* KPI row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Active */}
              <div className="bg-white rounded-2xl border p-4" style={{ borderColor: BORDER }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: ACCENT_LIGHT }}>
                  <Clock className="w-4 h-4" style={{ color: ACCENT }} />
                </div>
                <p className="text-xs text-[#6B7280] mb-1">En cours</p>
                <p className="text-3xl font-extrabold text-[#111827]">
                  {loadingOrders ? '—' : activeOrders.length}
                </p>
                {activeOrders.length > 0 && (
                  <p className="text-xs font-semibold mt-1" style={{ color: ACCENT }}>En traitement</p>
                )}
              </div>
              {/* Spent */}
              <div className="bg-white rounded-2xl border p-4" style={{ borderColor: BORDER }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3 bg-green-50">
                  <Wallet className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-xs text-[#6B7280] mb-1">Total dépensé</p>
                <p className="text-xl font-extrabold text-[#111827]">
                  {loadingOrders ? '—' : `${formatFCFA(totalSpent)} CFA`}
                </p>
                {avgOrder > 0 && (
                  <p className="text-xs text-[#9CA3AF] mt-1">Ticket moyen : {formatFCFA(avgOrder)} CFA</p>
                )}
              </div>
              {/* Delivered */}
              <div className="bg-white rounded-2xl border p-4" style={{ borderColor: BORDER }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3 bg-blue-50">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-xs text-[#6B7280] mb-1">Livrées</p>
                <p className="text-3xl font-extrabold text-[#111827]">
                  {loadingOrders ? '—' : delivered.length}
                </p>
                <p className="text-xs text-[#9CA3AF] mt-1">{orders.length} au total</p>
              </div>
            </div>

            {/* Avis pending — prominent CTA */}
            {!loadingOrders && pendingAvis.length > 0 && (
              <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: BORDER }}>
                <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ borderColor: BORDER }}>
                  <Star className="w-4 h-4" style={{ color: ACCENT }} />
                  <span className="text-sm font-bold text-[#111827]">
                    Vos avis nous intéressent
                  </span>
                  <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                    style={{ background: ACCENT }}>
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

            {/* 2-col: active orders + CTA */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Active orders */}
              <div className="lg:col-span-2 bg-white rounded-2xl border overflow-hidden" style={{ borderColor: BORDER }}>
                <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#111827]">Commandes en cours</span>
                    {activeOrders.length > 0 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: ACCENT_LIGHT, color: ACCENT }}>
                        {activeOrders.length}
                      </span>
                    )}
                  </div>
                  <button onClick={() => setTab('orders')}
                    className="flex items-center gap-1 text-xs font-semibold"
                    style={{ color: ACCENT }}>
                    Voir tout <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                {loadingOrders ? (
                  <div className="p-5 space-y-3">
                    {[1, 2].map(i => <div key={i} className="h-20 rounded-xl bg-[#F3F4F6] animate-pulse" />)}
                  </div>
                ) : activeOrders.length === 0 ? (
                  <div className="py-10 text-center">
                    <ShoppingBag className="w-9 h-9 text-[#D1D5DB] mx-auto mb-2" />
                    <p className="text-sm text-[#9CA3AF]">Aucune commande en cours</p>
                    <Link to="/menu"
                      className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                      style={{ background: ACCENT }}>
                      Commander maintenant
                    </Link>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {activeOrders.slice(0, 3).map(o => (
                      <ActiveOrderCard key={o.id} order={o}
                        onTrack={() => setTrackOrder(o)}
                        onReceipt={() => setReceiptOrder(o)} />
                    ))}
                  </div>
                )}
              </div>

              {/* Right column */}
              <div className="space-y-4">
                {/* Order CTA */}
                <div className="rounded-2xl p-5 text-white space-y-3"
                  style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)` }}>
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                    <ChefHat className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-extrabold text-base">Commander maintenant</p>
                    <p className="text-sm text-white/75">Plats frais disponibles</p>
                  </div>
                  <Link to="/menu"
                    className="flex items-center justify-center gap-2 bg-white rounded-xl py-2.5 text-sm font-bold"
                    style={{ color: ACCENT }}>
                    Parcourir le menu <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Last delivered */}
                {delivered.length > 0 && (
                  <div className="bg-white rounded-2xl border p-4" style={{ borderColor: BORDER }}>
                    <p className="text-xs text-[#9CA3AF] mb-2">Dernière commande livrée</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#111827]">#{delivered[0].numero}</p>
                        <p className="text-xs text-[#9CA3AF]">
                          {formatFCFA(delivered[0].montantTotal || 0)} CFA
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent delivered with avis */}
            {delivered.length > 0 && (
              <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: BORDER }}>
                <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
                  <span className="text-sm font-bold text-[#111827]">Historique des livraisons</span>
                  <button onClick={() => setTab('orders')}
                    className="text-xs font-semibold flex items-center gap-1"
                    style={{ color: ACCENT }}>
                    Historique complet <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                {delivered.slice(0, 5).map(o => (
                  <PastOrderRow key={o.id} order={o}
                    onReceipt={() => setReceiptOrder(o)}
                    onDownload={() => downloadPdf(o.id)}
                    onAvis={() => setAvisOrder(o)}
                    canAvis={canAvis(o)}
                    onReorder={handleReorder} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ORDERS ─────────────────────────────────────────────────────────── */}
        {tab === 'orders' && (
          <div className="space-y-4">
            {/* Filter pills */}
            <div className="flex gap-2 flex-wrap">
              {[
                { k: 'all',      label: `Toutes (${orders.length})` },
                { k: 'actives',  label: `En cours (${activeOrders.length})` },
                { k: 'livrees',  label: `Livrées (${delivered.length})` },
                { k: 'annulees', label: `Annulées (${cancelled.length})` },
              ].map(f => (
                <button key={f.k} onClick={() => setOrderFilter(f.k)}
                  className="px-4 py-1.5 rounded-full text-sm font-semibold border transition"
                  style={{
                    background: orderFilter === f.k ? ACCENT : '#fff',
                    color: orderFilter === f.k ? '#fff' : '#6B7280',
                    borderColor: orderFilter === f.k ? ACCENT : BORDER,
                  }}>
                  {f.label}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: BORDER }}>
              <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#111827]">Mes commandes</span>
                  <span className="text-xs text-[#9CA3AF]">
                    {filteredOrders.length} résultat{filteredOrders.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <Link to="/menu"
                  className="flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: ACCENT }}>
                  <ShoppingBag className="w-3.5 h-3.5" /> Commander
                </Link>
              </div>

              {loadingOrders ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} />
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-12 text-center">
                  <ShoppingBag className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
                  <p className="text-sm text-[#9CA3AF] mb-4">Aucune commande dans cette catégorie</p>
                  <Link to="/menu"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{ background: ACCENT }}>
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
                        onReceipt={() => setReceiptOrder(o)} />
                    </div>
                  )
                )
              )}
            </div>
          </div>
        )}

        {/* ── PROFILE ─────────────────────────────────────────────────────────── */}
        {tab === 'profile' && (
          <div className="max-w-md">
            <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: BORDER }}>
              <div className="px-5 py-3.5 border-b text-sm font-bold text-[#111827]" style={{ borderColor: BORDER }}>
                Mon profil
              </div>
              <form onSubmit={handleProfileSave} className="p-5 space-y-4">
                {[
                  { k: 'nom', label: 'Nom complet', type: 'text' },
                  { k: 'email', label: 'Email', type: 'email' },
                  { k: 'telephone', label: 'Téléphone', type: 'tel' },
                ].map(f => (
                  <div key={f.k}>
                    <label className="block text-xs font-semibold text-[#374151] mb-1.5">{f.label}</label>
                    <input value={profileForm[f.k]} type={f.type}
                      onChange={e => setProfileForm(p => ({ ...p, [f.k]: e.target.value }))}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={{ background: SURFACE, border: `1px solid ${BORDER}` }} />
                  </div>
                ))}
                {profileMsg && (
                  <p className="text-sm font-semibold"
                    style={{ color: profileMsg.includes('Erreur') ? '#EF4444' : '#16A34A' }}>
                    {profileMsg}
                  </p>
                )}
                <button type="submit"
                  className="w-full py-3 rounded-xl font-bold text-sm text-white"
                  style={{ background: ACCENT }}>
                  Enregistrer
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── SECURITY ─────────────────────────────────────────────────────────── */}
        {tab === 'security' && (
          <div className="max-w-lg">
            <SecurityPanel user={user} accentColor={ACCENT} />
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {trackOrder   && <OrderTrackModal order={trackOrder}   onClose={() => setTrackOrder(null)}   onReceipt={o => { setTrackOrder(null); setReceiptOrder(o); }} />}
      {receiptOrder && <ReceiptModal    order={receiptOrder} onClose={() => setReceiptOrder(null)} onDownload={downloadPdf} />}
      {avisOrder    && <AvisModal       order={avisOrder}    onClose={() => setAvisOrder(null)}    onSubmit={handleAvisSubmit} />}
    </div>
  );
}
