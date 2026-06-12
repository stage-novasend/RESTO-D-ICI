/* ═══════════════════════════════════════════════════════════════
   AdminDashboard.jsx — Tableau de bord administrateur système
   6 onglets : vue d'ensemble, utilisateurs, restaurants, audit,
               exports, configuration + modules B2B et fournisseurs
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Chart from 'chart.js/auto';
import { adminAPI, authAPI, fournisseursAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import OnboardingWizard from '../../components/wizard/OnboardingWizard';
import {
  Users, UtensilsCrossed, ScrollText, Download, Settings,
  RefreshCw, ToggleLeft, ToggleRight, Plus, X, Check,
  Shield, Activity, CheckCircle, XCircle, Clock, Search,
  Filter, ChevronDown, AlertTriangle, Building2, LayoutDashboard,
  TrendingUp, TrendingDown, MoreVertical, Eye, EyeOff, Save,
  Zap, MessageSquare, Bell, Lock, Globe, Database,
  FileText, Calendar, ChevronRight, ExternalLink, Info,
  CreditCard, Smartphone, Mail, BarChart2, Webhook, Truck, Pencil, Trash2,
  Percent, TrendingUp as TrendUp,
} from 'lucide-react';

/* ── Palette de couleurs et constantes ── */
const ACCENT = '#2563EB';
const ROLES  = ['ADMIN', 'GERANT', 'STAFF', 'CLIENT', 'B2B'];
const ROLE_COLOR = {
  ADMIN:  { bg: 'rgba(37,99,235,0.10)', text: '#2563EB', chart: '#2563EB' },
  GERANT: { bg: '#FEF3C7', text: '#92400E', chart: '#F59E0B' },
  STAFF:  { bg: '#DCFCE7', text: '#166534', chart: '#10B981' },
  CLIENT: { bg: '#F0F9FF', text: '#0369A1', chart: '#0EA5E9' },
  B2B:    { bg: '#F3E8FF', text: '#6B21A8', chart: '#A855F7' },
};
const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

/* ── Styles partagés (inputs, cartes) ── */
const inputStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0',
  borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff',
};
const labelStyle = { fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 };
const card = { background: '#fff', borderRadius: 16, border: '1px solid #D1D9E6', boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', overflow: 'hidden' };

/* ── Composants utilitaires ── */
function RoleBadge({ role }) {
  const c = ROLE_COLOR[role] || { bg: '#F1F5F9', text: '#475569' };
  return <span style={{ background: c.bg, color: c.text, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{role}</span>;
}

function SectionHeader({ title, onRefresh, loading }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>{title}</h2>
      {onRefresh && (
        <button onClick={onRefresh} disabled={loading} style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 12 }}>
          <RefreshCw style={{ width: 12, height: 12 }} />
          Actualiser
        </button>
      )}
    </div>
  );
}

/* ══════════════════ Carte KPI ══════════════════ */
function KpiCard({ label, value, sub, trend, trendUp, color = ACCENT, icon: Icon, featured = false }) {
  return (
    <div style={{
      ...card,
      padding: '20px 22px',
      background: featured ? `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)` : '#fff',
      position: 'relative', overflow: 'hidden',
    }}>
      {featured && (
        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: featured ? 'rgba(255,255,255,0.8)' : '#64748B' }}>{label}</span>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: featured ? 'rgba(255,255,255,0.5)' : '#CBD5E1', padding: 0 }}>
          <MoreVertical style={{ width: 16, height: 16 }} />
        </button>
      </div>
      <p style={{ fontSize: 28, fontWeight: 800, color: featured ? '#fff' : '#0F172A', margin: '0 0 10px', lineHeight: 1.1 }}>
        {value ?? '—'}
      </p>
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {trendUp
            ? <TrendingUp style={{ width: 14, height: 14, color: featured ? '#86EFAC' : '#16A34A' }} />
            : <TrendingDown style={{ width: 14, height: 14, color: featured ? '#FCA5A5' : '#2563EB' }} />
          }
          <span style={{ fontSize: 12, fontWeight: 700, color: featured ? (trendUp ? '#86EFAC' : '#FCA5A5') : (trendUp ? '#16A34A' : '#2563EB') }}>
            {trend}
          </span>
          <span style={{ fontSize: 11, color: featured ? 'rgba(255,255,255,0.55)' : '#94A3B8' }}>{sub}</span>
        </div>
      )}
    </div>
  );
}

/* ══════════════════ Graphique barres — Inscriptions & Activité ══════════════════ */
function BarComboChart({ usersByDay, auditByDay }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !usersByDay?.length) return;
    chartRef.current?.destroy();

    const labels = usersByDay.map(d => {
      const dt = new Date(d.day + 'T00:00:00');
      return dt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
    });

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Inscriptions',
            data: usersByDay.map(d => d.count),
            backgroundColor: 'rgba(37,99,235,0.40)',
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Actions audit',
            data: auditByDay.map(d => d.count),
            backgroundColor: 'rgba(37,99,235,0.85)',
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E293B',
            titleColor: '#F8FAFC',
            bodyColor: '#CBD5E1',
            padding: 10,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: '#94A3B8', font: { size: 11 } },
          },
          y: {
            grid: { color: '#F1F5F9', drawTicks: false },
            border: { display: false, dash: [4, 4] },
            ticks: { color: '#94A3B8', font: { size: 11 }, padding: 8 },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [usersByDay, auditByDay]);

  return <canvas ref={canvasRef} />;
}

/* ══════════════════ Graphique donut — Répartition des rôles ══════════════════ */
function DonutRolesChart({ roleDist }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !roleDist?.length) return;
    chartRef.current?.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: roleDist.map(r => r.role),
        datasets: [{
          data:            roleDist.map(r => r.count),
          backgroundColor: roleDist.map(r => ROLE_COLOR[r.role]?.chart || '#94A3B8'),
          borderWidth: 3,
          borderColor: '#fff',
          hoverOffset: 6,
        }],
      },
      options: {
        cutout: '72%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E293B',
            titleColor: '#F8FAFC',
            bodyColor: '#CBD5E1',
            padding: 10,
            cornerRadius: 8,
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [roleDist]);

  return <canvas ref={canvasRef} />;
}

/* ══════════════════ Carte de chaleur — Activité ══════════════════ */
function ActivityHeatmap({ heatmap }) {
  if (!heatmap?.length) {
    return <div style={{ textAlign: 'center', padding: 32, color: '#94A3B8', fontSize: 12 }}>Données insuffisantes</div>;
  }

  const hours   = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const maxVal  = Math.max(...heatmap.map(h => h.count), 1);

  const getCount = (dow, hour) => {
    const found = heatmap.find(h => h.dow === dow && h.hour === hour);
    return found?.count || 0;
  };

  const getColor = (count) => {
    if (count === 0) return '#EFF6FF';
    const intensity = count / maxVal;
    if (intensity < 0.25) return '#BFDBFE';
    if (intensity < 0.5)  return '#60A5FA';
    if (intensity < 0.75) return '#3B82F6';
    return '#2563EB';
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `48px repeat(7, 1fr)`, gap: 3, minWidth: 340 }}>
        {/* Headers jours */}
        <div />
        {DAY_LABELS.map(d => (
          <div key={d} style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textAlign: 'center', paddingBottom: 4 }}>{d}</div>
        ))}
        {/* Rows par heure */}
        {hours.map(h => (
          <>
            <div key={`h${h}`} style={{ fontSize: 10, color: '#94A3B8', textAlign: 'right', paddingRight: 8, lineHeight: '22px' }}>{h}h</div>
            {Array.from({ length: 7 }, (_, dow) => {
              const count = getCount(dow, h);
              return (
                <div
                  key={`${dow}-${h}`}
                  title={`${DAY_LABELS[dow]} ${h}h : ${count} action${count > 1 ? 's' : ''}`}
                  style={{ width: '100%', height: 22, borderRadius: 4, background: getColor(count), cursor: count > 0 ? 'pointer' : 'default', transition: 'opacity 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.75'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                />
              );
            })}
          </>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 10, color: '#94A3B8' }}>Peu</span>
        {['#EFF6FF', '#BFDBFE', '#60A5FA', '#3B82F6', '#2563EB'].map(c => (
          <div key={c} style={{ width: 14, height: 14, borderRadius: 3, background: c }} />
        ))}
        <span style={{ fontSize: 10, color: '#94A3B8' }}>Beaucoup</span>
      </div>
    </div>
  );
}

/* ══════════════════ TAB: VUE D'ENSEMBLE ══════════════════ */
function OverviewTab() {
  const [stats,   setStats]   = useState(null);
  const [charts,  setCharts]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [secAlerts, setSecAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([adminAPI.getStats(), adminAPI.getChartData()]);
      setStats(sRes.data);
      setCharts(cRes.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const SECURITY_ACTIONS = new Set(['LOGIN_FAILED', 'UNAUTHORIZED_ACCESS', 'INVALID_TOKEN', 'SUSPICIOUS_ACTIVITY']);
    const fetchAlerts = () => {
      setAlertsLoading(true);
      adminAPI.getAuditLogs({ limit: 50 })
        .then(r => setSecAlerts((r.data || []).filter(l => SECURITY_ACTIONS.has(l.action)).slice(0, 10)))
        .catch(() => {})
        .finally(() => setAlertsLoading(false));
    };
    fetchAlerts();
    const iv = setInterval(fetchAlerts, 30000);
    return () => clearInterval(iv);
  }, []);

  const total = stats?.users?.total ?? 0;

  return (
    <div>
      {/* Refresh */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={load} disabled={loading} style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 12, fontWeight: 600 }}>
          <RefreshCw style={{ width: 13, height: 13 }} />
          Actualiser
        </button>
      </div>

      {/* ── KPI Cards (Flowdex row) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14, marginBottom: 20 }}>
        <KpiCard featured label="Utilisateurs" value={total} trend="+100%" trendUp sub="plateforme" color={ACCENT} />
        <KpiCard label="Restaurants"    value={stats?.restaurants?.total}  trend={`${stats?.restaurants?.active ?? 0} actifs`}  trendUp sub=""           color="#059669" />
        <KpiCard label="B2B en attente" value={stats?.b2b?.pending}        trend={stats?.b2b?.pending > 0 ? 'À valider' : 'Aucun'} trendUp={false} sub="" color="#D97706" />
        <KpiCard label="Logs d'audit"   value={stats?.audit?.total}        trend="total"  trendUp sub="enregistrements"  color="#7C3AED" />
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
              {[{ color: 'rgba(37,99,235,0.40)', label: 'Inscriptions' }, { color: 'rgba(37,99,235,0.85)', label: 'Audit' }].map(l => (
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
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, marginBottom: 20 }}>
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
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>10 dernières actions — lecture seule (RG-34)</p>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F1F5F9' }}>
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
                    style={{ borderBottom: '1px solid #E2E8F0', background: i % 2 === 0 ? '#fff' : '#F8FAFC' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,99,235,0.04)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#F8FAFC'; }}
                  >
                    <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 11, color: '#94A3B8' }}>#{log.id?.slice(0, 6)}</td>
                    <td style={{ padding: '9px 14px' }}>
                      <span style={{ background: 'rgba(37,99,235,0.10)', color: '#2563EB', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{log.action}</span>
                    </td>
                    <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 11, color: '#64748B' }}>{log.userId?.slice(0, 8)}…</td>
                    <td style={{ padding: '9px 14px', fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Santé système ── */}
      <div style={card}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Santé système</p>
        </div>
        <div style={{ padding: '12px 20px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {[
            { label: 'API Backend NestJS',         ok: true },
            { label: 'PostgreSQL',                  ok: true },
            { label: 'WebSocket Gateway',           ok: true },
            { label: 'Cache Redis',                 ok: true },
            { label: 'Novasend (paiements)',         ok: false },
            { label: 'Firebase FCM',                ok: true },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, background: s.ok ? '#F0FDF4' : '#FEF2F2', borderRadius: 10, padding: '8px 14px', border: `1px solid ${s.ok ? '#BBF7D0' : '#FECACA'}` }}>
              {s.ok
                ? <CheckCircle style={{ width: 14, height: 14, color: '#16A34A' }} />
                : <XCircle    style={{ width: 14, height: 14, color: '#2563EB' }} />
              }
              <span style={{ fontSize: 12, fontWeight: 600, color: s.ok ? '#15803D' : '#B91C1C' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Alertes de sécurité (RG-34) ── */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield style={{ width: 16, height: 16, color: '#2563EB' }} />
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
                    <AlertTriangle style={{ width: 14, height: 14, color: '#2563EB', flexShrink: 0 }} />
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

/* ══════════════════ TAB: UTILISATEURS ══════════════════ */
function UsersTab() {
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState({ nom: '', prenom: '', email: '', password: '', role: 'CLIENT', telephone: '', restaurantId: '' });
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');
  const [editUser, setEditUser]     = useState(null);
  const [editForm, setEditForm]     = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter) params.role   = roleFilter;
      if (search)     params.search = search;
      const r = await adminAPI.getUsers(params);
      setUsers(r.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [roleFilter, search]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id) => { try { await adminAPI.toggleUser(id); load(); } catch { /* ignore */ } };

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({ nom: u.nom || '', prenom: u.prenom || '', email: u.email || '', role: u.role || 'CLIENT', telephone: u.telephone || '', restaurantId: u.restaurantId || u.restaurant?.id || '' });
    setEditError('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await adminAPI.createUser(form);
      setShowModal(false);
      setForm({ nom: '', prenom: '', email: '', password: '', role: 'CLIENT', telephone: '', restaurantId: '' });
      load();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Erreur lors de la création');
    } finally { setSaving(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSaving(true);
    try {
      await adminAPI.updateUser(editUser.id, editForm);
      setEditUser(null);
      load();
    } catch (err) {
      setEditError(err?.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally { setEditSaving(false); }
  };

  return (
    <div>
      <SectionHeader title="Gestion des utilisateurs (RG-31)" onRefresh={load} loading={loading} />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#94A3B8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher nom, email…" style={{ ...inputStyle, paddingLeft: 32 }} />
        </div>
        <div style={{ position: 'relative' }}>
          <Filter style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#94A3B8' }} />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ paddingLeft: 28, paddingRight: 28, paddingTop: 8, paddingBottom: 8, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', appearance: 'none', cursor: 'pointer' }}>
            <option value="">Tous les rôles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <ChevronDown style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#94A3B8', pointerEvents: 'none' }} />
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
          <Plus style={{ width: 14, height: 14 }} /> Créer
        </button>
      </div>

      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #D1D9E6' }}>
                {['Nom', 'Email', 'Rôle', 'Restaurant', 'Statut', 'Créé le', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748B', textAlign: 'left', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>Chargement…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>Aucun utilisateur</td></tr>
              ) : users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #E2E8F0' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{[u.prenom, u.nom].filter(Boolean).join(' ') || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569' }}>{u.email}</td>
                  <td style={{ padding: '10px 14px' }}><RoleBadge role={u.role} /></td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>{u.restaurant?.nom || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: u.actif ? '#DCFCE7' : '#FEE2E2', color: u.actif ? '#166534' : '#991B1B', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                      {u.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: '#94A3B8' }}>
                    {new Date(u.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => openEdit(u)} title="Modifier" style={{ background: 'rgba(37,99,235,0.10)', border: 'none', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', color: ACCENT, display: 'flex', alignItems: 'center' }}>
                        <Pencil style={{ width: 14, height: 14 }} />
                      </button>
                      <button onClick={() => toggle(u.id)} title={u.actif ? 'Désactiver' : 'Activer'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: u.actif ? '#2563EB' : '#16A34A' }}>
                        {u.actif ? <ToggleRight style={{ width: 20, height: 20 }} /> : <ToggleLeft style={{ width: 20, height: 20 }} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>{users.length} utilisateur{users.length !== 1 ? 's' : ''}</p>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Créer un utilisateur</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X style={{ width: 18, height: 18 }} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={labelStyle}>Nom *</label><input required value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} style={inputStyle} placeholder="Diallo" /></div>
                <div><label style={labelStyle}>Prénom</label><input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} style={inputStyle} placeholder="Moussa" /></div>
              </div>
              <div><label style={labelStyle}>Email *</label><input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Mot de passe * (min. 8)</label><input required type="password" minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} style={inputStyle} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={labelStyle}>Rôle *</label><select required value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                <div><label style={labelStyle}>Téléphone</label><input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} style={inputStyle} placeholder="+225 07 00 00 00 00" /></div>
              </div>
              {(form.role === 'GERANT' || form.role === 'STAFF') && (
                <div><label style={labelStyle}>ID Restaurant</label><input value={form.restaurantId} onChange={e => setForm(f => ({ ...f, restaurantId: e.target.value }))} style={inputStyle} placeholder="UUID" /></div>
              )}
              {formError && <p style={{ color: '#2563EB', fontSize: 12, margin: 0 }}>{formError}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: 10, border: '1px solid #E2E8F0', borderRadius: 10, cursor: 'pointer', fontWeight: 600, color: '#475569', background: '#fff' }}>Annuler</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: 10, border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, color: '#fff', background: ACCENT, opacity: saving ? 0.7 : 1 }}>{saving ? 'Création…' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Modifier l'utilisateur</h3>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94A3B8' }}>{editUser.email}</p>
              </div>
              <button onClick={() => setEditUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X style={{ width: 18, height: 18 }} /></button>
            </div>
            <form onSubmit={handleUpdate} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={labelStyle}>Nom *</label><input required value={editForm.nom} onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Prénom</label><input value={editForm.prenom} onChange={e => setEditForm(f => ({ ...f, prenom: e.target.value }))} style={inputStyle} /></div>
              </div>
              <div><label style={labelStyle}>Email *</label><input required type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Rôle *</label>
                  <select required value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Téléphone</label><input value={editForm.telephone} onChange={e => setEditForm(f => ({ ...f, telephone: e.target.value }))} style={inputStyle} /></div>
              </div>
              {(editForm.role === 'GERANT' || editForm.role === 'STAFF') && (
                <div><label style={labelStyle}>ID Restaurant</label><input value={editForm.restaurantId} onChange={e => setEditForm(f => ({ ...f, restaurantId: e.target.value }))} style={inputStyle} placeholder="UUID du restaurant" /></div>
              )}
              {editError && <p style={{ color: '#2563EB', fontSize: 12, margin: 0 }}>{editError}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setEditUser(null)} style={{ flex: 1, padding: 10, border: '1px solid #E2E8F0', borderRadius: 10, cursor: 'pointer', fontWeight: 600, color: '#475569', background: '#fff' }}>Annuler</button>
                <button type="submit" disabled={editSaving} style={{ flex: 1, padding: 10, border: 'none', borderRadius: 10, cursor: editSaving ? 'not-allowed' : 'pointer', fontWeight: 700, color: '#fff', background: ACCENT, opacity: editSaving ? 0.7 : 1 }}>
                  {editSaving ? 'Sauvegarde…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════ TAB: RESTAURANTS ══════════════════ */
function RestaurantsTab() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [form, setForm]               = useState({ nom: '', telephone: '', adresse: '', email: '', description: '' });
  const [saving, setSaving]           = useState(false);
  const [editResto, setEditResto]     = useState(null);
  const [editForm, setEditForm]       = useState({});
  const [editSaving, setEditSaving]   = useState(false);
  const [editError, setEditError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await adminAPI.getRestaurants(); setRestaurants(r.data); } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id) => { try { await adminAPI.toggleRestaurant(id); load(); } catch { /* ignore */ } };

  const openEdit = (r) => {
    setEditResto(r);
    setEditForm({ nom: r.nom || '', telephone: r.telephone || '', adresse: r.adresse || '', email: r.email || '' });
    setEditError('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await adminAPI.createRestaurant(form); setShowModal(false); setForm({ nom: '', telephone: '', adresse: '', email: '', description: '' }); load(); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSaving(true);
    try {
      await adminAPI.updateRestaurant(editResto.id, editForm);
      setEditResto(null);
      load();
    } catch (err) {
      setEditError(err?.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally { setEditSaving(false); }
  };

  return (
    <div>
      <SectionHeader title="Gestion des restaurants" onRefresh={load} loading={loading} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setShowModal(true)} style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
          <Plus style={{ width: 14, height: 14 }} /> Nouveau restaurant
        </button>
      </div>
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #D1D9E6' }}>
                {['Nom', 'Adresse', 'Téléphone', 'Membres', 'Note', 'Statut', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748B', textAlign: 'left', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>Chargement…</td></tr>
              ) : restaurants.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>Aucun restaurant</td></tr>
              ) : restaurants.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #E2E8F0' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{r.nom}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.adresse}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569' }}>{r.telephone}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569' }}>{r.users?.length ?? 0}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569' }}>
                    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <span style={{ fontWeight:700, color: Number(r.noteMoyenne||0) >= 4 ? '#16A34A' : Number(r.noteMoyenne||0) >= 3 ? '#D97706' : '#2563EB' }}>
                          {Number(r.noteMoyenne || 0).toFixed(1)}
                        </span>
                        <span style={{ color:'#F59E0B', fontSize:13, letterSpacing:1 }}>
                          {'★'.repeat(Math.round(r.noteMoyenne || 0))}{'☆'.repeat(Math.max(0, 5 - Math.round(r.noteMoyenne || 0)))}
                        </span>
                      </div>
                      <span style={{ fontSize:10, color:'#94A3B8' }}>{r.nbAvis || 0} avis</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}><span style={{ background: r.actif ? '#DCFCE7' : '#FEE2E2', color: r.actif ? '#166534' : '#991B1B', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{r.actif ? 'Actif' : 'Inactif'}</span></td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => openEdit(r)} title="Modifier" style={{ background: 'rgba(37,99,235,0.10)', border: 'none', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', color: ACCENT, display: 'flex', alignItems: 'center' }}>
                        <Pencil style={{ width: 14, height: 14 }} />
                      </button>
                      <button onClick={() => toggle(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: r.actif ? '#2563EB' : '#16A34A' }}>
                        {r.actif ? <ToggleRight style={{ width: 20, height: 20 }} /> : <ToggleLeft style={{ width: 20, height: 20 }} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>{restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''}</p>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Nouveau restaurant</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X style={{ width: 18, height: 18 }} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={labelStyle}>Nom *</label><input required value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} style={inputStyle} placeholder="Le Maquis du Carrefour" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={labelStyle}>Téléphone *</label><input required value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} /></div>
              </div>
              <div><label style={labelStyle}>Adresse *</label><input required value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }} /></div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: 10, border: '1px solid #E2E8F0', borderRadius: 10, cursor: 'pointer', fontWeight: 600, color: '#475569', background: '#fff' }}>Annuler</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: 10, border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, color: '#fff', background: ACCENT, opacity: saving ? 0.7 : 1 }}>{saving ? 'Création…' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editResto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Modifier le restaurant</h3>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94A3B8' }}>{editResto.nom}</p>
              </div>
              <button onClick={() => setEditResto(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X style={{ width: 18, height: 18 }} /></button>
            </div>
            <form onSubmit={handleUpdate} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={labelStyle}>Nom *</label><input required value={editForm.nom} onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))} style={inputStyle} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={labelStyle}>Téléphone *</label><input required value={editForm.telephone} onChange={e => setEditForm(f => ({ ...f, telephone: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Email</label><input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} /></div>
              </div>
              <div><label style={labelStyle}>Adresse *</label><input required value={editForm.adresse} onChange={e => setEditForm(f => ({ ...f, adresse: e.target.value }))} style={inputStyle} /></div>
              {editError && <p style={{ color: '#2563EB', fontSize: 12, margin: 0 }}>{editError}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setEditResto(null)} style={{ flex: 1, padding: 10, border: '1px solid #E2E8F0', borderRadius: 10, cursor: 'pointer', fontWeight: 600, color: '#475569', background: '#fff' }}>Annuler</button>
                <button type="submit" disabled={editSaving} style={{ flex: 1, padding: 10, border: 'none', borderRadius: 10, cursor: editSaving ? 'not-allowed' : 'pointer', fontWeight: 700, color: '#fff', background: ACCENT, opacity: editSaving ? 0.7 : 1 }}>
                  {editSaving ? 'Sauvegarde…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════ TAB: AUDIT LOGS ══════════════════ */
/* ── Badge couleur par famille d'action ── */
const ACTION_STYLE = (action = '') => {
  const a = action.toUpperCase();
  if (a.includes('LOGIN') || a.includes('AUTH'))    return { bg: '#DCFCE7', text: '#166534' };
  if (a.includes('DELETE') || a.includes('REMOVE')) return { bg: '#FEE2E2', text: '#991B1B' };
  if (a.includes('CREATE') || a.includes('ADD'))    return { bg: 'rgba(37,99,235,0.10)', text: '#2563EB' };
  if (a.includes('UPDATE') || a.includes('PATCH') || a.includes('EDIT')) return { bg: '#FEF3C7', text: '#92400E' };
  if (a.includes('EXPORT') || a.includes('DOWNLOAD')) return { bg: '#F3E8FF', text: '#6B21A8' };
  if (a.includes('VALIDER') || a.includes('APPROVE')) return { bg: '#D1FAE5', text: '#065F46' };
  if (a.includes('REJECT') || a.includes('REFUSE')) return { bg: '#FFE4E6', text: '#9F1239' };
  return { bg: '#F1F5F9', text: '#475569' };
};

function AuditTab() {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [action, setAction]     = useState('');
  const [from, setFrom]         = useState('');
  const [to, setTo]             = useState('');
  const [userId, setUserId]     = useState('');
  const [limit, setLimit]       = useState(100);
  const [expanded, setExpanded] = useState({});
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminAPI.getAuditLogs({
        action: action || undefined,
        userId: userId || undefined,
        from: from || undefined,
        to: to || undefined,
        limit,
      });
      setLogs(r.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [action, userId, from, to, limit]);

  useEffect(() => { load(); }, [load]);

  const today    = logs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length;
  const distinct = new Set(logs.map(l => l.userId)).size;
  const topAction = logs.length
    ? Object.entries(logs.reduce((acc, l) => { acc[l.action] = (acc[l.action] || 0) + 1; return acc; }, {}))
        .sort((a, b) => b[1] - a[1])[0]?.[0]
    : '—';

  const fmt = (iso) => {
    const d = new Date(iso);
    return { date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }), time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) };
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const r    = await adminAPI.exportAudit({ action: action || undefined, from: from || undefined, to: to || undefined });
      const blob = new Blob([r.data], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a'); a.href = url; a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>Journaux d'audit</h2>
          <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>Traçabilité immuable de toutes les actions critiques · RG-34</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportCSV} disabled={exporting} style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
            <Download style={{ width: 13, height: 13 }} />{exporting ? 'Export…' : 'Exporter CSV'}
          </button>
          <button onClick={load} disabled={loading} style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw style={{ width: 13, height: 13 }} />Actualiser
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total entrées', value: logs.length, icon: ScrollText, color: ACCENT },
          { label: "Aujourd'hui", value: today, icon: Calendar, color: '#059669' },
          { label: 'Utilisateurs actifs', value: distinct, icon: Users, color: '#F59E0B' },
          { label: 'Action principale', value: topAction, icon: Activity, color: '#8B5CF6', mono: true },
        ].map(k => (
          <div key={k.label} style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${k.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <k.icon style={{ width: 16, height: 16, color: k.color }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '0 0 2px', fontWeight: 600 }}>{k.label}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: k.mono ? 'monospace' : 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ ...card, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '2 1 180px' }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#94A3B8' }} />
            <input value={action} onChange={e => setAction(e.target.value)} placeholder="Filtrer par action (LOGIN, CREATE…)" style={{ ...inputStyle, paddingLeft: 30 }} />
          </div>
          <div style={{ position: 'relative', flex: '2 1 180px' }}>
            <Users style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#94A3B8' }} />
            <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="Filtrer par userId…" style={{ ...inputStyle, paddingLeft: 30 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 240px' }}>
            <Calendar style={{ width: 13, height: 13, color: '#94A3B8', flexShrink: 0 }} />
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            <span style={{ color: '#94A3B8', fontSize: 11 }}>→</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          </div>
          <select value={limit} onChange={e => setLimit(Number(e.target.value))} style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, outline: 'none', flexShrink: 0 }}>
            {[50, 100, 200, 500].map(n => <option key={n} value={n}>{n} lignes</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #E8EDF5' }}>
                {['Date', 'Heure', 'Utilisateur', 'Action', 'Restaurant', 'Payload', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: '#94A3B8', textAlign: 'left', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Chargement…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Aucun log pour ces critères</td></tr>
              ) : logs.map((log, i) => {
                const { date, time } = fmt(log.createdAt);
                const aStyle = ACTION_STYLE(log.action);
                const isOpen = expanded[log.id];
                return [
                  <tr key={log.id} style={{ borderBottom: isOpen ? 'none' : '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFBFC', cursor: 'pointer' }}
                    onClick={() => setExpanded(e => ({ ...e, [log.id]: !e[log.id] }))}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,99,235,0.04)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFBFC'; }}
                  >
                    <td style={{ padding: '10px 14px', fontSize: 11, color: '#334155', whiteSpace: 'nowrap', fontWeight: 600 }}>{date}</td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: '#64748B', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{time}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#F1F5F9', borderRadius: 5, padding: '2px 7px', color: '#334155' }}>{log.userId?.slice(0, 8)}…</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: aStyle.bg, color: aStyle.text, borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 700 }}>{log.action}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>
                      {log.restaurantId ? log.restaurantId.slice(0, 8) + '…' : <span style={{ color: '#CBD5E1' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: '#64748B', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.payload ? JSON.stringify(log.payload).slice(0, 50) + (JSON.stringify(log.payload).length > 50 ? '…' : '') : <span style={{ color: '#CBD5E1' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#CBD5E1' }}>
                      <ChevronRight style={{ width: 13, height: 13, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                    </td>
                  </tr>,
                  isOpen && (
                    <tr key={`${log.id}-exp`} style={{ background: 'rgba(37,99,235,0.04)', borderBottom: '1px solid rgba(37,99,235,0.12)' }}>
                      <td colSpan={7} style={{ padding: '10px 20px 14px' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Payload complet · ID: {log.id}</p>
                        <pre style={{ margin: 0, fontSize: 11, color: '#334155', background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid rgba(37,99,235,0.20)', overflowX: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {log.payload ? JSON.stringify(log.payload, null, 2) : 'Aucun payload'}
                        </pre>
                      </td>
                    </tr>
                  ),
                ].filter(Boolean);
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{logs.length} entrée{logs.length !== 1 ? 's' : ''} · Journal immuable (RG-34) · Cliquer une ligne pour afficher le payload</p>
          <span style={{ fontSize: 10, background: '#DCFCE7', color: '#166534', borderRadius: 5, padding: '2px 8px', fontWeight: 700 }}>IMMUABLE</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ TAB: EXPORTS ══════════════════ */
function ExportsTab() {
  const today     = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [dlState,      setDlState]      = useState({});
  const [history,      setHistory]      = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_export_history') || '[]'); } catch { return []; }
  });
  const [sysPeriod,    setSysPeriod]    = useState('monthly');
  const [auditFrom,    setAuditFrom]    = useState(firstOfMonth);
  const [auditTo,      setAuditTo]      = useState(today);

  const pushHistory = (entry) => {
    const next = [entry, ...history].slice(0, 20);
    setHistory(next);
    localStorage.setItem('admin_export_history', JSON.stringify(next));
  };

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const download = async (key, apiFn, filename, label) => {
    setDlState(s => ({ ...s, [key]: 'loading' }));
    try {
      const r    = await apiFn();
      const blob = new Blob([r.data], { type: 'text/csv;charset=utf-8;' });
      triggerDownload(blob, filename);
      pushHistory({ name: filename, ts: new Date().toISOString(), label });
      setDlState(s => ({ ...s, [key]: 'done' }));
      setTimeout(() => setDlState(s => ({ ...s, [key]: null })), 2500);
    } catch {
      setDlState(s => ({ ...s, [key]: 'error' }));
      setTimeout(() => setDlState(s => ({ ...s, [key]: null })), 3000);
    }
  };

  const fmtTs = (iso) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const periodLabel = sysPeriod === 'monthly' ? 'Mensuel' : sysPeriod === 'quarterly' ? 'Trimestriel' : 'Annuel';

  const BtnIcon = ({ state }) => {
    if (state === 'loading') return <RefreshCw style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />;
    if (state === 'done')    return <CheckCircle style={{ width: 14, height: 14 }} />;
    if (state === 'error')   return <XCircle style={{ width: 14, height: 14 }} />;
    return <Download style={{ width: 14, height: 14 }} />;
  };

  const btnBg = (key, base) => {
    if (dlState[key] === 'done')  return '#059669';
    if (dlState[key] === 'error') return '#DC2626';
    return base;
  };

  return (
    <div>

      {/* ── En-tête ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 3px' }}>Exports & Rapports</h2>
          <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>Exports comptables OHADA, journaux d'audit et données plateforme</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 20, padding: '5px 12px', fontSize: 11, fontWeight: 700, color: '#15803D' }}>
            <CheckCircle style={{ width: 12, height: 12 }} /> Conforme OHADA
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.20)', borderRadius: 20, padding: '5px 12px', fontSize: 11, fontWeight: 700, color: ACCENT }}>
            <Shield style={{ width: 12, height: 12 }} /> Rétention 10 ans
          </span>
        </div>
      </div>

      {/* ── Exports principaux ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* SYSCOHADA */}
        <div style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText style={{ width: 21, height: 21, color: ACCENT }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Export SYSCOHADA</p>
                  <span style={{ fontSize: 10, background: 'rgba(37,99,235,0.10)', color: ACCENT, borderRadius: 5, padding: '2px 7px', fontWeight: 700 }}>RG-29</span>
                </div>
                <p style={{ fontSize: 11, color: '#94A3B8', margin: '3px 0 0' }}>Format comptable OHADA — CSV BOM UTF-8 compatible Excel</p>
              </div>
            </div>

            <label style={labelStyle}>Granularité de la période</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {[{ value: 'monthly', label: 'Mensuel' }, { value: 'quarterly', label: 'Trimestriel' }, { value: 'yearly', label: 'Annuel' }].map(p => (
                <button key={p.value} onClick={() => setSysPeriod(p.value)}
                  style={{ flex: 1, padding: '7px 0', border: `1.5px solid ${sysPeriod === p.value ? ACCENT : '#E2E8F0'}`, borderRadius: 8, cursor: 'pointer', fontWeight: sysPeriod === p.value ? 700 : 500, fontSize: 12, background: sysPeriod === p.value ? 'rgba(37,99,235,0.08)' : '#fff', color: sysPeriod === p.value ? ACCENT : '#475569', transition: 'all 0.15s' }}>
                  {p.label}
                </button>
              ))}
            </div>

            <div style={{ background: '#F1F5F9', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Format', value: 'CSV UTF-8 (BOM)' },
                { label: 'Plan comptable', value: 'OHADA / SYSCOHADA' },
                { label: 'Colonnes', value: 'Date · Libellé · Débit · Crédit · Compte · Pièce' },
                { label: 'Compatibilité', value: 'Sage, Ciel, logiciels CI' },
              ].map(f => (
                <div key={f.label}>
                  <p style={{ fontSize: 10, color: '#94A3B8', margin: '0 0 1px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</p>
                  <p style={{ fontSize: 11, color: '#334155', margin: 0, fontWeight: 600 }}>{f.value}</p>
                </div>
              ))}
            </div>

            <button onClick={() => download('syscohada', () => adminAPI.exportSyscohada(sysPeriod), `SYSCOHADA-${sysPeriod}-${today}.csv`, `SYSCOHADA ${periodLabel}`)}
              disabled={!!dlState.syscohada}
              style={{ width: '100%', padding: '11px 0', background: btnBg('syscohada', ACCENT), color: '#fff', border: 'none', borderRadius: 10, cursor: dlState.syscohada ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13, opacity: dlState.syscohada === 'loading' ? 0.8 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}>
              <BtnIcon state={dlState.syscohada} />
              {dlState.syscohada === 'loading' ? 'Génération en cours…' : dlState.syscohada === 'done' ? 'Téléchargé !' : dlState.syscohada === 'error' ? 'Erreur — réessayer' : `Télécharger SYSCOHADA (${periodLabel})`}
            </button>
          </div>
          <div style={{ padding: '10px 20px', background: '#FFFBEB', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Info style={{ width: 13, height: 13, color: '#D97706', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11, color: '#92400E', margin: 0, lineHeight: 1.5 }}>Obligation légale OHADA : conservez ces exports 10 ans dans un système sécurisé hors production.</p>
          </div>
        </div>

        {/* Audit RG-34 */}
        <div style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ScrollText style={{ width: 21, height: 21, color: '#059669' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Journal d'Audit</p>
                  <span style={{ fontSize: 10, background: '#D1FAE5', color: '#065F46', borderRadius: 5, padding: '2px 7px', fontWeight: 700 }}>RG-34</span>
                </div>
                <p style={{ fontSize: 11, color: '#94A3B8', margin: '3px 0 0' }}>Traçabilité complète — toutes actions critiques horodatées</p>
              </div>
            </div>

            <label style={labelStyle}>Plage de dates</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 10, color: '#94A3B8', margin: '0 0 4px', fontWeight: 600 }}>Du</p>
                <input type="date" value={auditFrom} max={auditTo} onChange={e => setAuditFrom(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 12, outline: 'none', color: '#374151', background: '#fff', boxSizing: 'border-box' }} />
              </div>
              <div>
                <p style={{ fontSize: 10, color: '#94A3B8', margin: '0 0 4px', fontWeight: 600 }}>Au</p>
                <input type="date" value={auditTo} min={auditFrom} max={today} onChange={e => setAuditTo(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 12, outline: 'none', color: '#374151', background: '#fff', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Format', value: 'CSV UTF-8 (BOM)' },
                { label: 'Intégrité', value: 'Immuable (RG-34)' },
                { label: 'Colonnes', value: 'Date · Heure · User · Action · Restaurant · Payload' },
                { label: 'Limite', value: '5 000 entrées / export' },
              ].map(f => (
                <div key={f.label}>
                  <p style={{ fontSize: 10, color: '#94A3B8', margin: '0 0 1px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</p>
                  <p style={{ fontSize: 11, color: '#334155', margin: 0, fontWeight: 600 }}>{f.value}</p>
                </div>
              ))}
            </div>

            <button onClick={() => download('audit', () => adminAPI.exportAudit({ from: auditFrom, to: auditTo }), `Audit-RG34-${auditFrom}_${auditTo}.csv`, 'Journal Audit')}
              disabled={!!dlState.audit}
              style={{ width: '100%', padding: '11px 0', background: btnBg('audit', '#059669'), color: '#fff', border: 'none', borderRadius: 10, cursor: dlState.audit ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13, opacity: dlState.audit === 'loading' ? 0.8 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}>
              <BtnIcon state={dlState.audit} />
              {dlState.audit === 'loading' ? 'Génération en cours…' : dlState.audit === 'done' ? 'Téléchargé !' : dlState.audit === 'error' ? 'Erreur — réessayer' : `Télécharger Audit (${auditFrom} → ${auditTo})`}
            </button>
          </div>
          <div style={{ padding: '10px 20px', background: '#F0FDF4', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Info style={{ width: 13, height: 13, color: '#059669', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11, color: '#065F46', margin: 0, lineHeight: 1.5 }}>Le journal en base est immuable. Cet export est une copie d'archivage — le journal source reste intact.</p>
          </div>
        </div>
      </div>

      {/* ── Conformité OHADA + Historique ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        <div style={{ ...card, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Shield style={{ width: 16, height: 16, color: ACCENT }} />
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>Conformité OHADA</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Rétention minimale', value: '10 ans', note: 'Acte uniforme OHADA sur le droit comptable' },
              { label: 'Format légal', value: 'SYSCOHADA révisé', note: 'Plan comptable OHADA — comptes 7xxx produits' },
              { label: 'Archivage', value: 'Hors production', note: 'Isolé de la base de données opérationnelle' },
            ].map(item => (
              <div key={item.label} style={{ background: '#F1F5F9', borderRadius: 9, padding: '9px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 10, color: '#94A3B8', margin: '0 0 1px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</p>
                  <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>{item.note}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: ACCENT, whiteSpace: 'nowrap', marginLeft: 10 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock style={{ width: 16, height: 16, color: '#64748B' }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>Historique des exports</p>
            </div>
            {history.length > 0 && (
              <button onClick={() => { setHistory([]); localStorage.removeItem('admin_export_history'); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#94A3B8', padding: '2px 6px' }}>
                Effacer
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#CBD5E1' }}>
              <Download style={{ width: 28, height: 28, margin: '0 auto 8px', display: 'block' }} />
              <p style={{ fontSize: 12, margin: 0 }}>Aucun export dans cette session</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {history.slice(0, 8).map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: 8, background: i === 0 ? 'rgba(37,99,235,0.04)' : 'transparent', border: i === 0 ? '1px solid rgba(37,99,235,0.10)' : '1px solid transparent' }}>
                  <span style={{ fontSize: 11, color: '#374151', display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                    <FileText style={{ width: 11, height: 11, color: '#94A3B8', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.label || h.name}</span>
                  </span>
                  <span style={{ fontSize: 10, color: '#94A3B8', flexShrink: 0, marginLeft: 8 }}>{fmtTs(h.ts)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ TAB: CONFIGURATION ══════════════════ */
const INTEGRATION_TYPES = [
  'REST_API', 'WEBHOOK', 'PAYMENT', 'SMS', 'PUSH_NOTIFICATION', 'EMAIL', 'STORAGE', 'ANALYTICS', 'CUSTOM',
];
const TYPE_COLOR = {
  PAYMENT: '#F59E0B', SMS: '#F43F5E', PUSH_NOTIFICATION: '#2563EB',
  EMAIL: '#6366F1', STORAGE: '#0EA5E9', REST_API: '#10B981',
  WEBHOOK: '#8B5CF6', ANALYTICS: '#EC4899', CUSTOM: '#64748B',
};
const TYPE_ICON = {
  PAYMENT: CreditCard, SMS: Smartphone, PUSH_NOTIFICATION: Bell,
  EMAIL: Mail, STORAGE: Database, REST_API: Globe,
  WEBHOOK: Webhook, ANALYTICS: BarChart2, CUSTOM: Zap,
};
const CDC_NAMES = new Set(['Novasend', 'Firebase FCM', 'Twilio SMS', 'Resend (Email)']);

function IntegrationDynamicCard({ integration, onToggle, onEdit, onDelete, onTest, testResult, testing }) {
  const color  = TYPE_COLOR[integration.type] || '#64748B';
  const Icon   = TYPE_ICON[integration.type] || Zap;
  const isCdc  = CDC_NAMES.has(integration.name);

  return (
    <div style={{ ...card, marginBottom: 10, border: isCdc ? `1.5px solid ${color}28` : '1px solid #D1D9E6', overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon style={{ width: 17, height: 17, color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>{integration.name}</p>
            {isCdc && <span style={{ fontSize: 9, background: 'rgba(37,99,235,0.10)', color: '#2563EB', borderRadius: 4, padding: '1px 6px', fontWeight: 800, letterSpacing: '0.04em' }}>CDC</span>}
            <span style={{ background: `${color}14`, color, borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{integration.type.replace(/_/g, ' ')}</span>
          </div>
          <p style={{ fontSize: 11, color: '#64748B', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {integration.description || integration.baseUrl || 'Aucune description'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <button onClick={() => onTest(integration.id)} disabled={testing} title="Tester"
            style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 7, padding: '5px 8px', cursor: testing ? 'not-allowed' : 'pointer', color: '#475569', display: 'flex', alignItems: 'center' }}>
            <Activity style={{ width: 12, height: 12 }} />
          </button>
          <button onClick={() => onEdit(integration)} title="Configurer"
            style={{ background: 'rgba(37,99,235,0.10)', border: 'none', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: ACCENT, display: 'flex', alignItems: 'center' }}>
            <Settings style={{ width: 12, height: 12 }} />
          </button>
          {!isCdc && (
            <button onClick={() => onDelete(integration.id)} title="Supprimer"
              style={{ background: '#FEE2E2', border: 'none', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: '#2563EB', display: 'flex', alignItems: 'center' }}>
              <X style={{ width: 12, height: 12 }} />
            </button>
          )}
          <button onClick={() => onToggle(integration)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
            {integration.enabled
              ? <ToggleRight style={{ width: 26, height: 26, color: '#059669' }} />
              : <ToggleLeft style={{ width: 26, height: 26, color: '#CBD5E1' }} />}
          </button>
        </div>
      </div>
      {testResult && (
        <div style={{ margin: '0 12px 10px', padding: '7px 10px', borderRadius: 7, background: testResult.ok ? '#DCFCE7' : '#FEE2E2', color: testResult.ok ? '#166534' : '#991B1B', fontSize: 11, fontWeight: 600 }}>
          {testResult.ok ? <CheckCircle style={{ width: 11, height: 11, marginRight: 5, display: 'inline' }} /> : <XCircle style={{ width: 11, height: 11, marginRight: 5, display: 'inline' }} />}
          {testResult.message}
        </div>
      )}
    </div>
  );
}

function IntegrationModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', description: '', type: 'REST_API', baseUrl: '', apiKey: '', webhookSecret: '',
    customHeaders: '', enabled: false, ...initial,
  });
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      let headers;
      try { headers = form.customHeaders ? JSON.parse(form.customHeaders) : undefined; } catch { headers = undefined; }
      await onSave({ ...form, customHeaders: headers });
      onClose();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{initial?.id ? 'Modifier' : 'Nouvelle'} intégration</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X style={{ width: 18, height: 18, color: '#64748B' }} /></button>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label style={labelStyle}>Nom *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="Ex: Stripe, Twilio, Novasend…" /></div>
          <div><label style={labelStyle}>Description</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={inputStyle} placeholder="Rôle de cette intégration" /></div>
          <div>
            <label style={labelStyle}>Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ ...inputStyle, appearance: 'none' }}>
              {INTEGRATION_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>URL de base</label><input value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))} style={inputStyle} placeholder="https://api.exemple.com/v1" /></div>
          <div>
            <label style={labelStyle}>Clé API / Bearer Token</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type={showKey ? 'text' : 'password'} value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} style={{ ...inputStyle, flex: 1 }} placeholder="sk_live_…" />
              <button onClick={() => setShowKey(v => !v)} style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8, padding: '0 10px', cursor: 'pointer', color: '#64748B' }}>
                {showKey ? <EyeOff style={{ width: 13, height: 13 }} /> : <Eye style={{ width: 13, height: 13 }} />}
              </button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Webhook Secret</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type={showSecret ? 'text' : 'password'} value={form.webhookSecret} onChange={e => setForm(f => ({ ...f, webhookSecret: e.target.value }))} style={{ ...inputStyle, flex: 1 }} placeholder="whsec_…" />
              <button onClick={() => setShowSecret(v => !v)} style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8, padding: '0 10px', cursor: 'pointer', color: '#64748B' }}>
                {showSecret ? <EyeOff style={{ width: 13, height: 13 }} /> : <Eye style={{ width: 13, height: 13 }} />}
              </button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Headers personnalisés (JSON)</label>
            <textarea value={form.customHeaders} onChange={e => setForm(f => ({ ...f, customHeaders: e.target.value }))} style={{ ...inputStyle, height: 70, resize: 'vertical', fontFamily: 'monospace', fontSize: 11 }} placeholder={'{"X-Custom-Header": "valeur"}'} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {form.enabled ? <ToggleRight style={{ width: 26, height: 26, color: '#059669' }} /> : <ToggleLeft style={{ width: 26, height: 26, color: '#CBD5E1' }} />}
            </button>
            <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>{form.enabled ? 'Activée' : 'Désactivée'}</span>
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 8, padding: '9px 0', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Annuler</button>
          <button onClick={handle} disabled={saving || !form.name.trim()} style={{ flex: 2, background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', cursor: 'pointer', fontWeight: 700, fontSize: 13, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfigTab() {
  const { user } = useAuth();
  const [configs, setConfigs]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState({});
  const [pwForm, setPwForm]           = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg]             = useState(null);
  const [pwSaving, setPwSaving]       = useState(false);
  const [secEdits, setSecEdits]       = useState({});
  const [integrations, setIntegrations] = useState([]);
  const [modal, setModal]             = useState(null); // null | {} | {id,…}
  const [testResults, setTestResults] = useState({});
  const [testing, setTesting]         = useState({});
  const [twoFAEnabled, setTwoFAEnabled] = useState(!!user?.twoFactorEnabled);
  const [twoFAStep, setTwoFAStep]     = useState(0); // 0=idle, 1=qr, 2=done
  const [twoFAData, setTwoFAData]     = useState(null);
  const [twoFACode, setTwoFACode]     = useState('');
  const [twoFASaving, setTwoFASaving] = useState(false);
  const [twoFAMsg, setTwoFAMsg]       = useState(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, intRes] = await Promise.all([adminAPI.getConfig(), adminAPI.getIntegrations()]);
      setConfigs(cfgRes.data);
      setIntegrations(intRes.data);
      const initial = {};
      cfgRes.data.forEach(c => { initial[c.key] = c.value ?? ''; });
      setSecEdits(initial);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const saveKey = async (key, value) => {
    setSaving(s => ({ ...s, [key]: true }));
    try {
      await adminAPI.setConfig(key, String(value));
      setConfigs(prev => prev.map(c => c.key === key ? { ...c, value: String(value) } : c));
    } catch { /* ignore */ }
    finally { setSaving(s => ({ ...s, [key]: false })); }
  };

  const saveSecurityFields = async () => {
    setSaving(s => ({ ...s, security: true }));
    try {
      await Promise.all(Object.entries(secEdits).map(([k, v]) => adminAPI.setConfig(k, v)));
      await loadConfig();
    } catch { /* ignore */ }
    finally { setSaving(s => ({ ...s, security: false })); }
  };

  const handleChangePassword = async () => {
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ ok: false, text: 'Les mots de passe ne correspondent pas.' }); return; }
    if (pwForm.next.length < 8) { setPwMsg({ ok: false, text: 'Minimum 8 caractères.' }); return; }
    setPwSaving(true); setPwMsg(null);
    try {
      await adminAPI.changePassword(pwForm.current, pwForm.next);
      setPwMsg({ ok: true, text: 'Mot de passe modifié avec succès.' });
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (e) {
      setPwMsg({ ok: false, text: e?.response?.data?.message || 'Échec de la modification.' });
    } finally { setPwSaving(false); }
  };

  const saveIntegration = async (data) => {
    if (data.id) {
      const res = await adminAPI.updateIntegration(data.id, data);
      setIntegrations(prev => prev.map(i => i.id === data.id ? res.data : i));
    } else {
      const res = await adminAPI.createIntegration(data);
      setIntegrations(prev => [res.data, ...prev]);
    }
  };

  const toggleIntegration = async (integration) => {
    const res = await adminAPI.updateIntegration(integration.id, { enabled: !integration.enabled });
    setIntegrations(prev => prev.map(i => i.id === integration.id ? res.data : i));
  };

  const deleteIntegration = async (id) => {
    if (!window.confirm('Supprimer cette intégration ?')) return;
    await adminAPI.deleteIntegration(id);
    setIntegrations(prev => prev.filter(i => i.id !== id));
  };

  const testIntegration = async (id) => {
    setTesting(t => ({ ...t, [id]: true }));
    try {
      const res = await adminAPI.testIntegration(id);
      setTestResults(t => ({ ...t, [id]: res.data }));
    } catch { setTestResults(t => ({ ...t, [id]: { ok: false, message: 'Erreur réseau.' } })); }
    finally { setTesting(t => ({ ...t, [id]: false })); }
  };

  const handleSetup2FA = async () => {
    setTwoFASaving(true); setTwoFAMsg(null);
    try {
      const res = await authAPI.setup2FA();
      setTwoFAData(res.data);
      setTwoFAStep(1);
    } catch (e) {
      setTwoFAMsg({ ok: false, text: e?.response?.data?.message || 'Erreur lors de la configuration.' });
    } finally { setTwoFASaving(false); }
  };

  const handleEnable2FA = async () => {
    if (twoFACode.length !== 6) { setTwoFAMsg({ ok: false, text: 'Entrez un code à 6 chiffres.' }); return; }
    setTwoFASaving(true); setTwoFAMsg(null);
    try {
      await authAPI.enable2FA(twoFACode);
      setTwoFAEnabled(true);
      setTwoFAStep(0);
      setTwoFAData(null);
      setTwoFACode('');
      setTwoFAMsg({ ok: true, text: '2FA activé avec succès.' });
    } catch (e) {
      setTwoFAMsg({ ok: false, text: e?.response?.data?.message || 'Code incorrect.' });
    } finally { setTwoFASaving(false); }
  };

  const handleDisable2FA = async () => {
    if (!window.confirm('Désactiver la double authentification ?')) return;
    setTwoFASaving(true); setTwoFAMsg(null);
    try {
      await authAPI.disable2FA();
      setTwoFAEnabled(false);
      setTwoFAMsg({ ok: true, text: '2FA désactivé.' });
    } catch (e) {
      setTwoFAMsg({ ok: false, text: e?.response?.data?.message || 'Erreur lors de la désactivation.' });
    } finally { setTwoFASaving(false); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Chargement…</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

      {/* ── Colonne gauche : Sécurité + MDP ── */}
      <div>
        {/* Politiques de sécurité */}
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lock style={{ width: 16, height: 16, color: ACCENT }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>Politiques de sécurité</p>
          </div>
          <div style={{ padding: '14px 20px' }}>
            {[
              { key: 'jwt_ttl_hours',     label: 'JWT TTL (heures)',              suffix: 'h',   note: 'RG-35' },
              { key: 'rate_limit_auth',   label: 'Rate limit /auth (req/min/IP)',  suffix: 'req', note: '§6.6' },
              { key: 'rate_limit_global', label: 'Rate limit global (req/min/IP)', suffix: 'req', note: '§6.6' },
              { key: 'bcrypt_cost',       label: 'Coût bcrypt',                    suffix: '',    note: 'RG-06' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>{f.label}</label>
                  <span style={{ fontSize: 10, background: 'rgba(37,99,235,0.10)', color: '#2563EB', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>{f.note}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    min="1"
                    value={secEdits[f.key] ?? ''}
                    onChange={e => setSecEdits(s => ({ ...s, [f.key]: e.target.value }))}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  {f.suffix && <span style={{ display: 'flex', alignItems: 'center', color: '#64748B', fontSize: 12, fontWeight: 600, paddingRight: 4 }}>{f.suffix}</span>}
                </div>
              </div>
            ))}
            <div style={{ marginTop: 4 }}>
              {[
                { key: 'timezone', label: 'Fuseau horaire' },
                { key: 'currency', label: 'Devise' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>{f.label}</label>
                  <input
                    value={secEdits[f.key] ?? getVal(f.key) ?? ''}
                    onChange={e => setSecEdits(s => ({ ...s, [f.key]: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={saveSecurityFields}
              disabled={saving.security}
              style={{ width: '100%', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 0', cursor: saving.security ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving.security ? 0.7 : 1 }}>
              <Save style={{ width: 13, height: 13 }} />
              {saving.security ? 'Enregistrement…' : 'Enregistrer les politiques'}
            </button>
          </div>
        </div>

        {/* Changement de mot de passe */}
        <div style={{ ...card }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield style={{ width: 16, height: 16, color: '#059669' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>Changer le mot de passe admin</p>
          </div>
          <div style={{ padding: '14px 20px' }}>
            {[
              { field: 'current',  label: 'Mot de passe actuel',        placeholder: '••••••••' },
              { field: 'next',     label: 'Nouveau mot de passe',        placeholder: 'Minimum 8 caractères' },
              { field: 'confirm',  label: 'Confirmer le nouveau MDP',   placeholder: '••••••••' },
            ].map(f => (
              <div key={f.field} style={{ marginBottom: 12 }}>
                <label style={labelStyle}>{f.label}</label>
                <input
                  type="password"
                  placeholder={f.placeholder}
                  value={pwForm[f.field]}
                  onChange={e => setPwForm(p => ({ ...p, [f.field]: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            ))}
            {pwMsg && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: pwMsg.ok ? '#DCFCE7' : '#FEE2E2', color: pwMsg.ok ? '#166534' : '#991B1B', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
                {pwMsg.ok ? <CheckCircle style={{ width: 12, height: 12, marginRight: 6, display: 'inline' }} /> : <XCircle style={{ width: 12, height: 12, marginRight: 6, display: 'inline' }} />}
                {pwMsg.text}
              </div>
            )}
            <button
              onClick={handleChangePassword}
              disabled={pwSaving}
              style={{ width: '100%', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 0', cursor: pwSaving ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: pwSaving ? 0.7 : 1 }}>
              <Shield style={{ width: 13, height: 13 }} />
              {pwSaving ? 'Modification…' : 'Changer le mot de passe'}
            </button>
          </div>
        </div>

        {/* Double authentification (2FA) */}
        <div style={{ ...card, marginTop: 20 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Smartphone style={{ width: 16, height: 16, color: '#7C3AED' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>Double authentification (2FA)</p>
            <span style={{ marginLeft: 'auto', background: twoFAEnabled ? '#DCFCE7' : '#F1F5F9', color: twoFAEnabled ? '#166534' : '#64748B', borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 700 }}>
              {twoFAEnabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
            </span>
          </div>
          <div style={{ padding: '14px 20px' }}>
            {twoFAMsg && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: twoFAMsg.ok ? '#DCFCE7' : '#FEE2E2', color: twoFAMsg.ok ? '#166534' : '#991B1B', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
                {twoFAMsg.ok
                  ? <CheckCircle style={{ width: 12, height: 12, marginRight: 6, display: 'inline' }} />
                  : <XCircle    style={{ width: 12, height: 12, marginRight: 6, display: 'inline' }} />}
                {twoFAMsg.text}
              </div>
            )}

            {twoFAStep === 0 && !twoFAEnabled && (
              <>
                <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px' }}>Protégez votre compte admin avec une application TOTP (Google Authenticator, Authy…).</p>
                <button
                  onClick={handleSetup2FA}
                  disabled={twoFASaving}
                  style={{ width: '100%', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 0', cursor: twoFASaving ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: twoFASaving ? 0.7 : 1 }}>
                  <Smartphone style={{ width: 13, height: 13 }} />
                  {twoFASaving ? 'Génération du QR…' : 'Configurer le 2FA'}
                </button>
              </>
            )}

            {twoFAStep === 1 && twoFAData && (
              <>
                <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 10px' }}>Scannez ce QR code avec votre application TOTP :</p>
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(twoFAData.otpauthUrl)}`}
                    alt="QR 2FA"
                    style={{ borderRadius: 8, border: '1px solid #D1D9E6' }}
                  />
                </div>
                <p style={{ fontSize: 11, color: '#94A3B8', margin: '0 0 4px' }}>Clé secrète (saisie manuelle) :</p>
                <div style={{ fontFamily: 'monospace', fontSize: 11, background: '#EFF6FF', border: '1px solid rgba(37,99,235,0.20)', borderRadius: 6, padding: '6px 10px', marginBottom: 12, wordBreak: 'break-all', color: '#2563EB', letterSpacing: '0.1em' }}>
                  {twoFAData.secret}
                </div>
                <label style={labelStyle}>Code de vérification (6 chiffres)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={twoFACode}
                  onChange={e => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                  style={{ ...inputStyle, letterSpacing: '0.4em', fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 10 }}
                />
                <button
                  onClick={handleEnable2FA}
                  disabled={twoFASaving || twoFACode.length !== 6}
                  style={{ width: '100%', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 0', cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: (twoFASaving || twoFACode.length !== 6) ? 0.55 : 1 }}>
                  <Check style={{ width: 13, height: 13 }} />
                  {twoFASaving ? 'Vérification…' : 'Activer le 2FA'}
                </button>
              </>
            )}

            {twoFAEnabled && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 12, color: '#166534', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CheckCircle style={{ width: 14, height: 14 }} /> Votre compte est protégé par le 2FA.
                </p>
                <button
                  onClick={handleDisable2FA}
                  disabled={twoFASaving}
                  style={{ background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <XCircle style={{ width: 12, height: 12 }} /> Désactiver
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Colonne droite : Intégrations dynamiques ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 3px' }}>Intégrations tierces</h3>
            <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>Connectez n'importe quel service externe (paiement, SMS, push, analytics, webhooks…)</p>
          </div>
          <button onClick={() => setModal({})}
            style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <Plus style={{ width: 14, height: 14 }} /> Ajouter
          </button>
        </div>

        {/* CDC — services requis par le CDC */}
        {integrations.filter(i => CDC_NAMES.has(i.name)).length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Shield style={{ width: 11, height: 11 }} /> Services requis · Cahier des charges
            </p>
            {integrations.filter(i => CDC_NAMES.has(i.name)).map(integration => (
              <IntegrationDynamicCard
                key={integration.id} integration={integration}
                onToggle={toggleIntegration} onEdit={(i) => setModal(i)}
                onDelete={deleteIntegration} onTest={testIntegration}
                testResult={testResults[integration.id]} testing={testing[integration.id]}
              />
            ))}
          </div>
        )}

        {/* Services personnalisés */}
        {integrations.filter(i => !CDC_NAMES.has(i.name)).length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>Services personnalisés</p>
            {integrations.filter(i => !CDC_NAMES.has(i.name)).map(integration => (
              <IntegrationDynamicCard
                key={integration.id} integration={integration}
                onToggle={toggleIntegration} onEdit={(i) => setModal(i)}
                onDelete={deleteIntegration} onTest={testIntegration}
                testResult={testResults[integration.id]} testing={testing[integration.id]}
              />
            ))}
          </div>
        )}

        {integrations.length === 0 && (
          <div style={{ ...card, padding: '32px 20px', textAlign: 'center', color: '#94A3B8' }}>
            <Zap style={{ width: 28, height: 28, margin: '0 auto 8px', display: 'block', color: '#CBD5E1' }} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Chargement des intégrations…</p>
          </div>
        )}

        {/* Rétention sauvegardes */}
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database style={{ width: 16, height: 16, color: '#6366F1' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>Sauvegarde & rétention</p>
          </div>
          <div style={{ padding: '14px 20px' }}>
            <label style={labelStyle}>Rétention des sauvegardes (jours)</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input type="number" min="1"
                value={secEdits['backup_retention_days'] ?? '90'}
                onChange={e => setSecEdits(s => ({ ...s, backup_retention_days: e.target.value }))}
                style={{ ...inputStyle, flex: 1 }} />
              <span style={{ display: 'flex', alignItems: 'center', color: '#64748B', fontSize: 12, fontWeight: 600 }}>jours</span>
            </div>
            <button onClick={() => saveKey('backup_retention_days', secEdits['backup_retention_days'] ?? '90')}
              disabled={saving['backup_retention_days']}
              style={{ width: '100%', background: '#6366F1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 0', cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Save style={{ width: 13, height: 13 }} /> Enregistrer
            </button>
          </div>
        </div>
      </div>

      {modal !== null && (
        <IntegrationModal
          initial={modal}
          onClose={() => setModal(null)}
          onSave={saveIntegration}
        />
      )}
    </div>
  );
}

/* ══════════════════ Bannière — Commandes B2B en attente ══════════════════ */
function B2BPendingBanner() {
  const [pending, setPending]       = useState([]);
  const [processing, setProcessing] = useState({});

  useEffect(() => { adminAPI.getPendingB2B().then(r => setPending(r.data)).catch(() => {}); }, []);

  const validate = async (id, approved) => {
    setProcessing(p => ({ ...p, [id]: true }));
    try { await adminAPI.validateB2B(id, approved); setPending(p => p.filter(c => c.id !== id)); }
    finally { setProcessing(p => ({ ...p, [id]: false })); }
  };

  if (pending.length === 0) return null;

  return (
    <div style={{ background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: 14, padding: '14px 18px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <AlertTriangle style={{ width: 16, height: 16, color: '#D97706' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>{pending.length} compte{pending.length > 1 ? 's' : ''} B2B en attente</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pending.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: 10, padding: '10px 14px', border: '1px solid #FEF3C7', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>{c.raisonSociale}</p>
              <p style={{ fontSize: 11, color: '#64748B', margin: '2px 0 0' }}>{c.emailProfessionnel} · RCCM : {c.numeroRCCM}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => validate(c.id, false)} disabled={processing[c.id]} style={{ padding: '6px 12px', background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <XCircle style={{ width: 13, height: 13 }} /> Rejeter
              </button>
              <button onClick={() => validate(c.id, true)} disabled={processing[c.id]} style={{ padding: '6px 12px', background: '#DCFCE7', color: '#166534', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check style={{ width: 13, height: 13 }} /> Valider
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════ MÉTRIQUES SYSTÈME ══════════════════ */
function MetriquesTab() {
  const [metrics, setMetrics]   = useState(null);
  const [stats, setStats]       = useState(null);
  const [backups, setBackups]   = useState([]);
  const [backupRunning, setBackupRunning] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [refreshAt, setRefreshAt] = useState(Date.now());
  const [apiResponseMs, setApiResponseMs] = useState(null);

  useEffect(() => {
    setLoading(true);
    const t0 = Date.now();
    Promise.all([
      adminAPI.getSystemMetrics(),
      adminAPI.getStats(),
      adminAPI.getBackups().catch(() => ({ data: [] })),
    ])
      .then(([m, s, b]) => {
        setApiResponseMs(Date.now() - t0);
        setMetrics(m.data); setStats(s.data); setBackups(Array.isArray(b.data) ? b.data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshAt]);

  const handleRunBackup = async () => {
    setBackupRunning(true);
    try {
      await adminAPI.runBackup();
      setRefreshAt(Date.now());
    } catch { alert('Backup échoué — pg_dump doit être installé et DATABASE_URL configuré.'); }
    finally { setBackupRunning(false); }
  };

  const Stat = ({ label, value, sub, color = '#2563EB' }) => (
    <div style={{ ...card, padding: '18px 22px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px' }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 800, color, margin: 0 }}>{value ?? '—'}</p>
      {sub && <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0' }}>{sub}</p>}
    </div>
  );

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}>Chargement des métriques…</div>;

  const MONTH_SEC = 30 * 24 * 3600;
  const uptimePct = metrics ? Math.min(100, (metrics.uptime?.seconds / MONTH_SEC) * 100) : null;
  const slaColor = uptimePct === null ? '#94A3B8' : uptimePct >= 99.5 ? '#10B981' : uptimePct >= 99 ? '#F59E0B' : '#EF4444';
  const slaLabel = uptimePct === null ? '—' : uptimePct >= 99.5 ? 'SLA respecté' : uptimePct >= 99 ? 'SLA marginal' : 'SLA critique';
  const apiLatencyColor = apiResponseMs === null ? '#94A3B8' : apiResponseMs < 500 ? '#10B981' : apiResponseMs < 1500 ? '#F59E0B' : '#EF4444';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>Métriques système</h2>
        <button onClick={() => setRefreshAt(Date.now())} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #D1D9E6', borderRadius: 9, padding: '7px 14px', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748B' }}>
          <RefreshCw style={{ width: 13, height: 13 }} /> Actualiser
        </button>
      </div>

      {/* ── SLA & Disponibilité (RG-30) ── */}
      {uptimePct !== null && (
        <>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>SLA & Disponibilité</p>
          <div style={{ ...card, padding: '20px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32, flexWrap: 'wrap' }}>
              {/* Uptime gauge */}
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>Disponibilité (30 j)</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: slaColor }}>{uptimePct.toFixed(2)}%</span>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>/ 99.5% cible</span>
                </div>
                <div style={{ height: 8, background: '#F1F5F9', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${uptimePct}%`, background: slaColor, borderRadius: 8 }} />
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: slaColor + '22', color: slaColor, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                  {uptimePct >= 99.5 ? <CheckCircle style={{ width: 12, height: 12 }} /> : <AlertTriangle style={{ width: 12, height: 12 }} />}
                  {slaLabel}
                </span>
              </div>

              {/* API response time */}
              <div style={{ minWidth: 160 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>Temps réponse API</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: apiLatencyColor }}>{apiResponseMs ?? '—'}</span>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>ms</span>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: apiLatencyColor + '22', color: apiLatencyColor, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                  {apiResponseMs !== null && apiResponseMs < 500 ? <CheckCircle style={{ width: 12, height: 12 }} /> : <AlertTriangle style={{ width: 12, height: 12 }} />}
                  {apiResponseMs === null ? '—' : apiResponseMs < 500 ? '< 500ms ✓' : apiResponseMs < 1500 ? 'Acceptable' : 'Lent'}
                </span>
              </div>

              {/* SLA targets checklist */}
              <div style={{ minWidth: 220 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>Objectifs SLA</p>
                {[
                  { label: 'Disponibilité ≥ 99.5%', met: uptimePct >= 99.5 },
                  { label: 'Réponse API < 500ms', met: apiResponseMs !== null && apiResponseMs < 500 },
                  { label: `Uptime: ${metrics.uptime?.label ?? '—'}`, met: true },
                  { label: `Env: ${metrics.env ?? '—'}`, met: metrics.env === 'production' || metrics.env === 'staging' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    {row.met
                      ? <CheckCircle style={{ width: 14, height: 14, color: '#10B981', flexShrink: 0 }} />
                      : <XCircle style={{ width: 14, height: 14, color: '#EF4444', flexShrink: 0 }} />}
                    <span style={{ fontSize: 12, color: row.met ? '#475569' : '#991B1B' }}>{row.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Process metrics */}
      {metrics && (
        <>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Processus Node.js</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
            <Stat label="Uptime serveur" value={metrics.uptime?.label} sub={`${metrics.uptime?.seconds}s`} color="#10B981" />
            <Stat label="RAM utilisée" value={`${metrics.memory?.heapUsed} Mo`} sub={`sur ${metrics.memory?.heapTotal} Mo alloués`} color="#6366F1" />
            <Stat label="RSS mémoire" value={`${metrics.memory?.rss} Mo`} sub="Resident Set Size" color="#8B5CF6" />
            <Stat label="Node.js" value={metrics.node} sub={`Env: ${metrics.env}`} color="#0EA5E9" />
          </div>
        </>
      )}

      {/* Platform stats */}
      {stats && (
        <>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Plateforme</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
            <Stat label="Utilisateurs" value={stats.users?.total} sub={`dont ${stats.users?.admins} admin(s)`} color="#F59E0B" />
            <Stat label="Gérants" value={stats.users?.gerants} sub="restaurants actifs" color="#C05015" />
            <Stat label="Clients" value={stats.users?.clients} sub={`+ ${stats.users?.b2b ?? 0} B2B`} color="#2563EB" />
            <Stat label="Restaurants" value={stats.restaurants?.total} sub={`${stats.restaurants?.active} actifs`} color="#10B981" />
            <Stat label="B2B en attente" value={stats.b2b?.pending} sub="validations requises" color={stats.b2b?.pending > 0 ? '#EF4444' : '#10B981'} />
            <Stat label="Logs d'audit" value={stats.audit?.total?.toLocaleString('fr-FR')} sub="événements enregistrés" color="#64748B" />
          </div>
        </>
      )}

      {/* Backup section */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Sauvegarde Base de données</p>
            <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>pg_dump automatique chaque nuit à 2h — rétention 30 jours</p>
          </div>
          <button
            onClick={handleRunBackup} disabled={backupRunning}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: backupRunning ? '#94A3B8' : '#0F172A', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: backupRunning ? 'not-allowed' : 'pointer' }}
          >
            <Database style={{ width: 14, height: 14 }} />
            {backupRunning ? 'Backup en cours…' : 'Lancer un backup'}
          </button>
        </div>
        {backups.length === 0 ? (
          <p style={{ padding: '20px 20px', color: '#94A3B8', fontSize: 13 }}>Aucun backup disponible.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                {['Fichier', 'Taille', 'Date'].map(h => (
                  <th key={h} style={{ padding: '8px 16px', fontSize: 10, fontWeight: 700, color: '#94A3B8', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {backups.slice(0, 10).map(b => (
                <tr key={b.file} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '9px 16px', fontSize: 12, color: '#0F172A', fontFamily: 'monospace' }}>{b.file}</td>
                  <td style={{ padding: '9px 16px', fontSize: 12, color: '#64748B' }}>{b.sizeKb} Ko</td>
                  <td style={{ padding: '9px 16px', fontSize: 12, color: '#64748B' }}>{new Date(b.createdAt).toLocaleString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Timestamp */}
      {metrics && (
        <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'right' }}>
          Dernière mise à jour : {new Date(metrics.timestamp).toLocaleString('fr-FR')}
        </p>
      )}
    </div>
  );
}

/* ══════════════════ FOURNISSEURS TAB ══════════════════ */
const EMPTY_FOURN = { nom: '', contact: '', telephone: '', email: '', adresse: '', delaiLivraison: '', articlesRef: '', notes: '' };

function FournisseursTab() {
  const [list, setList]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null); // null | 'create' | { ...fournisseur }
  const [form, setForm]         = useState(EMPTY_FOURN);
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fournisseursAPI.getAll(); setList(r.data); }
    catch { setList([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY_FOURN); setModal('create'); };
  const openEdit   = (f)  => { setForm({ ...f, delaiLivraison: f.delaiLivraison ?? '', articlesRef: f.articlesRef ?? '', notes: f.notes ?? '' }); setModal(f); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, delaiLivraison: form.delaiLivraison ? parseInt(form.delaiLivraison) : null };
      if (modal === 'create') await fournisseursAPI.create(payload);
      else await fournisseursAPI.update(modal.id, payload);
      setModal(null); load();
    } catch { /* silently keep modal open */ }
    finally { setSaving(false); }
  };

  const handleToggle = async (f) => {
    await fournisseursAPI.toggle(f.id); load();
  };

  const handleDelete = async (f) => {
    if (!window.confirm(`Supprimer ${f.nom} ?`)) return;
    await fournisseursAPI.remove(f.id); load();
  };

  const filtered = list.filter(f =>
    !search || f.nom?.toLowerCase().includes(search.toLowerCase()) ||
    f.contact?.toLowerCase().includes(search.toLowerCase())
  );

  const Field = ({ label, field, type = 'text', placeholder }) => (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>{label}</label>
      <input
        type={type} value={form[field] ?? ''}
        onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
        placeholder={placeholder}
        style={{ width: '100%', border: '1px solid #D1D9E6', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
      />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>Fournisseurs</h2>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: '2px 0 0' }}>{list.length} fournisseur{list.length !== 1 ? 's' : ''} enregistré{list.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#94A3B8' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              style={{ border: '1px solid #D1D9E6', borderRadius: 9, padding: '8px 12px 8px 32px', fontSize: 13, outline: 'none', width: 200 }}
            />
          </div>
          <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 7, background: ACCENT, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus style={{ width: 14, height: 14 }} /> Ajouter
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={card}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
            <Truck style={{ width: 32, height: 32, marginBottom: 8, opacity: 0.4 }} />
            <p style={{ margin: 0 }}>Aucun fournisseur pour l'instant</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                {['Fournisseur', 'Contact', 'Téléphone', 'Email', 'Délai (j)', 'Statut', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#64748B', textAlign: 'left', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0 }}>{f.nom}</p>
                    {f.adresse && <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>{f.adresse}</p>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>{f.contact || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>{f.telephone || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>{f.email || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', textAlign: 'center' }}>{f.delaiLivraison ?? '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 9px', background: f.actif ? '#D1FAE5' : '#FEE2E2', color: f.actif ? '#065F46' : '#991B1B' }}>
                      {f.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(f)} title="Modifier" style={{ border: '1px solid #D1D9E6', borderRadius: 7, padding: '5px 8px', background: '#fff', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center' }}>
                        <Pencil style={{ width: 13, height: 13 }} />
                      </button>
                      <button onClick={() => handleToggle(f)} title={f.actif ? 'Désactiver' : 'Activer'} style={{ border: '1px solid #D1D9E6', borderRadius: 7, padding: '5px 8px', background: f.actif ? '#FEF3C7' : '#D1FAE5', cursor: 'pointer', color: f.actif ? '#92400E' : '#065F46', display: 'flex', alignItems: 'center' }}>
                        {f.actif ? <ToggleRight style={{ width: 13, height: 13 }} /> : <ToggleLeft style={{ width: 13, height: 13 }} />}
                      </button>
                      <button onClick={() => handleDelete(f)} title="Supprimer" style={{ border: '1px solid #FEE2E2', borderRadius: 7, padding: '5px 8px', background: '#FFF5F5', cursor: 'pointer', color: '#2563EB', display: 'flex', alignItems: 'center' }}>
                        <Trash2 style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal create/edit */}
      {modal !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 540, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>{modal === 'create' ? 'Nouveau fournisseur' : `Modifier — ${modal.nom}`}</h3>
              <button onClick={() => setModal(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94A3B8' }}><X style={{ width: 18, height: 18 }} /></button>
            </div>
            <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Nom *" field="nom" placeholder="SYSCO Abidjan" />
              <Field label="Contact" field="contact" placeholder="Jean Kouassi" />
              <Field label="Téléphone" field="telephone" placeholder="+225 07 00 00 00" />
              <Field label="Email" field="email" type="email" placeholder="fournisseur@email.com" />
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Adresse" field="adresse" placeholder="Zone Industrielle Vridi, Abidjan" />
              </div>
              <Field label="Délai livraison (jours)" field="delaiLivraison" type="number" placeholder="3" />
              <Field label="Articles de référence" field="articlesRef" placeholder="Poulet, riz, légumes..." />
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Notes</label>
                <textarea
                  value={form.notes ?? ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Conditions particulières, historique..."
                  rows={3}
                  style={{ width: '100%', border: '1px solid #D1D9E6', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setModal(null)} style={{ border: '1px solid #D1D9E6', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, background: '#fff', cursor: 'pointer', color: '#64748B' }}>Annuler</button>
              <button onClick={handleSave} disabled={saving || !form.nom} style={{ border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, background: ACCENT, color: '#fff', cursor: 'pointer', opacity: saving || !form.nom ? 0.6 : 1 }}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════ COMMISSIONS TAB ══════════════════ */
function CommissionsTab() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [newTaux, setNewTaux] = useState('');
  const [saving, setSaving]   = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await adminAPI.getCommissions(); setData(r.data); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSaveTaux = async (id) => {
    setSaving(true);
    try {
      await adminAPI.updateTauxCommission(id, parseFloat(newTaux));
      setEditing(null);
      await load();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}>
      <RefreshCw style={{ width:22, height:22, color: ACCENT, animation:'spin 1s linear infinite' }} />
    </div>
  );

  const kpis = [
    { label:'Total commissions perçues', value: `${(data?.totalCommissions ?? 0).toLocaleString('fr-FR')} FCFA`, icon: CreditCard, color:'#10B981', bg:'#ECFDF5' },
    { label:'Commissions ce mois',       value: `${(data?.commissionsMois ?? 0).toLocaleString('fr-FR')} FCFA`, icon: TrendingUp, color:'#2563EB', bg:'#FEF2F2' },
    { label:'Commandes facturées',        value: data?.totalCommandes ?? 0,                                        icon: BarChart2,  color:'#2563EB', bg:'rgba(37,99,235,0.08)' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} style={{ background:'#fff', borderRadius:14, padding:'20px 22px', border:'1px solid #D1D9E6', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon style={{ width:20, height:20, color }} />
            </div>
            <div>
              <p style={{ fontSize:20, fontWeight:800, color:'#0F172A', margin:0 }}>{value}</p>
              <p style={{ fontSize:11, color:'#64748B', margin:0, marginTop:2 }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tableau par restaurant */}
      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #D1D9E6', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #D1D9E6', display:'flex', alignItems:'center', gap:8 }}>
          <Percent style={{ width:16, height:16, color: ACCENT }} />
          <p style={{ fontSize:14, fontWeight:700, color:'#0F172A', margin:0 }}>Commissions par restaurant</p>
          <span style={{ fontSize:11, color:'#94A3B8', marginLeft:'auto' }}>Taux modifiable — s'applique aux prochaines commandes</span>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#F8FAFC' }}>
              {['Restaurant','Commandes','Total perçu','Taux (%)','Action'].map(h => (
                <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.parRestaurant ?? []).map((r, i, arr) => (
              <tr key={r.restaurantId} style={{ borderBottom: i < arr.length-1 ? '1px solid #F1F5F9' : 'none' }}>
                <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600, color:'#0F172A' }}>{r.nom}</td>
                <td style={{ padding:'12px 16px', fontSize:13, color:'#334155' }}>{r.totalCommandes}</td>
                <td style={{ padding:'12px 16px', fontSize:13, fontWeight:700, color:'#10B981' }}>{r.totalCommissions.toLocaleString('fr-FR')} FCFA</td>
                <td style={{ padding:'12px 16px' }}>
                  {editing === r.restaurantId ? (
                    <input
                      type="number" value={newTaux} min={0} max={50} step={0.5}
                      onChange={e => setNewTaux(e.target.value)}
                      style={{ width:70, padding:'4px 8px', border:`1px solid ${ACCENT}`, borderRadius:7, fontSize:13, outline:'none' }}
                    />
                  ) : (
                    <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(37,99,235,0.10)', color: ACCENT, borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:700 }}>
                      {r.tauxCommission}%
                    </span>
                  )}
                </td>
                <td style={{ padding:'12px 16px' }}>
                  {editing === r.restaurantId ? (
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => handleSaveTaux(r.restaurantId)} disabled={saving}
                        style={{ padding:'5px 12px', background: ACCENT, color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', opacity: saving ? 0.6 : 1 }}>
                        {saving ? '…' : 'Sauver'}
                      </button>
                      <button onClick={() => setEditing(null)}
                        style={{ padding:'5px 10px', background:'#F1F5F9', color:'#64748B', border:'none', borderRadius:7, fontSize:12, cursor:'pointer' }}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditing(r.restaurantId); setNewTaux(String(r.tauxCommission)); }}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:7, fontSize:12, color:'#334155', cursor:'pointer', fontWeight:500 }}>
                      <Pencil style={{ width:12, height:12 }} /> Modifier
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {(data?.parRestaurant ?? []).length === 0 && (
              <tr><td colSpan={5} style={{ padding:'40px 16px', textAlign:'center', color:'#94A3B8', fontSize:13 }}>
                Aucune commission enregistrée — les commandes livrées génèrent automatiquement les commissions.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize:11, color:'#94A3B8', textAlign:'center', margin:0 }}>
        Commission prélevée automatiquement à chaque commande marquée <strong>LIVREE</strong> · Taux par défaut 8%
      </p>
    </div>
  );
}

/* ══════════════════ TAB: NOTIFICATIONS ══════════════════ */
function NotificationsTab() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');

  const CATEGORIES = {
    security:    { label: 'Sécurité',    color: '#DC2626', bg: '#FEF2F2', icon: Shield },
    b2b:         { label: 'B2B',         color: '#7C3AED', bg: '#F5F3FF', icon: Building2 },
    user:        { label: 'Utilisateur', color: '#2563EB', bg: '#EFF6FF', icon: Users },
    payment:     { label: 'Paiement',    color: '#059669', bg: '#F0FDF4', icon: CreditCard },
    system:      { label: 'Système',     color: '#D97706', bg: '#FFFBEB', icon: Zap },
    restaurant:  { label: 'Restaurant',  color: '#0891B2', bg: '#F0F9FF', icon: UtensilsCrossed },
  };

  const SEC_ACTIONS = new Set(['LOGIN_FAILED', 'UNAUTHORIZED_ACCESS', 'INVALID_TOKEN', 'SUSPICIOUS_ACTIVITY', 'BRUTE_FORCE']);
  const PAY_ACTIONS = new Set(['PAIEMENT_RECU', 'PAIEMENT_ECHOUE', 'REMBOURSEMENT', 'PAIEMENT_INITIE']);
  const B2B_ACTIONS = new Set(['B2B_CREATED', 'B2B_APPROVED', 'B2B_REJECTED', 'B2B_ORDER', 'B2B_INVOICE']);
  const REST_ACTIONS = new Set(['RESTAURANT_CREATED', 'RESTAURANT_UPDATED', 'RESTAURANT_DISABLED']);

  const categorize = (log) => {
    if (SEC_ACTIONS.has(log.action)) return 'security';
    if (PAY_ACTIONS.has(log.action)) return 'payment';
    if (B2B_ACTIONS.has(log.action)) return 'b2b';
    if (REST_ACTIONS.has(log.action)) return 'restaurant';
    if (['USER_CREATED', 'USER_UPDATED', 'REGISTER'].includes(log.action)) return 'user';
    return 'system';
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, pendingB2B] = await Promise.all([
        adminAPI.getAuditLogs({ limit: 80 }),
        adminAPI.getPendingB2B().catch(() => ({ data: [] })),
      ]);

      const logs = (logsRes.data || []).map(l => ({
        id: l.id,
        type: categorize(l),
        action: l.action,
        detail: l.details || l.metadata || null,
        userId: l.userId,
        createdAt: l.createdAt,
        source: 'audit',
      }));

      const b2bNotifs = (pendingB2B.data || []).map(c => ({
        id: `b2b-${c.id}`,
        type: 'b2b',
        action: 'B2B_PENDING',
        detail: `${c.raisonSociale} — ${c.emailProfessionnel}`,
        userId: null,
        createdAt: c.createdAt,
        source: 'b2b',
        pending: c,
      }));

      const merged = [...b2bNotifs, ...logs].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );
      setItems(merged);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const ACTION_LABELS = {
    LOGIN_FAILED:          'Tentative de connexion échouée',
    UNAUTHORIZED_ACCESS:   'Accès non autorisé détecté',
    INVALID_TOKEN:         'Token JWT invalide',
    SUSPICIOUS_ACTIVITY:   'Activité suspecte',
    BRUTE_FORCE:           'Attaque brute-force détectée',
    PAIEMENT_RECU:         'Paiement reçu',
    PAIEMENT_ECHOUE:       'Paiement échoué',
    REMBOURSEMENT:         'Remboursement effectué',
    PAIEMENT_INITIE:       'Paiement initié',
    B2B_CREATED:           'Nouveau compte B2B créé',
    B2B_APPROVED:          'Compte B2B approuvé',
    B2B_REJECTED:          'Compte B2B rejeté',
    B2B_ORDER:             'Commande B2B passée',
    B2B_INVOICE:           'Facture B2B générée',
    B2B_PENDING:           'Compte B2B en attente de validation',
    USER_CREATED:          'Nouvel utilisateur inscrit',
    USER_UPDATED:          'Profil utilisateur modifié',
    REGISTER:              'Inscription effectuée',
    RESTAURANT_CREATED:    'Nouveau restaurant ajouté',
    RESTAURANT_UPDATED:    'Restaurant mis à jour',
    RESTAURANT_DISABLED:   'Restaurant désactivé',
  };

  const displayed = filter === 'all' ? items : items.filter(i => i.type === filter);
  const counts = items.reduce((acc, i) => { acc[i.type] = (acc[i.type] || 0) + 1; return acc; }, {});

  const [validating, setValidating] = useState({});
  const handleB2BAction = async (pendingItem, approved) => {
    setValidating(v => ({ ...v, [pendingItem.id]: true }));
    try {
      await adminAPI.validateB2B(pendingItem.pending.id, approved);
      setItems(prev => prev.filter(x => x.id !== pendingItem.id));
    } catch { /* ignore */ }
    finally { setValidating(v => ({ ...v, [pendingItem.id]: false })); }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell style={{ width: 18, height: 18, color: ACCENT }} />
            Centre de notifications
          </h2>
          <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>
            {items.length} événement{items.length > 1 ? 's' : ''} — actualisation auto toutes les 30s
          </p>
        </div>
        <button onClick={load} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F1F5F9', border: 'none', borderRadius: 9, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569' }}>
          <RefreshCw style={{ width: 13, height: 13, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualiser
        </button>
      </div>

      {/* Filtres par catégorie */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        <button onClick={() => setFilter('all')}
          style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
            background: filter === 'all' ? ACCENT : '#F1F5F9',
            color: filter === 'all' ? '#fff' : '#475569' }}>
          Tout ({items.length})
        </button>
        {Object.entries(CATEGORIES).map(([key, cat]) => {
          const Icon = cat.icon;
          const count = counts[key] || 0;
          if (!count) return null;
          return (
            <button key={key} onClick={() => setFilter(key)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                background: filter === key ? cat.color : cat.bg,
                color: filter === key ? '#fff' : cat.color }}>
              <Icon style={{ width: 12, height: 12 }} />
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Liste */}
      <div style={{ ...card, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
            <RefreshCw style={{ width: 22, height: 22, margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
            Chargement des notifications…
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}>
            <Bell style={{ width: 28, height: 28, margin: '0 auto 10px', display: 'block', color: '#CBD5E1' }} />
            <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Aucune notification</p>
          </div>
        ) : (
          <div style={{ maxHeight: 640, overflowY: 'auto' }}>
            {displayed.slice(0, 60).map((item, i) => {
              const cat = CATEGORIES[item.type] || CATEGORIES.system;
              const CatIcon = cat.icon;
              const label = ACTION_LABELS[item.action] || item.action;
              const isB2BPending = item.source === 'b2b';
              return (
                <div key={item.id}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 20px',
                    borderBottom: i < displayed.length - 1 ? '1px solid #F1F5F9' : 'none',
                    background: isB2BPending ? '#FFFBEB' : (i % 2 === 0 ? '#fff' : '#FAFCFF') }}>

                  {/* Icône catégorie */}
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CatIcon style={{ width: 16, height: 16, color: cat.color }} />
                  </div>

                  {/* Contenu */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{label}</span>
                      <span style={{ background: cat.bg, color: cat.color, borderRadius: 6, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{cat.label}</span>
                      {isB2BPending && (
                        <span style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 6, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>⚠ Action requise</span>
                      )}
                    </div>
                    {item.detail && (
                      <p style={{ margin: '0 0 6px', fontSize: 12, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {typeof item.detail === 'object' ? JSON.stringify(item.detail).slice(0, 80) : String(item.detail).slice(0, 80)}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {item.userId && (
                        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#94A3B8' }}>
                          user:{item.userId.slice(0, 8)}…
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>
                        {new Date(item.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Actions B2B */}
                  {isB2BPending && item.pending && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => handleB2BAction(item, false)} disabled={validating[item.id]}
                        style={{ padding: '5px 10px', background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <XCircle style={{ width: 11, height: 11 }} /> Rejeter
                      </button>
                      <button onClick={() => handleB2BAction(item, true)} disabled={validating[item.id]}
                        style={{ padding: '5px 10px', background: '#DCFCE7', color: '#166534', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Check style={{ width: 11, height: 11 }} /> Valider
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {displayed.length > 0 && (
        <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', margin: '12px 0 0' }}>
          Affichage des {Math.min(displayed.length, 60)} événements les plus récents sur {displayed.length}
        </p>
      )}
    </div>
  );
}

/* ══════════════════ TABS ══════════════════ */
const TABS = [
  { id: 'overview',       label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: 'notifications',  label: 'Notifications',  icon: Bell },
  { id: 'users',          label: 'Utilisateurs',   icon: Users },
  { id: 'restaurants',    label: 'Restaurants',    icon: UtensilsCrossed },
  { id: 'fournisseurs',   label: 'Fournisseurs',   icon: Truck },
  { id: 'metriques',      label: 'Métriques',      icon: Activity },
  { id: 'audit',          label: 'Audit',          icon: ScrollText },
  { id: 'commissions',    label: 'Commissions',    icon: Percent },
  { id: 'exports',        label: 'Exports',        icon: Download },
  { id: 'config',         label: 'Configuration',  icon: Settings },
];

/* ═══ AdminDashboard — Composant principal ═══ */
export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const tab   = new URLSearchParams(location.search).get('tab') || 'overview';
  const goTab = (id) => navigate(id === 'overview' ? '/admin' : `/admin?tab=${id}`);

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `${ACCENT}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield style={{ width: 16, height: 16, color: ACCENT }} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Dashboard {TABS.find(t => t.id === tab)?.label || 'Overview'}
            </h1>
          </div>
          <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>Sankofa-Lab · Administration Système · CDC v1.1</p>
        </div>
      </div>

      {tab === 'overview' && <B2BPendingBanner />}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#fff', borderRadius: 12, padding: 4, border: '1px solid #D1D9E6', overflowX: 'auto' }}>
        {TABS.map(t => {
          const Icon   = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => goTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 14px', border: 'none', borderRadius: 9,
                cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
                background: active ? ACCENT : 'transparent',
                color: active ? '#fff' : '#64748B',
                boxShadow: active ? `0 2px 8px ${ACCENT}33` : 'none',
                transition: 'all 0.15s',
              }}
            >
              <Icon style={{ width: 14, height: 14 }} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview'       && <OverviewTab />}
      {tab === 'notifications'  && <NotificationsTab />}
      {tab === 'users'          && <UsersTab />}
      {tab === 'restaurants'    && <RestaurantsTab />}
      {tab === 'fournisseurs'   && <FournisseursTab />}
      {tab === 'metriques'      && <MetriquesTab />}
      {tab === 'audit'          && <AuditTab />}
      {tab === 'commissions'    && <CommissionsTab />}
      {tab === 'exports'        && <ExportsTab />}
      {tab === 'config'         && <ConfigTab />}
      <OnboardingWizard />
    </div>
  );
}
