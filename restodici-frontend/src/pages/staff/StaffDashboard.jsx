import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChefHat,
  CircleDollarSign,
  Flame,
  Package,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  commandesService,
  createCommandesSocket,
} from '../../services/commandes.service';
import { stocksAPI } from '../../services/api';
import {
  formatDate,
  formatDeliveryMode,
  formatFCFA,
  STATUS_COLORS,
  STATUS_LABELS,
  timeAgo,
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
  EMPORTER: 'ESPECES',
  LIVRAISON: 'LIVRAISON',
};

const METRIC_STYLES = {
  active: {
    card: 'border-orange-200 bg-gradient-to-br from-[#FFF4EC] via-white to-[#FFE4D4]',
    icon: 'bg-[#D94500] text-white',
    ring: 'from-[#D94500]/20 to-transparent',
  },
  ready: {
    card: 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50',
    icon: 'bg-emerald-500 text-white',
    ring: 'from-emerald-200 to-transparent',
  },
  payment: {
    card: 'border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50',
    icon: 'bg-violet-500 text-white',
    ring: 'from-violet-200 to-transparent',
  },
  stock: {
    card: 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-yellow-50',
    icon: 'bg-amber-500 text-white',
    ring: 'from-amber-200 to-transparent',
  },
};

export default function StaffDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingOrderId, setSavingOrderId] = useState('');
  const [savingStockId, setSavingStockId] = useState('');
  const [paymentDrafts, setPaymentDrafts] = useState({});
  const [error, setError] = useState('');
  const [lastEvent, setLastEvent] = useState('');

  const refreshDashboard = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError('');
      const [kdsRes, alertsRes] = await Promise.all([
        commandesService.getKDS(),
        stocksAPI.getAlerts(),
      ]);
      setOrders(kdsRes.data || []);
      setAlerts(alertsRes.data || []);
    } catch {
      setError('Impossible de charger le dashboard staff');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  useEffect(() => {
    if (!user?.id) return;

    const pollingInterval = setInterval(() => {
      void refreshDashboard({ silent: true });
    }, 30000);

    const socket = createCommandesSocket(user);

    socket.on('commande.nouvelle', (payload) => {
      setLastEvent(`Nouvelle commande ${payload?.numero || ''}`.trim());
      void refreshDashboard({ silent: true });
    });

    socket.on('commande.statut', (payload) => {
      setLastEvent(`Statut mis à jour ${payload?.numero || ''}`.trim());
      void refreshDashboard({ silent: true });
    });

    socket.on('commande.paiement', (payload) => {
      setLastEvent(`Paiement confirmé ${payload?.numero || ''}`.trim());
      void refreshDashboard({ silent: true });
    });

    socket.on('restaurant.profile.updated', () => {
      setLastEvent('Profil restaurant mis à jour');
      void refreshDashboard({ silent: true });
    });

    return () => {
      clearInterval(pollingInterval);
      socket.disconnect();
    };
  }, [refreshDashboard, user]);

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
    () => orders.filter((order) => ['PRETE', 'EN_LIVRAISON'].includes(order.statut)),
    [orders],
  );

  const unpaidOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          ['SUR_PLACE', 'LIVRAISON'].includes(order.modeLivraison) && !order.estPaye,
      ),
    [orders],
  );

  const totalActiveAmount = useMemo(
    () =>
      activeOrders.reduce(
        (sum, order) => sum + Number(order.montantTotal || 0),
        0,
      ),
    [activeOrders],
  );

  const urgentOrders = useMemo(
    () =>
      activeOrders.filter((order) => {
        const createdAt = new Date(order.createdAt).getTime();
        if (!createdAt) return false;
        return new Date().getTime() - createdAt >= 15 * 60 * 1000;
      }),
    [activeOrders],
  );

  const updateStatus = async (orderId, nextStatus) => {
    try {
      setSavingOrderId(orderId);
      setError('');
      await commandesService.updateStatut(orderId, nextStatus);
      await refreshDashboard();
    } catch {
      setError('Mise à jour du statut impossible');
    } finally {
      setSavingOrderId('');
    }
  };

  const registerPayment = async (order) => {
    const draft = paymentDrafts[order.id] || {};
    const montantRemis = Number(draft.montantRemis ?? order.montantTotal);
    const modePaiement = draft.modePaiement || PAYMENT_MODES[order.modeLivraison] || 'ESPECES';

    if (!Number.isFinite(montantRemis)) {
      setError('Montant remis invalide');
      return;
    }

    try {
      setSavingOrderId(order.id);
      setError('');
      await commandesService.registerPayment(order.id, {
        montantRemis,
        modePaiement,
      });
      await refreshDashboard();
    } catch {
      setError('Paiement refusé: le montant doit être exact');
    } finally {
      setSavingOrderId('');
    }
  };

  const adjustStock = async (articleId, quantity, motif) => {
    try {
      setSavingStockId(articleId);
      setError('');
      await stocksAPI.adjust(articleId, quantity, motif);
      await refreshDashboard();
    } catch {
      setError('Ajustement de stock impossible');
    } finally {
      setSavingStockId('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="w-10 h-10 border-4 border-[#D94500] border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(217,69,0,0.25)]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-[#F3D5C4] bg-gradient-to-br from-[#2D2720] via-[#5B3219] to-[#D94500] px-6 py-7 text-white shadow-[0_24px_80px_rgba(92,39,11,0.22)]">
        <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#FFD4BF]/20 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Staff en direct
            </span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard Staff</h1>
              <p className="mt-2 text-sm text-white/80 sm:text-base">
                Vue opérationnelle en temps réel pour{' '}
                <span className="font-semibold text-white">
                  {user?.restaurant?.nom || 'votre restaurant'}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <LiveChip label="Commandes actives" value={activeOrders.length} />
              <LiveChip label="Urgentes" value={urgentOrders.length} />
              <LiveChip label="Encaissements" value={unpaidOrders.length} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {lastEvent && (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs text-white/90 backdrop-blur">
                <Bell className="h-3.5 w-3.5" />
                {lastEvent}
              </span>
            )}
            <button
              onClick={() => void refreshDashboard()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
            <Link
              to="/staff/kds"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#7A2F09] transition hover:bg-[#FFF2EA]"
            >
              KDS complet <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          icon={<ChefHat className="w-5 h-5" />}
          label="Commandes actives"
          value={String(activeOrders.length)}
          secondary="Suivi en cuisine et en salle"
          tone="active"
        />
        <MetricCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Prêtes / en livraison"
          value={String(readyOrders.length)}
          secondary="Commandes proches de la remise"
          tone="ready"
        />
        <MetricCard
          icon={<CircleDollarSign className="w-5 h-5" />}
          label="Paiements en attente"
          value={String(unpaidOrders.length)}
          secondary="Encaissements à valider"
          tone="payment"
        />
        <MetricCard
          icon={<Package className="w-5 h-5" />}
          label="Alertes stock"
          value={String(alerts.length)}
          secondary={formatFCFA(totalActiveAmount)}
          tone="stock"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
        <section className="rounded-[26px] border border-[#F0E0D4] bg-white/95 p-4 shadow-[0_16px_45px_rgba(45,39,32,0.06)] backdrop-blur">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-semibold text-[#2D2720]">
                <Bell className="w-4 h-4 text-[#D94500]" /> Flux commandes
              </div>
              <p className="mt-1 text-sm text-[#8B7355]">
                Progression rapide des commandes avec actions prioritaires.
              </p>
            </div>
            <span className="rounded-full bg-[#FFF1E8] px-3 py-1 text-xs font-medium text-[#B83A00]">
              {activeOrders.length} en cours
            </span>
          </div>

          {activeOrders.length === 0 && (
            <EmptyState
              icon={<ChefHat className="h-6 w-6 text-[#D94500]" />}
              title="Aucune commande active"
              description="Les nouvelles commandes apparaîtront ici en temps réel."
            />
          )}

          <div className="space-y-4">
            {activeOrders.map((order) => {
              const nextStatuses = STATUS_FLOW[order.statut] || [];
              const draft = paymentDrafts[order.id] || {};
              const showPayment =
                ['SUR_PLACE', 'LIVRAISON'].includes(order.modeLivraison) && !order.estPaye;
              const urgency = getOrderUrgency(order.createdAt);

              return (
                <div
                  key={order.id}
                  className={`relative overflow-hidden rounded-[24px] border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${urgency.card}`}
                >
                  <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#D94500] to-[#FF9F66]" />
                  <div className="pl-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#2D2720] shadow-sm">
                            #{order.numero}
                          </span>
                          <span
                            className={`px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[order.statut]}`}
                          >
                            {STATUS_LABELS[order.statut] || order.statut}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${urgency.badge}`}>
                            {timeAgo(order.createdAt)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-[#6C5B49]">
                          <span className="rounded-full bg-white/80 px-2.5 py-1">
                            {formatDeliveryMode(order.modeLivraison)}
                          </span>
                          <span className="rounded-full bg-white/80 px-2.5 py-1">
                            {formatDate(order.createdAt)}
                          </span>
                          <span className="rounded-full bg-white/80 px-2.5 py-1">
                            {order.lignes?.length || 0} article{order.lignes?.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs uppercase tracking-[0.18em] text-[#8B7355]">
                          Total
                        </div>
                        <div className="text-xl font-bold text-[#2D2720]">
                          {formatFCFA(order.montantTotal)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                      {order.lignes?.map((ligne) => (
                        <div
                          key={ligne.id}
                          className="rounded-2xl border border-white/70 bg-white/80 px-3 py-2 text-sm shadow-sm backdrop-blur"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-[#2D2720]">
                                {ligne.quantite}× {ligne.article?.nom}
                              </div>
                              {ligne.instructions && (
                                <div className="mt-1 text-xs text-[#8B7355]">
                                  {ligne.instructions}
                                </div>
                              )}
                            </div>
                            <div className="font-semibold text-[#7A2F09]">
                              {formatFCFA(Number(ligne.prixUnitaire) * Number(ligne.quantite))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {showPayment && (
                      <div className="mt-4 rounded-[22px] border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 p-3">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#3E2A5A]">
                          <CircleDollarSign className="h-4 w-4" /> Encaissement exact requis
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <select
                            value={draft.modePaiement || PAYMENT_MODES[order.modeLivraison] || 'ESPECES'}
                            onChange={(e) =>
                              setPaymentDrafts((prev) => ({
                                ...prev,
                                [order.id]: {
                                  ...(prev[order.id] || {}),
                                  modePaiement: e.target.value,
                                },
                              }))
                            }
                            className="rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm text-[#2D2720] outline-none ring-0 transition focus:border-violet-300"
                          >
                            <option value="ESPECES">Espèces</option>
                            <option value="LIVRAISON">À la livraison</option>
                          </select>
                          <input
                            type="number"
                            min="0"
                            value={draft.montantRemis ?? Number(order.montantTotal)}
                            onChange={(e) =>
                              setPaymentDrafts((prev) => ({
                                ...prev,
                                [order.id]: {
                                  ...(prev[order.id] || {}),
                                  montantRemis: e.target.value,
                                },
                              }))
                            }
                            className="rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm text-[#2D2720] outline-none transition focus:border-violet-300"
                          />
                          <button
                            onClick={() => void registerPayment(order)}
                            disabled={savingOrderId === order.id}
                            className="rounded-xl bg-[#2D2720] px-3 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50"
                          >
                            {savingOrderId === order.id ? 'Encaissement...' : 'Encaisser'}
                          </button>
                        </div>
                      </div>
                    )}

                    {nextStatuses.length > 0 && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {nextStatuses.map((nextStatus) => (
                          <button
                            key={nextStatus}
                            onClick={() => void updateStatus(order.id, nextStatus)}
                            disabled={savingOrderId === order.id}
                            className="rounded-xl bg-gradient-to-r from-[#D94500] to-[#F97316] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-[#C43E00] hover:to-[#EA6A15] disabled:opacity-50"
                          >
                            {savingOrderId === order.id
                              ? 'Mise à jour...'
                              : STATUS_LABELS[nextStatus] || nextStatus}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[26px] border border-[#F0E0D4] bg-white/95 p-4 shadow-[0_16px_45px_rgba(45,39,32,0.06)] backdrop-blur">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-semibold text-[#2D2720]">
                <Package className="w-4 h-4 text-amber-500" /> Stocks & alertes
              </div>
              <p className="mt-1 text-sm text-[#8B7355]">
                Corrections rapides et réception express des produits sensibles.
              </p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              {alerts.length} alerte{alerts.length > 1 ? 's' : ''}
            </span>
          </div>

          {alerts.length === 0 && (
            <EmptyState
              icon={<CheckCircle2 className="h-6 w-6 text-emerald-500" />}
              title="Aucune alerte stock"
              description="Les seuils critiques de stock sont actuellement sous contrôle."
            />
          )}

          <div className="space-y-3">
            {alerts.map((item) => {
              const tone = getStockTone(item);
              return (
                <div
                  key={item.id}
                  className={`rounded-[22px] border p-4 shadow-sm transition hover:shadow-md ${tone.card}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full p-2 ${tone.icon}`}>
                          {item.stock <= 0 ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <Flame className="h-4 w-4" />
                          )}
                        </span>
                        <div>
                          <div className="font-semibold text-[#2D2720]">{item.nom}</div>
                          <div className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone.badge}`}>
                            Stock: {item.stock} / seuil {item.seuil}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void adjustStock(item.id, -1, 'Correction staff')}
                        disabled={savingStockId === item.id}
                        className="h-9 w-9 rounded-xl border border-white/70 bg-white/90 text-lg font-semibold text-[#8A3A11] shadow-sm transition hover:bg-white disabled:opacity-50"
                      >
                        -
                      </button>
                      <button
                        onClick={() => void adjustStock(item.id, 1, 'Réception rapide')}
                        disabled={savingStockId === item.id}
                        className="h-9 w-9 rounded-xl bg-[#2D2720] text-lg font-semibold text-white shadow-sm transition hover:bg-black disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function LiveChip({ label, value }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-white/90 backdrop-blur">
      <span className="text-[11px] uppercase tracking-[0.18em] text-white/65">{label}</span>
      <span className="rounded-full bg-white/15 px-2 py-0.5 font-semibold text-white">{value}</span>
    </span>
  );
}

function MetricCard({ icon, label, value, secondary, tone }) {
  const style = METRIC_STYLES[tone] || METRIC_STYLES.active;

  return (
    <div className={`relative overflow-hidden rounded-[24px] border p-4 shadow-sm ${style.card}`}>
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-80 blur-2xl ${style.ring}`} />
      <div className="relative flex items-center justify-between">
        <div className="text-[#7B6A58] text-sm font-medium">{label}</div>
        <div className={`rounded-2xl p-2.5 shadow-sm ${style.icon}`}>{icon}</div>
      </div>
      <div className="relative mt-3 text-3xl font-bold text-[#2D2720]">{value}</div>
      {secondary && <div className="relative mt-1 text-xs text-[#7B6A58]">{secondary}</div>}
    </div>
  );
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#E8D8CC] bg-gradient-to-br from-[#FFF9F5] to-white px-4 py-8 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
        {icon}
      </div>
      <div className="font-semibold text-[#2D2720]">{title}</div>
      <div className="mt-1 text-sm text-[#8B7355]">{description}</div>
    </div>
  );
}

function getOrderUrgency(createdAt) {
  const ageMinutes = Math.floor(
    (new Date().getTime() - new Date(createdAt).getTime()) / 60000,
  );

  if (ageMinutes >= 20) {
    return {
      card: 'border-red-200 bg-gradient-to-br from-red-50 via-white to-orange-50',
      badge: 'bg-red-100 text-red-700',
    };
  }

  if (ageMinutes >= 10) {
    return {
      card: 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50',
      badge: 'bg-amber-100 text-amber-700',
    };
  }

  return {
    card: 'border-[#F0DFD2] bg-gradient-to-br from-[#FFF9F5] via-white to-[#FFF1E8]',
    badge: 'bg-emerald-100 text-emerald-700',
  };
}

function getStockTone(item) {
  if (item.stock <= 0) {
    return {
      card: 'border-red-200 bg-gradient-to-br from-red-50 via-white to-rose-50',
      badge: 'bg-red-100 text-red-700',
      icon: 'bg-red-100 text-red-600',
    };
  }

  return {
    card: 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-yellow-50',
    badge: 'bg-amber-100 text-amber-700',
    icon: 'bg-amber-100 text-amber-600',
  };
}
