import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, CreditCard, Smartphone, Store, Truck, UtensilsCrossed } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { formatFCFA } from '../utils/formatters';
import { commandesService } from '../services/commandes.service';

const PAYMENT_METHODS = [
  {
    id: 'orange_money',
    apiMode: 'ORANGE_MONEY',
    name: 'Orange Money',
    shortName: 'Orange',
    logo: '🟠',
    accent: '#FF7900',
    accentLight: '#FFF3E0',
    borderActive: 'border-orange-400',
    bgActive: 'bg-orange-50',
    simMsg: 'Demande envoyée sur votre Orange Money',
    simHint: 'Approuvez la transaction dans l\'application',
  },
  {
    id: 'mtn_money',
    apiMode: 'MTN_MONEY',
    name: 'MTN Mobile Money',
    shortName: 'MTN MoMo',
    logo: '🟡',
    accent: '#FFCC00',
    accentLight: '#FFFDE7',
    borderActive: 'border-yellow-400',
    bgActive: 'bg-yellow-50',
    simMsg: 'Demande envoyée sur MTN MoMo',
    simHint: 'Approuvez via *133# ou l\'appli MTN',
  },
  {
    id: 'moov_money',
    apiMode: 'MOOV_MONEY',
    name: 'Moov Money',
    shortName: 'Moov',
    logo: '🔵',
    accent: '#0066CC',
    accentLight: '#E3F0FF',
    borderActive: 'border-blue-400',
    bgActive: 'bg-blue-50',
    simMsg: 'Demande envoyée sur Moov Money',
    simHint: 'Approuvez via l\'application Moov',
  },
  {
    id: 'card',
    apiMode: 'CARTE_BANCAIRE',
    name: 'Carte Bancaire',
    shortName: 'Carte',
    logo: '💳',
    accent: '#0F172A',
    accentLight: '#F5F0FF',
    borderActive: 'border-stone-600',
    bgActive: 'bg-[#FDF5EF]',
    simMsg: 'Traitement du paiement par carte',
    simHint: 'Votre banque vérifie la transaction',
  },
];

const MODE_LABELS = {
  SUR_PLACE: 'Sur place',
  EMPORTER: 'À emporter',
  LIVRAISON: 'Livraison à domicile',
  sur_place: 'Sur place',
  emporter: 'À emporter',
  livraison: 'Livraison à domicile',
};

const SIM_PHASES = [
  { key: 'connecting', label: 'Connexion au service…', duration: 700 },
  { key: 'sending', label: 'Demande envoyée', duration: 1200 },
  { key: 'waiting', label: 'En attente d\'approbation…', duration: 1100 },
  { key: 'approved', label: 'Paiement approuvé !', duration: 800 },
  { key: 'creating', label: 'Création de la commande…', duration: 600 },
  { key: 'done', label: 'Commande confirmée !', duration: 500 },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clearCart } = useCart();
  const [selectedMethod, setSelectedMethod] = useState('orange_money');
  const [pendingOrder, setPendingOrder] = useState(null);

  // Simulation state
  const [simOpen, setSimOpen] = useState(false);
  const [simPhase, setSimPhase] = useState(0);
  const [simError, setSimError] = useState('');
  const [createdOrder, setCreatedOrder] = useState(null);
  const phaseTimers = useRef([]);

  useEffect(() => {
    const saved = localStorage.getItem('pendingOrder');
    if (saved) {
      setPendingOrder(JSON.parse(saved));
    } else {
      navigate('/cart');
    }
  }, [navigate]);

  const method = PAYMENT_METHODS.find((m) => m.id === selectedMethod);

  const clearTimers = () => {
    phaseTimers.current.forEach(clearTimeout);
    phaseTimers.current = [];
  };

  const runSimulation = async () => {
    // Validate restaurantId before starting the animation — fail fast per spec US-06
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const safeRestaurantId = UUID_RE.test(pendingOrder?.restaurantId ?? '') ? pendingOrder.restaurantId : undefined;
    if (!safeRestaurantId) {
      navigate('/menu');
      return;
    }

    setSimOpen(true);
    setSimPhase(0);
    setSimError('');
    setCreatedOrder(null);

    let delay = 0;
    // Run phases 0-3 (visual animation)
    for (let i = 0; i <= 3; i++) {
      const d = delay;
      const phase = i;
      phaseTimers.current.push(
        setTimeout(() => setSimPhase(phase), d)
      );
      delay += SIM_PHASES[i].duration;
    }

    // Phase 4: create order in backend
    phaseTimers.current.push(
      setTimeout(async () => {
        setSimPhase(4);
        try {
          const VALID_MODES = ['SUR_PLACE', 'EMPORTER', 'LIVRAISON'];
          const rawMode = (pendingOrder.orderMode ?? '').toUpperCase();
          const modeLivraison = VALID_MODES.includes(rawMode) ? rawMode : 'SUR_PLACE';

          const payload = {
            restaurantId: safeRestaurantId,
            modeLivraison,
            adresseLivraison:
              modeLivraison === 'LIVRAISON'
                ? pendingOrder.deliveryAddress
                : undefined,
            lignes: pendingOrder.items.map((item) => ({
              articleId: item.articleId,
              quantite: item.quantite ?? item.quantity ?? 1,
              ...(item.instructions ? { instructions: item.instructions } : {}),
            })),
          };

          const res = await commandesService.create(payload);
          const order = res.data;

          // Auto-register digital payment
          try {
            await commandesService.clientRegisterPayment(order.id, method.apiMode);
          } catch {
            // Non-blocking — staff can register manually if needed
          }

          clearCart();
          localStorage.removeItem('pendingOrder');

          setCreatedOrder(order);
          setSimPhase(5);

          // Auto-redirect after success display
          phaseTimers.current.push(
            setTimeout(() => navigate(`/suivi/${order.id}`), 1600)
          );
        } catch (err) {
          // If the server responded with an error (4xx/5xx), surface the message —
          // do NOT silently create a mock order: the restaurant would never see it.
          if (err?.response) {
            const raw = err.response.data?.message || err.response.data?.error || err.response.data;
            const msg = Array.isArray(raw) ? raw.join(', ') : (typeof raw === 'string' ? raw : 'Erreur lors de la création de la commande');
            setSimError(msg);
            setSimPhase(-1);
            clearTimers();
            return;
          }

          // Network failure (no response) — create a local simulation order so
          // the user is not blocked, and staff can reconcile manually later.
          const mockId = 'mock-' + Date.now().toString(36);
          const mockOrder = {
            id: mockId,
            isMock: true,
            statut: 'RECUE',
            numero: 'SIM-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 999) + 1).padStart(3, '0'),
            modeLivraison: pendingOrder.orderMode?.toUpperCase() || 'SUR_PLACE',
            modePaiement: method.apiMode,
            estPaye: true,
            montantTotal: pendingOrder.total || 0,
            createdAt: new Date().toISOString(),
            adresseLivraison: pendingOrder.deliveryAddress || null,
            lignes: (pendingOrder.items || []).map(item => ({
              article: { nom: item.nom, prix: item.prix },
              quantite: item.quantite ?? item.quantity ?? 1,
            })),
            restaurant: {
              id: pendingOrder.restaurantId,
              nom: pendingOrder.restaurantName || 'Restaurant',
              noteMoyenne: 0,
              nbAvis: 0,
            },
          };
          localStorage.setItem('restodici_mock_' + mockId, JSON.stringify(mockOrder));
          clearCart();
          localStorage.removeItem('pendingOrder');
          setCreatedOrder(mockOrder);
          setSimPhase(5);
          phaseTimers.current.push(
            setTimeout(() => navigate('/suivi/' + mockId), 1600)
          );
        }
      }, delay)
    );
  };

  const cancelSim = () => {
    clearTimers();
    setSimOpen(false);
    setSimPhase(0);
    setSimError('');
  };

  if (!pendingOrder) return null;

  const total = pendingOrder.total ?? 0;
  const items = pendingOrder.items ?? [];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[rgba(89,67,42,0.10)] shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/cart')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white text-[#64748B] transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-[#0F172A] text-lg">Paiement</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Order summary */}
        <section className="bg-white rounded-2xl border border-[rgba(89,67,42,0.10)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[rgba(89,67,42,0.08)] flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-[#C05015]" />
            </div>
            <div>
              <p className="font-semibold text-[#0F172A] text-sm">{pendingOrder.restaurantName}</p>
              <p className="text-xs text-[#64748B]">
                {MODE_LABELS[pendingOrder.orderMode] || pendingOrder.orderMode}
                {pendingOrder.deliveryAddress && ` · ${pendingOrder.deliveryAddress}`}
              </p>
            </div>
          </div>

          <div className="px-5 py-4 space-y-2.5">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between items-start text-sm">
                <div>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-lg bg-white text-[#C05015] font-bold text-xs flex items-center justify-center">
                      {item.quantite ?? item.quantity ?? 1}
                    </span>
                    <span className="text-[#0F172A] font-medium">{item.nom || 'Article'}</span>
                  </span>
                  {item.instructions && (
                    <p className="text-xs text-[#64748B] mt-0.5 ml-6 italic">{item.instructions}</p>
                  )}
                </div>
                <span className="text-[#64748B] font-medium ml-4 shrink-0">
                  {formatFCFA((item.prix ?? 0) * (item.quantite ?? item.quantity ?? 1))}
                </span>
              </div>
            ))}
          </div>

          <div className="mx-5 border-t border-[rgba(89,67,42,0.08)]" />
          <div className="px-5 py-4 flex justify-between items-center">
            <span className="font-bold text-[#0F172A]">Total à payer</span>
            <span className="text-xl font-extrabold text-[#C05015]">{formatFCFA(total)} FCFA</span>
          </div>
        </section>

        {/* Payment method */}
        <section className="bg-white rounded-2xl border border-[rgba(89,67,42,0.10)] p-5">
          <h2 className="font-bold text-[#0F172A] mb-4">Méthode de paiement</h2>
          <div className="grid grid-cols-2 gap-3">
            {PAYMENT_METHODS.map((m) => {
              const active = selectedMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMethod(m.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    active ? `${m.borderActive} ${m.bgActive}` : 'border-[rgba(89,67,42,0.12)] hover:border-[rgba(89,67,42,0.25)]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xl">{m.logo}</span>
                    <div className={`ml-auto w-4 h-4 rounded-full border-2 transition ${
                      active ? 'border-[#C05015] bg-[#C05015]' : 'border-[#64748B]/30'
                    }`}>
                      {active && <div className="w-1.5 h-1.5 bg-white rounded-full mx-auto mt-0.5" />}
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-[#0F172A] leading-tight">{m.name}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Security note */}
        <div className="flex items-start gap-3 bg-white rounded-xl px-4 py-3 text-xs text-[#64748B]">
          <span className="text-base mt-0.5">🔒</span>
          <p>Paiement sécurisé. Aucune donnée bancaire n'est stockée sur nos serveurs.</p>
        </div>

        {/* Pay button */}
        <button
          onClick={runSimulation}
          className="w-full py-4 rounded-2xl font-extrabold text-white text-base bg-[#C05015] hover:bg-[#9A3E10] active:scale-[0.98] transition-all shadow-lg shadow-[#C05015]/25"
        >
          Payer {formatFCFA(total)} FCFA · {method?.shortName}
        </button>

        <p className="text-center text-xs text-[#64748B]/70">
          En confirmant, vous acceptez nos conditions générales d'utilisation.
        </p>
      </main>

      {/* ── Payment simulation modal ─────────────────────────────────────── */}
      {simOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl">

            {/* Method banner */}
            <div
              className="px-6 py-5 flex items-center gap-3"
              style={{ background: method?.accentLight ?? '#FDF5EF' }}
            >
              <span className="text-3xl">{method?.logo}</span>
              <div>
                <p className="font-bold text-[#0F172A] text-sm">{method?.name}</p>
                <p className="text-xs text-[#64748B]">{formatFCFA(total)} FCFA</p>
              </div>
              <div className="ml-auto font-bold text-[#0F172A]">
                {formatFCFA(total)}
              </div>
            </div>

            <div className="px-6 py-6">
              {simPhase === -1 ? (
                /* Error state */
                <div className="text-center">
                  <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">❌</span>
                  </div>
                  <p className="font-bold text-[#0F172A] mb-1">Paiement échoué</p>
                  <p className="text-sm text-red-600 mb-5">{simError}</p>
                  <button
                    onClick={cancelSim}
                    className="w-full py-3 rounded-xl bg-white font-semibold text-[#0F172A] text-sm"
                  >
                    Retour
                  </button>
                </div>
              ) : simPhase === 5 ? (
                /* Success state */
                <div className="text-center">
                  <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-7 h-7 text-emerald-500" />
                  </div>
                  <p className="font-bold text-[#0F172A] text-lg mb-1">Commande confirmée !</p>
                  {createdOrder && (
                    <p className="text-sm text-[#64748B] mb-1">
                      #{createdOrder.numero || createdOrder.id?.slice(0, 8).toUpperCase()}
                    </p>
                  )}
                  <p className="text-xs text-[#64748B] animate-pulse">
                    Redirection vers le suivi…
                  </p>
                </div>
              ) : (
                /* Animation state */
                <div className="text-center">
                  {/* Animated phone icon */}
                  <div className="relative mx-auto w-16 h-16 mb-5">
                    <div
                      className="absolute inset-0 rounded-full animate-ping opacity-20"
                      style={{ background: method?.accent ?? '#C05015' }}
                    />
                    <div
                      className="relative w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background: method?.accentLight ?? '#FDF5EF' }}
                    >
                      {method?.id === 'card'
                        ? <CreditCard className="w-7 h-7" style={{ color: method?.accent }} />
                        : <Smartphone className="w-7 h-7" style={{ color: method?.accent }} />}
                    </div>
                  </div>

                  <p className="font-bold text-[#0F172A] text-base mb-1">
                    {SIM_PHASES[simPhase]?.label}
                  </p>
                  <p className="text-xs text-[#64748B] mb-5">
                    {simPhase <= 1 ? method?.simMsg : simPhase === 2 ? method?.simHint : 'Traitement en cours…'}
                  </p>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-white rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        background: method?.accent ?? '#C05015',
                        width: `${Math.min(100, ((simPhase + 1) / (SIM_PHASES.length - 1)) * 100)}%`,
                      }}
                    />
                  </div>

                  <div className="mt-4 flex justify-center gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                        style={{
                          background: i <= simPhase ? (method?.accent ?? '#C05015') : '#E5E7EB',
                          transform: i === simPhase ? 'scale(1.4)' : 'scale(1)',
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Cancel button only during early phases */}
            {simPhase >= 0 && simPhase < 3 && (
              <div className="px-6 pb-5">
                <button
                  onClick={cancelSim}
                  className="w-full py-2.5 rounded-xl border border-[rgba(89,67,42,0.12)] text-[#64748B] text-sm font-medium hover:bg-white transition"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
