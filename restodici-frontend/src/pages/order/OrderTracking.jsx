import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, Clock, MapPin, Package,
  ChevronRight, Truck, UtensilsCrossed, XCircle, AlertTriangle,
  Star, ThumbsUp, ThumbsDown, Send,
} from 'lucide-react';
import {
  commandesService,
  createCommandesSocket,
} from '../../services/commandes.service';
import { formatFCFA } from '../../utils/formatters';
import { getClientOrdersPath } from '../../utils/order-ux';

const safeFormatDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return d; }
};

const MODE_ICONS = {
  SUR_PLACE: UtensilsCrossed,
  EMPORTER: Package,
  LIVRAISON: Truck,
};
const MODE_LABELS = {
  SUR_PLACE: 'Sur place',
  EMPORTER: 'À emporter',
  LIVRAISON: 'Livraison',
};

const STEPS = [
  { key: 'RECUE',        label: 'Commande reçue',   icon: CheckCircle, color: '#64748B' },
  { key: 'CONFIRMEE',    label: 'Confirmée',         icon: CheckCircle, color: '#FF8C00' },
  { key: 'EN_PREP',      label: 'En préparation',    icon: Clock,       color: '#FF8C00' },
  { key: 'PRETE',        label: 'Prête',             icon: Package,     color: '#2ECC71' },
  { key: 'EN_LIVRAISON', label: 'En livraison',      icon: Truck,       color: '#0066CC' },
  { key: 'LIVREE',       label: 'Livrée',            icon: MapPin,      color: '#2ECC71' },
];
const STATUS_ORDER = STEPS.map((s) => s.key);

const RATING_LABELS = ['', 'Très mauvais', 'Mauvais', 'Correct', 'Bon', 'Excellent'];

function StarRating({ value, onChange, readonly = false }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1.5 items-center">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onChange?.(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            className={`transition-all ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          >
            <Star
              className={`w-7 h-7 transition-all ${active ? 'fill-amber-400 text-amber-400' : 'text-[#D9CFC6]'}`}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function OrderTrackingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [justUpdated, setJustUpdated] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [refundInfo, setRefundInfo] = useState(null);

  // Delivery confirmation state
  const [receptionStatus, setReceptionStatus] = useState(null); // null | 'OUI' | 'NON'
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const [ratingError, setRatingError] = useState('');
  const [existingAvis, setExistingAvis] = useState(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    let poll;

    const isMock = id.startsWith('mock-');

    const fetchOrder = async () => {
      if (isMock) {
        const mockData = localStorage.getItem('restodici_mock_' + id);
        if (mockData && active) { setOrder(JSON.parse(mockData)); setLoading(false); }
        return;
      }
      try {
        const res = await commandesService.findOne(id);
        if (!active) return;
        setOrder(res.data);
        setLoading(false);
        if (['LIVREE', 'ANNULEE'].includes(res.data.statut)) clearInterval(poll);
      } catch (err) {
        if (!active) return;
        setError(err.response?.data?.message || 'Impossible de charger le suivi');
        setLoading(false);
      }
    };

    const fetchAvis = async () => {
      if (isMock) return;
      try {
        const res = await commandesService.getAvisForOrder(id);
        if (!active) return;
        if (res.data) {
          setExistingAvis(res.data);
          setRatingDone(true);
          setReceptionStatus('OUI');
        }
      } catch { /* not rated yet */ }
    };

    const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUser = cachedUser?.user || cachedUser;
    const socket = isMock ? null : createCommandesSocket(currentUser);

    if (socket) {
      socket.on('commande.statut', (payload) => {
        if (payload?.id === id) {
          setJustUpdated(true);
          void fetchOrder();
          setTimeout(() => setJustUpdated(false), 2000);
        }
      });
      socket.on('commande.paiement', (payload) => {
        if (payload?.id === id) void fetchOrder();
      });
    }

    fetchOrder();
    void fetchAvis();
    if (!isMock) poll = setInterval(fetchOrder, 5000);

    return () => {
      active = false;
      clearInterval(poll);
      socket?.disconnect();
    };
  }, [id]);

  const handleCancel = async () => {
    if (!window.confirm('Confirmer l\'annulation de cette commande ?')) return;
    setCancelling(true);
    try {
      const wasP = order.estPaye;
      const amount = order.montantTotal;
      const mode = order.modePaiement;
      await commandesService.annuler(id);
      setOrder((prev) => ({ ...prev, statut: 'ANNULEE' }));
      if (wasP) setRefundInfo({ amount, mode });
    } catch (err) {
      alert(err?.response?.data?.message || 'Impossible d\'annuler la commande.');
    } finally {
      setCancelling(false);
    }
  };

  const handleReception = (status) => {
    setReceptionStatus(status);
    if (status === 'OUI') setShowRating(true);
  };

  const handleSubmitRating = async () => {
    if (rating === 0) { setRatingError('Choisissez une note'); return; }
    setRatingSubmitting(true);
    setRatingError('');
    try {
      if (!id.startsWith('mock-')) {
        await commandesService.submitAvis(id, rating, ratingComment || undefined);
      }
      setRatingDone(true);
      setShowRating(false);
    } catch (err) {
      const msg = err?.response?.data?.message || '';
      if (msg.includes('déjà')) {
        setRatingDone(true);
        setShowRating(false);
      } else {
        setRatingError(msg || 'Erreur lors de l\'envoi');
      }
    } finally {
      setRatingSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-[#FF8C00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center border border-[rgba(89,67,42,0.10)] shadow">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <p className="font-bold text-[#0F172A] mb-2">Commande introuvable</p>
          <p className="text-sm text-[#64748B] mb-6">{error || 'Aucune commande trouvée.'}</p>
          <button onClick={() => navigate('/menu')} className="w-full bg-[#FF8C00] hover:bg-[#E07A00] text-white font-bold py-3 px-6 rounded-xl transition">
            Retour au menu
          </button>
        </div>
      </div>
    );
  }

  const isCancelled = order.statut === 'ANNULEE';
  const isDelivered = order.statut === 'LIVREE';
  const currentIdx = STATUS_ORDER.indexOf(order.statut);
  const ModeIcon = MODE_ICONS[order.modeLivraison] || Package;
  const isPaid = order.estPaye;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[rgba(89,67,42,0.10)] shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white text-[#64748B] transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-[#0F172A] text-sm leading-tight">Suivi de commande</h1>
            <p className="text-xs text-[#64748B]">#{order.numero}</p>
          </div>
          <div className="flex items-center gap-2">
            {isPaid && (
              <span className="text-xs bg-emerald-50 text-emerald-700 font-medium px-2.5 py-1 rounded-full">Payée</span>
            )}
            {justUpdated && (
              <span className="text-xs text-emerald-600 font-medium animate-pulse">Mis à jour</span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Status hero */}
        {isCancelled ? (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="font-bold text-red-700">Commande annulée</p>
                <p className="text-xs text-red-500 mt-0.5">Cette commande a été annulée.</p>
              </div>
            </div>
            {(refundInfo || order.estPaye) && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <p className="text-sm font-bold text-blue-700 mb-1">💳 Remboursement en cours</p>
                <p className="text-xs text-blue-600">
                  {refundInfo?.amount || order.montantTotal
                    ? `${formatFCFA(refundInfo?.amount || order.montantTotal)} `
                    : ''}
                  seront recrédités sur votre{' '}
                  {(refundInfo?.mode || order.modePaiement || '').replace('_', ' ').toLowerCase() || 'moyen de paiement'}{' '}
                  sous <span className="font-bold">24 à 48h</span>.
                </p>
              </div>
            )}
          </div>
        ) : isDelivered ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="font-bold text-emerald-700">Commande livrée !</p>
              <p className="text-xs text-emerald-600 mt-0.5">Nous espérons que tout vous a satisfait.</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[rgba(89,67,42,0.10)] p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0">
              <div className="w-5 h-5 border-2 border-[#FF8C00] border-t-transparent rounded-full animate-spin" />
            </div>
            <div>
              <p className="font-bold text-[#0F172A]">
                {STEPS.find((s) => s.key === order.statut)?.label || order.statut}
              </p>
              <p className="text-xs text-[#64748B] animate-pulse mt-0.5">Mise à jour en temps réel…</p>
            </div>
          </div>
        )}

        {/* Cancel button — before preparation */}
        {['RECUE', 'CONFIRMEE'].includes(order.statut) && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-red-700">Annuler la commande</p>
              <p className="text-xs text-red-500 mt-0.5">Possible avant le début de la préparation</p>
            </div>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition disabled:opacity-60 shrink-0"
            >
              {cancelling ? 'Annulation…' : 'Annuler'}
            </button>
          </div>
        )}

        {/* Progress steps */}
        {!isCancelled && (
          <div className="bg-white rounded-2xl border border-[rgba(89,67,42,0.10)] p-5">
            <h2 className="font-bold text-[#0F172A] text-sm mb-5">Progression</h2>
            <div className="space-y-0">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const done = idx < currentIdx;
                const current = idx === currentIdx;
                const isLast = idx === STEPS.length - 1;
                return (
                  <div key={step.key} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${done || current ? 'text-white shadow-sm' : 'bg-[#F5F0E8] text-[#64748B]/40'}`}
                        style={done || current ? { background: step.color, transform: current ? 'scale(1.1)' : 'scale(1)' } : {}}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      {!isLast && (
                        <div className="w-0.5 my-1 flex-1 min-h-[20px] transition-all" style={{ background: done ? '#FF8C00' : '#E5E0D8' }} />
                      )}
                    </div>
                    <div className={`pb-5 ${isLast ? 'pb-0' : ''} flex items-start pt-1.5`}>
                      <div>
                        <p className={`text-sm font-semibold ${current ? 'text-[#FF8C00]' : done ? 'text-[#0F172A]' : 'text-[#64748B]/40'}`}>
                          {step.label}
                        </p>
                        {current && (
                          <p className="text-xs text-[#64748B] mt-0.5 animate-pulse">En cours…</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order details */}
        <div className="bg-white rounded-2xl border border-[rgba(89,67,42,0.10)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[rgba(89,67,42,0.08)] flex items-center gap-2">
            <ModeIcon className="w-4 h-4 text-[#64748B]" />
            <span className="text-sm font-semibold text-[#0F172A]">{MODE_LABELS[order.modeLivraison] || order.modeLivraison}</span>
            {order.adresseLivraison && <span className="text-xs text-[#64748B] ml-1">· {order.adresseLivraison}</span>}
            <span className="ml-auto text-xs text-[#64748B]">{safeFormatDate(order.createdAt)}</span>
          </div>

          <div className="px-5 py-4 space-y-2.5">
            {order.lignes?.map((ligne, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-[#0F172A]">
                  <span className="font-semibold">{ligne.quantite}×</span> {ligne.article?.nom || 'Article'}
                  {ligne.instructions && <span className="block text-xs text-[#64748B] italic ml-4">· {ligne.instructions}</span>}
                </span>
                <span className="text-[#64748B] font-medium ml-4 shrink-0">
                  {formatFCFA(Number(ligne.prixUnitaire ?? 0) * (ligne.quantite ?? 1))}
                </span>
              </div>
            ))}
          </div>

          <div className="mx-5 border-t border-[rgba(89,67,42,0.08)]" />
          <div className="px-5 py-4 flex justify-between items-center">
            <div>
              <span className="font-bold text-[#0F172A]">Total</span>
              {isPaid && <span className="ml-2 text-xs text-emerald-600 font-medium">· {order.modePaiement?.replace(/_/g, ' ')}</span>}
            </div>
            <span className="text-lg font-extrabold text-[#FF8C00]">{formatFCFA(order.montantTotal)} FCFA</span>
          </div>

          {order.restaurant && (
            <div className="mx-5 mb-4 rounded-xl bg-white px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#FF8C00]/10 flex items-center justify-center">
                <UtensilsCrossed className="w-4 h-4 text-[#FF8C00]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#0F172A]">{order.restaurant.nom}</p>
                {order.restaurant.telephone && <p className="text-xs text-[#64748B]">{order.restaurant.telephone}</p>}
              </div>
              {order.restaurant.noteMoyenne > 0 && (
                <div className="flex items-center gap-1 shrink-0">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-semibold text-[#0F172A]">{Number(order.restaurant.noteMoyenne).toFixed(1)}</span>
                  <span className="text-xs text-[#64748B]">({order.restaurant.nbAvis})</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Delivery confirmation + rating (LIVREE only) ── */}
        {isDelivered && (
          <div className="bg-white rounded-2xl border border-[rgba(89,67,42,0.10)] p-5 space-y-4">

            {/* Reception confirmation */}
            {receptionStatus === null && (
              <>
                <div>
                  <p className="font-bold text-[#0F172A] text-sm">Avez-vous bien reçu votre commande ?</p>
                  <p className="text-xs text-[#64748B] mt-0.5">Votre retour aide le restaurant à s'améliorer.</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleReception('OUI')}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-3 font-bold text-white text-sm transition"
                  >
                    <ThumbsUp className="w-4 h-4" /> Oui, reçue
                  </button>
                  <button
                    onClick={() => handleReception('NON')}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[rgba(89,67,42,0.12)] bg-white hover:bg-white px-4 py-3 font-bold text-red-500 text-sm transition"
                  >
                    <ThumbsDown className="w-4 h-4" /> Non, problème
                  </button>
                </div>
              </>
            )}

            {/* Problem report */}
            {receptionStatus === 'NON' && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                <p className="text-sm font-semibold text-red-700">Problème signalé</p>
                <p className="text-xs text-red-500 mt-1">Contactez le restaurant au <span className="font-semibold">{order.restaurant?.telephone || '…'}</span> ou notre support.</p>
                <button onClick={() => setReceptionStatus(null)} className="mt-2 text-xs text-red-600 underline">← Revenir</button>
              </div>
            )}

            {/* Star rating modal */}
            {receptionStatus === 'OUI' && !ratingDone && showRating && (
              <div className="space-y-4">
                <div className="h-px bg-[rgba(89,67,42,0.08)]" />
                <div>
                  <p className="font-bold text-[#0F172A] text-sm">Notez votre expérience</p>
                  <p className="text-xs text-[#64748B] mt-0.5">Votre avis aide les autres clients et le restaurant.</p>
                </div>
                <div className="space-y-3">
                  <StarRating value={rating} onChange={setRating} />
                  {rating > 0 && (
                    <p className="text-sm font-semibold text-[#FF8C00]">{RATING_LABELS[rating]}</p>
                  )}
                  <textarea
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="Commentaire optionnel…"
                    rows={2}
                    className="w-full rounded-xl border border-[rgba(89,67,42,0.12)] bg-white px-4 py-2.5 text-sm text-[#0F172A] placeholder-[#64748B]/50 outline-none focus:ring-1 focus:ring-[#FF8C00]/30 resize-none"
                  />
                  {ratingError && <p className="text-xs text-red-600">{ratingError}</p>}
                  <button
                    onClick={handleSubmitRating}
                    disabled={ratingSubmitting || rating === 0}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF8C00] hover:bg-[#E07A00] px-4 py-3 font-bold text-white text-sm transition disabled:opacity-60"
                  >
                    {ratingSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <><Send className="w-4 h-4" /> Envoyer mon avis</>
                    )}
                  </button>
                  <button onClick={() => setShowRating(false)} className="w-full text-xs text-[#64748B] py-1 hover:text-[#0F172A] transition">
                    Plus tard
                  </button>
                </div>
              </div>
            )}

            {/* Rating confirmed */}
            {receptionStatus === 'OUI' && ratingDone && (
              <div className="rounded-xl bg-[#FFF0DF] border border-[rgba(224,78,26,0.1)] px-4 py-4 text-center">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="font-semibold text-[#0F172A] text-sm">Merci pour votre avis !</p>
                {existingAvis && (
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <StarRating value={existingAvis.note} readonly />
                    <span className="text-xs text-[#64748B] ml-1">{RATING_LABELS[existingAvis.note]}</span>
                  </div>
                )}
                {!existingAvis && rating > 0 && (
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <StarRating value={rating} readonly />
                    <span className="text-xs text-[#64748B] ml-1">{RATING_LABELS[rating]}</span>
                  </div>
                )}
              </div>
            )}

            {/* Show rate button if confirmed but not yet rated */}
            {receptionStatus === 'OUI' && !ratingDone && !showRating && (
              <button
                onClick={() => setShowRating(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[rgba(89,67,42,0.12)] bg-white hover:bg-white px-4 py-3 font-semibold text-[#0F172A] text-sm transition"
              >
                <Star className="w-4 h-4 text-amber-400" /> Noter le restaurant
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-6">
          <button
            onClick={() => navigate('/menu')}
            className="flex-1 bg-white border border-[rgba(89,67,42,0.12)] text-[#0F172A] font-semibold py-3.5 rounded-xl hover:bg-white transition text-sm"
          >
            Commander autre chose
          </button>
          <button
            onClick={() => navigate(getClientOrdersPath())}
            className="flex-1 bg-[#FF8C00] hover:bg-[#E07A00] text-white font-bold py-3.5 rounded-xl shadow-sm transition text-sm flex items-center justify-center gap-1.5"
          >
            Mes commandes <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
}
