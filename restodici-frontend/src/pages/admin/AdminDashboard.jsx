import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Chart from 'chart.js/auto';
import { adminAPI, authAPI } from '../../services/api';
import {
  Users, UtensilsCrossed, ScrollText, Download, Settings,
  RefreshCw, ToggleLeft, ToggleRight, Plus, X, Check,
  Shield, Activity, CheckCircle, XCircle, Clock, Search,
  Filter, ChevronDown, AlertTriangle, Building2, LayoutDashboard,
  TrendingUp, TrendingDown, MoreVertical, Eye, EyeOff, Save,
  Zap, MessageSquare, Bell, Lock, Globe, Database,
  FileText, Calendar, ChevronRight, ExternalLink, Info,
  CreditCard, Smartphone, Mail, BarChart2, Webhook,
} from 'lucide-react';

/* ── Design tokens ─────────────────────────────────── */
const ACCENT = '#4F46E5';
const ROLES  = ['ADMIN', 'GERANT', 'STAFF', 'CLIENT', 'B2B'];
const ROLE_COLOR = {
  ADMIN:  { bg: '#EEF2FF', text: '#4338CA', chart: '#4F46E5' },
  GERANT: { bg: '#FEF3C7', text: '#92400E', chart: '#F59E0B' },
  STAFF:  { bg: '#DCFCE7', text: '#166534', chart: '#10B981' },
  CLIENT: { bg: '#F0F9FF', text: '#0369A1', chart: '#0EA5E9' },
  B2B:    { bg: '#F3E8FF', text: '#6B21A8', chart: '#A855F7' },
};
const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

/* ── Shared styles ──────────────────────────────────── */
const inputStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0',
  borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff',
};
const labelStyle = { fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 };
const card = { background: '#fff', borderRadius: 16, border: '1px solid #E8EDF5', overflow: 'hidden' };

/* ── Utility ────────────────────────────────────────── */
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

/* ══════════════════ STAT CARD (Flowdex style) ══════════════════ */
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
            : <TrendingDown style={{ width: 14, height: 14, color: featured ? '#FCA5A5' : '#DC2626' }} />
          }
          <span style={{ fontSize: 12, fontWeight: 700, color: featured ? (trendUp ? '#86EFAC' : '#FCA5A5') : (trendUp ? '#16A34A' : '#DC2626') }}>
            {trend}
          </span>
          <span style={{ fontSize: 11, color: featured ? 'rgba(255,255,255,0.55)' : '#94A3B8' }}>{sub}</span>
        </div>
      )}
    </div>
  );
}

/* ══════════════════ CHART: BARRES Inscriptions + Activité ══════════════════ */
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
            backgroundColor: 'rgba(167,139,250,0.7)',
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Actions audit',
            data: auditByDay.map(d => d.count),
            backgroundColor: 'rgba(79,70,229,0.85)',
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

/* ══════════════════ CHART: DONUT rôles ══════════════════ */
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

/* ══════════════════ HEATMAP activité ══════════════════ */
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
    if (count === 0) return '#F1F5F9';
    const intensity = count / maxVal;
    if (intensity < 0.25) return '#C7D2FE';
    if (intensity < 0.5)  return '#818CF8';
    if (intensity < 0.75) return '#4F46E5';
    return '#3730A3';
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
        {['#F1F5F9', '#C7D2FE', '#818CF8', '#4F46E5', '#3730A3'].map(c => (
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
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Inscriptions &amp; Activité</p>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>7 derniers jours</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[{ color: 'rgba(167,139,250,0.7)', label: 'Inscriptions' }, { color: 'rgba(79,70,229,0.85)', label: 'Audit' }].map(l => (
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
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9' }}>
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
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9' }}>
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
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Activité récente</p>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>10 dernières actions — lecture seule (RG-34)</p>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                    style={{ borderBottom: '1px solid #F8FAFC', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F0F4FF'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFAFA'; }}
                  >
                    <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 11, color: '#94A3B8' }}>#{log.id?.slice(0, 6)}</td>
                    <td style={{ padding: '9px 14px' }}>
                      <span style={{ background: '#EEF2FF', color: '#4338CA', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{log.action}</span>
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
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9' }}>
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
                : <XCircle    style={{ width: 14, height: 14, color: '#DC2626' }} />
              }
              <span style={{ fontSize: 12, fontWeight: 600, color: s.ok ? '#15803D' : '#B91C1C' }}>{s.label}</span>
            </div>
          ))}
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
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E8EDF5' }}>
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
                <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}
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
                    <button onClick={() => toggle(u.id)} title={u.actif ? 'Désactiver' : 'Activer'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: u.actif ? '#DC2626' : '#16A34A' }}>
                      {u.actif ? <ToggleRight style={{ width: 20, height: 20 }} /> : <ToggleLeft style={{ width: 20, height: 20 }} />}
                    </button>
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
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              {formError && <p style={{ color: '#DC2626', fontSize: 12, margin: 0 }}>{formError}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: 10, border: '1px solid #E2E8F0', borderRadius: 10, cursor: 'pointer', fontWeight: 600, color: '#475569', background: '#fff' }}>Annuler</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: 10, border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, color: '#fff', background: ACCENT, opacity: saving ? 0.7 : 1 }}>{saving ? 'Création…' : 'Créer'}</button>
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

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await adminAPI.getRestaurants(); setRestaurants(r.data); } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id) => { try { await adminAPI.toggleRestaurant(id); load(); } catch { /* ignore */ } };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await adminAPI.createRestaurant(form); setShowModal(false); setForm({ nom: '', telephone: '', adresse: '', email: '', description: '' }); load(); }
    finally { setSaving(false); }
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
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E8EDF5' }}>
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
                <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{r.nom}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.adresse}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569' }}>{r.telephone}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569' }}>{r.users?.length ?? 0}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569' }}>{Number(r.noteMoyenne || 0).toFixed(1)} ★</td>
                  <td style={{ padding: '10px 14px' }}><span style={{ background: r.actif ? '#DCFCE7' : '#FEE2E2', color: r.actif ? '#166534' : '#991B1B', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{r.actif ? 'Actif' : 'Inactif'}</span></td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => toggle(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: r.actif ? '#DC2626' : '#16A34A' }}>
                      {r.actif ? <ToggleRight style={{ width: 20, height: 20 }} /> : <ToggleLeft style={{ width: 20, height: 20 }} />}
                    </button>
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
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
    </div>
  );
}

/* ══════════════════ TAB: AUDIT LOGS ══════════════════ */
/* ── Badge couleur par famille d'action ── */
const ACTION_STYLE = (action = '') => {
  const a = action.toUpperCase();
  if (a.includes('LOGIN') || a.includes('AUTH'))    return { bg: '#DCFCE7', text: '#166534' };
  if (a.includes('DELETE') || a.includes('REMOVE')) return { bg: '#FEE2E2', text: '#991B1B' };
  if (a.includes('CREATE') || a.includes('ADD'))    return { bg: '#EEF2FF', text: '#3730A3' };
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
          <button onClick={exportCSV} disabled={exporting} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
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
              <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E8EDF5' }}>
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
                    onMouseEnter={e => { e.currentTarget.style.background = '#F0F4FF'; }}
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
                    <tr key={`${log.id}-exp`} style={{ background: '#F0F4FF', borderBottom: '1px solid #E0E8FF' }}>
                      <td colSpan={7} style={{ padding: '10px 20px 14px' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Payload complet · ID: {log.id}</p>
                        <pre style={{ margin: 0, fontSize: 11, color: '#334155', background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid #E0E7FF', overflowX: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
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
  const [dlState, setDlState]     = useState({});
  const [sysHistory, setSysHistory] = useState([]);
  const [auditHistory, setAuditHistory] = useState([]);
  const [sysPeriod, setSysPeriod] = useState('monthly');

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSyscohada = async () => {
    setDlState(s => ({ ...s, syscohada: true }));
    try {
      const r    = await adminAPI.exportSyscohada(sysPeriod);
      const blob = new Blob([r.data], { type: 'text/csv;charset=utf-8;' });
      const name = `SYSCOHADA-${sysPeriod}-${new Date().toISOString().slice(0, 10)}.csv`;
      triggerDownload(blob, name);
      setSysHistory(h => [{ name, ts: new Date().toISOString(), period: sysPeriod }, ...h].slice(0, 5));
    } finally { setDlState(s => ({ ...s, syscohada: false })); }
  };

  const downloadAudit = async () => {
    setDlState(s => ({ ...s, audit: true }));
    try {
      const r    = await adminAPI.exportAudit({});
      const blob = new Blob([r.data], { type: 'text/csv;charset=utf-8;' });
      const name = `Audit-RG34-${new Date().toISOString().slice(0, 10)}.csv`;
      triggerDownload(blob, name);
      setAuditHistory(h => [{ name, ts: new Date().toISOString() }, ...h].slice(0, 5));
    } finally { setDlState(s => ({ ...s, audit: false })); }
  };

  const fmtTs = (iso) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const ExportCard = ({ icon: Icon, color, title, badge, desc, compliance, children, history }) => (
    <div style={{ ...card, overflow: 'hidden' }}>
      <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon style={{ width: 22, height: 22, color }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>{title}</p>
              {badge && <span style={{ fontSize: 10, background: `${color}14`, color, borderRadius: 5, padding: '2px 7px', fontWeight: 700 }}>{badge}</span>}
            </div>
            <p style={{ fontSize: 11, color: '#94A3B8', margin: '3px 0 0' }}>{desc}</p>
          </div>
        </div>
        {children}
      </div>
      {compliance && (
        <div style={{ padding: '10px 20px', background: '#FFFBEB', borderBottom: '1px solid #FEF3C7', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Info style={{ width: 13, height: 13, color: '#D97706', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: '#92400E', margin: 0, lineHeight: 1.5 }}>{compliance}</p>
        </div>
      )}
      {history && history.length > 0 && (
        <div style={{ padding: '10px 20px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Historique de session</p>
          {history.map((h, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < history.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
              <span style={{ fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText style={{ width: 11, height: 11, color: '#94A3B8' }} />{h.name}
              </span>
              <span style={{ fontSize: 10, color: '#94A3B8' }}>{fmtTs(h.ts)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>Exports & Rapports</h2>
        <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>Exports comptables OHADA, journaux d'audit, données plateforme</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* SYSCOHADA */}
        <ExportCard
          icon={FileText} color={ACCENT} title="Export SYSCOHADA" badge="RG-29"
          desc="Format comptable OHADA — CSV avec BOM UTF-8 pour Excel"
          compliance="Obligation légale OHADA : conservez ces exports 10 ans dans un système sécurisé hors production. Archivez avant toute migration de base de données."
          history={sysHistory}
        >
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Période</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'monthly',   label: 'Mensuel' },
                { value: 'quarterly', label: 'Trimestriel' },
                { value: 'yearly',    label: 'Annuel' },
              ].map(p => (
                <button key={p.value} onClick={() => setSysPeriod(p.value)}
                  style={{ flex: 1, padding: '7px 0', border: `1.5px solid ${sysPeriod === p.value ? ACCENT : '#E2E8F0'}`, borderRadius: 8, cursor: 'pointer', fontWeight: sysPeriod === p.value ? 700 : 500, fontSize: 12, background: sysPeriod === p.value ? `${ACCENT}10` : '#fff', color: sysPeriod === p.value ? ACCENT : '#475569' }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { label: 'Format', value: 'CSV UTF-8 (BOM)' },
              { label: 'Plan comptable', value: 'OHADA / SYSCOHADA' },
              { label: 'Colonnes', value: 'Date, Libellé, Débit, Crédit, N°Cpte, Pièce' },
              { label: 'Compatibilité', value: 'Sage, Ciel, logiciels CI' },
            ].map(f => (
              <div key={f.label}>
                <p style={{ fontSize: 10, color: '#94A3B8', margin: '0 0 1px', fontWeight: 600 }}>{f.label}</p>
                <p style={{ fontSize: 11, color: '#334155', margin: 0, fontWeight: 600 }}>{f.value}</p>
              </div>
            ))}
          </div>
          <button onClick={downloadSyscohada} disabled={dlState.syscohada}
            style={{ width: '100%', padding: '10px 0', background: ACCENT, color: '#fff', border: 'none', borderRadius: 10, cursor: dlState.syscohada ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13, opacity: dlState.syscohada ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Download style={{ width: 15, height: 15 }} />
            {dlState.syscohada ? 'Génération en cours…' : `Télécharger SYSCOHADA (${sysPeriod === 'monthly' ? 'Mensuel' : sysPeriod === 'quarterly' ? 'Trimestriel' : 'Annuel'})`}
          </button>
        </ExportCard>

        {/* Audit RG-34 */}
        <ExportCard
          icon={ScrollText} color="#059669" title="Journal d'Audit" badge="RG-34"
          desc="Traçabilité complète — toutes actions critiques horodatées"
          compliance="Le journal d'audit est immuable. Cet export est une copie à des fins d'archivage et d'analyse. Le journal en base reste intègre."
          history={auditHistory}
        >
          <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { label: 'Format', value: 'CSV UTF-8 (BOM)' },
              { label: 'Colonnes', value: 'Date, Heure, User, Action, Restaurant, Payload' },
              { label: 'Limite', value: '5 000 entrées par export' },
              { label: 'Intégrité', value: 'Immuable (RG-34)' },
            ].map(f => (
              <div key={f.label}>
                <p style={{ fontSize: 10, color: '#94A3B8', margin: '0 0 1px', fontWeight: 600 }}>{f.label}</p>
                <p style={{ fontSize: 11, color: '#334155', margin: 0, fontWeight: 600 }}>{f.value}</p>
              </div>
            ))}
          </div>
          <button onClick={downloadAudit} disabled={dlState.audit}
            style={{ width: '100%', padding: '10px 0', background: '#059669', color: '#fff', border: 'none', borderRadius: 10, cursor: dlState.audit ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13, opacity: dlState.audit ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Download style={{ width: 15, height: 15 }} />
            {dlState.audit ? 'Génération en cours…' : 'Télécharger Journal Audit CSV'}
          </button>
        </ExportCard>
      </div>

      {/* Bloc conformité OHADA */}
      <div style={{ ...card, padding: '20px 24px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEF3C714', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1.5px solid #FEF3C7' }}>
          <Shield style={{ width: 18, height: 18, color: '#D97706' }} />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>Conformité OHADA & obligations d'archivage</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Rétention minimale', value: '10 ans', note: 'Acte uniforme OHADA sur le droit comptable' },
              { label: 'Format légal', value: 'SYSCOHADA révisé', note: 'Plan comptable OHADA — comptes 7xxx produits' },
              { label: 'Archivage sécurisé', value: 'Hors production', note: 'Isolé de la base de données opérationnelle' },
            ].map(item => (
              <div key={item.label} style={{ background: '#FFFBEB', borderRadius: 10, padding: '10px 14px', border: '1px solid #FEF3C7' }}>
                <p style={{ fontSize: 10, color: '#D97706', fontWeight: 700, margin: '0 0 3px', textTransform: 'uppercase' }}>{item.label}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 3px' }}>{item.value}</p>
                <p style={{ fontSize: 10, color: '#92400E', margin: 0 }}>{item.note}</p>
              </div>
            ))}
          </div>
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
  PAYMENT: '#F59E0B', SMS: '#F43F5E', PUSH_NOTIFICATION: '#F97316',
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
    <div style={{ ...card, marginBottom: 10, border: isCdc ? `1.5px solid ${color}28` : '1px solid #E8EDF5', overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon style={{ width: 17, height: 17, color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>{integration.name}</p>
            {isCdc && <span style={{ fontSize: 9, background: '#EEF2FF', color: '#4338CA', borderRadius: 4, padding: '1px 6px', fontWeight: 800, letterSpacing: '0.04em' }}>CDC</span>}
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
            style={{ background: '#EEF2FF', border: 'none', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: ACCENT, display: 'flex', alignItems: 'center' }}>
            <Settings style={{ width: 12, height: 12 }} />
          </button>
          {!isCdc && (
            <button onClick={() => onDelete(integration.id)} title="Supprimer"
              style={{ background: '#FEE2E2', border: 'none', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: '#DC2626', display: 'flex', alignItems: 'center' }}>
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
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Chargement…</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

      {/* ── Colonne gauche : Sécurité + MDP ── */}
      <div>
        {/* Politiques de sécurité */}
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
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
                  <span style={{ fontSize: 10, background: '#EEF2FF', color: '#4338CA', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>{f.note}</span>
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
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
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
            <p style={{ fontSize: 10, fontWeight: 800, color: '#4338CA', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
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
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
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

/* ══════════════════ B2B PENDING BANNER ══════════════════ */
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

/* ══════════════════ TABS ══════════════════ */
const TABS = [
  { id: 'overview',    label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: 'users',       label: 'Utilisateurs',   icon: Users },
  { id: 'restaurants', label: 'Restaurants',    icon: UtensilsCrossed },
  { id: 'audit',       label: 'Audit',          icon: ScrollText },
  { id: 'exports',     label: 'Exports',        icon: Download },
  { id: 'config',      label: 'Configuration',  icon: Settings },
];

/* ══════════════════ ROOT ══════════════════ */
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
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#fff', borderRadius: 12, padding: 4, border: '1px solid #E8EDF5', overflowX: 'auto' }}>
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

      {tab === 'overview'    && <OverviewTab />}
      {tab === 'users'       && <UsersTab />}
      {tab === 'restaurants' && <RestaurantsTab />}
      {tab === 'audit'       && <AuditTab />}
      {tab === 'exports'     && <ExportsTab />}
      {tab === 'config'      && <ConfigTab />}
    </div>
  );
}
