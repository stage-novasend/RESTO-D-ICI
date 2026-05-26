// src/layouts/DashboardLayout.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, X, ChevronRight, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function DashboardLayout({ children, navGroups = [], title = '', breadcrumb = [] }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayCap = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <div className="min-h-screen flex bg-[#F4F6F8]">

      {/* ── Sidebar overlay (mobile) ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-gray-100 flex flex-col transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:flex lg:flex-shrink-0`}>

        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-5 border-b border-gray-100 flex-shrink-0">
          <div className="w-8 h-8 bg-[#C05015] rounded-lg flex items-center justify-center">
            <UtensilsCrossed className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#1A1A1A] font-extrabold text-sm leading-none">Resto d'ici</p>
            <p className="text-[#9A7060] text-[10px] mt-0.5 truncate">{user?.nom || user?.email || ''}</p>
          </div>
          <button className="lg:hidden text-gray-400" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">{group.label}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem key={item.label} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: logout */}
        <div className="px-3 pb-4 border-t border-gray-100 pt-3">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top header */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center px-5 gap-3 sticky top-0 z-30 flex-shrink-0">
          {/* Mobile menu toggle */}
          <button className="lg:hidden text-gray-500 mr-1" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm min-w-0 flex-1">
            <Link to="/" className="text-gray-400 hover:text-gray-600 hidden sm:block flex-shrink-0">Accueil</Link>
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5 flex-shrink-0">
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                {crumb.to ? (
                  <Link to={crumb.to} className="text-gray-400 hover:text-gray-600">{crumb.label}</Link>
                ) : (
                  <span className="text-gray-700 font-semibold truncate">{crumb.label}</span>
                )}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors relative">
              <Bell className="w-4 h-4 text-gray-500" />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#C05015] flex items-center justify-center text-white text-xs font-bold">
              {(user?.nom || user?.email || 'U').slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page header */}
        <div className="bg-white border-b border-gray-100 px-6 py-4">
          <p className="text-xs text-[#9A7060] mb-0.5">Maj: {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} — {todayCap}</p>
          <h1 className="text-2xl font-extrabold text-[#1A1A1A]">{title}</h1>
        </div>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavItem({ item }) {
  const navigate = useNavigate();
  const isActive = typeof window !== 'undefined' && (
    item.exact ? window.location.pathname === item.to : window.location.pathname.startsWith(item.to || '___')
  );

  if (item.onClick) {
    return (
      <button onClick={item.onClick}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
          ${isActive ? 'bg-[#C05015] text-white' : 'text-gray-600 hover:bg-[#FBE8DC] hover:text-[#C05015]'}`}>
        {item.icon && <item.icon className="w-4 h-4 flex-shrink-0" />}
        <span className="truncate">{item.label}</span>
        {item.badge != null && item.badge > 0 && (
          <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-[#C05015] text-white'}`}>
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </button>
    );
  }

  return (
    <Link to={item.to || '#'}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
        ${isActive ? 'bg-[#C05015] text-white' : 'text-gray-600 hover:bg-[#FBE8DC] hover:text-[#C05015]'}`}>
      {item.icon && <item.icon className="w-4 h-4 flex-shrink-0" />}
      <span className="truncate">{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-[#C05015] text-white'}`}>
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
    </Link>
  );
}

// KPI Card component (Bompay style)
export function KpiCard({ label, value, trend, trendLabel, icon: Icon, iconBg = '#FBE8DC', iconColor = '#C05015', loading }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`} style={{ background: iconBg }}>
        {Icon && <Icon className="w-5 h-5" style={{ color: iconColor }} />}
      </div>
      <div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <div className="flex items-end gap-2 flex-wrap">
          <span className="text-2xl font-extrabold text-[#1A1A1A]">
            {loading ? <span className="inline-block w-20 h-7 bg-gray-100 rounded animate-pulse" /> : value}
          </span>
          {trend != null && (
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${trend >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
              {trend >= 0 ? '↑' : '↓'} {trendLabel || `${Math.abs(trend)}%`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Status badge
export function StatusBadge({ status, map }) {
  const cfg = map?.[status] || { label: status, bg: '#F3F4F6', color: '#6B7280' };
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}
