// src/pages/VerifyEmail.jsx
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { ArrowLeft, CheckCircle, AlertCircle, Mail, UtensilsCrossed } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage("Token de vérification manquant."); return; }
    (async () => {
      try {
        const res = await authAPI.verifyEmail(token);
        setStatus('success');
        setMessage(res.data?.message || 'Email vérifié avec succès.');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Erreur lors de la vérification.');
      }
    })();
  }, [token]);

  const handleResend = async () => {
    setIsResending(true);
    setMessage('');
    try {
      const res = await authAPI.resendVerification(email);
      setStatus('success');
      setMessage(res.data?.message || 'Lien de vérification renvoyé.');
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Erreur lors du renvoi.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EA580C] p-4 lg:p-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-[#EA580C] px-8 pt-8 pb-10">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center border border-white/30">
              <UtensilsCrossed className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-extrabold text-lg">Resto d'ici</span>
          </div>
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/20 mx-auto mt-2">
            {status === 'success'
              ? <CheckCircle className="w-7 h-7 text-white" />
              : status === 'error'
              ? <AlertCircle className="w-7 h-7 text-white" />
              : <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            }
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-8">
          {status === 'loading' && (
            <div className="text-center">
              <h2 className="text-xl font-extrabold text-[#1A1A1A] mb-2">Vérification en cours…</h2>
              <p className="text-[#8B6E50] text-sm">Veuillez patienter quelques secondes.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <h2 className="text-xl font-extrabold text-[#1A1A1A] mb-2">Email confirmé !</h2>
              <p className="text-[#8B6E50] text-sm mb-8">{message}</p>
              <Link to="/login"
                className="inline-flex items-center justify-center w-full py-3.5 px-4 rounded-2xl font-bold text-white bg-[#EA580C] hover:bg-[#C2410C] transition-colors text-sm shadow-sm">
                Se connecter
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-xl font-extrabold text-[#1A1A1A] mb-2">Lien invalide</h2>
                <p className="text-[#8B6E50] text-sm">{message}</p>
              </div>

              <div className="space-y-3 bg-[#FFF0DF] rounded-2xl p-5">
                <p className="text-sm font-semibold text-[#1A1A1A]">Renvoyer le lien de vérification</p>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#EA580C]/60" />
                  <input
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    type="email" placeholder="votre@email.com"
                    className="w-full pl-10 pr-4 py-3.5 bg-white border-0 rounded-2xl text-[#1A1A1A] placeholder-[#8B6E50]/70 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]/40"
                  />
                </div>
                <button type="button" disabled={isResending || !email} onClick={handleResend}
                  className="w-full py-3 px-4 rounded-2xl font-bold text-white bg-[#EA580C] hover:bg-[#C2410C] transition-colors disabled:opacity-60 text-sm">
                  {isResending ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Envoi…
                    </span>
                  ) : 'Renvoyer le lien'}
                </button>
              </div>

              <div className="mt-5">
                <Link to="/login" className="flex items-center gap-2 text-[#8B6E50] hover:text-[#EA580C] text-sm">
                  <ArrowLeft className="w-4 h-4" />Retour à la connexion
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
