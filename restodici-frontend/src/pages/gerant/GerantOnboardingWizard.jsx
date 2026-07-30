// src/pages/gerant/GerantOnboardingWizard.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  MapPin, Clock, BookOpen,
  CheckCircle, ArrowRight, Loader2, ChefHat, Plus,
} from 'lucide-react';
import { restaurantAPI, menuAPI } from '../../services/api';
import { EMAIL_PATTERN, CI_PHONE_PATTERN, MSG, isValidEmail, isValidCIPhone, extractErrorMessage } from '../../utils/validators';
import { markOnboardingDone } from '../../utils/onboarding';

import { ORANGE as A, ORANGE_PEACH as AL, SURFACE as SF, BORDER_BROWN as BD } from '../../theme/colors';
import { BrandMark } from '../../components/shared/BrandLogo';

const STEPS = ['Bienvenue', 'Adresse & carte', "Horaires d'ouverture", 'Menu & articles', "C'est parti !"];

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

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#374151] mb-1.5">
        {label}
        {hint && <span className="ml-1 font-normal text-[#9CA3AF]">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', pattern, title, inputMode, maxLength }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      pattern={pattern} title={title} inputMode={inputMode} maxLength={maxLength}
      className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
      style={{ background: SF, border: `1px solid ${BD}` }}
    />
  );
}

export default function GerantOnboardingWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const restaurantId = user?.restaurant?.id || user?.restaurantId;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // Step 1: Adresse
  const [adresse, setAdresse] = useState({
    adresse: '',
    description: '',
    restaurantTelephone: '',
    restaurantEmail: '',
  });

  // Step 2: Horaires — le restaurant expose une seule plage (openingTime / closingTime)
  const [horaires, setHoraires] = useState({ ouverture: '08:00', fermeture: '22:00' });

  // Step 3: Article
  const [categorie, setCategorie] = useState('Plats du jour');
  const [article, setArticle] = useState({ nom: '', description: '', prix: '', stock: '10' });
  const [articleCreated, setArticleCreated] = useState(false);

  const setA = (k) => (e) => setAdresse(p => ({ ...p, [k]: e.target.value }));

  // Le message d'erreur ne doit pas survivre au changement d'étape.
  const goStep = (n) => { setErr(''); setStep(n); };

  const handleAdresseSubmit = async () => {
    if (!adresse.adresse.trim()) { setErr("L'adresse du restaurant est requise"); return; }
    if (adresse.restaurantTelephone.trim() && !isValidCIPhone(adresse.restaurantTelephone)) {
      setErr("Le numéro de téléphone du restaurant est invalide (+225 + 10 chiffres)");
      return;
    }
    if (adresse.restaurantEmail.trim() && !isValidEmail(adresse.restaurantEmail)) {
      setErr("L'adresse email du restaurant est invalide");
      return;
    }
    if (!restaurantId) { setErr("Aucun restaurant associé à ce compte. Contactez le support."); return; }
    setSaving(true); setErr('');
    try {
      // Noms de colonnes du restaurant : telephone / email (pas restaurantTelephone).
      await restaurantAPI.update(restaurantId, {
        adresse: adresse.adresse.trim(),
        description: adresse.description.trim(),
        telephone: adresse.restaurantTelephone.trim(),
        email: adresse.restaurantEmail.trim(),
      });
      goStep(2);
    } catch (e) {
      setErr(extractErrorMessage(e, "Erreur lors de la mise à jour des informations de l'adresse"));
    } finally {
      setSaving(false);
    }
  };

  const handleHorairesSubmit = async () => {
    if (!horaires.ouverture || !horaires.fermeture) {
      setErr("Veuillez renseigner l'heure d'ouverture et de fermeture"); return;
    }
    if (horaires.ouverture >= horaires.fermeture) {
      setErr("L'heure de fermeture doit être strictement après l'heure d'ouverture"); return;
    }
    if (!restaurantId) { setErr("Aucun restaurant associé à ce compte. Contactez le support."); return; }
    setSaving(true); setErr('');
    try {
      await restaurantAPI.update(restaurantId, {
        openingTime: horaires.ouverture,
        closingTime: horaires.fermeture,
      });
      goStep(3);
    } catch (e) {
      setErr(extractErrorMessage(e, "Erreur lors de la mise à jour des horaires"));
    } finally {
      setSaving(false);
    }
  };

  const handleArticleSubmit = async () => {
    if (!categorie.trim()) { setErr("La catégorie est requise"); return; }
    if (!article.nom.trim()) { setErr("Le nom de l'article est requis"); return; }
    if (!article.prix || isNaN(Number(article.prix))) { setErr("Le prix de l'article est requis et doit être un nombre"); return; }
    if (Number(article.prix) <= 0) { setErr("Le prix de l'article doit être supérieur à 0 FCFA"); return; }
    if (article.stock === '' || isNaN(Number(article.stock)) || Number(article.stock) < 0) {
      setErr("La quantité disponible doit être un nombre positif ou nul"); return;
    }
    if (!restaurantId) { setErr("Aucun restaurant associé à ce compte. Contactez le support."); return; }
    setSaving(true); setErr('');
    try {
      let catId;
      try {
        const catRes = await menuAPI.createCategorie({ nom: categorie.trim(), restaurantId });
        catId = catRes.data?.id;
      } catch {
        const cats = await menuAPI.getCategories({ restaurantId });
        const existing = (cats.data || []).find(c => c.nom === categorie.trim());
        catId = existing?.id;
      }
      if (!catId) throw new Error("Impossible de créer ou retrouver la catégorie");

      // stock est requis pour que l'article soit publié : le backend calcule
      // disponible = stock > 0, un stock à 0 le rendrait invisible au menu.
      await menuAPI.createArticle({
        nom: article.nom.trim(),
        description: article.description.trim(),
        prix: Number(article.prix),
        stock: Number(article.stock) || 0,
        categorieId: catId,
        restaurantId,
      });
      setArticleCreated(true);
      goStep(4);
    } catch (e) {
      setErr(extractErrorMessage(e, "Erreur lors de la création de l'article"));
    } finally {
      setSaving(false);
    }
  };

  const setHoraire = (k, v) => setHoraires(h => ({ ...h, [k]: v }));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto">

        {/* Header */}
        <div className="px-8 pt-8 pb-6" style={{ background: 'linear-gradient(135deg, #181A20 0%, #3A1000 100%)' }}>
          <div className="flex items-center gap-3 mb-4">
            <BrandMark size={40} className="shrink-0" />
            <div>
              <p className="font-bold text-white text-base leading-tight">Resto d'ici</p>
              <p className="text-[10px] text-white/40 font-semibold tracking-widest uppercase">Espace Gérant</p>
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
                <ChefHat className="w-10 h-10" style={{ color: A }} />
              </div>
              <h2 className="text-2xl font-extrabold text-[#1A0C00] mb-3">
                Bienvenue {user?.prenom || user?.nom?.split(' ')[0] || ''} !
              </h2>
              <p className="text-[#8B6E50] text-sm leading-relaxed mb-6">
                Votre restaurant <strong>{user?.restaurant?.nom || "est créé"}</strong>. Configurez-le en 3 étapes pour commencer à recevoir des commandes.
              </p>
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { icon: MapPin,   label: 'Adresse & carte',     desc: 'Localisation exacte' },
                  { icon: Clock,    label: "Horaires",             desc: 'Jours & heures' },
                  { icon: BookOpen, label: 'Menu & articles',      desc: '1er plat en 1 min' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="rounded-2xl p-3 text-center" style={{ background: SF }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: AL }}>
                      <Icon className="w-4 h-4" style={{ color: A }} />
                    </div>
                    <p className="text-[11px] font-bold text-[#1A0C00]">{label}</p>
                    <p className="text-[10px] text-[#9CA3AF] mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => goStep(1)}
                className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
                style={{ background: A }}>
                Configurer mon restaurant <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => {
                markOnboardingDone(user?.id);
                navigate('/gerant');
              }} className="mt-3 w-full text-sm text-[#9CA3AF] hover:text-[#8B6E50]">
                Passer — configurer plus tard
              </button>
            </div>
          )}

          {/* ── STEP 1: Adresse & carte ── */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: AL }}>
                  <MapPin className="w-5 h-5" style={{ color: A }} />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[#1A0C00]">Adresse & carte</h2>
                  <p className="text-xs text-[#8B6E50]">Visible par vos clients sur le menu</p>
                </div>
              </div>

              <div className="space-y-3">
                <Field label="Adresse complète *">
                  <TextInput value={adresse.adresse} onChange={setA('adresse')}
                    placeholder="Ex: Rue des Jardins, Cocody, Abidjan" />
                </Field>
                <Field label="Description du restaurant" hint="optionnel">
                  <textarea
                    value={adresse.description}
                    onChange={setA('description')}
                    placeholder="Spécialités, ambiance, particularités…"
                    rows={2}
                    className="w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none"
                    style={{ background: SF, border: `1px solid ${BD}` }}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Téléphone restaurant" hint="optionnel">
                    <TextInput value={adresse.restaurantTelephone} onChange={setA('restaurantTelephone')}
                      type="tel" inputMode="tel" pattern={CI_PHONE_PATTERN} maxLength={20} title={MSG.phone}
                      placeholder="+225 27 12 34 56 78" />
                  </Field>
                  <Field label="Email restaurant" hint="optionnel">
                    <TextInput value={adresse.restaurantEmail} onChange={setA('restaurantEmail')}
                      type="email" pattern={EMAIL_PATTERN} title={MSG.email} placeholder="contact@restaurant.ci" />
                  </Field>
                </div>
              </div>

              {err && <p className="mt-3 text-sm font-semibold text-red-500">{err}</p>}

              <div className="flex gap-3 mt-6">
                <button onClick={() => goStep(0)}
                  className="px-4 py-3 rounded-xl border text-sm font-medium text-[#8B6E50]"
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
              <button onClick={() => goStep(2)} className="mt-2 w-full text-xs text-[#9CA3AF] hover:text-[#8B6E50]">
                Passer cette étape
              </button>
            </div>
          )}

          {/* ── STEP 2: Horaires d'ouverture ── */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: AL }}>
                  <Clock className="w-5 h-5" style={{ color: A }} />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[#1A0C00]">Horaires d'ouverture</h2>
                  <p className="text-xs text-[#8B6E50]">Affichés sur votre fiche restaurant</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <Field label="Ouverture">
                  <input type="time" value={horaires.ouverture}
                    onChange={e => setHoraire('ouverture', e.target.value)}
                    className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                    style={{ background: SF, border: `1px solid ${BD}` }}
                  />
                </Field>
                <Field label="Fermeture">
                  <input type="time" value={horaires.fermeture}
                    onChange={e => setHoraire('fermeture', e.target.value)}
                    className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                    style={{ background: SF, border: `1px solid ${BD}` }}
                  />
                </Field>
              </div>

              <div className="rounded-xl px-3 py-2 mb-4 text-xs" style={{ background: SF, color: '#8B6E50' }}>
                Ouvert de <strong>{horaires.ouverture}</strong> à <strong>{horaires.fermeture}</strong>
                <span className="block mt-1 text-[11px]">Modifiable à tout moment depuis Paramètres → Horaires.</span>
              </div>

              {err && <p className="mt-3 text-sm font-semibold text-red-500">{err}</p>}

              <div className="flex gap-3 mt-2">
                <button onClick={() => goStep(1)}
                  className="px-4 py-3 rounded-xl border text-sm font-medium text-[#8B6E50]"
                  style={{ borderColor: BD }}>
                  Retour
                </button>
                <button onClick={handleHorairesSubmit} disabled={saving}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: A, opacity: saving ? 0.7 : 1 }}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {saving ? 'Enregistrement…' : 'Continuer'}
                </button>
              </div>
              <button onClick={() => goStep(3)} className="mt-2 w-full text-xs text-[#9CA3AF] hover:text-[#8B6E50]">
                Passer cette étape
              </button>
            </div>
          )}

          {/* ── STEP 3: Menu & articles ── */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: AL }}>
                  <BookOpen className="w-5 h-5" style={{ color: A }} />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[#1A0C00]">Menu & articles</h2>
                  <p className="text-xs text-[#8B6E50]">Ajoutez votre premier plat au menu</p>
                </div>
              </div>

              <div className="space-y-3">
                <Field label="Catégorie">
                  <TextInput value={categorie} onChange={e => setCategorie(e.target.value)}
                    placeholder="Ex: Plats du jour, Boissons, Desserts…" />
                </Field>
                <Field label="Nom du plat *">
                  <TextInput value={article.nom}
                    onChange={e => setArticle(p => ({ ...p, nom: e.target.value }))}
                    placeholder="Ex: Attiéké Poisson, Aloco, Kedjenou…" />
                </Field>
                <Field label="Description" hint="optionnel">
                  <textarea
                    value={article.description}
                    onChange={e => setArticle(p => ({ ...p, description: e.target.value }))}
                    placeholder="Ingrédients, accompagnements, allergènes…"
                    rows={2}
                    className="w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none"
                    style={{ background: SF, border: `1px solid ${BD}` }}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prix (FCFA) *">
                    <TextInput type="number" value={article.prix}
                      onChange={e => setArticle(p => ({ ...p, prix: e.target.value }))}
                      placeholder="Ex: 2500" />
                  </Field>
                  <Field label="Quantité *" hint="portions du jour">
                    <TextInput type="number" value={article.stock}
                      onChange={e => setArticle(p => ({ ...p, stock: e.target.value }))}
                      placeholder="Ex: 10" />
                  </Field>
                </div>
                <p className="text-[11px] text-[#9CA3AF]">
                  Le plat n'apparaît au menu que si la quantité est supérieure à 0.
                </p>
              </div>

              {err && <p className="mt-3 text-sm font-semibold text-red-500">{err}</p>}

              <div className="flex gap-3 mt-6">
                <button onClick={() => goStep(2)}
                  className="px-4 py-3 rounded-xl border text-sm font-medium text-[#8B6E50]"
                  style={{ borderColor: BD }}>
                  Retour
                </button>
                <button onClick={handleArticleSubmit} disabled={saving}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: A, opacity: saving ? 0.7 : 1 }}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? 'Création…' : 'Ajouter et terminer'}
                </button>
              </div>
              <button onClick={() => goStep(4)} className="mt-2 w-full text-xs text-[#9CA3AF] hover:text-[#8B6E50]">
                Passer — ajouter mes plats depuis le dashboard
              </button>
            </div>
          )}

          {/* ── STEP 4: C'est parti ! ── */}
          {step === 4 && (
            <div className="text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-extrabold text-[#1A0C00] mb-3">Votre restaurant est prêt !</h2>
              <p className="text-sm text-[#8B6E50] leading-relaxed mb-6">
                {articleCreated
                  ? `Votre premier article "${article.nom}" est visible dans le menu.`
                  : 'Votre restaurant est configuré. Ajoutez vos plats depuis le tableau de bord.'}
              </p>

              <div className="rounded-2xl p-4 mb-6 text-left" style={{ background: SF }}>
                {[
                  'Gérez vos commandes en temps réel (KDS)',
                  'Ajoutez d\'autres articles et catégories',
                  'Consultez vos statistiques de ventes',
                  'Activez les notifications pour les nouvelles commandes',
                ].map(s => (
                  <div key={s} className="flex items-center gap-2 text-xs mb-1.5" style={{ color: '#8B6E50' }}>
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: A }} /> {s}
                  </div>
                ))}
              </div>

              <button onClick={() => {
                  markOnboardingDone(user?.id);
                  navigate('/gerant');
                }}
                className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
                style={{ background: A }}>
                <ChefHat className="w-5 h-5" />
                Accéder à mon tableau de bord
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
