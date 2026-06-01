// src/pages/Login.jsx
import { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, CheckCircle, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, syncUser } = useAuth();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const verifyEmailCta = errors.verifyEmailCta === true;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const redirectParam = searchParams.get('redirect') || location.state?.redirect || '/';
  const registered = searchParams.get('registered') === '1';

  const validateForm = () => {
    const newErrors = {};
    const trimmedEmail = formData.email.trim();
    const trimmedPassword = formData.password.trim();
    if (!trimmedEmail) newErrors.email = 'Email requis';
    else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) newErrors.email = 'Email invalide';
    if (!trimmedPassword) newErrors.password = 'Mot de passe requis';
    else if (trimmedPassword.length < 6) newErrors.password = 'Minimum 6 caractères';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const redirectAfterLogin = (userData) => {
    const userRole = userData.role?.toUpperCase();
    if (redirectParam === 'checkout') navigate('/checkout');
    else if (userRole === 'ADMIN')  navigate('/admin');
    else if (userRole === 'GERANT') navigate('/gerant');
    else if (userRole === 'B2B')    navigate('/b2b/dashboard');
    else if (userRole === 'STAFF')  navigate('/staff');
    else navigate('/menu');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const result = await login(formData.email.trim(), formData.password.trim());
      if (!result.success) {
        if (result.requiresTwoFactor && result.tempToken) {
          setTempToken(result.tempToken);
          setTwoFactorStep(true);
          setIsSubmitting(false);
          return;
        }
        setErrors({ submit: result.error || 'Erreur lors de la connexion' });
        return;
      }
      redirectAfterLogin(result.user);
    } catch (error) {
      let errorMessage = 'Erreur lors de la connexion';
      const backendMessage = error.response?.data?.message;
      if (backendMessage) {
        errorMessage = (backendMessage.includes('email must be an email') || backendMessage.includes('password must be longer'))
          ? 'Veuillez vérifier votre email et mot de passe'
          : backendMessage;
      }
      if (typeof backendMessage === 'string' && backendMessage.toLowerCase().includes('email non vérifié')) {
        setErrors({ submit: backendMessage, verifyEmailCta: true });
      } else {
        setErrors({ submit: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    if (!twoFactorCode || twoFactorCode.length < 6) { setErrors({ submit: 'Code à 6 chiffres requis' }); return; }
    setIsSubmitting(true);
    try {
      const { authAPI } = await import('../services/api');
      const res = await authAPI.verify2FALogin(tempToken, twoFactorCode);
      const userData = res.data?.user;
      if (!userData) throw new Error('Réponse invalide');
      const jwtToken = res.data.accessToken || res.data.access_token || res.data.token;
      localStorage.setItem('token', jwtToken);
      syncUser({ ...userData, token: jwtToken });
      redirectAfterLogin(userData);
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || 'Code invalide' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = (hasError) =>
    `w-full pl-10 pr-4 py-3.5 border-0 rounded-2xl text-[#1A0C00] placeholder-[#B09070]/70 text-sm focus:outline-none focus:ring-2 transition-all${hasError ? ' ring-2 ring-red-400' : ' focus:ring-[#FF8C00]/40'}`
    + ' bg-[#FFF5E8]';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-8"
      style={{ background: 'linear-gradient(135deg, #FF8C00 0%, #E07A00 60%, #FFB800 100%)' }}>

      {/* Card */}
      <div className="w-full max-w-5xl bg-white rounded-3xl overflow-hidden shadow-2xl flex h-[660px]">

        {/* Left : form */}
        <div className="flex-1 flex flex-col justify-start px-10 py-10 lg:px-12 overflow-y-auto" style={{ background: '#FFFAF3' }}>

          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
              style={{ background: 'linear-gradient(135deg,#FF8C00,#FFB800)' }}>
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight" style={{ color: '#FF8C00', fontFamily: "'Playfair Display', serif" }}>Resto d'ici</span>
              <p className="text-[11px] leading-none mt-0.5" style={{ color: '#B09070' }}>La table digitale de vos repas</p>
            </div>
          </div>

          {registered && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl px-4 py-3.5 text-sm"
              style={{ background: '#FFF5E8', border: '1px solid rgba(255,140,0,0.2)', color: '#C06800' }}>
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#FF8C00' }} />
              <span>Inscription réussie ! Vérifiez votre boîte mail avant de vous connecter.</span>
            </div>
          )}

          <h1 className="text-3xl font-extrabold mb-1" style={{ color: '#1A0C00', fontFamily: "'Playfair Display', serif" }}>
            {twoFactorStep ? 'Vérification' : 'Connexion'}
          </h1>
          <p className="text-sm mb-8" style={{ color: '#B09070' }}>
            {twoFactorStep ? "Entrez votre code d'authentification" : 'Entrez vos identifiants pour continuer'}
          </p>

          {/* 2FA */}
          {twoFactorStep ? (
            <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
              <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: '#FFF5E8', color: '#C06800' }}>
                <p className="font-semibold">Authentification à deux facteurs</p>
                <p className="mt-1 text-xs opacity-80">Entrez le code de votre application authenticator.</p>
              </div>
              <input
                type="text" inputMode="numeric" maxLength={8}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\s/g, '').toUpperCase())}
                placeholder="000000"
                className="w-full px-4 py-3.5 border-0 rounded-2xl text-center text-2xl tracking-[0.4em] font-mono focus:outline-none focus:ring-2"
                style={{ background: '#FFF5E8', color: '#1A0C00', outline: 'none' }}
                autoFocus
              />
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">{errors.submit}</div>
              )}
              <button type="submit" disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl font-bold text-white transition-colors disabled:opacity-70 text-sm shadow-sm"
                style={{ background: 'linear-gradient(135deg,#FF8C00,#E07A00)' }}>
                {isSubmitting ? 'Vérification...' : 'Valider le code'}
              </button>
              <button type="button" onClick={() => { setTwoFactorStep(false); setTwoFactorCode(''); setErrors({}); }}
                className="w-full py-2 text-sm" style={{ color: '#B09070' }}>
                ← Retour à la connexion
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold" style={{ color: '#1A0C00' }}>Adresse email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,140,0,0.6)' }} />
                    <input
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      type="email" placeholder="votre@email.com"
                      className={inputCls(errors.email)}
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold" style={{ color: '#1A0C00' }}>Mot de passe</label>
                    <Link to="/forgot-password" className="text-xs font-medium hover:opacity-80" style={{ color: '#FF8C00' }}>
                      Mot de passe oublié ?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,140,0,0.6)' }} />
                    <input
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                      className={`${inputCls(errors.password)} pr-10`}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 hover:opacity-80 transition-opacity" tabIndex={-1}
                      style={{ color: '#B09070' }}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
                </div>

                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
                    {errors.submit}
                    {verifyEmailCta && (
                      <div className="mt-3">
                        <Link to="/verify-email"
                          className="block w-full text-center py-2 px-4 rounded-xl font-bold text-white text-xs transition-opacity hover:opacity-90"
                          style={{ background: 'linear-gradient(135deg,#FF8C00,#E07A00)' }}>
                          Vérifier mon email
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                <button type="submit" disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-2xl font-bold text-white active:scale-[0.98] transition-all shadow-sm disabled:opacity-60 text-sm mt-2"
                  style={{ background: 'linear-gradient(135deg,#FF8C00,#E07A00)' }}>
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Connexion…
                    </span>
                  ) : 'Se connecter'}
                </button>
              </form>

              <p className="mt-7 text-center text-sm" style={{ color: '#B09070' }}>
                Pas encore de compte ?{' '}
                <Link to="/register" className="font-semibold hover:opacity-80" style={{ color: '#FF8C00' }}>
                  Créer un compte
                </Link>
              </p>
            </>
          )}
        </div>

        {/* Right : image */}
        <div className="hidden lg:flex lg:w-[48%] xl:w-[50%] flex-shrink-0 relative overflow-hidden items-center justify-center"
          style={{ background: '#FFF5E8' }}>
          <img
            src="/burger-hero.jpg"
            alt="Burger Resto d'ici"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(255,140,0,0.45) 0%, transparent 55%)' }} />
          <div className="absolute bottom-6 left-6 rounded-2xl px-4 py-3 shadow-lg"
            style={{ background: 'rgba(255,250,243,0.92)', backdropFilter: 'blur(12px)' }}>
            <p className="font-extrabold text-sm" style={{ color: '#FF8C00', fontFamily: "'Playfair Display', serif" }}>Resto d'ici</p>
            <p className="text-xs mt-0.5" style={{ color: '#B09070' }}>La table digitale de vos repas</p>
          </div>
        </div>

      </div>
    </div>
  );
}
