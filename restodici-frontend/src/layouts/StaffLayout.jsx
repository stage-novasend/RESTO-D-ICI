// src/layouts/StaffLayout.jsx
import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  ChefHat, Package, ClipboardList, LogOut, UtensilsCrossed, X, Menu,
} from 'lucide-react';

const MENU_ITEMS = [
  { id: 'staff',  label: 'Dashboard',    icon: ChefHat,       path: '/staff' },
  { id: 'kds',    label: 'KDS complet',  icon: ClipboardList, path: '/staff/kds' },
  { id: 'stocks', label: 'Stocks',       icon: Package,       path: '/staff?tab=stocks' },
];

const SIDEBAR_BG = '#181A20';
const ACCENT     = '#FF8C00';

function Avatar({ name = '', size = 34 }) {
  const ini = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'S';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: '#2C2F3A', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700,
    }}>
      {ini}
    </div>
  );
}

function Sidebar({ mobile = false, onClose, user, activeId, navigate, showLogout }) {
  const nom = [user?.prenom, user?.nom].filter(Boolean).join(' ') || user?.nom || 'Staff';
  const restaurant = (() => {
    try {
      const cached = JSON.parse(localStorage.getItem('user') || '{}');
      return cached?.restaurant?.nom || user?.restaurant?.nom || '';
    } catch { return ''; }
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: SIDEBAR_BG }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <UtensilsCrossed style={{ width: 18, height: 18, color: '#fff' }} />
        </div>
        <div style={{ lineHeight: 1.25, flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#FDF5EF', margin: 0 }}>Resto d'ici</p>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.18em', textTransform: 'uppercase', margin: 0 }}>Staff</p>
        </div>
        {mobile && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', lineHeight: 0 }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {MENU_ITEMS.map(item => {
          const Icon = item.icon;
          const active = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { navigate(item.path); onClose?.(); }}
              title={item.label}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', border: 'none', borderRadius: 12,
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                background: active ? ACCENT : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User card + logout */}
      <div style={{ padding: '12px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px' }}>
          <Avatar name={nom} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nom}</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{restaurant || 'Restaurant'}</p>
          </div>
          <button
            onClick={showLogout}
            title="Déconnexion"
            style={{ width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.35)', transition: 'color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
          >
            <LogOut style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StaffLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sideOpen, setSideOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => { setSideOpen(false); }, [location.pathname]);

  const activeId = (() => {
    if (location.pathname.startsWith('/staff/kds')) return 'kds';
    const tab = new URLSearchParams(location.search).get('tab');
    if (tab === 'stocks') return 'stocks';
    return 'staff';
  })();

  const confirmLogout = () => { logout(); navigate('/login'); setShowLogoutModal(false); };

  const sidebarProps = {
    user,
    activeId,
    navigate,
    showLogout: () => setShowLogoutModal(true),
  };

  return (
    <div className="flex min-h-screen" style={{ background: '#F4F6F8' }}>

      {/* ── Desktop sidebar (fixed, w-56) ── */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 fixed left-0 top-0 bottom-0 z-40">
        <Sidebar {...sidebarProps} />
      </aside>

      {/* ── Mobile overlay ── */}
      {sideOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSideOpen(false)}
          />
          <aside className="fixed left-0 top-0 bottom-0 z-50 w-56 flex flex-col lg:hidden">
            <Sidebar {...sidebarProps} mobile onClose={() => setSideOpen(false)} />
          </aside>
        </>
      )}

      {/* ── Mobile hamburger ── */}
      <button
        className="lg:hidden fixed top-4 left-4 z-30 w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#E8E2D9] shadow-sm"
        onClick={() => setSideOpen(true)}
      >
        <Menu style={{ width: 16, height: 16, color: '#6B7280' }} />
      </button>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto lg:ml-56">
        <Outlet />
      </main>

      {/* ── Logout modal ── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-[#0F172A]">Confirmer la déconnexion ?</h3>
            <p className="mb-6 text-sm text-[#737373]">Vous serez redirigé vers la page de connexion.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutModal(false)} className="flex-1 rounded-xl border border-[#E2E8F0] px-4 py-2.5 font-medium text-[#0F172A] transition hover:bg-[#F9F7F5]">Annuler</button>
              <button onClick={confirmLogout} className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 font-medium text-white transition hover:bg-red-700">Déconnexion</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
