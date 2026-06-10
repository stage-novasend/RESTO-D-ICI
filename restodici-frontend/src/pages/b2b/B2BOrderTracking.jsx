// src/pages/b2b/B2BOrderTracking.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, Clock, MapPin, Package,
  Truck, UtensilsCrossed, XCircle, AlertTriangle,
  Star, ThumbsUp, ThumbsDown, Send, Users, Building2, Mail,
} from 'lucide-react';
import { b2bAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { createCommandesSocket } from '../../services/commandes.service';
import { formatFCFA } from '../../utils/formatters';

const A = '#FF8C00';
const BD = 'rgba(89,67,42,0.10)';

const safeDate = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
};

const PIPELINE = [
  { key: 'EN_ATTENTE',     label: 'Commande reçue',       icon: Package,       color: '#64748B' },
  { key: 'CONFIRMEE',      label: 'Confirmée',             icon: CheckCircle,   color: A },
  { key: 'EN_PREPARATION', label: 'En préparation',        icon: Clock,         color: '#D97706' },
  { key: 'LIVREE',         label: 'Livrée',                icon: Truck,         color: '#16A34A' },
];
const PIPELINE_KEYS = PIPELINE.map(s => s.key);

function StarRating({ value, onChange, readonly = false }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1.5 items-center">
      {[1, 2, 3, 4, 5].map(star => {
        const active = star <= (hovered || value);
        return (
          <button key={star} type="button" disabled={readonly}
            onClick={() => !readonly && onChange?.(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            className={`transition-all ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}>
            <Star className={`w-7 h-7 transition-all ${active ? 'fill-amber-400 text-amber-400' : 'text-[#D9CFC6]'}`} />
          </button>
        );
      })}
    </div>
  );
}

export default function B2BOrderTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [justUpdated, setJustUpdated] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Avis state
  const [receptionStatus, setReceptionStatus] = useState(null);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const [ratingError, setRatingError] = useState('');

  const fetchOrder = async () => {
    try {
      const res = await b2bAPI.getCommandeGroupeeDetail(id);
      setOrder(res.data);
      setLoading(false);
      // Pre-fill avis state if already rated
      if (res.data.avisNote) { setRatingDone(true); setReceptionStatus('OUI'); }
    } catch (e) {
      setError(e.response?.data?.message || 'Commande introuvable');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchOrder();

    const socket = createCommandesSocket(user);
    const refresh = (payload) => {
      if (payload?.id === id || !payload?.id) {
        setJustUpdated(true);
        fetchOrder();
        setTimeout(() => setJustUpdated(false), 2000);
      }
    };
    ['commande.b2b.statut', 'commande.b2b.nouvelle', 'commande.statut'].forEach(ev => socket.on(ev, refresh));

    // Poll every 5s while not delivered
    const poll = setInterval(() => {
      if (!['LIVREE', 'ANNULEE'].includes(order?.statut ?? '')) fetchOrder();
    }, 5000);

    return () => { socket.disconnect(); clearInterval(poll); };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = async () => {
    if (!window.confirm('Annuler cette commande groupée ? Cette action est irréversible.')) return;
    setCancelling(true);
    try {
      await b2bAPI.annulerCommandeGroupee(id);
      setOrder(o => ({ ...o, statut: 'ANNULEE' }));
    } catch (e) {
      alert(e?.response?.data?.message || 'Impossible d\'annuler la commande.');
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitAvis = async () => {
    if (rating === 0) { setRatingError('Choisissez une note'); return; }
    setRatingSubmitting(true); setRatingError('');
    try {
      await b2bAPI.submitAvis(id, { note: rating, commentaire: comment || undefined });
      setRatingDone(true); setShowRating(false);
      setOrder(o => ({ ...o, avisNote: rating, avisCommentaire: comment }));
    } catch (e) {
      const msg = e?.response?.data?.message || '';
      if (msg.includes('déjà')) { setRatingDone(true); setShowRating(false); }
      else setRatingError(msg || "Erreur lors de l'envoi");
    } finally { setRatingSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-t-transparent rounded-full animate-spin" style={{ borderColor: A }} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center border shadow" style={{ borderColor: BD }}>
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <p className="font-bold text-[#0F172A] mb-2">Commande introuvable</p>
          <p className="text-sm text-[#64748B] mb-6">{error || 'Aucune commande trouvée.'}</p>
          <button onClick={() => navigate('/b2b')}
            className="w-full text-white font-bold py-3 px-6 rounded-xl transition"
            style={{ background: A }}>
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  const isCancelled = order.statut === 'ANNULEE';
  const isDelivered = order.statut === 'LIVREE';
  const currentIdx = PIPELINE_KEYS.indexOf(order.statut);
  const total = order.totalEstime || order.lignes?.reduce((s, l) => s + l.quantite * Number(l.prixUnitaire || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b shadow-sm" style={{ borderColor: BD }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/b2b')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#F9F7F5] text-[#64748B] transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-[#0F172A] text-sm leading-tight">Suivi commande groupée</h1>
            <p className="text-xs text-[#64748B]">#{order.numero}</p>
          </div>
          <div className="flex items-center gap-2">
            {justUpdated && <span className="text-xs text-emerald-600 font-medium animate-pulse">Mis à jour</span>}
            <span className="text-xs font-bold text-white px-2.5 py-1 rounded-full"
              style={{ background: isDelivered ? '#16A34A' : isCancelled ? '#E11D48' : A }}>
              {isCancelled ? 'Annulée' : isDelivered ? 'Livrée ✓' : PIPELINE.find(s => s.key === order.statut)?.label || order.statut}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Status hero */}
        {isCancelled ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="font-bold text-red-700">Commande annulée</p>
              <p className="text-xs text-red-500 mt-0.5">Cette commande groupée a été annulée.</p>
            </div>
          </div>
        ) : isDelivered ? (
          <>
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="font-bold text-emerald-700">Commande livrée !</p>
                <p className="text-xs text-emerald-600 mt-0.5">Nous espérons que tout vous a satisfait.</p>
              </div>
            </div>
            {user?.email && (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
                <Mail className="w-5 h-5 text-blue-500 shrink-0" />
                <p className="text-sm text-blue-700">
                  Reçu de commande groupée envoyé à{' '}
                  <span className="font-bold">{user.email}</span>
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-2xl border p-5 flex items-center gap-4" style={{ borderColor: BD }}>
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: A }} />
            </div>
            <div>
              <p className="font-bold text-[#0F172A]">
                {PIPELINE.find(s => s.key === order.statut)?.label || order.statut}
              </p>
              <p className="text-xs text-[#64748B] animate-pulse mt-0.5">Mise à jour en temps réel…</p>
            </div>
          </div>
        )}

        {/* Progress pipeline */}
        {!isCancelled && (
          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: BD }}>
            <h2 className="font-bold text-[#0F172A] text-sm mb-5">Progression</h2>
            <div className="space-y-0">
              {PIPELINE.map((s, idx) => {
                const Icon = s.icon;
                const done = idx < currentIdx;
                const current = idx === currentIdx;
                const isLast = idx === PIPELINE.length - 1;
                return (
                  <div key={s.key} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${done || current ? 'text-white shadow-sm' : 'bg-[#F5F0E8] text-[#64748B]/40'}`}
                        style={done || current ? { background: s.color, transform: current ? 'scale(1.1)' : 'scale(1)' } : {}}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {!isLast && (
                        <div className="w-0.5 my-1 flex-1 min-h-[20px] transition-all"
                          style={{ background: done ? A : '#E5E0D8' }} />
                      )}
                    </div>
                    <div className={`pb-5 ${isLast ? 'pb-0' : ''} flex items-start pt-1.5`}>
                      <div>
                        <p className={`text-sm font-semibold ${current ? 'text-[#FF8C00]' : done ? 'text-[#0F172A]' : 'text-[#64748B]/40'}`}>
                          {s.label}
                        </p>
                        {current && <p className="text-xs text-[#64748B] mt-0.5 animate-pulse">En cours…</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cancel button — before preparation */}
        {['EN_ATTENTE', 'CONFIRMEE'].includes(order.statut) && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-red-700">Annuler la commande</p>
              <p className="text-xs text-red-500 mt-0.5">Possible avant le début de la préparation</p>
            </div>
            <button onClick={handleCancel} disabled={cancelling}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition disabled:opacity-60 shrink-0">
              {cancelling ? 'Annulation…' : 'Annuler'}
            </button>
          </div>
        )}

        {/* Delivery info */}
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: BD }}>
          <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: BD }}>
            <Truck className="w-4 h-4 text-[#64748B]" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-[#0F172A]">Livraison groupée</span>
              {order.lieuLivraison && <span className="text-xs text-[#64748B] ml-2">· {order.lieuLivraison}</span>}
            </div>
            <span className="text-xs text-[#64748B] shrink-0">{safeDate(order.createdAt)}</span>
          </div>

          {/* Delivery date/location */}
          <div className="px-5 py-3 border-b flex items-center gap-4 text-xs text-[#64748B]" style={{ borderColor: BD }}>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" style={{ color: A }} />
              <span>
                {order.dateLivraison} à {order.heureLivraison}
              </span>
            </div>
            {order.adresseLivraison && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" style={{ color: A }} />
                <span className="truncate max-w-[180px]">{order.adresseLivraison}</span>
              </div>
            )}
          </div>

          {/* Lines */}
          <div className="px-5 py-4 space-y-2.5">
            {(order.lignes || []).map((ligne, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <div>
                  <span className="text-[#0F172A]">
                    <span className="font-semibold">{ligne.quantite}×</span> {ligne.nomArticle || 'Article'}
                  </span>
                  {ligne.collaborateur && (
                    <span className="ml-2 text-[11px] text-[#6B7280]">
                      → {ligne.collaborateur.nom || ligne.collaborateurNom}
                    </span>
                  )}
                </div>
                <span className="text-[#64748B] font-medium ml-4 shrink-0">
                  {formatFCFA(Number(ligne.prixUnitaire ?? 0) * (ligne.quantite ?? 1))}
                </span>
              </div>
            ))}
          </div>

          <div className="mx-5 border-t" style={{ borderColor: BD }} />
          <div className="px-5 py-4 flex justify-between items-center">
            <div>
              <span className="font-bold text-[#0F172A]">Total estimé</span>
              <span className="text-xs text-[#64748B] ml-2">· Facturation SYSCOHADA fin de mois</span>
            </div>
            <span className="text-lg font-extrabold" style={{ color: A }}>{formatFCFA(total)}</span>
          </div>

          {/* Company info */}
          {(order.compteB2B || order.entreprise) && (
            <div className="mx-5 mb-4 rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: '#FFF0DF' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: A }}>
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#0F172A]">
                  {order.compteB2B?.raisonSociale || order.entreprise}
                </p>
                {order.compteB2B?.emailProfessionnel && (
                  <p className="text-xs text-[#64748B]">{order.compteB2B.emailProfessionnel}</p>
                )}
              </div>
              {(order.lignes?.length > 0) && (
                <div className="flex items-center gap-1 shrink-0">
                  <Users className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span className="text-xs text-[#64748B]">{order.lignes.length} repas</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Avis section (LIVREE only) ─────────────────────────────────────── */}
        {isDelivered && (
          <div className="bg-white rounded-2xl border p-5 space-y-4" style={{ borderColor: BD }}>

            {/* Existing avis */}
            {order.avisNote && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#F0FDF4' }}>
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Avis soumis · {order.avisNote}/5 ⭐</p>
                  {order.avisCommentaire && <p className="text-xs text-green-700 mt-0.5">{order.avisCommentaire}</p>}
                </div>
              </div>
            )}

            {/* Reception confirmation */}
            {!order.avisNote && receptionStatus === null && (
              <>
                <div>
                  <p className="font-bold text-[#0F172A] text-sm">Avez-vous bien reçu votre commande groupée ?</p>
                  <p className="text-xs text-[#64748B] mt-0.5">Votre retour aide le restaurant et votre équipe.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setReceptionStatus('OUI'); setShowRating(true); }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-3 font-bold text-white text-sm transition">
                    <ThumbsUp className="w-4 h-4" /> Oui, reçue
                  </button>
                  <button onClick={() => setReceptionStatus('NON')}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-bold text-red-500 text-sm transition hover:bg-red-50"
                    style={{ borderColor: BD }}>
                    <ThumbsDown className="w-4 h-4" /> Problème
                  </button>
                </div>
              </>
            )}

            {/* Problem */}
            {receptionStatus === 'NON' && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                <p className="text-sm font-semibold text-red-700">Problème signalé</p>
                <p className="text-xs text-red-500 mt-1">Contactez le restaurant ou notre support.</p>
                <button onClick={() => setReceptionStatus(null)} className="mt-2 text-xs text-red-600 underline">← Revenir</button>
              </div>
            )}

            {/* Rating form */}
            {receptionStatus === 'OUI' && !ratingDone && showRating && (
              <div className="space-y-4">
                <div className="h-px" style={{ background: BD }} />
                <div>
                  <p className="font-bold text-[#0F172A] text-sm">Notez votre expérience</p>
                  <p className="text-xs text-[#64748B] mt-0.5">Votre avis aide le restaurant et votre équipe.</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <StarRating value={rating} onChange={setRating} />
                  {rating > 0 && (
                    <p className="text-xs font-semibold mt-1" style={{ color: A }}>
                      {['', 'Très mauvais', 'Mauvais', 'Correct', 'Bon', 'Excellent'][rating]}
                    </p>
                  )}
                </div>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Un commentaire ? (optionnel)"
                  rows={3}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                  style={{ background: '#F9F7F5', border: `1px solid ${BD}` }}
                />
                {ratingError && <p className="text-xs text-red-500 font-semibold">{ratingError}</p>}
                <button onClick={handleSubmitAvis} disabled={ratingSubmitting || rating === 0}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition"
                  style={{ background: A, opacity: ratingSubmitting || rating === 0 ? 0.6 : 1 }}>
                  {ratingSubmitting
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Send className="w-4 h-4" />}
                  {ratingSubmitting ? 'Envoi…' : 'Envoyer mon avis'}
                </button>
              </div>
            )}

            {/* Rating done */}
            {ratingDone && !order.avisNote && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#F0FDF4' }}>
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <p className="text-sm font-semibold text-green-800">Merci pour votre avis !</p>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
