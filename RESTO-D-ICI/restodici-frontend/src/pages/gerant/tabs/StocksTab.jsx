/* StocksTab — extrait de GerantDashboard */
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, FileText, Package, Plus, Printer, RefreshCcw } from "lucide-react";
import { fournisseursAPI, restaurantAPI, stocksAPI } from "../../../services/api";
import { buildBonCommandeBlob } from "../../../utils/syscohada-pdf";
import { downloadAndOpenBlob } from "../_helpers";

export default function StocksTab({ restaurantId }) {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [adjustmentForm, setAdjustmentForm] = useState({ articleId: '', quantity: '', motif: '' });
  const [entreeForm, setEntreeForm] = useState({ articleId: '', quantity: '', fournisseurId: '', motif: '' });
  const [fournisseurs, setFournisseurs] = useState([]);
  const [stockTab, setStockTab] = useState('entree'); // 'entree' | 'ajustement' | 'rapport' | 'bon'
  const [rapportItems, setRapportItems] = useState([]); // [{id, nom, categorie, stockTheorique, stockReel}]
  const [rapportLoading, setRapportLoading] = useState(false);
  const [bonForm, setBonForm] = useState({ fournisseurId: '', dateLivraison: '', lignes: [{ article: '', quantite: '', prixUnit: '' }] });
  const [restaurantInfo, setRestaurantInfo] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadRapportEcarts = async () => {
    if (!restaurantId) return;
    setRapportLoading(true);
    try {
      const res = await stocksAPI.getRapportEcarts(restaurantId);
      setRapportItems((res.data || []).map(a => ({ ...a, stockReel: '' })));
    } catch { showToast('Erreur chargement rapport'); }
    finally { setRapportLoading(false); }
  };

  const loadRestaurantInfo = async () => {
    if (restaurantInfo) return;
    try { const r = await restaurantAPI.getMine(); setRestaurantInfo(r.data); } catch { /* ignore */ }
  };

  const generateBonCommande = () => {
    const fournisseur = fournisseurs.find(f => f.id === bonForm.fournisseurId);
    if (!fournisseur || bonForm.lignes.every(l => !l.article)) {
      showToast('Sélectionnez un fournisseur et au moins un article');
      return;
    }
    const lignes = bonForm.lignes.filter(l => l.article && l.quantite);
    const num = `BC-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const blob = buildBonCommandeBlob({
      num,
      restaurantNom: restaurantInfo?.nom || 'Restaurant',
      restaurantAdresse: restaurantInfo?.adresse || '',
      fournisseur,
      lignes,
      dateLivraison: bonForm.dateLivraison,
    });
    downloadAndOpenBlob(blob, `bon-commande-${num}.pdf`);
  };

  const exportRapportCSV = () => {
    const date = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
    const rows = [
      ['Article', 'Catégorie', 'Stock Théorique', 'Stock Réel', 'Écart', 'Statut'],
      ...rapportItems.map(r => {
        const reel = r.stockReel !== '' ? Number(r.stockReel) : null;
        const ecart = reel !== null ? reel - r.stockTheorique : '';
        const statut = reel === null ? 'Non compté' : ecart === 0 ? 'OK' : ecart > 0 ? 'Excédent' : 'Manquant';
        return [r.nom, r.categorie, r.stockTheorique, reel ?? '', ecart, statut];
      }),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `inventaire-ecarts-${date}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const loadStocks = useCallback(async () => {
    if (!restaurantId) return;
    try {
      setLoading(true);
      const [stocksRes, fourRes] = await Promise.all([
        stocksAPI.getAll({ restaurantId }),
        fournisseursAPI.getActifs().catch(() => ({ data: [] })),
      ]);
      setStocks(stocksRes.data || []);
      setFournisseurs(fourRes.data || []);
    } catch {
      setStocks([
        { id: '1', nom: 'Riz', stock: 25, unite: 'kg', seuil: 10 },
        { id: '2', nom: 'Poisson', stock: 3, unite: 'kg', seuil: 5 },
        { id: '3', nom: 'Tomates', stock: 15, unite: 'kg', seuil: 8 },
      ]);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { loadStocks(); }, [loadStocks]);

  const handleAdjustStock = async () => {
    if (!adjustmentForm.articleId || !adjustmentForm.quantity) {
      showToast('Article et quantité requis');
      return;
    }
    try {
      setSaving(true);
      await stocksAPI.adjust(
        adjustmentForm.articleId,
        parseInt(adjustmentForm.quantity),
        adjustmentForm.motif || 'Ajustement manuel',
      );
      setAdjustmentForm({ articleId: '', quantity: '', motif: '' });
      showToast('Stock ajusté avec succès');
      await loadStocks();
    } catch {
      showToast("Erreur lors de l'ajustement");
    } finally {
      setSaving(false);
    }
  };

  const handleEntreeStock = async () => {
    if (!entreeForm.articleId || !entreeForm.quantity) {
      showToast('Article et quantité requis');
      return;
    }
    if (!entreeForm.fournisseurId) {
      showToast('Fournisseur obligatoire pour une entrée de stock');
      return;
    }
    if (parseInt(entreeForm.quantity) <= 0) {
      showToast('La quantité doit être positive');
      return;
    }
    try {
      setSaving(true);
      await stocksAPI.entreeStock(
        entreeForm.articleId,
        parseInt(entreeForm.quantity),
        entreeForm.fournisseurId,
        entreeForm.motif,
      );
      setEntreeForm({ articleId: '', quantity: '', fournisseurId: '', motif: '' });
      showToast('Entrée de stock enregistrée');
      await loadStocks();
    } catch (e) {
      showToast(e?.response?.data?.message || "Erreur lors de l'entrée de stock");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="h-9 w-9 rounded-full border-4 border-[#EA580C] border-t-transparent animate-spin" />
      </div>
    );
  }

  const criticalItems = stocks.filter(s => Number(s.stock) <= Number(s.seuilMin || s.seuil || 5));
  const okItems = stocks.length - criticalItems.length;

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-2xl bg-[#EA580C] px-4 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div>
      )}

      {/* KPI header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Articles suivis', value: stocks.length, icon: Package, iconBg: '#FFF0DF', iconColor: '#EA580C' },
          { label: 'Niveaux OK', value: okItems, icon: CheckCircle, iconBg: '#F0FDF4', iconColor: '#16A34A' },
          { label: 'Alertes critiques', value: criticalItems.length, icon: AlertTriangle, iconBg: criticalItems.length > 0 ? '#FEF2F2' : '#F0FDF4', iconColor: criticalItems.length > 0 ? '#DC2626' : '#16A34A' },
        ].map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <div key={label} className="rounded-2xl bg-white border border-[#E2E8F0] p-4 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
              <Icon className="w-5 h-5" style={{ color: iconColor }} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#8B6E50] uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-extrabold text-[#1A0C00]">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alert banner */}
      {criticalItems.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">
            <span className="font-bold">{criticalItems.length} article{criticalItems.length > 1 ? 's' : ''} en alerte :</span>{' '}
            {criticalItems.map(i => i.nom).join(', ')}
          </p>
        </div>
      )}

      {/* Inventory table */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F4F6F8]">
          <div>
            <h4 className="text-sm font-bold text-[#1A0C00]">Inventaire</h4>
            <p className="text-xs text-[#8B6E50] mt-0.5">Vue détaillée par article avec niveau de stock</p>
          </div>
          <button onClick={loadStocks}
            className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-semibold text-[#475569] hover:border-[#EA580C]/40 hover:text-[#EA580C] transition-colors">
            <RefreshCcw className="w-3.5 h-3.5" />
            Actualiser
          </button>
        </div>
        {stocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center" style={{ background: '#FFF7ED' }}>
            <Package className="w-12 h-12 mb-3" style={{ color: '#EA580C', opacity: 0.4 }} />
            <p className="text-sm font-medium" style={{ color: '#1A0C00' }}>Aucun article en stock</p>
            <p className="text-xs mt-1" style={{ color: '#A89070' }}>Le stock de vos articles apparaîtra ici dès qu'ils seront créés.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F4F6F8]">
            {stocks.map((item) => {
              const stockVal = Math.max(0, Number(item.stock || 0));
              const seuil    = Math.max(1, Number(item.seuilMin || item.seuil || 5));
              const pct      = Math.min(100, Math.round((stockVal / Math.max(seuil * 3, 1)) * 100));
              const isAlert  = stockVal <= seuil;
              return (
                <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold text-[#1A0C00] text-sm truncate">{item.nom}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold flex-shrink-0 ${isAlert ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {isAlert ? 'Alerte' : 'OK'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#F4F6F8] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${isAlert ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: pct + '%' }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-lg font-extrabold ${isAlert ? 'text-red-600' : 'text-[#1A0C00]'}`}>{stockVal}</p>
                    <p className="text-xs text-[#8B6E50]">{item.unite || 'unités'}</p>
                  </div>
                  <div className="text-right flex-shrink-0 hidden sm:block w-20">
                    <p className="text-[10px] text-[#8B6E50] uppercase tracking-wide">Seuil min.</p>
                    <p className="text-sm font-semibold text-[#475569]">{seuil} {item.unite || 'u.'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Entrée de stock / Ajustement — tabs */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        {/* Tab switcher */}
        <div className="flex border-b border-[#E2E8F0]">
          <button
            onClick={() => setStockTab('entree')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition ${stockTab === 'entree' ? 'bg-[#FFF0DF] text-[#EA580C] border-b-2 border-[#EA580C]' : 'text-[#8B6E50] hover:bg-[#F9F9FC]'}`}
          >
            <Plus className="w-4 h-4" /> Entrée de stock
          </button>
          <button
            onClick={() => setStockTab('ajustement')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition ${stockTab === 'ajustement' ? 'bg-slate-100 text-slate-700 border-b-2 border-slate-400' : 'text-[#8B6E50] hover:bg-[#F9F9FC]'}`}
          >
            <RefreshCcw className="w-4 h-4" /> Ajustement manuel
          </button>
          <button
            onClick={() => { setStockTab('rapport'); loadRapportEcarts(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition ${stockTab === 'rapport' ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500' : 'text-[#8B6E50] hover:bg-[#F9F9FC]'}`}
          >
            <FileText className="w-4 h-4" /> Rapport d'écarts
          </button>
          <button
            onClick={() => { setStockTab('bon'); loadRestaurantInfo(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition ${stockTab === 'bon' ? 'bg-violet-50 text-violet-700 border-b-2 border-violet-500' : 'text-[#8B6E50] hover:bg-[#F9F9FC]'}`}
          >
            <Printer className="w-4 h-4" /> Bon de commande
          </button>
        </div>

        <div className="p-5">
          {stockTab === 'entree' ? (
            <>
              <p className="text-xs text-[#8B6E50] mb-4 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#EA580C] inline-block" />
                Réception marchandise — fournisseur <strong>obligatoire</strong>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#475569]">Article</label>
                  <select value={entreeForm.articleId}
                    onChange={e => setEntreeForm({ ...entreeForm, articleId: e.target.value })}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F9F9FC] px-4 py-3.5 text-[15px] outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition">
                    <option value="">Sélectionner un article</option>
                    {stocks.map(item => <option key={item.id} value={item.id}>{item.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#475569]">
                    Fournisseur <span className="text-red-500">*</span>
                  </label>
                  {fournisseurs.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                      Aucun fournisseur actif — contactez l'administrateur
                    </p>
                  ) : (
                    <select value={entreeForm.fournisseurId}
                      onChange={e => setEntreeForm({ ...entreeForm, fournisseurId: e.target.value })}
                      className="w-full rounded-xl border border-[#E2E8F0] bg-[#F9F9FC] px-4 py-3.5 text-[15px] outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition">
                      <option value="">Sélectionner un fournisseur</option>
                      {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}{f.delaiLivraison ? ` (${f.delaiLivraison}j)` : ''}</option>)}
                    </select>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#475569]">Quantité reçue</label>
                  <input type="number" min="1" value={entreeForm.quantity}
                    onChange={e => setEntreeForm({ ...entreeForm, quantity: e.target.value })}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F9F9FC] px-4 py-3.5 text-[15px] outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition"
                    placeholder="Ex: 10" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#475569]">Motif / Référence bon de livraison</label>
                  <input type="text" value={entreeForm.motif}
                    onChange={e => setEntreeForm({ ...entreeForm, motif: e.target.value })}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F9F9FC] px-4 py-3.5 text-[15px] outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition"
                    placeholder="BL-2026-042, livraison hebdo..." />
                </div>
              </div>
              <button onClick={handleEntreeStock} disabled={saving || !entreeForm.fournisseurId}
                className="flex items-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#C2410C] disabled:opacity-60">
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Enregistrement...' : 'Enregistrer la réception'}
              </button>
            </>
          ) : stockTab === 'ajustement' ? (
            <>
              <p className="text-xs text-slate-500 mb-4">
                Correction manuelle de stock (casse, inventaire, erreur) — sans lien fournisseur
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#475569]">Article</label>
                  <select value={adjustmentForm.articleId}
                    onChange={e => setAdjustmentForm({ ...adjustmentForm, articleId: e.target.value })}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F9F9FC] px-3 py-2.5 text-sm outline-none focus:border-[#EA580C] focus:ring-1 transition">
                    <option value="">Sélectionner un article</option>
                    {stocks.map(item => <option key={item.id} value={item.id}>{item.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#475569]">Quantité (+/-)</label>
                  <input type="number" value={adjustmentForm.quantity}
                    onChange={e => setAdjustmentForm({ ...adjustmentForm, quantity: e.target.value })}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F9F9FC] px-3 py-2.5 text-sm outline-none focus:border-[#EA580C] focus:ring-1 transition"
                    placeholder="Ex: -2 (casse)" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#475569]">Motif</label>
                  <input type="text" value={adjustmentForm.motif}
                    onChange={e => setAdjustmentForm({ ...adjustmentForm, motif: e.target.value })}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F9F9FC] px-3 py-2.5 text-sm outline-none focus:border-[#EA580C] focus:ring-1 transition"
                    placeholder="Casse, correction inventaire..." />
                </div>
              </div>
              <button onClick={handleAdjustStock} disabled={saving}
                className="mt-4 flex items-center gap-2 rounded-xl bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:opacity-60">
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                {saving ? 'Enregistrement...' : 'Ajuster'}
              </button>
            </>
          ) : stockTab === 'rapport' ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-emerald-800">Rapport d'écarts inventaire</p>
                  <p className="text-xs text-[#8B6E50] mt-0.5">Saisissez le stock réel compté — l'écart est calculé automatiquement</p>
                </div>
                <button onClick={exportRapportCSV} disabled={rapportItems.length === 0}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition">
                  <FileText className="w-3.5 h-3.5" /> Export CSV (Excel)
                </button>
              </div>
              {rapportLoading ? (
                <div className="flex justify-center py-8"><div className="h-8 w-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" /></div>
              ) : rapportItems.length === 0 ? (
                <p className="text-center text-sm text-[#8B6E50] py-8">Aucun article trouvé</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#8B6E50] uppercase tracking-wide">
                        <th className="text-left pb-2 pr-4">Article</th>
                        <th className="text-left pb-2 pr-4">Catégorie</th>
                        <th className="text-right pb-2 pr-4">Théorique</th>
                        <th className="text-right pb-2 pr-4">Réel (comptage)</th>
                        <th className="text-right pb-2">Écart</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F4F6F8]">
                      {rapportItems.map((r, idx) => {
                        const reel = r.stockReel !== '' ? Number(r.stockReel) : null;
                        const ecart = reel !== null ? reel - r.stockTheorique : null;
                        return (
                          <tr key={r.id} className="hover:bg-[#F9F9FC]">
                            <td className="py-2.5 pr-4 font-medium text-[#1A0C00]">{r.nom}</td>
                            <td className="py-2.5 pr-4 text-[#8B6E50]">{r.categorie}</td>
                            <td className="py-2.5 pr-4 text-right font-semibold text-[#1A0C00]">{r.stockTheorique}</td>
                            <td className="py-2.5 pr-4 text-right">
                              <input type="number" min="0" value={r.stockReel}
                                onChange={e => setRapportItems(prev => prev.map((x, i) => i === idx ? { ...x, stockReel: e.target.value } : x))}
                                placeholder="—"
                                className="w-20 rounded-lg border border-[#E2E8F0] px-2 py-1 text-right text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400" />
                            </td>
                            <td className={`py-2.5 text-right font-bold ${ecart === null ? 'text-[#8B6E50]' : ecart === 0 ? 'text-emerald-600' : ecart > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              {ecart === null ? '—' : ecart > 0 ? `+${ecart}` : ecart}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : stockTab === 'bon' ? (
            <>
              <p className="text-xs text-[#8B6E50] mb-4">Générez un bon de commande PDF à envoyer à votre fournisseur</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#475569]">Fournisseur <span className="text-red-500">*</span></label>
                  <select value={bonForm.fournisseurId} onChange={e => setBonForm(p => ({ ...p, fournisseurId: e.target.value }))}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F9F9FC] px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 transition">
                    <option value="">Sélectionner…</option>
                    {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#475569]">Date de livraison souhaitée</label>
                  <input type="date" value={bonForm.dateLivraison} onChange={e => setBonForm(p => ({ ...p, dateLivraison: e.target.value }))}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F9F9FC] px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-1 transition" />
                </div>
              </div>

              <p className="text-xs font-semibold text-[#475569] mb-2">Lignes de commande</p>
              <div className="space-y-2 mb-3">
                {bonForm.lignes.map((l, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input type="text" placeholder="Article / désignation" value={l.article}
                      onChange={e => setBonForm(p => { const ls=[...p.lignes]; ls[idx]={...ls[idx],article:e.target.value}; return {...p,lignes:ls}; })}
                      className="flex-1 rounded-lg border border-[#E2E8F0] bg-[#F9F9FC] px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-1 transition" />
                    <input type="number" min="1" placeholder="Qté" value={l.quantite}
                      onChange={e => setBonForm(p => { const ls=[...p.lignes]; ls[idx]={...ls[idx],quantite:e.target.value}; return {...p,lignes:ls}; })}
                      className="w-20 rounded-lg border border-[#E2E8F0] bg-[#F9F9FC] px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-1 transition" />
                    <input type="number" min="0" placeholder="Prix unit." value={l.prixUnit}
                      onChange={e => setBonForm(p => { const ls=[...p.lignes]; ls[idx]={...ls[idx],prixUnit:e.target.value}; return {...p,lignes:ls}; })}
                      className="w-28 rounded-lg border border-[#E2E8F0] bg-[#F9F9FC] px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-1 transition" />
                    <button type="button" onClick={() => setBonForm(p => ({ ...p, lignes: p.lignes.filter((_,i)=>i!==idx) }))}
                      className="text-red-400 hover:text-red-600 text-lg font-bold px-1">×</button>
                  </div>
                ))}
                <button type="button" onClick={() => setBonForm(p => ({ ...p, lignes: [...p.lignes, { article:'', quantite:'', prixUnit:'' }] }))}
                  className="text-xs font-semibold text-violet-700 border border-violet-300 rounded-xl px-3 py-1.5 hover:bg-violet-50 transition">
                  + Ajouter une ligne
                </button>
              </div>

              <button onClick={generateBonCommande}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700">
                <Printer className="w-4 h-4" /> Générer le PDF
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ Module Finance — Trésorerie ══════════════════ */
