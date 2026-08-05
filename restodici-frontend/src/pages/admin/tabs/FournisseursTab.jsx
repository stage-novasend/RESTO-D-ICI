/* FournisseursTab — extrait de AdminDashboard */
import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Truck, Pencil, ToggleRight, ToggleLeft, Trash2, X } from 'lucide-react';
import { fournisseursAPI } from '../../../services/api';
import { CI_PHONE_PATTERN, EMAIL_PATTERN, MSG } from '../../../utils/validators';
import { useAdminRevision } from '../../../hooks/useAdminRealtime';
import { ACCENT, card } from '../_colors';

/* ══════════════════ FOURNISSEURS TAB ══════════════════ */
const EMPTY_FOURN = { nom: '', contact: '', telephone: '', email: '', adresse: '', delaiLivraison: '', articlesRef: '', notes: '' };

export default function FournisseursTab() {
  const revision = useAdminRevision();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | { ...fournisseur }
  const [form, setForm] = useState(EMPTY_FOURN);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fournisseursAPI.getAll(); setList(r.data); }
    catch { setList([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, revision]);

  const openCreate = () => { setForm(EMPTY_FOURN); setModal('create'); };
  const openEdit = (f) => { setForm({ ...f, delaiLivraison: f.delaiLivraison ?? '', articlesRef: f.articlesRef ?? '', notes: f.notes ?? '' }); setModal(f); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, delaiLivraison: form.delaiLivraison ? parseInt(form.delaiLivraison) : null };
      if (modal === 'create') await fournisseursAPI.create(payload);
      else await fournisseursAPI.update(modal.id, payload);
      setModal(null); load();
    } catch { /* silently keep modal open */ }
    finally { setSaving(false); }
  };

  const handleToggle = async (f) => {
    await fournisseursAPI.toggle(f.id); load();
  };

  const handleDelete = async (f) => {
    if (!window.confirm(`Supprimer ${f.nom} ?`)) return;
    await fournisseursAPI.remove(f.id); load();
  };

  const filtered = list.filter(f =>
    !search || f.nom?.toLowerCase().includes(search.toLowerCase()) ||
    f.contact?.toLowerCase().includes(search.toLowerCase())
  );

  const Field = ({ label, field, type = 'text', placeholder, pattern, title, inputMode, maxLength, required }) => (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>{label}</label>
      <input
        type={type} value={form[field] ?? ''}
        onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
        placeholder={placeholder}
        pattern={pattern} title={title} inputMode={inputMode} maxLength={maxLength} required={required}
        style={{ width: '100%', border: '1px solid #D1D9E6', borderRadius: 10, padding: '12px 16px', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
      />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>Fournisseurs</h2>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: '2px 0 0' }}>{list.length} fournisseur{list.length !== 1 ? 's' : ''} enregistré{list.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#94A3B8' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              style={{ border: '1px solid #D1D9E6', borderRadius: 9, padding: '8px 12px 8px 32px', fontSize: 13, outline: 'none', width: 200 }}
            />
          </div>
          <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 7, background: ACCENT, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus style={{ width: 14, height: 14 }} /> Ajouter
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={card}>
        {loading && filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
            <Truck style={{ width: 32, height: 32, marginBottom: 8, opacity: 0.4 }} />
            <p style={{ margin: 0 }}>Aucun fournisseur pour l'instant</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full"><table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Fournisseur', 'Contact', 'Téléphone', 'Email', 'Délai (j)', 'Statut', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#64748B', textAlign: 'left', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0 }}>{f.nom}</p>
                    {f.adresse && <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>{f.adresse}</p>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>{f.contact || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>{f.telephone || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>{f.email || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', textAlign: 'center' }}>{f.delaiLivraison ?? '—'}</td>
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
                      <button onClick={() => handleToggle(f)} title={f.actif ? 'Désactiver' : 'Activer'} style={{ border: '1px solid #D1D9E6', borderRadius: 7, padding: '5px 8px', background: f.actif ? '#FEF3C7' : '#D1FAE5', cursor: 'pointer', color: f.actif ? '#92400E' : '#065F46', display: 'flex', alignItems: 'center' }}>
                        {f.actif ? <ToggleRight style={{ width: 13, height: 13 }} /> : <ToggleLeft style={{ width: 13, height: 13 }} />}
                      </button>
                      <button onClick={() => handleDelete(f)} title="Supprimer" style={{ border: '1px solid #FEE2E2', borderRadius: 7, padding: '5px 8px', background: '#FFF5F5', cursor: 'pointer', color: '#FF3A03', display: 'flex', alignItems: 'center' }}>
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

      {/* Modal create/edit */}
      {modal !== null && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(2px)' }}>
          <div onClick={e => e.stopPropagation()} className="fade-up" style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.22)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>{modal === 'create' ? 'Nouveau fournisseur' : `Modifier — ${modal.nom}`}</h3>
              <button onClick={() => setModal(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94A3B8' }}><X style={{ width: 20, height: 20 }} /></button>
            </div>
            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              {Field({ label: 'Nom *', field: 'nom', placeholder: 'SYSCO Abidjan' })}
              {Field({ label: 'Contact', field: 'contact', placeholder: 'Jean Kouassi' })}
              {Field({ label: 'Téléphone', field: 'telephone', type: 'tel', inputMode: 'tel', pattern: CI_PHONE_PATTERN, maxLength: 20, title: MSG.phone, placeholder: '+225 07 00 00 00' })}
              {Field({ label: 'Email', field: 'email', type: 'email', pattern: EMAIL_PATTERN, title: MSG.email, placeholder: 'fournisseur@email.com' })}
              <div style={{ gridColumn: '1 / -1' }}>
                {Field({ label: 'Adresse', field: 'adresse', placeholder: 'Zone Industrielle Vridi, Abidjan' })}
              </div>
              {Field({ label: 'Délai livraison (jours)', field: 'delaiLivraison', type: 'number', placeholder: '3' })}
              {Field({ label: 'Articles de référence', field: 'articlesRef', placeholder: 'Poulet, riz, légumes...' })}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Notes</label>
                <textarea
                  value={form.notes ?? ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Conditions particulières, historique..."
                  rows={4}
                  style={{ width: '100%', border: '1px solid #D1D9E6', borderRadius: 10, padding: '12px 16px', fontSize: 15, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
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
