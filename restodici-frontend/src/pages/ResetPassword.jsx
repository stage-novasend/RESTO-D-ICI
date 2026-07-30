// src/pages/ResetPassword.jsx
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import { authAPI } from '../services/api';
import AuthCard, { AuthField, AuthButton } from '../components/shared/AuthCard';

const MIN_LENGTH = 6;

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
    if (!token) setError('Lien de réinitialisation incomplet.');
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.newPassword || formData.newPassword.length < MIN_LENGTH) {
      setError(`Le mot de passe doit contenir au moins ${MIN_LENGTH} caractères.`);
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setIsSubmitting(true);
    try {
      await authAPI.resetPassword(token, formData.newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la réinitialisation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const set = (k) => (e) => {
    setFormData({ ...formData, [k]: e.target.value });
    if (error) setError('');
  };

  /* Bouton œil réutilisé par les deux champs. */
  const eye = (shown, toggle) => (
    <button
      type="button"
      onClick={toggle}
      aria-label={shown ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
      className="text-slate-400 hover:text-slate-600 transition-colors"
    >
      {shown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  if (success) {
    return (
      <AuthCard
        icon={<CheckCircle2 className="w-5 h-5" />}
        tone="success"
        title="Mot de passe modifié"
        subtitle="Votre mot de passe a été mis à jour. Vous pouvez maintenant vous connecter avec vos nouveaux identifiants."
        backTo={null}
      >
        <Link
          to="/login"
          className="block w-full py-3 rounded-lg font-bold text-white text-[14px] bg-orange-600 hover:bg-orange-700 transition-colors text-center"
        >
          Se connecter
        </Link>
      </AuthCard>
    );
  }

  if (!token) {
    return (
      <AuthCard
        icon={<AlertTriangle className="w-5 h-5" />}
        tone="danger"
        title="Lien invalide"
        subtitle="Ce lien de réinitialisation est incomplet ou a expiré. Demandez-en un nouveau pour continuer."
      >
        <Link
          to="/forgot-password"
          className="block w-full py-3 rounded-lg font-bold text-white text-[14px] bg-orange-600 hover:bg-orange-700 transition-colors text-center"
        >
          Demander un nouveau lien
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      icon={<Lock className="w-5 h-5" />}
      title="Nouveau mot de passe"
      subtitle={`Choisissez un mot de passe d'au moins ${MIN_LENGTH} caractères.`}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <AuthField
          label="Nouveau mot de passe"
          icon={<Lock className="w-4 h-4" />}
          type={showNew ? 'text' : 'password'}
          value={formData.newPassword}
          onChange={set('newPassword')}
          placeholder="••••••••"
          autoComplete="new-password"
          autoFocus
          trailing={eye(showNew, () => setShowNew((v) => !v))}
        />

        <AuthField
          label="Confirmer le mot de passe"
          icon={<Lock className="w-4 h-4" />}
          type={showConfirm ? 'text' : 'password'}
          value={formData.confirmPassword}
          onChange={set('confirmPassword')}
          placeholder="••••••••"
          autoComplete="new-password"
          error={error}
          trailing={eye(showConfirm, () => setShowConfirm((v) => !v))}
        />

        <AuthButton type="submit" loading={isSubmitting} loadingLabel="Enregistrement…">
          Enregistrer le mot de passe
        </AuthButton>
      </form>
    </AuthCard>
  );
}
