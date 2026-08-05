/* LivraisonsExtTab — extrait de AdminDashboard */
import { useState, useEffect, useCallback } from 'react';
import { Plus, Truck, Pencil, ToggleRight, ToggleLeft, Trash2, X, Eye, EyeOff } from 'lucide-react';
import { livraisonsExtAPI } from '../../../services/api';
import { URL_PATTERN, MSG } from '../../../utils/validators';
import { useAdminRevision } from '../../../hooks/useAdminRealtime';
import { ACCENT, card } from '../_colors';

/* ══════════════════ LIVRAISONS EXTERNES TAB ══════════════════ */
const TYPE_LIVRAISON = ['YANGO', 'GOZEM', 'KOOLI', 'JUMIA_FOOD', 'CUSTOM'];
const EMPTY_LIV = { nom: '', type: 'CUSTOM', apiUrl: '', rechercheUrl: '', apiKey: '', webhookCallbackUrl: '', fraisLivraisonDefaut: '', createOrderEndpoint: '', trackingEndpoint: '', estimateEndpoint: '', fieldMapping: '', actif: true };

export default function LivraisonsExtTab() {
  const revision = useAdminRevision();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_LIV);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState({});
  const [fmError, setFmError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await livraisonsExtAPI.getFournisseursAdmin(); setList(r.data); }
    catch { setList([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, revision]);

  const openCreate = () => { setForm(EMPTY_LIV); setModal('create'); };
  const openEdit = (f) => { setForm({ ...f, apiKey: '', fraisLivraisonDefaut: f.fraisLivraisonDefaut ?? '', fieldMapping: f.fieldMapping ? JSON.stringify(f.fieldMapping, null, 2) : '' }); setFmError(''); setModal(f); };

  const handleSave = async () => {
    if (!form.nom.trim()) return;
    let parsedMapping = undefined;
    if (form.fieldMapping && form.fieldMapping.trim()) {
      try { parsedMapping = JSON.parse(form.fieldMapping); setFmError(''); }
      catch { setFmError('JSON invalide — vérifiez la syntaxe du mapping.'); return; }
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        fraisLivraisonDefaut: form.fraisLivraisonDefaut ? Number(form.fraisLivraisonDefaut) : undefined,
        fieldMapping: parsedMapping ?? null,
        createOrderEndpoint: form.createOrderEndpoint || null,
        trackingEndpoint: form.trackingEndpoint || null,
        estimateEndpoint: form.estimateEndpoint || null,
      };
      if (!payload.apiKey) delete payload.apiKey;
      if (modal === 'create') await livraisonsExtAPI.createFournisseur(payload);
      else await livraisonsExtAPI.updateFournisseur(modal.id, payload);
      setModal(null); load();
    } catch { /* keep modal open */ }
    finally { setSaving(false); }
  };

  const handleDelete = async (f) => {
    if (!window.confirm(`Supprimer ${f.nom} ?`)) return;
    await livraisonsExtAPI.deleteFournisseur(f.id); load();
  };

  const toggleActive = async (f) => {
    await livraisonsExtAPI.updateFournisseur(f.id, { actif: !f.actif }); load();
  };

  const Field = ({ label, field, type = 'text', placeholder, full, pattern, title, inputMode, maxLength }) => (
    <div style={full ? { gridColumn: '1 / -1' } : {}}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>{label}</label>
      <input
        type={type} value={form[field] ?? ''}
        onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
        placeholder={placeholder}
        pattern={pattern} title={title} inputMode={inputMode} maxLength={maxLength}
        style={{ width: '100%', border: '1px solid #D1D9E6', borderRadius: 10, padding: '12px 16px', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
      />
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>Livraisons externes</h2>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: '2px 0 0' }}>Gestion des fournisseurs de livraison partenaires (Yango, Gozem, Kooli…)</p>
        </div>
        <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 7, background: ACCENT, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus style={{ width: 14, height: 14 }} /> Ajouter
        </button>
      </div>

      <div style={card}>
        {loading && list.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Chargement…</div>
        ) : list.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
            <Truck style={{ width: 36, height: 36, marginBottom: 10, opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Aucun fournisseur de livraison configuré</p>
            <p style={{ margin: '6px 0 0', fontSize: 12 }}>Ajoutez Yango, Gozem, Kooli ou un service custom.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full"><table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Fournisseur', 'Type', 'URL API', 'Frais défaut', 'Statut', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#64748B', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0 }}>{f.nom}</p>
                    {f.webhookCallbackUrl && <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0', fontFamily: 'monospace' }}>{f.webhookCallbackUrl.slice(0, 40)}…</p>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 9px', background: '#FFF5EB', color: '#FF3A03' }}>{f.type}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#475569', fontFamily: 'monospace', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.apiUrl || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>
                    {f.fraisLivraisonDefaut != null ? `${Number(f.fraisLivraisonDefaut).toLocaleString('fr-FR')} FCFA` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 9px', background: f.actif ? '#D1FAE5' : '#FEE2E2', color: f.actif ? '#065F46' : '#991B1B' }}>
                      {f.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(f)} title="Modifier" style={{ border: '1px solid #D1D9E6', borderRadius: 7, padding: '5px 8px', background: '#fff', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center' }}>
                        <Pencil style={{ width: 13, height: 13 }} />
                      </button>
                      <button onClick={() => toggleActive(f)} title={f.actif ? 'Désactiver' : 'Activer'} style={{ border: '1px solid #D1D9E6', borderRadius: 7, padding: '5px 8px', background: f.actif ? '#FEF3C7' : '#D1FAE5', cursor: 'pointer', color: f.actif ? '#92400E' : '#065F46', display: 'flex', alignItems: 'center' }}>
                        {f.actif ? <ToggleRight style={{ width: 13, height: 13 }} /> : <ToggleLeft style={{ width: 13, height: 13 }} />}
                      </button>
                      <button onClick={() => handleDelete(f)} title="Supprimer" style={{ border: '1px solid #FEE2E2', borderRadius: 7, padding: '5px 8px', background: '#FFF5F5', cursor: 'pointer', color: '#DC2626', display: 'flex', alignItems: 'center' }}>
                        <Trash2 style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {modal !== null && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(2px)' }}>
          <div onClick={e => e.stopPropagation()} className="fade-up" style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.22)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>{modal === 'create' ? 'Nouveau fournisseur livraison' : `Modifier — ${modal.nom}`}</h3>
              <button onClick={() => setModal(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94A3B8' }}><X style={{ width: 20, height: 20 }} /></button>
            </div>
            <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              {Field({ label: 'Nom *', field: 'nom', placeholder: 'Yango Livraison' })}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Type *</label>
                <select
                  value={form.type}
                  onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #D1D9E6', borderRadius: 10, padding: '12px 16px', fontSize: 15, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                >
                  {TYPE_LIVRAISON.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {Field({ label: 'URL API dispatch', field: 'apiUrl', type: 'url', inputMode: 'url', pattern: URL_PATTERN, title: MSG.url, placeholder: 'https://api.yango.com/v1', full: true })}
              {Field({ label: 'URL recherche livreurs', field: 'rechercheUrl', type: 'url', inputMode: 'url', pattern: URL_PATTERN, title: MSG.url, placeholder: 'https://api.dobi.ci/v1/drivers/available (optionnel)', full: true })}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                  Clé API {modal !== 'create' && <span style={{ color: '#94A3B8', fontWeight: 400 }}>(laisser vide pour conserver)</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showKey.apiKey ? 'text' : 'password'}
                    value={form.apiKey ?? ''}
                    onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))}
                    placeholder={modal === 'create' ? 'sk_live_...' : '••••••••'}
                    style={{ width: '100%', border: '1px solid #D1D9E6', borderRadius: 10, padding: '12px 40px 12px 16px', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(p => ({ ...p, apiKey: !p.apiKey }))}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center' }}
                  >
                    {showKey.apiKey ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
              </div>
              {Field({ label: 'URL callback webhook', field: 'webhookCallbackUrl', type: 'url', inputMode: 'url', pattern: URL_PATTERN, title: MSG.url, placeholder: 'https://restodici.ci/livraisons-externes/webhook/...', full: true })}

              {/* ── Endpoints plug-and-play ── */}
              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #F1F5F9', paddingTop: 16, marginTop: 4 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Configuration avancée (plug-and-play)</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>Endpoint création <span style={{ color: '#94A3B8', fontWeight: 400 }}>(/orders)</span></label>
                    <input type="text" value={form.createOrderEndpoint ?? ''} onChange={e => setForm(p => ({ ...p, createOrderEndpoint: e.target.value }))} placeholder="/orders" style={{ width: '100%', border: '1px solid #D1D9E6', borderRadius: 9, padding: '10px 14px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>Endpoint suivi <span style={{ color: '#94A3B8', fontWeight: 400 }}>({'{id}'})</span></label>
                    <input type="text" value={form.trackingEndpoint ?? ''} onChange={e => setForm(p => ({ ...p, trackingEndpoint: e.target.value }))} placeholder="/orders/{id}" style={{ width: '100%', border: '1px solid #D1D9E6', borderRadius: 9, padding: '10px 14px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>Endpoint estimation</label>
                    <input type="text" value={form.estimateEndpoint ?? ''} onChange={e => setForm(p => ({ ...p, estimateEndpoint: e.target.value }))} placeholder="/quote" style={{ width: '100%', border: '1px solid #D1D9E6', borderRadius: 9, padding: '10px 14px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }} />
                  </div>
                </div>
              </div>

              {/* ── Field Mapping JSON ── */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>
                  Mapping des champs <span style={{ color: '#94A3B8', fontWeight: 400 }}>— JSON (nos noms → noms du provider)</span>
                </label>
                <textarea
                  value={form.fieldMapping ?? ''}
                  onChange={e => { setForm(p => ({ ...p, fieldMapping: e.target.value })); setFmError(''); }}
                  placeholder={'{\n  "deliveryAddress": "drop_address",\n  "pickupAddress": "pickup_address",\n  "clientNom": "customer.name",\n  "clientTelephone": "customer.phone",\n  "montantTotal": "order_value"\n}'}
                  rows={6}
                  style={{ width: '100%', border: `1px solid ${fmError ? '#EF4444' : '#D1D9E6'}`, borderRadius: 9, padding: '12px 14px', fontSize: 12, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6 }}
                />
                {fmError && <p style={{ fontSize: 11, color: '#EF4444', margin: '4px 0 0' }}>{fmError}</p>}
                <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0' }}>Clés RESTODICI : livraisonId, commandeId, deliveryAddress, pickupAddress, clientNom, clientTelephone, montantTotal. Notation pointée supportée : <code>customer.name</code></p>
              </div>

              {Field({ label: 'Frais par défaut (FCFA)', field: 'fraisLivraisonDefaut', type: 'number', placeholder: '1500' })}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 8 }}>
                <input
                  type="checkbox"
                  id="livActif"
                  checked={form.actif ?? true}
                  onChange={e => setForm(p => ({ ...p, actif: e.target.checked }))}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <label htmlFor="livActif" style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>Actif</label>
              </div>
            </div>
            <div style={{ padding: '16px 28px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setModal(null)} style={{ border: '1px solid #D1D9E6', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 600, background: '#fff', cursor: 'pointer', color: '#64748B' }}>Annuler</button>
              <button onClick={handleSave} disabled={saving || !form.nom} style={{ border: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 700, background: ACCENT, color: '#fff', cursor: 'pointer', opacity: saving || !form.nom ? 0.6 : 1 }}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
