// src/pages/ForgotPassword.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle, UtensilsCrossed } from 'lucide-react';
import { authAPI } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (e) => /\S+@\S+\.\S+/.test(e);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email requis'); return; }
    if (!validateEmail(email.trim())) { setError('Email invalide'); return; }
    setIsSubmitting(true);
    try {
      await authAPI.forgotPassword(email.trim());
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'envoi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EA580C] p-4 lg:p-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header bar */}
        <div className="bg-[#EA580C] px-8 pt-8 pb-10">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center border border-white/30">
              <UtensilsCrossed className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-white font-extrabold text-lg">Resto d'ici</span>
          </div>
          {success ? (
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/20 mx-auto mt-2">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold text-white mb-1">Mot de passe oublié ?</h1>
              <p className="text-white/70 text-sm">Entrez votre email pour recevoir un lien de réinitialisation.</p>
            </>
          )}
        </div>

        {/* Body */}
        <div className="px-8 py-8">
          {success ? (
            <div className="text-center">
              <h2 className="text-xl font-extrabold text-[#1A1A1A] mb-2">Email envoyé !</h2>
              <p className="text-[#8B6E50] text-sm mb-1">Un lien de réinitialisation a été envoyé si un compte existe avec cet email.</p>
              <p className="text-[#8B6E50]/70 text-xs mb-8">Vérifiez aussi vos spams.</p>
              <Link to="/login"
                className="inline-flex items-center justify-center w-full py-3.5 px-4 rounded-2xl font-bold text-white bg-[#EA580C] hover:bg-[#C2410C] transition-colors text-sm shadow-sm">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#1A1A1A]">Adresse email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#EA580C]/60" />
                  <input
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    type="email" placeholder="votre@email.com" required title="Email invalide (ex. nom@domaine.com)"
                    className={`w-full pl-10 pr-4 py-3.5 bg-[#FFF0DF] border-0 rounded-2xl text-[#1A1A1A] placeholder-[#8B6E50]/70 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]/40 transition-all${error ? ' ring-2 ring-red-400' : ''}`}
                  />
                </div>
                {error && <p className="text-red-500 text-xs">{error}</p>}
              </div>

              <button type="submit" disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl font-bold text-white bg-[#EA580C] hover:bg-[#C2410C] active:scale-[0.98] transition-all shadow-sm disabled:opacity-60 text-sm">
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Envoi en cours…
                  </span>
                ) : 'Réinitialiser le mot de passe'}
              </button>

              <div className="pt-2">
                <Link to="/login" className="flex items-center gap-2 text-[#8B6E50] hover:text-[#EA580C] text-sm font-medium transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  Retour à la connexion
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
