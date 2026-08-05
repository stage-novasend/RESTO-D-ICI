/* ═══════════════════════════════════════════════════════════════
   Home.jsx — Page d'accueil Ultra-Premium Resto d'ici
   Hero avec grande image aux bordures arrondies + Design Glassmorphism
   + Sidebar dynamique Yango Deli + Grille des restaurants + Footer.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed, ArrowRight, Check, Star, Search, Truck,
  Mail, X, Zap, Smartphone, ShieldCheck, SlidersHorizontal, Building2,
  Sparkles, ChevronRight, User, ShoppingBag, Menu
} from "lucide-react";
import { menuAPI, newsletterAPI } from "../services/api";
import FilterSidebar from "../components/menu/FilterSidebar";
import { BrandMark } from "../components/shared/BrandLogo";
import LanguageSwitcher from "../components/shared/LanguageSwitcher";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { RADIUS } from "../theme/colors";

import orangeMoneyLogo from "../assets/payments/orange-money.svg";
import mtnMomoLogo from "../assets/payments/mtn-momo.svg";
import moovMoneyLogo from "../assets/payments/moov-money.svg";
import waveLogo from "../assets/payments/wave.svg";
import carteBancaireLogo from "../assets/payments/carte-bancaire.svg";

/* ─── Palette "flat enterprise" — couleurs pro, neutres élégants,
   ombres naturelles restreintes (pas de glow coloré ni glassmorphism). ─── */
const T = {
  bg: "#F8FAFC", // slate-50
  bgAlt: "#F1F5F9", // slate-100
  surface: "#FFFFFF",
  dark: "#0F172A", // slate-900
  text: "#334155", // slate-700
  muted: "#64748B", // slate-500
  mutedL: "#94A3B8", // slate-400
  card: "#FFFFFF",
  accent: "#FF3A03", // orange-600
  accentD: "#CC2402", // orange-700
  accentL: "#F97316", // orange-500
  yellow: "#F59E0B", // amber-500
  yellowL: "#FCD34D", // amber-300
  red: "#EF4444",
  green: "#10B981",
  line: "#E2E8F0", // slate-200
  shadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  shadowS: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
  shadowM: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
};

const KENTE = ["#FF3A03", "#F97316", "#CC2402", "#9A3412"];
/* Une seule famille moderne sans-serif pour un look SaaS pur */
const serif = "'Inter', system-ui, sans-serif";
const sans = "'Inter', system-ui, sans-serif";

/* Nombre de restaurants mis en avant sur l'accueil (2 rangées de 3 en desktop). */
const HOME_TOP_COUNT = 6;

const CSS = `
@keyframes kfpulse    { 0%,100%{opacity:1} 50%{opacity:0.55} }
@keyframes kfskeleton { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.rd-nav-link:hover  { color:${T.accent} !important; }
.rd-btn-cta:hover   { filter:brightness(0.94); }
.rd-card:hover      { transform:translateY(-2px) !important; box-shadow:${T.shadowM} !important; border-color:${T.mutedL} !important; }
.rd-foot-link:hover { color:${T.accent} !important; }
@media (max-width: 900px) {
  .rd-desktop-sidebar { display: none !important; }
  .rd-mobile-filter-btn { display: flex !important; }
}
/* Sur mobile, "100vh" force le hero (image plein cadre en object-fit: cover)
   dans un rectangle très étroit et très haut : la photo se retrouve zoomée
   à l'extrême, ne laissant voir qu'une tranche verticale du plat. On plafonne
   la hauteur pour garder un cadrage proche de l'original. */
@media (max-width: 640px) {
  .rd-hero-banner { min-height: 70vh !important; max-height: 620px !important; }
}
@media (min-width: 901px) {
  .rd-mobile-filter-btn { display: none !important; }
}
.rd-nav-burger { display: none; }
@media (max-width: 860px) {
  .rd-nav-links-desktop { display: none !important; }
  .rd-nav-actions-desktop { display: none !important; }
  .rd-nav-burger { display: flex !important; }
  .rd-nav-inner { padding: 0 16px !important; }
  .rd-nav-brand-sub { display: none !important; }
}
`;

const FOOD_IMGS = [
  "/images/food/poulet_braise.png",
  "/images/food/jollof_rice.png",
  "/images/food/poisson_braise.png",
  "/images/food/suya_brochettes.png",
];

const fallbackImg = (idx, w = 600) => FOOD_IMGS[idx % FOOD_IMGS.length];

function restoImg(r, idx) {
  return r?.logo || r?.coverImage || r?.photoUrl || fallbackImg(idx);
}

function formatPrix(prix) {
  if (prix === null || prix === undefined) return "—";
  return new Intl.NumberFormat("fr-FR").format(prix) + " FCFA";
}

function FontLoader() {
  useEffect(() => {
    if (!document.getElementById("rd-fonts")) {
      const l = document.createElement("link"); l.id = "rd-fonts"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
      document.head.appendChild(l);
    }
    if (!document.getElementById("rd-css")) {
      const s = document.createElement("style"); s.id = "rd-css"; s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);
  return null;
}

function KS({ h = 4 }) {
  return <div style={{ display: "flex", height: h }}>{KENTE.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}</div>;
}

/* ─── Navigation Glassmorphique Premium ─── */
function Nav() {
  const { t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Empêche le scroll de fond quand le menu mobile est ouvert.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const role = user?.role?.toUpperCase();

  const getDashboardPath = () => {
    if (role === 'ADMIN') return '/admin';
    if (role === 'GERANT') return '/gerant';
    if (role === 'STAFF') return '/staff';
    if (role === 'B2B') return '/b2b/dashboard';
    return '/menu';
  };

  const navLinks = [
    { href: "#catalogue", label: t('restaurants'), icon: null },
    { href: "/register?type=b2b", label: t('b2b_space'), icon: Building2 },
    { href: "/aide", label: t('help'), icon: null },
  ];

  return (
    <>
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
      background: scrolled ? "#FFFFFF" : T.dark,
      boxShadow: scrolled ? T.shadowS : "none",
      transition: "background 0.2s ease, box-shadow 0.2s ease",
      borderBottom: scrolled ? `1px solid ${T.line}` : "1px solid transparent",
    }}>
      <div className="rd-nav-inner" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>

        {/* Brand */}
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", minWidth: 0 }}>
          <BrandMark size={32} />
          <div style={{ minWidth: 0 }}>
            <span style={{ fontFamily: sans, fontWeight: 700, color: scrolled ? T.dark : "#fff", fontSize: 20, letterSpacing: "-0.02em", display: "block", whiteSpace: "nowrap" }}>
              Resto d'ici
            </span>
          </div>
        </Link>

        {/* Links (desktop) */}
        <div className="rd-nav-links-desktop" style={{ display: "flex", gap: 32, alignItems: "center" }}>
          <a href="#catalogue" className="rd-nav-link" style={{ fontFamily: sans, fontSize: 14, color: scrolled ? T.text : "#cbd5e1", textDecoration: "none", fontWeight: 500 }}>{t('restaurants')}</a>
          <Link to="/register?type=b2b" className="rd-nav-link" style={{ fontFamily: sans, fontSize: 14, color: scrolled ? T.text : "#cbd5e1", textDecoration: "none", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
            <Building2 size={15} color={scrolled ? T.accent : T.yellowL} />{t('b2b_space')}</Link>
          <Link to="/aide" className="rd-nav-link" style={{ fontFamily: sans, fontSize: 14, color: scrolled ? T.text : "#cbd5e1", textDecoration: "none", fontWeight: 500 }}>{t('help')}</Link>
        </div>

        {/* Actions (desktop) */}
        <div className="rd-nav-actions-desktop" style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
          <LanguageSwitcher variant={scrolled ? "light" : "dark"} />

          {user ? (
            <button
              onClick={() => navigate(getDashboardPath())}
              className="rd-btn-cta"
              style={{
                fontFamily: sans, fontSize: 13, fontWeight: 600,
                padding: "8px 16px", borderRadius: 6, cursor: "pointer",
                color: "#fff", background: T.accent,
                border: "none", display: "inline-flex", alignItems: "center", gap: 8,
                boxShadow: T.shadowS
              }}
            >
              <User size={15} /> {t('my_space')} ({role})
            </button>
          ) : (
            <>
              <a
                href="/login"
                className="rd-btn-cta"
                style={{
                  fontFamily: sans, fontSize: 13, fontWeight: 500, textDecoration: "none",
                  padding: "8px 16px", borderRadius: 6, transition: "all .22s",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  color: scrolled ? T.dark : "#fff", background: "transparent",
                  border: `1px solid ${scrolled ? T.line : "rgba(255,255,255,0.2)"}`
                }}
              >{t('login')}</a>
              <a
                href="/register"
                className="rd-btn-cta"
                style={{
                  fontFamily: sans, fontSize: 13, fontWeight: 600, textDecoration: "none",
                  padding: "8px 16px", borderRadius: 6, transition: "filter .15s",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  color: "#fff", background: T.accent,
                  border: "none", boxShadow: T.shadowS
                }}
              >{t('register')}</a>
            </>
          )}
        </div>

        {/* Burger (mobile) */}
        <button
          className="rd-nav-burger"
          onClick={() => setMobileOpen(true)}
          aria-label={t('menu_button')}
          style={{
            alignItems: "center", justifyContent: "center",
            width: 40, height: 40, borderRadius: 8, flexShrink: 0,
            border: `1px solid ${scrolled ? T.line : "rgba(255,255,255,0.2)"}`,
            background: "transparent",
            color: scrolled ? T.dark : "#fff", cursor: "pointer",
          }}
        >
          <Menu size={20} />
        </button>
      </div>
    </nav>

      {/* Drawer mobile — rendu hors de <nav> : le backdropFilter sur <nav>
          crée un containing block pour les descendants position:fixed,
          ce qui limitait le drawer à la hauteur de la navbar (75px). */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(15,17,20,0.6)" }}
            onClick={(e) => e.target === e.currentTarget && setMobileOpen(false)}
          >
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 26 }}
              style={{
                position: "absolute", top: 0, right: 0, bottom: 0, width: "82%", maxWidth: 340,
                background: "#fff", overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 24,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <BrandMark size={34} shadow />
                  <span style={{ fontFamily: serif, fontWeight: 900, color: T.dark, fontSize: 18 }}>Resto d'ici</span>
                </div>
                <button onClick={() => setMobileOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 6 }}>
                  <X size={22} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {navLinks.map(link => {
                  const Icon = link.icon;
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, textDecoration: "none",
                        fontFamily: sans, fontSize: 16, fontWeight: 700, color: T.text,
                        padding: "14px 4px", borderBottom: `1px solid ${T.line}`,
                      }}
                    >
                      {Icon && <Icon size={17} color={T.accent} />}{link.label}
                    </a>
                  );
                })}
              </div>

              <div>
                <p style={{ fontFamily: sans, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: T.mutedL, margin: "0 0 10px" }}>{t('language')}</p>
                <LanguageSwitcher />
              </div>

              <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                {user ? (
                  <button
                    onClick={() => { setMobileOpen(false); navigate(getDashboardPath()); }}
                    style={{
                      fontFamily: sans, fontSize: 14, fontWeight: 800, padding: "14px 22px", borderRadius: 50,
                      cursor: "pointer", color: "#fff", background: T.accent,
                      border: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  ><User size={16} /> {t('my_space')} ({role})</button>
                ) : (
                  <>
                    <a
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                      style={{
                        fontFamily: sans, fontSize: 14, fontWeight: 700, textDecoration: "none", textAlign: "center",
                        padding: "13px 22px", borderRadius: 50, color: T.dark, background: "transparent",
                        border: "1.5px solid rgba(26,12,0,0.2)",
                      }}
                    >{t('login')}</a>
                    <a
                      href="/register"
                      onClick={() => setMobileOpen(false)}
                      style={{
                        fontFamily: sans, fontSize: 14, fontWeight: 800, textDecoration: "none", textAlign: "center",
                        padding: "13px 22px", borderRadius: 50, color: "#fff",
                        background: T.green, border: "none",
                      }}
                    >{t('register')}</a>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Hero Cinematic & Flottant ─── */
function CatalogHero({ search, onSearch, resultCount, hasQuery, suggestions }) {
  const { t } = useLanguage();
  /* Photos de plats (pas de scènes de rue/grill) : le but du hero est de donner
     envie de commander, pas de documenter la préparation. Même pool Unsplash
     que les vignettes plats (utils/articleImage.js) — plats africains vérifiés
     appétissants et bien cadrés. */
  const HERO_IMAGES = [
    "https://images.unsplash.com/photo-1665401015549-712c0dc5ef85?auto=format&fit=crop&w=2400&q=80", // poisson braisé, citron, tomate, oignon
    "https://images.unsplash.com/photo-1665333048952-a3ee97714c6b?auto=format&fit=crop&w=2400&q=80", // riz sauté au poulet, dressage gastronomique
    "https://images.unsplash.com/photo-1665332305771-e49a5dd5ba80?auto=format&fit=crop&w=2400&q=80", // thiéboudienne, légumes
  ];
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImgIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <section style={{ position: "relative", padding: "12px 16px 0", width: "100%", margin: 0 }}>
      <div className="rd-hero-banner" style={{
        position: "relative", borderRadius: "32px", overflow: "hidden",
        minHeight: "calc(100vh - 24px)", width: "100%", display: "flex",
        flexDirection: "column", justifyContent: "center",
        boxShadow: "0 24px 64px rgba(22, 14, 8, 0.25)"
      }}>
        {/* Carousel Cover Images with Crossfade */}
        <AnimatePresence mode="sync">
          <motion.img
            key={currentImgIndex}
            src={HERO_IMAGES[currentImgIndex]}
            alt="Gastronomie Resto d'ici"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              filter: "contrast(1.06) brightness(1.08) saturate(1.1)",
            }}
            onError={e => {
              e.target.src = "/images/food/jollof_rice.png";
            }}
          />
        </AnimatePresence>

        {/* Ambient Overlay */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 1,
          background: "linear-gradient(180deg, rgba(15,23,42,0.4) 0%, rgba(15,23,42,0.7) 100%)"
        }} />

        {/* Carousel Indicators */}
        <div style={{ position: "absolute", bottom: 24, right: 36, zIndex: 10, display: "flex", gap: 8 }}>
          {HERO_IMAGES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentImgIndex(idx)}
              style={{
                width: idx === currentImgIndex ? 24 : 8,
                height: 8,
                borderRadius: 4,
                border: "none",
                background: idx === currentImgIndex ? "#fff" : "rgba(255,255,255,0.4)",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* Hero Content */}
        <div style={{ position: "relative", zIndex: 2, maxWidth: 900, margin: "0 auto", padding: "120px 24px 80px", width: "100%", textAlign: "center" }}>

          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 16px", marginBottom: 24 }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green }} />
            <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#fff" }}>
              {t('abidjan_ci')}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{ fontFamily: sans, fontWeight: 700, fontSize: "clamp(32px, 5vw, 56px)", color: "#fff", lineHeight: 1.1, margin: "0 0 24px" }}
            dangerouslySetInnerHTML={{ __html: t('hero_title') }}></motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ fontFamily: sans, fontSize: "clamp(15px, 2vw, 18px)", color: "rgba(255,255,255,0.8)", lineHeight: 1.6, maxWidth: 620, margin: "0 auto 40px", fontWeight: 400 }}
          >{t('hero_sub')}</motion.p>

          {/* Floating Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ maxWidth: 660, margin: "0 auto 24px" }}
          >
            <div style={{ display: "flex", alignItems: "center", background: "#FFFFFF", borderRadius: 8, padding: "8px 8px 8px 24px", boxShadow: T.shadowM, border: `1px solid ${T.line}` }}>
              <Search size={20} color={T.muted} style={{ flexShrink: 0 }} />
              <input
                value={search}
                onChange={e => onSearch(e.target.value)}
                placeholder={t('search_placeholder')}
                style={{ border: "none", outline: "none", fontFamily: sans, fontSize: 14, color: T.text, background: "transparent", width: "100%", padding: "12px 16px", fontWeight: 500 }}
              />
              {search && (
                <button onClick={() => onSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: T.mutedL, padding: 8 }}>
                  <X size={16} />
                </button>
              )}
              <a
                href="#catalogue"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: T.accent,
                  color: "#fff", fontFamily: sans, fontSize: 14, fontWeight: 600,
                  padding: "12px 24px", borderRadius: 6, textDecoration: "none",
                  whiteSpace: "nowrap",
                  transition: "background 0.2s"
                }}
              >
                {hasQuery ? `${resultCount} ${t('results')}` : t('find')}
              </a>
            </div>
          </motion.div>

          {/* Suggestions : plats disponibles les plus commandés (API). Rien
              n'est affiché tant que la liste n'est pas chargée — mieux vaut
              aucune suggestion qu'une suggestion qui ne mène nulle part. */}
          {suggestions.length > 0 && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <span style={{ fontFamily: sans, fontSize: 12, color: "rgba(255,255,255,0.65)", alignSelf: "center", fontWeight: 600 }}>
                {t('most_ordered')}
              </span>
              {suggestions.map(plat => (
                <button
                  key={plat.nom}
                  onClick={() => onSearch(plat.nom)}
                  title={
                    plat.totalCommande > 0
                      ? `${plat.totalCommande} ${t('ordered_times')}`
                      : t('available_order')
                  }
                  style={{
                    fontFamily: sans, fontSize: 12, fontWeight: 700, color: "#fff",
                    background: search === plat.nom ? T.accent : "rgba(20,22,26,0.45)",
                    border: "1px solid rgba(255,255,255,0.22)", borderRadius: RADIUS.pill,
                    padding: "6px 14px", cursor: "pointer",
                    transition: "background 0.15s"
                  }}
                >
                  {plat.nom}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Trust Bar Badges at Bottom of Hero */}
        <div style={{ position: "relative", zIndex: 2, background: "rgba(20,22,26,0.82)", borderTop: "1px solid rgba(255,255,255,0.1)", padding: "18px 32px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-around", flexWrap: "wrap", gap: 20 }}>
            {[
              { icon: Truck, text: t('delivery_express'), sub: t('everywhere_abidjan') },
              { icon: Smartphone, text: t('mobile_payment'), sub: t('mobile_payment_sub') },
              { icon: Building2, text: t('b2b_enterprise'), sub: t('b2b_sub') },
            ].map(({ icon: Icon, text, sub }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(234,60,12,0.2)", border: "1px solid rgba(234,60,12,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={18} color={T.yellow} />
                </div>
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontFamily: sans, fontSize: 13, fontWeight: 800, color: "#fff", margin: 0 }}>{text}</p>
                  <p style={{ fontFamily: sans, fontSize: 11, color: "rgba(255,255,255,0.6)", margin: 0 }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Piliers de Confiance ─── */
function Pillars() {
  const { t } = useLanguage();
  const items = [
    { Icon: Zap, title: t('pillar_1_title'), text: t('pillar_1_desc') },
    { Icon: UtensilsCrossed, title: t('pillar_2_title'), text: t('pillar_2_desc') },
    { Icon: Smartphone, title: t('pillar_3_title'), text: t('pillar_3_desc') },
  ];
  return (
    <section style={{ background: "#fff", padding: "80px 0", borderBottom: `1px solid ${T.line}` }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: T.bgAlt, borderRadius: 6, padding: "4px 12px", marginBottom: 16 }}>
            <ShieldCheck size={14} color={T.accent} />
            <span style={{ fontFamily: sans, fontSize: 12, color: T.accent, fontWeight: 600 }}>{t('commitments')}</span>
          </div>
          <h2 style={{ fontFamily: sans, fontSize: "clamp(24px, 3vw, 32px)", color: T.dark, fontWeight: 700, margin: 0 }} dangerouslySetInnerHTML={{ __html: t('excellence_simplified') }} ></h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {items.map(({ Icon, title, text }) => (
            <div key={title} style={{ padding: "32px 24px", borderRadius: 12, background: T.bg, border: `1px solid ${T.line}` }}>
              <div style={{ width: 48, height: 48, borderRadius: 8, margin: "0 0 20px", background: T.surface, border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: T.shadow }}>
                <Icon size={24} color={T.accent} strokeWidth={2} />
              </div>
              <h3 style={{ fontFamily: sans, fontSize: 18, color: T.dark, fontWeight: 600, margin: "0 0 8px" }}>{title}</h3>
              <p style={{ fontFamily: sans, fontSize: 14, color: T.muted, lineHeight: 1.6, margin: 0 }}>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Carte Restaurant Ultra-Stylisée ─── */
function RestaurantCard({ restaurant, idx, matched, query, onOpenResto, onOpenDish }) {
  const { t } = useLanguage();
  const [hov, setHov] = useState(false);
  /* Note réelle uniquement : un restaurant sans avis n'affiche pas de note
     inventée, il est signalé comme nouveau. */
  const nbAvis = Number(restaurant.nbAvis || 0);
  const rating = nbAvis > 0 ? Number(restaurant.noteMoyenne).toFixed(1) : null;
  /* isOpen est calculé côté serveur à partir des horaires réels du
     restaurant (openingTime/closingTime) — jamais un badge fixe. */
  const isOpen = restaurant.isOpen !== false;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: T.card, borderRadius: 12, overflow: "hidden",
        boxShadow: T.shadow, border: `1px solid ${hov ? T.accentL : T.line}`,
        transition: "all .2s ease", display: "flex", flexDirection: "column"
      }}
    >
      {/* Cover Image */}
      <div onClick={() => onOpenResto(restaurant)} style={{ position: "relative", height: 180, overflow: "hidden", cursor: "pointer", background: T.bgAlt }}>
        <img
          src={restoImg(restaurant, idx)}
          alt={restaurant.nom}
          onError={e => { e.target.src = fallbackImg(idx); }}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.4s ease", transform: hov ? "scale(1.02)" : "scale(1)" }}
        />

        {/* Rating Badge */}
        <div style={{ position: "absolute", top: 12, left: 12, background: "#FFFFFF", borderRadius: 6, padding: "4px 8px", display: "flex", alignItems: "center", gap: 4, boxShadow: T.shadow, border: `1px solid ${T.line}` }}>
          {rating ? (
            <>
              <Star size={12} fill={T.yellow} color={T.yellow} />
              <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, color: T.dark }}>{rating}</span>
              <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 500, color: T.muted }}>
                ({nbAvis})
              </span>
            </>
          ) : (
            <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, color: T.accent }}>{t('new')}</span>
          )}
        </div>

        {/* Status Badge — calculé côté serveur depuis les horaires réels */}
        <div style={{ position: "absolute", top: 12, right: 12, background: isOpen ? T.green : "rgba(15,23,42,0.72)", borderRadius: 6, padding: "4px 8px", color: "#fff", fontFamily: sans, fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>
          {isOpen ? t('open_now') : 'Fermé'}
        </div>
      </div>

      {/* Info Body */}
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", flex: 1 }}>
        <h3 onClick={() => onOpenResto(restaurant)} style={{ fontFamily: sans, fontSize: 16, color: T.dark, fontWeight: 600, margin: "0 0 4px", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {restaurant.nom}
        </h3>
        <p style={{ fontFamily: sans, fontSize: 13, color: T.muted, margin: "0 0 16px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {restaurant.adresse || restaurant.ville || "Plateau, Abidjan"}
        </p>

        {/* Matched Dishes in Search */}
        {matched && matched.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontFamily: sans, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: T.accent, margin: "0 0 8px" }}>
              {t('suggested_dishes_for')} « {query} »
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {matched.map(d => (
                <button
                  key={d.id ?? d.nom}
                  onClick={() => onOpenDish(restaurant, d)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: `${T.accent}0A`, border: `1px solid ${T.line}`, borderRadius: 12, padding: "8px 12px", cursor: "pointer", textAlign: "left" }}
                >
                  <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.nom}</span>
                  <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 800, color: T.accent, flexShrink: 0 }}>{formatPrix(d.prix)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer info & Action button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${T.line}`, paddingTop: 12, marginTop: "auto" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Truck size={12} color={T.green} /><span style={{ fontFamily: sans, fontSize: 12, fontWeight: 500, color: T.green }}>{t('delivery')}</span>
            </div>
          </div>
          <button
            onClick={() => onOpenResto(restaurant)}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: sans, fontSize: 13, fontWeight: 600, color: T.accent, background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            {t('view_menu')} <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  const shimmer = {
    background: `linear-gradient(90deg, ${T.bgAlt} 25%, ${T.surface} 50%, ${T.bgAlt} 75%)`,
    backgroundSize: "200% 100%",
    animation: "kfskeleton 1.6s ease-in-out infinite",
  };
  return (
    <div style={{ background: T.card, borderRadius: 24, overflow: "hidden", boxShadow: T.shadowS, border: `1px solid ${T.line}` }}>
      <div style={{ height: 200, ...shimmer }} />
      <div style={{ padding: "20px" }}>
        <div style={{ height: 20, width: "65%", borderRadius: 6, marginBottom: 10, ...shimmer }} />
        <div style={{ height: 14, width: "45%", borderRadius: 6, marginBottom: 20, ...shimmer }} />
        <div style={{ height: 36, borderRadius: 10, ...shimmer }} />
      </div>
    </div>
  );
}

/* ─── Catalogue de Restaurants ─── */
function Catalog({
  loading, types, activeType, onType,
  restaurants, selectedRestoId, onRestoChange,
  priceRange, onPriceRangeChange,
  minRating, onMinRatingChange,
  sortBy, onSortByChange,
  onResetFilters, activeFiltersCount,
  results, totalCount, hiddenCount, onSeeMore,
  query, onOpenResto, onOpenDish
}) {
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const { t } = useLanguage();

  const sidebarCats = useMemo(() => {
    return [
      { id: "__all__", nom: t('all_dishes'), count: types.reduce((acc, t) => acc + (t.count || 0), 0) },
      ...types.map(t => ({ id: t.nom, nom: t.nom, count: t.count }))
    ];
  }, [types]);

  return (
    <section id="catalogue" style={{ background: T.bg, padding: "50px 0 100px", minHeight: "75vh" }}>
      <div style={{ maxWidth: 1340, margin: "0 auto", padding: "0 24px" }}>

        {/* Mobile Filter Button */}
        <div className="rd-mobile-filter-btn" style={{ marginBottom: 20 }}>
          <button
            onClick={() => setMobileFilterOpen(true)}
            style={{
              width: "100%", padding: "14px 20px", borderRadius: RADIUS.lg,
              background: T.accent,
              color: "#fff", border: "none", fontFamily: sans, fontSize: 15, fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              boxShadow: T.shadowS
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <SlidersHorizontal size={18} /> {t('filter_sort')}
            </span>
            {activeFiltersCount > 0 && (
              <span style={{ background: "#fff", color: T.accent, borderRadius: 10, padding: "2px 8px", fontSize: 12, fontWeight: 900 }}>
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        <div style={{ display: "flex", gap: 36, alignItems: "flex-start" }}>
          {/* Desktop Filter Sidebar */}
          <div className="rd-desktop-sidebar" style={{ width: 280, flexShrink: 0, position: "sticky", top: 96 }}>
            <FilterSidebar
              categories={sidebarCats}
              activeCat={activeType}
              onCatChange={(catId) => onType(catId === "__all__" ? "__all__" : catId)}
              restaurants={restaurants}
              selectedRestoId={selectedRestoId}
              onRestoChange={onRestoChange}
              priceRange={priceRange}
              onPriceRangeChange={onPriceRangeChange}
              minRating={minRating}
              onMinRatingChange={onMinRatingChange}
              sortBy={sortBy}
              onSortByChange={onSortByChange}
              onReset={onResetFilters}
              activeCount={activeFiltersCount}
              showDeliveryFilters={false}
            />
          </div>

          {/* Restaurant Grid */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Header Result Counter */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ fontFamily: sans, fontSize: 24, color: T.dark, fontWeight: 700, margin: 0 }}>
                  {query ? `${t('results_for')} « ${query} »` : t('top_rated')}
                </h2>
                <p style={{ fontFamily: sans, fontSize: 13, color: T.muted, margin: "4px 0 0" }}>
                  {hiddenCount > 0
                    ? `${t('selection_of')} ${results.length} ${t('on_total')} ${totalCount} ${t('available_delivery')}`
                    : results.length === 1 ? `1 ${t('restaurant_available')}` : `${results.length} ${t('restaurants_available')}`}
                </p>
              </div>

              {activeFiltersCount > 0 && (
                <button
                  onClick={onResetFilters}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: sans, fontSize: 13, fontWeight: 700, color: T.accent, background: `${T.accent}12`, border: "none", borderRadius: 50, padding: "8px 16px", cursor: "pointer" }}
                >
                  {t('reset_filters')} ({activeFiltersCount})
                </button>
              )}
            </div>

            {/* Grid */}
            {loading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 28 }}>
                {[1, 2, 3, 4, 5, 6].map(n => <SkeletonCard key={n} />)}
              </div>
            ) : results.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 28, padding: "60px 24px", textAlign: "center", border: `1px solid ${T.line}` }}>
                <div style={{ width: 72, height: 72, borderRadius: 24, background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <Search size={32} color={T.accent} />
                </div>
                <h3 style={{ fontFamily: serif, fontSize: 22, color: T.dark, fontWeight: 800, margin: "0 0 10px" }}>{t('no_restaurant_found')}</h3>
                <p style={{ fontFamily: sans, fontSize: 14, color: T.muted, maxWidth: 420, margin: "0 auto 24px" }}>{t('no_restaurant_desc')}</p>
                <button
                  onClick={onResetFilters}
                  style={{ fontFamily: sans, fontSize: 14, fontWeight: 800, color: "#fff", background: T.accent, border: "none", borderRadius: 50, padding: "12px 28px", cursor: "pointer", boxShadow: `0 6px 20px ${T.accent}44` }}
                >{t('reset_search')}</button>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 28 }}>
                  {results.map(({ restaurant, matchedDishes }, idx) => (
                    <RestaurantCard
                      key={restaurant.id || idx}
                      restaurant={restaurant}
                      idx={idx}
                      matched={matchedDishes}
                      query={query}
                      onOpenResto={onOpenResto}
                      onOpenDish={onOpenDish}
                    />
                  ))}
                </div>

                {hiddenCount > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 40 }}>
                    <button
                      onClick={onSeeMore}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 10,
                        fontFamily: sans, fontSize: 15, fontWeight: 800, color: T.accent,
                        background: "#fff", border: `1.5px solid ${T.accent}`, borderRadius: 50,
                        padding: "14px 32px", cursor: "pointer", transition: "all 0.18s"
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = T.accent; e.currentTarget.style.color = "#fff"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = T.accent; }}
                    >
                      {t('see_more_restaurants')}
                      <ArrowRight size={18} />
                    </button>
                    <span style={{ fontFamily: sans, fontSize: 13, color: T.muted }}>
                      {hiddenCount} {hiddenCount !== 1 ? t('more_to_discover_plural') : t('more_to_discover_single')}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile Filter Drawer */}
        <AnimatePresence>
          {mobileFilterOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(15,17,20,0.6)", display: "flex", justifyContent: "flex-end" }}
            >
              <motion.div
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25 }}
                style={{ width: "85%", maxWidth: 360, background: "#fff", height: "100%", overflowY: "auto", padding: 24, display: "flex", flexDirection: "column" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 800, color: T.dark, margin: 0 }}>Filtres & Tri</h3>
                  <button onClick={() => setMobileFilterOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted }}><X size={20} /></button>
                </div>
                <FilterSidebar
                  categories={sidebarCats}
                  activeCat={activeType}
                  onCatChange={(catId) => { onType(catId === "__all__" ? "__all__" : catId); setMobileFilterOpen(false); }}
                  restaurants={restaurants}
                  selectedRestoId={selectedRestoId}
                  onRestoChange={(id) => { onRestoChange(id); setMobileFilterOpen(false); }}
                  priceRange={priceRange}
                  onPriceRangeChange={onPriceRangeChange}
                  minRating={minRating}
                  onMinRatingChange={onMinRatingChange}
                  sortBy={sortBy}
                  onSortByChange={onSortByChange}
                  onReset={onResetFilters}
                  activeCount={activeFiltersCount}
                  showDeliveryFilters={false}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ─── Banner B2B Corporate Showcase (Carte Flottante Luxe) ─── */
function B2BBanner() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  return (
    <section style={{ background: T.bg, padding: "80px 24px", borderBottom: `1px solid ${T.line}` }}>
      <div style={{
        maxWidth: 1200,
        margin: "0 auto",
        background: T.dark,
        borderRadius: 16,
        padding: "48px",
        color: "#FFFFFF",
        boxShadow: T.shadowM,
        border: `1px solid ${T.dark}`,
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 40, position: "relative", zIndex: 2 }}>
          <div style={{ maxWidth: 580 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 12px", marginBottom: 16 }}>
              <Building2 size={14} color="#fff" />
              <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, color: "#fff" }}>{t('b2b_enterprise')}</span>
            </div>
            <h2 style={{ fontFamily: sans, fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 700, lineHeight: 1.2, margin: "0 0 16px" }} dangerouslySetInnerHTML={{ __html: t('b2b_title') }} ></h2>
            <p style={{ fontFamily: sans, fontSize: 15, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, margin: "0 0 32px" }}>{t('b2b_desc')}</p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <button
                onClick={() => navigate('/register?type=b2b')}
                style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: "#fff", background: T.accent, border: "none", borderRadius: 6, padding: "12px 24px", cursor: "pointer", transition: "background 0.2s" }}
              >{t('create_b2b_account')}</button>
              <button
                onClick={() => navigate('/aide')}
                style={{ fontFamily: sans, fontSize: 14, fontWeight: 500, color: "#fff", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "12px 24px", cursor: "pointer", transition: "background 0.2s" }}
              >{t('learn_more')}</button>
            </div>
          </div>

          {/* Feature Check Grid */}
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "32px", maxWidth: 400, width: "100%" }}>
            <h3 style={{ fontFamily: sans, fontSize: 18, fontWeight: 600, margin: "0 0 20px" }}>{t('why_b2b')}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                t('b2b_feat_1'),
                t('b2b_feat_2'),
                t('b2b_feat_3'),
                t('b2b_feat_4'),
              ].map(txt => (
                <div key={txt} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 4, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Check size={12} color="#fff" strokeWidth={3} />
                  </div>
                  <span style={{ fontFamily: sans, fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>{txt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Trusted Payment Circle (Identique à la documentation NovaSend) ─── */
function PaymentLogosBar() {
  const { t } = useLanguage();

  const logos = [
    { name: "Wave", logo: waveLogo },
    { name: "Orange", logo: orangeMoneyLogo },
    { name: "MTN", logo: mtnMomoLogo },
    { name: "Moov", logo: moovMoneyLogo },
    { name: "Carte", logo: carteBancaireLogo },
  ];

  return (
    <section style={{ background: T.bg, padding: "72px 24px", borderBottom: `1px solid ${T.line}` }}>

      {/* En-tête de section */}
      <div style={{ textAlign: "center", marginBottom: 44, maxWidth: 640, marginLeft: "auto", marginRight: "auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${T.green}12`, border: `1px solid ${T.green}30`, borderRadius: RADIUS.pill, padding: "6px 20px", marginBottom: 14 }}>
          <ShieldCheck size={15} color={T.green} />
          <span style={{ fontFamily: sans, fontSize: 11, color: T.green, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 800 }}>
            Intégration directe NovaSend
          </span>
        </div>
        <h2 style={{ fontFamily: serif, fontSize: "clamp(26px, 3.5vw, 38px)", color: T.dark, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.02em" }} dangerouslySetInnerHTML={{ __html: t('payments_secure') }} ></h2>
        <p style={{ fontFamily: sans, fontSize: 15, color: T.muted, lineHeight: 1.6, margin: 0 }}>{t('payments_desc')}</p>
      </div>

      {/* Rangée de moyens de paiement — tuiles plates, pas de disque 3D */}
      <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
        {logos.map((item) => (
          <div
            key={item.name}
            style={{
              background: T.card,
              border: `1px solid ${T.line}`,
              borderRadius: RADIUS.lg,
              boxShadow: T.shadowS,
              padding: "22px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={item.logo} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <span style={{ fontFamily: sans, fontSize: 12.5, fontWeight: 700, color: T.text }}>{item.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Footer Ultra-Premium en Noir ─── */
function Footer() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      await newsletterAPI.subscribe(email);
      setSent(true);
      setEmail("");
    } catch {
      setSent(true);
    }
  };

  return (
    <footer style={{ background: "#0B0805", color: "#FFFFFF", position: "relative", overflow: "hidden" }}>
      {/* Top Accent Line */}
      <div style={{ height: 3, background: T.accent }} />

      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "80px 32px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 48, marginBottom: 64 }}>

          {/* Brand info */}
          <div style={{ gridColumn: "span 1" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ padding: 3, background: "rgba(234,60,12,0.15)", borderRadius: 16, border: "1px solid rgba(234,60,12,0.3)" }}>
                <BrandMark size={42} shadow />
              </div>
              <div>
                <span style={{ fontFamily: serif, fontSize: 24, fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.02em", display: "block" }}>
                  Resto d'ici
                </span>
                <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: T.yellow }}>
                  Abidjan · Côte d'Ivoire
                </span>
              </div>
            </div>

            <p style={{ fontFamily: sans, fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, margin: "0 0 24px" }}>
              {t('footer_desc')}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: sans, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              <span>📍 Abidjan, Côte d'Ivoire</span>
              <span>📞 +225 01 01 50 00 48</span>
              <span>✉️ akwaba@sankofa-lab.co</span>
            </div>
          </div>

          {/* Links 1 : Navigation */}
          <div>
            <h4 style={{ fontFamily: serif, fontSize: 17, fontWeight: 800, color: T.yellow, margin: "0 0 20px", letterSpacing: "-0.01em" }}>
              {t('navigation')}
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12, fontFamily: sans, fontSize: 14 }}>
              <li>
                <a href="#catalogue" style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color = T.accent} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.75)"}>
                  {t('catalog_restaurants')}
                </a>
              </li>
              <li>
                <Link to="/menu" style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color = T.accent} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.75)"}>
                  {t('dishes_menus')}
                </Link>
              </li>
              <li>
                <Link to="/register?type=b2b" style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color = T.accent} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.75)"}>
                  Espace Entreprise B2B
                </Link>
              </li>
              <li>
                <Link to="/register?type=gerant" style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color = T.accent} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.75)"}>
                  Devenir Restaurateur Partenaire
                </Link>
              </li>
              <li>
                <Link to="/aide" style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color = T.accent} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.75)"}>
                  {t('help_center')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Links 2 : Support & Légal */}
          <div>
            <h4 style={{ fontFamily: serif, fontSize: 17, fontWeight: 800, color: T.yellow, margin: "0 0 20px", letterSpacing: "-0.01em" }}>
              {t('legal_support')}
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12, fontFamily: sans, fontSize: 14 }}>
              <li>
                <Link to="/legal" style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color = T.accent} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.75)"}>
                  Mentions Légales & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color = T.accent} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.75)"}>
                  Politique de Confidentialité
                </Link>
              </li>
              <li>
                <Link to="/contact" style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color = T.accent} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.75)"}>
                  Service Client & Partenariats
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 style={{ fontFamily: serif, fontSize: 17, fontWeight: 800, color: T.yellow, margin: "0 0 20px", letterSpacing: "-0.01em" }}>
              {t('offers_news')}
            </h4>
            <p style={{ fontFamily: sans, fontSize: 13.5, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, margin: "0 0 16px" }}>
              {t('newsletter_desc')}
            </p>

            {sent ? (
              <div style={{ background: "rgba(21,128,61,0.18)", border: "1px solid rgba(21,128,61,0.35)", borderRadius: RADIUS.md, padding: "14px 18px", color: "#4ADE80", fontFamily: sans, fontSize: 13, fontWeight: 700 }}>
                ✓ {t('newsletter_success')}
              </div>
            ) : (
              <form onSubmit={handleSubscribe} style={{ display: "flex", gap: 10 }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('newsletter_placeholder')}
                  required
                  style={{
                    flex: 1, padding: "12px 16px", borderRadius: 100,
                    border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.06)",
                    color: "#FFFFFF", fontFamily: sans, fontSize: 13, outline: "none"
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: "12px 22px", borderRadius: 100, background: T.accent,
                    border: "none", color: "#FFFFFF", cursor: "pointer", fontFamily: sans, fontSize: 13, fontWeight: 800,
                    boxShadow: T.shadowS, transition: "all 0.2s"
                  }}
                >
                  OK
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Bar & Copyright */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 28, display: "flex", alignItems: "center", justifyBetween: "space-between", flexWrap: "wrap", gap: 16, fontFamily: sans, fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span>© {new Date().getFullYear()} Resto d'ici — Tous droits réservés.</span>
            <span>·</span>
            <span style={{ fontStyle: "italic" }}>Concept déposé & protégé.</span>
          </div>
          <div>
            <span>Fait avec passion pour Abidjan et la Côte d'Ivoire 🇨🇮</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Composant principal Home ─── */
export default function Home() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState([]);
  const [activeType, setActiveType] = useState("__all__");
  const [restaurants, setRestaurants] = useState([]);
  const [search, setSearch] = useState("");

  const [selectedRestoId, setSelectedRestoId] = useState("__all__");
  // Identifiants alignés sur FilterSidebar.PRICE_OPTIONS (pas un [min,max] :
  // le composant propose des tranches fixes, pas un slider).
  const [priceRange, setPriceRange] = useState("__all__");
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("popular");
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [rRes, cRes, pRes] = await Promise.allSettled([
          // withArticles : l'accueil recherche aussi par nom de plat
          menuAPI.getRestaurants({ withArticles: true }),
          menuAPI.getCategories(),
          menuAPI.getPlatsPopulaires(6),
        ]);

        if (!active) return;

        const restoList = rRes.status === "fulfilled"
          ? (Array.isArray(rRes.value?.data) ? rRes.value.data : rRes.value?.data?.restaurants || [])
          : [];

        const catList = cRes.status === "fulfilled"
          ? (Array.isArray(cRes.value?.data) ? cRes.value.data : cRes.value?.data?.categories || [])
          : [];

        /* Suggestions de recherche : plats réellement disponibles et les plus
           commandés. Si l'appel échoue, on n'affiche aucune suggestion plutôt
           qu'une liste figée qui mènerait à des recherches vides. */
        const platsPopulaires = pRes.status === "fulfilled" && Array.isArray(pRes.value?.data)
          ? pRes.value.data
          : [];

        setRestaurants(restoList);
        /* Compte réel de plats par catégorie, calculé depuis les articles
           déjà chargés (withArticles: true ci-dessus) — jamais une valeur
           inventée si l'API des catégories ne renvoie pas de compteur. */
        const realCounts = {};
        for (const r of restoList) {
          for (const a of r.articles || []) {
            const catNom = a.categorie?.nom;
            if (catNom) realCounts[catNom] = (realCounts[catNom] || 0) + 1;
          }
        }
        setTypes(catList.map(c => ({ nom: c.nom, count: c.articlesCount ?? realCounts[c.nom] ?? 0 })));
        setSuggestions(platsPopulaires);
      } catch (e) {
        console.error("Home loading error:", e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleResetFilters = () => {
    setActiveType("__all__");
    setSelectedRestoId("__all__");
    setPriceRange("__all__");
    setMinRating(0);
    setSortBy("popular");
    setSearch("");
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (activeType !== "__all__") count++;
    if (selectedRestoId !== "__all__") count++;
    if (priceRange !== "__all__") count++;
    if (minRating > 0) count++;
    if (sortBy !== "popular") count++;
    if (search.trim()) count++;
    return count;
  }, [activeType, selectedRestoId, priceRange, minRating, sortBy, search]);

  /* Prix le plus bas de la carte : sert de repère pour le filtre "Fourchette
     de prix" (un restaurant est dans le budget dès qu'un plat l'est). */
  const restoMinPrice = (r) => {
    const prices = (r.articles || [])
      .map(a => Number(a.prixPromo || a.prix))
      .filter(p => Number.isFinite(p) && p > 0);
    return prices.length ? Math.min(...prices) : null;
  };

  const filteredResults = useMemo(() => {
    const q = search.trim().toLowerCase();

    const matchesPriceRange = (minPrice) => {
      if (priceRange === "__all__" || minPrice == null) return true;
      if (priceRange === "under_3000") return minPrice < 3000;
      if (priceRange === "3000_6000") return minPrice >= 3000 && minPrice <= 6000;
      if (priceRange === "over_6000") return minPrice > 6000;
      return true;
    };

    const matched = restaurants
      .map(r => {
        if (selectedRestoId !== "__all__" && r.id !== selectedRestoId) return null;

        /* Filtrer sur la note réelle : un restaurant sans avis ne doit pas
           passer un filtre « 4★ et plus » grâce à une note par défaut. */
        if (minRating > 0) {
          if (Number(r.nbAvis || 0) === 0) return null;
          if (Number(r.noteMoyenne || 0) < minRating) return null;
        }

        const articles = r.articles || [];

        if (activeType !== "__all__" && !articles.some(a => a.categorie?.nom === activeType)) {
          return null;
        }

        if (!matchesPriceRange(restoMinPrice(r))) return null;

        let matchedDishes = [];

        if (q) {
          const matchRestoName = r.nom?.toLowerCase().includes(q);
          matchedDishes = articles.filter(a => a.nom?.toLowerCase().includes(q));
          if (!matchRestoName && matchedDishes.length === 0) return null;
        }

        return { restaurant: r, matchedDishes };
      })
      .filter(Boolean);

    switch (sortBy) {
      case "rating":
        matched.sort((a, b) => Number(b.restaurant.noteMoyenne || 0) - Number(a.restaurant.noteMoyenne || 0));
        break;
      case "price_asc":
        matched.sort((a, b) => (restoMinPrice(a.restaurant) ?? Infinity) - (restoMinPrice(b.restaurant) ?? Infinity));
        break;
      case "price_desc":
        matched.sort((a, b) => (restoMinPrice(b.restaurant) ?? 0) - (restoMinPrice(a.restaurant) ?? 0));
        break;
      // "time" : pas de délai de livraison par restaurant côté backend pour
      // l'instant (uniquement au niveau d'une commande) — on retombe sur la
      // popularité plutôt que de trier sur une donnée absente.
      case "time":
      case "popular":
      default:
        matched.sort((a, b) => Number(b.restaurant.nbAvis || 0) - Number(a.restaurant.nbAvis || 0));
        break;
    }

    return matched;
  }, [restaurants, selectedRestoId, minRating, activeType, priceRange, sortBy, search]);

  /* La page d'accueil ne montre qu'une sélection : les mieux notés.
     Dès qu'une recherche ou un filtre est actif, on affiche la totalité des
     correspondances — tronquer des résultats de recherche serait trompeur. */
  const isBrowsing = activeFiltersCount > 0;

  /* Un établissement sans aucun avis n'a pas sa place sous « Les mieux notés » :
     sa note vaut 0 et ne reflète rien. On ne classe donc que ceux qui ont été
     notés (note décroissante, puis nombre d'avis pour départager un 5,0 sur
     1 avis d'un 4,7 sur 3 avis). Si le catalogue est trop jeune pour qu'un
     classement ait du sens, on retombe sur les premiers résultats. */
  const topRatedResults = useMemo(() => {
    const rated = filteredResults
      .filter(r => Number(r.restaurant.nbAvis || 0) > 0)
      .sort((a, b) =>
        Number(b.restaurant.noteMoyenne || 0) - Number(a.restaurant.noteMoyenne || 0) ||
        Number(b.restaurant.nbAvis || 0) - Number(a.restaurant.nbAvis || 0)
      );
    return rated.length >= 3 ? rated : filteredResults;
  }, [filteredResults]);

  const visibleResults = isBrowsing ? filteredResults : topRatedResults.slice(0, HOME_TOP_COUNT);
  const hiddenCount = filteredResults.length - visibleResults.length;

  const handleOpenResto = (resto) => {
    // Menu.jsx lit les paramètres `resto` (id restaurant) et `plat` (nom du
    // plat à présélectionner dans la recherche) — pas `restaurantId`/`dishId`.
    navigate(`/menu?resto=${resto.id}`);
  };

  const handleOpenDish = (resto, dish) => {
    navigate(`/menu?resto=${resto.id}&plat=${encodeURIComponent(dish.nom)}`);
  };

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: sans, color: T.text }}>
      <FontLoader />
      <Nav />
      <CatalogHero
        search={search}
        onSearch={setSearch}
        resultCount={filteredResults.length}
        hasQuery={Boolean(search.trim())}
        suggestions={suggestions}
      />
      <PaymentLogosBar />
      <Pillars />
      <Catalog
        loading={loading}
        types={types}
        activeType={activeType}
        onType={setActiveType}
        restaurants={restaurants}
        selectedRestoId={selectedRestoId}
        onRestoChange={setSelectedRestoId}
        priceRange={priceRange}
        onPriceRangeChange={setPriceRange}
        minRating={minRating}
        onMinRatingChange={setMinRating}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onResetFilters={handleResetFilters}
        activeFiltersCount={activeFiltersCount}
        results={visibleResults}
        totalCount={filteredResults.length}
        hiddenCount={hiddenCount}
        onSeeMore={() => navigate('/menu')}
        query={search}
        onOpenResto={handleOpenResto}
        onOpenDish={handleOpenDish}
      />
      <B2BBanner />
      <Footer />
    </div>
  );
}
