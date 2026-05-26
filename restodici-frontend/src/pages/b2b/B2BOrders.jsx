import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, Package, CheckCircle, AlertCircle,
  ChevronRight, Plus, Download, RefreshCw,
  Star, ThumbsUp, ThumbsDown, Send, X,
} from 'lucide-react';
import { b2bAPI, commandesService as apiCommandesService } from '../../services/api';
import { commandesService, createCommandesSocket } from '../../services/commandes.service';
import { formatFCFA } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';

const RATING_LABELS = ['', 'Très mauvais', 'Mauvais', 'Correct', 'Bon', 'Excellent'];

function StarRating({ value, onChange, readonly = false, size = 'w-6 h-6' }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= (hovered || value);
        return (
          <button key={star} type="button" disabled={readonly}
            onClick={() => !readonly && onChange?.(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            className={`transition-all ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          >
            <Star className={`${size} transition-all ${active ? 'fill-amber-400 text-amber-400' : 'text-[#D9CFC6]'}`} />
          </button>
        );
      })}
    </div>
  );
}

function RatingModal({ order, onClose, onDone }) {
  const [step, setStep] = useState('reception'); // reception | rating | done
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState('');

  const handleReception = (ok) => {
    if (ok) setStep('rating');
    else { setStep('problem'); }
  };

  const handleSubmit = async () => {
    if (rating === 0) { setRatingError('Choisissez une note'); return; }
    setSubmitting(true);
    setRatingError('');
    try {
      await commandesService.submitAvis(order.id, rating, comment || undefined);
      setStep('done');
      setTimeout(() => { onDone(order.id, rating); onClose(); }, 1800);
    } catch (err) {
      const msg = err?.response?.data?.message || '';
      if (msg.includes('déjà')) { setStep('done'); setTimeout(() => { onDone(order.id, rating); onClose(); }, 1200); }
      else setRatingError(msg || 'Erreur lors de l\'envoi');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: BORDER }}>
          <div>
            <p className="font-bold text-sm" style={{ color: CREAM }}>Commande #{order.numero?.replace('CMD-', '') ?? order.id?.slice(0, 6)}</p>
            <p className="text-xs" style={{ color: MUTED }}>{order.restaurantNom ?? order.restaurant?.nom}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white transition" style={{ color: MUTED }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {step === 'reception' && (
            <div className="space-y-4">
              <p className="font-semibold text-sm" style={{ color: CREAM }}>Avez-vous bien reçu cette commande ?</p>
              <div className="flex gap-3">
                <button onClick={() => handleReception(true)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-white text-sm transition bg-emerald-500 hover:bg-emerald-600">
                  <ThumbsUp className="w-4 h-4" /> Oui
                </button>
                <button onClick={() => handleReception(false)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border py-3 font-bold text-sm transition hover:bg-white text-red-500"
                  style={{ borderColor: BORDER }}>
                  <ThumbsDown className="w-4 h-4" /> Non
                </button>
              </div>
            </div>
          )}

          {step === 'problem' && (
            <div className="space-y-3 text-center">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <p className="font-semibold text-sm" style={{ color: CREAM }}>Problème signalé</p>
              <p className="text-xs" style={{ color: MUTED }}>Contactez le restaurant ou notre support pour résoudre le problème.</p>
              <button onClick={onClose} className="w-full rounded-xl py-2.5 text-sm font-semibold border transition hover:bg-white"
                style={{ borderColor: BORDER, color: MUTED }}>Fermer</button>
            </div>
          )}

          {step === 'rating' && (
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-sm" style={{ color: CREAM }}>Notez votre expérience</p>
                <p className="text-xs mt-0.5" style={{ color: MUTED }}>Votre avis aide à améliorer le service.</p>
              </div>
              <div className="space-y-2">
                <StarRating value={rating} onChange={setRating} size="w-7 h-7" />
                {rating > 0 && <p className="text-sm font-semibold" style={{ color: ACCENT }}>{RATING_LABELS[rating]}</p>}
              </div>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Commentaire optionnel…" rows={2}
                className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-1 resize-none bg-white"
                style={{ borderColor: BORDER, color: CREAM }}
              />
              {ratingError && <p className="text-xs text-red-600">{ratingError}</p>}
              <button onClick={handleSubmit} disabled={submitting || rating === 0}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-white text-sm transition disabled:opacity-60"
                style={{ background: ACCENT }}>
                {submitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send className="w-4 h-4" /> Envoyer mon avis</>}
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center space-y-3 py-2">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="font-bold text-sm" style={{ color: CREAM }}>Merci pour votre avis !</p>
              {rating > 0 && <StarRating value={rating} readonly size="w-6 h-6" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

const ACCENT = '#C05015';
const CREAM = '#0F172A';
const MUTED = '#64748B';
const GOLD = '#F97316';
const BORDER = 'rgba(89,67,42,0.10)';

const STATUS_MAP = {
  RECUE:        { label: 'Reçue',           bg: 'bg-amber-50 text-amber-700' },
  EN_ATTENTE:   { label: 'En attente',       bg: 'bg-amber-50 text-amber-700' },
  EN_VALIDATION:{ label: 'En validation',    bg: 'bg-amber-50 text-amber-700' },
  CONFIRMEE:    { label: 'Confirmée',        bg: 'bg-blue-50 text-blue-700' },
  EN_PREP:      { label: 'En préparation',   bg: 'bg-orange-50 text-orange-700' },
  PRETE:        { label: 'Prête',            bg: 'bg-green-50 text-green-700' },
  EN_LIVRAISON: { label: 'En livraison',     bg: 'bg-purple-50 text-purple-700' },
  LIVREE:       { label: 'Livrée',           bg: 'bg-stone-100 text-stone-600' },
  ANNULEE:      { label: 'Annulée',          bg: 'bg-red-50 text-red-600' },
};

const ACTIVE_STATUSES = ['RECUE', 'CONFIRMEE', 'EN_PREP', 'PRETE', 'EN_LIVRAISON'];

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? { label: status?.replaceAll('_', ' ') ?? '—', bg: 'bg-[#FDF5EF] text-stone-600' };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.bg}`}>{s.label}</span>;
}

export default function B2BOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [downloadingId, setDownloadingId] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [ratingModalOrder, setRatingModalOrder] = useState(null);
  const [ratedOrders, setRatedOrders] = useState({}); // orderId -> rating

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [b2bRes, menuRes] = await Promise.allSettled([
        b2bAPI.getOrders(),
        commandesService.getMyOrders(),
      ]);
      const b2bOrders = b2bRes.status === 'fulfilled' ? (b2bRes.value.data || []) : [];
      const menuOrders = menuRes.status === 'fulfilled' ? (menuRes.value.data || []).map(o => ({ ...o, _source: 'menu' })) : [];
      const merged = [...b2bOrders, ...menuOrders].sort(
        (a, b) => new Date(b.createdAt ?? b.dateLivraison ?? 0).getTime() - new Date(a.createdAt ?? a.dateLivraison ?? 0).getTime()
      );
      setOrders(merged);
      setLastUpdated(new Date());
      setError('');
    } catch {
      setError('Impossible de charger les commandes');
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // WebSocket — listen for order status updates (both regular and B2B events)
  useEffect(() => {
    if (!user) return;
    const socket = createCommandesSocket(user);

    socket.on('commande.statut',       () => { void load(true); });
    socket.on('commande.creee',        () => { void load(true); });
    socket.on('commande.nouvelle',     () => { void load(true); });
    socket.on('commande.paiement',     () => { void load(true); });
    socket.on('commande.b2b.nouvelle', () => { void load(true); });
    socket.on('commande.b2b.statut',   () => { void load(true); });

    return () => socket.disconnect();
  }, [user, load]);

  const handleDownloadReceipt = async (order) => {
    setDownloadingId(order.id);
    try {
      const res = await commandesService.getReceiptPdf(order.id);
      downloadBlob(new Blob([res.data], { type: 'application/pdf' }), `recu-${order.numero ?? order.id?.slice(0, 8)}.pdf`);
    } catch {
      setError('Le reçu PDF est indisponible pour cette commande.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setDownloadingId('');
    }
  };

  const handleRatingDone = (orderId, note) => {
    setRatedOrders(prev => ({ ...prev, [orderId]: note }));
  };

  const filtered = filter === 'all'
    ? orders
    : filter === 'active'
      ? orders.filter(o => ACTIVE_STATUSES.includes(o.status ?? o.statut))
      : orders.filter(o => (o.status ?? o.statut) === 'LIVREE');

  return (
    <>
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 bg-[#FDF5EF]">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: GOLD }}>
              Commandes Entreprise
            </p>
            <h1 className="mt-1 text-2xl font-bold" style={{ color: CREAM }}>Historique & suivi</h1>
            <p className="mt-1 text-sm flex items-center gap-2" style={{ color: MUTED }}>
              {orders.length} commande(s) au total
              {lastUpdated && (
                <span className="text-xs opacity-60">
                  · mis à jour {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium border transition"
              style={{ borderColor: BORDER, color: MUTED }}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Rafraîchir
            </button>
            <button
              onClick={() => navigate('/b2b/bulk-order')}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition"
              style={{ background: ACCENT }}
            >
              <Plus className="h-4 w-4" /> Nouvelle commande
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 border-b" style={{ borderColor: BORDER }}>
          {[
            { id: 'all',    label: 'Toutes',    count: orders.length },
            { id: 'active', label: 'En cours',  count: orders.filter(o => ACTIVE_STATUSES.includes(o.status ?? o.statut)).length },
            { id: 'done',   label: 'Livrées',   count: orders.filter(o => (o.status ?? o.statut) === 'LIVREE').length },
          ].map(({ id, label, count }) => (
            <button
              key={id} onClick={() => setFilter(id)}
              className="px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-1.5"
              style={{
                borderBottomColor: filter === id ? ACCENT : 'transparent',
                color: filter === id ? ACCENT : MUTED,
              }}
            >
              {label}
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={{ background: filter === id ? ACCENT : '#F0EBE3', color: filter === id ? 'white' : MUTED }}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border bg-white p-10 text-center" style={{ borderColor: BORDER }}>
            <Package className="mx-auto h-10 w-10 mb-3" style={{ color: GOLD, opacity: 0.4 }} />
            <p className="font-semibold mb-1" style={{ color: CREAM }}>Aucune commande</p>
            <p className="text-sm mb-4" style={{ color: MUTED }}>
              {filter === 'active' ? 'Aucune commande en cours.' : filter === 'done' ? 'Aucune commande livrée.' : 'Vous n\'avez pas encore passé de commande.'}
            </p>
            <button
              onClick={() => navigate('/b2b/bulk-order')}
              className="inline-flex items-center gap-1.5 text-sm font-medium"
              style={{ color: ACCENT }}
            >
              Passer une commande <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => {
              const status = order.status ?? order.statut ?? '';
              const total = order.total ?? order.totalEstime ?? order.amount ?? order.montantTotal ?? 0;
              const isGrouped = order.type === 'GROUPEE' || order.numero?.startsWith('GRP-');
              const isActive = ACTIVE_STATUSES.includes(status);
              const isDelivered = status === 'LIVREE';
              const isCancelled = status === 'ANNULEE';
              // Regular commande (has montantTotal, not B2B-specific)
              const isRegularCommande = !!order.montantTotal || !!order.lignes;

              return (
                <div key={order.id} className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: BORDER }}>
                  {/* Active indicator strip */}
                  {isActive && (
                    <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${ACCENT}, #FF8A65)` }} />
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                          style={{ background: '#FDF5EF' }}
                        >
                          {isDelivered ? <CheckCircle className="h-5 w-5 text-green-500" />
                            : isCancelled ? <AlertCircle className="h-5 w-5 text-red-400" />
                            : isActive ? (
                              <div className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} />
                            ) : <Clock className="h-5 w-5" style={{ color: GOLD }} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm" style={{ color: CREAM }}>
                              {order.numero ? `#${order.numero}` : `Commande ${order.id?.slice(0, 8)}`}
                            </span>
                            <StatusBadge status={status} />
                            {isGrouped && (
                              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-white" style={{ color: GOLD }}>
                                Groupée
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs" style={{ color: MUTED }}>
                            {order.restaurantNom ?? order.restaurant?.nom ?? ''}
                            {(order.dateLivraison || order.createdAt) && (
                              <span>
                                {' '}· {new Date(order.dateLivraison ?? order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                {order.heureLivraison ? ` à ${order.heureLivraison}` : ''}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold" style={{ color: CREAM }}>{formatFCFA(total)}</p>
                        {(order.nbLignes ?? order.lignes?.length) != null && (
                          <p className="text-xs" style={{ color: MUTED }}>
                            {order.nbLignes ?? order.lignes?.length} article(s)
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Items preview */}
                    {(order.items?.length > 0 || order.lignes?.length > 0) && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(order.items ?? order.lignes ?? []).slice(0, 4).map((item, i) => (
                          <span
                            key={i}
                            className="rounded-lg px-2.5 py-1 text-xs"
                            style={{ background: '#FDF5EF', color: MUTED }}
                          >
                            {item.quantite ?? item.quantity}× {item.nom ?? item.article?.nom ?? item.articleId}
                          </span>
                        ))}
                        {(order.items?.length ?? order.lignes?.length ?? 0) > 4 && (
                          <span className="text-xs" style={{ color: GOLD }}>
                            +{(order.items?.length ?? order.lignes?.length) - 4} autres
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-3 flex items-center justify-end gap-2 border-t pt-3" style={{ borderColor: BORDER }}>
                      {isDelivered && isRegularCommande && order.estPaye && (
                        <button
                          onClick={() => handleDownloadReceipt(order)}
                          disabled={downloadingId === order.id}
                          className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition hover:bg-white disabled:opacity-50"
                          style={{ borderColor: BORDER, color: MUTED }}
                        >
                          <Download className="h-3.5 w-3.5" />
                          {downloadingId === order.id ? 'Téléchargement…' : 'Reçu PDF'}
                        </button>
                      )}

                      {/* Reception + rating for delivered regular orders */}
                      {isDelivered && isRegularCommande && (
                        ratedOrders[order.id] ? (
                          <div className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-medium" style={{ color: MUTED }}>
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {ratedOrders[order.id]}/5 — Noté
                          </div>
                        ) : (
                          <button
                            onClick={() => setRatingModalOrder(order)}
                            className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition hover:bg-[#FBE8DC]"
                            style={{ borderColor: 'rgba(224,78,26,0.2)', color: ACCENT }}
                          >
                            <Star className="h-3.5 w-3.5" /> Confirmer réception
                          </button>
                        )
                      )}

                      {/* Track button for active regular orders */}
                      {isRegularCommande && !isCancelled && !isDelivered && (
                        <button
                          onClick={() => navigate(`/suivi/${order.id}`)}
                          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition"
                          style={{ background: ACCENT }}
                        >
                          Suivre <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {isDelivered && isRegularCommande && !ratedOrders[order.id] && (
                        <button
                          onClick={() => navigate(`/suivi/${order.id}`)}
                          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition"
                          style={{ background: ACCENT }}
                        >
                          Voir <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {/* For B2B-specific orders (bulk/grouped), show status detail */}
                      {!isRegularCommande && isActive && (
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: ACCENT }}>
                          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: ACCENT }} />
                          En cours de traitement
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>

    {ratingModalOrder && (
      <RatingModal
        order={ratingModalOrder}
        onClose={() => setRatingModalOrder(null)}
        onDone={handleRatingDone}
      />
    )}
    </>
  );
}
