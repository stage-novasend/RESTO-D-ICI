// src/pages/VerifyEmail.jsx
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { CheckCircle2, AlertTriangle, Mail, Loader2 } from 'lucide-react';
import AuthCard, { AuthField, AuthButton } from '../components/shared/AuthCard';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Ce lien de vérification est incomplet.');
      return;
    }
    (async () => {
      try {
        const res = await authAPI.verifyEmail(token);
        setStatus('success');
        setMessage(res.data?.message || 'Votre adresse email est confirmée.');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Ce lien est invalide ou a expiré.');
      }
    })();
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    setIsResending(true);
    setMessage('');
    try {
      const res = await authAPI.resendVerification(email);
      setStatus('success');
      setMessage(res.data?.message || 'Un nouveau lien de vérification vient de vous être envoyé.');
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Erreur lors du renvoi.');
    } finally {
      setIsResending(false);
    }
  };

  if (status === 'loading') {
    return (
      <AuthCard
        icon={<Loader2 className="w-5 h-5 animate-spin" />}
        title="Vérification en cours"
        subtitle="Nous confirmons votre adresse email, merci de patienter un instant."
        backTo={null}
      >
        <div className="h-1 w-full bg-slate-100 rounded overflow-hidden">
          <div className="h-full w-1/3 bg-orange-500 animate-pulse" />
        </div>
      </AuthCard>
    );
  }

  if (status === 'success') {
    return (
      <AuthCard
        icon={<CheckCircle2 className="w-5 h-5" />}
        tone="success"
        title="Adresse email confirmée"
        subtitle={message}
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

  return (
    <AuthCard
      icon={<AlertTriangle className="w-5 h-5" />}
      tone="danger"
      title="Vérification impossible"
      subtitle={message}
    >
      {/* Un lien expiré est le cas le plus fréquent : on propose le renvoi
          directement, sans forcer un détour par une autre page. */}
      <form onSubmit={handleResend} className="space-y-5">
        <AuthField
          label="Recevoir un nouveau lien"
          icon={<Mail className="w-4 h-4" />}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.com"
          autoComplete="email"
          required
        />
        <AuthButton type="submit" loading={isResending} loadingLabel="Envoi…" disabled={!email.trim()}>
          Renvoyer le lien
        </AuthButton>
      </form>
    </AuthCard>
  );
}
