import { useState, useEffect } from 'react';
import { UserPlus, Users, Trash2, AlertCircle, CheckCircle, Building2, ArrowRight, Mail, Lock, Shield, User, Phone, Save } from 'lucide-react';
import { authAPI, b2bAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const BG = '#FDFCFB';
const SURFACE = '#FDF5EF';
const ACCENT = '#C05015';
const CREAM = '#0F172A';
const MUTED = '#64748B';
const GOLD = '#F97316';
const BORDER = 'rgba(89,67,42,0.10)';

function BudgetBar({ spent, limit }) {
  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
  const color = pct >= 100 ? '#C05015' : pct >= 80 ? '#D97706' : '#9A3E10';
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs mb-1" style={{ color: MUTED }}>
        <span>{spent.toLocaleString()} FCFA dépensés</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#F2EBE1] overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="text-xs mt-1" style={{ color: MUTED }}>
        Limite: {limit.toLocaleString()} FCFA
      </div>
    </div>
  );
}

export default function B2BTeams() {
  const { user, syncUser } = useAuth();
  const [compte, setCompte] = useState(null);
  const [collaborateurs, setCollaborateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: '', email: '', limiteBudget: '' });
  const [compteForm, setCompteForm] = useState({
    raisonSociale: '', numeroRCCM: '', numeroContribuable: '',
    emailProfessionnel: '', telephoneProfessionnel: '',
  });
  const [creatingCompte, setCreatingCompte] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  // Profile editing
  const [profileForm, setProfileForm] = useState({ nom: '', prenom: '', email: '', telephone: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Init profile form from current user
  useEffect(() => {
    if (user) {
      setProfileForm({
        nom: user.nom ?? '',
        prenom: user.prenom ?? '',
        email: user.email ?? '',
        telephone: user.telephone ?? '',
      });
    }
  }, [user]);

  useEffect(() => { void load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [compteRes, collabRes] = await Promise.allSettled([
        b2bAPI.getCompte(),
        b2bAPI.getCollaborateurs(),
      ]);
      const c = compteRes.status === 'fulfilled' ? compteRes.value.data : null;
      setCompte(c?.id ? c : null);
      setCollaborateurs(collabRes.status === 'fulfilled' ? (collabRes.value.data || []) : []);
    } catch {
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompte = async (e) => {
    e.preventDefault();
    if (!compteForm.raisonSociale || !compteForm.numeroRCCM || !compteForm.numeroContribuable) {
      setError('Raison sociale, RCCM et NIF sont requis');
      return;
    }
    setCreatingCompte(true);
    setError('');
    try {
      await b2bAPI.createCompte(compteForm);
      setSuccess('Compte entreprise créé — en attente de validation');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création du compte');
    } finally {
      setCreatingCompte(false);
    }
  };

  const handleAddCollaborateur = async (e) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.email.trim()) {
      setError('Nom et email requis');
      return;
    }
    const budget = parseInt(form.limiteBudget);
    if (isNaN(budget) || budget < 10000) {
      setError('Limite de budget minimum: 10 000 FCFA');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await b2bAPI.createCollaborateur({ ...form, limiteBudget: budget });
      const data = res.data;
      if (data?.tempPassword) {
        setSuccess(`Collaborateur ajouté — mot de passe temporaire: ${data.tempPassword}`);
      } else {
        setSuccess('Collaborateur ajouté avec succès');
      }
      setForm({ nom: '', email: '', limiteBudget: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'ajout');
    } finally {
      setSubmitting(false);
      setTimeout(() => setSuccess(''), 8000);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Désactiver ce collaborateur ?')) return;
    try {
      await b2bAPI.deleteCollaborateur(id);
      setCollaborateurs(prev => prev.filter(c => c.id !== id));
    } catch {
      setError('Erreur lors de la désactivation');
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    if (!currentPassword) { setPasswordError('Mot de passe actuel requis'); return; }
    if (newPassword.length < 6) { setPasswordError('Minimum 6 caractères'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Les mots de passe ne correspondent pas'); return; }
    try {
      await authAPI.changePassword({ currentPassword, newPassword });
      setPasswordSuccess('Mot de passe modifié avec succès');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => { setShowPasswordForm(false); setPasswordSuccess(''); }, 2000);
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Erreur lors du changement de mot de passe');
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    if (!profileForm.nom.trim() || !profileForm.email.trim()) {
      setProfileError('Nom et email requis');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await authAPI.updateProfile(profileForm);
      syncUser(res.data);
      setProfileSuccess('Profil mis à jour avec succès');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Erreur lors de la mise à jour du profil');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 bg-[#FDF5EF]">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: GOLD }}>
            Espace Entreprise
          </p>
          <h1 className="mt-1 text-2xl font-bold" style={{ color: CREAM }}>Gestion des collaborateurs</h1>
          <p className="mt-1 text-sm" style={{ color: MUTED }}>Gérez les budgets individuels et les accès de vos équipes</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 font-medium">
            {success}
          </div>
        )}

        {/* ── Mon profil ── */}
        <section className="rounded-2xl border bg-white p-5" style={{ borderColor: BORDER }}>
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: GOLD }}>Mon compte</p>
            <h2 className="mt-1 font-bold" style={{ color: CREAM }}>Informations personnelles</h2>
          </div>

          {profileError && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{profileError}</div>}
          {profileSuccess && <div className="mb-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{profileSuccess}</div>}

          <form onSubmit={handleProfileUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: CREAM }}>Nom</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: MUTED }} />
                <input
                  type="text" value={profileForm.nom}
                  onChange={e => setProfileForm(p => ({ ...p, nom: e.target.value }))}
                  placeholder="Votre nom"
                  className="w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-1"
                  style={{ borderColor: BORDER }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: CREAM }}>Prénom</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: MUTED }} />
                <input
                  type="text" value={profileForm.prenom}
                  onChange={e => setProfileForm(p => ({ ...p, prenom: e.target.value }))}
                  placeholder="Votre prénom"
                  className="w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-1"
                  style={{ borderColor: BORDER }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: CREAM }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: MUTED }} />
                <input
                  type="email" value={profileForm.email}
                  onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="votre@email.com"
                  className="w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-1"
                  style={{ borderColor: BORDER }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: CREAM }}>Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: MUTED }} />
                <input
                  type="tel" value={profileForm.telephone}
                  onChange={e => setProfileForm(p => ({ ...p, telephone: e.target.value }))}
                  placeholder="+225 07 00 00 00"
                  className="w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-1"
                  style={{ borderColor: BORDER }}
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <button
                type="submit" disabled={savingProfile}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ background: ACCENT }}
              >
                <Save className="h-4 w-4" />
                {savingProfile ? 'Enregistrement...' : 'Enregistrer le profil'}
              </button>
            </div>
          </form>
        </section>

        {/* Company account section */}
        {!compte ? (
          <div className="rounded-2xl border p-6 bg-white" style={{ borderColor: BORDER }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: '#FFF4EE' }}>
                <Building2 className="h-5 w-5" style={{ color: ACCENT }} />
              </div>
              <div>
                <h2 className="font-bold" style={{ color: CREAM }}>Créer votre compte entreprise</h2>
                <p className="text-xs" style={{ color: MUTED }}>Requis avant d'ajouter des collaborateurs</p>
              </div>
            </div>
            <form onSubmit={handleCreateCompte} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: CREAM }}>Raison sociale *</label>
                  <input
                    type="text" required
                    value={compteForm.raisonSociale}
                    onChange={e => setCompteForm(p => ({ ...p, raisonSociale: e.target.value }))}
                    placeholder="TechCI SARL"
                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-1"
                    style={{ borderColor: BORDER, focusRingColor: ACCENT }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: CREAM }}>Numéro RCCM *</label>
                  <input
                    type="text" required
                    value={compteForm.numeroRCCM}
                    onChange={e => setCompteForm(p => ({ ...p, numeroRCCM: e.target.value }))}
                    placeholder="CI-ABJ-2024-B-12345"
                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                    style={{ borderColor: BORDER }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: CREAM }}>NIF (contribuable) *</label>
                  <input
                    type="text" required
                    value={compteForm.numeroContribuable}
                    onChange={e => setCompteForm(p => ({ ...p, numeroContribuable: e.target.value }))}
                    placeholder="0012345A"
                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                    style={{ borderColor: BORDER }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: CREAM }}>Email professionnel</label>
                  <input
                    type="email"
                    value={compteForm.emailProfessionnel}
                    onChange={e => setCompteForm(p => ({ ...p, emailProfessionnel: e.target.value }))}
                    placeholder="direction@techci.ci"
                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                    style={{ borderColor: BORDER }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: CREAM }}>Téléphone</label>
                  <input
                    type="tel"
                    value={compteForm.telephoneProfessionnel}
                    onChange={e => setCompteForm(p => ({ ...p, telephoneProfessionnel: e.target.value }))}
                    placeholder="+225 07 00 00 00"
                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                    style={{ borderColor: BORDER }}
                  />
                </div>
              </div>
              <button
                type="submit" disabled={creatingCompte}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ background: ACCENT }}
              >
                <ArrowRight className="h-4 w-4" />
                {creatingCompte ? 'Création...' : 'Créer le compte entreprise'}
              </button>
            </form>
          </div>
        ) : (
          <div className="rounded-2xl border p-4 bg-white flex items-center justify-between" style={{ borderColor: BORDER }}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: '#FDF5EF' }}>
                <Building2 className="h-4 w-4" style={{ color: GOLD }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: CREAM }}>{compte.raisonSociale}</p>
                <p className="text-xs" style={{ color: MUTED }}>RCCM · {compte.numeroRCCM ?? '—'}</p>
              </div>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${compte.actif ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              {compte.actif ? 'Actif' : compte.statutValidation === 'EN_ATTENTE' ? 'En validation' : compte.statutValidation}
            </span>
          </div>
        )}

        {/* Collaborator form */}
        {compte && (
          <div className="rounded-2xl border bg-white" style={{ borderColor: BORDER }}>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex w-full items-center justify-between p-5 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: '#FFF4EE' }}>
                  <UserPlus className="h-4 w-4" style={{ color: ACCENT }} />
                </div>
                <span className="font-semibold text-sm" style={{ color: CREAM }}>Ajouter un collaborateur</span>
              </div>
              <span className="text-xs" style={{ color: MUTED }}>{showForm ? 'Fermer' : 'Ouvrir'}</span>
            </button>

            {showForm && (
              <div className="border-t px-5 pb-5 space-y-3" style={{ borderColor: BORDER }}>
                <form onSubmit={handleAddCollaborateur} className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: CREAM }}>Nom complet *</label>
                    <input
                      type="text" required
                      value={form.nom}
                      onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                      placeholder="Jean Kouassi"
                      className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                      style={{ borderColor: BORDER }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: CREAM }}>Email professionnel *</label>
                    <input
                      type="email" required
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="j.kouassi@techci.ci"
                      className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                      style={{ borderColor: BORDER }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: CREAM }}>Limite mensuelle (FCFA) *</label>
                    <input
                      type="number" required min="10000"
                      value={form.limiteBudget}
                      onChange={e => setForm(p => ({ ...p, limiteBudget: e.target.value }))}
                      placeholder="50000"
                      className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                      style={{ borderColor: BORDER }}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <button
                      type="submit" disabled={submitting}
                      className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                      style={{ background: ACCENT }}
                    >
                      {submitting ? 'Ajout...' : 'Ajouter le collaborateur'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Collaborators list */}
        <section className="rounded-2xl border bg-white p-5" style={{ borderColor: BORDER }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold" style={{ color: CREAM }}>
              <Users className="inline h-4 w-4 mr-2" style={{ color: GOLD }} />
              Collaborateurs ({collaborateurs.length})
            </h2>
          </div>

          {collaborateurs.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-10 w-10 mb-3" style={{ color: BORDER }} />
              <p className="text-sm" style={{ color: MUTED }}>
                {compte ? 'Aucun collaborateur — ajoutez le premier' : 'Créez d\'abord votre compte entreprise'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {collaborateurs.map(collab => {
                const pct = collab.limiteBudget > 0
                  ? Math.min(100, (collab.depenseActuelle / collab.limiteBudget) * 100)
                  : 0;
                const statusColor = pct >= 100 ? 'text-red-600 bg-red-50'
                  : pct >= 80 ? 'text-amber-700 bg-amber-50'
                  : 'text-green-700 bg-green-50';
                const StatusIcon = pct >= 80 ? AlertCircle : CheckCircle;

                return (
                  <div key={collab.id} className="rounded-xl border p-4" style={{ borderColor: BORDER, background: '#FDFCFB' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full shrink-0 ${collab.actif ? 'bg-green-500' : 'bg-red-400'}`} />
                          <span className="font-semibold text-sm truncate" style={{ color: CREAM }}>{collab.nom}</span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: MUTED }}>{collab.email}</p>
                        <BudgetBar spent={collab.depenseActuelle ?? 0} limit={collab.limiteBudget ?? 0} />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium flex items-center gap-1 ${statusColor}`}>
                          <StatusIcon className="h-3 w-3" />
                          {pct >= 100 ? 'Épuisé' : pct >= 80 ? 'Limite proche' : 'Actif'}
                        </span>
                        <button
                          onClick={() => handleDelete(collab.id)}
                          className="p-1.5 rounded-lg transition hover:bg-red-50"
                          title="Désactiver"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs" style={{ color: MUTED }}>
                      <span>Solde: <strong style={{ color: CREAM }}>{(collab.soldeDisponible ?? 0).toLocaleString()} FCFA</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Security section ── */}
        <section className="rounded-2xl border bg-white p-5" style={{ borderColor: BORDER }}>
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: GOLD }}>Sécurité du compte</p>
            <h2 className="mt-1 font-bold" style={{ color: CREAM }}>Authentification & Protection</h2>
          </div>
          {/* Rows for security items */}
          <div className="space-y-3">
            {/* Email verification */}
            <div className="flex items-center justify-between rounded-xl border p-4" style={{ borderColor: BORDER, background: '#FDFCFB' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: '#FBE8DC' }}>
                  <Mail className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: CREAM }}>Vérification email</p>
                  <p className="text-xs" style={{ color: MUTED }}>Email vérifié et actif</p>
                </div>
              </div>
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">Actif</span>
            </div>
            {/* Change password */}
            <div className="flex items-center justify-between rounded-xl border p-4" style={{ borderColor: BORDER, background: '#FDFCFB' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: '#FDF5EF' }}>
                  <Lock className="h-4 w-4" style={{ color: GOLD }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: CREAM }}>Mot de passe</p>
                  <p className="text-xs" style={{ color: MUTED }}>Changez régulièrement pour plus de sécurité</p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-white transition"
                style={{ background: ACCENT }}
              >
                Modifier
              </button>
            </div>
            {/* 2FA */}
            <div className="flex items-center justify-between rounded-xl border p-4" style={{ borderColor: BORDER, background: '#FDFCFB' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: '#FDF5EF' }}>
                  <Shield className="h-4 w-4" style={{ color: ACCENT }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: CREAM }}>Double authentification (2FA)</p>
                  <p className="text-xs" style={{ color: MUTED }}>Sécurisez votre compte avec une application TOTP</p>
                </div>
              </div>
              <button
                onClick={() => setShow2FA(!show2FA)}
                className="rounded-xl border px-4 py-2 text-xs font-semibold transition"
                style={{ borderColor: BORDER, color: CREAM }}
              >
                Configurer
              </button>
            </div>
          </div>

          {/* Password change form */}
          {showPasswordForm && (
            <div className="mt-4 rounded-xl border p-4 space-y-3" style={{ borderColor: BORDER, background: '#FDFCFB' }}>
              <p className="text-sm font-semibold" style={{ color: CREAM }}>Changer le mot de passe</p>
              <input
                type="password"
                placeholder="Mot de passe actuel"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={{ borderColor: BORDER }}
              />
              <input
                type="password"
                placeholder="Nouveau mot de passe (min. 6 caractères)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={{ borderColor: BORDER }}
              />
              <input
                type="password"
                placeholder="Confirmer le nouveau mot de passe"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={{ borderColor: BORDER }}
              />
              {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
              {passwordSuccess && <p className="text-xs text-green-600">{passwordSuccess}</p>}
              <div className="flex gap-2">
                <button onClick={handlePasswordChange} className="rounded-xl px-4 py-2 text-xs font-semibold text-white" style={{ background: ACCENT }}>
                  Enregistrer
                </button>
                <button onClick={() => setShowPasswordForm(false)} className="rounded-xl border px-4 py-2 text-xs font-semibold" style={{ borderColor: BORDER, color: MUTED }}>
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* 2FA setup */}
          {show2FA && (
            <div className="mt-4 rounded-xl border p-4 space-y-3" style={{ borderColor: BORDER, background: '#FDFCFB' }}>
              <p className="text-sm font-semibold" style={{ color: CREAM }}>Configurer l'authentification à 2 facteurs</p>
              <p className="text-xs" style={{ color: MUTED }}>
                Installez Google Authenticator ou Authy sur votre téléphone et scannez le QR code ci-dessous.
              </p>
              <div className="flex items-center justify-center py-6 rounded-xl border border-dashed" style={{ borderColor: BORDER }}>
                <div className="text-center">
                  <div className="w-32 h-32 bg-[#F5F0E8] rounded-xl mx-auto flex items-center justify-center">
                    <Shield className="h-12 w-12" style={{ color: GOLD, opacity: 0.4 }} />
                  </div>
                  <p className="mt-3 text-xs" style={{ color: MUTED }}>QR Code disponible après activation</p>
                </div>
              </div>
              <input
                type="text"
                placeholder="Code à 6 chiffres de votre application"
                maxLength={6}
                className="w-full rounded-xl border px-3 py-2.5 text-sm text-center tracking-[0.3em] outline-none"
                style={{ borderColor: BORDER }}
              />
              <div className="flex gap-2">
                <button className="rounded-xl px-4 py-2 text-xs font-semibold text-white" style={{ background: ACCENT }}>
                  Activer la 2FA
                </button>
                <button onClick={() => setShow2FA(false)} className="rounded-xl border px-4 py-2 text-xs font-semibold" style={{ borderColor: BORDER, color: MUTED }}>
                  Annuler
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
