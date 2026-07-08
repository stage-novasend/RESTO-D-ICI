import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BadgePercent, CheckCircle, ChefHat, AlertCircle,
  MapPin, Minus, Plus, ShoppingBag, Star, Store, Trash2,
  User, X, Loader, Phone, CreditCard, Bike,
} from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { formatFCFA } from '../../utils/formatters';
import { paiementsAPI, livraisonsExtAPI } from '../../services/api';
import orangeMoneyLogo   from '../../assets/payments/orange-money.svg';
import mtnMomoLogo       from '../../assets/payments/mtn-momo.svg';
import moovMoneyLogo     from '../../assets/payments/moov-money.svg';
import carteBancaireLogo from '../../assets/payments/carte-bancaire.svg';
import { NAVY, ORANGE, BG } from '../../theme/colors';

const LINE   = 'rgba(89,67,42,0.12)';

const KENTE = ['#EA580C', '#EA580C', '#1A0C00', '#C2410C'];

const MODES = [
  { id: 'SUR_PLACE', label: 'Sur place',  icon: Store },
  { id: 'EMPORTER',  label: 'À emporter', icon: ShoppingBag },
  { id: 'LIVRAISON', label: 'Livraison',  icon: MapPin },
];

const ZONES = [
  { name: 'Plateau',     fee: 800 },
  { name: 'Cocody',      fee: 1000 },
  { name: 'Adjamé',      fee: 1100 },
  { name: 'Treichville', fee: 900 },
  { name: 'Marcory',     fee: 1200 },
  { name: 'Yopougon',    fee: 1500 },
  { name: 'Abobo',       fee: 1800 },
  { name: 'Koumassi',    fee: 1300 },
];

const METHOD_VISUAL = {
  orange_money: { logo: orangeMoneyLogo,   color: '#FF7900', bg: '#FFF3E0' },
  mtn_momo:     { logo: mtnMomoLogo,       color: '#FFCC00', bg: '#FFFDE7' },
  moov_money:   { logo: moovMoneyLogo,     color: '#0066CC', bg: '#E3F0FF' },
  wave:         { logo: null,              color: '#1DA1F2', bg: '#E8F5FD' },
  card:         { logo: carteBancaireLogo, color: '#1A0C00', bg: '#F1F5F9' },
};

// fallback si l'API est indisponible
const METHODS_FALLBACK = [
  { id: 'orange_money', label: 'Orange Money',   provider: 'ORANGE', gateway: 'novasend', needsPhone: true  },
  { id: 'mtn_momo',     label: 'MTN MoMo',       provider: 'MOMO',   gateway: 'novasend', needsPhone: true  },
  { id: 'moov_money',   label: 'Moov Money',     provider: 'MOOV',   gateway: 'novasend', needsPhone: true  },
  { id: 'wave',         label: 'Wave',            provider: 'WAVE',   gateway: 'novasend', needsPhone: false },
  { id: 'card',         label: 'Carte Bancaire',  provider: 'CARTE',  gateway: 'novasend', needsPhone: false },
];

const mergeVisual = (methods) =>
  methods.map(m => ({ ...m, ...(METHOD_VISUAL[m.id] ?? { logo: null, color: '#8B6E50', bg: '#F1F5F9' }) }));


function KenteStrip() {
  return (
    <div style={{ display: 'flex', height: 4, flexShrink: 0 }}>
      {KENTE.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
    </div>
  );
}

function ItemPhoto({ item }) {
  if (item.photoUrl) {
    return (
      <img
        src={item.photoUrl} alt={item.nom}
        style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
        onError={e => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }
  const initials = item.nom.slice(0, 2).toUpperCase();
  const hue = item.nom.charCodeAt(0) % 360;
  return (
    <div style={{ width: 52, height: 52, borderRadius: 10, background: `hsl(${hue},55%,92%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: 14, fontWeight: 800, color: `hsl(${hue},45%,38%)` }}>{initials}</span>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 800, color: '#9E8B7A', textTransform: 'uppercase', letterSpacing: '0.18em', margin: '0 0 12px' }}>
      {children}
    </p>
  );
}

export default function CartDrawer({ isOpen, onClose, tableNumber, initialMode, initialAddress }) {
  const { items, total, updateQuantity, removeItem, clearCart, restaurantId, restaurantName } = useCart();
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [step,    setStep]    = useState(1);
  const [mode,    setMode]    = useState(initialMode || 'SUR_PLACE');
  const [address, setAddress] = useState(initialAddress || '');

  // livraison
  const [zone,          setZone]          = useState('');
  const [driverStatus,  setDriverStatus]  = useState('idle'); // idle | searching | found | error
  const [driver,        setDriver]        = useState(null);
  const [fournisseurs,  setFournisseurs]  = useState([]);
  const [driverFee,     setDriverFee]     = useState(null); // fee from API; null → use zone fallback
  const zoneFee     = ZONES.find(z => z.name === zone)?.fee ?? 0;
  const deliveryFee = driverFee !== null ? driverFee : zoneFee;

  // Méthodes de paiement dynamiques
  const [paymentMethods, setPaymentMethods] = useState(mergeVisual(METHODS_FALLBACK));

  useEffect(() => {
    paiementsAPI.getMethods()
      .then(r => { if (r.data?.methods?.length) setPaymentMethods(mergeVisual(r.data.methods)); })
      .catch(() => { /* fallback silencieux sur le tableau local */ });
  }, []);

  // Charge les fournisseurs de livraison disponibles quand mode=LIVRAISON
  useEffect(() => {
    if (mode === 'LIVRAISON' && restaurantId) {
      livraisonsExtAPI.getFournisseurs(restaurantId)
        .then(r => setFournisseurs(r.data ?? []))
        .catch(() => setFournisseurs([]));
    }
  }, [mode, restaurantId]);

  // Step 2 — promo
  const [promoCode,     setPromoCode]     = useState('');
  const [promoApplied,  setPromoApplied]  = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError,    setPromoError]    = useState('');

  // Step 2 — paiement
  const [selectedPayment, setSelectedPayment] = useState('');
  const [phone,           setPhone]           = useState('');

  // Calculs
  const subtotal   = total();
  const grandTotal = Math.max(0, subtotal + deliveryFee - promoDiscount);
  const totalItems = items.reduce((s, i) => s + i.quantite, 0);

  const selectedMethod = paymentMethods.find(m => m.id === selectedPayment);

  // Reset step quand on ferme, sync mode + adresse à l'ouverture
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setStep(1), 300);
    } else {
      if (initialMode) setMode(initialMode);
      if (initialAddress) setAddress(initialAddress);
    }
  }, [isOpen, initialMode, initialAddress]);

  // Handlers
  const handleApplyPromo = () => {
    const code = promoCode.trim().toLowerCase();
    setPromoError('');
    if (!code) return;
    if (code === 'welcome10') {
      setPromoDiscount(Math.round(subtotal * 0.1));
      setPromoApplied(true);
    } else if (code === 'freeship') {
      setPromoDiscount(Math.min(deliveryFee || 500, 500));
      setPromoApplied(true);
    } else {
      setPromoError('Code promo invalide.');
      setPromoApplied(false);
      setPromoDiscount(0);
    }
  };

  const handleRemovePromo = () => {
    setPromoCode(''); setPromoApplied(false); setPromoDiscount(0); setPromoError('');
  };

  const handleSearchDriver = async () => {
    if (!zone) return;
    setDriverStatus('searching');
    setDriver(null);
    setDriverFee(null);

    const fournisseur = fournisseurs[0] ?? null;

    if (!fournisseur) {
      // Aucun fournisseur configuré — simulation locale
      await new Promise(r => setTimeout(r, 1400));
      setDriver({ name: 'Livreur disponible', vehicle: 'Moto', rating: 4.7 });
      setDriverStatus('found');
      return;
    }

    try {
      const res = await livraisonsExtAPI.rechercheLivreurs(fournisseur.id, {
        adresse: address,
        commune: zone,
      });
      const list = res.data?.drivers ?? res.data ?? [];
      if (!Array.isArray(list) || list.length === 0) {
        setDriverStatus('error');
        return;
      }
      const d = list[0];
      setDriver({
        name: d.nomLivreur ?? d.nom ?? d.name ?? 'Livreur disponible',
        vehicle: d.vehicule ?? d.vehicle ?? 'Moto',
        rating: d.note ?? d.rating ?? 4.5,
        fournisseurId: fournisseur.id,
      });
      const apiPrice = d.prix ?? d.frais ?? d.fee ?? null;
      if (apiPrice !== null) setDriverFee(Number(apiPrice));
      setDriverStatus('found');
    } catch {
      setDriverStatus('error');
    }
  };

  const handleContinue = () => {
    const deliveryFee = mode === 'LIVRAISON' ? 500 : 0;
    const pendingOrder = {
      restaurantId,
      restaurantName: restaurantName || 'Restaurant',
      orderMode: mode,
      deliveryAddress: mode === 'LIVRAISON' ? address : null,
      deliveryZone: null,
      deliveryFee,
      driver: null,
      fournisseurLivraisonId: null,
      promoCode: null,
      promoDiscount: 0,
      paymentMethod: null,
      phone: null,
      total: subtotal + deliveryFee,
      tableNumber: mode === 'SUR_PLACE' && tableNumber ? tableNumber : undefined,
      items: items.map(item => ({
        articleId: item.articleId,
        nom: item.nom,
        prix: item.prix,
        quantite: item.quantite,
        instructions: item.instructions,
        photoUrl: item.photoUrl,
      })),
    };
    localStorage.setItem('pendingOrder', JSON.stringify(pendingOrder));
    onClose();
    if (!user) {
      navigate('/login?redirect=checkout');
    } else {
      navigate('/checkout');
    }
  };

  const canPay = (() => {
    if (!selectedPayment) return false;
    if (selectedMethod?.needsPhone && phone.replace(/\D/g, '').length < 8) return false;
    if (mode === 'LIVRAISON') {
      if (!address.trim()) return false;
      if (!zone) return false;
      if (driverStatus !== 'found') return false;
    }
    return true;
  })();

  const handlePay = () => {
    const pendingOrder = {
      restaurantId,
      restaurantName: restaurantName || 'Restaurant',
      orderMode: mode,
      deliveryAddress: mode === 'LIVRAISON' ? address : null,
      deliveryZone: mode === 'LIVRAISON' ? zone : null,
      deliveryFee: mode === 'LIVRAISON' ? deliveryFee : 0,
      driver: mode === 'LIVRAISON' ? driver : null,
      fournisseurLivraisonId: mode === 'LIVRAISON' ? (driver?.fournisseurId ?? null) : null,
      promoCode:     promoApplied ? promoCode : null,
      promoDiscount: promoApplied ? promoDiscount : 0,
      paymentMethod: selectedPayment,
      phone: selectedMethod?.needsPhone ? phone : null,
      total: grandTotal,
      tableNumber: mode === 'SUR_PLACE' && tableNumber ? tableNumber : undefined,
      items: items.map(item => ({
        articleId: item.articleId,
        nom: item.nom,
        prix: item.prix,
        quantite: item.quantite,
        instructions: item.instructions,
        photoUrl: item.photoUrl,
      })),
    };
    localStorage.setItem('pendingOrder', JSON.stringify(pendingOrder));
    onClose();
    if (!user) {
      navigate('/login?redirect=checkout');
    } else {
      navigate('/checkout');
    }
  };

  /* ══════════════════════════════════════════════════════════
     RENDU
  ══════════════════════════════════════════════════════════ */
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 49,
          background: 'rgba(0,0,0,0.52)',
          backdropFilter: 'blur(4px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 50,
          width: 'min(440px, 100vw)',
          background: BG,
          boxShadow: '-16px 0 60px rgba(0,0,0,0.22)',
          display: 'flex', flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        <KenteStrip />

        {/* STEP 1 : Panier */}
        {step === 1 && (
          <>
            {/* Header */}
            <div style={{ background: NAVY, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0 0 3px' }}>Mon panier</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2 }}>
                  {restaurantName || 'Sélectionnez un restaurant'}
                  {totalItems > 0 && (
                    <span style={{ marginLeft: 8, background: ORANGE, color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 800 }}>
                      {totalItems}
                    </span>
                  )}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {items.length > 0 && (
                  <button onClick={clearCart}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,140,0,0.15)', border: '1px solid rgba(255,140,0,0.25)', borderRadius: 10, padding: '7px 10px', cursor: 'pointer', color: '#FFDCAA', fontSize: 11, fontWeight: 700, lineHeight: 1 }}>
                    <Trash2 style={{ width: 12, height: 12 }} /> Vider
                  </button>
                )}
                <button onClick={onClose}
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.75)', lineHeight: 0 }}>
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <ChefHat style={{ width: 52, height: 52, color: '#D0C4B8', margin: '0 auto 14px', display: 'block' }} />
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 700, color: '#8B6E50', margin: '0 0 6px' }}>Panier vide</p>
                  <p style={{ fontSize: 13, color: '#BDB0A7', margin: 0 }}>Ajoutez des articles depuis le menu</p>
                </div>
              ) : items.map(item => (
                <div key={item.lineId}
                  style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, padding: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <ItemPhoto item={item} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: NAVY, margin: 0, lineHeight: 1.3 }}>{item.nom}</p>
                      <button onClick={() => removeItem(item.lineId)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D0C4B8', padding: 2, flexShrink: 0, lineHeight: 0 }}>
                        <X style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                    {item.variantLabel && (
                      <p style={{ fontSize: 11, fontWeight: 600, color: ORANGE, margin: '0 0 2px' }}>{item.variantLabel}</p>
                    )}
                    {item.instructions && (
                      <p style={{ fontSize: 11, color: '#9E8B7A', fontStyle: 'italic', margin: '0 0 8px' }}>{item.instructions}</p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', background: '#FDF5EF', borderRadius: 20, padding: '2px 4px', gap: 2 }}>
                        <button onClick={() => updateQuantity(item.lineId, item.quantite - 1)}
                          style={{ width: 26, height: 26, borderRadius: '50%', background: item.quantite <= 1 ? '#E8E0D6' : ORANGE, color: item.quantite <= 1 ? '#B0A090' : '#fff', border: 'none', cursor: item.quantite <= 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Minus style={{ width: 10, height: 10 }} />
                        </button>
                        <span style={{ fontSize: 13, fontWeight: 800, color: NAVY, minWidth: 24, textAlign: 'center' }}>{item.quantite}</span>
                        <button onClick={() => updateQuantity(item.lineId, item.quantite + 1)}
                          style={{ width: 26, height: 26, borderRadius: '50%', background: ORANGE, color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Plus style={{ width: 10, height: 10 }} />
                        </button>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 800, color: ORANGE }}>
                        {formatFCFA(Number(item.prix) * item.quantite)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer step 1 */}
            {items.length > 0 && (
              <div style={{ borderTop: `1px solid ${LINE}`, background: '#fff', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
                {/* Mode selector */}
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#9E8B7A', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 10px' }}>Mode de commande</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {MODES.map(({ id, label, icon: Icon }) => (
                      <button key={id} onClick={() => setMode(id)}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 6px', border: `2px solid ${mode === id ? ORANGE : LINE}`, borderRadius: 12, background: mode === id ? '#FFF4EE' : BG, cursor: 'pointer', transition: 'all 0.2s' }}>
                        <Icon style={{ width: 15, height: 15, color: mode === id ? ORANGE : '#9E8B7A' }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: mode === id ? ORANGE : '#9E8B7A' }}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {mode === 'LIVRAISON' && (
                  <input
                    type="text" placeholder="Adresse complète de livraison..."
                    value={address} onChange={e => setAddress(e.target.value)}
                    style={{ border: `1.5px solid ${LINE}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: NAVY, outline: 'none', background: BG, width: '100%', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = ORANGE}
                    onBlur={e => e.target.style.borderColor = LINE}
                  />
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                  <div>
                    <p style={{ fontSize: 11, color: '#9E8B7A', margin: 0 }}>Sous-total</p>
                    <p style={{ fontSize: 20, fontWeight: 900, color: ORANGE, fontFamily: 'Georgia, serif', margin: 0 }}>{formatFCFA(subtotal)}</p>
                  </div>
                  <button onClick={handleContinue}
                    style={{ background: ORANGE, color: '#fff', border: 'none', borderRadius: 14, padding: '14px 24px', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 24px rgba(224,78,26,0.35)', letterSpacing: '-0.01em', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#C2410C'}
                    onMouseLeave={e => e.currentTarget.style.background = ORANGE}>
                    Continuer →
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* STEP 2 : Finaliser / Paiement */}
        {step === 2 && (
          <>
            {/* Header */}
            <div style={{ background: NAVY, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <button onClick={() => setStep(1)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0 }}>
                <ArrowLeft style={{ width: 18, height: 18 }} />
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0 0 2px' }}>Finaliser</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>Paiement &amp; livraison</p>
                </div>
              </button>
              <button onClick={onClose}
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.75)', lineHeight: 0 }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Body scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Section livraison */}
              {mode === 'LIVRAISON' && (
                <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 16, padding: '16px' }}>
                  <SectionTitle>Livraison</SectionTitle>

                  {/* Adresse */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F5F5F5', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                    <MapPin style={{ width: 15, height: 15, color: ORANGE, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: NAVY, flex: 1 }}>{address || 'Adresse non renseignée'}</span>
                    <button onClick={() => setStep(1)}
                      style={{ fontSize: 11, fontWeight: 700, color: ORANGE, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      Modifier
                    </button>
                  </div>

                  {/* Commune */}
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#9E8B7A', margin: '0 0 10px' }}>Commune de livraison</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {ZONES.map(z => (
                      <button key={z.name}
                        onClick={() => { setZone(z.name); setDriverStatus('idle'); setDriver(null); setDriverFee(null); }}
                        style={{ padding: '7px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: `1.5px solid ${zone === z.name ? ORANGE : LINE}`, background: zone === z.name ? '#FFF4EE' : '#fff', color: zone === z.name ? ORANGE : '#8B6E50', cursor: 'pointer', transition: 'all 0.15s' }}>
                        {z.name} · {formatFCFA(z.fee)}
                      </button>
                    ))}
                  </div>

                  {/* Prix estimé */}
                  {zone && (
                    <div style={{ background: '#FFF4EE', border: `1px solid rgba(255,140,0,0.25)`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#9E8B7A' }}>Frais de livraison estimés</span>
                      <span style={{ fontSize: 16, fontWeight: 900, color: ORANGE }}>{formatFCFA(deliveryFee)}</span>
                    </div>
                  )}

                  {/* Rechercher livreur */}
                  {zone && driverStatus === 'idle' && (
                    <button onClick={handleSearchDriver}
                      style={{ width: '100%', background: NAVY, color: '#fff', border: 'none', borderRadius: 12, padding: '13px 0', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '-0.01em' }}>
                      <Bike style={{ width: 15, height: 15 }} />
                      Rechercher un livreur disponible
                    </button>
                  )}

                  {driverStatus === 'searching' && (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#F5F5F5', borderRadius: 30, padding: '10px 18px' }}>
                        <Loader style={{ width: 16, height: 16, color: ORANGE, animation: 'spin 1s linear infinite' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Recherche en cours…</span>
                      </div>
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                  )}

                  {driverStatus === 'found' && driver && (
                    <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 12, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg,${ORANGE},#C2410C)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <User style={{ width: 20, height: 20, color: '#fff' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <p style={{ fontSize: 14, fontWeight: 800, color: NAVY, margin: 0 }}>{driver.name}</p>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, color: '#F59E0B' }}>
                              <Star style={{ width: 12, height: 12, fill: '#F59E0B' }} /> {driver.rating}
                            </span>
                          </div>
                          <p style={{ fontSize: 11, color: '#8B6E50', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Bike style={{ width: 11, height: 11 }} /> {driver.vehicle}
                          </p>
                        </div>
                      </div>
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle style={{ width: 13, height: 13 }} /> Livreur confirmé
                        </span>
                        <button onClick={() => { setDriverStatus('idle'); setDriver(null); }}
                          style={{ fontSize: 11, color: ORANGE, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                          Changer
                        </button>
                      </div>
                    </div>
                  )}

                  {driverStatus === 'error' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFF4EE', border: '1px solid rgba(255,140,0,0.3)', borderRadius: 10, padding: '10px 14px' }}>
                      <AlertCircle style={{ width: 14, height: 14, color: ORANGE, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#C2410C', fontWeight: 600 }}>Aucun livreur disponible. Réessayez dans quelques instants.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Code promo */}
              <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 16, padding: '16px' }}>
                <SectionTitle>Code promo</SectionTitle>
                {promoApplied ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: '10px 14px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#16A34A' }}>
                      <CheckCircle style={{ width: 15, height: 15 }} />
                      -{formatFCFA(promoDiscount)} appliqué ({promoCode.toUpperCase()})
                    </span>
                    <button onClick={handleRemovePromo}
                      style={{ fontSize: 12, fontWeight: 700, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      Retirer
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, border: `1.5px solid ${LINE}`, borderRadius: 10, padding: '10px 12px', background: BG }}>
                        <BadgePercent style={{ width: 14, height: 14, color: ORANGE, flexShrink: 0 }} />
                        <input
                          type="text" placeholder="Ex : WELCOME10"
                          value={promoCode}
                          onChange={e => { setPromoCode(e.target.value); setPromoError(''); }}
                          onKeyDown={e => e.key === 'Enter' && handleApplyPromo()}
                          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: NAVY, background: 'transparent', fontWeight: 600 }}
                        />
                      </div>
                      <button onClick={handleApplyPromo}
                        style={{ background: ORANGE, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        Appliquer
                      </button>
                    </div>
                    {promoError && (
                      <p style={{ fontSize: 11, color: '#C2410C', margin: '8px 0 0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AlertCircle style={{ width: 12, height: 12 }} />{promoError}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Moyens de paiement */}
              <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 16, padding: '16px' }}>
                <SectionTitle>Moyen de paiement</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {paymentMethods.map(method => {
                    const active = selectedPayment === method.id;
                    return (
                      <button key={method.id}
                        onClick={() => setSelectedPayment(method.id)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                          padding: '14px 10px',
                          border: `2px solid ${active ? method.color : LINE}`,
                          borderRadius: 14,
                          background: active ? method.bg : '#fff',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          position: 'relative',
                        }}>
                        {active && (
                          <CheckCircle style={{ position: 'absolute', top: 6, right: 6, width: 14, height: 14, color: method.color }} />
                        )}
                        {method.logo ? (
                          <img src={method.logo} alt={method.label}
                            style={{ height: 28, maxWidth: 80, objectFit: 'contain' }} />
                        ) : (
                          <div style={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: method.bg, borderRadius: 8, padding: '0 10px', minWidth: 60 }}>
                            {method.id === 'wave'
                              ? <span style={{ fontSize: 13, fontWeight: 900, color: method.color }}>Wave</span>
                              : <CreditCard style={{ width: 20, height: 20, color: method.color }} />
                            }
                          </div>
                        )}
                        <span style={{ fontSize: 10, fontWeight: 800, color: active ? method.color : '#8B6E50', textAlign: 'center', lineHeight: 1.2 }}>
                          {method.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Champ téléphone si mobile money */}
                {selectedMethod?.needsPhone && (
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, border: `1.5px solid ${LINE}`, borderRadius: 10, padding: '11px 14px', background: BG }}>
                    <Phone style={{ width: 14, height: 14, color: ORANGE, flexShrink: 0 }} />
                    <input
                      type="tel" placeholder="Numéro de téléphone lié au compte"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: NAVY, background: 'transparent', fontWeight: 600 }}
                    />
                  </div>
                )}
              </div>

              {/* Récapitulatif */}
              <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 16, padding: '16px' }}>
                <SectionTitle>Récapitulatif</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <RecapRow label="Sous-total" value={formatFCFA(subtotal)} />
                  {mode === 'LIVRAISON' && (
                    <RecapRow
                      label={`Livraison${zone ? ' (' + zone + ')' : ''}`}
                      value={deliveryFee > 0 ? formatFCFA(deliveryFee) : '—'}
                    />
                  )}
                  {promoDiscount > 0 && (
                    <RecapRow label="Remise promo" value={`-${formatFCFA(promoDiscount)}`} accent="#16A34A" />
                  )}
                  <div style={{ borderTop: `1px solid ${LINE}`, marginTop: 4, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#8B6E50' }}>Total TTC</span>
                    <span style={{ fontSize: 24, fontWeight: 900, color: ORANGE, fontFamily: 'Georgia, serif', letterSpacing: '-0.02em' }}>
                      {formatFCFA(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Espace bas */}
              <div style={{ height: 8 }} />
            </div>

            {/* Footer step 2 */}
            <div style={{ borderTop: `1px solid ${LINE}`, background: '#fff', padding: '16px 20px', flexShrink: 0 }}>
              {!canPay && selectedPayment && selectedMethod?.needsPhone && phone.replace(/\D/g, '').length < 8 && (
                <p style={{ fontSize: 11, color: '#F59E0B', textAlign: 'center', margin: '0 0 10px', fontWeight: 600 }}>
                  Entrez votre numéro de téléphone pour continuer
                </p>
              )}
              {mode === 'LIVRAISON' && !zone && (
                <p style={{ fontSize: 11, color: '#F59E0B', textAlign: 'center', margin: '0 0 10px', fontWeight: 600 }}>
                  Sélectionnez votre commune de livraison
                </p>
              )}
              {mode === 'LIVRAISON' && zone && driverStatus !== 'found' && driverStatus !== 'searching' && (
                <p style={{ fontSize: 11, color: '#F59E0B', textAlign: 'center', margin: '0 0 10px', fontWeight: 600 }}>
                  Recherchez un livreur avant de payer
                </p>
              )}
              {!user && (
                <p style={{ fontSize: 11, color: '#9E8B7A', textAlign: 'center', margin: '0 0 10px' }}>
                  Vous serez invité à vous connecter
                </p>
              )}
              <button
                onClick={handlePay}
                disabled={!canPay}
                style={{
                  width: '100%', background: canPay ? ORANGE : '#D0C4B8',
                  color: '#fff', border: 'none', borderRadius: 14,
                  padding: '15px 0', fontSize: 15, fontWeight: 800,
                  cursor: canPay ? 'pointer' : 'not-allowed',
                  boxShadow: canPay ? '0 6px 24px rgba(224,78,26,0.35)' : 'none',
                  transition: 'all 0.2s', letterSpacing: '-0.01em',
                }}
                onMouseEnter={e => { if (canPay) e.currentTarget.style.background = '#C2410C'; }}
                onMouseLeave={e => { if (canPay) e.currentTarget.style.background = ORANGE; }}
              >
                {canPay
                  ? `Payer ${formatFCFA(grandTotal)}`
                  : 'Complétez les informations'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function RecapRow({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: '#9E8B7A', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: accent || NAVY }}>{value}</span>
    </div>
  );
}
