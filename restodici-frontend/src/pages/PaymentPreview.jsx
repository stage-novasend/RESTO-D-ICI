import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Loader2, AlertCircle, ArrowRight, ShieldCheck, Lock,
  Copy, Check, CreditCard, Receipt, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { paiementsAPI } from '../services/api';
import orangeMoneyLogo from '../assets/payments/orange-money.svg';
import mtnMomoLogo from '../assets/payments/mtn-momo.svg';
import moovMoneyLogo from '../assets/payments/moov-money.svg';
import carteBancaireLogo from '../assets/payments/carte-bancaire.svg';

const PAYMENT_PROVIDERS = [
  { id: 'ORANGE', name: 'Orange Money', logo: orangeMoneyLogo, accent: '#FF7900', badge: 'Orange CI' },
  { id: 'MOMO', name: 'MTN Mobile Money', logo: mtnMomoLogo, accent: '#FFCC00', badge: 'MTN CI' },
  { id: 'MOOV', name: 'Moov Money', logo: moovMoneyLogo, accent: '#0066CC', badge: 'Moov Africa' },
  { id: 'WAVE', name: 'Wave', logo: null, accent: '#1DA1F2', badge: 'Wave CI' },
  { id: 'CARTE', name: 'Carte Bancaire', logo: carteBancaireLogo, accent: '#1A0C00', badge: 'Visa / Mastercard' },
];

export default function PaymentPreviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('ORANGE');

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const reference = params.get('ref') || params.get('reference') || '';
  const montant = params.get('montant') || '';
  const session = params.get('session') || '';

  const formattedAmount = useMemo(() => {
    if (!montant) return '0 FCFA';
    const num = Number(montant);
    return isNaN(num) ? `${montant} FCFA` : `${Math.round(num).toLocaleString('fr-FR')} FCFA`;
  }, [montant]);

  const copyReference = () => {
    if (!reference) return;
    navigator.clipboard.writeText(reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!reference || loading) return;
    if (!user) {
      setStatus('login-required');
      return;
    }

    let cancelled = false;
    const run = async () => {
      setStatus('loading');
      setError('');
      try {
        await paiementsAPI.simuler({ commandeId: reference, provider: selectedProvider });
        if (!cancelled) {
          setStatus('success');
          window.setTimeout(() => navigate(`/checkout/success/${encodeURIComponent(reference)}`), 1200);
        }
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setError(e?.response?.data?.message || 'La simulation de paiement n’a pas pu être confirmée.');
        }
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [reference, loading, user, navigate, selectedProvider]);

  const handleConfirm = async () => {
    if (!reference) return;
    setStatus('loading');
    setError('');
    try {
      await paiementsAPI.simuler({ commandeId: reference, provider: selectedProvider });
      setStatus('success');
      window.setTimeout(() => navigate(`/checkout/success/${encodeURIComponent(reference)}`), 1000);
    } catch (e) {
      setStatus('error');
      setError(e?.response?.data?.message || 'La simulation de paiement n’a pas pu être confirmée.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F2] via-[#FFF3EA] to-[#FDF8F5] flex flex-col justify-between p-4 sm:p-8 font-sans">
      {/* Top Bar Navigation */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-2 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#8B6E50] hover:text-[#FF3A03] bg-white/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-orange-100 shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-full shadow-sm">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            256-bit SSL Crypté
          </span>
        </div>
      </header>

      {/* Main Terminal Dashboard Card */}
      <main className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-6 my-auto items-stretch">

        {/* Left Column: Order Summary & Details */}
        <div className="md:col-span-5 bg-white/90 backdrop-blur-lg rounded-[28px] border border-orange-100/80 p-6 shadow-[0_20px_50px_rgba(234,60,12,0.08)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF3A03] to-[#CC2402] flex items-center justify-center text-white shadow-md shadow-orange-200">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#1A0C00] tracking-tight">Récapitulatif</h2>
                <p className="text-xs font-medium text-[#8B6E50]">Terminal RESTODICI Paiement</p>
              </div>
            </div>

            {/* Reference Box */}
            <div className="bg-[#FFF8F2] rounded-2xl p-4 border border-orange-100/90 mb-5">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#9E8B7A] mb-1">
                Numéro de Commande
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-base text-[#1A0C00]">
                  {reference || 'CMD-LOCAL-PREVIEW'}
                </span>
                <button
                  onClick={copyReference}
                  title="Copier le numéro"
                  className="p-1.5 text-[#8B6E50] hover:text-[#FF3A03] rounded-lg hover:bg-orange-100/60 transition"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Price Details */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-[#6B4A2F]">
                <span>Type de transaction</span>
                <span className="font-semibold text-[#1A0C00]">Test / Simulation</span>
              </div>
              {session && (
                <div className="flex justify-between text-[#6B4A2F]">
                  <span>ID Session</span>
                  <span className="font-mono text-xs font-bold text-[#1A0C00] truncate max-w-[140px]" title={session}>
                    {session}
                  </span>
                </div>
              )}
              <div className="border-t border-orange-100 pt-3 flex justify-between items-baseline">
                <span className="font-black text-[#1A0C00]">Montant à payer</span>
                <span className="text-2xl font-black text-[#FF3A03] tracking-tight">{formattedAmount}</span>
              </div>
            </div>
          </div>

          {/* Security Banner */}
          <div className="mt-8 pt-4 border-t border-orange-100/80 flex items-center gap-3 text-xs text-[#8B6E50]">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="leading-tight">
              Environnement sécurisé. Aucun débit réel ne sera effectué sur vos comptes.
            </p>
          </div>
        </div>

        {/* Right Column: Payment Provider Selector & Action */}
        <div className="md:col-span-7 bg-white rounded-[28px] border border-orange-100 p-6 sm:p-7 shadow-[0_20px_50px_rgba(234,60,12,0.12)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-xl font-black text-[#1A0C00] tracking-tight">Méthode de Règlement</h1>
                <p className="text-xs text-[#8B6E50] font-medium mt-0.5">Choisissez l'opérateur pour simuler le paiement</p>
              </div>
              <span className="px-2.5 py-1 bg-orange-50 text-[#FF3A03] font-extrabold text-[11px] rounded-lg border border-orange-100">
                SANDBOX
              </span>
            </div>

            {/* Provider Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {PAYMENT_PROVIDERS.map((p) => {
                const active = selectedProvider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProvider(p.id)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                      active
                        ? 'border-[#FF3A03] bg-[#FFF8F2] shadow-sm'
                        : 'border-slate-100 hover:border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden p-1 ${active ? 'bg-orange-100/80' : 'bg-slate-50'}`}>
                        {p.logo ? (
                          <img src={p.logo} alt={p.name} className="w-full h-full object-contain" />
                        ) : p.id === 'WAVE' ? (
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center font-black text-white text-xs">
                            W
                          </div>
                        ) : (
                          <CreditCard className="w-5 h-5 text-slate-700" />
                        )}
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-[#1A0C00] leading-tight">{p.name}</div>
                        <div className="text-[10px] font-semibold text-[#9E8B7A] mt-0.5">{p.badge}</div>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      active ? 'border-[#FF3A03] bg-[#FF3A03]' : 'border-slate-300'
                    }`}>
                      {active && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Status Notifications */}
            {status === 'loading' && (
              <div className="rounded-2xl bg-orange-50 border border-orange-200 p-4 text-center text-sm font-extrabold text-[#FF3A03] flex items-center justify-center gap-2 animate-pulse mb-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Traitement de la transaction en cours…
              </div>
            )}

            {status === 'success' && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center text-sm font-extrabold text-emerald-800 flex items-center justify-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Paiement validé avec succès ! Redirection…
              </div>
            )}

            {status === 'login-required' && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs font-bold text-amber-900 flex items-center gap-2.5 mb-4">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                Veuillez vous connecter pour autoriser la confirmation du paiement.
              </div>
            )}

            {status === 'error' && (
              <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-bold text-red-800 flex items-center gap-2.5 mb-4">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={handleConfirm}
            disabled={status === 'loading' || status === 'success'}
            className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#FF3A03] to-[#CC2402] hover:from-[#D94E07] hover:to-[#B0380B] text-white font-extrabold py-4 px-6 text-sm shadow-xl shadow-orange-200/80 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Validation en cours…
              </>
            ) : (
              <>
                Valider la simulation
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

      </main>

      {/* Footer Branding */}
      <footer className="max-w-4xl mx-auto w-full text-center py-4">
        <p className="text-xs font-semibold text-[#8B6E50]/70">
          RESTODICI · Système de paiement unifié Mobile Money & Carte
        </p>
      </footer>
    </div>
  );
}
