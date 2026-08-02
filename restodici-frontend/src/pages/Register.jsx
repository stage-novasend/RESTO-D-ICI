/* ═══════════════════════════════════════════════════════════════
   Register.jsx — Page d'inscription
   3 types d'utilisateurs : client, restaurant, entreprise (B2B)
   Formulaire validé côté client + redirection post-inscription
   ═══════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Mail, Lock, User, Store, Phone, Building2, ChefHat } from "lucide-react";
import { BrandMark } from "../components/shared/BrandLogo";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { validateField, MSG, EMAIL_PATTERN, CI_PHONE_PATTERN, extractErrorMessage } from "../utils/validators";
import { ADRESSE_PLACEHOLDER } from "../utils/onboarding";

function normalizeUserType(type) {
  const v = (type || "client").toLowerCase();
  if (v === "b2b" || v === "business" || v === "entreprise") return "business";
  if (v === "restaurant" || v === "restaurateur") return "restaurant";
  return "client";
}

function Field({ label, icon: Icon, error, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold" style={{ color: '#475569' }}>{label}</label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
        )}
        {children}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCls = (hasIcon, hasError) =>
  `w-full ${hasIcon ? 'pl-10' : 'px-4'} pr-4 py-3 rounded-lg text-sm outline-none transition`;
const inputStyle = (hasError) => ({
  background: '#F8FAFC',
  border: `1.5px solid ${hasError ? '#FCA5A5' : '#E2E8F0'}`,
  color: '#0F172A',
});

export default function Register() {
  const [searchParams] = useSearchParams();
  const location       = useLocation();
  const navigate       = useNavigate();
  const { register: authRegister } = useAuth();
  const { t } = useLanguage();

  const userType    = normalizeUserType(searchParams.get("type"));
  const isRestaurant = userType === "restaurant";
  const isBusiness   = userType === "business";

  const [form, setForm]       = useState({ nom: "", email: "", telephone: "", password: "", restaurantNom: "", nomEntreprise: "" });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    e.nom       = validateField('text',  form.nom,       { required: true });
    e.email     = validateField('email', form.email,     { required: true });
    e.telephone = validateField('phone', form.telephone, { required: true });
    e.password  = validateField('password', form.password, { required: true });
    if (isRestaurant && !form.restaurantNom.trim()) e.restaurantNom = MSG.required;
    if (isBusiness   && !form.nomEntreprise.trim()) e.nomEntreprise = MSG.required;
    Object.keys(e).forEach(k => { if (!e[k]) delete e[k]; });
    setErrors(e);
    return !Object.keys(e).length;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true); setApiError("");
    try {
      let payload;
      if (isRestaurant) {
        payload = {
          type: "RESTAURANT",
          nom: form.nom, email: form.email, telephone: form.telephone, password: form.password,
          restaurantNom: form.restaurantNom,
          // Adresse réelle demandée au wizard d'onboarding gérant : ce placeholder
          // est reconnu par needsOnboarding() comme "restaurant à configurer".
          description: "", adresse: ADRESSE_PLACEHOLDER,
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
        // Toujours forcer la connexion manuelle après inscription, quel que soit le rôle
        navigate("/login?registered=1");
      } else {
        setApiError(res.error || "Erreur lors de l'inscription");
      }
    } catch (err) {
      setApiError(extractErrorMessage(err, "Erreur lors de l'inscription"));
    } finally {
      setLoading(false);
    }
  };

  const TABS = [
    { key: "client",     label: t('client_tab'),     icon: User      },
    { key: "restaurant", label: t('restaurant_tab'), icon: ChefHat   },
    { key: "business",   label: t('enterprise_tab'), icon: Building2 },
  ];

  const heading = isRestaurant ? t('create_restaurant')
    : isBusiness ? t('create_b2b')
    : t('create_account');

  return (
    <div className="min-h-screen min-h-dvh flex lg:flex-row-reverse" style={{ background: '#FFFFFF', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Formulaire d'inscription — côté droit (visuellement) ── */}
      <div className="flex-1 flex flex-col justify-center px-8 py-10 sm:px-12 lg:px-16 xl:px-24 overflow-y-auto">
        <div className="w-full max-w-sm mx-auto">

          {/* ── Logo ── */}
          <div className="flex items-center gap-2.5 mb-8">
            <BrandMark size={36} />
            <span className="font-bold text-lg" style={{ color: '#0F172A' }}>Resto d'ici</span>
          </div>

          {/* ── Titre selon le type d'inscription ── */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>{heading}</h1>
            <p className="mt-1 text-sm" style={{ color: '#64748B' }}>
              {isRestaurant ? t('manage_restaurant_rt')
                : isBusiness ? t('team_meals_budget')
                : t('join_digital_table')}
            </p>
          </div>

          {/* ── Onglets de sélection du type de compte ── */}
          <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: '#F1F5F9' }}>
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} type="button"
                onClick={() => navigate(`/register?type=${key}`)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: userType === key ? '#FFFFFF' : 'transparent',
                  color: userType === key ? '#FF3A03' : '#94A3B8',
                  boxShadow: userType === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}>
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* ── Formulaire ── */}
          <form onSubmit={onSubmit} className="space-y-4">
            {apiError && (
              <div className="rounded-lg px-4 py-3 text-sm text-red-700"
                style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>{apiError}</div>
            )}

            {/* ── Champs spécifiques au compte restaurant ── */}
            {isRestaurant && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t('your_name') + " *"} icon={User} error={errors.nom}>
                    <input value={form.nom} onChange={set("nom")} placeholder="Prénom Nom"
                      className={inputCls(true, errors.nom)} style={inputStyle(errors.nom)} />
                  </Field>
                  <Field label={t('phone_number') + " *"} icon={Phone} error={errors.telephone}>
                    <input value={form.telephone} onChange={set("telephone")} placeholder="+225 07 12 34 56 78" inputMode="tel"
                      type="tel" pattern={CI_PHONE_PATTERN} maxLength={20} title={MSG.phone} required
                      className={inputCls(true, errors.telephone)} style={inputStyle(errors.telephone)} />
                  </Field>
                </div>
                <Field label={t('email_label') + " *"} icon={Mail} error={errors.email}>
                  <input type="email" value={form.email} onChange={set("email")} placeholder="gerant@restaurant.com"
                    pattern={EMAIL_PATTERN} title={MSG.email} required
                    className={inputCls(true, errors.email)} style={inputStyle(errors.email)} />
                </Field>
                <Field label={t('password_label') + " *"} icon={Lock} error={errors.password}>
                  <input type="password" value={form.password} onChange={set("password")} placeholder="••••••••"
                    minLength={8} title={MSG.password} required
                    className={inputCls(true, errors.password)} style={inputStyle(errors.password)} />
                </Field>
                <Field label={t('restaurant_name') + " *"} icon={Store} error={errors.restaurantNom}>
                  <input value={form.restaurantNom} onChange={set("restaurantNom")} placeholder="Nom de votre établissement"
                    className={inputCls(true, errors.restaurantNom)} style={inputStyle(errors.restaurantNom)} />
                </Field>
              </>
            )}

            {/* ── Champs spécifiques au compte entreprise ── */}
            {isBusiness && (
              <>
                <Field label={t('company_name') + " *"} icon={Building2} error={errors.nomEntreprise}>
                  <input value={form.nomEntreprise} onChange={set("nomEntreprise")} placeholder="Nom de votre société"
                    className={inputCls(true, errors.nomEntreprise)} style={inputStyle(errors.nomEntreprise)} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t('manager_name') + " *"} icon={User} error={errors.nom}>
                    <input value={form.nom} onChange={set("nom")} placeholder="Votre nom"
                      className={inputCls(true, errors.nom)} style={inputStyle(errors.nom)} />
                  </Field>
                  <Field label={t('phone_number') + " *"} icon={Phone} error={errors.telephone}>
                    <input value={form.telephone} onChange={set("telephone")} placeholder="+225 07 12 34 56 78" inputMode="tel"
                      type="tel" pattern={CI_PHONE_PATTERN} maxLength={20} title={MSG.phone} required
                      className={inputCls(true, errors.telephone)} style={inputStyle(errors.telephone)} />
                  </Field>
                </div>
                <Field label={t('professional_email') + " *"} icon={Mail} error={errors.email}>
                  <input type="email" value={form.email} onChange={set("email")} placeholder="vous@entreprise.com"
                    pattern={EMAIL_PATTERN} title={MSG.email} required
                    className={inputCls(true, errors.email)} style={inputStyle(errors.email)} />
                </Field>
                <Field label={t('password_label') + " *"} icon={Lock} error={errors.password}>
                  <input type="password" value={form.password} onChange={set("password")} placeholder="••••••••"
                    minLength={8} title={MSG.password} required
                    className={inputCls(true, errors.password)} style={inputStyle(errors.password)} />
                </Field>
              </>
            )}

            {/* ── Champs du compte client standard ── */}
            {!isRestaurant && !isBusiness && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t('full_name') + " *"} icon={User} error={errors.nom}>
                    <input value={form.nom} onChange={set("nom")} placeholder="Votre nom"
                      className={inputCls(true, errors.nom)} style={inputStyle(errors.nom)} />
                  </Field>
                  <Field label={t('phone_number') + " *"} icon={Phone} error={errors.telephone}>
                    <input value={form.telephone} onChange={set("telephone")} placeholder="+225 07 12 34 56 78" inputMode="tel"
                      type="tel" pattern={CI_PHONE_PATTERN} maxLength={20} title={MSG.phone} required
                      className={inputCls(true, errors.telephone)} style={inputStyle(errors.telephone)} />
                  </Field>
                </div>
                <Field label={t('email_label') + " *"} icon={Mail} error={errors.email}>
                  <input type="email" value={form.email} onChange={set("email")} placeholder="votre@email.com"
                    pattern={EMAIL_PATTERN} title={MSG.email} required
                    className={inputCls(true, errors.email)} style={inputStyle(errors.email)} />
                </Field>
                <Field label={t('password_label') + " *"} icon={Lock} error={errors.password}>
                  <input type="password" value={form.password} onChange={set("password")} placeholder="••••••••"
                    minLength={8} title={MSG.password} required
                    className={inputCls(true, errors.password)} style={inputStyle(errors.password)} />
                </Field>
              </>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-white text-sm transition disabled:opacity-60 active:scale-[0.99]"
              style={{ background: '#FF3A03' }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{t('creating')}</span>
              ) : (
                isBusiness ? t('create_business_account')
                  : isRestaurant ? t('create_restaurant')
                  : t('create_account')
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm" style={{ color: '#94A3B8' }}>
            {t('already_have_account')}{' '}
            <Link to={`/login${location.search}`} className="font-semibold hover:underline" style={{ color: '#FF3A03' }}>{t('login_title')}</Link>
          </p>
        </div>
      </div>

      {/* ── Image décorative — visible uniquement sur écran ≥ 1024px ── */}
      <div className="hidden lg:block relative w-[44%] shrink-0">
        <img
          src="/burger-hero.jpg"
          onError={e => { e.target.src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=95&w=1920&auto=format&fit=crop'; }}
          alt="Plat Resto d'ici"
          className="absolute inset-0 w-full h-full object-cover object-center contrast-[1.02] brightness-[1.02]"
        />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.10) 50%, transparent 100%)' }} />
        <div className="absolute bottom-10 left-8 right-8">
          <p className="text-white font-bold text-xl">{t('welcome_restodici')}</p>
          <p className="text-white/70 text-sm mt-1">{t('manage_all_in_one')}</p>
        </div>
      </div>
    </div>
  );
}
