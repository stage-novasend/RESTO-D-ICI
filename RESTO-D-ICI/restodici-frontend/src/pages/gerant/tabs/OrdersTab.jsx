/* OrdersTab — extrait de GerantDashboard */
import { useCallback, useEffect, useState } from "react";
import { ClipboardList, FileText, RefreshCcw, X } from "lucide-react";
import { b2bAPI, commandesExtraAPI, commandesService } from "../../../services/api";
import { createCommandesSocket } from "../../../services/commandes.service";
import { mergeManagerOrdersResults } from "../../../services/orders-merge.js";
import { downloadAndOpenBlob } from "../_helpers";
import { B2BCountdown } from "../_shared";

export default function OrdersTab({ restaurantId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [error, setError] = useState(null);
  const [nowTs, setNowTs] = useState(0);
  const [receiptLoading, setReceiptLoading] = useState({});
  const [rembourseModal, setRembourseModal] = useState(null); // order | null
  const [rembourseMotif, setRembourseMotif] = useState('');
  const [rembourseLoading, setRembourseLoading] = useState(false);

  const handleDownloadReceipt = async (order) => {
    setReceiptLoading(s => ({ ...s, [order.id]: true }));
    try {
      const r = await commandesService.getReceiptPdf(order.id);
      const blob = new Blob([r.data], { type: 'application/pdf' });
      downloadAndOpenBlob(blob, `recu-commande-${order.numero || order.id.slice(0, 8)}.pdf`);
    } catch {
      alert('Erreur téléchargement reçu PDF. Veuillez réessayer.');
    } finally {
      setReceiptLoading(s => ({ ...s, [order.id]: false }));
    }
  };

  const handleRembourser = async () => {
    if (!rembourseModal) return;
    setRembourseLoading(true);
    try {
      await commandesExtraAPI.rembourser(rembourseModal.id, rembourseMotif);
      setRembourseModal(null);
      setRembourseMotif('');
      loadOrders({ silent: true });
    } catch {
      alert('Erreur lors du remboursement. Veuillez réessayer.');
    } finally {
      setRembourseLoading(false);
    }
  };

  const loadOrders = useCallback(async (options = {}) => {
    if (!restaurantId) return;
    try {
      if (!options.silent) {
        setLoading(true);
      }
      setError(null);

      const [clientRes, b2bRes] = await Promise.allSettled([
        commandesService.getAll({ restaurantId, limit: 50 }),
        b2bAPI.getManagerOrders(),
      ]);

      const { orders: merged, hasClientError, hasB2bError, hasAnySuccess } =
        mergeManagerOrdersResults(clientRes, b2bRes);

      setOrders(merged);

      if (!hasAnySuccess) {
        setError("Impossible de charger les commandes client et entreprise.");
      } else if (hasClientError) {
        setError(
          "Les commandes client sont temporairement indisponibles. Affichage des commandes entreprise.",
        );
      } else if (hasB2bError) {
        setError(
          "Les commandes entreprise sont temporairement indisponibles. Affichage des commandes client.",
        );
      }
    } catch (loadError) {
      console.error("Erreur chargement commandes:", loadError);
      setError("Impossible de charger les commandes client et entreprise.");
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }, [restaurantId]);

  useEffect(() => {
    const refreshNow = () => setNowTs(Date.now());
    refreshNow();
    const interval = setInterval(refreshNow, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    void loadOrders();

    const pollingInterval = setInterval(() => {
      void loadOrders({ silent: true });
    }, 30000);

    const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUser = cachedUser?.user || cachedUser;
    const socket = createCommandesSocket(currentUser);

    const refreshFromSocket = () => {
      void loadOrders({ silent: true });
    };

    socket.on('commande.nouvelle', refreshFromSocket);
    socket.on('commande.statut', refreshFromSocket);
    socket.on('commande.paiement', refreshFromSocket);

    return () => {
      clearInterval(pollingInterval);
      socket.disconnect();
    };
  }, [loadOrders]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await commandesService.updateStatus(orderId, newStatus);
      await loadOrders({ silent: true });
    } catch (error) {
      console.error("Erreur mise à jour statut:", error);
      alert("Erreur lors de la mise à jour du statut");
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      RECUE: "bg-[#FFF0DF] text-[#EA580C]",
      CONFIRMEE: "bg-[#FFF0DF] text-[#1A1A1A]",
      EN_PREP: "bg-[#FFF0DF] text-[#C2410C]",
      PRETE: "bg-[#FFF0DF] text-[#1C1917]",
      LIVREE: "bg-[#FFF0DF] text-[#57534E]",
      ANNULEE: "bg-red-50 text-red-700",
      EN_ATTENTE: "bg-[#FFFBEB] text-[#92400E]",
    };
    return colors[status] || "bg-[#FFF0DF] text-[#1A1A1A]";
  };

  const getStatusLabel = (status) => {
    const labels = {
      RECUE: "Reçue",
      CONFIRMEE: "Confirmée",
      EN_PREP: "En préparation",
      PRETE: "Prête",
      LIVREE: "Livrée",
      ANNULEE: "Annulée",
      EN_ATTENTE: "En attente",
    };
    return labels[status] || status;
  };

  const orderAgeMinutes = (order) =>
    (nowTs - new Date(order.createdAt).getTime()) / 60000;

  const canCancelOrder = (order) =>
    order.statut === "RECUE" && orderAgeMinutes(order) <= 5;

  const canConfirmOrder = (order) => order.statut === "RECUE";
  const canPrepareOrder = (order) => order.statut === "CONFIRMEE";
  const canMarkReady = (order) => order.statut === "EN_PREP";
  const canCompleteOrder = (order) => order.statut === "PRETE";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-[#EA580C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-gray-800 text-lg">
          Gestion des Commandes
        </h3>
        <p className="text-sm text-gray-600">
          Valider, annuler et suivre les commandes en temps réel
        </p>
      </div>

      <div className="grid gap-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-semibold">Commande #{order.numero}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-[#FFF0DF] text-slate-700">
                    {order.source}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.statut)}`}
                  >
                    {getStatusLabel(order.statut)}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {new Date(order.createdAt).toLocaleString("fr-FR")}
                </p>
                <p className="text-sm text-[#8B6E50]">Référence CDC: {order.numero}</p>
                <p className="font-bold text-[#1C1917]">
                  {Number(order.amount || 0).toLocaleString()} FCFA
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {order.type === "CLIENT" && canCancelOrder(order) && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "ANNULEE")}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
                  >
                    Annuler
                  </button>
                )}
                {order.type === "CLIENT" && canConfirmOrder(order) && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "CONFIRMEE")}
                    className="px-3 py-1.5 bg-[#EA580C] text-white rounded-lg text-sm hover:bg-[#C2410C] transition"
                  >
                    Valider
                  </button>
                )}
                {order.type === "CLIENT" && canPrepareOrder(order) && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "EN_PREP")}
                    className="px-3 py-1.5 bg-[#EA580C] text-white rounded-lg text-sm hover:bg-[#C2410C] transition"
                  >
                    En préparation
                  </button>
                )}
                {order.type === "CLIENT" && canMarkReady(order) && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "PRETE")}
                    className="px-3 py-1.5 bg-[#1A1A1A] text-white rounded-lg text-sm hover:bg-[#292524] transition"
                  >
                    Prête
                  </button>
                )}
                {order.type === "CLIENT" && canCompleteOrder(order) && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "LIVREE")}
                    className="px-3 py-1.5 bg-[#57534E] text-white rounded-lg text-sm hover:bg-[#1A1A1A] transition"
                  >
                    Valider remise
                  </button>
                )}
                {order.type === "B2B" && (
                  <span className="px-3 py-1.5 bg-[#FFF0DF] text-slate-700 rounded-lg text-sm">
                    Commande entreprise - lecture seule
                  </span>
                )}
                {order.type === "B2B" && order.deadlineAt && (
                  <B2BCountdown deadlineAt={order.deadlineAt} statut={order.statut} />
                )}
                {order.statut === "LIVREE" && (
                  <>
                    <button
                      onClick={() => handleDownloadReceipt(order)}
                      disabled={receiptLoading[order.id]}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-[#EA580C] text-[#EA580C] rounded-lg text-sm hover:bg-[#FFF0DF] transition disabled:opacity-60"
                      title="Télécharger le reçu PDF"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {receiptLoading[order.id] ? '…' : 'Reçu PDF'}
                    </button>
                    {!order.rembourse && (
                      <button
                        onClick={() => { setRembourseModal(order); setRembourseMotif(''); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 transition"
                        title="Enregistrer un remboursement"
                      >
                        <RefreshCcw className="w-3.5 h-3.5" />
                        Rembourser
                      </button>
                    )}
                    {order.rembourse && (
                      <span className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium">Remboursée</span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="text-center py-8 text-red-600">
          {error}
        </div>
      )}
      {orders.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl" style={{ background: '#FFF7ED' }}>
          <ClipboardList className="w-12 h-12 mb-3" style={{ color: '#EA580C', opacity: 0.4 }} />
          <p className="text-sm font-medium" style={{ color: '#1A0C00' }}>Aucune commande en cours</p>
          <p className="text-xs mt-1" style={{ color: '#A89070' }}>Les nouvelles commandes arriveront ici en temps réel.</p>
        </div>
      )}

      {/* Modal remboursement */}
      {rembourseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-[420px] max-w-[95vw] shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-bold text-slate-900">Confirmer le remboursement</h3>
              <button onClick={() => setRembourseModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-600 mb-4">
                Commande <strong>{rembourseModal.numero}</strong> — {Number(rembourseModal.montantTotal).toLocaleString()} FCFA
              </p>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Motif du remboursement</label>
              <textarea
                value={rembourseMotif}
                onChange={e => setRembourseMotif(e.target.value)}
                placeholder="Ex: article indisponible, qualité insuffisante..."
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end px-6 py-4 border-t">
              <button onClick={() => setRembourseModal(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition">Annuler</button>
              <button onClick={handleRembourser} disabled={rembourseLoading} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition disabled:opacity-60">
                {rembourseLoading ? 'Traitement…' : 'Confirmer le remboursement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════ Module Stocks — Inventaire et alertes ══════════════════ */
