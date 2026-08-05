/* OverviewTab — extrait de AdminDashboard */
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Users, UtensilsCrossed, Building2, ScrollText, CheckCircle, XCircle, Shield, AlertTriangle } from 'lucide-react';
import { adminAPI } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { useAdminRevision } from '../../../hooks/useAdminRealtime';
import { ROLE_COLOR, card } from '../_colors';
import { KpiCard, BarComboChart, DonutRolesChart, ActivityHeatmap } from '../_shared';

/* ══════════════════ TAB: VUE D'ENSEMBLE ══════════════════ */
export default function OverviewTab() {
  const revision = useAdminRevision();
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [secAlerts, setSecAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [healthChecks, setHealthChecks] = useState([]);
  const [healthLoading, setHealthLoading] = useState(true);
  const { user } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const adminName = [user?.prenom, user?.nom].filter(Boolean).join(' ') || 'Admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([adminAPI.getStats(), adminAPI.getChartData()]);
      setStats(sRes.data);
      setCharts(cRes.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, revision]);

  useEffect(() => {
    const fetchHealth = () => {
      setHealthLoading(true);
      adminAPI.getHealthChecks()
        .then(r => setHealthChecks(r.data || []))
        .catch(() => setHealthChecks([{ label: 'API Backend', ok: false }]))
        .finally(() => setHealthLoading(false));
    };
    fetchHealth();
    const iv = setInterval(fetchHealth, 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const fetchAlerts = () => {
      setAlertsLoading(true);
      adminAPI.getAuditLogs({ limit: 50 })
        .then(r => setSecAlerts((r.data || []).slice(0, 10)))
        .catch(() => { })
        .finally(() => setAlertsLoading(false));
    };
    fetchAlerts();
    const iv = setInterval(fetchAlerts, 30000);
    return () => clearInterval(iv);
  }, []);

  const total = stats?.users?.total ?? 0;

  return (
    <div>
      {/* ── Accueil personnalisé ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: 20, padding: '28px 32px', marginBottom: 24,
          border: '1px solid #334155',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.12)',
          position: 'relative', overflow: 'hidden', color: '#FFFFFF',
        }}
      >
        <div style={{ position: 'absolute', top: -40, right: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -30, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <p style={{ fontSize: 26, fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.03em', position: 'relative' }}>
          {greeting}, {adminName} 👋
        </p>
        <p style={{ fontSize: 14, color: '#94A3B8', margin: '6px 0 0', fontWeight: 500, position: 'relative' }}>
          Voici le résumé de votre plateforme — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </motion.div>

      {/* Refresh */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={load} disabled={loading} style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 12, fontWeight: 600 }}>
          <RefreshCw style={{ width: 13, height: 13 }} />
          Actualiser
        </button>
      </div>

      {/* ── KPI Cards (Flowdex row) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <KpiCard featured label="Utilisateurs" value={total} trend="+100%" trendUp sub="plateforme" color="#2563EB" icon={Users} />
        <KpiCard label="Restaurants" value={stats?.restaurants?.total} trend={`${stats?.restaurants?.active ?? 0} actifs`} trendUp sub="" color="#059669" icon={UtensilsCrossed} />
        <KpiCard label="B2B en attente" value={stats?.b2b?.pending} trend={stats?.b2b?.pending > 0 ? 'À valider' : 'Aucun'} trendUp={false} sub="" color="#D97706" icon={Building2} />
        <KpiCard label="Logs d'audit" value={stats?.audit?.total} trend="total" trendUp sub="enregistrements" color="#7C3AED" icon={ScrollText} />
      </div>

      {/* ── Row 2 : Barchart + Heatmap ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Bar chart */}
        <div style={card}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Inscriptions &amp; Activité</p>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>7 derniers jours</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[{ color: 'rgba(37,99,235,0.75)', label: 'Inscriptions' }, { color: 'rgba(15,23,42,0.85)', label: 'Audit' }].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
                  <span style={{ fontSize: 11, color: '#64748B' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: '16px 20px', height: 220 }}>
            {loading ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 12 }}>Chargement…</div>
            ) : (
              <BarComboChart usersByDay={charts?.usersByDay} auditByDay={charts?.auditByDay} />
            )}
          </div>
        </div>

        {/* Heatmap */}
        <div style={card}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #E2E8F0' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Heatmap d'activité</p>
            <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>Actions plateforme — 30 jours</p>
          </div>
          <div style={{ padding: '16px 20px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#94A3B8', fontSize: 12 }}>Chargement…</div>
            ) : (
              <ActivityHeatmap heatmap={charts?.heatmap} />
            )}
          </div>
        </div>
      </div>

      {/* ── Row 3 : Donut rôles + Logs récents ── */}
      <div className="admin-roles-logs-grid" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, marginBottom: 20 }}>
        {/* Donut */}
        <div style={card}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #E2E8F0' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Répartition des rôles</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>{total}</span>
              <span style={{ fontSize: 11, color: '#94A3B8' }}>utilisateurs</span>
            </div>
          </div>
          <div style={{ padding: '16px 20px', height: 160 }}>
            {loading ? null : <DonutRolesChart roleDist={charts?.roleDist} />}
          </div>
          <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(charts?.roleDist || []).map(r => {
              const c = ROLE_COLOR[r.role] || { bg: '#F1F5F9', text: '#475569', chart: '#94A3B8' };
              const pct = total > 0 ? Math.round(r.count / total * 100) : 0;
              return (
                <div key={r.role} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.chart, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#475569', flex: 1 }}>{r.role}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{r.count}</span>
                  <span style={{ fontSize: 11, color: '#94A3B8', width: 32, textAlign: 'right' }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent logs */}
        <div style={card}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Activité récente</p>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>10 dernières actions — lecture seule</p>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div className="overflow-x-auto w-full"><table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['ID', 'Action', 'Utilisateur', 'Date'].map(h => (
                    <th key={h} style={{ padding: '9px 14px', fontSize: 10, fontWeight: 700, color: '#64748B', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>Chargement…</td></tr>
                ) : !(charts?.recentLogs?.length) ? (
                  <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>Aucune activité</td></tr>
                ) : charts.recentLogs.map((log, i) => (
                  <tr key={log.id}
                    style={{ borderBottom: '1px solid #E2E8F0', background: i % 2 === 0 ? '#fff' : '#FAFBFF' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(234,60,12,0.04)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFBFF'; }}
                  >
                    <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 11, color: '#94A3B8' }}>#{log.id?.slice(0, 6)}</td>
                    <td style={{ padding: '9px 14px' }}>
                      {(() => {
                        const isNovasend = log.action?.toLowerCase().includes('novasend');
                        return (
                          <span style={{ background: isNovasend ? 'rgba(22,163,74,0.10)' : 'rgba(234,60,12,0.10)', color: isNovasend ? '#16A34A' : '#FF3A03', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{log.action}</span>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 11, color: '#64748B' }}>{log.userId?.slice(0, 8)}…</td>
                    <td style={{ padding: '9px 14px', fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        </div>
      </div>

      {/* ── Santé système (dynamique) ── */}
      <div style={card}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Santé système</p>
          <span style={{ fontSize: 10, color: '#94A3B8' }}>· rafraîchi toutes les 60s</span>
        </div>
        <div style={{ padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {healthLoading && healthChecks.length === 0 ? (
            <p style={{ color: '#94A3B8', fontSize: 12 }}>Vérification en cours…</p>
          ) : healthChecks.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: s.ok ? '#F0FDF4' : '#FEF2F2', borderRadius: 10, padding: '8px 14px', border: `1px solid ${s.ok ? '#BBF7D0' : '#FECACA'}` }}>
              {s.ok
                ? <span style={{ position: 'relative', display: 'inline-flex' }}><span className="admin-pulse-dot" /><CheckCircle style={{ width: 14, height: 14, color: '#16A34A', position: 'relative' }} /></span>
                : <XCircle style={{ width: 14, height: 14, color: '#DC2626' }} />
              }
              <span style={{ fontSize: 12, fontWeight: 700, color: s.ok ? '#15803D' : '#B91C1C' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Alertes de sécurité ── */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield style={{ width: 16, height: 16, color: '#FF3A03' }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Alertes de sécurité</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {secAlerts.length > 0 && (
              <span style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                {secAlerts.length} alerte{secAlerts.length > 1 ? 's' : ''}
              </span>
            )}
            <span style={{ fontSize: 10, color: '#94A3B8' }}>· rafraîchi toutes les 30s</span>
          </div>
        </div>
        <div style={{ padding: '12px 20px' }}>
          {alertsLoading && secAlerts.length === 0 ? (
            <p style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>Chargement…</p>
          ) : secAlerts.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', color: '#16A34A' }}>
              <CheckCircle style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Aucune alerte de sécurité détectée</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {secAlerts.map((alert, i) => (
                <div key={alert.id ?? i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '8px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle style={{ width: 14, height: 14, color: '#FF3A03', flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#991B1B' }}>{alert.action}</span>
                      {alert.userId && (
                        <span style={{ fontSize: 11, color: '#B91C1C', marginLeft: 8, fontFamily: 'monospace' }}>user:{alert.userId.slice(0, 8)}</span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: '#64748B', whiteSpace: 'nowrap', marginLeft: 12 }}>
                    {new Date(alert.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
