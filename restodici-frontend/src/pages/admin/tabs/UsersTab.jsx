/* UsersTab — extrait de AdminDashboard */
import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, ChevronDown, Plus, UserCheck, Users, Pencil, ToggleRight, ToggleLeft, Trash2, X } from 'lucide-react';
import { adminAPI } from '../../../services/api';
import { EMAIL_PATTERN, CI_PHONE_PATTERN, MSG, extractErrorMessage } from '../../../utils/validators';
import { useAdminRevision } from '../../../hooks/useAdminRealtime';
import { ROLES, inputStyle, labelStyle, card } from '../_colors';
import { SectionHeader, RoleBadge, ConfirmDeleteModal } from '../_shared';

export default function UsersTab() {
  const revision = useAdminRevision();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', password: '', role: 'CLIENT', telephone: '', restaurantId: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [activating, setActivating] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (roleFilter) params.role = roleFilter;
      if (search) params.search = search;
      const r = await adminAPI.getUsers(params);
      // Réponse paginée { items, total, page, limit, totalPages }
      setUsers(r.data.items ?? r.data);
      setMeta({ total: r.data.total ?? (r.data.items ?? r.data).length, totalPages: r.data.totalPages ?? 1 });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [roleFilter, search, page]);

  // Retour à la page 1 quand on change de filtre/recherche.
  useEffect(() => { setPage(1); }, [roleFilter, search]);
  useEffect(() => { load(); }, [load, revision]);

  const toggle = async (id) => { try { await adminAPI.toggleUser(id); load(); } catch { /* ignore */ } };

  const activerTous = async () => {
    if (!window.confirm('Activer tous les comptes (actif + email vérifié) ?')) return;
    setActivating(true);
    try {
      const r = await adminAPI.activerTousUsers();
      alert(`${r.data.updated} compte(s) activé(s).`);
      load();
    } catch { alert('Erreur lors de l\'activation.'); }
    finally { setActivating(false); }
  };

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({ nom: u.nom || '', prenom: u.prenom || '', email: u.email || '', role: u.role || 'CLIENT', telephone: u.telephone || '', restaurantId: u.restaurantId || u.restaurant?.id || '' });
    setEditError('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await adminAPI.createUser(form);
      setShowModal(false);
      setForm({ nom: '', prenom: '', email: '', password: '', role: 'CLIENT', telephone: '', restaurantId: '' });
      load();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Erreur lors de la création');
    } finally { setSaving(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSaving(true);
    try {
      await adminAPI.updateUser(editUser.id, editForm);
      setEditUser(null);
      load();
    } catch (err) {
      setEditError(err?.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally { setEditSaving(false); }
  };

  return (
    <div>
      <SectionHeader title="Gestion des utilisateurs" onRefresh={load} loading={loading} />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#94A3B8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher nom, email…" style={{ ...inputStyle, paddingLeft: 32 }} />
        </div>
        <div style={{ position: 'relative' }}>
          <Filter style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#94A3B8' }} />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ paddingLeft: 28, paddingRight: 28, paddingTop: 12, paddingBottom: 12, border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 15, outline: 'none', background: '#fff', appearance: 'none', cursor: 'pointer' }}>
            <option value="">Tous les rôles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <ChevronDown style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#94A3B8', pointerEvents: 'none' }} />
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: '#0F172A', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
          <Plus style={{ width: 14, height: 14 }} /> Créer
        </button>
        <button onClick={activerTous} disabled={activating} style={{ background: '#10B981', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: activating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, opacity: activating ? 0.7 : 1 }}>
          <UserCheck style={{ width: 14, height: 14 }} /> {activating ? 'Activation…' : 'Tout activer'}
        </button>
      </div>

      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <div className="overflow-x-auto w-full"><table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Nom', 'Email', 'Rôle', 'Restaurant', 'Statut', 'Créé le', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748B', textAlign: 'left', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>Chargement…</td></tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', textAlign: 'center', background: '#F8FAFC', borderRadius: 0 }}>
                      <Users style={{ width: 48, height: 48, marginBottom: 12, color: '#94A3B8', opacity: 0.4 }} />
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Aucun utilisateur trouvé</p>
                      <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Essayez de modifier les filtres ou créez un premier compte.</p>
                    </div>
                  </td>
                </tr>
              ) : users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #E2E8F0' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{[u.prenom, u.nom].filter(Boolean).join(' ') || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569' }}>{u.email}</td>
                  <td style={{ padding: '10px 14px' }}><RoleBadge role={u.role} /></td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>{u.restaurant?.nom || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: u.actif ? '#DCFCE7' : '#F1F5F9', color: u.actif ? '#166534' : '#475569', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                      {u.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: '#94A3B8' }}>
                    {new Date(u.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => openEdit(u)} title="Modifier" style={{ background: '#F1F5F9', border: 'none', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center' }}>
                        <Pencil style={{ width: 14, height: 14 }} />
                      </button>
                      <button onClick={() => toggle(u.id)} title={u.actif ? 'Désactiver' : 'Activer'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: u.actif ? '#64748B' : '#16A34A' }}>
                        {u.actif ? <ToggleRight style={{ width: 20, height: 20 }} /> : <ToggleLeft style={{ width: 20, height: 20 }} />}
                      </button>
                      <button onClick={() => setDeleteTarget({ type: 'user', item: u })} title="Supprimer définitivement" style={{ background: '#FEE2E2', border: 'none', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', color: '#DC2626', display: 'flex', alignItems: 'center' }}>
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
      {/* Pagination */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>
          {meta.total} utilisateur{meta.total !== 1 ? 's' : ''} · page {page}/{meta.totalPages}
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, color: '#475569', opacity: page <= 1 ? 0.5 : 1 }}
          >
            Précédent
          </button>
          <button
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page >= meta.totalPages}
            style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: page >= meta.totalPages ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, color: '#475569', opacity: page >= meta.totalPages ? 0.5 : 1 }}
          >
            Suivant
          </button>
        </div>
      </div>

      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)', zIndex: 199 }} />
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, pointerEvents: 'none' }}>
            <div className="fade-up" style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.2)', pointerEvents: 'auto' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Créer un utilisateur</h3>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X style={{ width: 18, height: 18 }} /></button>
              </div>
              <form onSubmit={handleCreate} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label style={labelStyle}>Nom *</label><input required value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} style={inputStyle} placeholder="Diallo" /></div>
                  <div><label style={labelStyle}>Prénom</label><input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} style={inputStyle} placeholder="Moussa" /></div>
                </div>
                <div><label style={labelStyle}>Email *</label><input required type="email" pattern={EMAIL_PATTERN} title={MSG.email} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Mot de passe * (min. 8)</label><input required type="password" minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} style={inputStyle} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label style={labelStyle}>Rôle *</label><select required value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                  <div><label style={labelStyle}>Téléphone</label><input type="tel" inputMode="tel" pattern={CI_PHONE_PATTERN} maxLength={20} title={MSG.phone} value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} style={inputStyle} placeholder="+225 07 00 00 00 00" /></div>
                </div>
                {(form.role === 'GERANT' || form.role === 'STAFF') && (
                  <div><label style={labelStyle}>ID Restaurant</label><input value={form.restaurantId} onChange={e => setForm(f => ({ ...f, restaurantId: e.target.value }))} style={inputStyle} placeholder="UUID" /></div>
                )}
                {formError && <p style={{ color: '#E11D48', fontSize: 12, margin: 0 }}>{formError}</p>}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: 10, border: '1px solid #E2E8F0', borderRadius: 10, cursor: 'pointer', fontWeight: 600, color: '#475569', background: '#fff' }}>Annuler</button>
                  <button type="submit" disabled={saving} style={{ flex: 1, padding: 10, border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, color: '#fff', background: '#0F172A', opacity: saving ? 0.7 : 1 }}>{saving ? 'Création…' : 'Créer'}</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {editUser && (
        <>
          <div onClick={() => setEditUser(null)} className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)', zIndex: 199 }} />
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, pointerEvents: 'none' }}>
            <div className="fade-up" style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.2)', pointerEvents: 'auto' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Modifier l'utilisateur</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94A3B8' }}>{editUser.email}</p>
                </div>
                <button onClick={() => setEditUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X style={{ width: 18, height: 18 }} /></button>
              </div>
              <form onSubmit={handleUpdate} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label style={labelStyle}>Nom *</label><input required value={editForm.nom} onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Prénom</label><input value={editForm.prenom} onChange={e => setEditForm(f => ({ ...f, prenom: e.target.value }))} style={inputStyle} /></div>
                </div>
                <div><label style={labelStyle}>Email *</label><input required type="email" pattern={EMAIL_PATTERN} title={MSG.email} value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Rôle *</label>
                    <select required value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Téléphone</label><input type="tel" inputMode="tel" pattern={CI_PHONE_PATTERN} maxLength={20} title={MSG.phone} value={editForm.telephone} onChange={e => setEditForm(f => ({ ...f, telephone: e.target.value }))} style={inputStyle} /></div>
                </div>
                {(editForm.role === 'GERANT' || editForm.role === 'STAFF') && (
                  <div><label style={labelStyle}>ID Restaurant</label><input value={editForm.restaurantId} onChange={e => setEditForm(f => ({ ...f, restaurantId: e.target.value }))} style={inputStyle} placeholder="UUID du restaurant" /></div>
                )}
                {editError && <p style={{ color: '#E11D48', fontSize: 12, margin: 0 }}>{editError}</p>}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button type="button" onClick={() => setEditUser(null)} style={{ flex: 1, padding: 10, border: '1px solid #E2E8F0', borderRadius: 10, cursor: 'pointer', fontWeight: 600, color: '#475569', background: '#fff' }}>Annuler</button>
                  <button type="submit" disabled={editSaving} style={{ flex: 1, padding: 10, border: 'none', borderRadius: 10, cursor: editSaving ? 'not-allowed' : 'pointer', fontWeight: 700, color: '#fff', background: '#0F172A', opacity: editSaving ? 0.7 : 1 }}>
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
              await adminAPI.deleteUser(deleteTarget.item.id);
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
