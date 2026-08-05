/* RestaurantsTab — extrait de AdminDashboard */
import { useState, useEffect, useCallback } from 'react';
import { Plus, UtensilsCrossed, Pencil, ToggleRight, ToggleLeft, Trash2, X } from 'lucide-react';
import { adminAPI } from '../../../services/api';
import { EMAIL_PATTERN, CI_PHONE_PATTERN, MSG, extractErrorMessage } from '../../../utils/validators';
import { useAdminRevision } from '../../../hooks/useAdminRealtime';
import { ACCENT, inputStyle, labelStyle, card } from '../_colors';
import { SectionHeader, ConfirmDeleteModal } from '../_shared';

export default function RestaurantsTab() {
  const revision = useAdminRevision();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nom: '', telephone: '', adresse: '', email: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [editResto, setEditResto] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await adminAPI.getRestaurants(); setRestaurants(r.data); } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, revision]);

  const toggle = async (id) => { try { await adminAPI.toggleRestaurant(id); load(); } catch { /* ignore */ } };

  const openEdit = (r) => {
    setEditResto(r);
    setEditForm({ nom: r.nom || '', telephone: r.telephone || '', adresse: r.adresse || '', email: r.email || '' });
    setEditError('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await adminAPI.createRestaurant(form); setShowModal(false); setForm({ nom: '', telephone: '', adresse: '', email: '', description: '' }); load(); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSaving(true);
    try {
      await adminAPI.updateRestaurant(editResto.id, editForm);
      setEditResto(null);
      load();
    } catch (err) {
      setEditError(err?.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally { setEditSaving(false); }
  };

  return (
    <div>
      <SectionHeader title="Gestion des restaurants" onRefresh={load} loading={loading} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setShowModal(true)} style={{ background: '#0F172A', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
          <Plus style={{ width: 14, height: 14 }} /> Nouveau restaurant
        </button>
      </div>
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <div className="overflow-x-auto w-full"><table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Nom', 'Adresse', 'Téléphone', 'Membres', 'Note', 'Statut', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748B', textAlign: 'left', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && restaurants.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>Chargement…</td></tr>
              ) : restaurants.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', textAlign: 'center', background: '#FFF5ED' }}>
                      <UtensilsCrossed style={{ width: 48, height: 48, marginBottom: 12, color: '#973100', opacity: 0.4 }} />
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Aucun restaurant enregistré</p>
                      <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Les restaurants créés sur la plateforme apparaîtront ici.</p>
                    </div>
                  </td>
                </tr>
              ) : restaurants.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #E2E8F0' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F9F9FC'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{r.nom}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.adresse}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569' }}>{r.telephone}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569' }}>{r.users?.length ?? 0}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontWeight: 700, color: Number(r.noteMoyenne || 0) >= 4 ? '#16A34A' : Number(r.noteMoyenne || 0) >= 3 ? '#D97706' : '#FF3A03' }}>
                          {Number(r.noteMoyenne || 0).toFixed(1)}
                        </span>
                        <span style={{ color: '#F59E0B', fontSize: 13, letterSpacing: 1 }}>
                          {'★'.repeat(Math.round(r.noteMoyenne || 0))}{'☆'.repeat(Math.max(0, 5 - Math.round(r.noteMoyenne || 0)))}
                        </span>
                      </div>
                      <span style={{ fontSize: 10, color: '#94A3B8' }}>{r.nbAvis || 0} avis</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}><span style={{ background: r.actif ? '#DCFCE7' : '#FEE2E2', color: r.actif ? '#166534' : '#991B1B', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{r.actif ? 'Actif' : 'Inactif'}</span></td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => openEdit(r)} title="Modifier" style={{ background: 'rgba(234,60,12,0.10)', border: 'none', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', color: ACCENT, display: 'flex', alignItems: 'center' }}>
                        <Pencil style={{ width: 14, height: 14 }} />
                      </button>
                      <button onClick={() => toggle(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: r.actif ? '#FF3A03' : '#16A34A' }}>
                        {r.actif ? <ToggleRight style={{ width: 20, height: 20 }} /> : <ToggleLeft style={{ width: 20, height: 20 }} />}
                      </button>
                      <button onClick={() => setDeleteTarget({ type: 'restaurant', item: r })} title="Supprimer définitivement" style={{ background: '#FEE2E2', border: 'none', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', color: '#DC2626', display: 'flex', alignItems: 'center' }}>
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </div>
      <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>{restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''}</p>

      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)', zIndex: 199 }} />
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, pointerEvents: 'none' }}>
            <div className="fade-up" style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.2)', pointerEvents: 'auto' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Nouveau restaurant</h3>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X style={{ width: 18, height: 18 }} /></button>
              </div>
              <form onSubmit={handleCreate} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div><label style={labelStyle}>Nom *</label><input required value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} style={inputStyle} placeholder="Le Maquis du Carrefour" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label style={labelStyle}>Téléphone *</label><input required type="tel" inputMode="tel" pattern={CI_PHONE_PATTERN} maxLength={20} title={MSG.phone} value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Email</label><input type="email" pattern={EMAIL_PATTERN} title={MSG.email} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} /></div>
                </div>
                <div><label style={labelStyle}>Adresse *</label><input required value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }} /></div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: 10, border: '1px solid #E2E8F0', borderRadius: 10, cursor: 'pointer', fontWeight: 600, color: '#475569', background: '#fff' }}>Annuler</button>
                  <button type="submit" disabled={saving} style={{ flex: 1, padding: 10, border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, color: '#fff', background: ACCENT, opacity: saving ? 0.7 : 1 }}>{saving ? 'Création…' : 'Créer'}</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {editResto && (
        <>
          <div onClick={() => setEditResto(null)} className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)', zIndex: 199 }} />
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, pointerEvents: 'none' }}>
            <div className="fade-up" style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.2)', pointerEvents: 'auto' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Modifier le restaurant</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94A3B8' }}>{editResto.nom}</p>
                </div>
                <button onClick={() => setEditResto(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X style={{ width: 18, height: 18 }} /></button>
              </div>
              <form onSubmit={handleUpdate} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div><label style={labelStyle}>Nom *</label><input required value={editForm.nom} onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))} style={inputStyle} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label style={labelStyle}>Téléphone *</label><input required type="tel" inputMode="tel" pattern={CI_PHONE_PATTERN} maxLength={20} title={MSG.phone} value={editForm.telephone} onChange={e => setEditForm(f => ({ ...f, telephone: e.target.value }))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Email</label><input type="email" pattern={EMAIL_PATTERN} title={MSG.email} value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} /></div>
                </div>
                <div><label style={labelStyle}>Adresse *</label><input required value={editForm.adresse} onChange={e => setEditForm(f => ({ ...f, adresse: e.target.value }))} style={inputStyle} /></div>
                {editError && <p style={{ color: '#FF3A03', fontSize: 12, margin: 0 }}>{editError}</p>}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button type="button" onClick={() => setEditResto(null)} style={{ flex: 1, padding: 10, border: '1px solid #E2E8F0', borderRadius: 10, cursor: 'pointer', fontWeight: 600, color: '#475569', background: '#fff' }}>Annuler</button>
                  <button type="submit" disabled={editSaving} style={{ flex: 1, padding: 10, border: 'none', borderRadius: 10, cursor: editSaving ? 'not-allowed' : 'pointer', fontWeight: 700, color: '#fff', background: ACCENT, opacity: editSaving ? 0.7 : 1 }}>
                    {editSaving ? 'Sauvegarde…' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          deleting={deleting}
          onConfirm={async () => {
            setDeleting(true);
            try {
              await adminAPI.deleteRestaurant(deleteTarget.item.id);
              setDeleteTarget(null);
              load();
            } catch (err) {
              alert(extractErrorMessage(err, 'Erreur lors de la suppression'));
            } finally { setDeleting(false); }
          }}
        />
      )}
    </div>
  );
}
