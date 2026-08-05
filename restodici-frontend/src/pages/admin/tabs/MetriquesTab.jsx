/* MetriquesTab — extrait de AdminDashboard */
import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, Database } from 'lucide-react';
import { adminAPI } from '../../../services/api';
import { card } from '../_colors';

/* ══════════════════ MÉTRIQUES SYSTÈME ══════════════════ */
export default function MetriquesTab() {
  const [metrics, setMetrics] = useState(null);
  const [stats, setStats] = useState(null);
  const [backups, setBackups] = useState([]);
  const [backupRunning, setBackupRunning] = useState(false);
  const [loading, setLoading] = useState(true);
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
      .catch(() => { })
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

  const Stat = ({ label, value, sub, color = '#FF3A03' }) => (
    <div style={{ ...card, padding: '18px 22px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px' }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 800, color, margin: 0 }}>{value ?? '—'}</p>
      {sub && <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0' }}>{sub}</p>}
    </div>
  );

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}>Chargement des métriques…</div>;

  // Vrai SLA : disponibilité mesurée côté serveur (heartbeats + incidents, 30 j).
  const uptimePct = metrics?.sla ? metrics.sla.uptimePct : null;
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
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: backupRunning ? '#94A3B8' : '#973100', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: backupRunning ? 'not-allowed' : 'pointer' }}
          >
            <Database style={{ width: 14, height: 14 }} />
            {backupRunning ? 'Backup en cours…' : 'Lancer un backup'}
          </button>
        </div>
        {backups.length === 0 ? (
          <p style={{ padding: '20px 20px', color: '#94A3B8', fontSize: 13 }}>Aucun backup disponible.</p>
        ) : (
          <div className="overflow-x-auto w-full"><table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
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
          </table></div>
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
