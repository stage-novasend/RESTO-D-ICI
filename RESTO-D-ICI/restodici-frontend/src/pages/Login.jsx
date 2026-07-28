/* ═══════════════════════════════════════════════════════════════
   login.jsx — Page de connexion Restodici
   Gère : identifiants normaux + vérification 2FA (code TOTP)
   Responsive : mobile-first, image hero masquée sur petit écran
   ═══════════════════════════════════════════════════════════════ */
import { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, CheckCircle, UtensilsCrossed, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { setAccessToken } from '../services/token-store.js';
import { isValidEmail, MSG } from '../utils/validators';

export default function Login() {
  const navigate       = useNavigate();
  const location       = useLocation();
  const [searchParams] = useSearchParams();
  const { login, syncUser } = useAuth();

  /* ── État du formulaire principal ── */
  const [formData,    setFormData]  = useState({ email: '', password: '' });
  const [errors,      setErrors]    = useState({});
  const [isSubmitting, setSubmit]   = useState(false);
  const [showPassword, setShowPw]   = useState(false);

  /* ── État de la vérification 2FA (étape secondaire) ── */
  const [twoFactorStep, set2FA]     = useState(false);   // true = on affiche le champ code
  const [tempToken,     setTemp]    = useState('');       // token temporaire reçu du backend
  const [twoFactorCode, set2FACode] = useState('');       // code TOTP saisi par l'utilisateur

  /* ── Paramètres de redirection et messages contextuels ── */
  const redirectParam   = searchParams.get('redirect') || location.state?.redirect || '/';
  const registered      = searchParams.get('registered') === '1';  // vient de s'inscrire ?
  const verifyEmailCta  = errors.verifyEmailCta === true;           // email non vérifié ?

  /* ─────────────────────────────────────────────────
     Validation locale avant envoi au serveur
     Retourne true si le formulaire est valide
  ───────────────────────────────────────────────── */
  const validate = () => {
    const e     = {};
    const email = formData.email.trim();
    const pwd   = formData.password.trim();

    if (!email)                    e.email    = MSG.required;
    else if (!isValidEmail(email)) e.email    = MSG.email;
    if (!pwd)                      e.password = MSG.required;

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ─────────────────────────────────────────────────
     Redirection après une connexion réussie
     Chaque rôle a son espace dédié
  ───────────────────────────────────────────────── */
  const needsOnboarding = (user, role) => {
    if (localStorage.getItem(`rdi_ob_${user.id}`)) return false;
    if (role === 'ADMIN') return false;
    if (role === 'GERANT') return !user.restaurant?.adresse;
    return !user.telephone;
  };

  const redirectAfterLogin = (user) => {
    const role = user.role?.toUpperCase();

    if (redirectParam === 'checkout') { navigate('/checkout'); return; }

    if (needsOnboarding(user, role)) {
      if (role === 'GERANT')      navigate('/onboarding/gerant');
      else if (role === 'B2B')    navigate('/onboarding/b2b');
      else if (role === 'STAFF')  navigate('/onboarding/staff');
      else                        navigate('/onboarding/client');
      return;
    }

    if (role === 'ADMIN')        navigate('/admin');
    else if (role === 'GERANT')  navigate('/gerant');
    else if (role === 'B2B')     navigate('/b2b/dashboard');
    else if (role === 'STAFF')   navigate('/staff');
    else                         navigate('/menu');
  };

  /* ─────────────────────────────────────────────────
     Soumission du formulaire de connexion
     - Si le compte a la 2FA activée → passe à l'étape code TOTP
     - Sinon → redirige directement
  ───────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmit(true);
    try {
      const result = await login(formData.email.trim(), formData.password.trim());

      if (!result.success) {
        /* Le backend demande un code 2FA : on passe à l'étape suivante */
        if (result.requiresTwoFactor && result.tempToken) {
          setTemp(result.tempToken);
          set2FA(true);
          setSubmit(false);
          return;
        }
        setErrors({ submit: result.error || 'Identifiants incorrects' });
        return;
      }

      redirectAfterLogin(result.user);
    } catch (err) {
      const msg = err.response?.data?.message;

      /* Cas spécial : l'utilisateur n'a pas vérifié son email */
      if (typeof msg === 'string' && msg.toLowerCase().includes('email non vérifié')) {
        setErrors({ submit: msg, verifyEmailCta: true });
      } else {
        setErrors({ submit: msg || 'Erreur lors de la connexion' });
      }
    } finally {
      setSubmit(false);
    }
  };

  /* ─────────────────────────────────────────────────
     Vérification du code TOTP (étape 2FA)
  ───────────────────────────────────────────────── */
  const handle2FA = async (e) => {
    e.preventDefault();
    if (!twoFactorCode || twoFactorCode.length < 6) {
      setErrors({ submit: 'Code à 6 chiffres requis' });
      return;
    }

    setSubmit(true);
    try {
      const { authAPI } = await import('../services/api');
      const res = await authAPI.verify2FALogin(tempToken, twoFactorCode);

      const userData = res.data?.user;
      if (!userData) throw new Error('Réponse invalide');

      /* Access token en mémoire (jamais en localStorage) */
      const token = res.data.accessToken || res.data.access_token || res.data.token;
      setAccessToken(token);
      syncUser(userData);

      redirectAfterLogin(userData);
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || 'Code invalide' });
    } finally {
      setSubmit(false);
    }
  };

  /* ═══════════════════════════════════════════════
     RENDU — Layout deux colonnes :
       gauche  → formulaire (toujours visible)
       droite  → image héro (masquée sur mobile)
     ═══════════════════════════════════════════════ */
  return (
    <div className="min-h-screen min-h-dvh flex" style={{ background: '#FFFFFF' }}>

      {/* ── Colonne gauche : formulaire ── */}
      <div className="flex-1 flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-16 xl:px-24">
        <div className="w-full max-w-sm mx-auto">

          {/* Retour à l'accueil */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>

          {/* Logo Restodici */}
          <div className="flex items-center gap-2.5 mb-10">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: '#EA580C' }}
            >
              <UtensilsCrossed className="w-[18px] h-[18px] text-white" />
            </div>
            <span className="font-bold text-lg" style={{ color: '#1A0C00' }}>
              Resto d'ici
            </span>
          </div>

          {/* Titre et sous-titre */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold" style={{ color: '#1A0C00' }}>
              {twoFactorStep ? 'Vérification' : 'Connexion'}
            </h1>
            <p className="mt-1 text-sm" style={{ color: '#8B6E50' }}>
              {twoFactorStep
                ? "Entrez le code de votre application"
                : 'Bon retour sur votre espace'}
            </p>
          </div>

          {/* Message de confirmation après inscription */}
          {registered && (
            <div
              className="mb-6 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
              style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D' }}
            >
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              Inscription réussie ! Connectez-vous maintenant.
            </div>
          )}

          {/* ── Formulaire 2FA ── */}
          {twoFactorStep ? (
            <form onSubmit={handle2FA} className="space-y-4">
              <p className="text-sm" style={{ color: '#8B6E50' }}>
                Entrez le code à 6 chiffres généré par votre application d'authentification.
              </p>

              {/* Champ du code TOTP — grand et centré pour faciliter la saisie */}
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={twoFactorCode}
                onChange={e => set2FACode(e.target.value.replace(/\s/g, ''))}
                placeholder="000000"
                className="w-full px-4 py-3 rounded-xl text-center text-2xl tracking-[0.4em] font-mono outline-none"
                style={{
                  background: '#F1F5F9',
                  border: '1.5px solid #E2E8F0',
                  color: '#1A0C00',
                }}
                autoFocus
                aria-label="Code de vérification à deux facteurs"
              />

              {errors.submit && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  {errors.submit}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm transition disabled:opacity-60"
                style={{ background: '#EA580C' }}
              >
                {isSubmitting ? 'Vérification…' : 'Valider'}
              </button>

              {/* Retour à l'étape de connexion principale */}
              <button
                type="button"
                onClick={() => { set2FA(false); set2FACode(''); setErrors({}); }}
                className="w-full py-2 text-sm"
                style={{ color: '#A89070' }}
              >
                ← Retour
              </button>
            </form>

          ) : (
            /* ── Formulaire de connexion principal ── */
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Champ Email */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold mb-1.5"
                  style={{ color: '#475569' }}
                >
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: '#A89070' }}
                  />
                  <input
                    id="login-email"
                    type="email"
                    value={formData.email}
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="vous@exemple.com"
                    required title="Email invalide (ex. nom@domaine.com)"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition"
                    style={{
                      background: '#F9F9FC',
                      border: `1.5px solid ${errors.email ? '#FCA5A5' : '#E2E8F0'}`,
                      color: '#1A0C00',
                    }}
                  />
                </div>
                {errors.email && (
                  <p id="email-error" className="text-xs text-red-500 mt-1">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Champ Mot de passe */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="text-xs font-semibold"
                    style={{ color: '#475569' }}
                  >
                    Mot de passe
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium hover:underline"
                    style={{ color: '#EA580C' }}
                  >
                    Oublié ?
                  </Link>
                </div>
                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: '#A89070' }}
                  />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition"
                    style={{
                      background: '#F9F9FC',
                      border: `1.5px solid ${errors.password ? '#FCA5A5' : '#E2E8F0'}`,
                      color: '#1A0C00',
                    }}
                  />
                  {/* Bouton afficher / masquer le mot de passe */}
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPw(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 hover:opacity-70 transition"
                    style={{ color: '#A89070' }}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="text-xs text-red-500 mt-1">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Message d'erreur global (identifiants incorrects, email non vérifié…) */}
              {errors.submit && (
                <div
                  className="rounded-xl px-4 py-3 text-sm text-red-700"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
                  role="alert"
                  aria-live="polite"
                >
                  {errors.submit}
                  {/* Lien CTA si l'email n'a pas été vérifié */}
                  {verifyEmailCta && (
                    <Link
                      to="/verify-email"
                      className="block mt-2 text-center py-1.5 px-4 rounded-lg font-semibold text-white text-xs"
                      style={{ background: '#EF4444' }}
                    >
                      Vérifier mon email
                    </Link>
                  )}
                </div>
              )}

              {/* Bouton de soumission */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm transition disabled:opacity-60 active:scale-[0.99]"
                style={{ background: '#EA580C' }}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Connexion…
                  </span>
                ) : (
                  'Se connecter'
                )}
              </button>

              {/* Lien vers l'inscription */}
              <p className="text-center text-sm pt-1" style={{ color: '#A89070' }}>
                Pas encore de compte ?{' '}
                <Link
                  to="/register"
                  className="font-semibold hover:underline"
                  style={{ color: '#16A34A', fontWeight: 700 }}
                >
                  S'inscrire
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>

      {/* ── Colonne droite : image héro — masquée sur mobile et tablette ── */}
      <div className="hidden lg:block relative w-[44%] shrink-0">
        <img
          src="/burger-hero.jpg"
          alt="Plat savoureux Restodici"
          className="absolute inset-0 w-full h-full object-cover object-center"
          loading="eager"
        />
        {/* Dégradé sombre en bas pour rendre le texte lisible */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.10) 50%, transparent 100%)',
          }}
        />
        {/* Accroche en bas de l'image */}
        <div className="absolute bottom-10 left-8 right-8">
          <p className="text-white font-bold text-xl">La table digitale</p>
          <p className="text-white/70 text-sm mt-1">
            Commandes, budgets et équipes en un seul endroit.
          </p>
        </div>
      </div>
    </div>
  );
}
