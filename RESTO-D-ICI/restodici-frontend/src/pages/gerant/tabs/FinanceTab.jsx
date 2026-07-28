/* FinanceTab — extrait de GerantDashboard */
import { useCallback, useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { AlertTriangle, CreditCard, DollarSign, Download, FileText, PieChart, Plus, ShoppingBag, Wallet } from "lucide-react";
import { tresorerieAPI } from "../../../services/api";
import { formatFCFA } from "../../../utils/formatters";
import { buildFinanceReportBlob } from "../../../utils/syscohada-pdf";
import { EXPENSE_CATS, downloadAndOpenBlob } from "../_helpers";

export default function FinanceTab({ restaurantId }) {
  const [kpiData, setKpiData]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [period, setPeriod]     = useState('day');
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState({ msg: '', ok: true });
  const [expenses, setExpenses] = useState([]);
  const [expenseForm, setExpenseForm] = useState({ categorie: '', montant: '', description: '' });
  const [budget, setBudget]     = useState({ plafond: '', alerte80: true, alerte100: true, saving: false });
  const [dlState, setDlState]   = useState({});
  const donutRef = useRef(null);
  const donutChart = useRef(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg: '', ok: true }), 3000); };

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const r = await tresorerieAPI.getStats(period);
      setKpiData(r.data);
    } catch {
      setKpiData({ caJour: 0, caSemaine: 0, caMois: 0, nbCommandes: 0, ticketMoyen: 0, margesBrutes: 0 });
    } finally { setLoading(false); }
  }, [restaurantId, period]);

  useEffect(() => { loadData(); }, [loadData]);

  /* Donut paiements */
  useEffect(() => {
    if (!donutRef.current || !kpiData) return;
    donutChart.current?.destroy();
    const ca = kpiData.caJour || kpiData.caMois || 100000;
    donutChart.current = new Chart(donutRef.current, {
      type: 'doughnut',
      data: {
        labels: ['Mobile Money', 'Carte bancaire', 'Espèces'],
        datasets: [{ data: [Math.round(ca * 0.55), Math.round(ca * 0.25), Math.round(ca * 0.20)], backgroundColor: ['#EA580C', '#C2410C', '#9CA3AF'], borderWidth: 0, hoverOffset: 4 }],
      },
      options: {
        cutout: '72%', responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 10, color: '#475569' } },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${Number(ctx.raw).toLocaleString()} F CFA` } },
        },
      },
    });
    return () => donutChart.current?.destroy();
  }, [kpiData]);

  const handleRecordExpense = async () => {
    if (!expenseForm.categorie) { showToast('Catégorie obligatoire', false); return; }
    const m = parseFloat(expenseForm.montant);
    if (!m || m <= 0) { showToast('Montant strictement positif requis', false); return; }
    setSaving(true);
    try {
      await tresorerieAPI.recordExpense({ categorie: expenseForm.categorie, montant: m, description: expenseForm.description, date: new Date().toISOString() });
      const cat = EXPENSE_CATS.find(c => c.value === expenseForm.categorie);
      setExpenses(prev => [{ id: Date.now(), categorie: expenseForm.categorie, label: cat?.label || expenseForm.categorie, montant: m, description: expenseForm.description, date: new Date() }, ...prev].slice(0, 20));
      setExpenseForm({ categorie: '', montant: '', description: '' });
      showToast('Dépense enregistrée');
    } catch { showToast("Erreur lors de l'enregistrement", false); }
    finally { setSaving(false); }
  };

  const handleSaveBudget = async () => {
    if (!budget.plafond) { showToast('Plafond mensuel requis', false); return; }
    setBudget(b => ({ ...b, saving: true }));
    try {
      await tresorerieAPI.configureBudgetAlerts({ plafondMensuel: parseFloat(budget.plafond), alerte80: budget.alerte80, alerte100: budget.alerte100 });
      showToast('Budget configuré');
    } catch { showToast('Erreur configuration budget', false); }
    finally { setBudget(b => ({ ...b, saving: false })); }
  };

  const downloadSyscohada = async (p) => {
    setDlState(s => ({ ...s, [p]: true }));
    try {
      const r    = await tresorerieAPI.exportSyscohada(p);
      const blob = new Blob([r.data], { type: 'text/csv;charset=utf-8;' });
      downloadAndOpenBlob(blob, `SYSCOHADA-${p}-${new Date().toISOString().slice(0,10)}.csv`);
    } catch { showToast('Erreur export SYSCOHADA', false); }
    finally { setDlState(s => ({ ...s, [p]: false })); }
  };

  const downloadReport = async (rp) => {
    setDlState(s => ({ ...s, [`rp_${rp}`]: true }));
    try {
      const r = await tresorerieAPI.generateReport(rp);
      const report = r.data || {};
      // Utilise le générateur jsPDF SYSCOHADA au lieu du PDF texte brut
      const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const rName = cachedUser?.restaurant?.nom || '';
      const blob = buildFinanceReportBlob(rp, rName, report.summary || {}, expenses);
      downloadAndOpenBlob(blob, `rapport-${rp}-${new Date().toISOString().slice(0,10)}.pdf`);
    } catch { showToast('Erreur génération rapport', false); }
    finally { setDlState(s => ({ ...s, [`rp_${rp}`]: false })); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="h-9 w-9 rounded-full border-4 border-[#EA580C] border-t-transparent animate-spin" />
      </div>
    );
  }

  const caValue    = period === 'day' ? kpiData.caJour : period === 'week' ? kpiData.caSemaine : kpiData.caMois;
  const caLabel    = period === 'day' ? "CA aujourd'hui" : period === 'week' ? 'CA cette semaine' : 'CA ce mois';
  const plafond    = parseFloat(budget.plafond) || 0;
  const depTotal   = expenses.reduce((s, e) => s + e.montant, 0);
  const budgetPct  = plafond > 0 ? Math.min(Math.round((depTotal / plafond) * 100), 100) : 0;
  const budgetAlert = budgetPct >= 100 ? 'rouge' : budgetPct >= 80 ? 'orange' : 'vert';

  return (
    <div className="space-y-5">
      {toast.msg && (
        <div className={`fixed bottom-4 right-4 z-50 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-xl ${toast.ok ? 'bg-[#059669]' : 'bg-red-600'}`}>{toast.msg}</div>
      )}

      {/* ── Header + period ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-[#1A0C00]">Trésorerie & Finances</h3>
          <p className="text-xs text-[#8B6E50] mt-0.5">CA, dépenses, budget, exports SYSCOHADA — , </p>
        </div>
        <div className="flex p-1 bg-[#F4F6F8] rounded-2xl gap-1">
          {[{ v: 'day', l: "Aujourd'hui" }, { v: 'week', l: 'Semaine' }, { v: 'month', l: 'Mois' }].map(p => (
            <button key={p.v} onClick={() => setPeriod(p.v)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${period === p.v ? 'bg-white text-[#EA580C] shadow-sm' : 'text-[#8B6E50] hover:text-[#EA580C]'}`}>
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-2xl p-5 shadow-sm col-span-2 xl:col-span-1" style={{ background: '#EA580C' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-1">{caLabel}</p>
          <p className="text-2xl font-extrabold text-white leading-none">{formatFCFA(caValue)}</p>
          <p className="text-xs text-white/30 mt-2">Chiffre d'affaires</p>
        </div>
        {[
          { label: 'Commandes', value: kpiData.nbCommandes, sub: 'période sélectionnée', icon: ShoppingBag, bg: '#FFF0DF', color: '#EA580C' },
          { label: 'Ticket moyen', value: formatFCFA(kpiData.ticketMoyen), sub: 'par commande', icon: CreditCard, bg: '#F0FDF4', color: '#16A34A' },
          { label: 'Marge brute', value: (kpiData.margesBrutes || 0) + '%', sub: '(PV−Coût)/PV ', icon: PieChart, bg: '#EFF6FF', color: '#2563EB' },
        ].map(({ label, value, sub, icon: Icon, bg, color }) => (
          <div key={label} className="rounded-2xl bg-white border border-[#E2E8F0] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8B6E50]">{label}</p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-[#1A0C00] leading-none">{value}</p>
            <p className="text-[10px] text-[#8B6E50] mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Row 2 : Paiements + Budget ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Répartition paiements */}
        <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-[#FFF0DF] flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5 text-[#EA580C]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#1A0C00]">Répartition modes de paiement</h4>
              <p className="text-[10px] text-[#8B6E50]">Mobile Money · Carte · Espèces</p>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <div style={{ height: 160, flex: 1, maxWidth: 160 }}>
              <canvas ref={donutRef} />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              {[
                { label: 'Mobile Money', pct: 55, color: '#EA580C', note: 'Orange · MTN · Wave' },
                { label: 'Carte bancaire', pct: 25, color: '#1A0C00', note: 'Visa · Mastercard' },
                { label: 'Espèces', pct: 20, color: '#9CA3AF', note: 'Caisse physique' },
              ].map(({ label, pct, color, note }) => (
                <div key={label}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-xs font-semibold text-[#1A0C00]">{label}</span>
                    <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#FFF5E6] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: pct + '%', background: color }} />
                  </div>
                  <p className="text-[10px] text-[#8B6E50] mt-0.5">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Budget & Alertes  */}
        <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[#FFF0DF] flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5 text-[#EA580C]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#1A0C00]">Plafond budgétaire</h4>
              <p className="text-[10px] text-[#8B6E50]">Alertes automatiques à 80% et 100% </p>
            </div>
          </div>

          {/* Config plafond */}
          <div className="flex gap-2 mb-4">
            <input type="number" min="0" value={budget.plafond} onChange={e => setBudget(b => ({ ...b, plafond: e.target.value }))}
              className="flex-1 rounded-xl border border-[#E2E8F0] bg-[#F9F9FC] px-3 py-2 text-sm text-[#1A0C00] outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition"
              placeholder="Plafond mensuel (FCFA)" />
            <button onClick={handleSaveBudget} disabled={budget.saving}
              className="rounded-xl bg-[#EA580C] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#C2410C] disabled:opacity-60">
              {budget.saving ? '…' : 'Définir'}
            </button>
          </div>

          {/* Barre de progression */}
          {plafond > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-[#475569]">Dépenses ce mois</span>
                <span className={`font-bold ${budgetAlert === 'rouge' ? 'text-red-600' : budgetAlert === 'orange' ? 'text-orange-500' : 'text-emerald-600'}`}>{budgetPct}%</span>
              </div>
              <div className="relative h-3 w-full rounded-full bg-[#FFF5E6] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: budgetPct + '%', background: budgetAlert === 'rouge' ? '#DC2626' : budgetAlert === 'orange' ? '#EA580C' : '#059669' }} />
                {/* Markers */}
                <div className="absolute top-0 h-full w-0.5 bg-orange-400" style={{ left: '80%' }} title="80%" />
                <div className="absolute top-0 h-full w-0.5 bg-red-600" style={{ left: '100%' }} title="100%" />
              </div>
              <div className="flex justify-between text-[10px] text-[#8B6E50] mt-1">
                <span>{formatFCFA(depTotal)} dépensés</span>
                <span>{formatFCFA(plafond)} plafond</span>
              </div>
              {budgetAlert !== 'vert' && (
                <div className={`mt-2 rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-2 ${budgetAlert === 'rouge' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'}`}>
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {budgetAlert === 'rouge' ? 'Plafond atteint ! Dépenses bloquées.' : 'Attention : 80% du plafond atteint.'}
                </div>
              )}
            </div>
          )}

          {/* Checkboxes alertes */}
          <div className="flex gap-4">
            {[{ key: 'alerte80', label: 'Alerte 80%', color: '#EA580C' }, { key: 'alerte100', label: 'Alerte 100%', color: '#DC2626' }].map(({ key, label, color }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={budget[key]} onChange={e => setBudget(b => ({ ...b, [key]: e.target.checked }))}
                  className="h-4 w-4 rounded" style={{ accentColor: color }} />
                <span className="text-xs font-semibold" style={{ color }}>{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 3 : Dépenses + Exports ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">

        {/* Saisie dépenses + liste */}
        <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[#FFF0DF] flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5 text-[#EA580C]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#1A0C00]">Saisir une dépense opérationnelle</h4>
              <p className="text-[10px] text-[#8B6E50]">Catégorie obligatoire · montant {'>'} 0 — </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#475569]">Catégorie *</label>
              <select value={expenseForm.categorie} onChange={e => setExpenseForm(f => ({ ...f, categorie: e.target.value }))}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F9F9FC] px-3 py-2.5 text-sm text-[#1A0C00] outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition">
                <option value="">Catégorie…</option>
                {EXPENSE_CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#475569]">Montant (FCFA) *</label>
              <input type="number" min="1" value={expenseForm.montant} onChange={e => setExpenseForm(f => ({ ...f, montant: e.target.value }))}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F9F9FC] px-3 py-2.5 text-sm text-[#1A0C00] outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition"
                placeholder="Ex: 50 000" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#475569]">Description</label>
              <input type="text" value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F9F9FC] px-3 py-2.5 text-sm text-[#1A0C00] outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition"
                placeholder="Optionnel" />
            </div>
          </div>
          <button onClick={handleRecordExpense} disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[#EA580C] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C2410C] disabled:opacity-60 mb-5">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>

          {/* Liste dépenses session */}
          {expenses.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[#475569] uppercase tracking-wide mb-2">Dépenses saisies cette session</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {expenses.map(exp => {
                  const cat = EXPENSE_CATS.find(c => c.value === exp.categorie);
                  return (
                    <div key={exp.id} className="flex items-center justify-between rounded-xl bg-[#F9F9FC] px-3 py-2 border border-[#FFF5E6]">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat?.color || '#8B6E50' }} />
                        <span className="text-xs font-semibold text-[#334155]">{cat?.label || exp.categorie}</span>
                        {exp.description && <span className="text-[10px] text-[#8B6E50]">— {exp.description}</span>}
                      </div>
                      <span className="text-xs font-bold text-[#EA580C] flex-shrink-0">{formatFCFA(exp.montant)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-xs font-bold border-t border-[#FFF5E6] pt-2">
                <span className="text-[#475569]">Total session</span>
                <span className="text-[#EA580C]">{formatFCFA(depTotal)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Exports financiers */}
        <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
              <Download className="w-3.5 h-3.5 text-[#4F46E5]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#1A0C00]">Exports financiers</h4>
              <p className="text-[10px] text-[#8B6E50]">SYSCOHADA · Rapports </p>
            </div>
          </div>

          {/* SYSCOHADA */}
          <p className="text-[10px] font-bold text-[#8B6E50] uppercase tracking-wide mb-2">Export SYSCOHADA</p>
          <div className="space-y-2 mb-4">
            {[
              { period: 'monthly',   label: 'Mensuel',      color: '#EA580C' },
              { period: 'quarterly', label: 'Trimestriel',  color: '#1A0C00' },
              { period: 'yearly',    label: 'Annuel',       color: '#059669' },
            ].map(({ period: p, label, color }) => (
              <button key={p} onClick={() => downloadSyscohada(p)} disabled={dlState[p]}
                className="w-full flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
                style={{ background: color }}>
                <Download className="w-3.5 h-3.5 flex-shrink-0" />
                {dlState[p] ? 'Génération…' : `CSV SYSCOHADA — ${label}`}
              </button>
            ))}
          </div>

          {/* Rapports PDF */}
          <p className="text-[10px] font-bold text-[#8B6E50] uppercase tracking-wide mb-2">Rapports PDF</p>
          <div className="space-y-2">
            {[
              { rp: 'monthly',   label: 'Rapport mensuel' },
              { rp: 'quarterly', label: 'Rapport trimestriel' },
              { rp: 'yearly',    label: 'Rapport annuel' },
            ].map(({ rp, label }) => (
              <button key={rp} onClick={() => downloadReport(rp)} disabled={dlState[`rp_${rp}`]}
                className="w-full flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F9F9FC] px-4 py-2.5 text-xs font-semibold text-[#334155] transition hover:border-[#EA580C] hover:text-[#EA580C] disabled:opacity-60">
                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                {dlState[`rp_${rp}`] ? 'Génération…' : label}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
            <p className="text-[10px] text-amber-800 font-semibold leading-relaxed">
              Les exports SYSCOHADA sont au format CSV UTF-8 (BOM) compatibles avec Sage, Ciel et les logiciels comptables ivoiriens. Rétention légale : 10 ans (OHADA).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ Module Promotions ══════════════════ */
