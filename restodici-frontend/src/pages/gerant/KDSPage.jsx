import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshCw, Truck, Clock, Package, CheckCircle2,
  AlertCircle, Timer, ArrowRight, CreditCard, Bell
} from 'lucide-react';
import DispatchModal from '../../components/livraison/DispatchModal';
import {
  commandesService,
  createCommandesSocket,
} from '../../services/commandes.service';
import { useAuth } from '../../hooks/useAuth';
import {
  formatFCFA,
  formatDate,
  formatDeliveryMode,
  STATUS_LABELS,
  STATUS_COLORS,
} from '../../utils/formatters';

const STATUS_FLOW = {
  RECUE: ['CONFIRMEE'],
  CONFIRMEE: ['EN_PREP'],
  EN_PREP: ['PRETE'],
  PRETE: ['EN_LIVRAISON', 'LIVREE'],
  EN_LIVRAISON: ['LIVREE'],
  LIVREE: [],
  ANNULEE: [],
};

const PAYMENT_MODES = {
  SUR_PLACE: 'ESPECES',
  LIVRAISON: 'LIVRAISON',
  EMPORTER: 'ESPECES',
};

const KDS_COLUMNS = [
  {
    key: 'new',
    label: 'Nouvelles',
    sublabel: 'À confirmer',
    dot: 'bg-blue-500',
    statuses: ['RECUE', 'CONFIRMEE']
  },
  {
    key: 'prep',
    label: 'En Préparation',
    dot: 'bg-amber-500',
    statuses: ['EN_PREP']
  },
  {
    key: 'ready',
    label: 'Prêtes à Servir',
    dot: 'bg-emerald-500',
    statuses: ['PRETE']
  },
  {
    key: 'delivery',
    label: 'Livraison & Terminées',
    dot: 'bg-indigo-500',
    statuses: ['EN_LIVRAISON', 'LIVREE']
  },
];

const DELAI_PRESETS = [10, 15, 20, 30, 45];

function formatHM(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : `${h}h`;
}

function useGlobalTick() {
  const [, set] = useState(0);
  useEffect(() => { const id = setInterval(() => set(n => n + 1), 30000); return () => clearInterval(id); }, []);
}

function playNotificationTone() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(680, context.currentTime);
  gain.gain.setValueAtTime(0.001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.35, context.currentTime + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.45);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.45);
}

export default function KDSPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusSavingId, setStatusSavingId] = useState('');
  const [paymentState, setPaymentState] = useState({});
  const [paymentSavingId, setPaymentSavingId] = useState('');
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState('');
  const [dispatchOrder, setDispatchOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const upsertOrder = useCallback((orderLike) => {
    if (!orderLike?.id) return;
    setOrders((prev) => {
      const idx = prev.findIndex((o) => o.id === orderLike.id);
      if (idx === -1) return [orderLike, ...prev];
      const next = [...prev];
      next[idx] = { ...next[idx], ...orderLike };
      return next;
    });
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await commandesService.getKDS();
      setOrders(response.data || []);
    } catch {
      setError('Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!user?.id) return;
    const socket = createCommandesSocket(user);
    
    socket.on('commande.nouvelle', (payload) => {
      playNotificationTone();
      setLastRealtimeEvent(`Nouvelle commande #${payload?.numero || ''}`);
      void fetchOrders();
    });

    socket.on('commande.statut', (payload) => {
      setLastRealtimeEvent(`Statut mis à jour #${payload?.numero || ''}`);
      upsertOrder(payload);
    });

    socket.on('commande.paiement', (payload) => {
      setLastRealtimeEvent(`Paiement enregistré #${payload?.numero || ''}`);
      upsertOrder(payload);
    });

    return () => socket.disconnect();
  }, [fetchOrders, upsertOrder, user]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      setStatusSavingId(orderId);
      await commandesService.updateStatut(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, statut: newStatus } : o))
      );
    } catch {
      setError('Impossible de mettre à jour le statut.');
    } finally {
      setStatusSavingId('');
    }
  };

  const registerPayment = async (order) => {
    const raw = paymentState[order.id]?.montantRemis;
    const montantRemis = Number(raw);
    if (!Number.isFinite(montantRemis) || montantRemis < order.montantTotal) {
      setError('Montant remis invalide ou insuffisant.');
      return;
    }

    try {
      setPaymentSavingId(order.id);
      setError('');
      const modePaiement = paymentState[order.id]?.modePaiement || PAYMENT_MODES[order.modeLivraison] || 'ESPECES';
      const response = await commandesService.registerPayment(order.id, { montantRemis, modePaiement });
      const savedOrder = response?.data?.commande;
      upsertOrder(savedOrder || { id: order.id, estPaye: true, montantRemis, modePaiement });
      setPaymentState(prev => {
        const next = { ...prev };
        delete next[order.id];
        return next;
      });
    } catch {
      setError('Paiement refusé. Vérifie le montant exact.');
    } finally {
      setPaymentSavingId('');
    }
  };

  const setOrderDelai = async (orderId, delaiEstime) => {
    try {
      await commandesService.updateDelai(orderId, delaiEstime);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, delaiEstime } : o));
    } catch { /* keep ui intact */ }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order =>
      order.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.lignes?.some(l => l.article?.nom.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [orders, searchTerm]);

  // Tri : commandes avec deadline dépassée ou proche en premier, puis FIFO
  const urgencyScore = (o) => {
    if (!o.createdAt) return 0;
    const ageMs = Date.now() - new Date(o.createdAt).getTime();
    if (o.delaiEstime) {
      const remainMs = o.delaiEstime * 60000 - ageMs;
      return -remainMs; // plus petit remainMs = plus urgent (score élevé)
    }
    return ageMs; // sans délai : plus vieille = plus urgente
  };

  const columnsData = useMemo(() =>
    KDS_COLUMNS.map(col => ({
      ...col,
      orders: filteredOrders
        .filter(o => col.statuses.includes(o.statut))
        .sort((a, b) => urgencyScore(b) - urgencyScore(a))
    })),
    [filteredOrders]
  );

  const totalOrders = orders.length;
  const urgentOrders = orders.filter(o => {
    const ageMinutes = o.createdAt ? Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000) : 0;
    return ageMinutes > 15;
  }).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
          <p className="text-slate-600 font-medium">Chargement du KDS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-6">
      {/* Enhanced Header */}
      <header className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-900 tracking-tighter">KDS</h1>
                <p className="text-slate-500">Kitchen Display System • Temps réel</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Stats */}
            <div className="flex gap-3">
              <div className="bg-white rounded-2xl px-5 py-3 shadow-sm border border-slate-100 flex items-center gap-3">
                <div className="text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900">{totalOrders}</p>
                  <p className="text-xs text-slate-500 -mt-1">Commandes</p>
                </div>
              </div>
              {urgentOrders > 0 && (
                <div className="bg-white rounded-2xl px-5 py-3 shadow-sm border border-red-100 flex items-center gap-3">
                  <div className="text-red-600">
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-red-600">{urgentOrders}</p>
                    <p className="text-xs text-red-500 -mt-1">Urgentes</p>
                  </div>
                </div>
              )}
            </div>

            {/* Search & Refresh */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher commande..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl w-72 focus:outline-none focus:border-amber-400 text-sm"
                />
                <Package className="w-4 h-4 text-slate-400 absolute left-4 top-4" />
              </div>

              <button
                onClick={() => void fetchOrders()}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl text-sm font-medium text-slate-700 transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Actualiser
              </button>
            </div>
          </div>
        </div>

        {lastRealtimeEvent && (
          <div className="mt-4 inline-flex items-center gap-2.5 px-5 py-2 bg-amber-50 text-amber-700 text-sm font-medium rounded-2xl border border-amber-100 shadow-sm">
            <Bell className="w-4 h-4 animate-pulse" />
            {lastRealtimeEvent}
          </div>
        )}
      </header>

      {error && (
        <div className="mb-6 flex items-center gap-3 px-6 py-4 bg-red-50 border border-red-200 rounded-3xl text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Kanban Grid - Modern & Spacious */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {columnsData.map((col) => (
          <div key={col.key} className="flex flex-col bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-100 shadow-xl overflow-hidden h-full">
            {/* Column Header */}
            <div className="px-6 py-5 border-b border-slate-100 bg-white flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${col.dot}`} />
                <div>
                  <p className="font-semibold text-lg text-slate-900">{col.label}</p>
                  {col.sublabel && <p className="text-xs text-slate-500">{col.sublabel}</p>}
                </div>
              </div>
              <div className="bg-slate-100 text-slate-600 text-sm font-bold px-4 py-1.5 rounded-2xl">
                {col.orders.length}
              </div>
            </div>

            {/* Orders Container */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent min-h-[500px]">
              {col.orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6">
                    <Package className="w-10 h-10 text-slate-300" />
                  </div>
                  <p className="text-slate-400 font-medium">Aucune commande</p>
                </div>
              ) : (
                col.orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    statusSavingId={statusSavingId}
                    paymentSavingId={paymentSavingId}
                    paymentState={paymentState}
                    setPaymentState={setPaymentState}
                    onStatusUpdate={updateStatus}
                    onRegisterPayment={registerPayment}
                    onDispatch={setDispatchOrder}
                    onSetDelai={setOrderDelai}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {dispatchOrder && (
        <DispatchModal
          commande={dispatchOrder}
          onClose={() => setDispatchOrder(null)}
          onDispatched={() => { setDispatchOrder(null); void fetchOrders(); }}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   REDESIGNED ORDER CARD - Premium Experience
   ──────────────────────────────────────────────────────────────── */
function OrderCard({
  order,
  statusSavingId,
  paymentSavingId,
  paymentState,
  setPaymentState,
  onStatusUpdate,
  onRegisterPayment,
  onDispatch,
  onSetDelai,
}) {
  useGlobalTick();
  const nextStatuses = STATUS_FLOW[order.statut] || [];
  const allowPayment = ['SUR_PLACE', 'LIVRAISON'].includes(order.modeLivraison);
  const showDispatch = order.modeLivraison === 'LIVRAISON' && ['PRETE', 'EN_LIVRAISON'].includes(order.statut);

  const ageMs      = order.createdAt ? Date.now() - new Date(order.createdAt).getTime() : 0;
  const ageMinutes = Math.floor(ageMs / 60000);

  // Compte à rebours délai
  const deadlineMs   = order.delaiEstime ? order.delaiEstime * 60000 - ageMs : null;
  const remainMin    = deadlineMs !== null ? Math.ceil(deadlineMs / 60000) : null;
  const isOverdue    = remainMin !== null && remainMin <= 0;
  const isUrgent     = remainMin !== null ? remainMin <= 3 : ageMinutes > 18;
  const isWarning    = remainMin !== null ? (remainMin <= 8 && !isUrgent) : (ageMinutes > 12 && !isUrgent);

  return (
    <div className={`group bg-white rounded-3xl border shadow-sm overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5 ${isUrgent || isOverdue ? 'border-red-300 ring-1 ring-red-200' : isWarning ? 'border-amber-300' : 'border-slate-200'}`}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-white to-slate-50">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner transition-colors ${isOverdue ? 'bg-red-600 text-white' : isUrgent ? 'bg-red-100 text-red-700' : 'bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700'}`}>
            #{order.numero.slice(-4)}
          </div>

          <div>
            <div className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-2xl border ${STATUS_COLORS[order.statut] || 'bg-slate-100 text-slate-600'}`}>
              {STATUS_LABELS[order.statut] || order.statut}
            </div>

            {/* Temps écoulé + compte à rebours */}
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <span className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? 'text-red-600' : isUrgent ? 'text-red-500' : isWarning ? 'text-amber-600' : 'text-slate-400'}`}>
                <Timer className="w-3.5 h-3.5" />
                {formatHM(ageMinutes)} écoulé
              </span>
              {remainMin !== null && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isOverdue ? 'bg-red-600 text-white' : isUrgent ? 'bg-red-100 text-red-700' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {isOverdue ? `RETARD ${formatHM(Math.abs(remainMin))}` : `${formatHM(remainMin)} restant`}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="text-2xl font-semibold text-slate-900 tracking-tight">{formatFCFA(order.montantTotal)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{formatDeliveryMode(order.modeLivraison)}</p>
        </div>
      </div>

      {/* Délai estimé rapide */}
      <div className="px-6 pt-4 pb-0">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Délai estimé</p>
        <div className="flex gap-2 flex-wrap">
          {DELAI_PRESETS.map(d => (
            <button
              key={d}
              onClick={() => onSetDelai(order.id, d)}
              className={`px-3 py-1 text-xs font-bold rounded-full border transition-all ${order.delaiEstime === d ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-400 hover:text-amber-600'}`}
            >
              {d} min
            </button>
          ))}
          {order.delaiEstime && (
            <button
              onClick={() => onSetDelai(order.id, 0)}
              className="px-3 py-1 text-xs font-bold rounded-full border border-red-200 text-red-400 hover:bg-red-50 transition-all"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Items — personnalisation complète */}
      <div className="px-6 py-4 space-y-4 border-b border-slate-100 mt-3">
        {order.lignes?.map((ligne, idx) => (
          <div key={idx} className="text-sm">
            <div className="flex items-start gap-3 text-slate-700">
              <span className="font-bold text-amber-600 mt-px shrink-0">{ligne.quantite}×</span>
              <div className="flex-1 min-w-0">
                <span className="font-semibold">{ligne.article?.nom}</span>
                {/* Variante */}
                {ligne.variantLabel && (
                  <span className="ml-2 inline-flex items-center text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                    {ligne.variantLabel}{ligne.variantSupplement > 0 ? ` +${formatFCFA(ligne.variantSupplement)}` : ''}
                  </span>
                )}
                {/* Instructions personnalisation */}
                {ligne.instructions && (
                  <div className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                    <span className="shrink-0 mt-px">📝</span>
                    <span>{ligne.instructions}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Area */}
      {allowPayment && (
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-100">
          {order.estPaye ? (
            <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-2xl">
              <CheckCircle2 className="w-5 h-5" />
              <div>
                <p className="font-semibold">Paiement validé</p>
                <p className="text-xs">Merci !</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-700 text-sm font-medium">
                <CreditCard className="w-4 h-4" />
                Encaissement
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={paymentState[order.id]?.modePaiement || PAYMENT_MODES[order.modeLivraison] || 'ESPECES'}
                  onChange={(e) => setPaymentState(prev => ({
                    ...prev,
                    [order.id]: { ...(prev[order.id] || {}), modePaiement: e.target.value }
                  }))}
                  className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-amber-400"
                >
                  <option value="ESPECES">Espèces</option>
                  <option value="LIVRAISON">À la livraison</option>
                </select>

                <input
                  type="number"
                  value={paymentState[order.id]?.montantRemis ?? ''}
                  onChange={(e) => setPaymentState(prev => ({
                    ...prev,
                    [order.id]: { ...(prev[order.id] || {}), montantRemis: e.target.value }
                  }))}
                  placeholder={`≥ ${order.montantTotal}`}
                  className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                onClick={() => onRegisterPayment(order)}
                disabled={paymentSavingId === order.id}
                className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-bold rounded-2xl text-sm transition-all active:scale-[0.985] flex items-center justify-center gap-2 shadow-md"
              >
                {paymentSavingId === order.id ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Valider le paiement <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-6 space-y-3">
        {nextStatuses.length > 0 && (
          <div className="space-y-2">
            {nextStatuses.map((nextStatus) => (
              <button
                key={nextStatus}
                onClick={() => onStatusUpdate(order.id, nextStatus)}
                disabled={statusSavingId === order.id}
                className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.985] disabled:bg-slate-400"
              >
                {statusSavingId === order.id ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Passer à {STATUS_LABELS[nextStatus]} <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            ))}
          </div>
        )}

        {showDispatch && (
          <button
            onClick={() => onDispatch(order)}
            className="w-full py-4 border-2 border-amber-600 text-amber-700 hover:bg-amber-50 font-semibold rounded-2xl flex items-center justify-center gap-2 text-sm transition-all"
          >
            <Truck className="w-4 h-4" />
            Dispatcher la livraison
          </button>
        )}
      </div>
    </div>
  );
}