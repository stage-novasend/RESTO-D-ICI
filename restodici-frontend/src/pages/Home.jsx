/* ═══════════════════════════════════════════════════════════════
   Home.jsx — Page d'accueil Ultra-Premium Resto d'ici
   Hero avec grande image aux bordures arrondies + Design Glassmorphism
   + Sidebar dynamique Yango Deli + Grille des restaurants + Footer.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed, ArrowRight, Check, Star, Search, Truck, Clock,
  Mail, X, Zap, Smartphone, ShieldCheck, SlidersHorizontal, Building2,
  Sparkles, ChevronRight, User, ShoppingBag
} from "lucide-react";
import { menuAPI, newsletterAPI } from "../services/api";
import FilterSidebar from "../components/menu/FilterSidebar";
import { BrandMark } from "../components/shared/BrandLogo";
import LanguageSwitcher from "../components/shared/LanguageSwitcher";
import { useAuth } from "../hooks/useAuth";

import orangeMoneyLogo   from "../assets/payments/orange-money.svg";
import mtnMomoLogo       from "../assets/payments/mtn-momo.svg";
import moovMoneyLogo     from "../assets/payments/moov-money.svg";
import waveLogo          from "../assets/payments/wave.svg";
import carteBancaireLogo from "../assets/payments/carte-bancaire.svg";

/* ─── Palette de couleurs Ultra-Premium ─── */
const T = {
  bg:      "#FAF6F0",
  bgAlt:   "#F5EFE6",
  surface: "#FFFDF9",
  dark:    "#160E08",
  text:    "#2C1D11",
  muted:   "#756252",
  mutedL:  "#A89685",
  card:    "#FFFFFF",
  accent:  "#EA580C",
  accentD: "#C2410C",
  accentL: "#F97316",
  yellow:  "#F59E0B",
  yellowL: "#FBBF24",
  red:     "#EF4444",
  green:   "#10B981",
  line:    "rgba(234, 88, 12, 0.12)",
  shadow:  "0 12px 36px rgba(234, 88, 12, 0.12)",
  shadowS: "0 4px 20px rgba(0,0,0,0.06)",
};

const KENTE = ["#EA580C", "#F59E0B", "#160E08", "#C2410C"];
const serif = "'Playfair Display', Georgia, serif";
const sans  = "'Manrope', system-ui, sans-serif";

/* Nombre de restaurants mis en avant sur l'accueil (2 rangées de 3 en desktop). */
const HOME_TOP_COUNT = 6;

const CSS = `
@keyframes kfpulse    { 0%,100%{opacity:1} 50%{opacity:0.55} }
@keyframes kfskeleton { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
@keyframes rd-orbit   { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes rd-orbit-rev { 0% { transform: rotate(360deg); } 100% { transform: rotate(0deg); } }
.rd-nav-link:hover  { color:${T.accent} !important; }
.rd-btn-cta:hover   { transform:translateY(-2px) !important; box-shadow:0 12px 32px rgba(234,88,12,0.4) !important; }
.rd-card:hover      { transform:translateY(-6px) !important; box-shadow:0 20px 48px rgba(234,88,12,0.18) !important; }
.rd-foot-link:hover { color:${T.accent} !important; }
@media (max-width: 900px) {
  .rd-desktop-sidebar { display: none !important; }
  .rd-mobile-filter-btn { display: flex !important; }
}
@media (min-width: 901px) {
  .rd-mobile-filter-btn { display: none !important; }
}
`;

const FOOD_IMGS = [
  "photo-1665332195309-9d75071138f0",
  "photo-1665400808116-f0e6339b7e9a",
  "photo-1664993101841-036f189719b6",
  "photo-1664992960082-0ea299a9c53e",
  "photo-1665333048952-a3ee97714c6b",
  "photo-1665332305771-e49a5dd5ba80",
  "photo-1665334217407-6688e6941a47",
  "photo-1665332561290-cc6757172890",
  "photo-1665401015549-712c0dc5ef85",
  "photo-1603496987674-79600a000f55",
];

const fallbackImg = (idx, w = 600) =>
  `https://images.unsplash.com/${FOOD_IMGS[idx % FOOD_IMGS.length]}?q=80&w=${w}&auto=format&fit=crop`;

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
      const l = document.createElement("link"); l.id="rd-fonts"; l.rel="stylesheet";
      l.href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Manrope:wght@300;400;500;600;700;800&display=swap";
      document.head.appendChild(l);
    }
    if (!document.getElementById("rd-css")) {
      const s = document.createElement("style"); s.id="rd-css"; s.textContent=CSS;
      document.head.appendChild(s);
    }
  }, []);
  return null;
}

function KS({ h=4 }) {
  return <div style={{display:"flex",height:h}}>{KENTE.map((c,i)=><div key={i} style={{flex:1,background:c}}/>)}</div>;
}

/* ─── Navigation Glassmorphique Premium ─── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const role = user?.role?.toUpperCase();

  const getDashboardPath = () => {
    if (role === 'ADMIN') return '/admin';
    if (role === 'GERANT') return '/gerant';
    if (role === 'STAFF') return '/staff';
    if (role === 'B2B') return '/b2b/dashboard';
    return '/menu';
  };

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
      background: scrolled ? "rgba(255, 255, 255, 0.94)" : "rgba(22, 14, 8, 0.45)",
      backdropFilter: "blur(20px)",
      boxShadow: scrolled ? "0 4px 30px rgba(234, 88, 12, 0.08)" : "none",
      transition: "all 0.35s ease",
      borderBottom: scrolled ? "1px solid rgba(234,88,12,0.12)" : "1px solid rgba(255,255,255,0.1)",
    }}>
      <KS h={3} />
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px", height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        
        {/* Brand */}
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <BrandMark size={42} shadow />
          <div>
            <span style={{ fontFamily: serif, fontWeight: 900, color: scrolled ? T.dark : "#fff", fontSize: 23, letterSpacing: "-0.02em", display: "block" }}>
              Resto d'ici
            </span>
            <span style={{ fontFamily: sans, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: scrolled ? T.accent : T.yellowL }}>
              Abidjan · Gastronomie
            </span>
          </div>
        </a>

        {/* Links */}
        <div className="hidden md:flex" style={{ gap: 32, alignItems: "center" }}>
          <a href="#catalogue" className="rd-nav-link" style={{ fontFamily: sans, fontSize: 14, color: scrolled ? T.text : "#fff", textDecoration: "none", fontWeight: 700 }}>
            Restaurants
          </a>
          <a href="/register?type=b2b" className="rd-nav-link" style={{ fontFamily: sans, fontSize: 14, color: scrolled ? T.text : "#fff", textDecoration: "none", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <Building2 size={15} color={scrolled ? T.accent : T.yellowL} /> Espace B2B
          </a>
          <a href="/aide" className="rd-nav-link" style={{ fontFamily: sans, fontSize: 14, color: scrolled ? T.text : "#fff", textDecoration: "none", fontWeight: 700 }}>
            Aide & FAQ
          </a>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <LanguageSwitcher variant={scrolled ? "light" : "dark"} />

          {user ? (
            <button
              onClick={() => navigate(getDashboardPath())}
              className="rd-btn-cta"
              style={{
                fontFamily: sans, fontSize: 13, fontWeight: 800,
                padding: "10px 22px", borderRadius: 50, cursor: "pointer",
                color: "#fff", background: "linear-gradient(135deg, #EA580C, #C2410C)",
                border: "none", display: "inline-flex", alignItems: "center", gap: 8,
                boxShadow: "0 6px 20px rgba(234,88,12,0.35)"
              }}
            >
              <User size={15} /> My Space ({role})
            </button>
          ) : (
            <>
              <a
                href="/login"
                className="rd-btn-cta"
                style={{
                  fontFamily: sans, fontSize: 13, fontWeight: 700, textDecoration: "none",
                  padding: "10px 22px", borderRadius: 50, transition: "all .22s",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  color: scrolled ? T.dark : "#fff", background: "transparent",
                  border: `1.5px solid ${scrolled ? "rgba(26,12,0,0.2)" : "rgba(255,255,255,0.4)"}`
                }}
              >
                Connexion
              </a>
              <a
                href="/register"
                className="rd-btn-cta"
                style={{
                  fontFamily: sans, fontSize: 13, fontWeight: 800, textDecoration: "none",
                  padding: "10px 22px", borderRadius: 50, transition: "all .22s",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  color: "#fff", background: "linear-gradient(135deg, #10B981, #059669)",
                  border: "none", boxShadow: "0 6px 20px rgba(16,185,129,0.35)"
                }}
              >
                S'inscrire
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

/* ─── Hero Cinematic & Flottant ─── */
function CatalogHero({ search, onSearch, resultCount, hasQuery, suggestions }) {
  const HERO_IMAGES = [
    "/hero-home.png",
    "/hero-home-2.png",
    "/hero-home-3.png"
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
      <div style={{
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
              objectPosition: "center 45%",
              filter: "contrast(1.06) brightness(1.08) saturate(1.1)",
            }}
            onError={e => {
              e.target.src = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=100&w=2400&auto=format&fit=crop";
            }}
          />
        </AnimatePresence>

        {/* Ambient Dark Overlay */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 1,
          background: "linear-gradient(180deg, rgba(22,14,8,0.18) 0%, rgba(22,14,8,0.40) 50%, rgba(22,14,8,0.78) 100%)"
        }} />

        {/* Carousel Indicators */}
        <div style={{ position: "absolute", bottom: 24, right: 36, zIndex: 10, display: "flex", gap: 8 }}>
          {HERO_IMAGES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentImgIndex(idx)}
              style={{
                width: idx === currentImgIndex ? 28 : 10,
                height: 10,
                borderRadius: 99,
                border: "none",
                background: idx === currentImgIndex ? T.yellow : "rgba(255,255,255,0.45)",
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
              }}
            />
          ))}
        </div>

        {/* Hero Content */}
        <div style={{ position: "relative", zIndex: 2, maxWidth: 900, margin: "0 auto", padding: "100px 24px 70px", width: "100%", textAlign: "center" }}>
          
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.14)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 100, padding: "8px 22px", marginBottom: 24 }}
          >
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: T.yellow, boxShadow: `0 0 12px ${T.yellow}` }} />
            <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#fff" }}>
              Abidjan · Côte d'Ivoire
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{ fontFamily: serif, fontWeight: 900, fontSize: "clamp(38px, 6.5vw, 76px)", color: "#fff", lineHeight: 1.02, letterSpacing: "-0.03em", margin: "0 0 22px", textShadow: "0 6px 30px rgba(0,0,0,0.6)" }}
          >
            Le meilleur d'Abidjan, <br />
            <em style={{ color: T.yellow, fontStyle: "italic" }}>livré à votre table.</em>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ fontFamily: sans, fontSize: "clamp(15px, 2vw, 19px)", color: "rgba(255,255,255,0.9)", lineHeight: 1.65, maxWidth: 620, margin: "0 auto 36px", fontWeight: 400 }}
          >
            Garba royal, poulet braisé, attiéké ou formules d'équipe B2B : commandez en quelques clics auprès des meilleurs restaurants d'Abidjan.
          </motion.p>

          {/* Floating Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ maxWidth: 660, margin: "0 auto 24px" }}
          >
            <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)", borderRadius: 50, padding: "6px 8px 6px 24px", boxShadow: "0 20px 60px rgba(0,0,0,0.45)", border: "1.5px solid rgba(255,255,255,0.8)" }}>
              <Search size={22} color={T.accent} style={{ flexShrink: 0 }} />
              <input
                value={search}
                onChange={e => onSearch(e.target.value)}
                placeholder="Chercher par plat (garba, attiéké, poulet…) ou restaurant…"
                style={{ border: "none", outline: "none", fontFamily: sans, fontSize: 15, color: T.text, background: "transparent", width: "100%", padding: "16px 14px", fontWeight: 600 }}
              />
              {search && (
                <button onClick={() => onSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: T.mutedL, padding: 8 }}>
                  <X size={18} />
                </button>
              )}
              <a
                href="#catalogue"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "linear-gradient(135deg, #EA580C, #C2410C)",
                  color: "#fff", fontFamily: sans, fontSize: 14, fontWeight: 800,
                  padding: "16px 28px", borderRadius: 50, textDecoration: "none",
                  whiteSpace: "nowrap", boxShadow: "0 6px 20px rgba(234,88,12,0.4)",
                  transition: "transform 0.2s"
                }}
              >
                {hasQuery ? `${resultCount} résultats` : "Trouver"} <ArrowRight size={16} />
              </a>
            </div>
          </motion.div>

          {/* Suggestions : plats disponibles les plus commandés (API). Rien
              n'est affiché tant que la liste n'est pas chargée — mieux vaut
              aucune suggestion qu'une suggestion qui ne mène nulle part. */}
          {suggestions.length > 0 && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <span style={{ fontFamily: sans, fontSize: 12, color: "rgba(255,255,255,0.65)", alignSelf: "center", fontWeight: 600 }}>
                Les plus commandés :
              </span>
              {suggestions.map(plat => (
                <button
                  key={plat.nom}
                  onClick={() => onSearch(plat.nom)}
                  title={
                    plat.totalCommande > 0
                      ? `${plat.totalCommande} fois commandé ces 90 derniers jours`
                      : "Disponible à la commande"
                  }
                  style={{
                    fontFamily: sans, fontSize: 12, fontWeight: 700, color: "#fff",
                    background: search === plat.nom ? T.accent : "rgba(255,255,255,0.16)",
                    border: "1px solid rgba(255,255,255,0.25)", borderRadius: 100,
                    padding: "6px 14px", cursor: "pointer", backdropFilter: "blur(10px)",
                    transition: "all 0.2s"
                  }}
                >
                  {plat.nom}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Trust Bar Badges at Bottom of Hero */}
        <div style={{ position: "relative", zIndex: 2, background: "rgba(22,14,8,0.75)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.1)", padding: "18px 32px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-around", flexWrap: "wrap", gap: 20 }}>
            {[
              { icon: Truck, text: "Livraison Express < 30 min", sub: "Partout à Abidjan" },
              { icon: Smartphone, text: "Paiement Mobile Instantané", sub: "Wave, Orange, MTN, Moov" },
              { icon: Building2, text: "Espace Entreprise B2B", sub: "Factures mensuelles SYSCOHADA" },
            ].map(({ icon: Icon, text, sub }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(234,88,12,0.2)", border: "1px solid rgba(234,88,12,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
  const items = [
    { Icon: Zap,             title: "Livraison Express",      text: "Vos plats chauds livrés en moins de 30 minutes, à domicile ou sur votre lieu de travail." },
    { Icon: UtensilsCrossed, title: "Gastronomie Ivoirienne", text: "Attiéké royal, garba, poulet braisé, alloco & jus naturels sélectionnés auprès des meilleurs chefs." },
    { Icon: Smartphone,      title: "Paiement Mobile Simple", text: "Payer avec Wave CI, Orange Money, MTN MoMo ou Moov Money en toute sécurité." },
  ];
  return (
    <section style={{ background: "#fff", padding: "64px 0", borderBottom: `1px solid ${T.line}` }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${T.accent}12`, border: `1px solid ${T.accent}28`, borderRadius: 100, padding: "7px 20px", marginBottom: 14 }}>
            <ShieldCheck size={14} color={T.accent} />
            <span style={{ fontFamily: sans, fontSize: 11, color: T.accent, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 800 }}>Engagements Resto d'ici</span>
          </div>
          <h2 style={{ fontFamily: serif, fontSize: "clamp(26px, 3.5vw, 40px)", color: T.dark, fontWeight: 900, margin: 0, letterSpacing: "-0.025em" }}>
            L'excellence de la restauration, <em style={{ color: T.accent, fontStyle: "italic" }}>simplifiée.</em>
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 28 }}>
          {items.map(({ Icon, title, text }) => (
            <div key={title} style={{ textAlign: "center", padding: "32px 24px", borderRadius: 24, background: T.bg, border: `1px solid ${T.line}`, transition: "transform 0.3s" }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, margin: "0 auto 20px", background: `linear-gradient(135deg, ${T.accent}18, ${T.yellow}28)`, border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={28} color={T.accent} strokeWidth={2} />
              </div>
              <h3 style={{ fontFamily: serif, fontSize: 20, color: T.dark, fontWeight: 800, margin: "0 0 10px" }}>{title}</h3>
              <p style={{ fontFamily: sans, fontSize: 14, color: T.muted, lineHeight: 1.65, margin: 0 }}>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Carte Restaurant Ultra-Stylisée ─── */
function RestaurantCard({ restaurant, idx, matched, query, onOpenResto, onOpenDish }) {
  const [hov, setHov] = useState(false);
  /* Note réelle uniquement : un restaurant sans avis n'affiche pas de note
     inventée, il est signalé comme nouveau. */
  const nbAvis = Number(restaurant.nbAvis || 0);
  const rating = nbAvis > 0 ? Number(restaurant.noteMoyenne).toFixed(1) : null;
  const time   = restaurant.deliveryTime || (20 + (idx % 4) * 5) + "–" + (30 + (idx % 4) * 5) + " min";

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: T.card, borderRadius: 24, overflow: "hidden",
        boxShadow: hov ? "0 20px 48px rgba(234, 88, 12, 0.18)" : T.shadowS,
        border: `1px solid ${hov ? T.accent : T.line}`,
        transition: "all .3s ease", display: "flex", flexDirection: "column"
      }}
    >
      {/* Cover Image */}
      <div onClick={() => onOpenResto(restaurant)} style={{ position: "relative", height: 200, overflow: "hidden", cursor: "pointer" }}>
        <img
          src={restoImg(restaurant, idx)}
          alt={restaurant.nom}
          onError={e => { e.target.src = fallbackImg(idx); }}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.5s ease", transform: hov ? "scale(1.06)" : "scale(1)" }}
        />
        
        {/* Rating Badge */}
        <div style={{ position: "absolute", top: 14, left: 14, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(8px)", borderRadius: 12, padding: "5px 12px", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 14px rgba(0,0,0,0.15)" }}>
          {rating ? (
            <>
              <Star size={14} fill={T.yellow} color={T.yellow} />
              <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 800, color: T.dark }}>{rating}</span>
              <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, color: T.muted }}>
                ({nbAvis})
              </span>
            </>
          ) : (
            <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 800, color: T.accent }}>Nouveau</span>
          )}
        </div>

        {/* Status Badge */}
        <div style={{ position: "absolute", top: 14, right: 14, background: "rgba(16, 185, 129, 0.95)", borderRadius: 10, padding: "4px 10px", color: "#fff", fontFamily: sans, fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", uppercase: true }}>
          Ouvert
        </div>
      </div>

      {/* Info Body */}
      <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", flex: 1 }}>
        <h3 onClick={() => onOpenResto(restaurant)} style={{ fontFamily: serif, fontSize: 21, color: T.dark, fontWeight: 800, margin: "0 0 6px", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {restaurant.nom}
        </h3>
        <p style={{ fontFamily: sans, fontSize: 13, color: T.muted, margin: "0 0 16px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          📍 {restaurant.adresse || restaurant.ville || "Plateau, Abidjan"}
        </p>

        {/* Matched Dishes in Search */}
        {matched && matched.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontFamily: sans, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: T.accent, margin: "0 0 8px" }}>
              Plats suggérés pour « {query} »
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${T.line}`, paddingTop: 14, marginTop: "auto" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: T.muted }}>
              <Clock size={13} /><span style={{ fontFamily: sans, fontSize: 12, fontWeight: 700 }}>{time}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Truck size={13} color="#10B981" /><span style={{ fontFamily: sans, fontSize: 12, fontWeight: 800, color: T.green }}>Livraison</span>
            </div>
          </div>
          <button
            onClick={() => onOpenResto(restaurant)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: sans, fontSize: 13, fontWeight: 800, color: T.accent, background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            Voir le menu <ArrowRight size={15} />
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
  freeDeliveryOnly, onFreeDeliveryChange,
  fastDeliveryOnly, onFastDeliveryChange,
  sortBy, onSortByChange,
  onResetFilters, activeFiltersCount,
  results, totalCount, hiddenCount, onSeeMore,
  query, onOpenResto, onOpenDish
}) {
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const sidebarCats = useMemo(() => {
    return [
      { id: "__all__", nom: "Tous les plats", count: types.reduce((acc, t) => acc + (t.count || 0), 0) },
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
              width: "100%", padding: "14px 20px", borderRadius: 16,
              background: `linear-gradient(135deg, ${T.accent}, ${T.accentD})`,
              color: "#fff", border: "none", fontFamily: sans, fontSize: 15, fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              boxShadow: "0 8px 24px rgba(234,88,12,0.3)"
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <SlidersHorizontal size={18} /> Filtrer & Trier les restaurants
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
              selectedCategory={activeType === "__all__" ? "__all__" : activeType}
              onSelectCategory={(catId) => onType(catId === "__all__" ? "__all__" : catId)}
              restaurants={restaurants}
              selectedRestaurantId={selectedRestoId}
              onSelectRestaurant={onRestoChange}
              priceRange={priceRange}
              onPriceRangeChange={onPriceRangeChange}
              minRating={minRating}
              onMinRatingChange={onMinRatingChange}
              freeDeliveryOnly={freeDeliveryOnly}
              onFreeDeliveryChange={onFreeDeliveryChange}
              fastDeliveryOnly={fastDeliveryOnly}
              onFastDeliveryChange={onFastDeliveryChange}
              sortBy={sortBy}
              onSortByChange={onSortByChange}
              onResetFilters={onResetFilters}
              activeFiltersCount={activeFiltersCount}
            />
          </div>

          {/* Restaurant Grid */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Header Result Counter */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ fontFamily: serif, fontSize: 26, color: T.dark, fontWeight: 900, margin: 0 }}>
                  {query ? `Résultats pour « ${query} »` : "Les mieux notés à Abidjan"}
                </h2>
                <p style={{ fontFamily: sans, fontSize: 13, color: T.muted, margin: "4px 0 0" }}>
                  {hiddenCount > 0
                    ? `Notre sélection de ${results.length} adresses sur ${totalCount} disponibles en livraison`
                    : `${results.length} restaurant${results.length !== 1 ? "s" : ""} disponible${results.length !== 1 ? "s" : ""} en livraison`}
                </p>
              </div>

              {activeFiltersCount > 0 && (
                <button
                  onClick={onResetFilters}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: sans, fontSize: 13, fontWeight: 700, color: T.accent, background: `${T.accent}12`, border: "none", borderRadius: 50, padding: "8px 16px", cursor: "pointer" }}
                >
                  Réinitialiser les filtres ({activeFiltersCount})
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
                <h3 style={{ fontFamily: serif, fontSize: 22, color: T.dark, fontWeight: 800, margin: "0 0 10px" }}>
                  Aucun restaurant trouvé
                </h3>
                <p style={{ fontFamily: sans, fontSize: 14, color: T.muted, maxWidth: 420, margin: "0 auto 24px" }}>
                  Essayez de modifier votre recherche ou d'effacer certains filtres pour voir d'autres établissements.
                </p>
                <button
                  onClick={onResetFilters}
                  style={{ fontFamily: sans, fontSize: 14, fontWeight: 800, color: "#fff", background: T.accent, border: "none", borderRadius: 50, padding: "12px 28px", cursor: "pointer", boxShadow: `0 6px 20px ${T.accent}44` }}
                >
                  Réinitialiser la recherche
                </button>
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
                      Voir plus de restaurants
                      <ArrowRight size={18} />
                    </button>
                    <span style={{ fontFamily: sans, fontSize: 13, color: T.muted }}>
                      {hiddenCount} autre{hiddenCount !== 1 ? "s" : ""} établissement{hiddenCount !== 1 ? "s" : ""} à découvrir
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
              style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "flex-end" }}
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
                  selectedCategory={activeType === "__all__" ? "__all__" : activeType}
                  onSelectCategory={(catId) => { onType(catId === "__all__" ? "__all__" : catId); setMobileFilterOpen(false); }}
                  restaurants={restaurants}
                  selectedRestaurantId={selectedRestoId}
                  onSelectRestaurant={(id) => { onRestoChange(id); setMobileFilterOpen(false); }}
                  priceRange={priceRange}
                  onPriceRangeChange={onPriceRangeChange}
                  minRating={minRating}
                  onMinRatingChange={onMinRatingChange}
                  freeDeliveryOnly={freeDeliveryOnly}
                  onFreeDeliveryChange={onFreeDeliveryChange}
                  fastDeliveryOnly={fastDeliveryOnly}
                  onFastDeliveryChange={onFastDeliveryChange}
                  sortBy={sortBy}
                  onSortByChange={onSortByChange}
                  onResetFilters={onResetFilters}
                  activeFiltersCount={activeFiltersCount}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ─── Banner B2B Corporate Showcase ─── */
function B2BBanner() {
  const navigate = useNavigate();
  return (
    <section style={{ background: "linear-gradient(135deg, #160E08 0%, #2A170A 100%)", padding: "80px 24px", color: "#fff", position: "relative", overflow: "hidden" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 40, position: "relative", zIndex: 2 }}>
        <div style={{ maxWidth: 620 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 100, padding: "6px 18px", marginBottom: 18 }}>
            <Building2 size={16} color={T.yellow} />
            <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.16em", color: T.yellow }}>Espace Entreprise B2B</span>
          </div>
          <h2 style={{ fontFamily: serif, fontSize: "clamp(30px, 4vw, 48px)", fontWeight: 900, lineHeight: 1.1, margin: "0 0 16px" }}>
            Commandes groupées d'équipe <br />
            <em style={{ color: T.yellow, fontStyle: "italic" }}>& Facturation mensuelle.</em>
          </h2>
          <p style={{ fontFamily: sans, fontSize: 15, color: "rgba(255,255,255,0.8)", lineHeight: 1.65, margin: "0 0 28px" }}>
            Offrez à vos collaborateurs des repas chauds sélectionnés parmi les meilleurs restaurants d'Abidjan. Facturation conforme SYSCOHADA et rapports de consommation en un clic.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <button
              onClick={() => navigate('/register?type=b2b')}
              style={{ fontFamily: sans, fontSize: 14, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg, #EA580C, #C2410C)", border: "none", borderRadius: 50, padding: "14px 32px", cursor: "pointer", boxShadow: "0 8px 24px rgba(234,88,12,0.4)" }}
            >
              Créer un compte Entreprise
            </button>
            <button
              onClick={() => navigate('/aide')}
              style={{ fontFamily: sans, fontSize: 14, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 50, padding: "14px 28px", cursor: "pointer", backdropFilter: "blur(10px)" }}
            >
              En savoir plus
            </button>
          </div>
        </div>

        {/* Feature Check Grid */}
        <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 28, padding: 32, maxWidth: 420, width: "100%" }}>
          <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 800, margin: "0 0 20px" }}>Pourquoi les entreprises choisissent Resto d'ici ?</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              "Livraison groupée ponctuelle au bureau",
              "Gestion des budgets par collaborateur",
              "Facture mensuelle SYSCOHADA certifiée",
              "Support prioritaire dédié 7j/7",
            ].map(txt => (
              <div key={txt} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: T.yellow, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Check size={14} color="#160E08" strokeWidth={3} />
                </div>
                <span style={{ fontFamily: sans, fontSize: 13.5, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{txt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Trusted Payment Logos Orbit (Inspired by reference) ─── */
function PaymentLogosBar() {
  const logos = [
    { name: "Wave", logo: waveLogo },
    { name: "Orange", logo: orangeMoneyLogo },
    { name: "MTN", logo: mtnMomoLogo },
    { name: "Moov", logo: moovMoneyLogo },
    { name: "Carte", logo: carteBancaireLogo },
  ];

  const total = logos.length;
  const orbitSize = 360; 

  return (
    <section style={{ background: "#FAFAFA", padding: "100px 24px", display: "flex", flexDirection: "column", alignItems: "center", borderBottom: `1px solid ${T.line}`, overflow: "hidden" }}>
      <div style={{ textAlign: "center", marginBottom: 60 }}>
        <h2 style={{ fontFamily: serif, fontSize: "clamp(26px, 3vw, 38px)", color: T.dark, fontWeight: 900, margin: "0 0 16px" }}>
          Paiements <em style={{ color: T.accent, fontStyle: "italic" }}>100% Sécurisés</em>
        </h2>
        <p style={{ fontFamily: sans, fontSize: 16, color: T.muted, maxWidth: 500, margin: "0 auto" }}>
          Réglez vos commandes en un clic avec vos solutions de paiement préférées.
        </p>
      </div>

      <div style={{
        position: "relative",
        width: orbitSize, height: orbitSize,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginTop: 40, marginBottom: 40
      }}>
        {/* Cercles de fond concentriques (Orbits) */}
        <div style={{ position: "absolute", width: orbitSize - 80, height: orbitSize - 80, borderRadius: "50%", border: "1px solid rgba(16, 185, 129, 0.2)", zIndex: 1 }} />
        <div style={{ position: "absolute", width: orbitSize, height: orbitSize, borderRadius: "50%", border: "1px dashed rgba(16, 185, 129, 0.4)", zIndex: 1 }} />
        <div style={{ position: "absolute", width: orbitSize + 100, height: orbitSize + 100, borderRadius: "50%", border: "1px solid rgba(16, 185, 129, 0.15)", zIndex: 1 }} />
        <div style={{ position: "absolute", width: orbitSize + 200, height: orbitSize + 200, borderRadius: "50%", border: "1px solid rgba(16, 185, 129, 0.05)", zIndex: 1 }} />

        {/* Le centre (La base de l'orbite) */}
        <div style={{
          position: "relative",
          width: 220, height: 220,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #01373A, #075E66)", // Dark teal premium
          boxShadow: "0 24px 50px rgba(1, 55, 58, 0.3), inset 0 4px 10px rgba(255,255,255,0.1)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          zIndex: 10,
          color: "#fff"
        }}>
          <div style={{ width: 64, height: 64, background: "rgba(255,255,255,0.1)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <ShieldCheck size={36} color="#fff" />
          </div>
          <span style={{ fontFamily: sans, fontSize: 18, fontWeight: 900, letterSpacing: "0.08em", color: "#fff", textTransform: "uppercase" }}>
            PAIEMENTS
          </span>
          <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
            Direct & Sécurisé
          </span>
        </div>

        {/* Conteneur de l'orbite tournante */}
        <div style={{
          position: "absolute",
          width: orbitSize, height: orbitSize,
          zIndex: 20,
          animation: "rd-orbit 35s linear infinite" // Fait tourner le grand cercle
        }}>
          {logos.map((item, i) => {
            const angle = (360 / total) * i;
            return (
              <div
                key={item.name}
                style={{
                  position: "absolute",
                  top: "50%", left: "50%",
                  width: 80, height: 80,
                  marginTop: -40, marginLeft: -40,
                  // On positionne le satellite sur le cercle de taille orbitSize
                  transform: `rotate(${angle}deg) translateX(${orbitSize / 2}px)`
                }}
              >
                {/* On annule la rotation initiale du wrapper pour que l'image soit droite */}
                <div style={{ width: "100%", height: "100%", transform: `rotate(-${angle}deg)` }}>
                  {/* On applique une rotation inversée animée pour contrer l'orbite principale */}
                  <div style={{
                    width: "100%", height: "100%",
                    background: "#fff",
                    borderRadius: 22,
                    boxShadow: "0 14px 34px rgba(0,0,0,0.12), inset 0 2px 4px rgba(255,255,255,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: 14,
                    border: "1px solid rgba(0,0,0,0.03)",
                    animation: "rd-orbit-rev 35s linear infinite",
                  }}>
                    <img src={item.logo} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "contain", dropShadow: "0 4px 6px rgba(0,0,0,0.05)" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  const [email, setEmail] = useState("");
  const [sent, setSent]   = useState(false);

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
    <footer style={{ background: T.dark, color: "#fff", padding: "70px 0 30px", borderTop: `4px solid ${T.accent}` }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 48, marginBottom: 60 }}>
          
          {/* Brand info */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <BrandMark size={40} />
              <span style={{ fontFamily: serif, fontSize: 24, fontWeight: 900, color: "#fff" }}>Resto d'ici</span>
            </div>
            <p style={{ fontFamily: sans, fontSize: 13.5, color: "rgba(255,255,255,0.65)", lineHeight: 1.65, margin: "0 0 20px" }}>
              La première plateforme gastronomique digitale dédiée à la mise en valeur des restaurants d'Abidjan et à la livraison d'équipe.
            </p>
            <KS h={3} />
          </div>

          {/* Links 1 */}
          <div>
            <h4 style={{ fontFamily: serif, fontSize: 16, fontWeight: 800, color: T.yellow, margin: "0 0 16px" }}>Navigation</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, fontFamily: sans, fontSize: 13.5, color: "rgba(255,255,255,0.7)" }}>
              <li><a href="#catalogue" style={{ color: "inherit", textDecoration: "none" }}>Catalogue Restaurants</a></li>
              <li><a href="/menu" style={{ color: "inherit", textDecoration: "none" }}>Plats & Menus</a></li>
              <li><a href="/register?type=b2b" style={{ color: "inherit", textDecoration: "none" }}>Espace Entreprise B2B</a></li>
              <li><a href="/aide" style={{ color: "inherit", textDecoration: "none" }}>Centre d'Aide & FAQ</a></li>
            </ul>
          </div>

          {/* Links 2 */}
          <div>
            <h4 style={{ fontFamily: serif, fontSize: 16, fontWeight: 800, color: T.yellow, margin: "0 0 16px" }}>Légal & Support</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, fontFamily: sans, fontSize: 13.5, color: "rgba(255,255,255,0.7)" }}>
              <li><a href="/legal" style={{ color: "inherit", textDecoration: "none" }}>Mentions Légales</a></li>
              <li><a href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>Politique de Confidentialité</a></li>
              <li><a href="/contact" style={{ color: "inherit", textDecoration: "none" }}>Contact & Partenariats</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 style={{ fontFamily: serif, fontSize: 16, fontWeight: 800, color: T.yellow, margin: "0 0 16px" }}>Offres & Nouveautés</h4>
            <p style={{ fontFamily: sans, fontSize: 13, color: "rgba(255,255,255,0.65)", margin: "0 0 14px" }}>
              Recevez les meilleures offres de restaurants d'Abidjan chaque semaine.
            </p>
            {sent ? (
              <div style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 12, padding: 12, color: "#34D399", fontFamily: sans, fontSize: 13, fontWeight: 700 }}>
                ✓ Merci ! Vous êtes bien inscrit à la newsletter.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} style={{ display: "flex", gap: 8 }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre.email@domaine.ci"
                  required
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "#fff", fontFamily: sans, fontSize: 13, outline: "none" }}
                />
                <button type="submit" style={{ padding: "10px 16px", borderRadius: 12, background: T.accent, border: "none", color: "#fff", cursor: "pointer", fontFamily: sans, fontSize: 13, fontWeight: 800 }}>
                  OK
                </button>
              </form>
            )}
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, fontFamily: sans, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          <span>Resto d'ici © 2026 · Tous droits réservés</span>
          <span>Développé avec passion à Abidjan 🇨🇮</span>
        </div>
      </div>
    </footer>
  );
}

/* ─── Composant principal Home ─── */
export default function Home() {
  const navigate = useNavigate();

  const [loading,     setLoading]     = useState(true);
  const [types,       setTypes]       = useState([]);
  const [activeType,  setActiveType]  = useState("__all__");
  const [restaurants, setRestaurants] = useState([]);
  const [search,      setSearch]      = useState("");

  const [selectedRestoId,  setSelectedRestoId]  = useState("__all__");
  const [priceRange,       setPriceRange]       = useState([0, 20000]);
  const [minRating,        setMinRating]        = useState(0);
  const [freeDeliveryOnly, setFreeDeliveryOnly] = useState(false);
  const [fastDeliveryOnly, setFastDeliveryOnly] = useState(false);
  const [sortBy,           setSortBy]           = useState("recommended");
  const [suggestions,      setSuggestions]      = useState([]);

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
        setTypes(catList.map(c => ({ nom: c.nom, count: c.articlesCount || 5 })));
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
    setPriceRange([0, 20000]);
    setMinRating(0);
    setFreeDeliveryOnly(false);
    setFastDeliveryOnly(false);
    setSortBy("recommended");
    setSearch("");
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (activeType !== "__all__") count++;
    if (selectedRestoId !== "__all__") count++;
    if (priceRange[0] > 0 || priceRange[1] < 20000) count++;
    if (minRating > 0) count++;
    if (freeDeliveryOnly) count++;
    if (fastDeliveryOnly) count++;
    if (sortBy !== "recommended") count++;
    if (search.trim()) count++;
    return count;
  }, [activeType, selectedRestoId, priceRange, minRating, freeDeliveryOnly, fastDeliveryOnly, sortBy, search]);

  const filteredResults = useMemo(() => {
    const q = search.trim().toLowerCase();

    return restaurants
      .map(r => {
        if (selectedRestoId !== "__all__" && r.id !== selectedRestoId) return null;

        /* Filtrer sur la note réelle : un restaurant sans avis ne doit pas
           passer un filtre « 4★ et plus » grâce à une note par défaut. */
        if (minRating > 0) {
          if (Number(r.nbAvis || 0) === 0) return null;
          if (Number(r.noteMoyenne || 0) < minRating) return null;
        }

        const articles = r.articles || [];
        let matchedDishes = [];

        if (q) {
          const matchRestoName = r.nom?.toLowerCase().includes(q);
          matchedDishes = articles.filter(a => a.nom?.toLowerCase().includes(q));
          if (!matchRestoName && matchedDishes.length === 0) return null;
        }

        return { restaurant: r, matchedDishes };
      })
      .filter(Boolean);
  }, [restaurants, selectedRestoId, minRating, search]);

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
  const hiddenCount    = filteredResults.length - visibleResults.length;

  const handleOpenResto = (resto) => {
    navigate(`/menu?restaurantId=${resto.id}`);
  };

  const handleOpenDish = (resto, dish) => {
    navigate(`/menu?restaurantId=${resto.id}&dishId=${dish.id}`);
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
      <Pillars />
      <PaymentLogosBar />
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
        freeDeliveryOnly={freeDeliveryOnly}
        onFreeDeliveryChange={setFreeDeliveryOnly}
        fastDeliveryOnly={fastDeliveryOnly}
        onFastDeliveryChange={setFastDeliveryOnly}
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
