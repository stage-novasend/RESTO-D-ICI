import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { authService } from '../services/auth.service';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, UtensilsCrossed } from 'lucide-react';

export default function Register() {
  const { register: registerForm, handleSubmit, formState: { errors }, watch } = useForm();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const password = watch('password');

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError('');
      await authService.register({
        email: data.email,
        password: data.password,
        nom: data.nom,
        telephone: data.telephone
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary-100 mb-2">
            <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold font-headline text-neutral-800">Compte créé avec succès !</h2>
          <p className="text-neutral-600">Redirection vers la page de connexion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 mb-3">
            <UtensilsCrossed className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold font-headline text-primary-700">Resto d'ici</h1>
          <p className="text-neutral-600 text-sm mt-1">Rejoignez la table.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold font-headline text-neutral-800 mb-6">Créer un compte</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Nom complet</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-5 w-5 text-neutral-400" /></div>
                <input {...registerForm('nom', { required: 'Le nom est requis' })} type="text" placeholder="Votre nom complet" className="block w-full pl-10 pr-3 py-3 border border-neutral-200 rounded-lg bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" />
              </div>
              {errors.nom && <p className="text-sm text-red-500">{errors.nom.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-neutral-400" /></div>
                <input {...registerForm('email', { required: 'L\'email est requis', pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Email invalide' } })} type="email" placeholder="votre@email.com" className="block w-full pl-10 pr-3 py-3 border border-neutral-200 rounded-lg bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" />
              </div>
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Téléphone</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone className="h-5 w-5 text-neutral-400" /></div>
                <input {...registerForm('telephone', { required: 'Le téléphone est requis', pattern: { value: /^\+?[0-9\s]{8,15}$/, message: 'Numéro invalide' } })} type="tel" placeholder="+225 01 23 45 67" className="block w-full pl-10 pr-3 py-3 border border-neutral-200 rounded-lg bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" />
              </div>
              {errors.telephone && <p className="text-sm text-red-500">{errors.telephone.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Mot de passe</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-neutral-400" /></div>
                <input {...registerForm('password', { required: 'Le mot de passe est requis', minLength: { value: 6, message: 'Minimum 6 caractères' } })} type="password" placeholder="••••••••" className="block w-full pl-10 pr-3 py-3 border border-neutral-200 rounded-lg bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" />
              </div>
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Confirmer mot de passe</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-neutral-400" /></div>
                <input {...registerForm('confirmPassword', { required: 'Veuillez confirmer le mot de passe', validate: value => value === password || 'Les mots de passe ne correspondent pas' })} type="password" placeholder="••••••••" className="block w-full pl-10 pr-3 py-3 border border-neutral-200 rounded-lg bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" />
              </div>
              {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

            <button type="submit" disabled={loading} className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-white font-medium bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-200"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-neutral-500">ou</span></div>
          </div>

          <button type="button" className="w-full flex items-center justify-center py-3 px-4 border border-neutral-200 rounded-lg shadow-sm bg-neutral-50 hover:bg-neutral-100 transition-colors">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-neutral-700 font-medium">S'inscrire avec Google</span>
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-neutral-600">
          Déjà un compte ?{' '}
          <Link to="/login" className="font-medium text-primary-700 hover:text-primary-600 transition-colors">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}