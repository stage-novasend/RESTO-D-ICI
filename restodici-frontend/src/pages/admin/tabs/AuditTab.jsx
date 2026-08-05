/* AuditTab — extrait de AdminDashboard */
import { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, ScrollText, Calendar, Users, Activity, Search, ChevronRight } from 'lucide-react';
import { adminAPI } from '../../../services/api';
import { useAdminRevision } from '../../../hooks/useAdminRealtime';
import { ACCENT, inputStyle, card } from '../_colors';
import { ACTION_STYLE } from '../_helpers';

/* ══════════════════ TAB: AUDIT LOGS ══════════════════ */
export default function AuditTab() {
  const revision = useAdminRevision();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [userId, setUserId] = useState('');
  const [limit, setLimit] = useState(100);
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

  useEffect(() => { load(); }, [load, revision]);

  const today = logs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length;
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
      const r = await adminAPI.exportAudit({ action: action || undefined, from: from || undefined, to: to || undefined });
      const blob = new Blob([r.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: ACCENT, flexShrink: 0 }} />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>Journaux d'audit</h2>
          </div>
          <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>Traçabilité dynamique et en temps réel de toutes les actions</p>
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
          <select value={limit} onChange={e => setLimit(Number(e.target.value))} style={{ padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 15, outline: 'none', flexShrink: 0 }}>
            {[50, 100, 200, 500].map(n => <option key={n} value={n}>{n} lignes</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <div className="overflow-x-auto w-full"><table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FFF6F0', borderBottom: '2px solid #E8EDF5' }}>
                {['Date', 'Heure', 'Utilisateur', 'Action', 'Restaurant', 'Payload', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: '#94A3B8', textAlign: 'left', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Chargement…</td></tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', textAlign: 'center', background: '#FFF5ED' }}>
                      <ScrollText style={{ width: 48, height: 48, marginBottom: 12, color: '#973100', opacity: 0.4 }} />
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Aucun log disponible</p>
                      <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Aucune activité ne correspond aux filtres sélectionnés.</p>
                    </div>
                  </td>
                </tr>
              ) : logs.map((log, i) => {
                const { date, time } = fmt(log.createdAt);
                const aStyle = ACTION_STYLE(log.action);
                const isOpen = expanded[log.id];
                return [
                  <tr key={log.id} style={{ borderBottom: isOpen ? 'none' : '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFBFF', cursor: 'pointer' }}
                    onClick={() => setExpanded(e => ({ ...e, [log.id]: !e[log.id] }))}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(234,60,12,0.04)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFBFF'; }}
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
                    <tr key={`${log.id}-exp`} style={{ background: 'rgba(234,60,12,0.04)', borderBottom: '1px solid rgba(234,60,12,0.12)' }}>
                      <td colSpan={7} style={{ padding: '10px 20px 14px' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#FF3A03', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Payload complet · ID: {log.id}</p>
                        <pre style={{ margin: 0, fontSize: 11, color: '#334155', background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid rgba(234,60,12,0.20)', overflowX: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {log.payload ? JSON.stringify(log.payload, null, 2) : 'Aucun payload'}
                        </pre>
                      </td>
                    </tr>
                  ),
                ].filter(Boolean);
              })}
            </tbody>
          </table></div>
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{logs.length} entrée{logs.length !== 1 ? 's' : ''} · Cliquer une ligne pour afficher le payload</p>
        </div>
      </div>
    </div>
  );
}
