import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  UtensilsCrossed, User, Phone, CheckCircle,
  ArrowRight, Loader2, ChefHat, Coffee, CreditCard,
} from 'lucide-react';
import { authAPI } from '../../services/api';
import { CI_PHONE_PATTERN, MSG } from '../../utils/validators';

import { ORANGE as A, ORANGE_PEACH as AL, SURFACE as SF, BORDER_BROWN as BD } from '../../theme/colors';

const POSTES = [
  { key: 'SERVEUR',   label: 'Serveur / Salle',   icon: Coffee,     desc: 'Prise de commandes en salle' },
  { key: 'CUISINIER', label: 'Cuisinier / Cuisine', icon: ChefHat,    desc: 'KDS cuisine, suivi des plats' },
  { key: 'CAISSIER',  label: 'Caissier / Caisse',   icon: CreditCard, desc: 'Encaissements et paiements' },
];

const STEPS = ['Bienvenue', 'Ton profil', 'Ton poste', "C'est parti !"];

function StepDots({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((_, i) => (
        <div key={i} className="rounded-full transition-all duration-300"
          style={{ width: i === current ? 24 : 8, height: 8, background: i <= current ? A : '#E5E7EB' }} />
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

function TextInput({ value, onChange, placeholder, type = 'text', pattern, title, inputMode, maxLength }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      pattern={pattern} title={title} inputMode={inputMode} maxLength={maxLength}
      className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
      style={{ background: SF, border: `1px solid ${BD}` }} />
  );
}

export default function StaffOnboardingWizard() {
  const navigate = useNavigate();
  const { user, syncUser } = useAuth();

  const [step,   setStep]   = useState(0);
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const [profil, setProfil] = useState({
    nom:       user?.nom       || '',
    prenom:    user?.prenom    || '',
    telephone: user?.telephone || '',
  });
  const [poste, setPoste] = useState('SERVEUR');

  const setP = (k) => (e) => setProfil(p => ({ ...p, [k]: e.target.value }));

  const handleProfilNext = async () => {
    if (!profil.nom.trim() || !profil.telephone.trim()) {
      setErr('Nom et téléphone sont requis'); return;
    }
    setErr('');
    setSaving(true);
    try {
      await authAPI.updateProfile({
        nom:       profil.nom.trim(),
        prenom:    profil.prenom.trim() || profil.nom.trim(),
        telephone: profil.telephone.trim(),
      });
      setStep(2);
    } catch {
      setErr('Erreur lors de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = () => {
    localStorage.setItem(`rdi_ob_${user?.id}`, '1');
    localStorage.setItem(`rdi_poste_${user?.id}`, poste);
    if (syncUser) syncUser({ ...user, telephone: profil.telephone, nom: profil.nom });
    navigate('/staff');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: 'linear-gradient(135deg, #FDF8F0 0%, #FFF5E8 100%)' }}>
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${A}, #C2410C)`, boxShadow: `0 4px 16px ${A}40` }}>
            <UtensilsCrossed className="w-7 h-7 text-white" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: A }}>Resto d'ici · Espace Staff</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl shadow-xl overflow-hidden" style={{ background: '#FFFFFF' }}>
          <div className="px-8 py-8">
            <StepDots current={step} />

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
                <p className="text-2xl font-extrabold text-[#1A0C00] mb-2">
                  Bienvenue, {user?.nom || 'nouveau membre'} !
                </p>
                <p className="text-sm text-[#8B6E50] leading-relaxed mb-6">
                  Configurons ton espace en 2 minutes pour que tu sois opérationnel dès maintenant.
                </p>
                <div className="rounded-2xl p-4 mb-6 text-left" style={{ background: SF }}>
                  {['Gérer les commandes en temps réel (KDS)', 'Encaisser les paiements à la caisse', 'Suivre les stocks et alertes'].map(s => (
                    <div key={s} className="flex items-center gap-2 text-xs mb-1.5 text-[#8B6E50]">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: A }} /> {s}
                    </div>
                  ))}
                </div>
                <button onClick={() => setStep(1)}
                  className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
                  style={{ background: A }}>
                  Commencer <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── STEP 1: Profil ── */}
            {step === 1 && (
              <div>
                <p className="text-xl font-extrabold text-[#1A0C00] mb-1">Ton profil</p>
                <p className="text-sm text-[#8B6E50] mb-5">Ces informations seront visibles dans les commandes.</p>
                <div className="space-y-4">
                  <Field label="Prénom">
                    <TextInput value={profil.prenom} onChange={setP('prenom')} placeholder="Ex : Konan" />
                  </Field>
                  <Field label="Nom *">
                    <TextInput value={profil.nom} onChange={setP('nom')} placeholder="Ex : Yao" />
                  </Field>
                  <Field label="Téléphone *">
                    <TextInput value={profil.telephone} onChange={setP('telephone')} placeholder="+225 07 12 34 56 78" type="tel" inputMode="tel" pattern={CI_PHONE_PATTERN} maxLength={20} title={MSG.phone} />
                  </Field>
                </div>
                {err && <p className="mt-3 text-sm font-semibold text-red-500">{err}</p>}
                <button onClick={handleProfilNext} disabled={saving}
                  className="mt-6 w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: A, opacity: saving ? 0.7 : 1 }}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {saving ? 'Enregistrement…' : 'Continuer'}
                </button>
              </div>
            )}

            {/* ── STEP 2: Poste ── */}
            {step === 2 && (
              <div>
                <p className="text-xl font-extrabold text-[#1A0C00] mb-1">Ton poste</p>
                <p className="text-sm text-[#8B6E50] mb-5">Ça nous aide à personnaliser ta vue principale.</p>
                <div className="space-y-3 mb-6">
                  {POSTES.map(({ key, label, icon: Icon, desc }) => (
                    <button key={key} onClick={() => setPoste(key)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition"
                      style={{
                        background: poste === key ? AL : SF,
                        border: `2px solid ${poste === key ? A : 'transparent'}`,
                      }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: poste === key ? A : '#E5E7EB' }}>
                        <Icon className="w-5 h-5" style={{ color: poste === key ? '#fff' : '#8B6E50' }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: poste === key ? A : '#1A0C00' }}>{label}</p>
                        <p className="text-xs text-[#8B6E50]">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)}
                    className="px-4 py-3 rounded-xl border text-sm font-medium text-[#8B6E50]"
                    style={{ borderColor: BD }}>
                    Retour
                  </button>
                  <button onClick={() => setStep(3)}
                    className="flex-1 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                    style={{ background: A }}>
                    Continuer <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: C'est parti ! ── */}
            {step === 3 && (
              <div className="text-center">
                <div className="text-5xl mb-4">🎉</div>
                <p className="text-2xl font-extrabold text-[#1A0C00] mb-2">Tu es prêt !</p>
                <p className="text-sm text-[#8B6E50] leading-relaxed mb-6">
                  Ton espace staff est configuré. Les commandes t'attendent.
                </p>
                <div className="rounded-2xl p-4 mb-6 text-left" style={{ background: SF }}>
                  {[
                    'KDS — Suis les commandes en temps réel',
                    'Caisse — Encaisse rapidement',
                    'Stocks — Surveille les alertes',
                  ].map(s => (
                    <div key={s} className="flex items-center gap-2 text-xs mb-1.5 text-[#8B6E50]">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: A }} /> {s}
                    </div>
                  ))}
                </div>
                <button onClick={handleFinish}
                  className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
                  style={{ background: A }}>
                  <User className="w-5 h-5" /> Accéder à mon espace
                </button>
              </div>
            )}

            </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <p className="text-center text-xs text-[#9CA3AF] mt-6">Resto d'ici · Espace Staff</p>
      </div>
    </div>
  );
}
