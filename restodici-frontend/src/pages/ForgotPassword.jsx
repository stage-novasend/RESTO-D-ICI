// src/pages/ForgotPassword.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MailCheck, KeyRound } from 'lucide-react';
import { authAPI } from '../services/api';
import AuthCard, { AuthField, AuthButton } from '../components/shared/AuthCard';

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

  if (success) {
    return (
      <AuthCard
        icon={<MailCheck className="w-5 h-5" />}
        tone="success"
        title="Email envoyé"
        /* Formulation volontairement neutre : confirmer l'existence d'un compte
           permettrait d'énumérer les adresses inscrites. */
        subtitle="Si un compte est associé à cette adresse, un lien de réinitialisation vient d'y être envoyé. Pensez à vérifier vos courriers indésirables."
      >
        <Link
          to="/login"
          className="block w-full py-3 rounded-lg font-bold text-white text-[14px] bg-orange-600 hover:bg-orange-700 transition-colors text-center"
        >
          Retour à la connexion
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      icon={<KeyRound className="w-5 h-5" />}
      title="Mot de passe oublié"
      subtitle="Indiquez l'adresse email de votre compte. Nous vous enverrons un lien pour définir un nouveau mot de passe."
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <AuthField
          label="Adresse email"
          icon={<Mail className="w-4 h-4" />}
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
          type="email"
          placeholder="vous@exemple.com"
          autoComplete="email"
          autoFocus
          error={error}
        />
        <AuthButton type="submit" loading={isSubmitting}>
          Envoyer le lien
        </AuthButton>
      </form>
    </AuthCard>
  );
}
