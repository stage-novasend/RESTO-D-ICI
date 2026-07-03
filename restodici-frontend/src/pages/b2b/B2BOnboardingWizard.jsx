// src/pages/b2b/B2BOnboardingWizard.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UtensilsCrossed, ShoppingBag, Users, FileText,
  CheckCircle, ArrowRight, Loader2, Building2, MapPin, UserPlus,
} from 'lucide-react';
import { b2bAPI } from '../../services/api';

const A = '#EA580C';
const AL = '#FFF0DF';
const SF = '#F9F7F5';
const BD = 'rgba(89,67,42,0.10)';

const STEPS = ['Bienvenue', 'Votre entreprise', 'Adresse du siège', 'Collaborateurs', "C'est parti !"];

function StepDots({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((_, i) => (
        <div key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            background: i <= current ? A : '#E5E7EB',
          }} />
      ))}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#374151] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
      style={{ background: SF, border: `1px solid ${BD}` }}
    />
  );
}

export default function B2BOnboardingWizard({ user, onComplete }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [compteId, setCompteId] = useState(null);

  const [entreprise, setEntreprise] = useState({
    raisonSociale: '',
    numeroRCCM: '',
    numeroContribuable: '',
    emailProfessionnel: '',
    telephoneProfessionnel: '',
  });

  const [adresse, setAdresse] = useState({ adresseSiege: '' });

  const [collab, setCollab] = useState({ nom: '', email: '', budgetMensuel: '' });
  const [collabAdded, setCollabAdded] = useState(false);

  const setE = (k) => (e) => setEntreprise(p => ({ ...p, [k]: e.target.value }));
  const setC = (k) => (e) => setCollab(p => ({ ...p, [k]: e.target.value }));

  const handleEntrepriseNext = () => {
    const required = ['raisonSociale', 'numeroRCCM', 'numeroContribuable', 'emailProfessionnel', 'telephoneProfessionnel'];
    const missing = required.filter(k => !entreprise[k]?.trim());
    if (missing.length) { setErr('Tous les champs obligatoires sont requis'); return; }
    setErr('');
    setStep(2);
  };

  const handleAdresseSubmit = async () => {
    setSaving(true);
    setErr('');
    try {
      const payload = { ...entreprise, adresseSiege: adresse.adresseSiege };
      const res = await b2bAPI.createCompte(payload);
      setCompteId(res.data?.id);
      setStep(3);
    } catch (e) {
      setErr(e.response?.data?.message || 'Erreur lors de la création du compte');
    } finally {
      setSaving(false);
    }
  };

  const handleCollabAdd = async () => {
    if (!collab.nom.trim() || !collab.email.trim()) {
      setErr('Nom et email requis pour le collaborateur');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      await b2bAPI.createCollaborateur({
        nom: collab.nom,
        email: collab.email,
        budgetMensuel: collab.budgetMensuel ? Number(collab.budgetMensuel) : undefined,
      });
      setCollabAdded(true);
      setStep(4);
    } catch (e) {
      setErr(e.response?.data?.message || "Erreur lors de l'invitation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto">

        {/* Header gradient */}
        <div className="px-8 pt-8 pb-6" style={{ background: 'linear-gradient(135deg, #181A20 0%, #2B1500 100%)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: A }}>
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-base leading-tight">Resto d'ici</p>
              <p className="text-[10px] text-white/40 font-semibold tracking-widest uppercase">Espace Entreprise</p>
            </div>
          </div>
          <StepDots current={step} />
          <p className="text-xs text-white/40 text-center">{STEPS[step]} · Étape {step + 1} / {STEPS.length}</p>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >

          {/* ── STEP 0: Bienvenue ── */}
          {step === 0 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: AL }}>
                <Building2 className="w-10 h-10" style={{ color: A }} />
              </div>
              <h2 className="text-2xl font-extrabold text-[#111827] mb-3">
                Bonjour {user?.prenom || user?.nom?.split(' ')[0] || ''} !
              </h2>
              <p className="text-[#6B7280] text-sm leading-relaxed mb-6">
                Bienvenue sur <strong>Resto d'ici Entreprise</strong>. En quelques minutes, configurez votre espace pour passer des commandes groupées pour vos équipes avec facturation mensuelle SYSCOHADA.
              </p>
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { icon: ShoppingBag, label: 'Commandes groupées', desc: 'Min. 4h à l\'avance' },
                  { icon: Users,        label: 'Budgets équipe',      desc: 'Par collaborateur' },
                  { icon: FileText,     label: 'Facture SYSCOHADA',   desc: 'En fin de mois' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="rounded-2xl p-3 text-center" style={{ background: SF }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: AL }}>
                      <Icon className="w-4 h-4" style={{ color: A }} />
                    </div>
                    <p className="text-[11px] font-bold text-[#111827]">{label}</p>
                    <p className="text-[10px] text-[#6B7280] mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(1)}
                className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
                style={{ background: A }}>
                Configurer mon compte entreprise <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={onComplete} className="mt-3 w-full text-sm text-[#6B7280] hover:text-[#6B7280]">
                Passer pour l'instant
              </button>
            </div>
          )}

          {/* ── STEP 1: Compte entreprise (RCCM/NIF) ── */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-extrabold text-[#111827] mb-1">Votre entreprise</h2>
              <p className="text-sm text-[#6B7280] mb-5">Ces informations figureront sur vos factures SYSCOHADA.</p>

              <div className="space-y-3">
                {[
                  { k: 'raisonSociale',          label: 'Raison sociale *',             ph: 'SARL Mon Entreprise CI' },
                  { k: 'numeroRCCM',             label: 'N° RCCM *',                    ph: 'CI-ABJ-2026-B-1234' },
                  { k: 'numeroContribuable',     label: 'N° Contribuable (NIF) *',      ph: 'CI-123456789-A' },
                  { k: 'emailProfessionnel',     label: 'Email professionnel *',         ph: 'comptabilite@entreprise.ci' },
                  { k: 'telephoneProfessionnel', label: 'Téléphone professionnel *',     ph: '+22507070707' },
                ].map(f => (
                  <Field key={f.k} label={f.label}>
                    <Input value={entreprise[f.k]} onChange={setE(f.k)} placeholder={f.ph}
                      type={f.k === 'emailProfessionnel' ? 'email' : 'text'} />
                  </Field>
                ))}
              </div>

              {err && <p className="mt-3 text-sm font-semibold text-red-500">{err}</p>}

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(0)}
                  className="px-4 py-3 rounded-xl border text-sm font-medium text-[#6B7280]"
                  style={{ borderColor: BD }}>
                  Retour
                </button>
                <button onClick={handleEntrepriseNext}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: A }}>
                  <ArrowRight className="w-4 h-4" /> Continuer
                </button>
              </div>
              <p className="text-[11px] text-[#6B7280] text-center mt-3">
                Format RCCM : CI-ABJ-2026-B-1234 · Téléphone : +22507070707
              </p>
            </div>
          )}

          {/* ── STEP 2: Adresse du siège ── */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: AL }}>
                  <MapPin className="w-5 h-5" style={{ color: A }} />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[#111827]">Adresse du siège</h2>
                  <p className="text-xs text-[#6B7280]">Apparaîtra sur vos factures SYSCOHADA</p>
                </div>
              </div>

              <div className="space-y-3">
                <Field label="Adresse complète du siège social">
                  <textarea
                    value={adresse.adresseSiege}
                    onChange={e => setAdresse({ adresseSiege: e.target.value })}
                    placeholder="Ex : Plateau, Avenue Houphouët-Boigny, Immeuble Alpha 2000, 3ème étage, Abidjan"
                    rows={3}
                    className="w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none"
                    style={{ background: SF, border: `1px solid ${BD}` }}
                  />
                </Field>
              </div>

              {err && <p className="mt-3 text-sm font-semibold text-red-500">{err}</p>}

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)}
                  className="px-4 py-3 rounded-xl border text-sm font-medium text-[#6B7280]"
                  style={{ borderColor: BD }}>
                  Retour
                </button>
                <button onClick={handleAdresseSubmit} disabled={saving}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: A, opacity: saving ? 0.7 : 1 }}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {saving ? 'Enregistrement…' : 'Continuer'}
                </button>
              </div>
              <button onClick={() => { setAdresse({ adresseSiege: '' }); handleAdresseSubmit(); }}
                className="mt-2 w-full text-xs text-[#6B7280] hover:text-[#6B7280]">
                Passer cette étape
              </button>
            </div>
          )}

          {/* ── STEP 3: Collaborateurs & budgets ── */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0" style={{ background: AL }}>
                  <UserPlus className="w-5 h-5" style={{ color: A }} />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[#111827]">Collaborateurs & budgets</h2>
                  <p className="text-xs text-[#6B7280]">Invitez votre premier collaborateur</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { k: 'nom',           label: 'Nom complet *',          ph: 'Kouassi Jean' },
                  { k: 'email',         label: 'Email *',                ph: 'jean@entreprise.ci' },
                  { k: 'budgetMensuel', label: 'Budget mensuel (FCFA)',  ph: '50000' },
                ].map(f => (
                  <Field key={f.k} label={f.label}>
                    <Input value={collab[f.k]} onChange={setC(f.k)} placeholder={f.ph}
                      type={f.k === 'budgetMensuel' ? 'number' : 'text'} />
                  </Field>
                ))}
              </div>

              {err && <p className="mt-3 text-sm font-semibold text-red-500">{err}</p>}

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(2)}
                  className="px-4 py-3 rounded-xl border text-sm font-medium text-[#6B7280]"
                  style={{ borderColor: BD }}>
                  Retour
                </button>
                <button onClick={handleCollabAdd} disabled={saving}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: A, opacity: saving ? 0.7 : 1 }}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {saving ? 'Invitation…' : 'Inviter et continuer'}
                </button>
              </div>
              <button onClick={() => setStep(4)}
                className="mt-2 w-full text-xs text-[#6B7280] hover:text-[#6B7280]">
                Passer — inviter plus tard depuis le tableau de bord
              </button>
            </div>
          )}

          {/* ── STEP 4: C'est parti ! ── */}
          {step === 4 && (
            <div className="text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-extrabold text-[#111827] mb-3">Vous êtes prêt !</h2>
              <p className="text-sm text-[#6B7280] leading-relaxed mb-2">
                Votre espace entreprise est configuré.
              </p>
              {collabAdded && (
                <p className="text-sm font-medium mb-6" style={{ color: A }}>
                  Invitation envoyée à {collab.email} ✓
                </p>
              )}
              {!collabAdded && <div className="mb-6" />}

              <div className="rounded-2xl p-4 mb-6 text-left" style={{ background: SF }}>
                <p className="text-xs font-bold text-[#374151] mb-3">Votre compte est en attente de validation (24–48h)</p>
                {[
                  'Passez votre première commande groupée',
                  'Invitez vos collaborateurs depuis Équipes',
                  'Consultez vos factures SYSCOHADA chaque mois',
                ].map(s => (
                  <div key={s} className="flex items-center gap-2 text-xs mb-1.5" style={{ color: '#6B7280' }}>
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: A }} /> {s}
                  </div>
                ))}
              </div>

              <button onClick={() => { localStorage.setItem(`rdi_ob_${user?.id}`, '1'); onComplete('order'); }}
                className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 mb-3"
                style={{ background: A }}>
                <ShoppingBag className="w-5 h-5" />
                Passer ma première commande
              </button>
              <button onClick={() => { localStorage.setItem(`rdi_ob_${user?.id}`, '1'); onComplete('invite'); }}
                className="w-full py-3 rounded-2xl font-bold border text-sm flex items-center justify-center gap-2"
                style={{ borderColor: A, color: A }}>
                <Users className="w-4 h-4" />
                Gérer mon équipe
              </button>
              <button onClick={() => { localStorage.setItem(`rdi_ob_${user?.id}`, '1'); onComplete(); }} className="mt-3 w-full text-sm text-[#6B7280] hover:text-[#6B7280]">
                Explorer le tableau de bord
              </button>
            </div>
          )}

          </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
