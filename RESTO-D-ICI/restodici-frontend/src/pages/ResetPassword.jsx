// src/pages/ResetPassword.jsx
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle, AlertCircle, UtensilsCrossed } from 'lucide-react';
import { authAPI } from '../services/api';

const inputCls = 'w-full pl-10 pr-10 py-3.5 bg-[#FFF0DF] border-0 rounded-2xl text-[#1A1A1A] placeholder-[#8B6E50]/70 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]/40 transition-all';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!token) setError('Token de réinitialisation manquant');
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.newPassword || formData.newPassword.length < 6) { setError('Minimum 6 caractères'); return; }
    if (formData.newPassword !== formData.confirmPassword) { setError('Les mots de passe ne correspondent pas'); return; }
    setIsSubmitting(true);
    try {
      await authAPI.resetPassword(token, formData.newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la réinitialisation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const Logo = () => (
    <div className="flex items-center gap-2.5 mb-6">
      <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center border border-white/30">
        <UtensilsCrossed className="w-4 h-4 text-white" />
      </div>
      <span className="text-white font-extrabold text-lg">Resto d'ici</span>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EA580C] p-4 lg:p-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header bar */}
        <div className="bg-[#EA580C] px-8 pt-8 pb-10">
          <Logo />
          {success ? (
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/20 mx-auto mt-2">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
          ) : !token ? (
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/20 mx-auto mt-2">
              <AlertCircle className="w-7 h-7 text-white" />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold text-white mb-1">Nouveau mot de passe</h1>
              <p className="text-white/70 text-sm">Créez un mot de passe sécurisé pour votre compte.</p>
            </>
          )}
        </div>

        {/* Body */}
        <div className="px-8 py-8">
          {success ? (
            <div className="text-center">
              <h2 className="text-xl font-extrabold text-[#1A1A1A] mb-2">Mot de passe mis à jour !</h2>
              <p className="text-[#8B6E50] text-sm mb-8">Votre mot de passe a été modifié. Vous pouvez vous connecter.</p>
              <Link to="/login"
                className="inline-flex items-center justify-center w-full py-3.5 px-4 rounded-2xl font-bold text-white bg-[#EA580C] hover:bg-[#C2410C] transition-colors text-sm shadow-sm">
                Se connecter
              </Link>
            </div>
          ) : !token ? (
            <div className="text-center">
              <h2 className="text-xl font-extrabold text-[#1A1A1A] mb-2">Lien invalide</h2>
              <p className="text-[#8B6E50] text-sm mb-8">Ce lien est invalide ou a expiré. Demandez-en un nouveau.</p>
              <Link to="/forgot-password"
                className="inline-flex items-center justify-center w-full py-3.5 px-4 rounded-2xl font-bold text-white bg-[#EA580C] hover:bg-[#C2410C] transition-colors text-sm shadow-sm mb-4">
                Demander un nouveau lien
              </Link>
              <Link to="/login" className="flex items-center justify-center gap-2 text-[#8B6E50] hover:text-[#EA580C] text-sm">
                <ArrowLeft className="w-4 h-4" />Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#1A1A1A]">Nouveau mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#EA580C]/60" />
                  <input value={formData.newPassword} onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    type={showNew ? 'text' : 'password'} placeholder="••••••••" className={inputCls} />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8B6E50] hover:text-[#EA580C]" tabIndex={-1}>
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-[#8B6E50]/70">Minimum 6 caractères</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#1A1A1A]">Confirmer le mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#EA580C]/60" />
                  <input value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    type={showConfirm ? 'text' : 'password'} placeholder="••••••••" className={inputCls} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8B6E50] hover:text-[#EA580C]" tabIndex={-1}>
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">{error}</div>}

              <button type="submit" disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl font-bold text-white bg-[#EA580C] hover:bg-[#C2410C] active:scale-[0.98] transition-all shadow-sm disabled:opacity-60 text-sm">
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Réinitialisation…
                  </span>
                ) : 'Réinitialiser le mot de passe'}
              </button>

              <Link to="/login" className="flex items-center gap-2 text-[#8B6E50] hover:text-[#EA580C] text-sm pt-1">
                <ArrowLeft className="w-4 h-4" />Retour à la connexion
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
