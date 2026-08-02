/* ═══════════════════════════════════════════════════════════════
   login.jsx — Page de connexion Restodici
   Gère : identifiants normaux + vérification 2FA (code TOTP)
   Responsive : mobile-first, image hero masquée sur petit écran
   ═══════════════════════════════════════════════════════════════ */
import { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import { BrandMark } from '../components/shared/BrandLogo';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { setAccessToken } from '../services/token-store.js';
import { isValidEmail, MSG, extractErrorMessage } from '../utils/validators';
import { needsOnboarding, onboardingPath } from '../utils/onboarding';

export default function Login() {
  const navigate       = useNavigate();
  const location       = useLocation();
  const [searchParams] = useSearchParams();
  const { login, syncUser } = useAuth();
  const { t } = useLanguage();

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
  const redirectAfterLogin = (user) => {
    const role = user.role?.toUpperCase();

    if (redirectParam === 'checkout') { navigate('/checkout'); return; }

    // needsOnboarding vit dans utils/onboarding.js : Register pose une adresse
    // factice ("À compléter") et un téléphone est exigé à l'inscription, donc
    // tester `!adresse` / `!telephone` ne détectait jamais un compte à configurer.
    if (needsOnboarding(user)) { navigate(onboardingPath(role)); return; }

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
        } else {
          setErrors({
            submit: result.error || 'Identifiants incorrects',
            verifyEmailCta: result.error?.toLowerCase().includes('vérifi') || false,
          });
        }
        return;
      }

      redirectAfterLogin(result.user);
    } catch (err) {
      setErrors({ submit: extractErrorMessage(err, 'Impossible de joindre le serveur. Vérifiez votre connexion.') });
    } finally {
      setSubmit(false);
    }
  };

  /* ─────────────────────────────────────────────────
     Soumission du code 2FA (étape secondaire)
     Valide le code TOTP avec le token temporaire
  ───────────────────────────────────────────────── */
  const handle2FA = async (e) => {
    e.preventDefault();
    if (!twoFactorCode || twoFactorCode.length < 6) {
      setErrors({ submit: 'Veuillez saisir un code à 6 chiffres' });
      return;
    }

    setSubmit(true);
    try {
      const { authAPI } = await import('../services/api');
      const res = await authAPI.verify2FALogin(tempToken, twoFactorCode.trim());
      const { access_token, user } = res.data;

      setAccessToken(access_token);
      syncUser(user);
      redirectAfterLogin(user);
    } catch (err) {
      setErrors({ submit: extractErrorMessage(err, 'Code 2FA invalide ou expiré') });
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
    <div className="min-h-screen min-h-dvh flex lg:flex-row-reverse" style={{ background: '#FFFFFF', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Colonne de droite (visuellement) : formulaire ── */}
      <div className="flex-1 flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-16 xl:px-24">
        <div className="w-full max-w-sm mx-auto">

          {/* Retour à l'accueil */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}
          >
            <ArrowLeft className="w-4 h-4" />{t('back_to_home')}</Link>

          {/* Logo Restodici */}
          <div className="flex items-center gap-2.5 mb-10">
            <BrandMark size={36} />
            <span className="font-bold text-lg" style={{ color: '#0F172A' }}>
              Resto d'ici
            </span>
          </div>

          {/* Titre et sous-titre */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>
              {twoFactorStep ? t('verification') : t('login_title')}
            </h1>
            <p className="mt-1 text-sm" style={{ color: '#64748B' }}>
              {twoFactorStep
                ? t('enter_2fa_code')
                : t('welcome_back')}
            </p>
          </div>

          {/* Message de confirmation après inscription */}
          {registered && (
            <div
              className="mb-6 flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm"
              style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D' }}
            >
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />{t('register_success_login')}</div>
          )}

          {/* ── Formulaire 2FA ── */}
          {twoFactorStep ? (
            <form onSubmit={handle2FA} className="space-y-4">
              <p className="text-sm" style={{ color: '#64748B' }}>{t('enter_6_digit_code')}</p>

              {/* Champ du code TOTP — grand et centré pour faciliter la saisie */}
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={twoFactorCode}
                onChange={e => set2FACode(e.target.value.replace(/\s/g, ''))}
                placeholder="000000"
                className="w-full px-4 py-3 rounded-lg text-center text-2xl tracking-[0.4em] font-mono outline-none"
                style={{
                  background: '#F1F5F9',
                  border: '1.5px solid #E2E8F0',
                  color: '#0F172A',
                }}
                autoFocus
                aria-label="Code de vérification à deux facteurs"
              />

              {errors.submit && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  {errors.submit}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-lg font-semibold text-white text-sm transition disabled:opacity-60"
                style={{ background: '#FF3A03' }}
              >
                {isSubmitting ? t('verification') + '…' : t('validate')}
              </button>

              {/* Retour à l'étape de connexion principale */}
              <button
                type="button"
                onClick={() => { set2FA(false); set2FACode(''); setErrors({}); }}
                className="w-full py-2 text-sm"
                style={{ color: '#94A3B8' }}
              >{t('back')}</button>
            </form>

          ) : (
            /* ── Formulaire de connexion principal ── */
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {/* Champ Email */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold mb-1.5"
                  style={{ color: '#475569' }}
                >{t('email_label')}</label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: '#94A3B8' }}
                  />
                  <input
                    id="login-email"
                    type="email"
                    value={formData.email}
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder={t('email_placeholder')}
                    required title="Email invalide (ex. nom@domaine.com)"
                    className="w-full pl-10 pr-4 py-3 rounded-lg text-sm outline-none transition"
                    style={{
                      background: '#F8FAFC',
                      border: `1.5px solid ${errors.email ? '#FCA5A5' : '#E2E8F0'}`,
                      color: '#0F172A',
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
                  >{t('password_label')}</label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium hover:underline"
                    style={{ color: '#FF3A03' }}
                  >{t('forgot_password')}</Link>
                </div>
                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: '#94A3B8' }}
                  />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder={t('password_placeholder')}
                    className="w-full pl-10 pr-10 py-3 rounded-lg text-sm outline-none transition"
                    style={{
                      background: '#F8FAFC',
                      border: `1.5px solid ${errors.password ? '#FCA5A5' : '#E2E8F0'}`,
                      color: '#0F172A',
                    }}
                  />
                  {/* Bouton afficher / masquer le mot de passe */}
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPw(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 hover:opacity-70 transition"
                    style={{ color: '#94A3B8' }}
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
                  className="rounded-lg px-4 py-3 text-sm text-red-700"
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
                    >{t('verify_email_cta')}</Link>
                  )}
                </div>
              )}

              {/* Bouton de soumission */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-lg font-semibold text-white text-sm transition disabled:opacity-60 active:scale-[0.99]"
                style={{ background: '#FF3A03' }}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{t('connecting')}</span>
                ) : (
                  t('sign_in_button')
                )}
              </button>

              {/* Lien vers l'inscription */}
              <p className="text-center text-sm pt-1" style={{ color: '#94A3B8' }}>
                {t('no_account')}{' '}
                <Link
                  to="/register"
                  className="font-semibold hover:underline"
                  style={{ color: '#16A34A', fontWeight: 700 }}
                >{t('register')}</Link>
              </p>
            </form>
          )}
        </div>
      </div>

      {/* ── Colonne de gauche (visuellement) : image héro — masquée sur mobile et tablette ── */}
      <div className="hidden lg:block relative w-[44%] shrink-0">
        <img
          src="/burger-hero.jpg"
          onError={e => { e.target.src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=95&w=1920&auto=format&fit=crop'; }}
          alt="Plat savoureux Restodici"
          className="absolute inset-0 w-full h-full object-cover object-center contrast-[1.02] brightness-[1.02]"
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
          <p className="text-white font-bold text-xl">{t('auth_hero_title')}</p>
          <p className="text-white/70 text-sm mt-1">{t('auth_hero_sub')}</p>
        </div>
      </div>
    </div>
  );
}
