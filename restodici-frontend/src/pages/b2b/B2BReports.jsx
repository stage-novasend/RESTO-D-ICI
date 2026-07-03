import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Users, FileText, Download, BarChart2, ArrowLeft, Activity, CheckCircle, Clock, Eye, Shield, X, RefreshCw } from 'lucide-react';
import { b2bAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { formatFCFA } from '../../utils/formatters';

// ── Design tokens ──────────────────────────────────────────────────────────────
const BG     = '#FFF4ED';
const CARD   = '#FFFFFF';
const TEXT   = '#1A0C00';
const MUTED  = '#8B6E50';
const FAINT  = '#A89070';
const BORDER = '#E2E8F0';
const ORANGE = '#EA580C';
const GREEN  = '#16A34A';
const GREEN_L= '#DCFCE7';
const GREEN_D= '#15803D';
const RED    = '#DC2626';
const RED_L  = '#FEF2F2';
const AMBER  = '#D97706';
const AMBER_L= '#FFFBEB';
const SH     = '0 1px 3px rgba(139,110,80,0.07),0 1px 2px rgba(139,110,80,0.04)';
const SH2    = '0 4px 16px rgba(139,110,80,0.10),0 2px 4px rgba(139,110,80,0.06)';
const TVA    = 0.18;

function Avatar({ name = '', size = 36 }) {
  const ini = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const hue = ((name.charCodeAt(0) || 0) * 37) % 360;
  return (
    <div className="rounded-full flex items-center justify-center font-bold shrink-0 select-none"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${hue},65%,88%)`, color: `hsl(${hue},65%,32%)` }}>
      {ini}
    </div>
  );
}

function exportCSV(data, filename) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── SYSCOHADA Viewer ──────────────────────────────────────────────────────────
function SyscohadaViewerModal({ reports, compte, monthlyExp, isLastDayOfMonth, lastDayDisplay, onClose, onDownload, downloading, userEmail }) {
  const [captureGuard, setCaptureGuard] = useState(false);
  const collaborateurs = reports?.collaborateurs ?? [];
  const factures       = reports?.factures ?? [];
  const mois = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const totalHT  = Math.round((monthlyExp || 0) / (1 + TVA));
  const totalTVA = Math.round((monthlyExp || 0) - totalHT);
  const totalTTC = Math.round(monthlyExp || 0);
  const fcfa = n => `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} FCFA`;

  useEffect(() => {
    const hide = () => setCaptureGuard(true);
    const show = () => setCaptureGuard(false);
    const onVis = () => { if (document.hidden) hide(); else show(); };
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['s','S','4','3'].includes(e.key)) e.preventDefault();
    };
    window.addEventListener('blur', hide);
    window.addEventListener('focus', show);
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('blur', hide);
      window.removeEventListener('focus', show);
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const WM = `CONFIDENTIEL · ${userEmail || 'B2B'}`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <style>{`@media print { .syscohada-viewer-reports { display: none !important; } }`}</style>
      <div className="syscohada-viewer-reports rounded-2xl overflow-hidden w-full max-w-4xl max-h-[90vh] flex flex-col relative"
           style={{ background: '#fff', boxShadow: '0 24px 64px rgba(0,0,0,0.45)' }}
           onContextMenu={e => e.preventDefault()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
             style={{ background: '#1A0C00', borderBottom: '2.5px solid #EA580C' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,140,0,0.20)' }}>
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Rapport SYSCOHADA · {mois}</p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Confidentiel · TVA 18% · Lecture seule · Capture désactivée
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLastDayOfMonth ? (
              <button onClick={onDownload} disabled={downloading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#16A34A,#15803D)', opacity: downloading ? 0.7 : 1 }}>
                {downloading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {downloading ? 'Génération…' : 'Télécharger PDF'}
              </button>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold"
                    style={{ background: '#FFFBEB', color: '#D97706' }}>
                <Clock className="w-3.5 h-3.5" /> Dispo le {lastDayDisplay}
              </span>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#9CA3AF' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Blur guard */}
        {captureGuard && (
          <div className="absolute inset-0 z-[300] flex flex-col items-center justify-center rounded-2xl"
               style={{ background: 'rgba(139,110,80,0.96)' }}>
            <Shield className="w-12 h-12 mb-3" style={{ color: '#EA580C' }} />
            <p className="text-white font-bold text-base">Contenu masqué</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Cliquez dans la fenêtre pour afficher le rapport
            </p>
          </div>
        )}

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 relative" style={{ userSelect: 'none' }}>

          {/* Watermark */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5, overflow: 'hidden', display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start' }}>
            {Array.from({ length: 28 }).map((_, i) => (
              <div key={i} style={{ width: '50%', height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-20deg)', color: 'rgba(0,0,0,0.04)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', whiteSpace: 'nowrap', userSelect: 'none' }}>
                {WM}
              </div>
            ))}
          </div>

          <div className="p-6 space-y-5" style={{ position: 'relative', zIndex: 1 }}>

            {/* Report header */}
            <div className="rounded-2xl p-5" style={{ background: '#1A0C00' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#EA580C' }}>Rapport Mensuel SYSCOHADA</p>
                  <p className="text-white font-bold text-base">{reports?.plateforme?.nom || '—'} · Plateforme B2B</p>
                  <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{reports?.plateforme?.adresse || '—'}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold text-white" style={{ background: '#EA580C' }}>SYSCOHADA</span>
                  <p className="text-[11px] mt-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Période : {mois}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { title: 'PRESTATAIRE', lines: [reports?.plateforme?.nom || '—', reports?.plateforme?.nif ? `NIF : ${reports.plateforme.nif}` : '—', reports?.plateforme?.rccm ? `RCCM : ${reports.plateforme.rccm}` : '—', reports?.plateforme?.adresse || '—'] },
                  { title: 'CLIENT', lines: [compte?.raisonSociale || 'Entreprise', `NIF : ${compte?.numeroContribuable || '—'}`, `RCCM : ${compte?.numeroRCCM || '—'}`, compte?.secteurActivite ? `Secteur : ${compte.secteurActivite}` : ''] },
                ].map(({ title, lines }) => (
                  <div key={title} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#EA580C' }}>{title}</p>
                    {lines.filter(Boolean).map((l, i) => (
                      <p key={i} className="text-[12px]" style={{ color: i === 0 ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: i === 0 ? 600 : 400 }}>{l}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Section 1 — Collaborateurs */}
            <div>
              <div className="rounded-t-xl px-4 py-2.5" style={{ background: '#1A0C00' }}>
                <p className="text-white font-bold text-[12px] uppercase tracking-wider">1. Synthèse budgétaire par collaborateur</p>
              </div>
              <div className="rounded-b-xl overflow-x-auto border border-t-0" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                {collaborateurs.length === 0 ? (
                  <div className="py-8 text-center text-[13px]" style={{ color: '#8B6E50' }}>Aucun collaborateur enregistré</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ background: '#F8FAFC' }}>
                      <tr>{['N°','Collaborateur','Email','Budget','Dépensé','Solde','Taux'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: ['Budget','Dépensé','Solde','Taux'].includes(h) ? 'right' : h === 'N°' ? 'center' : 'left', fontWeight: 700, color: '#374151', borderBottom: '1px solid rgba(0,0,0,0.08)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {collaborateurs.map((c, i) => {
                        const pct = c.limite > 0 ? Math.min(100, Math.round((c.totalDepense / c.limite) * 100)) : 0;
                        return (
                          <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                            <td style={{ padding: '9px 12px', textAlign: 'center', color: '#8B6E50' }}>{i + 1}</td>
                            <td style={{ padding: '9px 12px', fontWeight: 600, color: '#1A0C00' }}>{c.collaborateur}</td>
                            <td style={{ padding: '9px 12px', color: '#8B6E50' }}>{c.email}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#1A0C00' }}>{fcfa(c.limite ?? 0)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#1A0C00' }}>{fcfa(c.totalDepense ?? 0)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: (c.soldeRestant ?? 0) > 0 ? '#16A34A' : '#DC2626' }}>{fcfa(c.soldeRestant ?? 0)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: pct >= 100 ? '#DC2626' : pct >= 80 ? '#D97706' : '#16A34A' }}>{pct} %</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Section 2 — Factures */}
            <div>
              <div className="rounded-t-xl px-4 py-2.5" style={{ background: '#1A0C00' }}>
                <p className="text-white font-bold text-[12px] uppercase tracking-wider">2. Détail des factures mensuelles</p>
              </div>
              <div className="rounded-b-xl overflow-x-auto border border-t-0" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                {factures.length === 0 ? (
                  <div className="py-8 text-center text-[13px]" style={{ color: '#8B6E50' }}>Aucune facture émise</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ background: '#F8FAFC' }}>
                      <tr>{['N°','Référence','Période','Montant HT','TVA 18%','TTC','Statut'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: ['Montant HT','TVA 18%','TTC'].includes(h) ? 'right' : h === 'N°' ? 'center' : 'left', fontWeight: 700, color: '#374151', borderBottom: '1px solid rgba(0,0,0,0.08)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {factures.map((f, i) => {
                        const ttc = Number(f.montantTTC ?? f.amount ?? 0);
                        const ht = Math.round(ttc / (1 + TVA));
                        const tva = ttc - ht;
                        const paid = f.statut === 'PAYEE' || f.statut === 'paid';
                        return (
                          <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                            <td style={{ padding: '9px 12px', textAlign: 'center', color: '#8B6E50' }}>{i + 1}</td>
                            <td style={{ padding: '9px 12px', fontWeight: 600, color: '#1A0C00' }}>{f.numeroFacture}</td>
                            <td style={{ padding: '9px 12px', color: '#8B6E50' }}>{f.periode ?? f.mois} {f.annee}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#1A0C00' }}>{fcfa(ht)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#1A0C00' }}>{fcfa(tva)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#1A0C00' }}>{fcfa(ttc)}</td>
                            <td style={{ padding: '9px 12px' }}>
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                                    style={{ background: paid ? '#DCFCE7' : '#FFFBEB', color: paid ? '#15803D' : '#D97706' }}>
                                {paid ? 'PAYÉE' : 'EN ATTENTE'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Section 3 — Récapitulatif fiscal */}
            <div>
              <div className="rounded-t-xl px-4 py-2.5" style={{ background: '#1A0C00' }}>
                <p className="text-white font-bold text-[12px] uppercase tracking-wider">3. Récapitulatif fiscal (SYSCOHADA / DGI-CI)</p>
              </div>
              <div className="rounded-b-xl overflow-hidden border border-t-0" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead style={{ background: '#F8FAFC' }}>
                    <tr>{['Désignation','Base HT','Taux TVA','Montant TVA','Total TTC'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Désignation' ? 'left' : 'right', fontWeight: 700, color: '#374151', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: '#fff' }}>
                      <td style={{ padding: '9px 12px', color: '#1A0C00' }}>Restauration collective B2B</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#1A0C00' }}>{fcfa(totalHT)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#8B6E50' }}>18 %</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#1A0C00' }}>{fcfa(totalTVA)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700 }}>{fcfa(totalTTC)}</td>
                    </tr>
                    <tr style={{ background: '#F1F5F9', fontWeight: 700 }}>
                      <td style={{ padding: '9px 12px', color: '#1A0C00' }}>TOTAL GÉNÉRAL</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#1A0C00' }}>{fcfa(totalHT)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#8B6E50' }}>18 %</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#1A0C00' }}>{fcfa(totalTVA)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#EA580C' }}>{fcfa(totalTTC)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mentions légales */}
            <div className="rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid rgba(0,0,0,0.06)' }}>
              <p className="text-[11px] italic" style={{ color: '#8B6E50' }}>
                Conformément au Système Comptable OHADA (SYSCOHADA Révisé) · TVA collectée au taux de 18%
                conformément au Code Général des Impôts de la Côte d'Ivoire — Article 339 CGI-CI.
              </p>
              <p className="text-[11px] mt-1.5 font-semibold" style={{ color: '#9CA3AF' }}>
                Document confidentiel · {userEmail || 'Gestionnaire B2B'} · Généré le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function B2BReports() {
  const { user } = useAuth();
  const [reports, setReports]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('collaborateurs');
  const [exported, setExported]     = useState(false);
  const [viewerOpen, setViewerOpen]   = useState(false);
  const [contesterModal, setContesterModal] = useState(null); // { id, numeroFacture }
  const [motif, setMotif]             = useState('');
  const [contesterLoading, setContesterLoading] = useState(false);
  const [contesterErr, setContesterErr]   = useState('');

  const refreshReports = () => {
    b2bAPI.getReports()
      .then(r => setReports(r.data))
      .catch(() => {});
  };

  useEffect(() => {
    b2bAPI.getReports()
      .then(r => setReports(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleContester = async () => {
    if (!motif.trim()) { setContesterErr('Veuillez indiquer un motif.'); return; }
    setContesterLoading(true);
    setContesterErr('');
    try {
      await b2bAPI.contesterFacture(contesterModal.id, motif.trim());
      setContesterModal(null);
      setMotif('');
      refreshReports();
    } catch (e) {
      setContesterErr(e?.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setContesterLoading(false);
    }
  };

  const collaborateurs = reports?.collaborateurs ?? [];
  const auditLogs      = reports?.auditLogs ?? [];
  const factures       = reports?.factures ?? [];
  const totalDepenses  = collaborateurs.reduce((s, c) => s + (c.totalDepense ?? 0), 0);

  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const isLastDayOfMonth = today.getDate() === lastDay.getDate();
  const daysUntilExport = lastDay.getDate() - today.getDate();
  const lastDayDisplay = lastDay.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const monthlyExp = collaborateurs.reduce((s, c) => s + (c.totalDepense ?? 0), 0);

  const compte = reports?.compte || null;

  const handleExport = async () => {
    if (factures.length > 0) {
      try {
        const res = await b2bAPI.exportSyscohadaCsv(factures[0].id);
        const { csv, filename } = res.data;
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        setExported(true);
        setTimeout(() => setExported(false), 3000);
        return;
      } catch { /* fall through */ }
    }
    exportCSV(
      collaborateurs.map(c => ({
        Collaborateur: c.collaborateur, Email: c.email,
        'Dépensé (FCFA)': c.totalDepense, 'Limite (FCFA)': c.limite, 'Solde restant (FCFA)': c.soldeRestant,
      })),
      'rapport-syscohada.csv',
    );
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  return (
    <div className="min-h-screen" style={{ background: BG }}>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link to="/b2b" className="flex items-center gap-1.5 text-[12px] font-medium hover:opacity-70 transition"
            style={{ color: '#8B6E50' }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <span style={{ color: 'rgba(0,0,0,0.15)' }}>›</span>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#EA580C,#C2410C)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart2 className="w-3.5 h-3.5 text-white" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1A0C00', margin: 0, flex: 1 }}>Rapports & Analytique</p>

          {/* Actions topbar */}
          <div className="flex items-center gap-2">
            {/* Voir — toujours disponible */}
            <button onClick={() => setViewerOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold border transition hover:opacity-80"
              style={{ borderColor: BORDER, color: TEXT, background: BG }}>
              <Eye className="w-3.5 h-3.5" /> Voir rapport
            </button>

            {/* Télécharger — fin de mois uniquement */}
            {isLastDayOfMonth ? (
              <button onClick={handleExport}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white transition hover:opacity-90"
                style={{ background: exported ? `linear-gradient(135deg,${GREEN_D},${GREEN})` : `linear-gradient(135deg,${GREEN},${GREEN_D})`, boxShadow: `0 2px 10px ${GREEN}50` }}>
                {exported
                  ? <><CheckCircle className="w-3.5 h-3.5" /> Exporté !</>
                  : <><Download className="w-3.5 h-3.5" /> Télécharger CSV SYSCOHADA</>}
              </button>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold"
                style={{ background: AMBER_L, color: AMBER }}>
                <Clock className="w-3.5 h-3.5" /> Disponible le {lastDayDisplay}
              </span>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 rounded-full border-2 animate-spin"
            style={{ borderColor: ORANGE, borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total dépensé',   value: formatFCFA(totalDepenses),        bg: ORANGE,    icon: TrendingUp },
              { label: 'Collaborateurs',  value: collaborateurs.length,            bg: '#1A0C00', icon: Users },
              { label: 'Commandes mois',  value: reports?.totalCommandesMois ?? 0, bg: GREEN,     icon: BarChart2 },
              { label: 'Factures',        value: factures.length,                  bg: '#7C3AED', icon: FileText },
            ].map(({ label, value, bg, icon: Icon }) => (
              <div key={label} className="rounded-2xl p-4 text-white"
                style={{ background: bg, boxShadow: `0 4px 16px ${bg}40` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.2)' }}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-xl font-bold truncate">{value}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.72)' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Export info banner */}
          {isLastDayOfMonth ? (
            <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: GREEN_L, border: '1.5px solid #BBF7D0' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#fff' }}>
                <Download className="w-5 h-5" style={{ color: GREEN }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: GREEN_D }}>🎉 Fin du mois — export disponible !</p>
                <p className="text-xs" style={{ color: GREEN }}>
                  Format CSV conforme · TVA 18% · Norme OHADA ·{' '}
                  {reports?.moisEnCours && `${reports.moisEnCours} ${reports.anneeEnCours}`}
                </p>
              </div>
              <button onClick={handleExport}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                style={{ background: GREEN, boxShadow: `0 2px 8px ${GREEN}40` }}>
                <Download className="w-3.5 h-3.5" /> Télécharger
              </button>
            </div>
          ) : (
            <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: AMBER_L, border: '1.5px solid #FDE68A' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#fff' }}>
                <Clock className="w-5 h-5" style={{ color: AMBER }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: AMBER }}>Export SYSCOHADA disponible en fin de mois</p>
                <p className="text-xs" style={{ color: '#92400E' }}>
                  Téléchargeable le <strong>{lastDayDisplay}</strong>
                  {daysUntilExport > 1 ? ` · encore ${daysUntilExport} jours` : ' · demain'} · Format OHADA · TVA 18%
                </p>
              </div>
              <button onClick={() => setViewerOpen(true)}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border transition hover:opacity-80"
                style={{ borderColor: AMBER, color: AMBER, background: '#fff' }}>
                <Eye className="w-3.5 h-3.5" /> Consulter
              </button>
            </div>
          )}

          {/* Période */}
          {(reports?.moisEnCours || reports?.anneeEnCours) && (
            <p className="text-[12px]" style={{ color: MUTED }}>
              Période : <strong style={{ color: TEXT }}>{reports.moisEnCours} {reports.anneeEnCours}</strong>
              {' · '}{collaborateurs.length} collaborateur(s) actif(s)
            </p>
          )}

          {/* Tabs */}
          <div className="flex gap-0 border-b" style={{ borderColor: BORDER }}>
            {[
              { id: 'collaborateurs', label: 'Collaborateurs', icon: Users },
              { id: 'audit',          label: 'Historique',     icon: Activity },
              { id: 'factures',       label: 'Factures',       icon: FileText },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className="flex items-center gap-1.5 px-5 py-3 text-[12px] font-semibold border-b-2 transition"
                style={{ borderBottomColor: tab === id ? ORANGE : 'transparent', color: tab === id ? ORANGE : MUTED, background: 'transparent' }}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          {/* ── Collaborateurs ── */}
          {tab === 'collaborateurs' && (
            <div className="space-y-3">
              {collaborateurs.length === 0 ? (
                <div className="rounded-2xl py-16 text-center" style={{ background: CARD, boxShadow: SH }}>
                  <Users className="w-10 h-10 mx-auto mb-3" style={{ color: FAINT }} />
                  <p className="text-sm font-medium" style={{ color: MUTED }}>Aucune donnée de consommation ce mois</p>
                </div>
              ) : collaborateurs.map((c, i) => {
                const pct = c.limite > 0 ? Math.min(100, (c.totalDepense / c.limite) * 100) : 0;
                const barColor = pct >= 100 ? RED : pct >= 80 ? ORANGE : GREEN;
                return (
                  <div key={i} className="rounded-2xl p-5" style={{ background: CARD, boxShadow: SH2 }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Avatar name={c.collaborateur || ''} size={40} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold" style={{ color: TEXT }}>{c.collaborateur}</p>
                          <p className="text-[11px] mb-3" style={{ color: FAINT }}>{c.email}</p>
                          <div className="flex justify-between text-[11px] mb-1.5" style={{ color: MUTED }}>
                            <span>{(c.totalDepense ?? 0).toLocaleString()} FCFA dépensés</span>
                            <span style={{ color: pct >= 100 ? RED : pct >= 80 ? ORANGE : GREEN, fontWeight: 700 }}>{Math.round(pct)}%</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: BORDER }}>
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: barColor }} />
                          </div>
                          {pct >= 100 && <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: RED_L, color: RED }}>Budget dépassé</span>}
                          {pct >= 80 && pct < 100 && <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: AMBER_L, color: AMBER }}>Limite proche (80%)</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px]" style={{ color: FAINT }}>Solde restant</p>
                        <p className="text-[15px] font-bold" style={{ color: (c.soldeRestant ?? 0) > 0 ? GREEN : RED }}>
                          {(c.soldeRestant ?? 0).toLocaleString()} FCFA
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: FAINT }}>sur {(c.limite ?? 0).toLocaleString()} FCFA</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Historique ── */}
          {tab === 'audit' && (
            <div className="space-y-1.5">
              {auditLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl py-16 text-center" style={{ background: '#FFF7ED', boxShadow: SH }}>
                  <Activity className="w-12 h-12 mb-3" style={{ color: '#EA580C', opacity: 0.4 }} />
                  <p className="text-sm font-medium" style={{ color: '#1A0C00' }}>Aucun log d'audit</p>
                  <p className="text-xs mt-1" style={{ color: '#A89070' }}>Les actions de votre compte seront enregistrées ici.</p>
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden" style={{ background: CARD, boxShadow: SH2 }}>
                  {auditLogs.map((log, i, arr) => {
                    const TYPE_COLORS = {
                      CONNEXION: { bg: '#EFF6FF', color: '#2563EB' },
                      CREATION_COLLABORATEUR: { bg: GREEN_L, color: GREEN },
                      CREATION_COMMANDE_GROUPEE: { bg: `${ORANGE}15`, color: ORANGE },
                      VALIDATION_BUDGET: { bg: AMBER_L, color: AMBER },
                      GENERATION_FACTURE: { bg: GREEN_L, color: GREEN },
                      PAIEMENT_FACTURE: { bg: GREEN_L, color: GREEN_D },
                    };
                    const s = TYPE_COLORS[log.type] || { bg: BG, color: MUTED };
                    return (
                      <div key={i} className="flex items-center gap-3 px-5 py-3.5 transition"
                        style={{ borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none' }}
                        onMouseEnter={e => e.currentTarget.style.background = BG}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0"
                          style={{ background: s.bg, color: s.color }}>
                          {(log.actorEmail ?? log.user ?? '?')[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold" style={{ color: TEXT }}>
                            {log.type?.replaceAll('_', ' ') ?? log.action}
                          </p>
                          <p className="text-[11px] mt-0.5 truncate" style={{ color: FAINT }}>
                            {log.actorEmail ?? log.user}
                            {log.meta ? ` · ${JSON.stringify(log.meta).slice(0, 50)}` : log.details ? ` · ${log.details}` : ''}
                          </p>
                        </div>
                        <span className="text-[10px] shrink-0 font-medium" style={{ color: FAINT }}>
                          {new Date(log.createdAt ?? log.date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Factures ── */}
          {tab === 'factures' && (
            <div className="rounded-2xl overflow-hidden" style={{ background: CARD, boxShadow: SH2 }}>
              {factures.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center" style={{ background: '#FFF7ED' }}>
                  <FileText className="w-12 h-12 mb-3" style={{ color: '#EA580C', opacity: 0.4 }} />
                  <p className="text-sm font-medium" style={{ color: '#1A0C00' }}>Aucune facture ce mois-ci</p>
                  <p className="text-xs mt-1" style={{ color: '#A89070' }}>Les factures mensuelles générées apparaîtront ici.</p>
                </div>
              ) : factures.map((f, i, arr) => {
                const isPaid = f.statut === 'PAYEE' || f.statut === 'paid';
                const isLate = f.statut === 'RETARDEE';
                const isContested = f.statut === 'EN_CONTESTATION';
                const canContest = !isPaid && !isContested;
                return (
                  <div key={i} className="flex items-center justify-between px-5 py-4 transition"
                    style={{ borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = BG}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: isPaid ? GREEN_L : isLate ? RED_L : isContested ? '#EEF2FF' : AMBER_L }}>
                        <FileText className="w-4 h-4" style={{ color: isPaid ? GREEN : isLate ? RED : isContested ? '#6366F1' : AMBER }} />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold" style={{ color: TEXT }}>
                          {f.periode ?? f.mois} {f.annee}
                        </p>
                        <p className="text-[11px]" style={{ color: FAINT }}>#{f.numeroFacture}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {canContest && (
                        <button
                          onClick={() => { setContesterModal({ id: f.id, numeroFacture: f.numeroFacture }); setMotif(''); setContesterErr(''); }}
                          className="text-[11px] font-semibold px-3 py-1 rounded-lg border transition"
                          style={{ color: RED, borderColor: '#FECACA', background: RED_L }}>
                          Contester
                        </button>
                      )}
                      <div className="text-right">
                        <p className="text-[13px] font-bold" style={{ color: TEXT }}>
                          {(f.montantTTC ?? f.amount ?? 0).toLocaleString()} FCFA
                        </p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: isPaid ? GREEN_L : isLate ? RED_L : isContested ? '#EEF2FF' : AMBER_L, color: isPaid ? GREEN : isLate ? RED : isContested ? '#6366F1' : AMBER }}>
                          {isPaid ? 'Payée' : isLate ? 'En retard' : isContested ? 'En contestation' : 'En attente'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-center text-[11px]" style={{ color: FAINT }}>
            Données SYSCOHADA · TVA 18% · Export CSV disponible le {lastDayDisplay}
          </p>
        </div>
      )}

      {/* Modal contestation */}
      {contesterModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(139,110,80,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440, boxShadow: SH2 }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[15px]" style={{ color: TEXT }}>Contester la facture #{contesterModal.numeroFacture}</h3>
              <button onClick={() => setContesterModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[13px] mb-4" style={{ color: MUTED }}>
              Décrivez le problème constaté sur cette facture. Un message sera envoyé à l'administrateur.
            </p>
            <textarea
              value={motif}
              onChange={e => setMotif(e.target.value)}
              placeholder="Ex : montant incorrect, commandes manquantes..."
              rows={4}
              className="w-full rounded-xl border px-4 py-3 text-[13px] resize-none"
              style={{ borderColor: contesterErr ? RED : BORDER, outline: 'none', color: TEXT }}
            />
            {contesterErr && <p className="text-[12px] mt-1" style={{ color: RED }}>{contesterErr}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setContesterModal(null)}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border"
                style={{ borderColor: BORDER, color: MUTED, background: '#fff' }}>
                Annuler
              </button>
              <button onClick={handleContester} disabled={contesterLoading}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white"
                style={{ background: contesterLoading ? '#FCA5A5' : RED }}>
                {contesterLoading ? 'Envoi...' : 'Envoyer la contestation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Viewer modal */}
      {viewerOpen && (
        <SyscohadaViewerModal
          reports={reports}
          compte={compte}
          monthlyExp={monthlyExp}
          isLastDayOfMonth={isLastDayOfMonth}
          lastDayDisplay={lastDayDisplay}
          onClose={() => setViewerOpen(false)}
          onDownload={handleExport}
          downloading={false}
          userEmail={user?.email}
        />
      )}
    </div>
  );
}
