// src/pages/gerant/GerantOnboardingWizard.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  UtensilsCrossed, MapPin, Clock, BookOpen,
  CheckCircle, ArrowRight, Loader2, ChefHat, Plus, X,
} from 'lucide-react';
import { restaurantAPI, menuAPI } from '../../services/api';

const A = '#EA580C';
const AL = '#FFF0DF';
const SF = '#F9F7F5';
const BD = 'rgba(89,67,42,0.10)';

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

function TextInput({ value, onChange, placeholder, type = 'text' }) {
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

  // Step 2: Horaires
  const [horaires, setHoraires] = useState([
    { jour: 'Lundi–Vendredi', ouverture: '08:00', fermeture: '22:00' },
  ]);

  // Step 3: Article
  const [categorie, setCategorie] = useState('Plats du jour');
  const [article, setArticle] = useState({ nom: '', description: '', prix: '' });
  const [articleCreated, setArticleCreated] = useState(false);

  const setA = (k) => (e) => setAdresse(p => ({ ...p, [k]: e.target.value }));

  const horaireString = horaires
    .map(h => `${h.jour} ${h.ouverture}–${h.fermeture}`)
    .join(', ');

  const handleAdresseSubmit = async () => {
    if (!adresse.adresse.trim()) { setErr("L'adresse est requise"); return; }
    setSaving(true); setErr('');
    try {
      await restaurantAPI.update(restaurantId, {
        adresse: adresse.adresse,
        description: adresse.description,
        restaurantTelephone: adresse.restaurantTelephone,
        restaurantEmail: adresse.restaurantEmail,
      });
      setStep(2);
    } catch (e) {
      setErr(e.response?.data?.message || "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const handleHorairesSubmit = async () => {
    setSaving(true); setErr('');
    try {
      await restaurantAPI.update(restaurantId, { horaires: horaireString });
      setStep(3);
    } catch (e) {
      setErr(e.response?.data?.message || "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const handleArticleSubmit = async () => {
    if (!article.nom.trim() || !article.prix) { setErr("Nom et prix de l'article requis"); return; }
    setSaving(true); setErr('');
    try {
      let catId;
      try {
        const catRes = await menuAPI.createCategorie({ nom: categorie, restaurantId });
        catId = catRes.data?.id;
      } catch {
        // Category may already exist — try fetching
        const cats = await menuAPI.getCategories({ restaurantId });
        const existing = (cats.data || []).find(c => c.nom === categorie);
        catId = existing?.id;
      }
      await menuAPI.createArticle({
        nom: article.nom,
        description: article.description,
        prix: Number(article.prix),
        categorieId: catId,
        restaurantId,
        disponible: true,
      });
      setArticleCreated(true);
      setStep(4);
    } catch (e) {
      setErr(e.response?.data?.message || "Erreur lors de la création de l'article");
    } finally {
      setSaving(false);
    }
  };

  const addHoraire = () => setHoraires(h => [...h, { jour: '', ouverture: '08:00', fermeture: '22:00' }]);
  const removeHoraire = (i) => setHoraires(h => h.filter((_, idx) => idx !== i));
  const setHoraire = (i, k, v) => setHoraires(h => h.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto">

        {/* Header */}
        <div className="px-8 pt-8 pb-6" style={{ background: 'linear-gradient(135deg, #181A20 0%, #3A1000 100%)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: A }}>
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
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
              <h2 className="text-2xl font-extrabold text-[#111827] mb-3">
                Bienvenue {user?.prenom || user?.nom?.split(' ')[0] || ''} !
              </h2>
              <p className="text-[#6B7280] text-sm leading-relaxed mb-6">
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
                    <p className="text-[11px] font-bold text-[#111827]">{label}</p>
                    <p className="text-[10px] text-[#9CA3AF] mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(1)}
                className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
                style={{ background: A }}>
                Configurer mon restaurant <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => navigate('/gerant')} className="mt-3 w-full text-sm text-[#9CA3AF] hover:text-[#6B7280]">
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
                  <h2 className="text-xl font-extrabold text-[#111827]">Adresse & carte</h2>
                  <p className="text-xs text-[#6B7280]">Visible par vos clients sur le menu</p>
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
                      placeholder="+225 01 XX XX XX" />
                  </Field>
                  <Field label="Email restaurant" hint="optionnel">
                    <TextInput value={adresse.restaurantEmail} onChange={setA('restaurantEmail')}
                      type="email" placeholder="contact@restaurant.ci" />
                  </Field>
                </div>
              </div>

              {err && <p className="mt-3 text-sm font-semibold text-red-500">{err}</p>}

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(0)}
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
              <button onClick={() => setStep(2)} className="mt-2 w-full text-xs text-[#9CA3AF] hover:text-[#6B7280]">
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
                  <h2 className="text-xl font-extrabold text-[#111827]">Horaires d'ouverture</h2>
                  <p className="text-xs text-[#6B7280]">Affichés sur votre fiche restaurant</p>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                {horaires.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={h.jour}
                      onChange={e => setHoraire(i, 'jour', e.target.value)}
                      placeholder="Ex: Lundi–Vendredi"
                      className="flex-1 rounded-xl px-3 py-2 text-xs outline-none"
                      style={{ background: SF, border: `1px solid ${BD}` }}
                    />
                    <input type="time" value={h.ouverture}
                      onChange={e => setHoraire(i, 'ouverture', e.target.value)}
                      className="rounded-xl px-2 py-2 text-xs outline-none"
                      style={{ background: SF, border: `1px solid ${BD}`, width: 90 }}
                    />
                    <span className="text-xs text-[#9CA3AF]">–</span>
                    <input type="time" value={h.fermeture}
                      onChange={e => setHoraire(i, 'fermeture', e.target.value)}
                      className="rounded-xl px-2 py-2 text-xs outline-none"
                      style={{ background: SF, border: `1px solid ${BD}`, width: 90 }}
                    />
                    {horaires.length > 1 && (
                      <button onClick={() => removeHoraire(i)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg"
                        style={{ background: '#FEE2E2' }}>
                        <X className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={addHoraire}
                className="flex items-center gap-1.5 text-xs font-semibold rounded-xl px-3 py-2 mb-4"
                style={{ background: AL, color: A }}>
                <Plus className="w-3.5 h-3.5" /> Ajouter une plage horaire
              </button>

              <div className="rounded-xl px-3 py-2 mb-4 text-xs" style={{ background: SF, color: '#6B7280' }}>
                Aperçu : <strong>{horaireString}</strong>
              </div>

              {err && <p className="mt-3 text-sm font-semibold text-red-500">{err}</p>}

              <div className="flex gap-3 mt-2">
                <button onClick={() => setStep(1)}
                  className="px-4 py-3 rounded-xl border text-sm font-medium text-[#6B7280]"
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
              <button onClick={() => setStep(3)} className="mt-2 w-full text-xs text-[#9CA3AF] hover:text-[#6B7280]">
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
                  <h2 className="text-xl font-extrabold text-[#111827]">Menu & articles</h2>
                  <p className="text-xs text-[#6B7280]">Ajoutez votre premier plat au menu</p>
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
                <Field label="Prix (FCFA) *">
                  <TextInput type="number" value={article.prix}
                    onChange={e => setArticle(p => ({ ...p, prix: e.target.value }))}
                    placeholder="Ex: 2500" />
                </Field>
              </div>

              {err && <p className="mt-3 text-sm font-semibold text-red-500">{err}</p>}

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(2)}
                  className="px-4 py-3 rounded-xl border text-sm font-medium text-[#6B7280]"
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
              <button onClick={() => setStep(4)} className="mt-2 w-full text-xs text-[#9CA3AF] hover:text-[#6B7280]">
                Passer — ajouter mes plats depuis le dashboard
              </button>
            </div>
          )}

          {/* ── STEP 4: C'est parti ! ── */}
          {step === 4 && (
            <div className="text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-extrabold text-[#111827] mb-3">Votre restaurant est prêt !</h2>
              <p className="text-sm text-[#6B7280] leading-relaxed mb-6">
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
                  <div key={s} className="flex items-center gap-2 text-xs mb-1.5" style={{ color: '#6B7280' }}>
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: A }} /> {s}
                  </div>
                ))}
              </div>

              <button onClick={() => {
                  localStorage.setItem(`rdi_ob_${user?.id}`, '1');
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
