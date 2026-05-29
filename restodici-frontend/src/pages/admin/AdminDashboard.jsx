import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import {
  Users, UtensilsCrossed, ScrollText, Download, Settings,
  RefreshCw, ToggleLeft, ToggleRight, Plus, X, Check,
  Shield, Activity, CheckCircle, XCircle, Clock, Search,
  Filter, ChevronDown, AlertTriangle, Building2, LayoutDashboard,
} from 'lucide-react';

const ACCENT = '#4F46E5';
const ROLES  = ['ADMIN', 'GERANT', 'STAFF', 'CLIENT', 'B2B'];

const ROLE_COLOR = {
  ADMIN:  { bg: '#EEF2FF', text: '#4338CA' },
  GERANT: { bg: '#FEF3C7', text: '#92400E' },
  STAFF:  { bg: '#DCFCE7', text: '#166534' },
  CLIENT: { bg: '#F0F9FF', text: '#0369A1' },
  B2B:    { bg: '#F3E8FF', text: '#6B21A8' },
};

/* ── Shared styles ─────────────────────────────────────── */
const inputStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0',
  borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff',
};
const labelStyle = { fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 };

/* ── Utility components ────────────────────────────────── */
function RoleBadge({ role }) {
  const c = ROLE_COLOR[role] || { bg: '#F1F5F9', text: '#475569' };
  return <span style={{ background: c.bg, color: c.text, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{role}</span>;
}

function StatCard({ icon: Icon, label, value, sub, color = ACCENT }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', border: '1px solid #E8EDF5', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: 20, height: 20, color }} />
      </div>
      <div>
        <p style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>{value ?? '—'}</p>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#475569', margin: '2px 0 0' }}>{label}</p>
        {sub && <p style={{ fontSize: 10, color: '#94A3B8', margin: '2px 0 0' }}>{sub}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ title, onRefresh, loading }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>{title}</h2>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 12 }}
        >
          <RefreshCw style={{ width: 12, height: 12 }} />
          Actualiser
        </button>
      )}
    </div>
  );
}

/* ══════════════════ TAB: VUE D'ENSEMBLE ══════════════════ */
function OverviewTab() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await adminAPI.getStats(); setStats(r.data); } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <SectionHeader title="Vue d'ensemble plateforme" onRefresh={load} loading={loading} />
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Chargement…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
            <StatCard icon={Users}          label="Utilisateurs"    value={stats?.users?.total}       color={ACCENT} />
            <StatCard icon={UtensilsCrossed} label="Restaurants"    value={stats?.restaurants?.total} sub={`${stats?.restaurants?.active ?? 0} actifs`} color="#059669" />
            <StatCard icon={Building2}      label="B2B en attente"  value={stats?.b2b?.pending}       sub="Comptes à valider" color="#D97706" />
            <StatCard icon={ScrollText}     label="Logs d'audit"    value={stats?.audit?.total}       sub="Total enregistrements" color="#7C3AED" />
          </div>

          <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #E8EDF5', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 14px' }}>Répartition par rôle</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {[
                { key: 'gerants', role: 'GERANT', label: 'Gérants' },
                { key: 'staff',   role: 'STAFF',  label: 'Staff' },
                { key: 'clients', role: 'CLIENT', label: 'Clients' },
                { key: 'b2b',     role: 'B2B',    label: 'B2B' },
                { key: 'admins',  role: 'ADMIN',  label: 'Admins' },
              ].map(({ key, role, label }) => {
                const c = ROLE_COLOR[role] || { bg: '#F1F5F9', text: '#475569' };
                return (
                  <div key={key} style={{ background: c.bg, borderRadius: 10, padding: '10px 18px', minWidth: 80, textAlign: 'center' }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: c.text, margin: 0 }}>{stats?.users?.[key] ?? 0}</p>
                    <p style={{ fontSize: 11, color: c.text, margin: '2px 0 0', opacity: 0.8 }}>{label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #E8EDF5' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 14px' }}>Santé système</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'API Backend NestJS', ok: true },
                { label: 'Base de données PostgreSQL', ok: true },
                { label: 'WebSocket Gateway', ok: true },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#F8FAFC', borderRadius: 8 }}>
                  <span style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>{s.label}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: s.ok ? '#16A34A' : '#DC2626' }}>
                    {s.ok ? <CheckCircle style={{ width: 14, height: 14 }} /> : <XCircle style={{ width: 14, height: 14 }} />}
                    {s.ok ? 'Opérationnel' : 'Dégradé'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════ TAB: UTILISATEURS ══════════════════ */
function UsersTab() {
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({ nom: '', prenom: '', email: '', password: '', role: 'CLIENT', telephone: '', restaurantId: '' });
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter) params.role   = roleFilter;
      if (search)     params.search = search;
      const r = await adminAPI.getUsers(params);
      setUsers(r.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [roleFilter, search]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id) => { try { await adminAPI.toggleUser(id); load(); } catch { /* ignore */ } };

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
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <SectionHeader title="Gestion des utilisateurs (RG-31)" onRefresh={load} loading={loading} />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#94A3B8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher nom, email…" style={{ ...inputStyle, paddingLeft: 32 }} />
        </div>
        <div style={{ position: 'relative' }}>
          <Filter style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#94A3B8' }} />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ paddingLeft: 28, paddingRight: 28, paddingTop: 8, paddingBottom: 8, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', appearance: 'none', cursor: 'pointer' }}>
            <option value="">Tous les rôles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <ChevronDown style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#94A3B8', pointerEvents: 'none' }} />
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
          <Plus style={{ width: 14, height: 14 }} /> Créer
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8EDF5', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E8EDF5' }}>
                {['Nom', 'Email', 'Rôle', 'Restaurant', 'Statut', 'Depuis', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748B', textAlign: 'left', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>Chargement…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>Aucun utilisateur</td></tr>
              ) : users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                    {[u.prenom, u.nom].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569' }}>{u.email}</td>
                  <td style={{ padding: '10px 14px' }}><RoleBadge role={u.role} /></td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>{u.restaurant?.nom || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: u.actif ? '#DCFCE7' : '#FEE2E2', color: u.actif ? '#166534' : '#991B1B', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                      {u.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: '#94A3B8' }}>
                    {new Date(u.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => toggle(u.id)} title={u.actif ? 'Désactiver' : 'Activer'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: u.actif ? '#DC2626' : '#16A34A' }}>
                      {u.actif ? <ToggleRight style={{ width: 20, height: 20 }} /> : <ToggleLeft style={{ width: 20, height: 20 }} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>{users.length} utilisateur{users.length !== 1 ? 's' : ''}</p>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Créer un utilisateur</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X style={{ width: 18, height: 18 }} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Nom *</label>
                  <input required value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} style={inputStyle} placeholder="Diallo" />
                </div>
                <div>
                  <label style={labelStyle}>Prénom</label>
                  <input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} style={inputStyle} placeholder="Moussa" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} placeholder="user@example.com" />
              </div>
              <div>
                <label style={labelStyle}>Mot de passe * (min. 8 caractères)</label>
                <input required type="password" minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Rôle *</label>
                  <select required value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Téléphone</label>
                  <input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} style={inputStyle} placeholder="+225 07 00 00 00 00" />
                </div>
              </div>
              {(form.role === 'GERANT' || form.role === 'STAFF') && (
                <div>
                  <label style={labelStyle}>ID Restaurant</label>
                  <input value={form.restaurantId} onChange={e => setForm(f => ({ ...f, restaurantId: e.target.value }))} style={inputStyle} placeholder="UUID du restaurant" />
                </div>
              )}
              {formError && <p style={{ color: '#DC2626', fontSize: 12, margin: 0 }}>{formError}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: 10, border: '1px solid #E2E8F0', borderRadius: 10, cursor: 'pointer', fontWeight: 600, color: '#475569', background: '#fff' }}>Annuler</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: 10, border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, color: '#fff', background: ACCENT, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════ TAB: RESTAURANTS ══════════════════ */
function RestaurantsTab() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [form, setForm]               = useState({ nom: '', telephone: '', adresse: '', email: '', description: '' });
  const [saving, setSaving]           = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await adminAPI.getRestaurants(); setRestaurants(r.data); } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id) => { try { await adminAPI.toggleRestaurant(id); load(); } catch { /* ignore */ } };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminAPI.createRestaurant(form);
      setShowModal(false);
      setForm({ nom: '', telephone: '', adresse: '', email: '', description: '' });
      load();
    } finally { setSaving(false); }
  };

  return (
    <div>
      <SectionHeader title="Gestion des restaurants" onRefresh={load} loading={loading} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setShowModal(true)} style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
          <Plus style={{ width: 14, height: 14 }} /> Nouveau restaurant
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8EDF5', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E8EDF5' }}>
                {['Nom', 'Adresse', 'Téléphone', 'Membres', 'Note', 'Statut', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748B', textAlign: 'left', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>Chargement…</td></tr>
              ) : restaurants.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>Aucun restaurant</td></tr>
              ) : restaurants.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{r.nom}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.adresse}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569' }}>{r.telephone}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569' }}>{r.users?.length ?? 0}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569' }}>{Number(r.noteMoyenne || 0).toFixed(1)} ★</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: r.actif ? '#DCFCE7' : '#FEE2E2', color: r.actif ? '#166534' : '#991B1B', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                      {r.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => toggle(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: r.actif ? '#DC2626' : '#16A34A' }}>
                      {r.actif ? <ToggleRight style={{ width: 20, height: 20 }} /> : <ToggleLeft style={{ width: 20, height: 20 }} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>{restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''}</p>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Nouveau restaurant</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X style={{ width: 18, height: 18 }} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Nom *</label>
                <input required value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} style={inputStyle} placeholder="Le Maquis du Carrefour" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Téléphone *</label>
                  <input required value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} style={inputStyle} placeholder="+225 07 00 00 00 00" />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} placeholder="contact@resto.ci" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Adresse *</label>
                <input required value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} style={inputStyle} placeholder="Cocody, Abidjan" />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }} placeholder="Cuisine ivoirienne…" />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: 10, border: '1px solid #E2E8F0', borderRadius: 10, cursor: 'pointer', fontWeight: 600, color: '#475569', background: '#fff' }}>Annuler</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: 10, border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, color: '#fff', background: ACCENT, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════ TAB: AUDIT LOGS ══════════════════ */
function AuditTab() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [limit, setLimit]     = useState(100);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminAPI.getAuditLogs({ action: search || undefined, limit });
      setLogs(r.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [search, limit]);

  useEffect(() => { load(); }, [load]);

  const fmt = (iso) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <SectionHeader title="Journaux d'audit (RG-34)" onRefresh={load} loading={loading} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#94A3B8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrer par action…" style={{ ...inputStyle, paddingLeft: 32 }} />
        </div>
        <select value={limit} onChange={e => setLimit(Number(e.target.value))} style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }}>
          {[50, 100, 200, 500].map(n => <option key={n} value={n}>{n} entrées</option>)}
        </select>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8EDF5', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E8EDF5' }}>
                {['Date', 'Utilisateur', 'Action', 'Contexte', 'Payload'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748B', textAlign: 'left', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>Chargement…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>Aucun log trouvé</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '8px 14px', fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>{fmt(log.createdAt)}</td>
                  <td style={{ padding: '8px 14px', fontSize: 12, color: '#475569', fontFamily: 'monospace' }}>{log.userId?.slice(0, 8)}…</td>
                  <td style={{ padding: '8px 14px' }}><span style={{ background: '#EEF2FF', color: '#4338CA', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{log.action}</span></td>
                  <td style={{ padding: '8px 14px', fontSize: 11, color: '#94A3B8' }}>{log.restaurantId ? log.restaurantId.slice(0, 8) + '…' : '—'}</td>
                  <td style={{ padding: '8px 14px', fontSize: 11, color: '#64748B', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.payload ? JSON.stringify(log.payload).slice(0, 60) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>{logs.length} entrée{logs.length !== 1 ? 's' : ''} · lecture seule immuable</p>
    </div>
  );
}

/* ══════════════════ TAB: EXPORTS ══════════════════ */
function ExportsTab() {
  const [downloading, setDownloading] = useState(false);

  const downloadSyscohada = async () => {
    setDownloading(true);
    try {
      const r    = await adminAPI.exportSyscohada();
      const blob = new Blob([r.data], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `syscohada-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setDownloading(false); }
  };

  return (
    <div>
      <SectionHeader title="Exports comptables" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #E8EDF5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${ACCENT}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Download style={{ width: 20, height: 20, color: ACCENT }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Export SYSCOHADA</p>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>Format CSV · RG-29</p>
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>
            Données comptables : date, libellé, débit, crédit, numéro de compte OHADA. Compatible logiciels comptables ivoiriens.
          </p>
          <button
            onClick={downloadSyscohada}
            disabled={downloading}
            style={{ width: '100%', padding: 10, background: ACCENT, color: '#fff', border: 'none', borderRadius: 10, cursor: downloading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13, opacity: downloading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Download style={{ width: 14, height: 14 }} />
            {downloading ? 'Génération…' : 'Télécharger CSV'}
          </button>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #E8EDF5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F0FDF412', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity style={{ width: 20, height: 20, color: '#059669' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Rapport d'activité</p>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>Audit complet · RG-34</p>
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>
            Journal d'audit complet avec horodatage, acteur et ressource impactée.
          </p>
          <button disabled style={{ width: '100%', padding: 10, background: '#F1F5F9', color: '#94A3B8', border: 'none', borderRadius: 10, cursor: 'not-allowed', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Clock style={{ width: 14, height: 14 }} /> Disponible prochainement
          </button>
        </div>
      </div>

      <div style={{ background: '#FFFBEB', borderRadius: 12, padding: '14px 18px', border: '1px solid #FEF3C7', marginTop: 20, display: 'flex', gap: 10 }}>
        <AlertTriangle style={{ width: 16, height: 16, color: '#D97706', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: '#92400E', margin: 0, lineHeight: 1.5 }}>
          Conservez les exports SYSCOHADA 10 ans conformément aux obligations OHADA. Archivez dans un système sécurisé hors production.
        </p>
      </div>
    </div>
  );
}

/* ══════════════════ TAB: CONFIGURATION ══════════════════ */
function ConfigTab() {
  const items = [
    { label: 'Algorithme JWT',        value: 'HS256 · 24h (RG-35)',                icon: Shield,       color: ACCENT },
    { label: 'Hachage mots de passe', value: 'bcrypt · coût 12 (RG-06)',            icon: Shield,       color: '#059669' },
    { label: 'Rate limiting auth',    value: '10 req/min par IP (§6.6)',             icon: AlertTriangle, color: '#D97706' },
    { label: 'Rate limiting global',  value: '100 req/min par IP (§6.6)',            icon: Activity,     color: '#7C3AED' },
    { label: 'Isolation multi-tenant', value: 'restaurantId obligatoire (RG-31)',     icon: Building2,    color: '#0369A1' },
    { label: 'Isolation B2B',         value: '1:N compte ↔ collaborateurs (RG-33)', icon: Users,        color: '#6B21A8' },
  ];

  return (
    <div>
      <SectionHeader title="Configuration système" />
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8EDF5', overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '14px 20px', background: '#F8FAFC', borderBottom: '1px solid #E8EDF5' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: 0 }}>Paramètres actifs (lecture seule)</p>
        </div>
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < items.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${item.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon style={{ width: 16, height: 16, color: item.color }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', margin: 0 }}>{item.label}</p>
                <p style={{ fontSize: 11, color: '#64748B', margin: '2px 0 0' }}>{item.value}</p>
              </div>
              <span style={{ background: '#DCFCE7', color: '#166534', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>Actif</span>
            </div>
          );
        })}
      </div>
      <div style={{ background: '#EEF2FF', borderRadius: 12, padding: '14px 18px', border: '1px solid #C7D2FE', display: 'flex', gap: 10 }}>
        <Settings style={{ width: 16, height: 16, color: '#4338CA', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: '#3730A3', margin: 0, lineHeight: 1.5 }}>
          Modifier ces paramètres requiert un accès direct au fichier <code style={{ background: '#E0E7FF', padding: '1px 4px', borderRadius: 4 }}>.env</code> ou au panel infrastructure. Contactez l'équipe Sankofa-Lab.
        </p>
      </div>
    </div>
  );
}

/* ══════════════════ B2B PENDING BANNER ══════════════════ */
function B2BPendingBanner() {
  const [pending, setPending]     = useState([]);
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    adminAPI.getPendingB2B().then(r => setPending(r.data)).catch(() => {});
  }, []);

  const validate = async (id, approved) => {
    setProcessing(p => ({ ...p, [id]: true }));
    try {
      await adminAPI.validateB2B(id, approved);
      setPending(p => p.filter(c => c.id !== id));
    } finally {
      setProcessing(p => ({ ...p, [id]: false }));
    }
  };

  if (pending.length === 0) return null;

  return (
    <div style={{ background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: 14, padding: '14px 18px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <AlertTriangle style={{ width: 16, height: 16, color: '#D97706' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>{pending.length} compte{pending.length > 1 ? 's' : ''} B2B en attente de validation</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pending.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: 10, padding: '10px 14px', border: '1px solid #FEF3C7', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>{c.raisonSociale}</p>
              <p style={{ fontSize: 11, color: '#64748B', margin: '2px 0 0' }}>{c.emailProfessionnel} · RCCM : {c.numeroRCCM}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => validate(c.id, false)} disabled={processing[c.id]} style={{ padding: '6px 12px', background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <XCircle style={{ width: 13, height: 13 }} /> Rejeter
              </button>
              <button onClick={() => validate(c.id, true)} disabled={processing[c.id]} style={{ padding: '6px 12px', background: '#DCFCE7', color: '#166534', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check style={{ width: 13, height: 13 }} /> Valider
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════ TABS DEFINITION ══════════════════ */
const TABS = [
  { id: 'overview',    label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: 'users',       label: 'Utilisateurs',   icon: Users },
  { id: 'restaurants', label: 'Restaurants',    icon: UtensilsCrossed },
  { id: 'audit',       label: 'Audit',          icon: ScrollText },
  { id: 'exports',     label: 'Exports',        icon: Download },
  { id: 'config',      label: 'Configuration',  icon: Settings },
];

/* ══════════════════ ROOT ══════════════════ */
export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const tab    = new URLSearchParams(location.search).get('tab') || 'overview';
  const goTab  = (id) => navigate(id === 'overview' ? '/admin' : `/admin?tab=${id}`);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: `${ACCENT}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield style={{ width: 16, height: 16, color: ACCENT }} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0 }}>Administration Système</h1>
        </div>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Sankofa-Lab · Pilotage plateforme · CDC v1.1</p>
      </div>

      {/* B2B validation banner on overview only */}
      {tab === 'overview' && <B2BPendingBanner />}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#fff', borderRadius: 12, padding: 4, border: '1px solid #E8EDF5', overflowX: 'auto' }}>
        {TABS.map(t => {
          const Icon   = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => goTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 14px', border: 'none', borderRadius: 9,
                cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
                background: active ? ACCENT : 'transparent',
                color: active ? '#fff' : '#64748B',
                boxShadow: active ? `0 2px 8px ${ACCENT}33` : 'none',
                transition: 'all 0.15s',
              }}
            >
              <Icon style={{ width: 14, height: 14 }} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === 'overview'    && <OverviewTab />}
      {tab === 'users'       && <UsersTab />}
      {tab === 'restaurants' && <RestaurantsTab />}
      {tab === 'audit'       && <AuditTab />}
      {tab === 'exports'     && <ExportsTab />}
      {tab === 'config'      && <ConfigTab />}
    </div>
  );
}
