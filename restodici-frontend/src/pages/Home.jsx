import { useState, useEffect, useRef } from "react";
import { UtensilsCrossed } from "lucide-react";

/* ─── Palette ─── */
const T = {
  bg:      "#FBF6EE",
  surface: "#F2E8D4",
  dark:    "#0F0D09",
  card:    "#FFFCF8",
  line:    "rgba(140,90,40,0.14)",
  accent:  "#C05015",
  gold:    "#F97316",
  green:   "#9A3E10",
  greenL:  "#EAF5EE",
  muted:   "#6B5A48",
  white:   "#FFFFFF",
};

const KENTE = ["#C05015", "#F97316", "#0F0D09", "#9A3E10"];
const serif = "'Playfair Display', Georgia, serif";
const sans  = "'Manrope', 'DM Sans', system-ui, sans-serif";

const DIAMOND_BG = {
  backgroundImage: `
    linear-gradient(45deg, rgba(197,138,85,0.07) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(197,138,85,0.07) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(197,138,85,0.07) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(197,138,85,0.07) 75%)
  `,
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
};

/* ─── Font Loader ─── */
function FontLoader() {
  useEffect(() => {
    if (document.getElementById("rd-fonts")) return;
    const l = document.createElement("link");
    l.id   = "rd-fonts";
    l.rel  = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Manrope:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap";
    document.head.appendChild(l);
  }, []);
  return null;
}

/* ─── Scroll reveal ─── */
function Reveal({ children, delay = 0, dir = "up" }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const map = { up: "translateY(40px)", left: "translateX(-40px)", right: "translateX(40px)" };
    el.style.opacity    = "0";
    el.style.transform  = map[dir] || map.up;
    el.style.transition = `opacity 0.8s ease ${delay}ms, transform 0.8s ease ${delay}ms`;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.style.opacity = "1"; el.style.transform = "none"; obs.disconnect(); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return <div ref={ref}>{children}</div>;
}

/* ─── Animated counter ─── */
function Counter({ end, suffix = "", prefix = "" }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let n = 0;
      const step = end / (1600 / 16);
      const tick = () => { n += step; if (n >= end) { setVal(end); return; } setVal(Math.floor(n)); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [end]);
  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

/* ─── Kente 4-color strip ─── */
function KenteStrip({ height = 6 }) {
  return (
    <div style={{ display: "flex", height }}>
      {KENTE.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
    </div>
  );
}

/* ─── Kente label decorator ─── */
function KenteLabel({ children, color = T.gold }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
      <div style={{ display: "flex", height: 3, gap: 2 }}>
        {KENTE.map((c, i) => <div key={i} style={{ width: 18, background: c }} />)}
      </div>
      <span style={{ fontFamily: sans, fontSize: 11, color, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>{children}</span>
    </div>
  );
}

/* ─── Food ticker marquee ─── */
function Marquee() {
  const items = [
    "Attiéké Poisson Braisé", "Alloco Poulet Grillé", "Kedjenou de Poulet",
    "Garba au Thon Frais", "Foutou Sauce Graine", "Riz Gras Sauté",
    "Soupe Kandia", "Bangui & Placali", "Aloko & Poisson Fumé",
    "Brochettes Bœuf Pimentées", "Tchep au Crabe", "Fufu Sauce Gombo",
    "Poulet Yassa", "Mafé Mouton", "Capitaine Frit",
  ];
  const doubled = [...items, ...items];
  return (
    <div style={{ background: T.dark, overflow: "hidden", padding: "18px 0", position: "relative" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: T.accent }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 5, background: T.gold }} />
      <style>{`@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
      <div style={{ display: "flex", animation: "marquee 50s linear infinite", width: "max-content" }}>
        {doubled.map((d, i) => (
          <span key={i} style={{ fontFamily: serif, fontSize: 16, color: T.white, fontStyle: "italic", whiteSpace: "nowrap", padding: "0 36px" }}>
            {d}&nbsp;<span style={{ color: T.gold }}>◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Hero ─── */
function Hero() {
  return (
    <section style={{ background: T.dark, minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>

      <KenteStrip height={6} />

      {/* Background food image */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2000&auto=format&fit=crop')",
        backgroundSize: "cover", backgroundPosition: "center 40%",
        opacity: 0.32,
      }} />

      {/* Dark gradients */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(15,13,9,0.97) 45%, rgba(15,13,9,0.25) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(15,13,9,0.85) 0%, transparent 55%)" }} />

      {/* Subtle diamond pattern */}
      <div style={{ position: "absolute", inset: 0, ...DIAMOND_BG, opacity: 0.5 }} />

      {/* Left kente accent bar */}
      <div style={{ position: "absolute", left: 0, top: 6, bottom: 0, width: 4, background: `linear-gradient(to bottom, ${T.accent} 60%, ${T.gold})` }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, flex: 1, maxWidth: 1280, margin: "0 auto", padding: "120px 48px 100px", width: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>

        <Reveal>
          <KenteLabel color={T.gold}>Abidjan · Côte d'Ivoire · 2026</KenteLabel>
        </Reveal>

        <Reveal delay={80}>
          <h1 style={{ fontFamily: serif, fontWeight: 900, fontSize: "clamp(58px, 9.5vw, 124px)", color: T.white, lineHeight: 0.91, letterSpacing: "-0.03em", margin: "0 0 44px" }}>
            La vraie<br/>
            <span style={{ color: T.accent, fontStyle: "italic" }}>cuisine</span><br/>
            d'ici.
          </h1>
        </Reveal>

        <Reveal delay={180}>
          <p style={{ fontFamily: sans, fontSize: 18, color: "rgba(255,255,255,0.72)", lineHeight: 1.75, maxWidth: 520, margin: "0 0 52px", fontWeight: 300 }}>
            Les saveurs authentiques d'Abidjan, du menu à la livraison. Paiement Mobile Money. Pensé pour les familles et les entreprises ivoiriennes.
          </p>
        </Reveal>

        <Reveal delay={260}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 72 }}>
            <a href="/menu" style={{
              padding: "18px 44px", background: T.accent, color: T.white,
              fontFamily: sans, fontSize: 15, fontWeight: 700, textDecoration: "none",
              borderRadius: 4, letterSpacing: "0.02em",
              boxShadow: "0 10px 36px rgba(224,78,26,0.50)",
            }}>Commander maintenant</a>
            <a href="/register?type=b2b" style={{
              padding: "18px 44px", border: "1px solid rgba(197,138,85,0.45)",
              color: T.gold, background: "transparent",
              fontFamily: sans, fontSize: 15, fontWeight: 600, textDecoration: "none",
              borderRadius: 4, letterSpacing: "0.02em",
            }}>Espace Entreprise →</a>
          </div>
        </Reveal>

        {/* Stats row */}
        <Reveal delay={340}>
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap", paddingTop: 36, borderTop: "1px solid rgba(255,255,255,0.1)", alignItems: "center" }}>
            {[
              { n: "12 000+", l: "Clients" },
              { n: "98 %",    l: "Livraisons réussies" },
              { n: "< 3 min", l: "Pour commander" },
            ].map(({ n, l }) => (
              <div key={l}>
                <p style={{ fontFamily: serif, fontSize: 30, color: T.white, fontWeight: 900, margin: "0 0 3px", lineHeight: 1 }}>{n}</p>
                <p style={{ fontFamily: sans, fontSize: 11, color: "rgba(255,255,255,0.45)", margin: 0, letterSpacing: "0.08em", textTransform: "uppercase" }}>{l}</p>
              </div>
            ))}

            {/* Mobile Money badge */}
            <div style={{ marginLeft: "auto", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "14px 22px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(46,204,113,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#2ECC71" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <p style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: T.white, margin: "0 0 3px" }}>Paiement sécurisé</p>
                <p style={{ fontFamily: sans, fontSize: 11, color: "rgba(255,255,255,0.45)", margin: 0 }}>Orange Money · MTN · Wave</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Features ─── */
function Features() {
  const feats = [
    { n: "01", sym: "◈", title: "QR Code Table",    body: "Scannez depuis votre table, commandez et payez. Zéro téléchargement, zéro friction.", col: T.accent },
    { n: "02", sym: "◎", title: "Mobile Money",      body: "Orange Money, MTN MoMo, Wave. Validation instantanée, toujours disponible.",         col: T.gold   },
    { n: "03", sym: "◉", title: "Suivi Temps Réel",  body: "Votre commande avance devant vos yeux. Étape par étape jusqu'à votre table.",         col: T.green  },
    { n: "04", sym: "❖", title: "Gestion Complète",  body: "Stocks, caisse, KDS cuisine — tous vos KPIs sur un seul tableau de bord.",            col: T.accent },
  ];

  return (
    <section id="fonctionnalites" style={{ background: T.surface, padding: "120px 0", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, ...DIAMOND_BG }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", padding: "0 48px" }}>

        <Reveal>
          <KenteLabel>Pourquoi Resto d'ici</KenteLabel>
          <h2 style={{ fontFamily: serif, fontSize: "clamp(36px, 4.5vw, 62px)", color: T.dark, fontWeight: 900, lineHeight: 1.04, margin: "0 0 72px", letterSpacing: "-0.02em" }}>
            Pensé pour <em style={{ color: T.accent }}>l'Afrique</em>.
          </h2>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 3 }}>
          {feats.map((f, i) => (
            <Reveal key={f.n} delay={i * 80}>
              <div
                style={{ background: T.card, padding: "52px 38px", borderTop: `5px solid ${f.col}`, cursor: "default", transition: "transform 0.35s, box-shadow 0.35s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-8px)"; e.currentTarget.style.boxShadow = "0 24px 60px rgba(0,0,0,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <span style={{ fontFamily: sans, fontSize: 11, color: f.col, letterSpacing: "0.12em", fontWeight: 700 }}>{f.n}</span>
                <div style={{ fontFamily: serif, fontSize: 40, color: f.col, margin: "22px 0 26px", lineHeight: 1 }}>{f.sym}</div>
                <h3 style={{ fontFamily: serif, fontSize: 24, color: T.dark, fontWeight: 700, margin: "0 0 14px" }}>{f.title}</h3>
                <p style={{ fontFamily: sans, fontSize: 15, color: T.muted, lineHeight: 1.72, margin: 0, fontWeight: 300 }}>{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Editorial split ─── */
function Editorial() {
  return (
    <section style={{ background: T.bg, padding: "120px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 48px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 96, alignItems: "center" }}>

        {/* Image */}
        <Reveal dir="left">
          <div style={{ position: "relative" }}>
            {/* Kente corner accent */}
            <div style={{ position: "absolute", top: -14, left: -14, width: 80, height: 80, zIndex: 0 }}>
              <div style={{ display: "flex", height: 4, marginBottom: 3 }}>
                {KENTE.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
              </div>
              <div style={{ display: "flex", height: 4, marginBottom: 3 }}>
                {KENTE.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
              </div>
              <div style={{ display: "flex", height: 4 }}>
                {KENTE.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
              </div>
            </div>

            <img
              src="https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?q=80&w=1000&auto=format&fit=crop"
              alt="Cuisine africaine authentique"
              style={{ width: "100%", height: 640, objectFit: "cover", borderRadius: 12, display: "block", position: "relative", zIndex: 1 }}
            />

            {/* Orange stat card */}
            <div style={{ position: "absolute", zIndex: 2, bottom: -28, right: -28, background: T.accent, borderRadius: 12, padding: "24px 32px", boxShadow: "0 24px 72px rgba(224,78,26,0.45)" }}>
              <p style={{ fontFamily: serif, fontSize: 48, fontWeight: 900, color: T.white, margin: "0 0 4px", lineHeight: 1 }}>
                <Counter end={47} />k
              </p>
              <p style={{ fontFamily: sans, fontSize: 11, color: "rgba(255,255,255,0.72)", margin: 0, letterSpacing: "0.1em" }}>COMMANDES CE MOIS</p>
            </div>

            {/* Gold badge */}
            <div style={{ position: "absolute", zIndex: 2, top: 24, left: 24, background: "rgba(12,9,7,0.88)", backdropFilter: "blur(10px)", border: `1px solid ${T.gold}`, borderRadius: 8, padding: "10px 18px" }}>
              <p style={{ fontFamily: sans, fontSize: 12, color: T.gold, margin: 0, letterSpacing: "0.05em" }}>★ ★ ★ ★ ★ &nbsp; Note moyenne</p>
            </div>
          </div>
        </Reveal>

        {/* Text */}
        <Reveal dir="right" delay={120}>
          <div>
            <KenteLabel>L'expérience client</KenteLabel>
            <h2 style={{ fontFamily: serif, fontSize: "clamp(34px, 3.5vw, 56px)", color: T.dark, fontWeight: 900, lineHeight: 1.07, margin: "0 0 28px", letterSpacing: "-0.02em" }}>
              Du marché à la table,<br/><em style={{ color: T.accent }}>sans friction.</em>
            </h2>
            <p style={{ fontFamily: sans, fontSize: 16, color: T.muted, lineHeight: 1.85, fontWeight: 300, marginBottom: 40 }}>
              Explorez le menu, personnalisez votre plat, choisissez votre mode. Payez en Mobile Money et suivez votre commande en direct.
            </p>

            {[
              { n: "1", text: "Scannez le QR de table ou ouvrez le menu en ligne" },
              { n: "2", text: "Composez votre panier et personnalisez chaque plat" },
              { n: "3", text: "Payez via Orange Money, MTN MoMo ou Wave" },
              { n: "4", text: "Suivez la préparation jusqu'à votre table en direct" },
            ].map(({ n, text }) => (
              <div key={n} style={{ display: "flex", gap: 18, alignItems: "flex-start", marginBottom: 18, paddingBottom: 18, borderBottom: `1px solid ${T.line}` }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: T.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: T.white }}>{n}</span>
                </div>
                <span style={{ fontFamily: sans, fontSize: 15, color: T.muted, lineHeight: 1.65, fontWeight: 400 }}>{text}</span>
              </div>
            ))}

            <a href="/menu" style={{
              display: "inline-flex", alignItems: "center", gap: 10, marginTop: 28,
              padding: "16px 36px", background: T.dark, color: T.white,
              fontFamily: sans, fontSize: 14, fontWeight: 700, textDecoration: "none", borderRadius: 4,
            }}>Explorer le menu <span style={{ color: T.gold }}>→</span></a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── B2C / B2B dual offer ─── */
function DualOffer() {
  const cards = [
    {
      tag: "GRAND PUBLIC",
      tagBg: T.accent,
      tagColor: T.white,
      border: T.accent,
      title: "Pour toute la famille",
      img: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?q=80&w=800&auto=format&fit=crop",
      alt: "Repas famille africaine",
      body: "Retrouvez les saveurs authentiques d'Abidjan. Commandez depuis la table, à emporter ou en livraison. Payez avec votre opérateur mobile.",
      perks: ["Menu dynamique & QR Code Table", "Orange Money · MTN MoMo · Wave", "Suivi commande en temps réel", "Reçu automatique SYSCOHADA"],
      perkColor: T.accent,
      cta: "Commander maintenant",
      ctaBg: T.accent,
      ctaColor: T.white,
      href: "/menu",
    },
    {
      tag: "ENTREPRISE",
      tagBg: T.gold,
      tagColor: T.dark,
      border: T.gold,
      title: "Pour vos équipes",
      img: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=800&auto=format&fit=crop",
      alt: "Équipe entreprise africaine",
      body: "Gérez les repas de vos collaborateurs. Centralisez la facturation. Conformité SYSCOHADA et déclarations fiscales incluses.",
      perks: ["Commandes groupées (50+ repas)", "Facturation mensuelle consolidée", "Gestion budgets par collaborateur", "Conformité TVA & SYSCOHADA"],
      perkColor: T.gold,
      cta: "Créer un compte Pro →",
      ctaBg: T.dark,
      ctaColor: T.white,
      href: "/register?type=b2b",
    },
  ];

  return (
    <section id="espacepr" style={{ background: T.surface, padding: "120px 0", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, ...DIAMOND_BG }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", padding: "0 48px" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 80 }}>
            <KenteLabel>Deux mondes, une solution</KenteLabel>
            <h2 style={{ fontFamily: serif, fontSize: "clamp(36px, 4vw, 60px)", color: T.dark, fontWeight: 900, lineHeight: 1.05, margin: "0", letterSpacing: "-0.02em" }}>
              Particuliers & <em style={{ color: T.accent }}>Entreprises</em>
            </h2>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }}>
          {cards.map((c, i) => (
            <Reveal key={c.tag} dir={i === 0 ? "left" : "right"} delay={i * 100}>
              <div style={{ background: T.card, borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 48px rgba(0,0,0,0.08)", borderTop: `6px solid ${c.border}` }}>
                <div style={{ height: 300, overflow: "hidden", position: "relative" }}>
                  <img src={c.img} alt={c.alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 30%, rgba(12,9,7,0.88))" }} />
                  <div style={{ position: "absolute", bottom: 22, left: 24, right: 24 }}>
                    <span style={{ display: "inline-block", background: c.tagBg, color: c.tagColor, fontFamily: sans, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", padding: "5px 12px", borderRadius: 3, marginBottom: 10 }}>{c.tag}</span>
                    <p style={{ fontFamily: serif, fontSize: 26, fontWeight: 700, color: T.white, fontStyle: "italic", margin: 0 }}>{c.title}</p>
                  </div>
                </div>

                <div style={{ padding: "34px 34px 38px" }}>
                  <p style={{ fontFamily: sans, fontSize: 15, color: T.muted, lineHeight: 1.78, margin: "0 0 28px", fontWeight: 300 }}>{c.body}</p>
                  {c.perks.map(p => (
                    <div key={p} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${c.perkColor}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke={c.perkColor} strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <span style={{ fontFamily: sans, fontSize: 14, color: T.dark }}>{p}</span>
                    </div>
                  ))}
                  <a href={c.href} style={{ display: "block", marginTop: 30, padding: "15px 0", textAlign: "center", background: c.ctaBg, color: c.ctaColor, fontFamily: sans, fontSize: 14, fontWeight: 700, textDecoration: "none", borderRadius: 6 }}>{c.cta}</a>
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
    { pre: "+", n: 12000, suf: "",    label: "Clients actifs"     },
    { pre: "",  n: 98,    suf: "%",   label: "Taux de livraison"  },
    { pre: "",  n: 47,    suf: "k",   label: "Commandes ce mois"  },
    { pre: "",  n: 5,     suf: "min", label: "Commande en"        },
  ];
  return (
    <section style={{ background: T.dark, padding: "88px 0", position: "relative", overflow: "hidden" }}>
      <KenteStrip height={5} />
      <div style={{ position: "absolute", inset: 0, ...DIAMOND_BG, opacity: 0.6 }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", padding: "0 48px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 80}>
            <div style={{ textAlign: "center", padding: "0 24px", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
              <p style={{ fontFamily: serif, fontSize: "clamp(42px, 4.5vw, 66px)", fontWeight: 900, color: T.white, margin: "0 0 8px", lineHeight: 1 }}>
                <Counter end={s.n} prefix={s.pre} suffix={s.suf} />
              </p>
              <p style={{ fontFamily: sans, fontSize: 11, color: T.gold, margin: 0, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>{s.label}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <div style={{ marginTop: 88 }}><KenteStrip height={5} /></div>
    </section>
  );
}

/* ─── Testimonials ─── */
function Testimonials() {
  const items = [
    { q: "Le QR Code table a transformé notre service. Moins d'erreurs, un confort client incomparable.", name: "Koffi Jean-Claude", role: "Gérant — Le Wôrôwôrô", emoji: "🍴", accentCol: T.accent },
    { q: "La facturation consolidée pour nos 50 employés. Un vrai gain de temps et de sérénité.", name: "Aminata Touré", role: "Responsable RH — TechCI", emoji: "🏢", accentCol: T.gold },
    { q: "Payer avec Wave et voir ma commande avancer en direct. Simple, rapide. Je ne commande plus autrement.", name: "Marc Kouassi", role: "Client fidèle", emoji: "😊", accentCol: T.green },
  ];
  return (
    <section style={{ background: T.bg, padding: "120px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 48px" }}>
        <Reveal>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 72, flexWrap: "wrap", gap: 24 }}>
            <div>
              <KenteLabel>Ils nous font confiance</KenteLabel>
              <h2 style={{ fontFamily: serif, fontSize: "clamp(34px, 4vw, 56px)", color: T.dark, fontWeight: 900, lineHeight: 1.08, margin: 0, letterSpacing: "-0.02em" }}>
                La voix de la<br/><em style={{ color: T.accent }}>communauté.</em>
              </h2>
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {[1,2,3,4,5].map(s => <span key={s} style={{ color: T.gold, fontSize: 22 }}>★</span>)}
              <span style={{ fontFamily: sans, fontSize: 13, color: T.muted, marginLeft: 10 }}>4.9 / 5</span>
            </div>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {items.map((t, i) => (
            <Reveal key={t.name} delay={i * 100}>
              <div style={{ background: T.card, border: `1px solid ${T.line}`, borderTop: `5px solid ${t.accentCol}`, borderRadius: 12, padding: "38px 34px", display: "flex", flexDirection: "column", gap: 26 }}>
                <div style={{ display: "flex", gap: 3 }}>
                  {[1,2,3,4,5].map(s => <span key={s} style={{ color: T.accent, fontSize: 15 }}>★</span>)}
                </div>
                <p style={{ fontFamily: serif, fontSize: 18, color: T.dark, lineHeight: 1.65, fontStyle: "italic", margin: 0, fontWeight: 400 }}>
                  "{t.q}"
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 14, paddingTop: 20, borderTop: `1px solid ${T.line}`, marginTop: "auto" }}>
                  <div style={{ width: 46, height: 46, borderRadius: "50%", background: T.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                    {t.emoji}
                  </div>
                  <div>
                    <p style={{ fontFamily: sans, fontSize: 14, fontWeight: 700, color: T.dark, margin: 0 }}>{t.name}</p>
                    <p style={{ fontFamily: sans, fontSize: 12, color: T.muted, margin: 0 }}>{t.role}</p>
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
    <section style={{ background: T.dark, padding: "110px 48px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}><KenteStrip height={5} /></div>
      <div style={{ position: "absolute", inset: 0, ...DIAMOND_BG }} />
      <div style={{
        position: "absolute", right: -60, top: "50%", transform: "translateY(-50%)",
        fontFamily: serif, fontSize: "38vw", fontWeight: 900, color: "rgba(255,255,255,0.018)",
        lineHeight: 1, pointerEvents: "none", userSelect: "none",
      }}>R</div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 840, margin: "0 auto", textAlign: "center" }}>
        <Reveal>
          <KenteLabel color={T.gold}>Rejoindre la plateforme</KenteLabel>
          <h2 style={{ fontFamily: serif, fontSize: "clamp(38px, 5.5vw, 80px)", color: T.white, fontWeight: 900, lineHeight: 1.04, margin: "0 0 24px", letterSpacing: "-0.02em" }}>
            Prêt à commander<br/><em style={{ color: T.accent }}>maintenant ?</em>
          </h2>
          <p style={{ fontFamily: sans, fontSize: 17, color: "rgba(255,255,255,0.58)", lineHeight: 1.75, margin: "0 auto 52px", fontWeight: 300, maxWidth: 540 }}>
            Rejoignez des milliers de clients et de restaurateurs sur la première plateforme de restauration digitale de Côte d'Ivoire.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/menu" style={{
              padding: "18px 52px", background: T.accent, color: T.white,
              fontFamily: sans, fontSize: 15, fontWeight: 700, textDecoration: "none",
              borderRadius: 4, boxShadow: "0 10px 36px rgba(224,78,26,0.5)",
            }}>Explorer le Menu →</a>
            <a href="/register" style={{
              padding: "18px 52px", border: "1px solid rgba(197,138,85,0.4)", color: T.gold,
              background: "transparent", fontFamily: sans, fontSize: 15, fontWeight: 600,
              textDecoration: "none", borderRadius: 4,
            }}>Devenir Partenaire</a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer style={{ background: T.dark, borderTop: "1px solid rgba(255,255,255,0.05)", padding: "72px 0 40px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 60, marginBottom: 60 }}>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <UtensilsCrossed style={{ width: 18, height: 18, color: "#fff" }} />
              </div>
              <span style={{ fontFamily: sans, fontWeight: 700, color: T.white, fontSize: 17 }}>Resto d'ici</span>
            </div>
            <p style={{ fontFamily: sans, fontSize: 14, color: "rgba(255,255,255,0.42)", lineHeight: 1.8, maxWidth: 280, fontWeight: 300 }}>
              La plateforme digitale qui modernise la restauration en Afrique de l'Ouest. Commandez, gérez et payez simplement.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
              {["🟠 Orange Money", "🟡 MTN MoMo", "🔵 Wave"].map(m => (
                <span key={m} style={{ fontFamily: sans, fontSize: 11, color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.06)", borderRadius: 4, padding: "4px 10px" }}>{m}</span>
              ))}
            </div>
          </div>

          {[
            { title: "Plateforme",    links: ["Menu", "Connexion", "Espace B2B", "Inscription"] },
            { title: "Restaurateurs", links: ["Interface Gérant", "Gestion Stocks", "Trésorerie", "KDS Cuisine"] },
            { title: "Contact",       links: ["Abidjan, Cocody", "+225 07 00 00 00", "contact@restodici.ci", "© 2026 Novasend"] },
          ].map(col => (
            <div key={col.title}>
              <p style={{ fontFamily: sans, fontSize: 11, color: T.gold, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20, fontWeight: 700 }}>{col.title}</p>
              {col.links.map(l => (
                <p key={l} style={{ fontFamily: sans, fontSize: 14, color: "rgba(255,255,255,0.38)", margin: "0 0 12px", cursor: "pointer", fontWeight: 300, transition: "color 0.2s" }}
                   onMouseEnter={e => e.target.style.color = "rgba(255,255,255,0.8)"}
                   onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.38)"}>{l}</p>
              ))}
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", height: 3, gap: 2 }}>
            {KENTE.map((c, i) => <div key={i} style={{ width: 32, background: c }} />)}
          </div>
          <p style={{ fontFamily: sans, fontSize: 12, color: "rgba(255,255,255,0.28)", margin: 0 }}>© 2026 Resto d'ici — Tous droits réservés.</p>
          <p style={{ fontFamily: sans, fontSize: 12, color: "rgba(255,255,255,0.28)", margin: 0 }}>Développé par <span style={{ color: T.gold }}>Sankofa-Lab × Novasend</span></p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page root ─── */
export default function Home() {
  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.dark }}>
      <FontLoader />
      <Hero />
      <Marquee />
      <Features />
      <Editorial />
      <DualOffer />
      <StatsBand />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
}
