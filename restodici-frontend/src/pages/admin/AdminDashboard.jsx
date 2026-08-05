/* ═══════════════════════════════════════════════════════════════
   AdminDashboard.jsx — Tableau de bord administrateur système
   6 onglets : vue d'ensemble, utilisateurs, restaurants, audit,
               exports, configuration + modules B2B et fournisseurs
   Orchestrateur — délègue à chaque onglet (voir ./tabs/)
   ═══════════════════════════════════════════════════════════════ */
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, AlertTriangle, Users, UtensilsCrossed, Truck, Activity,
  ScrollText, Mail, Percent, Download, Settings, Shield,
} from 'lucide-react';
import { AdminRealtimeProvider } from '../../hooks/useAdminRealtime';
import OnboardingWizard from '../../components/wizard/OnboardingWizard';
import AdminOnboardingWizard from './AdminOnboardingWizard';
import { B2BPendingBanner, ContestationsBanner, RealtimeIndicator } from './_shared';
import OverviewTab from './tabs/OverviewTab';
import AlertesTab from './tabs/AlertesTab';
import UsersTab from './tabs/UsersTab';
import RestaurantsTab from './tabs/RestaurantsTab';
import FournisseursTab from './tabs/FournisseursTab';
import LivraisonsExtTab from './tabs/LivraisonsExtTab';
import MetriquesTab from './tabs/MetriquesTab';
import AuditTab from './tabs/AuditTab';
import NewsletterTab from './tabs/NewsletterTab';
import CommissionsTab from './tabs/CommissionsTab';
import ExportsTab from './tabs/ExportsTab';
import ConfigTab from './tabs/ConfigTab';

const TABS = [
  { id: 'overview', label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: 'alertes', label: 'Alertes', icon: AlertTriangle },
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'restaurants', label: 'Restaurants', icon: UtensilsCrossed },
  { id: 'fournisseurs', label: 'Fournisseurs', icon: Truck },
  { id: 'livraisons', label: 'Livraisons ext.', icon: Truck },
  { id: 'metriques', label: 'Métriques', icon: Activity },
  { id: 'audit', label: 'Audit', icon: ScrollText },
  { id: 'newsletter', label: 'Newsletter', icon: Mail },
  { id: 'commissions', label: 'Commissions', icon: Percent },
  { id: 'exports', label: 'Exports', icon: Download },
  { id: 'config', label: 'Configuration', icon: Settings },
];

/* ═══ AdminDashboard — Composant principal ═══ */
/* Le provider temps réel doit envelopper les onglets : il est monté par
   AdminDashboard ci-dessous, ce composant en est le consommateur. */
function AdminDashboardInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const tab = new URLSearchParams(location.search).get('tab') || 'overview';
  const goTab = (id) => navigate(id === 'overview' ? '/admin' : `/admin?tab=${id}`);

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', padding: '24px 16px' }}>
      <style>{`
      @keyframes adminPulse {
        0%, 100% { transform: scale(1); opacity: 0.5; }
        50% { transform: scale(2); opacity: 0; }
      }
      .admin-pulse-dot {
        position: absolute;
        inset: -1px;
        border-radius: 50%;
        background: rgba(22,163,74,0.35);
        animation: adminPulse 2s ease-in-out infinite;
      }
      @media (max-width: 860px) {
        .admin-roles-logs-grid { grid-template-columns: 1fr !important; }
      }
    `}</style>
      <div style={{ maxWidth: 1300, margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 28, padding: '20px 24px', borderRadius: 20,
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: '#0F172A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'none',
            }}>
              <Shield style={{ width: 22, height: 22, color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em' }}>
                Administration
              </h1>
              <p style={{ margin: 0, fontSize: 12, color: '#64748B', fontWeight: 500 }}>
                Sankofa-Lab · CDC v1.1 · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          <RealtimeIndicator />
        </div>

        {tab === 'overview' && <B2BPendingBanner />}
        {tab === 'overview' && <ContestationsBanner />}

        {/* Floating Tab bar */}
        <div style={{
          position: 'sticky', top: 12, zIndex: 100,
          display: 'flex', gap: 6, marginBottom: 28,
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          borderRadius: 16, padding: '6px',
          border: '1px solid #E2E8F0',
          boxShadow: 'none',
          overflowX: 'auto',
        }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => goTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 16px', border: 'none', borderRadius: 12,
                  cursor: 'pointer', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
                  background: active ? '#0F172A' : 'transparent',
                  color: active ? '#FFFFFF' : '#475569',
                  boxShadow: active ? '0 4px 14px rgba(15, 23, 42, 0.35)' : 'none',
                  transition: 'all 0.18s ease',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#0F172A'; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; } }}
              >
                <Icon style={{ width: 15, height: 15, color: active ? '#38BDF8' : '#64748B' }} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Zéro clignotement sans Framer Motion */}
        <div className="fade-in" key={tab}>
          {tab === 'overview' && <OverviewTab />}
          {tab === 'alertes' && <AlertesTab />}
          {tab === 'users' && <UsersTab />}
          {tab === 'restaurants' && <RestaurantsTab />}
          {tab === 'fournisseurs' && <FournisseursTab />}
          {tab === 'livraisons' && <LivraisonsExtTab />}
          {tab === 'metriques' && <MetriquesTab />}
          {tab === 'audit' && <AuditTab />}
          {tab === 'newsletter' && <NewsletterTab />}
          {tab === 'commissions' && <CommissionsTab />}
          {tab === 'exports' && <ExportsTab />}
          {tab === 'config' && <ConfigTab />}
        </div>

        <AdminOnboardingWizard />
        <OnboardingWizard />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AdminRealtimeProvider>
      <AdminDashboardInner />
    </AdminRealtimeProvider>
  );
}
