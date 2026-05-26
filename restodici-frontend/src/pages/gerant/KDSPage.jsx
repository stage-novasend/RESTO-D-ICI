import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  ChefHat,
  Truck,
  RefreshCw,
  Wallet,
} from 'lucide-react';
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

function playNotificationTone() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  gain.gain.setValueAtTime(0.001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.25);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start();
  oscillator.stop(context.currentTime + 0.25);
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

  const upsertOrder = useCallback((orderLike) => {
    if (!orderLike?.id) return;
    setOrders((prev) => {
      const idx = prev.findIndex((o) => o.id === orderLike.id);
      if (idx === -1) {
        return [orderLike, ...prev];
      }
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
      setLastRealtimeEvent(`Nouvelle commande ${payload?.numero || ''}`.trim());
      void fetchOrders();
    });

    socket.on('commande.statut', (payload) => {
      setLastRealtimeEvent(`Statut mis à jour ${payload?.numero || ''}`.trim());
      upsertOrder(payload);
      void fetchOrders();
    });

    socket.on('commande.paiement', (payload) => {
      setLastRealtimeEvent(`Paiement enregistré ${payload?.numero || ''}`.trim());
      upsertOrder(payload);
      void fetchOrders();
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchOrders, upsertOrder, user]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      setStatusSavingId(orderId);
      await commandesService.updateStatut(orderId, newStatus);
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, statut: newStatus } : order,
        ),
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

    if (!Number.isFinite(montantRemis)) {
      setError('Montant remis invalide.');
      return;
    }

    try {
      setPaymentSavingId(order.id);
      setError('');
      const modePaiement =
        paymentState[order.id]?.modePaiement || PAYMENT_MODES[order.modeLivraison] || 'ESPECES';

      const response = await commandesService.registerPayment(order.id, {
        montantRemis,
        modePaiement,
      });

      const savedOrder = response?.data?.commande;
      if (savedOrder?.id) {
        upsertOrder(savedOrder);
      } else {
        upsertOrder({ id: order.id, estPaye: true, montantRemis, modePaiement });
      }
    } catch {
      setError('Paiement refusé. Vérifie le montant exact.');
    } finally {
      setPaymentSavingId('');
    }
  };

  const activeOrders = useMemo(
    () =>
      orders.filter((order) =>
        ['RECUE', 'CONFIRMEE', 'EN_PREP', 'PRETE', 'EN_LIVRAISON'].includes(
          order.statut,
        ),
      ),
    [orders],
  );

  const readyOrders = useMemo(
    () =>
      orders.filter((order) => ['PRETE', 'EN_LIVRAISON'].includes(order.statut)),
    [orders],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C05015]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#1C1917]">KDS Staff & Salle</h2>
          <p className="text-sm text-[#78716C] mt-0.5">Suivi opérationnel en temps réel</p>
        </div>
        <div className="flex items-center gap-3">
          {lastRealtimeEvent && (
            <span className="text-xs px-3 py-2 rounded-full bg-[#FBE8DC] text-[#9A3E10]">
              {lastRealtimeEvent}
            </span>
          )}
          <button
            onClick={() => void fetchOrders()}
            className="px-4 py-2.5 bg-[#1C1917] text-white rounded-xl hover:bg-black flex items-center gap-2 text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
          <h3 className="font-bold text-base text-[#1C1917] mb-4 flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-[#C05015]" />
            Flux opérationnel
            <span className="ml-auto text-sm font-medium text-[#78716C] bg-[#FBE8DC] px-2.5 py-1 rounded-full">{activeOrders.length}</span>
          </h3>
          <div className="space-y-4">
            {activeOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                statusSavingId={statusSavingId}
                paymentSavingId={paymentSavingId}
                paymentState={paymentState}
                setPaymentState={setPaymentState}
                onStatusUpdate={updateStatus}
                onRegisterPayment={registerPayment}
              />
            ))}
            {activeOrders.length === 0 && (
              <div className="text-center py-8 text-[#9A7060]">
                Aucune commande active
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
          <h3 className="font-bold text-base text-[#1C1917] mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-[#57534E]" />
            Prêtes / En livraison
            <span className="ml-auto text-sm font-medium text-[#78716C] bg-[#FBE8DC] px-2.5 py-1 rounded-full">{readyOrders.length}</span>
          </h3>
          <div className="space-y-4">
            {readyOrders.map((order) => (
              <OrderCompact key={order.id} order={order} />
            ))}
            {readyOrders.length === 0 && (
              <div className="text-center py-8 text-[#9A7060]">
                Aucune commande prête
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderCard({
  order,
  statusSavingId,
  paymentSavingId,
  paymentState,
  setPaymentState,
  onStatusUpdate,
  onRegisterPayment,
}) {
  const nextStatuses = STATUS_FLOW[order.statut] || [];
  const allowPayment = ['SUR_PLACE', 'LIVRAISON'].includes(order.modeLivraison);
  const modePaiementDefault = PAYMENT_MODES[order.modeLivraison] || 'ESPECES';

  return (
    <div className="border rounded-2xl p-4 border-[#E2E8F0] bg-white shadow-sm">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2">
          <StatusIcon status={order.statut} />
          <span className="font-bold text-lg text-[#1C1917]">#{order.numero}</span>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[order.statut]}`}>
          {STATUS_LABELS[order.statut] || order.statut}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-4">
        <span className="text-[#737373]">Mode</span>
        <span className="font-medium text-right">{formatDeliveryMode(order.modeLivraison)}</span>
        <span className="text-[#737373]">Réception</span>
        <span className="font-medium text-right">{formatDate(order.createdAt)}</span>
        <span className="text-[#737373]">Total</span>
        <span className="font-bold text-right">{formatFCFA(order.montantTotal)}</span>
      </div>

      <div className="border-t border-[#E2E8F0] pt-3 mb-4">
        <h4 className="font-medium mb-2">Articles</h4>
        <div className="space-y-1">
          {order.lignes?.map((ligne) => (
            <div key={ligne.id} className="flex justify-between text-sm">
              <span>
                {ligne.quantite}x {ligne.article?.nom}
                {ligne.instructions ? ` · ${ligne.instructions}` : ''}
              </span>
              <span className="font-medium">
                {formatFCFA(Number(ligne.prixUnitaire) * Number(ligne.quantite))}
              </span>
            </div>
          ))}
        </div>
      </div>

      {allowPayment && (
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-3 mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold mb-2">
            <Wallet className="w-4 h-4" /> Encaissement
          </div>

          {order.estPaye ? (
            <div className="text-sm text-green-700 font-medium">Paiement enregistré</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <select
                value={paymentState[order.id]?.modePaiement || modePaiementDefault}
                onChange={(e) =>
                  setPaymentState((prev) => ({
                    ...prev,
                    [order.id]: {
                      ...(prev[order.id] || {}),
                      modePaiement: e.target.value,
                    },
                  }))
                }
                className="px-3 py-2 border rounded-lg"
              >
                <option value="ESPECES">Espèces</option>
                <option value="LIVRAISON">À la livraison</option>
              </select>

              <input
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                value={paymentState[order.id]?.montantRemis ?? ''}
                onChange={(e) =>
                  setPaymentState((prev) => ({
                    ...prev,
                    [order.id]: {
                      ...(prev[order.id] || {}),
                      montantRemis: e.target.value,
                    },
                  }))
                }
                placeholder={`Exact: ${Number(order.montantTotal)}`}
                className="px-3 py-2 border rounded-lg"
              />

              <button
                onClick={() => void onRegisterPayment(order)}
                disabled={paymentSavingId === order.id}
                className="bg-[#0F172A] text-white py-2 rounded-lg hover:bg-black disabled:opacity-50"
              >
                {paymentSavingId === order.id ? 'Enregistrement...' : 'Valider paiement'}
              </button>
            </div>
          )}
        </div>
      )}

      {nextStatuses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {nextStatuses.map((nextStatus) => (
            <button
              key={nextStatus}
              onClick={() => void onStatusUpdate(order.id, nextStatus)}
              disabled={statusSavingId === order.id}
              className="w-full bg-[#C05015] text-white py-2 rounded-xl hover:bg-[#9A3E10] transition-colors font-medium disabled:opacity-50 text-sm"
            >
              {statusSavingId === order.id
                ? 'Mise à jour...'
                : `Passer à ${STATUS_LABELS[nextStatus] || nextStatus}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCompact({ order }) {
  return (
    <div className="border rounded-xl p-4 border-[#E2E8F0] bg-white">
      <div className="flex items-center justify-between">
        <span className="font-semibold">#{order.numero}</span>
        <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[order.statut]}`}>
          {STATUS_LABELS[order.statut] || order.statut}
        </span>
      </div>
      <div className="text-sm mt-2 text-[#4A4137]">
        {formatDeliveryMode(order.modeLivraison)} · {formatDate(order.createdAt)}
      </div>
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === 'RECUE') return <Clock className="w-5 h-5 text-blue-500" />;
  if (status === 'CONFIRMEE') return <AlertTriangle className="w-5 h-5 text-orange-500" />;
  if (status === 'EN_PREP') return <ChefHat className="w-5 h-5 text-indigo-500" />;
  if (status === 'PRETE') return <CheckCircle className="w-5 h-5 text-green-600" />;
  if (status === 'EN_LIVRAISON') return <Truck className="w-5 h-5 text-purple-600" />;
  return <Clock className="w-5 h-5 text-[#9A7060]" />;
}
