// src/pages/b2b/AcceptInvitation.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { UtensilsCrossed, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { b2bAPI } from '../../services/api';

const A = '#FF8C00';

export default function AcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [invitation, setInvitation] = useState(null);
  const [loadingInvit, setLoadingInvit] = useState(true);
  const [invitError, setInvitError] = useState('');

  const [form, setForm] = useState({ prenom: '', password: '', confirm: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!token) return;
    b2bAPI.getInvitation(token)
      .then(r => setInvitation(r.data))
      .catch(e => setInvitError(e.response?.data?.message || 'Invitation introuvable ou expirée'))
      .finally(() => setLoadingInvit(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { setSubmitError('Mot de passe : 8 caractères minimum'); return; }
    if (form.password !== form.confirm) { setSubmitError('Les mots de passe ne correspondent pas'); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      await b2bAPI.acceptInvitation(token, { password: form.password, prenom: form.prenom || undefined });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Erreur lors de l'activation du compte");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#FFFFFF' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: A }}>
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-[#0F172A] leading-tight">Resto d'ici</p>
            <p className="text-[11px] text-[#737373] font-semibold">Espace Entreprise</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-[#E2E8F0] overflow-hidden">

          {/* Header card */}
          <div className="px-8 py-6 border-b border-[#F3F4F6]" style={{ background: 'linear-gradient(135deg, #181A20, #2B1500)' }}>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-1">Invitation</p>
            <h1 className="text-xl font-bold text-white">Rejoindre l'équipe</h1>
          </div>

          <div className="p-8">

            {/* Loading */}
            {loadingInvit && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: A }} />
              </div>
            )}

            {/* Invitation error */}
            {!loadingInvit && invitError && (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-400" />
                <p className="text-base font-bold text-[#111827]">Invitation invalide</p>
                <p className="text-sm text-[#6B7280]">{invitError}</p>
                <Link to="/login" className="mt-2 text-sm font-semibold underline" style={{ color: A }}>
                  Aller à la connexion
                </Link>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-500" />
                <p className="text-base font-bold text-[#111827]">Compte activé !</p>
                <p className="text-sm text-[#6B7280]">Redirection vers la connexion…</p>
              </div>
            )}

            {/* Form */}
            {!loadingInvit && invitation && !success && (
              <>
                <div className="mb-6 p-4 rounded-2xl" style={{ background: '#FFF0DF' }}>
                  <p className="text-sm font-bold" style={{ color: A }}>
                    {invitation.entreprise}
                  </p>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    vous invite à rejoindre leur espace entreprise
                  </p>
                  {invitation.limiteBudget > 0 && (
                    <p className="text-xs mt-1 text-[#6B7280]">
                      Budget mensuel alloué : <strong style={{ color: A }}>{invitation.limiteBudget.toLocaleString('fr-FR')} FCFA</strong>
                    </p>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Nom pré-rempli (lecture seule) */}
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1.5">Nom</label>
                    <input
                      type="text"
                      value={invitation.nom}
                      readOnly
                      className="w-full rounded-xl px-4 py-3 text-sm bg-[#F3F4F6] text-[#6B7280] cursor-not-allowed"
                      style={{ border: '1px solid rgba(89,67,42,0.10)' }}
                    />
                  </div>

                  {/* Email pré-rempli (lecture seule) */}
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1.5">Email</label>
                    <input
                      type="email"
                      value={invitation.email}
                      readOnly
                      className="w-full rounded-xl px-4 py-3 text-sm bg-[#F3F4F6] text-[#6B7280] cursor-not-allowed"
                      style={{ border: '1px solid rgba(89,67,42,0.10)' }}
                    />
                  </div>

                  {/* Prénom optionnel */}
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1.5">Prénom (optionnel)</label>
                    <input
                      type="text"
                      value={form.prenom}
                      onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))}
                      placeholder="Votre prénom"
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2"
                      style={{ background: '#F9F7F5', border: '1px solid rgba(89,67,42,0.10)', focusRingColor: A }}
                    />
                  </div>

                  {/* Mot de passe */}
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1.5">Créer un mot de passe *</label>
                    <div className="relative">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                        placeholder="8 caractères minimum"
                        required
                        className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none"
                        style={{ background: '#F9F7F5', border: '1px solid rgba(89,67,42,0.10)' }}
                      />
                      <button type="button" onClick={() => setShowPwd(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]">
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmation */}
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1.5">Confirmer le mot de passe *</label>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={form.confirm}
                      onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                      placeholder="Retapez votre mot de passe"
                      required
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={{ background: '#F9F7F5', border: '1px solid rgba(89,67,42,0.10)' }}
                    />
                  </div>

                  {submitError && (
                    <p className="text-sm font-semibold text-red-500">{submitError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition"
                    style={{ background: A, opacity: submitting ? 0.7 : 1 }}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {submitting ? 'Activation…' : "Activer mon compte"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-[#6B7280] mt-6">
          Déjà un compte ?{' '}
          <Link to="/login" className="font-semibold underline" style={{ color: A }}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
