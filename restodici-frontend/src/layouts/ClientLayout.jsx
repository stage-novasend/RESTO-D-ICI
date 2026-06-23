import { Outlet, Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function ClientLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen min-h-dvh flex flex-col" style={{ background: 'var(--color-bg)' }}>

      {/* ── Header sticky ── */}
      <header
        className="sticky top-0 z-50 border-b shadow-sm"
        style={{
          background: 'rgba(255,250,243,0.96)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderColor: 'var(--color-line)',
        }}
      >
        {/* Bande kente */}
        <div style={{ display: 'flex', height: 3 }}>
          {['#FF8C00', '#FFB800', '#1A0C00', '#E07A00'].map((c, i) => (
            <div key={i} style={{ flex: 1, background: c }} />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-end h-14">

            {/* Actions droite */}
            <div className="flex items-center gap-3">

              {/* Retour à l'accueil */}
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition"
                style={{ border: '1px solid var(--color-line)', background: 'var(--color-bg-alt)', color: 'var(--color-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF8C00'; e.currentTarget.style.color = '#FF8C00'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-line)'; e.currentTarget.style.color = 'var(--color-muted)'; }}
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Accueil</span>
              </Link>

              {/* Profil */}
              <Link
                to={!user ? '/login' : user.role === 'B2B' ? '/b2b' : '/account'}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition"
                style={{ border: '1px solid var(--color-line)', background: 'var(--color-bg-alt)', color: '#FF8C00' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#FF8C00')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-line)')}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#FF8C00,#E07A00)' }}
                >
                  {(user?.prenom?.charAt(0) || user?.nom?.charAt(0) || 'P').toUpperCase()}
                </span>
                <span>{user ? 'Profil' : 'Connexion'}</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">
        <Outlet />
      </main>
    </div>
  );
}
