/* PromosTab — extrait de GerantDashboard */
import { useCallback, useEffect, useState } from "react";
import { CheckCircle, Copy, Pencil, Percent, Plus, Tag, ToggleLeft, ToggleRight, Trash2, TrendingUp, X } from "lucide-react";
import { promosAPI } from "../../../services/api";
import { PROMO_TYPES, VISIBILITE_OPTIONS, emptyForm } from "../_helpers";

export default function PromosTab({ restaurantId }) {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | promo object
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: '', ok: true });
  const [copied, setCopied] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: '', ok: true }), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await promosAPI.getAll();
      setPromos(r.data || []);
    } catch { setPromos([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(emptyForm); setModal('create'); };
  const openEdit = (p) => {
    setForm({
      code: p.code,
      type: p.type,
      valeur: String(p.valeur),
      description: p.description || '',
      minMontant: p.minMontant ? String(p.minMontant) : '',
      maxUses: p.maxUses != null ? String(p.maxUses) : '',
      expiresAt: p.expiresAt ? p.expiresAt.slice(0, 10) : '',
      actif: p.actif,
      visibilite: p.visibilite || 'TOUS',
    });
    setModal(p);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { showToast('Code obligatoire', false); return; }
    if (!form.valeur || parseFloat(form.valeur) <= 0) { showToast('Valeur > 0 obligatoire', false); return; }
    setSaving(true);
    const payload = {
      code: form.code.toUpperCase().replace(/\s+/g, ''),
      type: form.type,
      valeur: parseFloat(form.valeur),
      description: form.description || undefined,
      minMontant: form.minMontant ? parseFloat(form.minMontant) : 0,
      maxUses: form.maxUses ? parseInt(form.maxUses) : null,
      expiresAt: form.expiresAt || null,
      actif: form.actif,
      visibilite: form.visibilite || 'TOUS',
    };
    try {
      if (modal === 'create') {
        await promosAPI.create(payload);
        showToast('Code promo créé !');
      } else {
        await promosAPI.update(modal.id, payload);
        showToast('Code promo mis à jour !');
      }
      setModal(null);
      load();
    } catch (e) {
      showToast(e?.response?.data?.message || 'Erreur lors de la sauvegarde', false);
    } finally { setSaving(false); }
  };

  const handleToggle = async (p) => {
    try {
      await promosAPI.toggle(p.id);
      setPromos(prev => prev.map(x => x.id === p.id ? { ...x, actif: !x.actif } : x));
    } catch { showToast('Erreur activation', false); }
  };

  const handleDelete = async (p) => {
    if (!confirm(`Supprimer le code « ${p.code} » ?`)) return;
    try {
      await promosAPI.remove(p.id);
      setPromos(prev => prev.filter(x => x.id !== p.id));
      showToast('Code supprimé');
    } catch { showToast('Erreur suppression', false); }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const now = new Date();
  const totalUses = promos.reduce((s, p) => s + (p.usedCount || 0), 0);
  const actifCount = promos.filter(p => p.actif).length;

  const isExpired = (p) => p.expiresAt && new Date(p.expiresAt) < now;
  const statusOf = (p) => {
    if (!p.actif) return { label: 'Inactif', color: '#9CA3AF', bg: '#FFF5E6', banner: false };
    if (isExpired(p)) return { label: 'Expiré', color: '#DC2626', bg: '#FEF2F2', banner: false };
    if (p.maxUses != null && p.usedCount >= p.maxUses) return { label: 'Épuisé', color: '#EA580C', bg: '#FFF7ED', banner: false };
    return { label: 'Actif ⚡', color: '#059669', bg: '#F0FDF4', banner: true };
  };

  return (
    <div className="space-y-5">
      {toast.msg && (
        <div className={`fixed bottom-4 right-4 z-50 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-xl ${toast.ok ? 'bg-[#059669]' : 'bg-red-600'}`}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-[#1A0C00] flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#EA580C]" /> Codes promos & Réductions
          </h3>
          <p className="text-xs text-[#8B6E50] mt-0.5">Créez des codes à partager avec vos clients · Les prix promo s'activent directement sur chaque article du menu</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-2xl bg-[#EA580C] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#C2410C] transition">
          <Plus className="w-4 h-4" /> Nouveau code promo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Codes créés', value: promos.length, icon: Tag, bg: '#FFF0DF', color: '#EA580C' },
          { label: 'Codes actifs', value: actifCount, icon: CheckCircle, bg: '#F0FDF4', color: '#059669' },
          { label: 'Total utilisations', value: totalUses, icon: TrendingUp, bg: '#EFF6FF', color: '#2563EB' },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="rounded-2xl bg-white border border-[#E2E8F0] px-4 py-4 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-extrabold text-[#1A0C00] leading-none">{value}</p>
              <p className="text-[10px] text-[#8B6E50] mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-[#EA580C] border-t-transparent animate-spin" />
          </div>
        ) : promos.length === 0 ? (
          <div className="text-center py-14">
            <Tag className="w-10 h-10 text-[#E2E8F0] mx-auto mb-3" />
            <p className="font-semibold text-[#334155]">Aucun code promo</p>
            <p className="text-xs text-[#8B6E50] mt-1">Créez votre premier code et partagez-le avec vos clients</p>
            <button onClick={openCreate} className="mt-4 rounded-xl bg-[#EA580C] px-4 py-2 text-xs font-bold text-white hover:bg-[#C2410C] transition">
              + Créer un code
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F9F9FC] border-b border-[#E2E8F0]">
                <tr>
                  {['Code', 'Type', 'Réduction', 'Min commande', 'Utilisations', 'Expire le', 'Visibilité', 'Statut', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-[#8B6E50] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FFF5E6]">
                {promos.map(p => {
                  const st = statusOf(p);
                  const typeInfo = PROMO_TYPES.find(t => t.value === p.type);
                  return (
                    <tr key={p.id} className="hover:bg-[#FAFAFA] transition">
                      {/* Code */}
                      <td className="px-4 py-3">
                        <button onClick={() => copyCode(p.code)}
                          className="flex items-center gap-1.5 rounded-lg bg-[#FFF5E6] px-2.5 py-1 font-mono text-xs font-bold text-[#1A0C00] hover:bg-[#E2E8F0] transition">
                          {p.code}
                          <Copy className="w-3 h-3 text-[#8B6E50]" />
                          {copied === p.code && <span className="text-[#059669] font-normal">Copié !</span>}
                        </button>
                      </td>
                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: typeInfo?.bg, color: typeInfo?.color }}>
                          {typeInfo?.label}
                        </span>
                      </td>
                      {/* Valeur */}
                      <td className="px-4 py-3">
                        <span className="font-bold text-[#EA580C]">
                          {p.type === 'PERCENT' ? `-${p.valeur}%` : `-${Number(p.valeur).toLocaleString('fr-FR')} FCFA`}
                        </span>
                      </td>
                      {/* Min montant */}
                      <td className="px-4 py-3 text-[#475569]">
                        {p.minMontant > 0 ? `${Number(p.minMontant).toLocaleString('fr-FR')} FCFA` : <span className="text-[#9CA3AF]">Aucun</span>}
                      </td>
                      {/* Utilisations */}
                      <td className="px-4 py-3 text-[#475569]">
                        {p.usedCount}{p.maxUses != null ? ` / ${p.maxUses}` : ''}
                      </td>
                      {/* Expire */}
                      <td className="px-4 py-3 text-[#475569] whitespace-nowrap">
                        {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString('fr-FR') : <span className="text-[#9CA3AF]">Illimitée</span>}
                      </td>
                      {/* Visibilité */}
                      <td className="px-4 py-3">
                        {(() => {
                          const opt = VISIBILITE_OPTIONS.find(o => o.value === (p.visibilite || 'TOUS')) || VISIBILITE_OPTIONS[0];
                          return (
                            <span className="rounded-full px-2.5 py-1 text-[10px] font-bold whitespace-nowrap" style={{ background: opt.bg, color: opt.color }}>
                              {opt.label}
                            </span>
                          );
                        })()}
                      </td>
                      {/* Statut */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                          {st.banner && (
                            <span className="rounded-full px-2 py-0.5 text-[9px] font-bold bg-[#EA580C] text-[#E07A2D]">Visible dans menu</span>
                          )}
                        </div>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleToggle(p)} title={p.actif ? 'Désactiver' : 'Activer'}
                            className="p-1.5 rounded-lg hover:bg-[#FFF5E6] transition">
                            {p.actif
                              ? <ToggleRight className="w-4 h-4 text-[#059669]" />
                              : <ToggleLeft className="w-4 h-4 text-[#9CA3AF]" />}
                          </button>
                          <button onClick={() => openEdit(p)} title="Modifier"
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(p)} title="Supprimer"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 flex gap-3">
        <div className="w-8 h-8 rounded-xl bg-[#FFF0DF] flex items-center justify-center flex-shrink-0">
          <Percent className="w-4 h-4 text-[#EA580C]" />
        </div>
        <div>
          <p className="text-sm font-bold text-[#1A0C00]">Comment ça marche ?</p>
          <ul className="mt-1 text-xs text-[#8B6E50] space-y-0.5 list-disc ml-4">
            <li><strong>Code promo</strong> : le client saisit le code au checkout — la réduction est déduite automatiquement du total.</li>
            <li><strong>Prix promo sur un article</strong> : activez un « Prix promo » directement sur l'article depuis l'onglet Menu — le badge PROMO s'affiche sur la carte.</li>
            <li>Les codes à durée limitée expirent automatiquement à la date choisie.</li>
            <li>Les codes épuisés (max utilisations atteint) sont bloqués automatiquement.</li>
          </ul>
        </div>
      </div>

      {/* Modal créer/modifier */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-[#EA580C] px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-extrabold flex items-center gap-2">
                <Tag className="w-4 h-4" /> {modal === 'create' ? 'Nouveau code promo' : `Modifier "${modal.code}"`}
              </h3>
              <button onClick={() => setModal(null)} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">

              {/* Code */}
              <div>
                <label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Code *</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                  placeholder="Ex: RESTO10, BIENVENUE, NOEL2025"
                  maxLength={30}
                  className="mt-1 w-full rounded-xl border border-[#E2E8F0] bg-[#F9F9FC] px-3 py-2.5 font-mono font-bold text-sm text-[#1A0C00] uppercase tracking-widest focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] outline-none transition" />
              </div>

              {/* Type */}
              <div>
                <label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Type de réduction *</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {PROMO_TYPES.map(t => (
                    <button key={t.value} onClick={() => setForm(f => ({ ...f, type: t.value }))}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition text-center ${form.type === t.value ? 'border-[#EA580C] bg-[#FFF0DF] text-[#EA580C]' : 'border-[#E2E8F0] bg-[#F9F9FC] text-[#8B6E50] hover:border-[#EA580C]'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Valeur */}
              <div>
                <label className="text-xs font-bold text-[#475569] uppercase tracking-wide">
                  {form.type === 'PERCENT' ? 'Pourcentage (%) *' : 'Montant (FCFA) *'}
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input type="number" min="0" value={form.valeur} onChange={e => setForm(f => ({ ...f, valeur: e.target.value }))}
                    placeholder={form.type === 'PERCENT' ? 'Ex: 10' : 'Ex: 5000'}
                    className="flex-1 rounded-xl border border-[#E2E8F0] bg-[#F9F9FC] px-3 py-2.5 text-sm text-[#1A0C00] focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] outline-none transition" />
                  <span className="text-sm font-bold text-[#8B6E50]">{form.type === 'PERCENT' ? '%' : 'FCFA'}</span>
                </div>
              </div>

              {/* Titre du bandeau — visible par les clients */}
              <div>
                <label className="text-xs font-bold text-[#475569] uppercase tracking-wide">
                  ⚡ Titre du bandeau (visible par vos clients)
                </label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Ex: Livraison offerte ce weekend, -20% sur tous les plats…"
                  className="mt-1 w-full rounded-xl border border-[#E2E8F0] bg-[#F9F9FC] px-3 py-2.5 text-sm text-[#1A0C00] focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] outline-none transition" />
                <p className="mt-1 text-[10px] text-[#9CA3AF]">Ce texte s'affiche comme titre du bandeau ⚡ Offre Limitée dans votre menu client</p>
              </div>

              {/* Aperçu bandeau */}
              {(form.description || form.code || form.valeur) && (
                <div className="rounded-xl overflow-hidden border border-[#E2E8F0]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] px-3 py-2 bg-[#F9F9FC] border-b border-[#E2E8F0]">
                    Aperçu bandeau client
                  </p>
                  <div className="p-3 bg-[#EA580C] flex gap-3 items-center">
                    <div className="flex-1 min-w-0">
                      <span className="inline-block bg-red-500 text-white text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded mb-1.5">⚡ OFFRE LIMITÉE</span>
                      <p className="text-white font-bold text-sm leading-tight truncate">
                        {form.description || (form.type === 'PERCENT' ? `${form.valeur || 'X'}% de réduction` : `${Number(form.valeur || 0).toLocaleString('fr-FR')} FCFA de remise`)}
                      </p>
                      {form.minMontant > 0 && <p className="text-white/50 text-[10px] mt-0.5">Dès {Number(form.minMontant).toLocaleString('fr-FR')} FCFA d'achat</p>}
                    </div>
                    <div className="bg-[#EA580C]/20 border border-[#EA580C]/30 rounded-lg px-3 py-2 text-center flex-shrink-0">
                      <p className="text-[#E07A2D] font-black text-base leading-none">
                        {form.type === 'PERCENT' ? `-${form.valeur || 'X'}%` : `-${Number(form.valeur || 0).toLocaleString('fr-FR')}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Min montant + max uses */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Montant min (FCFA)</label>
                  <input type="number" min="0" value={form.minMontant} onChange={e => setForm(f => ({ ...f, minMontant: e.target.value }))}
                    placeholder="0 = aucun"
                    className="mt-1 w-full rounded-xl border border-[#E2E8F0] bg-[#F9F9FC] px-3 py-2.5 text-sm text-[#1A0C00] focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] outline-none transition" />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Max utilisations</label>
                  <input type="number" min="1" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                    placeholder="Illimité"
                    className="mt-1 w-full rounded-xl border border-[#E2E8F0] bg-[#F9F9FC] px-3 py-2.5 text-sm text-[#1A0C00] focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] outline-none transition" />
                </div>
              </div>

              {/* Expiration */}
              <div>
                <label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Date d'expiration</label>
                <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                  min={new Date().toISOString().slice(0, 10)}
                  className="mt-1 w-full rounded-xl border border-[#E2E8F0] bg-[#F9F9FC] px-3 py-2.5 text-sm text-[#1A0C00] focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] outline-none transition" />
                <p className="mt-1 text-[10px] text-[#9CA3AF]">Laissez vide pour un code sans expiration</p>
              </div>

              {/* Actif */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.actif} onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))}
                  className="h-4 w-4 rounded" style={{ accentColor: '#EA580C' }} />
                <span className="text-sm font-semibold text-[#1A0C00]">Code actif dès la création</span>
              </label>

              {/* Visibilité */}
              <div>
                <label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Qui peut voir ce code ?</label>
                <div className="mt-1.5 flex flex-col gap-2">
                  {VISIBILITE_OPTIONS.map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm(f => ({ ...f, visibilite: opt.value }))}
                      className={`rounded-xl border px-3 py-2.5 text-left transition flex items-start gap-3 ${form.visibilite === opt.value ? 'border-[#EA580C] bg-[#FFF0DF]' : 'border-[#E2E8F0] bg-[#F9F9FC] hover:border-[#EA580C]'}`}>
                      <div className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0" style={{ background: opt.color, boxShadow: form.visibilite === opt.value ? `0 0 0 3px ${opt.color}22` : 'none' }} />
                      <div>
                        <p className="text-xs font-bold" style={{ color: form.visibilite === opt.value ? '#EA580C' : '#1A0C00' }}>{opt.label}</p>
                        <p className="text-[10px] text-[#8B6E50] mt-0.5">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleSave} disabled={saving}
                className="w-full rounded-xl bg-[#EA580C] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#C2410C] disabled:opacity-60 transition flex items-center justify-center gap-2">
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {saving ? 'Enregistrement…' : modal === 'create' ? 'Créer le code' : 'Enregistrer les modifications'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════ Module Paramètres — Équipe et configuration ══════════════════ */
