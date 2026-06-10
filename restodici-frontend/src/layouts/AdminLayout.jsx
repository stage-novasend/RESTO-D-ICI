/* ═══════════════════════════════════════════════════════════════
   AdminLayout.jsx — Mise en page pour les administrateurs système
   Contient : sidebar collapsible + hamburger mobile + modal déconnexion
   Accès    : rôle ADMIN uniquement
   ═══════════════════════════════════════════════════════════════ */
import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, Users, UtensilsCrossed, ScrollText,
  Download, Settings, LogOut, ChevronRight, X, Menu,
  Truck, BarChart2, Percent,
} from 'lucide-react';

/* ── Palette de couleurs ── */
const ACCENT  = '#2563EB';
const SIDEBAR = '#FFFFFF';

/* ── Éléments de la navigation sidebar ── */
const MENU_ITEMS = [
  { id: 'overview',     label: 'Vue d\'ensemble', sub: 'Pilotage plateforme',  icon: LayoutDashboard, path: '/admin' },
  { id: 'users',        label: 'Utilisateurs',    sub: 'CRUD & rôles',         icon: Users,           path: '/admin?tab=users' },
  { id: 'restaurants',  label: 'Restaurants',     sub: 'Partenaires',          icon: UtensilsCrossed, path: '/admin?tab=restaurants' },
  { id: 'fournisseurs', label: 'Fournisseurs',    sub: 'Gestion des stocks',   icon: Truck,           path: '/admin?tab=fournisseurs' },
  { id: 'commissions',  label: 'Commissions',     sub: 'Revenus plateforme',   icon: Percent,         path: '/admin?tab=commissions' },
  { id: 'metriques',    label: 'Métriques',       sub: 'Analytiques système',  icon: BarChart2,       path: '/admin?tab=metriques' },
  { id: 'audit',        label: 'Audit Logs',      sub: 'Traçabilité RG-34',    icon: ScrollText,      path: '/admin?tab=audit' },
  { id: 'exports',      label: 'Exports',         sub: 'SYSCOHADA RG-29',      icon: Download,        path: '/admin?tab=exports' },
  { id: 'config',       label: 'Configuration',   sub: 'Système & sécurité',   icon: Settings,        path: '/admin?tab=config' },
];

function SidebarInner({ collapsed, user, activeTab, navigate, onLogout, onClose, mobile }) {
  const nom = [user?.prenom, user?.nom].filter(Boolean).join(' ') || 'Admin';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: SIDEBAR }}>

      {/* ── Logo / En-tête de la sidebar ── */}
      <div style={{
        padding: collapsed ? '20px 0' : '20px 16px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
      }}>
        {!collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #FF8C00, #F8A020)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(255,140,0,0.35)' }}>
              <UtensilsCrossed style={{ width: 18, height: 18, color: '#fff' }} />
            </div>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>Admin Système</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#1F2937', margin: 0, lineHeight: 1.2 }}>Resto d'ici</p>
            </div>
          </div>
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #FF8C00, #F8A020)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(255,140,0,0.35)' }}>
            <UtensilsCrossed style={{ width: 18, height: 18, color: '#fff' }} />
          </div>
        )}
        {mobile && (
          <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', color: '#6B7280', borderRadius: 7, padding: 4 }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        )}
      </div>

      {/* ── Navigation principale ── */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {MENU_ITEMS.map(item => {
          const Icon  = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { navigate(item.path); onClose?.(); }}
              title={collapsed ? item.label : undefined}
              style={{
                display: 'flex', alignItems: 'center',
                gap: collapsed ? 0 : 12,
                justifyContent: collapsed ? 'center' : 'flex-start',
                width: '100%', padding: collapsed ? '12px' : '10px 12px',
                border: 'none', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                background: active ? ACCENT : 'transparent',
                boxShadow: active ? `0 4px 14px ${ACCENT}44` : 'none',
                transition: 'all 0.18s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(37,99,235,0.06)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? 'rgba(255,255,255,0.22)' : 'rgba(37,99,235,0.10)',
                color: active ? '#fff' : ACCENT,
                transition: 'all 0.18s',
              }}>
                <Icon style={{ width: 16, height: 16 }} />
              </span>
              {!collapsed && (
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: active ? '#fff' : '#374151', lineHeight: 1.3 }}>{item.label}</span>
                  <span style={{ display: 'block', fontSize: 10, color: active ? 'rgba(255,255,255,0.70)' : '#9CA3AF', marginTop: 1 }}>{item.sub}</span>
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Pied de sidebar : info utilisateur + déconnexion ── */}
      <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: collapsed ? '12px 0' : '12px 10px' }}>
        {!collapsed && (
          <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 9, padding: '8px 12px', marginBottom: 8 }}>
            <p style={{ fontSize: 10, color: '#9CA3AF', margin: '0 0 2px' }}>Connecté en tant que</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nom}</p>
            <p style={{ fontSize: 10, color: ACCENT, margin: '2px 0 0', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Admin</p>
          </div>
        )}
        <button
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 10, justifyContent: collapsed ? 'center' : 'flex-start',
            width: '100%', padding: collapsed ? '10px' : '10px 12px',
            border: 'none', borderRadius: 9, cursor: 'pointer',
            background: 'transparent', color: '#9CA3AF', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut style={{ width: 16, height: 16, flexShrink: 0 }} />
          {!collapsed && <span style={{ fontSize: 12, fontWeight: 600 }}>Déconnexion</span>}
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [collapsed, setCollapsed]         = useState(false);
  const [sideOpen, setSideOpen]           = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const activeTab = new URLSearchParams(location.search).get('tab') || 'overview';

  const confirmLogout = () => { logout(); navigate('/login'); setShowLogoutModal(false); };

  const sidebarProps = { user, activeTab, navigate, onLogout: () => setShowLogoutModal(true) };

  return (
    <div className="flex min-h-screen" style={{ background: '#EEF2F7' }}>

      {/* ── Sidebar bureau — visible sur écran ≥ 1024px ── */}
      <aside
        className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 transition-all duration-300"
        style={{ width: collapsed ? 80 : 256, background: SIDEBAR, borderRight: '1px solid rgba(0,0,0,0.07)', boxShadow: '4px 0 20px rgba(0,0,0,0.05)' }}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute -right-3 top-6 flex h-7 w-7 items-center justify-center rounded-full text-white shadow-md"
          style={{ background: ACCENT }}
          aria-label={collapsed ? 'Développer' : 'Réduire'}
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>
        <SidebarInner {...sidebarProps} collapsed={collapsed} />
      </aside>

      {/* ── Overlay + sidebar mobile (slide-in) ── */}
      {sideOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSideOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 z-50 w-64 flex flex-col lg:hidden">
            <SidebarInner {...sidebarProps} collapsed={false} mobile onClose={() => setSideOpen(false)} />
          </aside>
        </>
      )}

      {/* ── Bouton hamburger — visible sur mobile uniquement ── */}
      <button
        className="lg:hidden fixed top-4 left-4 z-30 w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#E2E8F0] shadow-sm"
        onClick={() => setSideOpen(true)}
      >
        <Menu style={{ width: 16, height: 16, color: '#2563EB' }} />
      </button>

      {/* ── Contenu principal ── */}
      <main
        className="flex-1 overflow-y-auto transition-all duration-300"
        style={{ marginLeft: 0 }}
      >
        <div className={`lg:transition-all lg:duration-300 ${collapsed ? 'lg:ml-20' : 'lg:ml-64'} p-6`}>
          <Outlet />
        </div>
      </main>

      {/* ── Modal de confirmation de déconnexion ── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-[#0F172A]">Confirmer la déconnexion ?</h3>
            <p className="mb-6 text-sm text-[#737373]">Vous serez redirigé vers la page de connexion.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutModal(false)} className="flex-1 rounded-xl border border-[#E2E8F0] px-4 py-2.5 font-medium text-[#0F172A] transition hover:bg-[#F9F7F5]">Annuler</button>
              <button onClick={confirmLogout} style={{ background: ACCENT }} className="flex-1 rounded-xl px-4 py-2.5 font-medium text-white transition hover:opacity-90">Déconnexion</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
