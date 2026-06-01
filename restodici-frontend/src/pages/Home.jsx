import { useState, useEffect, useRef } from "react";
import { UtensilsCrossed, ArrowRight, ChevronRight, Check, Star, Menu, X } from "lucide-react";

/* ─── Tokens ─── */
const T = {
  void:    "#040201",
  deep:    "#060402",
  dark:    "#0C0A06",
  card:    "rgba(255,255,255,0.04)",
  line:    "rgba(255,255,255,0.08)",
  accent:  "#C05015",
  accentL: "#E06828",
  gold:    "#F97316",
  goldL:   "#FFAD6B",
  muted:   "rgba(255,255,255,0.45)",
  mutedD:  "rgba(255,255,255,0.25)",
  white:   "#FFFFFF",
};
const KENTE = ["#C05015", "#F97316", "#0C0A06", "#9A3E10"];
const serif = "'Playfair Display', Georgia, serif";
const sans  = "'Manrope', system-ui, sans-serif";

const CSS = `
@keyframes kfmarquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
@keyframes kforb1 { 0%,100%{transform:translate(0,0) scale(1)} 38%{transform:translate(48px,-56px) scale(1.07)} 72%{transform:translate(-28px,32px) scale(0.96)} }
@keyframes kforb2 { 0%,100%{transform:translate(0,0) scale(1)} 42%{transform:translate(-52px,44px) scale(1.05)} 68%{transform:translate(36px,-36px) scale(0.97)} }
@keyframes kforb3 { 0%,100%{transform:translate(0,0) scale(1)} 55%{transform:translate(44px,28px) scale(1.09)} }
@keyframes kfbadge { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
@keyframes kfgrain { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-2%,-2%)} 40%{transform:translate(2%,1%)} 60%{transform:translate(-1%,3%)} 80%{transform:translate(3%,-1%)} }
@keyframes kfpulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
@keyframes kfshine { 0%{background-position:200% center} 100%{background-position:-200% center} }
.rd-btn-primary:hover { transform:translateY(-2px) !important; box-shadow:0 20px 52px rgba(192,80,21,0.65), inset 0 1px 0 rgba(255,255,255,0.15) !important; }
.rd-btn-ghost:hover { background:rgba(255,255,255,0.09) !important; border-color:rgba(255,255,255,0.28) !important; color:#fff !important; }
.rd-nav-link:hover { color:#fff !important; }
.rd-feat-card:hover { background:rgba(255,255,255,0.065) !important; transform:translateY(-5px) !important; }
.rd-offer-card:hover { background:rgba(255,255,255,0.07) !important; transform:translateY(-8px) !important; }
.rd-testi-card:hover { background:rgba(255,255,255,0.07) !important; transform:translateY(-5px) !important; }
.rd-foot-link:hover { color:rgba(255,255,255,0.82) !important; }
`;

/* ─── Font & CSS injector ─── */
function FontLoader() {
  useEffect(() => {
    if (!document.getElementById("rd-fonts")) {
      const l = document.createElement("link");
      l.id = "rd-fonts"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Manrope:wght@300;400;500;600;700;800&display=swap";
      document.head.appendChild(l);
    }
    if (!document.getElementById("rd-css")) {
      const s = document.createElement("style"); s.id = "rd-css"; s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);
  return null;
}

/* ─── Scroll reveal ─── */
function Reveal({ children, delay = 0, dir = "up", dist = 44 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const MAP = { up: `translateY(${dist}px)`, left: `translateX(-${dist}px)`, right: `translateX(${dist}px)` };
    el.style.opacity = "0";
    el.style.transform = MAP[dir] || MAP.up;
    el.style.transition = `opacity .9s cubic-bezier(.22,1,.36,1) ${delay}ms, transform .9s cubic-bezier(.22,1,.36,1) ${delay}ms`;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.style.opacity = "1"; el.style.transform = "none"; obs.disconnect(); }
    }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay, dir, dist]);
  return <div ref={ref}>{children}</div>;
}

/* ─── Animated counter ─── */
function Counter({ end, pre = "", suf = "", ms = 1800 }) {
  const [v, setV] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; obs.disconnect();
      const t0 = Date.now();
      const tick = () => {
        const p = Math.min((Date.now() - t0) / ms, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setV(Math.floor(ease * end));
        if (p < 1) requestAnimationFrame(tick); else setV(end);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, ms]);
  return <span ref={ref}>{pre}{v.toLocaleString("fr-FR")}{suf}</span>;
}

/* ─── Kente strip ─── */
function KS({ h = 4 }) {
  return <div style={{ display: "flex", height: h }}>{KENTE.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}</div>;
}

/* ─── Chip label ─── */
function Chip({ children, color = T.gold }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: 100, padding: "7px 18px", marginBottom: 22 }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: color, animation: "kfpulse 2s ease-in-out infinite" }} />
      <span style={{ fontFamily: sans, fontSize: 11, color, letterSpacing: "0.17em", textTransform: "uppercase", fontWeight: 700 }}>{children}</span>
    </div>
  );
}

/* ─── Floating Nav ─── */
function FloatingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  const links = [["Fonctionnalités", "#fonctionnalites"], ["Processus", "#processus"], ["Offres", "#offres"], ["Entreprises", "/register?type=b2b"]];
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
      transition: "all 0.4s cubic-bezier(.22,1,.36,1)",
      background: scrolled ? "rgba(4,2,1,0.85)" : "transparent",
      backdropFilter: scrolled ? "blur(28px) saturate(200%)" : "none",
      borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
    }}>
      <KS h={3} />
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

        {/* Logo */}
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${T.accent}, ${T.gold})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 18px rgba(192,80,21,0.45)` }}>
            <UtensilsCrossed style={{ width: 18, height: 18, color: "#fff" }} />
          </div>
          <span style={{ fontFamily: serif, fontWeight: 700, color: "#fff", fontSize: 18, letterSpacing: "-0.01em" }}>Resto d'ici</span>
        </a>

        {/* Desktop links */}
        <div style={{ display: "flex", gap: 34, alignItems: "center" }}>
          {links.map(([l, h]) => (
            <a key={l} href={h} className="rd-nav-link" style={{ fontFamily: sans, fontSize: 14, color: T.muted, textDecoration: "none", fontWeight: 500, transition: "color .2s", letterSpacing: "0.01em" }}>{l}</a>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="/login" className="rd-nav-link" style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: T.muted, textDecoration: "none", padding: "8px 16px", transition: "color .2s" }}>Connexion</a>
          <a href="/menu" className="rd-btn-primary" style={{
            fontFamily: sans, fontSize: 13, fontWeight: 700, color: "#fff", textDecoration: "none",
            padding: "9px 22px", borderRadius: 8,
            background: `linear-gradient(135deg, ${T.accent}, ${T.accentL})`,
            boxShadow: "0 4px 20px rgba(192,80,21,0.5)",
            transition: "all .22s", letterSpacing: "0.02em",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>Commander <ArrowRight size={13} /></a>
        </div>
      </div>
    </nav>
  );
}

/* ─── Hero ─── */
function Hero() {
  return (
    <section style={{ background: T.void, minHeight: "100vh", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <KS h={3} />

      {/* Ambient orbs */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", width: 900, height: 900, borderRadius: "50%", background: "radial-gradient(circle, rgba(192,80,21,0.17) 0%, transparent 68%)", top: "-260px", left: "-260px", animation: "kforb1 20s ease-in-out infinite" }} />
        <div style={{ position: "absolute", width: 640, height: 640, borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)", top: "5%", right: "-120px", animation: "kforb2 25s ease-in-out infinite" }} />
        <div style={{ position: "absolute", width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(154,62,16,0.1) 0%, transparent 72%)", bottom: "8%", left: "38%", animation: "kforb3 18s ease-in-out infinite" }} />
      </div>

      {/* Grid pattern */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)`, backgroundSize: "64px 64px", pointerEvents: "none", zIndex: 0 }} />

      {/* Grain */}
      <div style={{
        position: "absolute", inset: "-60%", width: "220%", height: "220%",
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        opacity: 0.028, pointerEvents: "none", animation: "kfgrain 10s steps(2) infinite", zIndex: 0,
      }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, flex: 1, maxWidth: 1280, margin: "0 auto", padding: "148px 48px 100px", width: "100%", display: "grid", gridTemplateColumns: "1fr 0.88fr", gap: 72, alignItems: "center" }}>

        {/* Left */}
        <div>
          <Reveal>
            <Chip>Abidjan · Côte d'Ivoire · 2026</Chip>
          </Reveal>

          <Reveal delay={60}>
            <h1 style={{ fontFamily: serif, fontWeight: 900, fontSize: "clamp(58px, 8.8vw, 116px)", color: "#fff", lineHeight: 0.9, letterSpacing: "-0.04em", margin: "0 0 38px" }}>
              La vraie<br/>
              <span style={{ backgroundImage: `linear-gradient(135deg, ${T.accent} 30%, ${T.gold} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", fontStyle: "italic" }}>cuisine</span><br/>
              d'ici.
            </h1>
          </Reveal>

          <Reveal delay={140}>
            <p style={{ fontFamily: sans, fontSize: 18, color: "rgba(255,255,255,0.55)", lineHeight: 1.82, maxWidth: 490, margin: "0 0 50px", fontWeight: 300 }}>
              Les saveurs authentiques d'Abidjan, du menu à la livraison. Paiement Mobile Money. Pensé pour les familles et les entreprises ivoiriennes.
            </p>
          </Reveal>

          <Reveal delay={200}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 68 }}>
              <a href="/menu" className="rd-btn-primary" style={{
                padding: "17px 44px", background: `linear-gradient(135deg, ${T.accent}, ${T.accentL})`,
                color: "#fff", fontFamily: sans, fontSize: 15, fontWeight: 700, textDecoration: "none",
                borderRadius: 10, letterSpacing: "0.02em",
                boxShadow: "0 12px 42px rgba(192,80,21,0.55), inset 0 1px 0 rgba(255,255,255,0.14)",
                transition: "all .24s", display: "inline-flex", alignItems: "center", gap: 9,
              }}>Commander maintenant <ArrowRight size={15} /></a>
              <a href="/register?type=b2b" className="rd-btn-ghost" style={{
                padding: "17px 44px", border: "1px solid rgba(249,115,22,0.32)",
                color: T.gold, background: "rgba(249,115,22,0.06)",
                fontFamily: sans, fontSize: 15, fontWeight: 600, textDecoration: "none",
                borderRadius: 10, letterSpacing: "0.02em", transition: "all .24s",
                backdropFilter: "blur(10px)",
              }}>Espace Entreprise</a>
            </div>
          </Reveal>

          <Reveal delay={270}>
            <div style={{ display: "flex", paddingTop: 36, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              {[
                { n: "12 000+", l: "Clients actifs", c: T.accent },
                { n: "98%",     l: "Livraisons réussies", c: T.gold },
                { n: "< 3 min", l: "Pour commander", c: "#90D0A0" },
              ].map(({ n, l, c }, i) => (
                <div key={l} style={{ flex: 1, paddingRight: i < 2 ? 28 : 0, paddingLeft: i > 0 ? 28 : 0, borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                  <p style={{ fontFamily: serif, fontSize: "clamp(20px,2vw,28px)", color: "#fff", fontWeight: 900, margin: "0 0 5px", lineHeight: 1 }}>{n}</p>
                  <p style={{ fontFamily: sans, fontSize: 10, color: c, margin: 0, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>{l}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Right: photo composition */}
        <Reveal dir="right" delay={100}>
          <div style={{ position: "relative", height: 580 }}>

            {/* Main photo */}
            <div style={{ position: "absolute", top: 36, right: 0, width: "90%", borderRadius: 22, overflow: "hidden", boxShadow: "0 48px 120px rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=900&auto=format&fit=crop" alt="Cuisine africaine" style={{ width: "100%", height: 470, objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(4,2,1,0.1) 40%, rgba(4,2,1,0.80))" }} />
              <div style={{ position: "absolute", bottom: 26, left: 28, right: 28 }}>
                <p style={{ fontFamily: serif, fontSize: 21, color: "#fff", fontWeight: 700, fontStyle: "italic", margin: "0 0 5px" }}>Les plats d'Abidjan</p>
                <p style={{ fontFamily: sans, fontSize: 12, color: "rgba(255,255,255,0.48)", margin: 0 }}>Attiéké · Kedjenou · Garba · Aloko</p>
              </div>
            </div>

            {/* Orders badge */}
            <div style={{ position: "absolute", bottom: 20, left: 0, zIndex: 10, background: `linear-gradient(135deg, ${T.accent}, #D86018)`, borderRadius: 18, padding: "22px 28px", boxShadow: "0 24px 64px rgba(192,80,21,0.62), inset 0 1px 0 rgba(255,255,255,0.18)", animation: "kfbadge 5s ease-in-out infinite" }}>
              <p style={{ fontFamily: serif, fontSize: 42, fontWeight: 900, color: "#fff", margin: "0 0 3px", lineHeight: 1 }}><Counter end={47} suf="k" /></p>
              <p style={{ fontFamily: sans, fontSize: 10, color: "rgba(255,255,255,0.65)", margin: 0, letterSpacing: "0.14em", textTransform: "uppercase" }}>Commandes / mois</p>
            </div>

            {/* Rating badge */}
            <div style={{ position: "absolute", top: 0, left: "4%", zIndex: 10, background: "rgba(8,6,4,0.92)", backdropFilter: "blur(16px)", border: `1px solid ${T.gold}30`, borderRadius: 14, padding: "14px 20px", animation: "kfbadge 6s ease-in-out infinite 1.2s" }}>
              <div style={{ display: "flex", gap: 3, marginBottom: 5 }}>
                {[1,2,3,4,5].map(s => <span key={s} style={{ color: T.gold, fontSize: 13 }}>★</span>)}
              </div>
              <p style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>4.9 / 5</p>
              <p style={{ fontFamily: sans, fontSize: 11, color: "rgba(255,255,255,0.38)", margin: 0 }}>Note moyenne</p>
            </div>

            {/* Payment badge */}
            <div style={{ position: "absolute", top: 130, left: "-10%", zIndex: 10, background: "rgba(8,6,4,0.92)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "12px 18px", animation: "kfbadge 7s ease-in-out infinite 2.4s" }}>
              <p style={{ fontFamily: sans, fontSize: 10, color: "rgba(255,255,255,0.42)", margin: "0 0 7px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Paiement mobile</p>
              <div style={{ display: "flex", gap: 6 }}>
                {[["🟠","OM"],["🟡","MTN"],["🔵","Wave"]].map(([e,n],i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{e}</div>
                    <span style={{ fontFamily: sans, fontSize: 9, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>{n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Marquee ─── */
function Marquee() {
  const items = ["Attiéké Poisson Braisé","Alloco Poulet Grillé","Kedjenou de Poulet","Garba au Thon Frais","Foutou Sauce Graine","Riz Gras Sauté","Soupe Kandia","Placali & Sauce Graine","Aloko & Poisson Fumé","Brochettes Bœuf","Tchep au Crabe","Fufu Sauce Gombo","Poulet Yassa","Mafé Mouton","Capitaine Frit"];
  return (
    <div style={{ background: "#090604", overflow: "hidden", padding: "20px 0", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", position: "relative" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: `linear-gradient(to bottom, ${T.accent}, ${T.gold})` }} />
      <div style={{ display: "flex", animation: "kfmarquee 60s linear infinite", width: "max-content" }}>
        {[...items, ...items].map((d, i) => (
          <span key={i} style={{ fontFamily: serif, fontSize: 16, color: "rgba(255,255,255,0.5)", fontStyle: "italic", whiteSpace: "nowrap", padding: "0 38px" }}>
            {d}&nbsp;<span style={{ color: T.accent, opacity: 0.65 }}>◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Trust bar ─── */
function TrustBar() {
  const pays = [
    { e: "🟠", n: "Orange Money", bg: "rgba(249,140,0,0.12)", bd: "rgba(249,140,0,0.2)" },
    { e: "🟡", n: "MTN MoMo",     bg: "rgba(255,204,0,0.09)", bd: "rgba(255,204,0,0.18)" },
    { e: "🔵", n: "Wave",         bg: "rgba(40,140,255,0.09)", bd: "rgba(40,140,255,0.18)" },
    { e: "💳", n: "Carte bancaire",bg: "rgba(80,200,120,0.08)", bd: "rgba(80,200,120,0.16)" },
    { e: "💵", n: "Espèces",      bg: "rgba(255,255,255,0.04)", bd: "rgba(255,255,255,0.09)" },
  ];
  return (
    <div style={{ background: "#07050300", padding: "28px 48px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <p style={{ fontFamily: sans, fontSize: 11, color: "rgba(255,255,255,0.28)", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600 }}>Paiements acceptés</p>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          {pays.map(p => (
            <div key={p.n} style={{ display: "flex", alignItems: "center", gap: 8, background: p.bg, border: `1px solid ${p.bd}`, borderRadius: 10, padding: "8px 14px" }}>
              <span style={{ fontSize: 15 }}>{p.e}</span>
              <span style={{ fontFamily: sans, fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>{p.n}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2ECC71", boxShadow: "0 0 10px rgba(46,204,113,0.8)" }} />
          <span style={{ fontFamily: sans, fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>Transactions sécurisées</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Features ─── */
function Features() {
  const feats = [
    { n:"01", icon:"🎯", title:"QR Code Table",      body:"Scannez depuis votre table et commandez en 3 clics. Zéro téléchargement, zéro attente. La restauration réinventée pour l'ère mobile.", col:T.accent, g:"rgba(192,80,21,0.14)" },
    { n:"02", icon:"⚡", title:"Mobile Money Natif",  body:"Orange Money, MTN MoMo, Wave — validation en moins de 5 secondes. Intégration directe avec les opérateurs locaux.", col:T.gold, g:"rgba(249,115,22,0.14)" },
    { n:"03", icon:"📡", title:"KDS Temps Réel",      body:"Chaque étape de la préparation s'affiche en direct. De la cuisine à la table, vous savez exactement où en est votre commande.", col:"#E05580", g:"rgba(224,85,128,0.12)" },
    { n:"04", icon:"📊", title:"Dashboard Gérant",    body:"Stocks, trésorerie, KPIs sur un seul écran. Exports SYSCOHADA conformes, rapports PDF et facturation automatisée inclus.", col:"#60C080", g:"rgba(96,192,128,0.12)" },
  ];
  return (
    <section id="fonctionnalites" style={{ background: "#0A0806", padding: "140px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 48px" }}>
        <Reveal>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 80, flexWrap: "wrap", gap: 24 }}>
            <div>
              <Chip color={T.gold}>Pourquoi Resto d'ici</Chip>
              <h2 style={{ fontFamily: serif, fontSize: "clamp(36px,4.5vw,64px)", color: "#fff", fontWeight: 900, lineHeight: 1.04, margin: 0, letterSpacing: "-0.03em" }}>
                Pensé pour <em style={{ color: T.accent }}>l'Afrique</em>.
              </h2>
            </div>
            <a href="/menu" style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: T.gold, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, border: `1px solid ${T.gold}30`, borderRadius: 9, padding: "11px 20px", background: `${T.gold}08`, transition: "background .2s" }}>
              Voir le menu <ChevronRight size={15} />
            </a>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
          {feats.map((f, i) => (
            <Reveal key={f.n} delay={i * 75}>
              <div className="rd-feat-card" style={{ position: "relative", padding: "52px 44px", overflow: "hidden", background: T.card, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 2, cursor: "default", transition: "all .35s" }}>
                {/* Glow */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 220, background: `radial-gradient(ellipse at 25% 0%, ${f.g} 0%, transparent 65%)`, pointerEvents: "none" }} />
                {/* Top border */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(to right, ${f.col}, transparent 60%)` }} />

                <div style={{ position: "relative" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30 }}>
                    <div style={{ width: 58, height: 58, borderRadius: 16, background: f.g, border: `1px solid ${f.col}28`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{f.icon}</div>
                    <span style={{ fontFamily: sans, fontSize: 12, color: "rgba(255,255,255,0.18)", fontWeight: 700, letterSpacing: "0.07em" }}>{f.n}</span>
                  </div>
                  <h3 style={{ fontFamily: serif, fontSize: 26, color: "#fff", fontWeight: 700, margin: "0 0 14px", letterSpacing: "-0.015em" }}>{f.title}</h3>
                  <p style={{ fontFamily: sans, fontSize: 15, color: "rgba(255,255,255,0.44)", lineHeight: 1.78, margin: 0, fontWeight: 300 }}>{f.body}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 28 }}>
                    <span style={{ fontFamily: sans, fontSize: 13, color: f.col, fontWeight: 600 }}>En savoir plus</span>
                    <ChevronRight size={13} color={f.col} />
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How it works ─── */
function HowItWorks() {
  const steps = [
    { n:"01", icon:"📱", title:"Ouvrez le menu",       body:"QR Code de table ou lien direct. Aucune installation. Fonctionne sur tous les appareils en moins de 2 secondes.", col:T.accent },
    { n:"02", icon:"🛒", title:"Composez votre panier", body:"Parcourez, personnalisez, ajoutez des suppléments. Votre panier est synchronisé en temps réel avec la cuisine.", col:T.gold },
    { n:"03", icon:"💸", title:"Payez en Mobile Money", body:"3 clics via Orange Money, MTN ou Wave. Reçu SYSCOHADA automatiquement envoyé par email dans les 10 secondes.", col:"#A0D0A0" },
    { n:"04", icon:"🔔", title:"Suivez en direct",     body:"Chaque étape s'affiche : reçue, confirmée, en préparation, prête. Vous savez exactement où en est votre repas.", col:"#80B0FF" },
  ];
  return (
    <section id="processus" style={{ background: T.void, padding: "140px 0", position: "relative" }}>
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 1100, height: 700, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(192,80,21,0.06) 0%, transparent 66%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", padding: "0 48px" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 96 }}>
            <Chip color={T.accent}>Processus simplifié</Chip>
            <h2 style={{ fontFamily: serif, fontSize: "clamp(36px,4.5vw,60px)", color: "#fff", fontWeight: 900, lineHeight: 1.05, margin: 0, letterSpacing: "-0.03em" }}>
              Commander en <em style={{ color: T.accent }}>4 étapes.</em>
            </h2>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, position: "relative" }}>
          {/* Connector */}
          <div style={{ position: "absolute", top: 50, left: "12.5%", right: "12.5%", height: 1, background: `linear-gradient(to right, ${T.accent}, ${T.gold}, rgba(160,208,160,0.8), rgba(128,176,255,0.8))`, pointerEvents: "none", zIndex: 0 }} />

          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 95}>
              <div style={{ textAlign: "center", position: "relative", zIndex: 1, padding: "0 12px" }}>
                <div style={{ width: 84, height: 84, borderRadius: "50%", background: `${s.col}14`, border: `2px solid ${s.col}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 28px", boxShadow: `0 0 0 8px ${s.col}07, 0 10px 36px rgba(0,0,0,0.35)`, transition: "all .3s" }}>{s.icon}</div>
                <span style={{ fontFamily: sans, fontSize: 11, color: s.col, letterSpacing: "0.14em", fontWeight: 700, display: "block", marginBottom: 9 }}>{s.n}</span>
                <h3 style={{ fontFamily: serif, fontSize: 20, color: "#fff", fontWeight: 700, margin: "0 0 12px" }}>{s.title}</h3>
                <p style={{ fontFamily: sans, fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.72, margin: 0, fontWeight: 300 }}>{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Food showcase ─── */
function FoodCard({ photo, title, tag, large }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ position: "relative", borderRadius: 16, overflow: "hidden", cursor: "pointer", height: large ? "100%" : "auto", ...(large ? { gridRow: "1 / 3" } : {}), background: "#0D0A07" }}
    >
      <img
        src={`https://images.unsplash.com/${photo}?q=80&w=${large ? 600 : 500}&auto=format&fit=crop`}
        alt={title}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform .6s cubic-bezier(.22,1,.36,1)", transform: hov ? "scale(1.07)" : "scale(1)" }}
      />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 35%, rgba(4,2,1,0.92))" }} />
      <div style={{ position: "absolute", inset: 0, background: `rgba(192,80,21,0.22)`, opacity: hov ? 1 : 0, transition: "opacity .3s" }} />
      <div style={{ position: "absolute", bottom: 20, left: 20, right: 20 }}>
        <span style={{ fontFamily: sans, fontSize: 10, color: T.gold, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 5 }}>{tag}</span>
        <p style={{ fontFamily: serif, fontSize: large ? 23 : 17, color: "#fff", fontWeight: 700, margin: 0, lineHeight: 1.25 }}>{title}</p>
      </div>
    </div>
  );
}

function FoodShowcase() {
  const photos = [
    { photo: "photo-1565299585323-38d6b0865b47", title: "Attiéké Barracuda", tag: "Spécialité du jour", large: true },
    { photo: "photo-1567620905732-2d1ec7ab7445", title: "Plats traditionnels", tag: "Fait maison" },
    { photo: "photo-1540189549336-e6e99c3679fe", title: "Légumes & Fraîcheur", tag: "Saisonnier" },
    { photo: "photo-1555939594-58d7cb561ad1", title: "Grillades Maison", tag: "Au charbon" },
    { photo: "photo-1512058564366-18510be2db19", title: "Riz & Accompagnements", tag: "Classique ivoirien" },
    { photo: "photo-1565958011703-44f9829ba187", title: "Desserts maison", tag: "Fait maison" },
  ];
  return (
    <section style={{ background: "#060402", paddingBottom: 120 }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "120px 48px 0" }}>
        <Reveal>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 52, flexWrap: "wrap", gap: 20 }}>
            <div>
              <Chip color={T.gold}>Au menu aujourd'hui</Chip>
              <h2 style={{ fontFamily: serif, fontSize: "clamp(34px,4vw,56px)", color: "#fff", fontWeight: 900, lineHeight: 1.06, margin: 0, letterSpacing: "-0.03em" }}>
                Des saveurs qui<br/><em style={{ color: T.gold }}>vous transportent.</em>
              </h2>
            </div>
            <a href="/menu" className="rd-btn-primary" style={{ fontFamily: sans, fontSize: 14, fontWeight: 700, color: "#fff", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accentL})`, borderRadius: 10, padding: "13px 26px", boxShadow: "0 8px 28px rgba(192,80,21,0.45)", transition: "all .22s" }}>
              Voir tout le menu <ArrowRight size={15} />
            </a>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "280px 280px", gap: 12 }}>
          {photos.map((p, i) => (
            <Reveal key={p.photo} delay={i * 55}>
              <FoodCard {...p} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Dual offer ─── */
function DualOffer() {
  const cards = [
    {
      tag: "GRAND PUBLIC", tagBg: T.accent, tagCol: "#fff", topCol: T.accent,
      title: "Pour toute la famille",
      sub: "Commandez, payez, profitez.",
      img: "photo-1567620905732-2d1ec7ab7445",
      perks: ["Menu dynamique & QR Code table","Paiement Orange · MTN · Wave","Suivi commande temps réel","Reçu SYSCOHADA par email"],
      perkCol: T.accent,
      cta: "Commander maintenant", ctaBg: `linear-gradient(135deg, ${T.accent}, ${T.accentL})`, ctaCol: "#fff",
      href: "/menu", shadow: "0 10px 28px rgba(192,80,21,0.45)",
    },
    {
      tag: "ENTREPRISE", tagBg: T.gold, tagCol: T.dark, topCol: T.gold,
      title: "Pour vos équipes",
      sub: "Gérez, facturez, conformez.",
      img: "photo-1600880292203-757bb62b4baf",
      perks: ["Commandes groupées 50+ repas","Facturation mensuelle consolidée","Budgets par collaborateur","Conformité TVA 18% & SYSCOHADA"],
      perkCol: T.gold,
      cta: "Créer un compte Entreprise →", ctaBg: `linear-gradient(135deg, ${T.gold}, #F8A020)`, ctaCol: T.dark,
      href: "/register?type=b2b", shadow: "0 10px 28px rgba(249,115,22,0.38)",
    },
  ];
  return (
    <section id="offres" style={{ background: T.void, padding: "140px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 48px" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 80 }}>
            <Chip color={T.gold}>Deux mondes, une solution</Chip>
            <h2 style={{ fontFamily: serif, fontSize: "clamp(36px,4vw,60px)", color: "#fff", fontWeight: 900, lineHeight: 1.05, margin: 0, letterSpacing: "-0.03em" }}>
              Particuliers & <em style={{ color: T.accent }}>Entreprises</em>
            </h2>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
          {cards.map((c, i) => (
            <Reveal key={c.tag} dir={i === 0 ? "left" : "right"} delay={i * 110}>
              <div className="rd-offer-card" style={{ borderRadius: 20, overflow: "hidden", background: T.card, border: "1px solid rgba(255,255,255,0.08)", borderTop: `2px solid ${c.topCol}`, transition: "all .35s" }}>
                <div style={{ height: 286, overflow: "hidden", position: "relative" }}>
                  <img src={`https://images.unsplash.com/${c.img}?q=80&w=800&auto=format&fit=crop`} alt={c.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 22%, rgba(4,2,1,0.94))" }} />
                  <div style={{ position: "absolute", bottom: 24, left: 28, right: 28 }}>
                    <span style={{ display: "inline-block", background: c.tagBg, color: c.tagCol, fontFamily: sans, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", padding: "5px 14px", borderRadius: 20, marginBottom: 10 }}>{c.tag}</span>
                    <p style={{ fontFamily: serif, fontSize: 26, fontWeight: 700, color: "#fff", fontStyle: "italic", margin: "0 0 4px" }}>{c.title}</p>
                    <p style={{ fontFamily: sans, fontSize: 13, color: "rgba(255,255,255,0.44)", margin: 0 }}>{c.sub}</p>
                  </div>
                </div>
                <div style={{ padding: "30px 28px 36px" }}>
                  {c.perks.map(p => (
                    <div key={p} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 13 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${c.perkCol}16`, border: `1px solid ${c.perkCol}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Check size={11} color={c.perkCol} strokeWidth={2.5} />
                      </div>
                      <span style={{ fontFamily: sans, fontSize: 14, color: "rgba(255,255,255,0.62)" }}>{p}</span>
                    </div>
                  ))}
                  <a href={c.href} style={{ display: "block", marginTop: 26, padding: "15px 0", textAlign: "center", background: c.ctaBg, color: c.ctaCol, fontFamily: sans, fontSize: 14, fontWeight: 700, textDecoration: "none", borderRadius: 10, boxShadow: c.shadow, transition: "all .22s", letterSpacing: "0.01em" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}>{c.cta}</a>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Stats band ─── */
function StatsBand() {
  const stats = [
    { n:12000, pre:"+", suf:"",    l:"Clients actifs",      c:T.accent },
    { n:98,    pre:"",  suf:"%",   l:"Taux de livraison",   c:T.gold },
    { n:47,    pre:"",  suf:"k",   l:"Commandes ce mois",   c:"#80C8A0" },
    { n:4,     pre:"",  suf:" min",l:"Délai moyen",          c:"#80B0FF" },
  ];
  return (
    <section style={{ background: T.dark, position: "relative", overflow: "hidden" }}>
      <KS h={4} />
      <div style={{ padding: "100px 0", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", padding: "0 48px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          {stats.map((s, i) => (
            <Reveal key={s.l} delay={i * 80}>
              <div style={{ textAlign: "center", padding: "0 30px", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                <p style={{ fontFamily: serif, fontSize: "clamp(46px,5vw,74px)", fontWeight: 900, color: "#fff", margin: "0 0 10px", lineHeight: 1 }}>
                  {s.pre}<Counter end={s.n} />{s.suf}
                </p>
                <div style={{ width: 30, height: 2, background: s.c, margin: "0 auto 12px", borderRadius: 1 }} />
                <p style={{ fontFamily: sans, fontSize: 11, color: s.c, margin: 0, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>{s.l}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <KS h={4} />
    </section>
  );
}

/* ─── Testimonials ─── */
function Testimonials() {
  const items = [
    { q:"Le QR Code table a transformé notre service. Moins d'erreurs, clients ravis. Notre CA a progressé de 23% en 3 mois.", name:"Koffi Jean-Claude", role:"Gérant — Le Wôrôwôrô, Cocody", ini:"KJ", c:T.accent },
    { q:"Facturation consolidée pour 50 collaborateurs, charge administrative divisée par deux. Conformité SYSCOHADA impeccable.", name:"Aminata Touré", role:"Directrice RH — TechCI Abidjan", ini:"AT", c:T.gold },
    { q:"Payer avec Wave et suivre ma commande en direct. Simple, instantané. Je ne commande plus autrement depuis 6 mois.", name:"Marc Kouassi", role:"Client fidèle — Yopougon", ini:"MK", c:"#80C8A0" },
  ];
  return (
    <section style={{ background: "#0A0806", padding: "140px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 48px" }}>
        <Reveal>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 72, flexWrap: "wrap", gap: 24 }}>
            <div>
              <Chip color={T.gold}>Ils nous font confiance</Chip>
              <h2 style={{ fontFamily: serif, fontSize: "clamp(34px,4vw,56px)", color: "#fff", fontWeight: 900, lineHeight: 1.08, margin: 0, letterSpacing: "-0.03em" }}>
                La voix de la<br/><em style={{ color: T.accent }}>communauté.</em>
              </h2>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "flex", gap: 3, justifyContent: "flex-end", marginBottom: 5 }}>
                {[1,2,3,4,5].map(s => <span key={s} style={{ color: T.gold, fontSize: 20 }}>★</span>)}
              </div>
              <p style={{ fontFamily: sans, fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 3px" }}>4.9 / 5</p>
              <p style={{ fontFamily: sans, fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>Basé sur 2 400+ avis</p>
            </div>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
          {items.map((t, i) => (
            <Reveal key={t.name} delay={i * 100}>
              <div className="rd-testi-card" style={{ background: T.card, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "40px 34px", display: "flex", flexDirection: "column", transition: "all .35s", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${t.c}, transparent 55%)` }} />
                {/* Big quote */}
                <div style={{ fontFamily: serif, fontSize: 90, color: `${t.c}1A`, lineHeight: 0.55, marginBottom: 22, fontWeight: 900, userSelect: "none" }}>"</div>
                <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
                  {[1,2,3,4,5].map(s => <Star key={s} size={14} fill={T.gold} color={T.gold} />)}
                </div>
                <p style={{ fontFamily: serif, fontSize: 17, color: "rgba(255,255,255,0.75)", lineHeight: 1.72, fontStyle: "italic", margin: "0 0 auto", fontWeight: 400 }}>"{t.q}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 14, paddingTop: 26, marginTop: 26, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${t.c}1C`, border: `2px solid ${t.c}38`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, color: t.c }}>{t.ini}</span>
                  </div>
                  <div>
                    <p style={{ fontFamily: sans, fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 3px" }}>{t.name}</p>
                    <p style={{ fontFamily: sans, fontSize: 12, color: "rgba(255,255,255,0.36)", margin: 0 }}>{t.role}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ─── */
function CTA() {
  return (
    <section style={{ background: T.void, padding: "160px 48px", position: "relative", overflow: "hidden" }}>
      <KS h={3} />
      {/* Orbs */}
      <div style={{ position: "absolute", left: "50%", top: "55%", transform: "translate(-50%,-50%)", width: 1400, height: 700, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(192,80,21,0.13) 0%, transparent 62%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", right: -250, bottom: -200, width: 900, height: 900, borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 65%)", pointerEvents: "none" }} />
      {/* Ghost letter */}
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-60%,-58%)", fontFamily: serif, fontSize: "58vw", fontWeight: 900, color: "rgba(255,255,255,0.014)", lineHeight: 1, pointerEvents: "none", userSelect: "none" }}>R</div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 820, margin: "0 auto", textAlign: "center" }}>
        <Reveal>
          <Chip color={T.gold}>Rejoindre la plateforme</Chip>
          <h2 style={{ fontFamily: serif, fontSize: "clamp(46px,7.5vw,100px)", color: "#fff", fontWeight: 900, lineHeight: 0.97, margin: "0 0 28px", letterSpacing: "-0.04em" }}>
            Prêt à<br/>commander<br/>
            <span style={{ backgroundImage: `linear-gradient(135deg, ${T.accent} 0%, ${T.gold} 100%)`, backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", fontStyle: "italic", animation: "kfshine 4s linear infinite" }}>maintenant&nbsp;?</span>
          </h2>
          <p style={{ fontFamily: sans, fontSize: 18, color: "rgba(255,255,255,0.44)", lineHeight: 1.82, margin: "0 auto 56px", fontWeight: 300, maxWidth: 520 }}>
            Rejoignez des milliers de clients et de restaurateurs sur la première plateforme de restauration digitale de Côte d'Ivoire.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/menu" className="rd-btn-primary" style={{ padding: "18px 58px", background: `linear-gradient(135deg, ${T.accent}, ${T.accentL})`, color: "#fff", fontFamily: sans, fontSize: 15, fontWeight: 700, textDecoration: "none", borderRadius: 12, boxShadow: "0 14px 44px rgba(192,80,21,0.55), inset 0 1px 0 rgba(255,255,255,0.14)", transition: "all .24s", display: "inline-flex", alignItems: "center", gap: 9 }}>
              Explorer le Menu <ArrowRight size={16} />
            </a>
            <a href="/register" className="rd-btn-ghost" style={{ padding: "18px 58px", border: "1px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)", fontFamily: sans, fontSize: 15, fontWeight: 600, textDecoration: "none", borderRadius: 12, transition: "all .24s" }}>
              Devenir Partenaire
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  const cols = [
    { t:"Plateforme",    ls:[["Menu","/menu"],["Connexion","/login"],["Inscription","/register"],["Espace B2B","/register?type=b2b"]] },
    { t:"Restaurateurs", ls:[["Interface Gérant","#"],["Gestion Stocks","#"],["Trésorerie & PDF","#"],["KDS Cuisine","#"]] },
    { t:"Contact",       ls:[["Abidjan, Cocody","#"],["+225 07 00 00 00","#"],["contact@restodici.ci","#"],["Support 24/7","#"]] },
  ];
  return (
    <footer style={{ background: "#030100", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <KS h={3} />
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "76px 48px 42px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 56, marginBottom: 60 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${T.accent}, ${T.gold})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px rgba(192,80,21,0.42)" }}>
                <UtensilsCrossed style={{ width: 20, height: 20, color: "#fff" }} />
              </div>
              <span style={{ fontFamily: serif, fontWeight: 700, color: "#fff", fontSize: 18 }}>Resto d'ici</span>
            </div>
            <p style={{ fontFamily: sans, fontSize: 14, color: "rgba(255,255,255,0.32)", lineHeight: 1.85, maxWidth: 265, fontWeight: 300, margin: "0 0 22px" }}>La plateforme digitale qui modernise la restauration en Afrique de l'Ouest.</p>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {[["🟠","Orange Money"],["🟡","MTN MoMo"],["🔵","Wave"]].map(([e,n]) => (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "5px 9px", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span style={{ fontSize: 12 }}>{e}</span>
                  <span style={{ fontFamily: sans, fontSize: 11, color: "rgba(255,255,255,0.36)" }}>{n}</span>
                </div>
              ))}
            </div>
          </div>
          {cols.map(c => (
            <div key={c.t}>
              <p style={{ fontFamily: sans, fontSize: 11, color: T.gold, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 20, fontWeight: 700 }}>{c.t}</p>
              {c.ls.map(([l, h]) => (
                <a key={l} href={h} className="rd-foot-link" style={{ display: "block", fontFamily: sans, fontSize: 14, color: "rgba(255,255,255,0.33)", textDecoration: "none", margin: "0 0 12px", fontWeight: 300, transition: "color .2s" }}>{l}</a>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 26, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 3 }}>{KENTE.map((c, i) => <div key={i} style={{ width: 26, height: 3, background: c }} />)}</div>
          <p style={{ fontFamily: sans, fontSize: 12, color: "rgba(255,255,255,0.2)", margin: 0 }}>© 2026 Resto d'ici — Tous droits réservés.</p>
          <p style={{ fontFamily: sans, fontSize: 12, color: "rgba(255,255,255,0.2)", margin: 0 }}>Développé par <span style={{ color: T.gold, opacity: 0.65 }}>Sankofa-Lab × Novasend</span></p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ─── */
export default function Home() {
  return (
    <div style={{ background: T.void, minHeight: "100vh", color: "#fff", overflowX: "hidden" }}>
      <FontLoader />
      <FloatingNav />
      <Hero />
      <Marquee />
      <TrustBar />
      <Features />
      <HowItWorks />
      <FoodShowcase />
      <DualOffer />
      <StatsBand />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
}
