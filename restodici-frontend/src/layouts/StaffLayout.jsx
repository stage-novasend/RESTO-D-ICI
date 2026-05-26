// src/layouts/StaffLayout.jsx
import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  ChefHat, Package, ClipboardList, LogOut, ChevronRight, UtensilsCrossed
} from 'lucide-react';

const MENU_ITEMS = [
  { id: 'staff',    label: 'KDS en direct',  sub: 'Flux commandes cuisine',  icon: ChefHat,       path: '/staff',     exact: true },
  { id: 'kds',      label: 'KDS complet',    sub: 'Vue plein écran',          icon: ClipboardList, path: '/staff/kds' },
  { id: 'stocks',   label: 'Stocks & alertes', sub: 'Inventaire temps réel', icon: Package,       path: '/staff#stocks' },
];

export default function StaffLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [restaurantName, setRestaurantName] = useState(() => {
    const cached = JSON.parse(localStorage.getItem('user') || '{}');
    return cached?.restaurant?.nom || user?.restaurant?.nom || '';
  });

  useEffect(() => {
    const sync = () => {
      const cached = JSON.parse(localStorage.getItem('user') || '{}');
      setRestaurantName(cached?.restaurant?.nom || user?.restaurant?.nom || '');
    };
    sync();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [user?.restaurant?.nom]);

  const getActiveId = () => {
    const p = location.pathname;
    if (p === '/staff/kds' || p.startsWith('/staff/kds')) return 'kds';
    return 'staff';
  };
  const activeId = getActiveId();

  const confirmLogout = () => { logout(); navigate('/login'); setShowLogoutModal(false); };

  return (
    <div className="flex min-h-screen bg-[#F4F6F8]">
      <style>{`
        .staff-nav-hover:hover { background: rgba(13,148,136,0.12) !important; }
      `}</style>

      {/* ── Sidebar ── */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}
        style={{ background: '#0F172A', borderRight: '1px solid rgba(255,255,255,0.06)', boxShadow: '4px 0 24px rgba(0,0,0,0.18)' }}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 flex h-7 w-7 items-center justify-center rounded-full text-white shadow-md transition"
          style={{ background: '#0D9488' }}
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>

        {/* Brand */}
        <div style={{ padding: collapsed ? '20px 0' : '20px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {!collapsed ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#C05015', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <UtensilsCrossed style={{ width: 18, height: 18, color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: '#0D9488', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>Espace Staff</p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#FDF5EF', margin: 0, lineHeight: 1.2 }}>Resto d'ici</p>
                </div>
              </div>
              {restaurantName && (
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '6px 10px' }}>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', margin: '0 0 1px' }}>Restaurant actif</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{restaurantName}</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#C05015', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UtensilsCrossed style={{ width: 18, height: 18, color: '#fff' }} />
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 12,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  width: '100%', padding: collapsed ? '12px' : '10px 12px',
                  border: 'none', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  background: isActive ? '#0D9488' : 'transparent',
                  boxShadow: isActive ? '0 4px 14px rgba(13,148,136,0.35)' : 'none',
                  transition: 'all 0.18s',
                }}
                className={isActive ? '' : 'staff-nav-hover'}
              >
                <span style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)', color: isActive ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'all 0.18s' }}>
                  <Icon style={{ width: 16, height: 16 }} />
                </span>
                {!collapsed && (
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: isActive ? '#fff' : 'rgba(255,255,255,0.75)', lineHeight: 1.3 }}>{item.label}</span>
                    <span style={{ display: 'block', fontSize: 10, color: isActive ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.35)', marginTop: 1 }}>{item.sub}</span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderTop: '1px solid rgba(255,255,255,0.07)', padding: collapsed ? '12px 0' : '12px 10px' }}>
          {!collapsed && (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 9, padding: '8px 12px', marginBottom: 8 }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: '0 0 2px' }}>Connecté en tant que</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.nom}</p>
            </div>
          )}
          <button
            onClick={() => setShowLogoutModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, justifyContent: collapsed ? 'center' : 'flex-start', width: '100%', padding: collapsed ? '10px' : '10px 12px', border: 'none', borderRadius: 9, cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,0.4)', transition: 'all 0.2s' }}
            className="staff-nav-hover"
          >
            <LogOut style={{ width: 16, height: 16, flexShrink: 0 }} />
            {!collapsed && <span style={{ fontSize: 12, fontWeight: 600 }}>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className={`flex-1 overflow-y-auto transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}>
        <Outlet />
      </main>

      {/* Logout modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-[#0F172A]">Confirmer la déconnexion ?</h3>
            <p className="mb-6 text-sm text-[#737373]">Vous serez redirigé vers la page de connexion.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutModal(false)} className="flex-1 rounded-xl border border-[#E2E8F0] px-4 py-2.5 font-medium text-[#0F172A] transition hover:bg-white">Annuler</button>
              <button onClick={confirmLogout} className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 font-medium text-white transition hover:bg-red-700">Déconnexion</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
