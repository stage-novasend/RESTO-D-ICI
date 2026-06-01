// src/pages/Register.jsx
import { useState } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Mail, Lock, User, Store, Phone, Building2, ChefHat, CheckCircle, ArrowRight, UtensilsCrossed } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

function normalizeUserType(type) {
  const v = (type || "client").toLowerCase();
  if (v === "b2b" || v === "business" || v === "entreprise") return "business";
  if (v === "restaurant" || v === "restaurateur") return "restaurant";
  return "client";
}

const inputBase =
  "block w-full pl-10 pr-3 py-3.5 bg-[#FFF5E8] border-0 rounded-2xl text-[#1A0C00] placeholder-[#B09070]/70 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C00]/40 transition-all";
const labelBase = "text-sm font-semibold text-[#1A0C00]";

function Field({ label, icon: Icon, error, children }) {
  return (
    <div className="space-y-1.5">
      <label className={labelBase}>{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,140,0,0.6)' }} />}
        {children}
      </div>
      {error && <p className="text-red-500 text-xs mt-0.5">{error}</p>}
    </div>
  );
}

export default function Register() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { register: authRegister } = useAuth();

  const userType = normalizeUserType(searchParams.get("type"));
  const isRestaurant = userType === "restaurant";
  const isBusiness   = userType === "business";

  const [form, setForm] = useState({
    nom: "", email: "", telephone: "", password: "",
    restaurantNom: "", nomEntreprise: "",
  });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.nom.trim())       e.nom       = "Champ requis";
    if (!form.email.trim())     e.email     = "Email requis";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Email invalide";
    if (!form.telephone.trim()) e.telephone = "Téléphone requis";
    if (!form.password || form.password.length < 6) e.password = "Minimum 6 caractères";
    if (isRestaurant && !form.restaurantNom.trim()) e.restaurantNom = "Nom du restaurant requis";
    if (isBusiness   && !form.nomEntreprise.trim()) e.nomEntreprise = "Nom de l'entreprise requis";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError("");
    try {
      let payload;
      if (isRestaurant) {
        payload = {
          type: "RESTAURANT",
          nom: form.nom, email: form.email, telephone: form.telephone, password: form.password,
          restaurantNom: form.restaurantNom,
          description: "", adresse: "À compléter",
          restaurantTelephone: form.telephone, restaurantEmail: form.email,
          horaires: "Lun-Dim: 08:00-22:00", zonesLivraison: ["Abidjan"],
        };
      } else if (isBusiness) {
        payload = {
          type: "BUSINESS_CLIENT",
          nom: form.nom, email: form.email, telephone: form.telephone, password: form.password,
          nomEntreprise: form.nomEntreprise, emailProfessionnel: form.email, responsableCompte: form.nom,
        };
      } else {
        payload = { type: "CLIENT", nom: form.nom, email: form.email, telephone: form.telephone, password: form.password };
      }

      const res = await authRegister(payload);
      if (res.success) {
        navigate("/login?registered=1");
      } else {
        setApiError(res.error || "Erreur lors de l'inscription");
      }
    } catch (err) {
      setApiError(err.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: "client",     label: "Client",     icon: User      },
    { key: "restaurant", label: "Restaurant", icon: ChefHat   },
    { key: "business",   label: "Entreprise", icon: Building2 },
  ];

  const heading = isRestaurant ? "Créer mon restaurant"
    : isBusiness ? "Créer un compte entreprise"
    : "Créer un compte";

  const sub = isRestaurant ? "Gérez votre restaurant en temps réel"
    : isBusiness ? "Repas d'équipe, budgets et facturation centralisés"
    : "Rejoignez la table digitale";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-8"
      style={{ background: 'linear-gradient(135deg, #FF8C00 0%, #E07A00 60%, #FFB800 100%)' }}>

      {/* Card */}
      <div className="w-full max-w-5xl bg-white rounded-3xl overflow-hidden shadow-2xl flex h-[700px]">

        {/* ── Left: form panel ── */}
        <div className="flex-1 flex flex-col justify-start px-10 py-10 lg:px-12 overflow-y-auto"
          style={{ background: '#FFFAF3' }}>

          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-7">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
              style={{ background: 'linear-gradient(135deg, #FF8C00, #FFB800)' }}>
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight" style={{ color: '#FF8C00', fontFamily: "'Playfair Display', serif" }}>Resto d'ici</span>
              <p className="text-[11px] leading-none mt-0.5" style={{ color: '#B09070' }}>La table digitale de vos repas</p>
            </div>
          </div>

          <h1 className="text-2xl font-extrabold mb-1" style={{ color: '#1A0C00', fontFamily: "'Playfair Display', serif" }}>{heading}</h1>
          <p className="text-sm mb-6" style={{ color: '#B09070' }}>{sub}</p>

          {/* Type tabs */}
          <div className="flex gap-1.5 mb-6 p-1 rounded-2xl" style={{ background: '#FFF5E8' }}>
            {tabs.map(({ key, label, icon: Icon }) => (
              <button key={key} type="button"
                onClick={() => navigate(`/register?type=${key}`)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-sm font-semibold transition-all ${
                  userType === key
                    ? "bg-white shadow-sm"
                    : "hover:opacity-70"
                }`}
                style={{ color: userType === key ? '#FF8C00' : '#B09070' }}>
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-3.5 flex-1">
            {apiError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">{apiError}</div>
            )}

            {/* ─── RESTAURANT ─── */}
            {isRestaurant && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Votre nom *" icon={User} error={errors.nom}>
                    <input value={form.nom} onChange={set("nom")} placeholder="Gérant / propriétaire" className={inputBase} />
                  </Field>
                  <Field label="Téléphone *" icon={Phone} error={errors.telephone}>
                    <input value={form.telephone} onChange={set("telephone")} placeholder="+225 XX XX XX" inputMode="tel" className={inputBase} />
                  </Field>
                </div>
                <Field label="Email *" icon={Mail} error={errors.email}>
                  <input type="email" value={form.email} onChange={set("email")} placeholder="gerant@restaurant.com" className={inputBase} />
                </Field>
                <Field label="Mot de passe *" icon={Lock} error={errors.password}>
                  <input type="password" value={form.password} onChange={set("password")} placeholder="••••••••" className={inputBase} />
                </Field>
                <div className="pt-1">
                  <Field label="Nom du restaurant *" icon={Store} error={errors.restaurantNom}>
                    <input value={form.restaurantNom} onChange={set("restaurantNom")} placeholder="Nom de votre établissement" className={inputBase} />
                  </Field>
                </div>
                <div className="rounded-2xl px-4 py-3" style={{ background: '#FFF5E8', border: '1px solid rgba(255,140,0,0.2)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#C06800' }}>À compléter dans votre dashboard :</p>
                  {["Adresse & carte", "Horaires d'ouverture", "Menu & articles"].map(s => (
                    <div key={s} className="flex items-center gap-2 text-xs mb-1" style={{ color: '#C06800', opacity: 0.8 }}>
                      <ArrowRight className="w-3 h-3 shrink-0" />{s}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ─── BUSINESS ─── */}
            {isBusiness && (
              <>
                <Field label="Nom de l'entreprise *" icon={Building2} error={errors.nomEntreprise}>
                  <input value={form.nomEntreprise} onChange={set("nomEntreprise")} placeholder="Nom de votre société" className={inputBase} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Responsable *" icon={User} error={errors.nom}>
                    <input value={form.nom} onChange={set("nom")} placeholder="Votre nom" className={inputBase} />
                  </Field>
                  <Field label="Téléphone *" icon={Phone} error={errors.telephone}>
                    <input value={form.telephone} onChange={set("telephone")} placeholder="+225 XX XX XX" inputMode="tel" className={inputBase} />
                  </Field>
                </div>
                <Field label="Email professionnel *" icon={Mail} error={errors.email}>
                  <input type="email" value={form.email} onChange={set("email")} placeholder="vous@entreprise.com" className={inputBase} />
                </Field>
                <Field label="Mot de passe *" icon={Lock} error={errors.password}>
                  <input type="password" value={form.password} onChange={set("password")} placeholder="••••••••" className={inputBase} />
                </Field>
                <div className="rounded-2xl px-4 py-3" style={{ background: '#FFF5E8', border: '1px solid rgba(255,140,0,0.2)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#C06800' }}>À compléter dans votre dashboard :</p>
                  {["Compte entreprise (RCCM, NIF)", "Adresse du siège", "Collaborateurs & budgets"].map(s => (
                    <div key={s} className="flex items-center gap-2 text-xs mb-1" style={{ color: '#C06800', opacity: 0.8 }}>
                      <ArrowRight className="w-3 h-3 shrink-0" />{s}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ─── CLIENT ─── */}
            {!isRestaurant && !isBusiness && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nom complet *" icon={User} error={errors.nom}>
                    <input value={form.nom} onChange={set("nom")} placeholder="Votre nom" className={inputBase} />
                  </Field>
                  <Field label="Téléphone *" icon={Phone} error={errors.telephone}>
                    <input value={form.telephone} onChange={set("telephone")} placeholder="+225 XX XX XX" inputMode="tel" className={inputBase} />
                  </Field>
                </div>
                <Field label="Email *" icon={Mail} error={errors.email}>
                  <input type="email" value={form.email} onChange={set("email")} placeholder="votre@email.com" className={inputBase} />
                </Field>
                <Field label="Mot de passe *" icon={Lock} error={errors.password}>
                  <input type="password" value={form.password} onChange={set("password")} placeholder="••••••••" className={inputBase} />
                </Field>
              </>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center py-3.5 px-4 font-bold rounded-2xl text-white disabled:opacity-60 text-sm mt-2 transition-all shadow-sm active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #FF8C00, #E07A00)' }}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Création en cours…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {isBusiness ? "Créer mon compte entreprise" : isRestaurant ? "Créer mon restaurant" : "Créer mon compte"}
                </span>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm" style={{ color: '#B09070' }}>
            Déjà un compte ?{" "}
            <Link to={`/login${location.search}`} className="font-semibold hover:opacity-80" style={{ color: '#FF8C00' }}>
              Se connecter
            </Link>
          </p>
        </div>

        {/* ── Right: food image panel ── */}
        <div className="hidden lg:flex lg:w-[48%] xl:w-[50%] flex-shrink-0 relative overflow-hidden items-center justify-center"
          style={{ background: '#FFF5E8' }}>
          <img
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=900&auto=format&fit=crop"
            alt="Plats d'Abidjan"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(255,140,0,0.45) 0%, transparent 55%)' }} />
          <div className="absolute bottom-6 left-6 rounded-2xl px-4 py-3 shadow-lg"
            style={{ background: 'rgba(255,250,243,0.92)', backdropFilter: 'blur(12px)' }}>
            <p className="font-extrabold text-sm" style={{ color: '#FF8C00', fontFamily: "'Playfair Display', serif" }}>Resto d'ici</p>
            <p className="text-xs mt-0.5" style={{ color: '#B09070' }}>La table digitale de vos repas</p>
          </div>
        </div>

      </div>
    </div>
  );
}
