// src/layouts/GerantLayout.jsx
import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  LayoutDashboard, Package, ClipboardList, AlertTriangle, 
  TrendingUp, Settings, LogOut, ChevronRight 
} from 'lucide-react';

const MENU_ITEMS = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard, path: '/gerant' },
  { id: 'menu', label: 'Menu', icon: Package, path: '/gerant?tab=menu' },
  { id: 'orders', label: 'Commandes', icon: ClipboardList, path: '/gerant?tab=orders' },
  { id: 'stocks', label: 'Stocks', icon: AlertTriangle, path: '/gerant?tab=stocks' },
  { id: 'finance', label: 'Trésorerie', icon: TrendingUp, path: '/gerant?tab=finance' },
  { id: 'settings', label: 'Paramètres', icon: Settings, path: '/gerant?tab=settings' },
];

export default function GerantLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');
  const [restaurantName, setRestaurantName] = useState(() => {
    const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
    return cachedUser?.restaurant?.nom || user?.restaurant?.nom || '';
  });

  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'overview';

  useEffect(() => {
    const syncState = () => {
      const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
      setDarkMode(localStorage.getItem('darkMode') === 'true');
      setRestaurantName(cachedUser?.restaurant?.nom || user?.restaurant?.nom || '');
    };

    syncState();
    window.addEventListener('storage', syncState);
    window.addEventListener('gerant-dark-mode-changed', syncState);
    window.addEventListener('gerant-restaurant-updated', syncState);

    return () => {
      window.removeEventListener('storage', syncState);
      window.removeEventListener('gerant-dark-mode-changed', syncState);
      window.removeEventListener('gerant-restaurant-updated', syncState);
    };
  }, [user?.restaurant?.nom]);

  const handleNav = (path) => navigate(path);
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className={`flex min-h-screen ${darkMode ? 'gerant-theme-dark bg-[#111827] text-slate-100' : 'bg-gradient-to-b from-[#FDFCFB] via-white to-[#FFF7F2]'}`}>
      <style>{`
        .gerant-theme-dark {
          background: linear-gradient(180deg, #111827 0%, #0f172a 55%, #020617 100%);
          color: #e5eef9;
        }
        .gerant-theme-dark aside {
          background: linear-gradient(180deg, rgba(234, 88, 12, 0.98) 0%, rgba(194, 65, 12, 0.97) 100%);
          border-color: rgba(255,255,255,0.12);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
        }
        .gerant-theme-dark main {
          background: transparent;
        }
        .gerant-theme-dark .rounded-3xl,
        .gerant-theme-dark .rounded-[28px],
        .gerant-theme-dark .rounded-[26px],
        .gerant-theme-dark .rounded-[24px],
        .gerant-theme-dark .rounded-[22px] {
          box-shadow: 0 18px 45px rgba(2, 6, 23, 0.28);
        }
        .gerant-theme-dark [class*='bg-white'] {
          background: rgba(15, 23, 42, 0.88) !important;
          color: #e2e8f0;
        }
        .gerant-theme-dark [class*='from-violet-50'],
        .gerant-theme-dark [class*='from-emerald-50'],
        .gerant-theme-dark [class*='from-amber-50'],
        .gerant-theme-dark [class*='from-rose-50'],
        .gerant-theme-dark [class*='from-sky-50'],
        .gerant-theme-dark [class*='from-orange-50'],
        .gerant-theme-dark [class*='from-cyan-50'],
        .gerant-theme-dark [class*='from-fuchsia-50'],
        .gerant-theme-dark [class*='from-teal-50'],
        .gerant-theme-dark [class*='from-[#FFF5EB]'],
        .gerant-theme-dark [class*='from-[#FDFCFB]'] {
          background-image: linear-gradient(135deg, rgba(15, 23, 42, 0.97), rgba(30, 41, 59, 0.94)) !important;
          color: #e2e8f0;
        }
        .gerant-theme-dark [class*='border-'] {
          border-color: rgba(148, 163, 184, 0.22) !important;
        }
        .gerant-theme-dark h1,
        .gerant-theme-dark h2,
        .gerant-theme-dark h3,
        .gerant-theme-dark h4,
        .gerant-theme-dark h5,
        .gerant-theme-dark h6,
        .gerant-theme-dark [class*='text-[#2D2720]'] {
          color: #f8fafc !important;
        }
        .gerant-theme-dark p,
        .gerant-theme-dark span,
        .gerant-theme-dark label,
        .gerant-theme-dark [class*='text-[#7A6A58]'],
        .gerant-theme-dark [class*='text-[#8B7355]'],
        .gerant-theme-dark [class*='text-[#5F6C72]'] {
          color: #cbd5e1 !important;
        }
        .gerant-theme-dark input,
        .gerant-theme-dark textarea,
        .gerant-theme-dark select {
          background: rgba(15, 23, 42, 0.92) !important;
          color: #f8fafc !important;
          border-color: rgba(148, 163, 184, 0.22) !important;
        }
        .gerant-theme-dark canvas {
          filter: saturate(1.05) brightness(0.98);
        }
      `}</style>
      <aside className={`fixed left-0 top-0 z-50 h-full border-r border-[#FFD8CC] bg-gradient-to-b from-[#FFF8F3] via-[#FFFDFB] to-[#FFF1E8] shadow-[0_18px_50px_rgba(255,107,53,0.10)] transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-72'
      }`}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 flex h-7 w-7 items-center justify-center rounded-full bg-[#FF6B35] text-white shadow-md transition hover:bg-[#E85A29]"
          aria-label={collapsed ? 'Développer' : 'Réduire'}
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>

        <div className="border-b border-[#FFE3DA] px-4 py-5">
          {!collapsed ? (
            <div className="rounded-[24px] border border-[#FFD8CC] bg-gradient-to-r from-[#FFF4EF] via-white to-[#FFF8F3] p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FF6B35]">
                Espace gérant
              </p>
              <h2 className="mt-2 text-lg font-bold text-[#2D2720]">Resto d'ici</h2>
              {restaurantName && (
                <p className="mt-2 truncate text-sm font-medium text-[#FF6B35]">
                  {restaurantName}
                </p>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF6B35] text-sm font-bold text-white shadow-sm">
                RD
              </div>
            </div>
          )}
        </div>

        <nav className="space-y-2 px-3 py-4">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.path)}
                className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all ${
                  isActive
                    ? 'bg-[#FF6B35] text-white shadow-[0_12px_30px_rgba(255,107,53,0.22)]'
                    : 'text-[#5F6C72] hover:bg-[#FFF4EF] hover:text-[#2D2720]'
                } ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <span
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl transition-all ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-[#FF6B35] shadow-sm group-hover:bg-[#FFF1E8] group-hover:text-[#FF6B35]'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {!collapsed && (
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className={`block text-xs ${isActive ? 'text-white/85' : 'text-[#8B7355]'}`}>
                      {item.id === 'overview' && 'Pilotage global'}
                      {item.id === 'menu' && 'Catalogue & catégories'}
                      {item.id === 'orders' && 'Flux opérationnel'}
                      {item.id === 'stocks' && 'Inventaire & alertes'}
                      {item.id === 'finance' && 'CA & dépenses'}
                      {item.id === 'settings' && 'Équipe & réglages'}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-[#FFE3DA] bg-white/90 px-4 py-4 backdrop-blur">
          {!collapsed && (
            <div className="mb-3 rounded-2xl bg-[#FDFCFB] px-3 py-2.5">
              <p className="text-xs text-[#8B7355]">Connecté en tant que</p>
              <p className="truncate text-sm font-semibold text-[#2D2720]">{user?.nom}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-[#FF6B35] transition hover:bg-[#FFF4EF] ${
              collapsed ? 'justify-center px-2' : ''
            }`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-semibold">Déconnexion</span>}
          </button>
        </div>
      </aside>

      <main className={`flex-1 overflow-y-auto p-6 lg:p-8 transition-all duration-300 ${
        collapsed ? 'ml-20' : 'ml-72'
      }`}>
        <Outlet />
      </main>
    </div>
  );
}