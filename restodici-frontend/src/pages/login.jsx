// src/pages/Login.jsx
import { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, UserPlus, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const verifyEmailCta = errors.verifyEmailCta === true;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get redirect parameter from URL
  const redirectParam = searchParams.get('redirect') || location.state?.redirect || '/';
  const registered = searchParams.get('registered') === '1';

  const validateForm = () => {
    const newErrors = {};
    
    // Trim whitespace from email and password
    const trimmedEmail = formData.email.trim();
    const trimmedPassword = formData.password.trim();
    
    if (!trimmedEmail) {
      newErrors.email = 'Email requis';
    } else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      newErrors.email = 'Email invalide';
    }
    
    if (!trimmedPassword) {
      newErrors.password = 'Mot de passe requis';
    } else if (trimmedPassword.length < 6) {
      newErrors.password = 'Minimum 6 caractères';
    } else if (typeof trimmedPassword !== 'string') {
      newErrors.password = 'Mot de passe doit être une chaîne de caractères';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form first
    if (!validateForm()) return;

    // Ensure we're sending trimmed, clean data
    const loginData = {
      email: formData.email.trim(),
      password: formData.password.trim()
    };

    setIsSubmitting(true);
    try {
      const result = await login(loginData.email, loginData.password);
      if (!result.success) {
        setErrors({ submit: result.error || 'Erreur lors de la connexion' });
        return;
      }
      const userData = result.user;

      // DEBUG: Log exactly what we received from backend
      console.log('Login successful - User data received:', userData);
      console.log('User role:', userData.role);
      
      // Robust role-based redirection
      const userRole = userData.role?.toUpperCase();
      
      if (redirectParam === 'checkout') {
        console.log('Redirecting to checkout');
        navigate('/checkout');
      } 
      // Restaurant Manager (GERANT)
      else if (userRole === 'GERANT') {
        console.log('Redirecting GERANT to /gerant');
        navigate('/gerant');
      } 
      // Business Client (B2B)  
      else if (userRole === 'B2B') {
        console.log('Redirecting B2B to /b2b/dashboard');
        navigate('/b2b/dashboard');
      }
      // Staff opérationnel
      else if (userRole === 'STAFF') {
        console.log('Redirecting STAFF to /staff');
        navigate('/staff');
      }
      // Regular Customer (CLIENT) or any other role
      else {
        console.log('Redirecting to /menu (role:', userRole, ')');
        navigate('/menu');
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Erreur lors de la connexion';
      let backendMessage;

      if (error.response?.data?.message) {
        backendMessage = error.response.data.message;
        if (backendMessage.includes('email must be an email') || 
            backendMessage.includes('password must be longer than or equal to 6 characters')) {
          errorMessage = 'Veuillez vérifier votre email et mot de passe';
        } else {
          errorMessage = backendMessage;
        }
      }

      if (typeof backendMessage === 'string' && backendMessage.toLowerCase().includes('email non vérifié')) {
        setErrors({
          submit: backendMessage,
          verifyEmailCta: true,
        });
      } else {
        setErrors({ submit: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitleAndSubtitle = () => {
    return {
      title: 'Resto d\'ici',
      subtitle: 'Connexion unique pour tous les utilisateurs'
    };
  };

  const { title, subtitle } = getTitleAndSubtitle();

  return (
    <div className="min-h-screen bg-[#F9F7F5] flex items-center justify-center p-4">
      {registered && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-lg px-4">
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 text-sm shadow-sm">
            Inscription réussie. Veuillez vous connecter pour accéder à votre espace.
          </div>
        </div>
      )}
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 space-y-6 border border-[#E8E2D9]">
        
        {/* Logo + Titre */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FFF5EB] mb-2">
            <UtensilsCrossed className="w-8 h-8 text-[#D94500]" />
          </div>
          <h1 className="text-3xl font-bold text-[#2D2720]">{title}</h1>
          <p className="text-[#8B7355] text-sm">{subtitle}</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#2D2720]">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-[#8B7355]" />
              <input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                type="email"
                placeholder="votre@email.com"
                className="block w-full pl-10 pr-3 py-3 bg-[#F9F7F5] border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D94500] focus:border-transparent transition-all"
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#2D2720]">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-[#8B7355]" />
              <input
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                type="password"
                placeholder="••••••••"
                className="block w-full pl-10 pr-3 py-3 bg-[#F9F7F5] border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D94500] focus:border-transparent transition-all"
              />
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          {/* Erreur globale */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {errors.submit}
              {verifyEmailCta && (
                <div className="mt-4 space-y-2">
                  <Link
                    to="/verify-email"
                    className="block w-full text-center py-2 px-4 rounded-xl font-bold bg-[#2ECC71] text-white hover:bg-[#27AE60] transition-colors"
                  >
                    Vérifier mon email
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 px-4 rounded-2xl font-bold text-white bg-[#D94500] hover:bg-[#B83A00] transition-colors ${
              isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        {/* Google sign-in removed */}

        {/* Liens supplémentaires */}
        <div className="pt-4 border-t border-[#E8E2D9] space-y-3">
          <div className="flex justify-between items-center">
            <Link 
              to="/forgot-password" 
              className="text-[#8B7355] hover:text-[#2D2720] text-sm font-medium"
            >
              Mot de passe oublié ?
            </Link>
            <Link 
              to="/register" 
              className="flex items-center text-[#2ECC71] font-medium hover:underline text-sm"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Créer un compte
            </Link>
          </div>
          
          <Link 
            to="/" 
            className="flex items-center text-[#8B7355] hover:text-[#2D2720] text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}