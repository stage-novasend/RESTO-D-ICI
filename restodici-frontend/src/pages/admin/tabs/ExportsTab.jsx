/* ExportsTab — extrait de AdminDashboard */
import { useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, Download, Shield, FileText, Info, ScrollText, Clock } from 'lucide-react';
import { adminAPI } from '../../../services/api';
import { ACCENT, labelStyle, card } from '../_colors';

export default function ExportsTab() {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [dlState, setDlState] = useState({});
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_export_history') || '[]'); } catch { return []; }
  });
  const [sysPeriod, setSysPeriod] = useState('monthly');
  const [auditFrom, setAuditFrom] = useState(firstOfMonth);
  const [auditTo, setAuditTo] = useState(today);

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
      const r = await apiFn();
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
    if (state === 'done') return <CheckCircle style={{ width: 14, height: 14 }} />;
    if (state === 'error') return <XCircle style={{ width: 14, height: 14 }} />;
    return <Download style={{ width: 14, height: 14 }} />;
  };

  const btnBg = (key, base) => {
    if (dlState[key] === 'done') return '#059669';
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
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(234,60,12,0.08)', border: '1px solid rgba(234,60,12,0.20)', borderRadius: 20, padding: '5px 12px', fontSize: 11, fontWeight: 700, color: ACCENT }}>
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
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(234,60,12,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText style={{ width: 21, height: 21, color: ACCENT }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Export SYSCOHADA</p>
                </div>
                <p style={{ fontSize: 11, color: '#94A3B8', margin: '3px 0 0' }}>Format comptable OHADA — CSV BOM UTF-8 compatible Excel</p>
              </div>
            </div>

            <label style={labelStyle}>Granularité de la période</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {[{ value: 'monthly', label: 'Mensuel' }, { value: 'quarterly', label: 'Trimestriel' }, { value: 'yearly', label: 'Annuel' }].map(p => (
                <button key={p.value} onClick={() => setSysPeriod(p.value)}
                  style={{ flex: 1, padding: '7px 0', border: `1.5px solid ${sysPeriod === p.value ? ACCENT : '#E2E8F0'}`, borderRadius: 8, cursor: 'pointer', fontWeight: sysPeriod === p.value ? 700 : 500, fontSize: 12, background: sysPeriod === p.value ? 'rgba(234,60,12,0.08)' : '#fff', color: sysPeriod === p.value ? ACCENT : '#475569', transition: 'all 0.15s' }}>
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
                { label: 'Intégrité', value: 'Protégé' },
                { label: 'Colonnes', value: 'Date · Heure · User · Action · Restaurant · Payload' },
                { label: 'Limite', value: '5 000 entrées / export' },
              ].map(f => (
                <div key={f.label}>
                  <p style={{ fontSize: 10, color: '#94A3B8', margin: '0 0 1px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</p>
                  <p style={{ fontSize: 11, color: '#334155', margin: 0, fontWeight: 600 }}>{f.value}</p>
                </div>
              ))}
            </div>

            <button onClick={() => download('audit', () => adminAPI.exportAudit({ from: auditFrom, to: auditTo }), `Audit-${auditFrom}_${auditTo}.csv`, 'Journal Audit')}
              disabled={!!dlState.audit}
              style={{ width: '100%', padding: '11px 0', background: btnBg('audit', '#059669'), color: '#fff', border: 'none', borderRadius: 10, cursor: dlState.audit ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13, opacity: dlState.audit === 'loading' ? 0.8 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}>
              <BtnIcon state={dlState.audit} />
              {dlState.audit === 'loading' ? 'Génération en cours…' : dlState.audit === 'done' ? 'Téléchargé !' : dlState.audit === 'error' ? 'Erreur — réessayer' : `Télécharger Audit (${auditFrom} → ${auditTo})`}
            </button>
          </div>
          <div style={{ padding: '10px 20px', background: '#F0FDF4', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Info style={{ width: 13, height: 13, color: '#059669', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11, color: '#065F46', margin: 0, lineHeight: 1.5 }}>Cet export est une copie d'archivage — le journal source reste intact en base de données.</p>
          </div>
        </div>
      </div>

      {/* ── Conformité OHADA + Historique ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        <div style={{ ...card, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(234,60,12,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: 8, background: i === 0 ? 'rgba(234,60,12,0.04)' : 'transparent', border: i === 0 ? '1px solid rgba(234,60,12,0.10)' : '1px solid transparent' }}>
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
