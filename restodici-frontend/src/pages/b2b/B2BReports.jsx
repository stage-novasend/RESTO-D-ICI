import { useState, useEffect } from 'react';
import { TrendingUp, Users, FileText, Download, BarChart3 } from 'lucide-react';
import { b2bAPI } from '../../services/api';

const ACCENT = '#C05015';
const CREAM = '#0F172A';
const MUTED = '#64748B';
const GOLD = '#F97316';
const BORDER = 'rgba(89,67,42,0.10)';

function exportCSV(data, filename) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function B2BReports() {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('collaborateurs');

  useEffect(() => {
    b2bAPI.getReports()
      .then(r => setReports(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const collaborateurs = reports?.collaborateurs ?? [];
  const auditLogs = reports?.auditLogs ?? [];
  const factures = reports?.factures ?? [];

  const totalDepenses = collaborateurs.reduce((s, c) => s + (c.totalDepense ?? 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF5EF]">
        <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 bg-[#FDF5EF]">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: GOLD }}>Rapports & Audit</p>
            <h1 className="mt-1 text-2xl font-bold" style={{ color: CREAM }}>Tableau de bord analytique</h1>
            <p className="mt-1 text-sm" style={{ color: MUTED }}>
              {reports?.moisEnCours} {reports?.anneeEnCours} · {collaborateurs.length} collaborateur(s)
            </p>
          </div>
          <button
            onClick={() => exportCSV(
              collaborateurs.map(c => ({ Nom: c.collaborateur, Email: c.email, Dépensé: c.totalDepense, Limite: c.limite, Solde: c.soldeRestant })),
              'rapport-collaborateurs.csv'
            )}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:bg-white"
            style={{ borderColor: BORDER, color: CREAM }}
          >
            <Download className="h-4 w-4" style={{ color: GOLD }} />
            Exporter CSV
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total dépensé', value: `${totalDepenses.toLocaleString()} FCFA`, color: ACCENT },
            { label: 'Collaborateurs', value: collaborateurs.length, color: GOLD },
            { label: 'Commandes mois', value: reports?.totalCommandesMois ?? 0, color: CREAM },
            { label: 'Factures', value: factures.length, color: MUTED },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border bg-white p-4" style={{ borderColor: BORDER }}>
              <p className="text-xs" style={{ color: MUTED }}>{label}</p>
              <p className="mt-1 text-lg font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b" style={{ borderColor: BORDER }}>
          {[
            { id: 'collaborateurs', label: 'Collaborateurs', icon: Users },
            { id: 'audit', label: 'Historique', icon: FileText },
            { id: 'factures', label: 'Factures', icon: BarChart3 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id} onClick={() => setTab(id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition"
              style={{
                borderBottomColor: tab === id ? ACCENT : 'transparent',
                color: tab === id ? ACCENT : MUTED,
              }}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {/* Tab: Collaborateurs */}
        {tab === 'collaborateurs' && (
          <div className="space-y-3">
            {collaborateurs.length === 0 ? (
              <div className="rounded-2xl border bg-white p-10 text-center" style={{ borderColor: BORDER }}>
                <p className="text-sm" style={{ color: MUTED }}>Aucune donnée de consommation ce mois</p>
              </div>
            ) : collaborateurs.map((c, i) => {
              const pct = c.limite > 0 ? Math.min(100, (c.totalDepense / c.limite) * 100) : 0;
              const barColor = pct >= 100 ? '#C05015' : pct >= 80 ? '#D97706' : '#9A3E10';
              return (
                <div key={i} className="rounded-xl border bg-white p-4" style={{ borderColor: BORDER }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: CREAM }}>{c.collaborateur}</p>
                      <p className="text-xs" style={{ color: MUTED }}>{c.email}</p>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1" style={{ color: MUTED }}>
                          <span>{(c.totalDepense ?? 0).toLocaleString()} FCFA dépensés</span>
                          <span>{Math.round(pct)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden bg-[#F2EBE1]">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs" style={{ color: MUTED }}>Solde restant</p>
                      <p className="font-bold text-sm" style={{ color: CREAM }}>{(c.soldeRestant ?? 0).toLocaleString()} FCFA</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab: Audit */}
        {tab === 'audit' && (
          <div className="space-y-2">
            {auditLogs.length === 0 ? (
              <div className="rounded-2xl border bg-white p-10 text-center" style={{ borderColor: BORDER }}>
                <p className="text-sm" style={{ color: MUTED }}>Aucune action enregistrée</p>
              </div>
            ) : auditLogs.map((log, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border bg-white p-3" style={{ borderColor: BORDER }}>
                <div className="h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ background: '#FDF5EF', color: GOLD }}>
                  {(log.actorEmail ?? log.user ?? '?')[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium" style={{ color: CREAM }}>{log.type?.replaceAll('_', ' ') ?? log.action}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>
                    {log.actorEmail ?? log.user} · {log.meta ? JSON.stringify(log.meta).slice(0, 60) : log.details ?? ''}
                  </p>
                </div>
                <span className="text-[10px] shrink-0" style={{ color: MUTED }}>
                  {new Date(log.createdAt ?? log.date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Factures */}
        {tab === 'factures' && (
          <div className="space-y-3">
            {factures.length === 0 ? (
              <div className="rounded-2xl border bg-white p-10 text-center" style={{ borderColor: BORDER }}>
                <p className="text-sm" style={{ color: MUTED }}>Aucune facture générée</p>
              </div>
            ) : factures.map((f, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border bg-white px-4 py-3" style={{ borderColor: BORDER }}>
                <div>
                  <p className="font-semibold text-sm" style={{ color: CREAM }}>{f.periode ?? f.mois} {f.annee}</p>
                  <p className="text-xs" style={{ color: MUTED }}>#{f.numeroFacture}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm" style={{ color: CREAM }}>{(f.montantTTC ?? f.amount ?? 0).toLocaleString()} FCFA</p>
                  <span className={`text-[11px] rounded-full px-2 py-0.5 ${f.statut === 'PAYEE' || f.statut === 'paid' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    {f.statut === 'PAYEE' || f.statut === 'paid' ? 'Payée' : 'En attente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
