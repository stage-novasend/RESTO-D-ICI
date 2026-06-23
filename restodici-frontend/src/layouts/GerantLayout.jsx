/* ═══════════════════════════════════════════════════════════════
   GerantLayout.jsx — Mise en page pour les gérants de restaurant
   Contient : sidebar claire collapsible + hamburger mobile
   Accès    : rôle GERANT uniquement
   ═══════════════════════════════════════════════════════════════ */
import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, Package, ClipboardList, AlertTriangle,
  TrendingUp, Settings, LogOut, ChevronRight, UtensilsCrossed, Activity, Menu, X, Tag,
} from 'lucide-react';

/* ── Éléments de la navigation sidebar ── */
const MENU_ITEMS = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard, path: '/gerant' },
  { id: 'menu', label: 'Menu', icon: Package, path: '/gerant?tab=menu' },
  { id: 'orders', label: 'Commandes', icon: ClipboardList, path: '/gerant?tab=orders' },
  { id: 'stocks', label: 'Stocks', icon: AlertTriangle, path: '/gerant?tab=stocks' },
  { id: 'finance', label: 'Trésorerie', icon: TrendingUp, path: '/gerant?tab=finance' },
  { id: 'promos', label: 'Promotions', icon: Tag, path: '/gerant?tab=promos' },
  { id: 'history', label: 'Historique', icon: Activity, path: '/gerant?tab=history' },
{ id: 'settings', label: 'Paramètres', icon: Settings, path: '/gerant?tab=settings' },
];

export default function GerantLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed,       setCollapsed]       = useState(false);
  const [mobileOpen,      setMobileOpen]      = useState(false);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');
  const [restaurantName, setRestaurantName] = useState(() => {
    const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
    return cachedUser?.restaurant?.nom || user?.restaurant?.nom || '';
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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

  /* Ferme aussi le menu mobile après navigation */
  const handleNav = (path) => { navigate(path); setMobileOpen(false); };
  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    logout();
    navigate('/login');
    setShowLogoutModal(false);
  };

  return (
    <div className={`flex min-h-screen ${darkMode ? 'bg-[#0C1220]' : 'bg-[#F5F6F8]'}`}>
      {/* ── Styles dynamiques : corrections mode sombre ── */}
      <style>{`
        .gerant-theme-dark [class*='bg-white'] { background: rgba(15,23,42,0.88) !important; color: #e2e8f0; }
        .gerant-theme-dark [class*='border-[#E2E8F0]'] { border-color: rgba(148,163,184,0.15) !important; }
        .gerant-theme-dark canvas { filter: saturate(1.05) brightness(0.98); }
        .gerant-theme-dark input, .gerant-theme-dark textarea, .gerant-theme-dark select {
          background: rgba(15,23,42,0.92) !important; color: #f8fafc !important;
          border-color: rgba(148,163,184,0.2) !important;
        }
        .nav-item-hover:hover { background: rgba(255,140,0,0.08) !important; }
      `}</style>

      {/* ── Sidebar bureau — masquée sur mobile, toujours visible sur écran ≥ 1024px ── */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'} hidden lg:block`}
        style={{ background: '#FFFFFF', borderRight: '1px solid rgba(0,0,0,0.07)', boxShadow: '4px 0 20px rgba(0,0,0,0.05)' }}
      >
        {/* ── Bouton collapse : réduire / agrandir la sidebar ── */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 flex h-7 w-7 items-center justify-center rounded-full text-white shadow-md transition"
          style={{ background: '#FF8C00' }}
          aria-label={collapsed ? 'Développer' : 'Réduire'}
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>

        {/* ── Logo + nom du restaurant actif ── */}
        <div style={{ padding: collapsed ? '20px 0' : '20px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          {!collapsed ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FF8C00', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <UtensilsCrossed style={{ width: 18, height: 18, color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: '#FF8C00', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>Espace gérant</p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#1F2937', margin: 0, lineHeight: 1.2 }}>Resto d'ici</p>
                </div>
              </div>
              {restaurantName && (
                <div style={{ background: 'rgba(255,140,0,0.07)', borderRadius: 8, padding: '6px 10px' }}>
                  <p style={{ fontSize: 10, color: '#9CA3AF', margin: '0 0 1px' }}>Restaurant actif</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{restaurantName}</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FF8C00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UtensilsCrossed style={{ width: 18, height: 18, color: '#fff' }} />
              </div>
            </div>
          )}
        </div>

        {/* ── Navigation principale ── */}
        <nav style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.path)}
                title={collapsed ? item.label : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 12,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  width: '100%', padding: collapsed ? '12px' : '10px 12px',
                  border: 'none', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  background: isActive ? '#FF8C00' : 'transparent',
                  boxShadow: isActive ? '0 4px 14px rgba(255,140,0,0.30)' : 'none',
                  transition: 'all 0.18s',
                }}
                className={isActive ? '' : 'nav-item-hover'}
              >
                <span style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isActive ? 'rgba(255,255,255,0.22)' : 'rgba(255,140,0,0.10)', color: isActive ? '#fff' : '#FF8C00', transition: 'all 0.18s' }}>
                  <Icon style={{ width: 16, height: 16 }} />
                </span>
                {!collapsed && (
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: isActive ? '#fff' : '#374151', lineHeight: 1.3 }}>{item.label}</span>
                    <span style={{ display: 'block', fontSize: 10, color: isActive ? 'rgba(255,255,255,0.70)' : '#9CA3AF', marginTop: 1 }}>
                      {item.id === 'overview' && 'Pilotage global'}
                      {item.id === 'menu' && 'Catalogue & catégories'}
                      {item.id === 'orders' && 'Flux opérationnel'}
                      {item.id === 'stocks' && 'Inventaire & alertes'}
                      {item.id === 'finance' && 'CA & dépenses'}
                      {item.id === 'promos' && 'Codes & réductions'}
                      {item.id === 'history' && 'Audit & traces'}
                      {item.id === 'settings' && 'Équipe & réglages'}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Pied de sidebar : info utilisateur + déconnexion ── */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderTop: '1px solid rgba(0,0,0,0.06)', padding: collapsed ? '12px 0' : '12px 10px' }}>
          {!collapsed && (
            <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 9, padding: '8px 12px', marginBottom: 8 }}>
              <p style={{ fontSize: 10, color: '#9CA3AF', margin: '0 0 2px' }}>Connecté en tant que</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.nom}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, justifyContent: collapsed ? 'center' : 'flex-start', width: '100%', padding: collapsed ? '10px' : '10px 12px', border: 'none', borderRadius: 9, cursor: 'pointer', background: 'transparent', color: '#9CA3AF', transition: 'all 0.2s' }}
            className="nav-item-hover"
          >
            <LogOut style={{ width: 16, height: 16, flexShrink: 0 }} />
            {!collapsed && <span style={{ fontSize: 12, fontWeight: 600 }}>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* ── Overlay mobile — fond semi-transparent quand la sidebar est ouverte ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar mobile — slide-in depuis la gauche sur téléphone/tablette ── */}
      {mobileOpen && (
        <aside
          className="fixed left-0 top-0 z-50 h-full w-64 lg:hidden"
          style={{ background: '#FFFFFF', boxShadow: '4px 0 24px rgba(0,0,0,0.12)' }}
        >
          {/* Bouton fermer */}
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute top-4 right-3 flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', color: '#6B7280' }}
            aria-label="Fermer le menu"
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
          {/* Réutilise le même contenu que la sidebar bureau */}
          <div style={{ padding: '20px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FF8C00', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <UtensilsCrossed style={{ width: 18, height: 18, color: '#fff' }} />
              </div>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#FF8C00', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>Espace gérant</p>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#1F2937', margin: 0, lineHeight: 1.2 }}>Resto d'ici</p>
              </div>
            </div>
            {restaurantName && (
              <div style={{ background: 'rgba(255,140,0,0.07)', borderRadius: 8, padding: '6px 10px' }}>
                <p style={{ fontSize: 10, color: '#9CA3AF', margin: '0 0 1px' }}>Restaurant actif</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{restaurantName}</p>
              </div>
            )}
          </div>
          <nav style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    justifyContent: 'flex-start',
                    width: '100%', padding: '10px 12px',
                    border: 'none', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    background: isActive ? '#FF8C00' : 'transparent',
                    boxShadow: isActive ? '0 4px 14px rgba(255,140,0,0.30)' : 'none',
                    transition: 'all 0.18s',
                  }}
                  className={isActive ? '' : 'nav-item-hover'}
                >
                  <span style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isActive ? 'rgba(255,255,255,0.22)' : 'rgba(255,140,0,0.10)', color: isActive ? '#fff' : '#FF8C00' }}>
                    <Icon style={{ width: 16, height: 16 }} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: isActive ? '#fff' : '#374151', lineHeight: 1.3 }}>{item.label}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>
      )}

      {/* ── Bouton hamburger — visible sur mobile / tablette uniquement ── */}
      <button
        className="lg:hidden fixed top-4 left-4 z-30 w-9 h-9 flex items-center justify-center rounded-xl shadow-sm"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)' }}
        onClick={() => setMobileOpen(true)}
        aria-label="Ouvrir le menu"
      >
        <Menu style={{ width: 16, height: 16, color: '#FF8C00' }} />
      </button>

      {/* ── Contenu principal ── */}
      <main className={`flex-1 overflow-y-auto p-6 lg:p-8 transition-all duration-300 ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <Outlet />
      </main>

      {/* ── Modal de confirmation de déconnexion ── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-[#0F172A]">Confirmer la déconnexion ?</h3>
            <p className="mb-6 text-sm text-[#737373]">Vous serez redirigé vers la page de connexion.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 rounded-xl border border-[#E2E8F0] px-4 py-2.5 font-medium text-[#0F172A] transition hover:bg-white"
              >
                Annuler
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 font-medium text-white transition hover:bg-red-700"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
