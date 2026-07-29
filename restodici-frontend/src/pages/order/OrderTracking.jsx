import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, Clock, MapPin, Package,
  ChevronRight, Truck, UtensilsCrossed, XCircle, AlertTriangle,
  Star, ThumbsUp, ThumbsDown, Send, Check
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
  { key: 'RECUE',        label: 'Commande reçue',   icon: CheckCircle,  color: '#8B6E50', activeColor: 'text-orange-500' },
  { key: 'CONFIRMEE',    label: 'Confirmée',         icon: CheckCircle,  color: '#EA580C', activeColor: 'text-orange-500' },
  { key: 'EN_PREP',      label: 'En préparation',    icon: Clock,        color: '#EA580C', activeColor: 'text-orange-500' },
  { key: 'PRETE',        label: 'Prête',             icon: Package,      color: '#2ECC71', activeColor: 'text-emerald-500' },
  { key: 'EN_LIVRAISON', label: 'En livraison',      icon: Truck,        color: '#0066CC', activeColor: 'text-blue-500' },
  { key: 'LIVREE',       label: 'Livrée',            icon: MapPin,       color: '#2ECC71', activeColor: 'text-emerald-500' },
];
const STATUS_ORDER = STEPS.map((s) => s.key);

const RATING_LABELS = ['', 'Très mauvais', 'Mauvais', 'Correct', 'Bon', 'Excellent'];

function StarRating({ value, onChange, readonly = false }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-2 items-center justify-center py-2">
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
            className={`transition-all duration-300 ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-125'}`}
          >
            <Star
              className={`w-9 h-9 transition-colors duration-300 ${active ? 'fill-amber-400 text-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.4)]' : 'text-gray-200 fill-transparent hover:text-gray-300'}`}
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
  const [paymentFailed, setPaymentFailed] = useState(false);

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
          setTimeout(() => setJustUpdated(false), 3000);
        }
      });
      socket.on('commande.paiement', (payload) => {
        if (payload?.id === id) { setPaymentFailed(false); void fetchOrder(); }
      });
      socket.on('commande.paiement.echec', (payload) => {
        if (payload?.id === id) setPaymentFailed(true);
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
      <div className="min-h-screen bg-gradient-to-br from-[#FFF4ED] to-[#FFEBE0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin shadow-lg" />
          <p className="text-orange-900/60 font-medium animate-pulse">Chargement du suivi...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF4ED] to-[#FFEBE0] flex flex-col items-center justify-center p-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 max-w-sm w-full text-center border border-white shadow-xl">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 mb-2">Commande introuvable</p>
          <p className="text-sm text-gray-500 mb-8">{error || 'Aucune commande trouvée.'}</p>
          <button onClick={() => navigate('/menu')} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-95">
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
  const CurrentStepIcon = STEPS.find((s) => s.key === order.statut)?.icon || Package;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF4ED] to-[#FFEBE0] font-sans pb-12 selection:bg-orange-200 selection:text-orange-900">
      {/* Payment failure banner */}
      {paymentFailed && !isPaid && (
        <div className="bg-red-500 text-white px-4 py-3 flex items-center gap-3 shadow-md animate-in slide-in-from-top-4">
          <XCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium flex-1">Paiement refusé ou expiré. Veuillez réessayer depuis votre panier.</p>
          <button onClick={() => setPaymentFailed(false)} className="shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-orange-900/5 shadow-sm transition-all duration-300">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white hover:bg-orange-50 text-gray-700 hover:text-orange-600 transition-all shadow-sm border border-orange-900/5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900 text-lg leading-tight">Suivi de commande</h1>
            <p className="text-xs text-gray-500 font-medium">#{order.numero}</p>
          </div>
          <div className="flex items-center gap-3">
            {isPaid && (
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl border border-emerald-100 shadow-sm">
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="text-xs font-bold uppercase tracking-wider">Payée</span>
              </div>
            )}
            {justUpdated && (
              <span className="text-xs font-bold text-orange-500 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100 shadow-sm animate-pulse">
                Mise à jour !
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Status hero */}
        {isCancelled ? (
          <div className="space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-[2rem] p-6 sm:p-8 text-white shadow-xl shadow-red-500/20 relative overflow-hidden flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute bottom-0 right-1/4 -mb-10 w-32 h-32 bg-rose-400 opacity-20 rounded-full blur-xl pointer-events-none"></div>
              
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 backdrop-blur-md border border-white/30 shadow-inner">
                <XCircle className="w-8 h-8 text-white" />
              </div>
              <div className="z-10 relative">
                <p className="text-xs sm:text-sm uppercase tracking-widest font-bold opacity-80 mb-1">Statut</p>
                <p className="font-extrabold text-2xl sm:text-3xl tracking-tight">Commande annulée</p>
                <p className="text-sm opacity-90 mt-1.5 text-white/90">Cette commande a été interrompue.</p>
              </div>
            </div>
            
            {(refundInfo || order.estPaye) && (
              <div className="bg-white rounded-3xl border border-blue-100 p-6 shadow-lg shadow-blue-500/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className="flex gap-4 relative z-10">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100">
                    <span className="text-2xl">💳</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">Remboursement en cours</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {refundInfo?.amount || order.montantTotal
                        ? <span className="font-bold text-gray-900">{formatFCFA(refundInfo?.amount || order.montantTotal)} </span>
                        : ''}
                      seront recrédités sur votre{' '}
                      <span className="font-medium text-gray-800">{(refundInfo?.mode || order.modePaiement || '').replace('_', ' ').toLowerCase() || 'moyen de paiement'}</span>{' '}
                      sous <span className="font-bold text-blue-600">24 à 48h</span>.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : isDelivered ? (
          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-[2rem] p-6 sm:p-8 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 animate-in fade-in zoom-in duration-500">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-[1.5rem] flex items-center justify-center shrink-0 backdrop-blur-md border border-white/30 shadow-inner relative">
              <div className="absolute inset-0 bg-white/10 rounded-[1.5rem] animate-ping opacity-20"></div>
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white drop-shadow-md" />
            </div>
            <div className="z-10 relative">
              <p className="text-xs sm:text-sm uppercase tracking-widest font-bold opacity-80 mb-1">Statut</p>
              <p className="font-extrabold text-2xl sm:text-3xl tracking-tight drop-shadow-sm">Commande livrée !</p>
              <p className="text-sm sm:text-base opacity-90 mt-1.5 text-emerald-50">Nous espérons que vous vous régalerez.</p>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 rounded-[2rem] p-6 sm:p-8 text-white shadow-2xl shadow-orange-500/20 relative overflow-hidden flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 animate-in fade-in duration-500 transition-all">
             <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
             <div className="absolute bottom-0 right-1/4 -mb-10 w-40 h-40 bg-amber-400 opacity-20 rounded-full blur-2xl pointer-events-none"></div>
             
             <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-[1.5rem] flex items-center justify-center shrink-0 backdrop-blur-md border border-white/30 shadow-inner relative group">
               <div className="absolute inset-0 border-[3px] border-white/20 border-t-white rounded-[1.5rem] animate-spin opacity-80" />
               <CurrentStepIcon className="w-7 h-7 sm:w-9 sm:h-9 text-white drop-shadow-md animate-pulse" />
             </div>
             
             <div className="z-10 relative">
               <p className="text-xs sm:text-sm uppercase tracking-widest font-bold text-orange-100 mb-1">Statut en direct</p>
               <p className="font-extrabold text-2xl sm:text-3xl tracking-tight drop-shadow-sm">
                 {STEPS.find((s) => s.key === order.statut)?.label || order.statut}
               </p>
               <p className="text-sm sm:text-base text-orange-50 mt-1.5 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                 Mise à jour en temps réel…
               </p>
             </div>
          </div>
        )}

        {/* Cancel button — before preparation */}
        {['RECUE', 'CONFIRMEE'].includes(order.statut) && (
          <div className="bg-white rounded-3xl border border-red-100 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0 text-red-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Vous avez changé d'avis ?</p>
                <p className="text-xs text-gray-500 mt-1">Annulation possible avant le début de la préparation.</p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="px-5 py-2.5 rounded-xl bg-red-50 hover:bg-red-500 text-red-600 hover:text-white text-sm font-bold transition-all disabled:opacity-50 disabled:hover:bg-red-50 disabled:hover:text-red-600 shrink-0 w-full sm:w-auto text-center"
            >
              {cancelling ? 'Annulation…' : 'Annuler la commande'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Progress steps */}
          {!isCancelled && (
            <div className="md:col-span-5 lg:col-span-4 bg-white rounded-[2rem] border border-orange-900/5 p-6 sm:p-8 shadow-sm flex flex-col">
              <h2 className="font-extrabold text-gray-900 text-lg mb-8 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                  <Clock className="w-4 h-4" />
                </div>
                Progression
              </h2>
              
              <div className="relative flex-1 pl-4">
                {/* Continuous progress line background */}
                <div className="absolute left-[1.95rem] top-6 bottom-8 w-0.5 bg-gray-100 rounded-full"></div>
                
                {/* Active progress line fill */}
                <div 
                  className="absolute left-[1.95rem] top-6 w-0.5 bg-gradient-to-b from-orange-400 to-amber-500 rounded-full transition-all duration-700 ease-out"
                  style={{ 
                    height: currentIdx <= 0 ? '0%' : 
                           currentIdx >= STEPS.length - 1 ? 'calc(100% - 2rem)' : 
                           `${(currentIdx / (STEPS.length - 1)) * 100}%` 
                  }}
                ></div>

                <div className="space-y-8 relative">
                  {STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    const isDone = idx < currentIdx;
                    const isCurrent = idx === currentIdx;
                    
                    return (
                      <div key={step.key} className="flex gap-5 relative group">
                        <div className="flex flex-col items-center relative z-10">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 
                              ${isDone ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 
                                isCurrent ? 'bg-white text-orange-500 shadow-xl shadow-orange-500/20 border-2 border-orange-500 scale-110' : 
                                'bg-gray-50 text-gray-400 border border-gray-100'}`}
                          >
                            <Icon className={`w-5 h-5 ${isCurrent ? 'animate-pulse' : ''}`} />
                            {isDone && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col justify-center pt-1">
                          <p className={`text-base font-bold transition-colors duration-300
                            ${isCurrent ? 'text-orange-600' : isDone ? 'text-gray-900' : 'text-gray-400'}`}>
                            {step.label}
                          </p>
                          {isCurrent && (
                            <p className="text-xs font-medium text-orange-500 mt-1 animate-pulse">En cours...</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Right Column: Order Details & Actions */}
          <div className={`${isCancelled ? 'md:col-span-12' : 'md:col-span-7 lg:col-span-8'} space-y-6`}>
            
            {/* Order details / Receipt style */}
            <div className="bg-white rounded-[2rem] border border-orange-900/5 shadow-sm overflow-hidden relative">
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-extrabold text-gray-900 text-lg flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    Détails
                  </h2>
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                    <ModeIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">{MODE_LABELS[order.modeLivraison] || order.modeLivraison}</span>
                  </div>
                </div>

                {order.restaurant && (
                  <div className="mb-6 p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-4 transition-colors hover:bg-orange-50/50">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center border border-gray-100 shrink-0">
                      <UtensilsCrossed className="w-6 h-6 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{order.restaurant.nom}</p>
                      {order.restaurant.telephone && <p className="text-xs text-gray-500 font-medium mt-0.5">{order.restaurant.telephone}</p>}
                    </div>
                  </div>
                )}

                {/* Items List */}
                <div className="space-y-4 mb-6">
                  {order.lignes?.map((ligne, idx) => (
                    <div key={idx} className="flex justify-between items-start group">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-gray-700">{ligne.quantite}x</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{ligne.article?.nom || 'Article'}</p>
                          {ligne.instructions && (
                            <p className="text-xs text-gray-500 mt-1 italic flex items-start gap-1">
                              <span className="text-orange-400 mt-0.5">↳</span> {ligne.instructions}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-900 whitespace-nowrap ml-4">
                        {formatFCFA(Number(ligne.prixUnitaire ?? 0) * (ligne.quantite ?? 1))}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Dashed separator */}
                <div className="w-full border-t-2 border-dashed border-gray-200 my-6 relative">
                  <div className="absolute -left-8 -top-3 w-6 h-6 bg-gradient-to-br from-[#FFF4ED] to-[#FFEBE0] rounded-full border-r border-gray-100 shadow-inner"></div>
                  <div className="absolute -right-8 -top-3 w-6 h-6 bg-gradient-to-br from-[#FFF4ED] to-[#FFEBE0] rounded-full border-l border-gray-100 shadow-inner"></div>
                </div>

                {/* Totals */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Sous-total</span>
                    <span className="font-bold text-gray-900">{formatFCFA(order.montantTotal)}</span>
                  </div>
                  {/* Assuming delivery fee is included in total or add logic here if exists */}
                  <div className="flex justify-between items-end pt-3">
                    <div>
                      <span className="block text-lg font-extrabold text-gray-900">Total payé</span>
                      {isPaid && (
                        <span className="inline-block mt-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 uppercase tracking-wider">
                          {order.modePaiement?.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    <span className="text-2xl font-black text-orange-600">{formatFCFA(order.montantTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Delivery confirmation + rating (LIVREE only) ── */}
            {isDelivered && (
              <div className="bg-white rounded-[2rem] border border-orange-900/5 p-6 sm:p-8 shadow-sm space-y-6 animate-in slide-in-from-bottom-8 duration-500">
                {/* Reception confirmation */}
                {receptionStatus === null && (
                  <div className="text-center space-y-5">
                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto">
                      <Package className="w-8 h-8 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-gray-900 text-lg">Avez-vous bien reçu votre commande ?</h3>
                      <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">Votre retour est précieux pour aider le restaurant à maintenir sa qualité.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        onClick={() => handleReception('OUI')}
                        className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gray-900 hover:bg-black px-6 py-4 font-bold text-white transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                      >
                        <ThumbsUp className="w-5 h-5" /> Oui, bien reçue
                      </button>
                      <button
                        onClick={() => handleReception('NON')}
                        className="flex-1 flex items-center justify-center gap-2 rounded-2xl border-2 border-gray-100 bg-white hover:bg-gray-50 px-6 py-4 font-bold text-gray-700 transition-all hover:border-gray-200"
                      >
                        <ThumbsDown className="w-5 h-5" /> Non, j'ai un souci
                      </button>
                    </div>
                  </div>
                )}

                {/* Problem report */}
                {receptionStatus === 'NON' && (
                  <div className="rounded-2xl bg-red-50 border border-red-100 p-6 text-center animate-in zoom-in duration-300">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <h3 className="text-base font-bold text-red-700">Désolé pour ce désagrément</h3>
                    <p className="text-sm text-red-600 mt-2">
                      Veuillez contacter le restaurant immédiatement au <br/>
                      <span className="font-black text-lg block mt-1">{order.restaurant?.telephone || 'numéro indiqué'}</span>
                    </p>
                    <button onClick={() => setReceptionStatus(null)} className="mt-4 px-4 py-2 bg-white rounded-xl text-sm font-bold text-red-600 shadow-sm hover:shadow transition-shadow">
                      Retour
                    </button>
                  </div>
                )}

                {/* Star rating form */}
                {receptionStatus === 'OUI' && !ratingDone && showRating && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="text-center">
                      <h3 className="font-extrabold text-gray-900 text-lg">Notez votre expérience</h3>
                      <p className="text-sm text-gray-500 mt-1">Qu'avez-vous pensé de votre commande ?</p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                      <StarRating value={rating} onChange={setRating} />
                      <div className="h-6 text-center mt-2">
                        {rating > 0 && (
                          <span className="text-sm font-black text-amber-500 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 uppercase tracking-wide">
                            {RATING_LABELS[rating]}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <textarea
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                        placeholder="Dites-nous en plus (optionnel)..."
                        rows={3}
                        className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 resize-none transition-all shadow-sm"
                      />
                      
                      {ratingError && (
                        <div className="bg-red-50 text-red-600 text-sm font-semibold px-4 py-3 rounded-xl flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" /> {ratingError}
                        </div>
                      )}
                      
                      <div className="flex gap-3">
                        <button onClick={() => setShowRating(false)} className="px-6 py-3.5 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">
                          Annuler
                        </button>
                        <button
                          onClick={handleSubmitRating}
                          disabled={ratingSubmitting || rating === 0}
                          className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 px-4 py-3.5 font-bold text-white text-sm transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 disabled:opacity-50 disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0"
                        >
                          {ratingSubmitting ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <><Send className="w-4 h-4" /> Publier mon avis</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rating confirmed state */}
                {receptionStatus === 'OUI' && ratingDone && (
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-8 text-center animate-in zoom-in duration-500">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-emerald-100">
                      <CheckCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="font-extrabold text-gray-900 text-lg mb-1">Merci pour votre retour !</h3>
                    <p className="text-sm text-gray-600 mb-6">Votre avis aide la communauté Resto D'Ici.</p>
                    
                    <div className="inline-flex flex-col items-center bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100">
                      <div className="flex items-center gap-1.5 pointer-events-none mb-1">
                        <StarRating value={existingAvis ? existingAvis.note : rating} readonly />
                      </div>
                      <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">
                        {RATING_LABELS[existingAvis ? existingAvis.note : rating]}
                      </span>
                    </div>
                  </div>
                )}

                {/* Show rate button if confirmed but not yet rated */}
                {receptionStatus === 'OUI' && !ratingDone && !showRating && (
                  <button
                    onClick={() => setShowRating(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-orange-100 bg-orange-50 hover:bg-orange-100 px-6 py-4 font-bold text-orange-600 text-sm transition-all hover:border-orange-200"
                  >
                    <Star className="w-5 h-5 text-orange-500 fill-orange-500" /> Laisser un avis au restaurant
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Global Bottom Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            onClick={() => navigate('/menu')}
            className="flex-1 bg-white border-2 border-gray-100 text-gray-700 font-bold py-4 rounded-2xl hover:bg-gray-50 hover:border-gray-200 transition-all shadow-sm"
          >
            Nouvelle commande
          </button>
          <button
            onClick={() => navigate(getClientOrdersPath())}
            className="flex-1 bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
          >
            Toutes mes commandes <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </main>
    </div>
  );
}
