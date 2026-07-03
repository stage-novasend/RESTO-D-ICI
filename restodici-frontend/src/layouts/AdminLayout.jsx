/* ═══════════════════════════════════════════════════════════════
   AdminLayout.jsx — Floating dock style macOS
   Sidebar flottante, verre givré, magnification Dock Apple
   ═══════════════════════════════════════════════════════════════ */
import { useState, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, Users, UtensilsCrossed, ScrollText,
  Download, Settings, LogOut, X, Menu,
  Truck, BarChart2, Percent, Bell, Activity,
} from 'lucide-react';

const ACCENT = '#EA580C';

const MENU_ITEMS = [
  { id: 'overview',      label: "Vue d'ensemble",  icon: LayoutDashboard, path: '/admin' },
  { id: 'notifications', label: 'Notifications',   icon: Bell,            path: '/admin?tab=notifications' },
  { id: 'users',         label: 'Utilisateurs',    icon: Users,           path: '/admin?tab=users' },
  { id: 'restaurants',   label: 'Restaurants',     icon: UtensilsCrossed, path: '/admin?tab=restaurants' },
  { id: 'fournisseurs',  label: 'Fournisseurs',    icon: Truck,           path: '/admin?tab=fournisseurs' },
  { id: 'livraisons',    label: 'Livraisons ext.', icon: Truck,           path: '/admin?tab=livraisons' },
  { id: 'metriques',     label: 'Métriques',       icon: Activity,        path: '/admin?tab=metriques' },
  { id: 'commissions',   label: 'Commissions',     icon: Percent,         path: '/admin?tab=commissions' },
  { id: 'audit',         label: 'Audit Logs',      icon: ScrollText,      path: '/admin?tab=audit' },
  { id: 'exports',       label: 'Exports',         icon: Download,        path: '/admin?tab=exports' },
  { id: 'config',        label: 'Configuration',   icon: Settings,        path: '/admin?tab=config' },
];

/* ── Calcul de scale Dock : icône centrale = 1.55×, voisins en dégradé ── */
function getDockScale(mouseY, itemRef) {
  if (mouseY === null || !itemRef?.current) return 1;
  const rect = itemRef.current.getBoundingClientRect();
  const center = rect.top + rect.height / 2;
  const dist = Math.abs(mouseY - center);
  const RANGE = 100;
  const MAX_SCALE = 1.6;
  if (dist > RANGE) return 1;
  return 1 + (MAX_SCALE - 1) * Math.pow(1 - dist / RANGE, 1.5);
}

/* ── Un élément de la dock ── */
function DockItem({ item, active, onClick, mouseY }) {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;
  const scale = getDockScale(mouseY, ref);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>

      {/* Tooltip à droite */}
      {hovered && (
        <div style={{
          position: 'absolute', left: 'calc(100% + 16px)', top: '50%',
          transform: 'translateY(-50%)',
          background: 'rgba(15,15,15,0.88)',
          backdropFilter: 'blur(12px)',
          color: '#fff', padding: '5px 12px',
          borderRadius: 9, fontSize: 12, fontWeight: 600,
          whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 200,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          animation: 'dockTip 0.12s ease-out both',
        }}>
          {item.label}
          {/* Flèche pointer */}
          <span style={{
            position: 'absolute', right: '100%', top: '50%', transform: 'translateY(-50%)',
            width: 0, height: 0,
            borderTop: '5px solid transparent', borderBottom: '5px solid transparent',
            borderRight: '6px solid rgba(15,15,15,0.88)',
          }} />
        </div>
      )}

      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 44, height: 44, borderRadius: 12, border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: active
            ? `linear-gradient(135deg, ${ACCENT}, #C2410C)`
            : 'rgba(0,0,0,0.055)',
          color: active ? '#fff' : '#374151',
          transform: `scale(${scale})`,
          transition: 'transform 0.08s ease-out, background 0.15s, box-shadow 0.15s',
          transformOrigin: 'center center',
          boxShadow: active ? `0 5px 18px ${ACCENT}55` : 'none',
          flexShrink: 0,
          outline: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <Icon style={{ width: 17, height: 17, flexShrink: 0 }} />
      </button>

      {/* Point actif style macOS */}
      {active && (
        <span style={{
          position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)',
          width: 4, height: 4, borderRadius: '50%',
          background: ACCENT,
          boxShadow: `0 0 6px ${ACCENT}`,
        }} />
      )}
    </div>
  );
}

/* ── Séparateur Dock ── */
function DockSep() {
  return <div style={{ width: 30, height: 1, background: 'rgba(0,0,0,0.12)', borderRadius: 1, margin: '4px 0', flexShrink: 0 }} />;
}

/* ══════════════════════════════════════════════════════════════════
   AdminLayout — Principal
   ══════════════════════════════════════════════════════════════════ */
export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [sideOpen, setSideOpen]           = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [mouseY, setMouseY]               = useState(null);

  const activeTab = new URLSearchParams(location.search).get('tab') || 'overview';
  const confirmLogout = () => { logout(); navigate('/login'); setShowLogoutModal(false); };
  const nom = [user?.prenom, user?.nom].filter(Boolean).join(' ') || 'Admin';

  const handleMouseMove = useCallback((e) => setMouseY(e.clientY), []);
  const handleMouseLeave = useCallback(() => setMouseY(null), []);

  return (
    <div style={{ minHeight: '100dvh', background: '#FFFFFF' }}>

      <style>{`
        @keyframes dockIn {
          from { opacity: 0; transform: translateY(-50%) translateX(-18px); }
          to   { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
        @keyframes dockTip {
          from { opacity: 0; transform: translateY(-50%) translateX(-6px); }
          to   { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════
          FLOATING DOCK — bureau uniquement (lg+)
      ══════════════════════════════════════════════════════════ */}
      <aside
        className="hidden lg:flex"
        style={{
          position: 'fixed',
          left: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 50,
          flexDirection: 'column',
          alignItems: 'center',
          gap: 7,
          padding: '14px 10px',
          /* Verre givré style macOS */
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.45)',
          boxShadow: [
            '0 10px 50px rgba(0,0,0,0.14)',
            '0 2px 8px rgba(0,0,0,0.08)',
            'inset 0 1px 0 rgba(255,255,255,0.7)',
            'inset 0 -1px 0 rgba(0,0,0,0.04)',
          ].join(', '),
          animation: 'dockIn 0.35s cubic-bezier(0.22,1,0.36,1) both',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* ── Logo / Icône app ── */}
        <div style={{
          width: 44, height: 44, borderRadius: 13, flexShrink: 0,
          background: 'linear-gradient(135deg, #EA580C 0%, #F8A020 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(234,88,12,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
        }}>
          <UtensilsCrossed style={{ width: 20, height: 20, color: '#fff' }} />
        </div>

        <DockSep />

        {/* ── Éléments de navigation ── */}
        {MENU_ITEMS.map(item => (
          <DockItem
            key={item.id}
            item={item}
            active={activeTab === item.id}
            onClick={() => navigate(item.path)}
            mouseY={mouseY}
          />
        ))}

        <DockSep />

        {/* ── Déconnexion ── */}
        <DockItemLogout onClick={() => setShowLogoutModal(true)} />
      </aside>

      {/* ══════════════════════════════════════════════════════════
          MOBILE — bouton hamburger + sidebar slide
      ══════════════════════════════════════════════════════════ */}
      <button
        className="lg:hidden fixed top-4 left-4 z-30 w-9 h-9 flex items-center justify-center rounded-xl shadow-sm"
        style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,0,0,0.08)' }}
        onClick={() => setSideOpen(true)}
      >
        <Menu style={{ width: 16, height: 16, color: ACCENT }} />
      </button>

      {sideOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSideOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 z-50 w-64 flex flex-col lg:hidden"
            style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(24px)', borderRight: '1px solid rgba(0,0,0,0.08)' }}>
            <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #EA580C, #F8A020)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(234,88,12,0.35)' }}>
                  <UtensilsCrossed style={{ width: 18, height: 18, color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>Admin</p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#1F2937', margin: 0 }}>Resto d'ici</p>
                </div>
              </div>
              <button onClick={() => setSideOpen(false)} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', borderRadius: 7, padding: 4 }}>
                <X style={{ width: 18, height: 18, color: '#6B7280' }} />
              </button>
            </div>
            <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
              {MENU_ITEMS.map(item => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button key={item.id}
                    onClick={() => { navigate(item.path); setSideOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                      padding: '10px 12px', border: 'none', borderRadius: 10,
                      cursor: 'pointer', textAlign: 'left',
                      background: active ? ACCENT : 'transparent',
                      color: active ? '#fff' : '#374151',
                      fontSize: 13, fontWeight: 600,
                      transition: 'all 0.15s',
                    }}>
                    <span style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(255,255,255,0.22)' : 'rgba(234,88,12,0.1)', color: active ? '#fff' : ACCENT, flexShrink: 0 }}>
                      <Icon style={{ width: 15, height: 15 }} />
                    </span>
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '12px 10px' }}>
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 8px 4px' }}>{nom}</p>
              <button onClick={() => { setShowLogoutModal(true); setSideOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', border: 'none', borderRadius: 9, cursor: 'pointer', background: 'rgba(248,113,113,0.08)', color: '#EF4444', fontSize: 13, fontWeight: 600 }}>
                <LogOut style={{ width: 15, height: 15 }} /> Déconnexion
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          CONTENU PRINCIPAL
          lg:pl-24 = 96px → efface le dock (14px + 64px + 18px respir)
      ══════════════════════════════════════════════════════════ */}
      <main style={{ minHeight: '100dvh' }}>
        <div className="p-6 lg:pl-24">
          <Outlet />
        </div>
      </main>

      {/* ── Modal déconnexion ── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
          onClick={e => e.target === e.currentTarget && setShowLogoutModal(false)}>
          <div style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderRadius: 20, padding: '28px', width: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(248,113,113,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <LogOut style={{ width: 20, height: 20, color: '#EF4444' }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Déconnexion</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#737373' }}>Vous serez redirigé vers la connexion.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowLogoutModal(false)}
                style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.04)', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={confirmLogout}
                style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', background: '#EF4444', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 14px rgba(239,68,68,0.35)' }}>
                Déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Bouton logout avec tooltip ── */
function DockItemLogout({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
      {hovered && (
        <div style={{
          position: 'absolute', left: 'calc(100% + 16px)', top: '50%',
          transform: 'translateY(-50%)',
          background: 'rgba(15,15,15,0.88)', backdropFilter: 'blur(12px)',
          color: '#fff', padding: '5px 12px', borderRadius: 9,
          fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 200,
          animation: 'dockTip 0.12s ease-out both',
        }}>
          Déconnexion
          <span style={{ position: 'absolute', right: '100%', top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: '6px solid rgba(15,15,15,0.88)' }} />
        </div>
      )}
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 44, height: 44, borderRadius: 12, border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: hovered ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.09)',
          color: '#EF4444', transition: 'all 0.15s', outline: 'none',
        }}
      >
        <LogOut style={{ width: 16, height: 16 }} />
      </button>
    </div>
  );
}
