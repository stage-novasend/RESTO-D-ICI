import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { Mail, Lock, UtensilsCrossed } from 'lucide-react';

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError('');
      await login({ email: data.email, password: data.password });
    } catch (err) {
      setError(err.response?.data?.message || 'Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-2">
            <UtensilsCrossed className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold font-headline text-primary-700">Resto d'ici</h1>
          <p className="text-neutral-600 text-sm">Bienvenue à la table digitale.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">Email ou téléphone</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                {...register('email', { required: 'L\'email est requis', pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Email invalide' } })}
                type="email"
                placeholder="Votre identifiant"
                className="block w-full pl-10 pr-3 py-3 border border-neutral-200 rounded-lg bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">Mot de passe</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                {...register('password', { required: 'Le mot de passe est requis', minLength: { value: 6, message: 'Minimum 6 caractères' } })}
                type="password"
                placeholder="••••••••"
                className="block w-full pl-10 pr-3 py-3 border border-neutral-200 rounded-lg bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
            {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
          </div>

          <div className="text-right">
            <button type="button" className="text-sm text-primary-700 hover:text-primary-600 font-medium transition-colors">
              Mot de passe oublié ?
            </button>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white font-medium bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion...' : 'Se connecter →'}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-200"></div></div>
          <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-neutral-500">ou</span></div>
        </div>

        <Link to="/register" className="block w-full py-3 px-4 border-2 border-primary-700 rounded-lg text-center text-primary-700 font-medium hover:bg-primary-50 transition-colors">
          Créer un compte
        </Link>
      </div>
    </div>
  );
}