import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { paiementsAPI } from '../services/api';

export default function PaymentPreviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const reference = params.get('ref') || params.get('reference') || '';
  const montant = params.get('montant') || '';
  const session = params.get('session') || '';

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
        await paiementsAPI.simuler({ commandeId: reference, provider: 'ORANGE' });
        if (!cancelled) {
          setStatus('success');
          window.setTimeout(() => navigate(`/checkout/success/${encodeURIComponent(reference)}`), 1200);
        }
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setError(e?.response?.data?.message || 'La simulation n’a pas pu être confirmée.');
        }
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [reference, loading, user, navigate]);

  return (
    <div className="min-h-screen bg-[#FFF8F2] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-[28px] border border-orange-100 bg-white shadow-[0_20px_60px_rgba(234,88,12,0.12)] p-7 sm:p-8">
        <div className="mb-6 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
            {status === 'loading' && <Loader2 className="h-7 w-7 animate-spin" />}
            {status === 'success' && <CheckCircle2 className="h-7 w-7" />}
            {(status === 'idle' || status === 'login-required' || status === 'error') && <AlertCircle className="h-7 w-7" />}
          </div>
        </div>

        <h1 className="text-center text-2xl font-black text-[#1A0C00]">
          Paiement de test local
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-[#8B6E50]">
          Cette page sert à valider le flux de paiement sans credentials NovaSend.
        </p>

        <div className="mt-6 rounded-2xl border border-orange-100 bg-[#FFF4E8] p-4 text-sm text-[#6B4A2F]">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Commande</span>
            <span className="font-bold text-[#1A0C00]">{reference || '—'}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-semibold">Montant</span>
            <span className="font-bold text-[#1A0C00]">{montant ? `${montant} FCFA` : '—'}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-semibold">Session</span>
            <span className="font-bold text-[#1A0C00]">{session || '—'}</span>
          </div>
        </div>

        {status === 'loading' && (
          <div className="mt-6 text-center text-sm font-semibold text-[#EA580C]">
            Confirmation du paiement en cours…
          </div>
        )}

        {status === 'success' && (
          <div className="mt-6 text-center text-sm font-semibold text-green-700">
            Paiement confirmé. Redirection vers la page de suivi…
          </div>
        )}

        {status === 'login-required' && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
            Connectez-vous pour confirmer ce paiement de test.
          </div>
        )}

        {status === 'error' && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={() => {
            if (!reference) return;
            void paiementsAPI.simuler({ commandeId: reference, provider: 'ORANGE' })
              .then(() => navigate(`/checkout/success/${encodeURIComponent(reference)}`))
              .catch((e) => setError(e?.response?.data?.message || 'La simulation n’a pas pu être confirmée.'));
          }}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#EA580C] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5"
        >
          Confirmer le paiement de test
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
