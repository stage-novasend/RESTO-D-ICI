import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Bike, CheckCircle, Tag, X, Phone, RefreshCw,
  AlertCircle, ExternalLink, CreditCard, Lock, MapPin, Star, User,
  ShieldCheck,
} from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { formatFCFA } from '../utils/formatters';
import { commandesService, createCommandesSocket } from '../services/commandes.service';
import { paiementsAPI, promosAPI } from '../services/api';
import orangeMoneyLogo from '../assets/payments/orange-money.svg';
import mtnMomoLogo from '../assets/payments/mtn-momo.svg';
import moovMoneyLogo from '../assets/payments/moov-money.svg';
import carteBancaireLogo from '../assets/payments/carte-bancaire.svg';

// Flags
// Flip to false when the real NovaSend API key is configured in production
const SIMULATE_PAYMENT    = true;
// Flip to false when NovaSend card payment is live in CI
const NOVASEND_CARD_ENABLED = true;

const ACCENT = '#EA580C';

const MODE_LABELS = {
  SUR_PLACE: 'Sur place', EMPORTER: 'À emporter', LIVRAISON: 'Livraison à domicile',
  sur_place: 'Sur place', emporter: 'À emporter', livraison: 'Livraison à domicile',
};

/* Métadonnées visuelles locales — ne contient aucune logique métier */
const METHOD_VISUAL_MAP = {
  orange_money: { provider: 'ORANGE', name: 'Orange Money',   shortName: 'Orange',   logo: orangeMoneyLogo,   accent: '#FF7900', accentLight: '#FFF3E0', borderActive: 'border-orange-400', bgActive: 'bg-orange-50',  phoneRequired: true,  otpRequired: true  },
  mtn_momo:     { provider: 'MOMO',   name: 'MTN Mobile Money',shortName: 'MTN MoMo', logo: mtnMomoLogo,       accent: '#FFCC00', accentLight: '#FFFDE7', borderActive: 'border-yellow-400', bgActive: 'bg-yellow-50',  phoneRequired: true,  otpRequired: false },
  moov_money:   { provider: 'MOOV',   name: 'Moov Money',     shortName: 'Moov',     logo: moovMoneyLogo,     accent: '#0066CC', accentLight: '#E3F0FF', borderActive: 'border-blue-400',   bgActive: 'bg-blue-50',    phoneRequired: true,  otpRequired: false },
  wave:         { provider: 'WAVE',   name: 'Wave',           shortName: 'Wave',     logo: null,              accent: '#1DA1F2', accentLight: '#E8F5FD', borderActive: 'border-sky-400',    bgActive: 'bg-sky-50',     phoneRequired: false, otpRequired: false },
  card:         { provider: 'CARTE',  name: 'Carte Bancaire', shortName: 'Carte',    logo: carteBancaireLogo, accent: '#0F172A', accentLight: '#F5F0FF', borderActive: 'border-slate-500',  bgActive: 'bg-slate-50',   phoneRequired: false, otpRequired: false },
};

const METHODS_FALLBACK = Object.entries(METHOD_VISUAL_MAP)
  .filter(([id]) => id !== 'card' || NOVASEND_CARD_ENABLED)
  .map(([id, meta]) => ({ id, ...meta }));

const PROVIDER_NOTE = {
  ORANGE: 'Confirmez la demande de paiement sur votre téléphone. Si vous n\'avez pas reçu la demande, composez #144*82# pour générer un OTP.',
  MOMO:   'Approuvez la transaction depuis l\'application MTN Mobile Money ou composez *133#.',
  MOOV:   'Assurez-vous que votre écran est déverrouillé. Approuvez la demande dans votre application.',
  WAVE:   'Scannez le QR code ou appuyez sur le lien pour ouvrir l\'application Wave.',
  CARTE:  'Votre paiement par carte est en cours de traitement.',
};

const COUNTDOWN_SECS = 90;
const CLR_TER   = '#22C55E';
const CLR_AMBER = '#F59E0B';
const CLR_RED   = '#EF4444';

// Helpers
const fmtCardNumber = (v) =>
  v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

const fmtExpiry = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
};

// CountdownRing
function CountdownRing({ total, current }) {
  const R = 30, C = 2 * Math.PI * R;
  const color = current > 30 ? CLR_TER : current > 10 ? CLR_AMBER : CLR_RED;
  return (
    <svg width={76} height={76} viewBox="0 0 76 76" className="block mx-auto">
      <circle cx={38} cy={38} r={R} fill="none" stroke="#E5E7EB" strokeWidth={5} />
      <circle
        cx={38} cy={38} r={R} fill="none"
        stroke={color} strokeWidth={5} strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - current / total)}
        transform="rotate(-90 38 38)"
        style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
      />
      <text x={38} y={38} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 16, fontWeight: 700, fill: color, fontFamily: 'system-ui' }}>
        {current}
      </text>
    </svg>
  );
}

// OTP input — 4 cases individuelles
function OtpInput({ value, onChange }) {
  const refs = [useRef(), useRef(), useRef(), useRef()];
  const digits = (value + '    ').slice(0, 4).split('');

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const next = value.slice(0, i) + value.slice(i + 1);
      onChange(next);
      if (i > 0) refs[i - 1].current?.focus();
      return;
    }
    if (!/^\d$/.test(e.key)) return;
    const next = value.slice(0, i) + e.key + value.slice(i + 1);
    onChange(next.slice(0, 4));
    if (i < 3) refs[i + 1].current?.focus();
  };

  return (
    <div className="flex gap-3 justify-center mt-2">
      {[0, 1, 2, 3].map(i => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i].trim()}
          onChange={() => {}}
          onKeyDown={e => handleKey(i, e)}
          onClick={() => refs[i].current?.select()}
          style={{
            width: 56,
            height: 64,
            textAlign: 'center',
            fontSize: 22,
            fontWeight: 800,
            borderRadius: 14,
            border: `2px solid ${digits[i].trim() ? ACCENT : '#E2E8F0'}`,
            background: digits[i].trim() ? '#FFF3E0' : '#FAFAF9',
            color: '#0F172A',
            outline: 'none',
            transition: 'all 0.18s',
            fontFamily: 'Manrope, sans-serif',
            boxShadow: digits[i].trim() ? '0 0 0 3px rgba(234,88,12,0.12)' : 'none',
          }}
        />
      ))}
    </div>
  );
}

// Inline styles injected once
const GLOBAL_STYLES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulseRing {
    0%, 100% { transform: scale(1); opacity: 0.6; }
    50%       { transform: scale(1.15); opacity: 0; }
  }
  @keyframes checkPop {
    0%   { transform: scale(0.4); opacity: 0; }
    70%  { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes progressPulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
  .checkout-fadeup { animation: fadeUp 0.38s ease both; }
  .checkout-fadeup-1 { animation: fadeUp 0.38s 0.06s ease both; }
  .checkout-fadeup-2 { animation: fadeUp 0.38s 0.12s ease both; }
  .checkout-fadeup-3 { animation: fadeUp 0.38s 0.18s ease both; }
  .checkout-fadeup-4 { animation: fadeUp 0.38s 0.24s ease both; }
  .checkout-input:focus {
    border-color: #EA580C !important;
    box-shadow: 0 0 0 3px rgba(234,88,12,0.14) !important;
  }
  .method-card:hover {
    border-color: rgba(234,88,12,0.4) !important;
    box-shadow: 0 2px 12px rgba(234,88,12,0.08) !important;
  }
  .checkout-cta:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 40px rgba(234,88,12,0.50) !important;
  }
  .checkout-cta:not(:disabled):active {
    transform: translateY(0);
  }
  .checkout-back:hover {
    background: rgba(255,255,255,0.22) !important;
  }
`;

// Main component
export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clearCart } = useCart();
  const isB2B = user?.role === 'B2B';

  const [paymentMethods, setPaymentMethods] = useState(METHODS_FALLBACK);
  const [selectedMethod, setSelectedMethod] = useState('orange_money');
  const [pendingOrder, setPendingOrder]     = useState(null);
  const [phone, setPhone]                   = useState('');
  const [otp, setOtp]                       = useState('');

  // Card fields
  const [cardNumber, setCardNumber]   = useState('');
  const [cardExpiry, setCardExpiry]   = useState('');
  const [cardCvv, setCardCvv]         = useState('');
  const [cardName, setCardName]       = useState('');

  // Promo
  const [promoCode, setPromoCode]       = useState('');
  const [promoResult, setPromoResult]   = useState(null);
  const [promoError, setPromoError]     = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  // Modal: idle | creating | waiting | success | failed
  const [modalState, setModalState]     = useState('idle');
  const [modalError, setModalError]     = useState('');
  const [createdOrder, setCreatedOrder] = useState(null);
  const [paymentUrl, setPaymentUrl]     = useState(null);
  const [countdown, setCountdown]       = useState(COUNTDOWN_SECS);
  const [canRetry, setCanRetry]         = useState(false);

  const socketRef  = useRef(null);
  const timerRef   = useRef(null);
  const simTimerRef = useRef(null);
  const orderIdRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('pendingOrder');
    if (saved) {
      const parsed = JSON.parse(saved);
      setPendingOrder(parsed);
      /* Pré-remplir méthode de paiement et téléphone depuis CartDrawer */
      if (parsed.paymentMethod) setSelectedMethod(parsed.paymentMethod);
      if (parsed.phone) setPhone(parsed.phone);
    } else {
      navigate('/cart');
    }
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user?.telephone && !phone) setPhone(user.telephone);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Chargement dynamique des méthodes depuis l'API */
  useEffect(() => {
    paiementsAPI.getMethods()
      .then(r => {
        if (!r.data?.methods?.length) return;
        const merged = r.data.methods
          .filter(m => m.id !== 'card' || NOVASEND_CARD_ENABLED)
          .map(m => ({ ...m, ...(METHOD_VISUAL_MAP[m.id] ?? { accent: '#64748B', accentLight: '#F1F5F9', borderActive: 'border-slate-300', bgActive: 'bg-slate-50', logo: null, phoneRequired: !!m.needsPhone, otpRequired: false }) }));
        setPaymentMethods(merged);
      })
      .catch(() => { /* fallback silencieux */ });
  }, []);

  const method = paymentMethods.find(m => m.id === selectedMethod);

  // ── Promo ──────────────────────────────────────────────────────────────────
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true); setPromoError(''); setPromoResult(null);
    try {
      const r = await promosAPI.validate(promoCode.trim(), pendingOrder.restaurantId, pendingOrder.total ?? 0);
      setPromoResult(r.data);
    } catch (e) {
      setPromoError(e?.response?.data?.message || 'Code invalide');
    } finally { setPromoLoading(false); }
  };
  const removePromo = () => { setPromoResult(null); setPromoCode(''); setPromoError(''); };

  // ── Cleanup ────────────────────────────────────────────────────────────────
  const cleanupAll = useCallback(() => {
    if (timerRef.current)    { clearInterval(timerRef.current);  timerRef.current   = null; }
    if (simTimerRef.current) { clearTimeout(simTimerRef.current); simTimerRef.current = null; }
    if (socketRef.current)   { socketRef.current.disconnect();   socketRef.current  = null; }
  }, []);

  useEffect(() => () => cleanupAll(), [cleanupAll]);

  // ── Countdown ──────────────────────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    setCountdown(COUNTDOWN_SECS);
    setCanRetry(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setCanRetry(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── WebSocket ──────────────────────────────────────────────────────────────
  const subscribePaymentSocket = useCallback((orderId) => {
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
    const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const socket = createCommandesSocket(cachedUser?.user || cachedUser);
    socketRef.current = socket;

    socket.on('commande.paiement', (payload) => {
      if (payload?.id === orderId) {
        cleanupAll();
        setModalState('success');
        setTimeout(() => navigate(`/suivi/${orderId}`), 2000);
      }
    });

    socket.on('commande.paiement.echec', (payload) => {
      if (payload?.id === orderId) {
        cleanupAll();
        setModalError(`Paiement refusé — ${payload.reason || 'transaction échouée'}`);
        setModalState('failed');
        setCanRetry(true);
      }
    });
  }, [cleanupAll, navigate]);

  // ── Initier paiement (+ simulation auto si SIMULATE_PAYMENT) ──────────────
  const doInitiatePayment = useCallback(async (orderId, total) => {
    try {
      const paiRes = await paiementsAPI.initier({
        commandeId: orderId,
        montant: total,
        customerName: user?.nom || user?.name || 'Client',
        telephone: phone.trim() || undefined,
        provider: method?.provider,
        ...(method?.otpRequired && otp.length === 4 ? { otp } : {}),
      });
      if (paiRes.data?.paymentUrl) setPaymentUrl(paiRes.data.paymentUrl);
    } catch { /* ignore — simulation will confirm anyway */ }

    // Simulation automatique : déclenche le webhook en interne après 2,5 s
    if (SIMULATE_PAYMENT) {
      if (simTimerRef.current) clearTimeout(simTimerRef.current);
      simTimerRef.current = setTimeout(async () => {
        try {
          await paiementsAPI.simuler({ commandeId: orderId, provider: method?.provider ?? 'ORANGE' });
        } catch { /* blocked in production — normal */ }
      }, 2500);
    }
  }, [user, phone, otp, method]);

  // ── Payer ──────────────────────────────────────────────────────────────────
  const handlePay = async () => {
    const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const safeRestaurantId = UUID_V4_RE.test(pendingOrder?.restaurantId ?? '')
      ? pendingOrder.restaurantId : undefined;
    if (!safeRestaurantId) { navigate('/menu'); return; }

    setModalState('creating');
    setModalError('');
    setPaymentUrl(null);

    try {
      const VALID_MODES = ['SUR_PLACE', 'EMPORTER', 'LIVRAISON'];
      const rawMode = (pendingOrder.orderMode ?? '').toUpperCase();
      const modeLivraison = VALID_MODES.includes(rawMode) ? rawMode : 'SUR_PLACE';

      const res = await commandesService.create({
        restaurantId: safeRestaurantId,
        modeLivraison,
        adresseLivraison: modeLivraison === 'LIVRAISON' ? pendingOrder.deliveryAddress : undefined,
        ...(modeLivraison === 'SUR_PLACE' && pendingOrder.tableNumber
          ? { tableNumber: String(pendingOrder.tableNumber) } : {}),
        lignes: pendingOrder.items.map(item => ({
          articleId: item.articleId,
          quantite: item.quantite ?? item.quantity ?? 1,
          ...(item.instructions ? { instructions: item.instructions } : {}),
          ...(item.variantLabel ? { variantLabel: item.variantLabel } : {}),
          ...(item.variantSupplement ? { variantSupplement: Number(item.variantSupplement) } : {}),
        })),
        ...(promoResult ? { codePromo: promoResult.promo.code } : {}),
        ...(modeLivraison === 'LIVRAISON' && pendingOrder.deliveryFee
          ? { fraisLivraison: Number(pendingOrder.deliveryFee) } : {}),
        ...(modeLivraison === 'LIVRAISON' && pendingOrder.fournisseurLivraisonId
          ? { fournisseurLivraisonId: pendingOrder.fournisseurLivraisonId } : {}),
      });

      const order = res.data;
      orderIdRef.current = order.id;
      setCreatedOrder(order);
      clearCart();
      localStorage.removeItem('pendingOrder');

      if (isB2B) {
        setModalState('success');
        setTimeout(() => navigate('/b2b'), 2000);
        return;
      }

      setModalState('waiting');
      subscribePaymentSocket(order.id);
      startCountdown();
      await doInitiatePayment(order.id, effectiveTotal);

    } catch (err) {
      cleanupAll();
      const raw = err?.response?.data?.message || err?.response?.data;
      const msg = Array.isArray(raw) ? raw.join(', ') : (typeof raw === 'string' ? raw : 'Une erreur est survenue');
      setModalError(msg);
      setModalState('failed');
      setCanRetry(true);
    }
  };

  // ── Retry ──────────────────────────────────────────────────────────────────
  const handleRetry = async () => {
    if (!orderIdRef.current) { setModalState('idle'); return; }
    setModalState('waiting');
    setModalError('');
    setPaymentUrl(null);
    subscribePaymentSocket(orderIdRef.current);
    startCountdown();
    await doInitiatePayment(orderIdRef.current, effectiveTotal);
  };

  const handleClose = () => {
    cleanupAll();
    setModalState('idle');
    setModalError('');
    setPaymentUrl(null);
    setCanRetry(false);
  };

  if (!pendingOrder) return null;

  const total          = pendingOrder.total ?? 0;
  const items          = pendingOrder.items ?? [];
  const effectiveTotal = Math.max(0, total - (promoResult?.remise ?? 0));
  const isOpen         = modalState !== 'idle';

  const canSubmit = isB2B || (() => {
    if (method?.phoneRequired && !phone.trim()) return false;
    if (method?.otpRequired && otp.length < 4) return false;
    if (selectedMethod === 'card') {
      if (cardNumber.replace(/\s/g, '').length < 16) return false;
      if (cardExpiry.length < 5) return false;
      if (cardCvv.length < 3) return false;
    }
    return true;
  })();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#FFFAF3', fontFamily: 'Manrope, sans-serif' }}>
      {/* Inject animation keyframes */}
      <style>{GLOBAL_STYLES}</style>

      {/* ── Mobile header (sticky, hidden on md+) ─────────────────────────── */}
      <header className="md:hidden sticky top-0 z-30"
        style={{ background: 'rgba(255,250,243,0.96)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(234,88,12,0.10)' }}>
        <div className="px-4 h-14 flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => navigate('/cart')}
            style={{ width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(234,88,12,0.08)', border: 'none', cursor: 'pointer', color: '#EA580C' }}>
            <ArrowLeft size={18} />
          </button>
          <h1 style={{ fontWeight: 800, fontSize: 17, color: '#0F172A', letterSpacing: '-0.03em', margin: 0 }}>
            {isB2B ? 'Confirmer la commande' : 'Paiement'}
          </h1>
          {SIMULATE_PAYMENT && !isB2B && (
            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: '#FEF3C7', color: '#92400E' }}>
              MODE TEST
            </span>
          )}
        </div>
      </header>

      {/* ── Desktop two-column layout wrapper ────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', minHeight: '100vh' }}>

        {/* ══ LEFT PANEL — Summary (sticky orange gradient, 40%) ══════════════ */}
        <aside className="hidden md:flex"
          style={{
            width: '40%',
            flexShrink: 0,
            background: 'linear-gradient(160deg, #EA580C 0%, #C2410C 60%, #C96200 100%)',
            minHeight: '100vh',
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflowY: 'auto',
            flexDirection: 'column',
            padding: '36px 32px 32px',
          }}>

          {/* Wordmark + back button row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
            {/* Restodici wordmark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.22)',
                border: '1px solid rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 17, lineHeight: 1 }}>🍽️</span>
              </div>
              <span style={{ color: 'white', fontSize: 16, fontWeight: 900, letterSpacing: '-0.04em' }}>
                Restodici
              </span>
            </div>
            <button
              onClick={() => navigate('/cart')}
              className="checkout-back"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '6px 12px', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'background 0.18s' }}>
              <ArrowLeft size={13} />
              Retour
            </button>
          </div>

          {/* Restaurant name */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              Commander chez
            </p>
            <h2 style={{ color: 'white', fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 4px', lineHeight: 1.2 }}>
              {pendingOrder.restaurantName}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: 600, margin: 0 }}>
              {MODE_LABELS[pendingOrder.orderMode] || pendingOrder.orderMode}
              {pendingOrder.tableNumber && ` · Table ${pendingOrder.tableNumber}`}
            </p>
          </div>

          {/* Items list */}
          <div style={{ flex: 1 }}>
            <div style={{ borderTop: '1px dashed rgba(255,255,255,0.25)', marginBottom: 16 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ minWidth: 22, height: 22, borderRadius: 7, background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {item.quantite ?? item.quantity ?? 1}
                    </span>
                    <div>
                      <p style={{ color: 'white', fontSize: 13, fontWeight: 600, margin: 0 }}>{item.nom || 'Article'}</p>
                      {item.variantLabel && (
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600, marginTop: 2 }}>{item.variantLabel}</p>
                      )}
                    </div>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {formatFCFA((item.prix ?? 0) * (item.quantite ?? item.quantity ?? 1))}
                  </span>
                </div>
              ))}
            </div>

            {/* Promo line */}
            {promoResult && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.15)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)' }}>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600 }}>Code {promoResult.promo.code}</span>
                <span style={{ color: 'white', fontSize: 13, fontWeight: 800 }}>−{formatFCFA(promoResult.remise)}</span>
              </div>
            )}

            {/* Delivery fee */}
            {Number(pendingOrder.deliveryFee ?? 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>Frais de livraison</span>
                <span style={{ fontWeight: 700 }}>{formatFCFA(Number(pendingOrder.deliveryFee))}</span>
              </div>
            )}

            <div style={{ borderTop: '1px dashed rgba(255,255,255,0.25)', margin: '20px 0' }} />

            {/* Glassmorphism total card */}
            <div style={{
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 20,
              padding: '20px 24px',
              textAlign: 'center',
            }}>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 8px' }}>
                Total à payer
              </p>
              <p style={{
                color: 'white',
                fontWeight: 900,
                fontSize: 'clamp(32px, 5vw, 48px)',
                letterSpacing: '-0.04em',
                margin: 0,
                lineHeight: 1.1,
              }}>
                {formatFCFA(effectiveTotal)}
              </p>
            </div>
          </div>

          {/* Security badges */}
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 10 }}>
              <Lock size={13} color="rgba(255,255,255,0.7)" />
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600 }}>Paiement 100% sécurisé</span>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {['SSL', 'NovaSend'].map(badge => (
                <span key={badge} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, padding: '3px 10px', color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}>
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </aside>

        {/* ══ RIGHT PANEL — Payment form (60%) ════════════════════════════════ */}
        <main style={{ flex: 1, background: '#FFFAF3', padding: '0 0 120px' }}>

          {/* Desktop header (hidden on mobile) */}
          <div className="hidden md:block checkout-fadeup" style={{ padding: '40px 40px 0', marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em', margin: '0 0 6px', lineHeight: 1.15 }}>
                  {isB2B ? 'Confirmer la commande' : 'Finaliser le paiement'}
                </h1>
                <p style={{ fontSize: 14, color: '#9E8B7A', fontWeight: 600, margin: 0 }}>
                  {isB2B ? 'Votre commande sera facturée en fin de mois' : 'Choisissez votre mode de paiement'}
                </p>
              </div>
              {SIMULATE_PAYMENT && !isB2B && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '5px 12px', borderRadius: 8, background: '#FEF3C7', color: '#92400E', flexShrink: 0, marginTop: 4, letterSpacing: '0.04em' }}>
                  MODE TEST
                </span>
              )}
            </div>
            <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(234,88,12,0.18) 0%, transparent 100%)' }} />
          </div>

          {/* Content area */}
          <div className="px-4 pt-6 md:px-10 md:pt-0">

            {/* ── Mobile: compact summary card ───────────────────────────── */}
            <div className="md:hidden checkout-fadeup" style={{
              background: 'linear-gradient(145deg, #EA580C 0%, #C2410C 55%, #C96200 100%)',
              borderRadius: 24,
              padding: '18px 20px 20px',
              marginBottom: 20,
              boxShadow: '0 8px 32px rgba(234,88,12,0.28)',
            }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 2px' }}>
                    Commander chez
                  </p>
                  <p style={{ color: 'white', fontSize: 14, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                    {pendingOrder.restaurantName}
                  </p>
                </div>
                <span style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '3px 10px', color: 'white', fontSize: 11, fontWeight: 800 }}>
                  {items.length} article{items.length > 1 ? 's' : ''}
                </span>
              </div>
              {/* Mini items */}
              <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {items.slice(0, 3).map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <span style={{ color: 'rgba(255,255,255,0.82)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 5, padding: '1px 6px', fontSize: 11, fontWeight: 800 }}>
                        {item.quantite ?? item.quantity ?? 1}
                      </span>
                      {item.nom || 'Article'}
                    </span>
                    <span style={{ color: 'white', fontWeight: 700, flexShrink: 0 }}>
                      {formatFCFA((item.prix ?? 0) * (item.quantite ?? item.quantity ?? 1))}
                    </span>
                  </div>
                ))}
                {items.length > 3 && (
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, margin: 0 }}>
                    +{items.length - 3} article{items.length - 3 > 1 ? 's' : ''} supplémentaire{items.length - 3 > 1 ? 's' : ''}…
                  </p>
                )}
              </div>
              {/* Glassmorphism total */}
              <div style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 16,
                padding: '14px 18px',
                textAlign: 'center',
              }}>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px' }}>Total à payer</p>
                <p style={{ color: 'white', fontWeight: 900, fontSize: 30, letterSpacing: '-0.04em', margin: 0, lineHeight: 1.1 }}>
                  {formatFCFA(effectiveTotal)}
                </p>
              </div>
            </div>

            {/* ── Code promo ─────────────────────────────────────────────── */}
            {!isB2B && (
              <section className="checkout-fadeup-1" style={{
                background: 'white',
                borderRadius: 20,
                border: '1px solid rgba(234,88,12,0.12)',
                padding: '20px 20px',
                marginBottom: 16,
                boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Tag size={14} color="#EA580C" />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>Code promo</span>
                </div>

                {promoResult ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '12px 16px' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 800, color: '#059669', margin: '0 0 2px' }}>{promoResult.promo.code} appliqué !</p>
                      <p style={{ fontSize: 12, color: '#064E3B', margin: 0, fontWeight: 600 }}>
                        −{formatFCFA(promoResult.remise)} déduit
                        {promoResult.promo.type === 'PERCENT' ? ` (−${promoResult.promo.valeur}%)` : ''}
                      </p>
                    </div>
                    <button onClick={removePromo} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669', padding: 4 }}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      value={promoCode}
                      onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleApplyPromo()}
                      placeholder="Entrez votre code…"
                      className="checkout-input"
                      style={{
                        flex: 1,
                        borderRadius: 14,
                        border: '1.5px solid #E8E0D5',
                        background: '#FFFAF3',
                        padding: '12px 16px',
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: 'Manrope, sans-serif',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: '#0F172A',
                        outline: 'none',
                        transition: 'all 0.2s',
                      }}
                    />
                    <button
                      onClick={handleApplyPromo}
                      disabled={promoLoading || !promoCode.trim()}
                      style={{
                        borderRadius: 14,
                        background: 'linear-gradient(135deg, #EA580C, #C2410C)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 20px',
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: 'pointer',
                        opacity: (promoLoading || !promoCode.trim()) ? 0.5 : 1,
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap',
                      }}>
                      {promoLoading ? '…' : 'Appliquer'}
                    </button>
                  </div>
                )}
                {promoError && (
                  <p style={{ marginTop: 8, fontSize: 12, color: '#EF4444', fontWeight: 700 }}>{promoError}</p>
                )}
              </section>
            )}

            {/* ── Payment method section ─────────────────────────────────── */}
            {isB2B ? (
              <section className="checkout-fadeup-2" style={{
                background: 'white',
                borderRadius: 20,
                border: '1px solid rgba(234,88,12,0.15)',
                padding: '22px 20px',
                marginBottom: 16,
                boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>
                    📋
                  </div>
                  <div>
                    <h2 style={{ fontWeight: 800, color: '#EA580C', fontSize: 15, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                      Facturation mensuelle B2B
                    </h2>
                    <p style={{ fontSize: 13, color: '#9E8B7A', lineHeight: 1.6, margin: 0, fontWeight: 600 }}>
                      Cette commande sera ajoutée à votre facture mensuelle consolidée.
                      Vous recevrez en fin de mois une <strong style={{ color: '#0F172A' }}>facture SYSCOHADA</strong> globale.
                    </p>
                  </div>
                </div>
              </section>
            ) : (
              <section className="checkout-fadeup-2" style={{
                background: 'white',
                borderRadius: 20,
                border: '1px solid rgba(234,88,12,0.12)',
                padding: '22px 20px',
                marginBottom: 16,
                boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
              }}>
                <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: '0 0 16px' }}>
                  Méthode de paiement
                </h2>

                {/* Method selector — premium cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {paymentMethods.map(m => {
                    const active = selectedMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => { setSelectedMethod(m.id); setOtp(''); }}
                        className="method-card"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          padding: '14px 16px',
                          borderRadius: 16,
                          border: active ? `2px solid #EA580C` : '2px solid #F0EDE8',
                          background: active ? '#FFF8F0' : 'white',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s',
                          boxShadow: active ? '0 4px 16px rgba(234,88,12,0.14)' : '0 1px 4px rgba(0,0,0,0.03)',
                          width: '100%',
                        }}>
                        {/* Logo container */}
                        <div style={{
                          width: 48,
                          height: 40,
                          borderRadius: 12,
                          background: active ? m.accentLight : '#F5F5F7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          overflow: 'hidden',
                          transition: 'background 0.2s',
                        }}>
                          {m.logo ? (
                            <img src={m.logo} alt={m.name} style={{ height: 26, width: 'auto', objectFit: 'contain' }} />
                          ) : m.id === 'wave' ? (
                            <div style={{
                              width: 36,
                              height: 28,
                              borderRadius: 8,
                              background: 'linear-gradient(135deg, #1DA1F2 0%, #0EA5E9 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <span style={{ fontSize: 15, fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-0.03em' }}>W</span>
                            </div>
                          ) : (
                            <CreditCard size={22} color={m.accent} />
                          )}
                        </div>

                        {/* Name + subtitle */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 800, color: active ? '#EA580C' : '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                            {m.name}
                          </p>
                          {m.phoneRequired && (
                            <p style={{ fontSize: 11, color: '#9E8B7A', fontWeight: 600, margin: '2px 0 0' }}>Numéro requis</p>
                          )}
                        </div>

                        {/* Styled radio */}
                        <div style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          border: active ? '2px solid #EA580C' : '2px solid #CBD5E1',
                          background: active ? '#EA580C' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.2s',
                        }}>
                          {active && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'white' }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Phone field */}
                {method?.phoneRequired && (
                  <div style={{ marginTop: 18 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
                      <Phone size={13} color="#EA580C" />
                      Numéro {method.name} *
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="Ex : 07 XX XX XX XX"
                      className="checkout-input"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        borderRadius: 14,
                        border: '1.5px solid #E8E0D5',
                        background: '#FFFAF3',
                        padding: '13px 16px',
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#0F172A',
                        fontFamily: 'Manrope, sans-serif',
                        outline: 'none',
                        transition: 'all 0.2s',
                      }}
                    />
                  </div>
                )}

                {/* Orange Money OTP */}
                {method?.otpRequired && (
                  <div style={{ marginTop: 16, borderRadius: 16, border: '1.5px solid #FFD199', background: '#FFF8F0', padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 9, background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🔐</div>
                      <p style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', margin: 0 }}>Code OTP Orange *</p>
                    </div>
                    <p style={{ fontSize: 12, color: '#92400E', lineHeight: 1.55, margin: '0 0 14px', fontWeight: 600 }}>
                      Composez <strong>#144*82#</strong> depuis votre téléphone Orange pour recevoir votre code à 4 chiffres.
                    </p>
                    <OtpInput value={otp} onChange={setOtp} />
                    {otp.length > 0 && otp.length < 4 && (
                      <p style={{ textAlign: 'center', fontSize: 12, color: '#EA580C', marginTop: 10, fontWeight: 700 }}>
                        Entrez les 4 chiffres
                      </p>
                    )}
                  </div>
                )}

                {/* Card fields */}
                {selectedMethod === 'card' && (
                  <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <Lock size={13} color="#9E8B7A" />
                      <p style={{ fontSize: 12, fontWeight: 800, color: '#0F172A', margin: 0 }}>Informations de carte</p>
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Lock size={11} color="#9E8B7A" />
                        <span style={{ fontSize: 10, color: '#9E8B7A', fontWeight: 700 }}>Sécurisé SSL</span>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={cardName}
                      onChange={e => setCardName(e.target.value.toUpperCase())}
                      placeholder="NOM DU TITULAIRE"
                      className="checkout-input"
                      style={{ width: '100%', boxSizing: 'border-box', borderRadius: 14, border: '1.5px solid #E8E0D5', background: '#FFFAF3', padding: '13px 16px', fontSize: 13, fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.06em', outline: 'none', transition: 'all 0.2s', fontFamily: 'Manrope, sans-serif' }}
                    />

                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={e => setCardNumber(fmtCardNumber(e.target.value))}
                        placeholder="0000 0000 0000 0000"
                        maxLength={19}
                        className="checkout-input"
                        style={{ width: '100%', boxSizing: 'border-box', borderRadius: 14, border: '1.5px solid #E8E0D5', background: '#FFFAF3', padding: '13px 48px 13px 16px', fontSize: 14, fontWeight: 800, color: '#0F172A', fontFamily: 'Manrope, sans-serif', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.12em', outline: 'none', transition: 'all 0.2s' }}
                      />
                      <CreditCard size={18} color="#C4B5A5" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#9E8B7A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expiration</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={e => setCardExpiry(fmtExpiry(e.target.value))}
                          placeholder="MM/AA"
                          maxLength={5}
                          className="checkout-input"
                          style={{ width: '100%', boxSizing: 'border-box', borderRadius: 14, border: '1.5px solid #E8E0D5', background: '#FFFAF3', padding: '13px 16px', fontSize: 14, fontWeight: 800, color: '#0F172A', fontFamily: 'Manrope, sans-serif', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.1em', outline: 'none', transition: 'all 0.2s' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#9E8B7A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CVV</label>
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="•••"
                          maxLength={4}
                          className="checkout-input"
                          style={{ width: '100%', boxSizing: 'border-box', borderRadius: 14, border: '1.5px solid #E8E0D5', background: '#FFFAF3', padding: '13px 16px', fontSize: 14, fontWeight: 800, color: '#0F172A', fontFamily: 'Manrope, sans-serif', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.1em', outline: 'none', transition: 'all 0.2s' }}
                        />
                      </div>
                    </div>

                    <p style={{ fontSize: 11, color: '#9E8B7A', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                      <Lock size={11} />
                      Vos données de carte sont chiffrées et ne sont jamais stockées.
                    </p>
                  </div>
                )}

                {/* Wave note */}
                {method?.id === 'wave' && (
                  <div style={{ marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 10, borderRadius: 14, background: '#EFF9FF', border: '1px solid #BAE6FD', padding: '13px 16px' }}>
                    <span style={{ color: '#0EA5E9', flexShrink: 0, marginTop: 1 }}>💡</span>
                    <p style={{ fontSize: 12, color: '#0C4A6E', lineHeight: 1.55, margin: 0, fontWeight: 600 }}>
                      Vous serez redirigé vers Wave pour finaliser le paiement par QR code ou lien profond.
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Delivery info on mobile */}
            {(pendingOrder.orderMode ?? '').toUpperCase() === 'LIVRAISON' && (
              <section className="checkout-fadeup-3" style={{ background: 'white', borderRadius: 20, border: '1px solid rgba(234,88,12,0.12)', padding: '16px 20px', marginBottom: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                {pendingOrder.deliveryAddress && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: pendingOrder.driver ? 12 : 0 }}>
                    <MapPin size={14} color="#EA580C" />
                    <span style={{ fontSize: 13, color: '#9E8B7A', fontWeight: 600 }}>
                      {pendingOrder.deliveryAddress}{pendingOrder.deliveryZone ? ` · ${pendingOrder.deliveryZone}` : ''}
                    </span>
                  </div>
                )}
                {pendingOrder.driver && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 14, background: '#F0FDF4', border: '1px solid #86EFAC', padding: '12px 14px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #EA580C, #C2410C)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <User size={15} color="white" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', margin: '0 0 2px' }}>{pendingOrder.driver.name}</p>
                      <p style={{ fontSize: 11, color: '#9E8B7A', margin: 0, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                        <Bike size={11} /> {pendingOrder.driver.vehicle}
                        {pendingOrder.driver.rating && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>· <Star size={10} style={{ fill: '#FBBF24', color: '#FBBF24' }} /> {pendingOrder.driver.rating}</span>
                        )}
                      </p>
                    </div>
                    <CheckCircle size={16} color="#16A34A" />
                  </div>
                )}
              </section>
            )}

            {/* Security note */}
            {!isB2B && (
              <div className="checkout-fadeup-4" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 16, borderRadius: 12, background: 'rgba(234,88,12,0.04)', border: '1px solid rgba(234,88,12,0.08)' }}>
                <ShieldCheck size={15} color="#EA580C" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: '#9E8B7A', margin: 0, fontWeight: 600, lineHeight: 1.5 }}>
                  Paiement sécurisé via <strong style={{ color: '#7A6A5A' }}>NovaSend</strong>. Aucune donnée bancaire n'est stockée sur nos serveurs.
                </p>
              </div>
            )}

            {/* ── CTA Button (desktop — inside flow) ──────────────────────── */}
            <div className="hidden md:block" style={{ paddingBottom: 40 }}>
              <button
                onClick={handlePay}
                disabled={!canSubmit}
                className="checkout-cta"
                style={{
                  width: '100%',
                  height: 58,
                  borderRadius: 16,
                  border: 'none',
                  background: canSubmit
                    ? 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)'
                    : 'linear-gradient(135deg, #D4C4B0 0%, #C4B4A0 100%)',
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  boxShadow: canSubmit ? '0 8px 32px rgba(234,88,12,0.40)' : 'none',
                  transition: 'all 0.2s',
                  fontFamily: 'Manrope, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}>
                {canSubmit && <Lock size={15} style={{ opacity: 0.85 }} />}
                {isB2B
                  ? `Confirmer la commande · ${formatFCFA(effectiveTotal)}`
                  : `Payer ${formatFCFA(effectiveTotal)} · ${method?.shortName}`}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}>
                <ShieldCheck size={12} color="#C4B5A5" />
                <p style={{ fontSize: 12, color: '#C4B5A5', margin: 0, fontWeight: 600 }}>
                  Paiement sécurisé · En confirmant, vous acceptez nos CGU.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Mobile sticky CTA ──────────────────────────────────────────────── */}
      <div className="md:hidden" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '10px 16px env(safe-area-inset-bottom, 20px)',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
        background: 'rgba(255,250,243,0.97)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(234,88,12,0.10)',
        zIndex: 40,
      }}>
        <button
          onClick={handlePay}
          disabled={!canSubmit}
          className="checkout-cta"
          style={{
            width: '100%',
            height: 56,
            borderRadius: 16,
            border: 'none',
            background: canSubmit
              ? 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)'
              : 'linear-gradient(135deg, #D4C4B0 0%, #C4B4A0 100%)',
            color: 'white',
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            boxShadow: canSubmit ? '0 8px 28px rgba(234,88,12,0.38)' : 'none',
            transition: 'all 0.2s',
            fontFamily: 'Manrope, sans-serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}>
          {canSubmit && <Lock size={14} style={{ opacity: 0.85 }} />}
          {isB2B
            ? `Confirmer · ${formatFCFA(effectiveTotal)}`
            : `Payer ${formatFCFA(effectiveTotal)} · ${method?.shortName}`}
        </button>
      </div>

      {/* ── Payment modal ───────────────────────────────────────────────────── */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          background: 'rgba(15,23,42,0.65)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          padding: 16,
        }}
          className="sm:items-center">

          <div style={{
            width: '100%',
            maxWidth: 420,
            background: 'white',
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.05)',
          }}
            className="checkout-fadeup">

            {/* Modal banner */}
            <div style={{
              padding: '18px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              background: modalState === 'success'
                ? 'linear-gradient(135deg, #F0FDF4, #DCFCE7)'
                : modalState === 'failed'
                ? '#FEF2F2'
                : (method?.accentLight ?? '#FDF5EF'),
              borderBottom: '1px solid rgba(0,0,0,0.05)',
            }}>
              {modalState === 'success' ? (
                <div style={{ width: 44, height: 44, borderRadius: 14, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle size={22} color="#16A34A" />
                </div>
              ) : modalState === 'failed' ? (
                <div style={{ width: 44, height: 44, borderRadius: 14, background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AlertCircle size={22} color="#EF4444" />
                </div>
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flexShrink: 0 }}>
                  {method?.logo ? (
                    <img src={method.logo} alt={method.name} style={{ height: 28, width: 'auto', objectFit: 'contain' }} />
                  ) : method?.id === 'wave' ? (
                    <div style={{
                      width: 34,
                      height: 26,
                      borderRadius: 7,
                      background: 'linear-gradient(135deg, #1DA1F2 0%, #0EA5E9 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-0.03em' }}>W</span>
                    </div>
                  ) : (
                    <CreditCard size={22} color={method?.accent ?? ACCENT} />
                  )}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 800, color: '#0F172A', fontSize: 14, margin: '0 0 2px', letterSpacing: '-0.02em' }}>
                  {modalState === 'success' ? (isB2B ? 'Commande confirmée' : 'Paiement validé') : modalState === 'failed' ? 'Échec du paiement' : method?.name}
                </p>
                <p style={{ fontSize: 13, color: '#9E8B7A', fontWeight: 700, margin: 0 }}>{formatFCFA(effectiveTotal)}</p>
              </div>
              {(modalState === 'idle' || modalState === 'failed' || modalState === 'waiting') && (
                <button
                  onClick={handleClose}
                  title="Annuler et fermer"
                  style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B', flexShrink: 0, transition: 'background 0.15s' }}>
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Modal body */}
            <div style={{ padding: '28px 24px' }}>

              {/* Creating state */}
              {modalState === 'creating' && (
                <div style={{ textAlign: 'center', paddingBottom: 8 }}>
                  <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    border: `3px solid ${ACCENT}`,
                    borderTopColor: 'transparent',
                    margin: '0 auto 20px',
                    animation: 'spin 0.9s linear infinite',
                  }} />
                  <p style={{ fontWeight: 800, color: '#0F172A', fontSize: 16, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                    Création de la commande…
                  </p>
                  <p style={{ fontSize: 13, color: '#9E8B7A', fontWeight: 600, margin: 0 }}>Veuillez patienter</p>
                </div>
              )}

              {/* Waiting state */}
              {modalState === 'waiting' && (
                <div style={{ textAlign: 'center' }}>
                  <CountdownRing total={COUNTDOWN_SECS} current={countdown} />

                  <p style={{ fontWeight: 800, color: '#0F172A', fontSize: 16, margin: '14px 0 6px', letterSpacing: '-0.02em' }}>
                    {selectedMethod === 'card' ? 'Traitement en cours…' : 'En attente de confirmation'}
                  </p>

                  {phone.trim() && method?.phoneRequired && (
                    <p style={{ fontSize: 13, color: '#9E8B7A', fontWeight: 600, margin: '0 0 6px' }}>
                      Demande envoyée au <strong style={{ color: '#0F172A' }}>{phone}</strong>
                    </p>
                  )}

                  <p style={{ fontSize: 12, color: '#9E8B7A', lineHeight: 1.6, margin: '0 0 18px', padding: '0 8px', fontWeight: 600 }}>
                    {PROVIDER_NOTE[method?.provider] || 'Confirmez le paiement sur votre téléphone.'}
                  </p>

                  {paymentUrl && (
                    <a
                      href={paymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 22px',
                        borderRadius: 14,
                        background: method?.accent ?? ACCENT,
                        color: 'white',
                        fontSize: 13,
                        fontWeight: 800,
                        textDecoration: 'none',
                        marginBottom: 18,
                      }}>
                      <ExternalLink size={15} />
                      Ouvrir Wave pour payer
                    </a>
                  )}

                  {/* Progress bar — shrinks as countdown decreases */}
                  <div style={{ height: 5, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden', margin: '0 8px' }}>
                    <div style={{
                      height: '100%',
                      width: `${(countdown / COUNTDOWN_SECS) * 100}%`,
                      borderRadius: 999,
                      background: `linear-gradient(90deg, ${method?.accent ?? ACCENT}, ${ACCENT})`,
                      transition: 'width 1s linear',
                    }} />
                  </div>

                  {canRetry && (
                    <button
                      onClick={handleRetry}
                      style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, border: '1.5px solid #E8E0D5', background: 'white', fontSize: 13, fontWeight: 800, color: '#0F172A', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <RefreshCw size={14} />
                      Relancer le paiement
                    </button>
                  )}
                </div>
              )}

              {/* Success state */}
              {modalState === 'success' && (
                <div style={{ textAlign: 'center', paddingBottom: 8 }}>
                  <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 20px' }}>
                    {/* Pulse ring */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      background: '#DCFCE7',
                      animation: 'pulseRing 1.4s ease-out infinite',
                    }} />
                    <div style={{
                      position: 'relative',
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background: '#F0FDF4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      animation: 'checkPop 0.45s ease both',
                    }}>
                      <CheckCircle size={34} color="#16A34A" />
                    </div>
                  </div>
                  <p style={{ fontWeight: 800, color: '#0F172A', fontSize: 18, margin: '0 0 8px', letterSpacing: '-0.03em' }}>
                    {isB2B ? 'Commande enregistrée !' : 'Paiement confirmé !'}
                  </p>
                  {createdOrder && (
                    <p style={{ fontSize: 13, color: '#9E8B7A', fontWeight: 700, margin: '0 0 6px' }}>
                      #{createdOrder.numero || createdOrder.id?.slice(0, 8).toUpperCase()}
                    </p>
                  )}
                  <p style={{ fontSize: 13, color: '#9E8B7A', fontWeight: 600, margin: 0, animation: 'progressPulse 1.2s ease-in-out infinite' }}>
                    Redirection en cours…
                  </p>
                </div>
              )}

              {/* Failed state */}
              {modalState === 'failed' && (
                <div style={{ textAlign: 'center', paddingBottom: 8 }}>
                  <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: '#FEF2F2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 18px',
                    animation: 'checkPop 0.4s ease both',
                  }}>
                    <AlertCircle size={30} color="#EF4444" />
                  </div>
                  <p style={{ fontWeight: 800, color: '#0F172A', fontSize: 16, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                    Paiement échoué
                  </p>
                  {modalError && (
                    <p style={{ fontSize: 13, color: '#EF4444', fontWeight: 600, margin: '0 0 20px', lineHeight: 1.5 }}>{modalError}</p>
                  )}
                  {orderIdRef.current && (
                    <button
                      onClick={handleRetry}
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: 14,
                        border: 'none',
                        background: 'linear-gradient(135deg, #EA580C, #C2410C)',
                        color: 'white',
                        fontSize: 14,
                        fontWeight: 800,
                        cursor: 'pointer',
                        marginBottom: 10,
                        boxShadow: '0 6px 20px rgba(234,88,12,0.32)',
                        letterSpacing: '-0.02em',
                        fontFamily: 'Manrope, sans-serif',
                      }}>
                      Réessayer le paiement
                    </button>
                  )}
                  <button
                    onClick={handleClose}
                    style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1.5px solid #E8E0D5', background: 'white', color: '#9E8B7A', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Manrope, sans-serif' }}>
                    Retour
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
