/* NewsletterTab — extrait de AdminDashboard */
import { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, Mail, Calendar, TrendingUp, Search, Trash2 } from 'lucide-react';
import { newsletterAPI } from '../../../services/api';
import { useAdminRevision } from '../../../hooks/useAdminRealtime';
import { ACCENT, inputStyle, card } from '../_colors';

export default function NewsletterTab() {
  const revision = useAdminRevision();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await newsletterAPI.getAll();
      setSubs(r.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, revision]);

  const q = search.trim().toLowerCase();
  const filtered = q ? subs.filter(s => s.email.toLowerCase().includes(q)) : subs;

  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const today = subs.filter(s => new Date(s.createdAt) >= startOfDay).length;
  const thisWeek = subs.filter(s => new Date(s.createdAt) >= startOfWeek).length;

  const fmt = (iso) => {
    const d = new Date(iso);
    return { date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }), time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) };
  };

  const exportCSV = () => {
    const header = 'Email,Date d\'inscription';
    const rows = filtered.map(s => `${s.email},${new Date(s.createdAt).toISOString()}`);
    const csv = '﻿' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `newsletter-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Retirer cet email de la newsletter ?')) return;
    setDeletingId(id);
    try {
      await newsletterAPI.remove(id);
      setSubs(prev => prev.filter(s => s.id !== id));
    } catch { /* ignore */ }
    finally { setDeletingId(null); }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: ACCENT, flexShrink: 0 }} />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>Newsletter</h2>
          </div>
          <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>Emails inscrits depuis le formulaire du site public</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportCSV} disabled={filtered.length === 0} style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8, padding: '7px 14px', cursor: filtered.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#475569', opacity: filtered.length === 0 ? 0.6 : 1 }}>
            <Download style={{ width: 13, height: 13 }} />Exporter CSV
          </button>
          <button onClick={load} disabled={loading} style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw style={{ width: 13, height: 13 }} />Actualiser
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total inscrits', value: subs.length, icon: Mail, color: ACCENT },
          { label: "Aujourd'hui", value: today, icon: Calendar, color: '#059669' },
          { label: 'Cette semaine', value: thisWeek, icon: TrendingUp, color: '#F59E0B' },
        ].map(k => (
          <div key={k.label} style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${k.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <k.icon style={{ width: 16, height: 16, color: k.color }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '0 0 2px', fontWeight: 600 }}>{k.label}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ ...card, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#94A3B8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un email…" style={{ ...inputStyle, paddingLeft: 30 }} />
        </div>
      </div>

      {/* Table */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FFF6F0', borderBottom: '2px solid #E8EDF5' }}>
                {['Email', 'Date', 'Heure', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: '#94A3B8', textAlign: 'left', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && subs.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Chargement…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', textAlign: 'center', background: '#FFF5ED' }}>
                      <Mail style={{ width: 48, height: 48, marginBottom: 12, color: '#973100', opacity: 0.4 }} />
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
                        {subs.length === 0 ? 'Aucun inscrit pour le moment' : 'Aucun résultat'}
                      </p>
                      <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
                        {subs.length === 0 ? "Les emails inscrits depuis le site public apparaîtront ici." : 'Aucun email ne correspond à cette recherche.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((s, i) => {
                const { date, time } = fmt(s.createdAt);
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFBFF' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(234,60,12,0.04)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFBFF'; }}
                  >
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#0F172A', fontWeight: 600 }}>{s.email}</td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: '#334155', whiteSpace: 'nowrap' }}>{date}</td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: '#64748B', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{time}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <button onClick={() => handleRemove(s.id)} disabled={deletingId === s.id} title="Retirer de la newsletter"
                        style={{ background: 'none', border: 'none', cursor: deletingId === s.id ? 'not-allowed' : 'pointer', padding: 6, borderRadius: 7, display: 'inline-flex', color: '#DC2626', opacity: deletingId === s.id ? 0.5 : 1 }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid #F1F5F9' }}>
          <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{filtered.length} inscrit{filtered.length !== 1 ? 's' : ''}{q ? ` (sur ${subs.length})` : ''}</p>
        </div>
      </div>
    </div>
  );
}
