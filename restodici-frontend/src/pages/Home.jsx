import { useState, useEffect, useRef } from "react";

/* ─── Palette & Tokens ─── */
const T = {
  bg:      "#FDFCFB",
  surface: "#FAF6F0",
  card:    "#FFFFFF",
  line:    "rgba(89,67,42,0.10)",
  accent:  "#E04E1A",
  gold:    "#C58A55",
  cream:   "#11100d",
  muted:   "#64574A",
  white:   "#FFFFFF",
};

const serif = "'Playfair Display', Georgia, serif";
const sans  = "'Manrope', 'DM Sans', system-ui, sans-serif";

/* ─── Font Injection ─── */
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

/* ─── Reveal on scroll ─── */
function Reveal({ children, delay = 0, dir = "up" }) {
  const ref = useRef(null);
  const transforms = { up: "translateY(40px)", left: "translateX(-40px)", right: "translateX(40px)" };
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = transforms[dir] || transforms.up;
    el.style.transition = `opacity 0.8s ease ${delay}ms, transform 0.8s ease ${delay}ms`;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        el.style.opacity = "1";
        el.style.transform = "none";
        obs.disconnect();
      }
    }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return <div ref={ref}>{children}</div>;
}

/* ─── Animated Counter ─── */
function Counter({ end, suffix = "", prefix = "" }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let start = 0;
      const duration = 1600;
      const step = end / (duration / 16);
      const tick = () => {
        start += step;
        if (start >= end) { setVal(end); return; }
        setVal(Math.floor(start));
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [end]);
  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

/* ─── Marquee ─── */
function Marquee() {
  const items = ["Attiéké Poisson","Alloco Braisé","Kedjenou de Poulet","Garba","Foutou Sauce Graine","Riz au Gras","Porc au Four","Soupe Kandia","Bangui & Placali","Brochettes de Bœuf"];
  const doubled = [...items, ...items];
  return (
    <div style={{ background: T.accent, overflow: "hidden", padding: "14px 0", borderTop: `1px solid rgba(255,255,255,0.1)`, borderBottom: `1px solid rgba(255,255,255,0.1)` }}>
      <style>{`@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
      <div style={{ display: "flex", animation: "marquee 28s linear infinite", width: "max-content" }}>
        {doubled.map((d, i) => (
          <span key={i} style={{ fontFamily: serif, fontSize: 15, color: T.white, fontStyle: "italic", whiteSpace: "nowrap", padding: "0 32px" }}>
            {d} &nbsp;·
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Hero ─── */
function Hero() {
  return (
    <section style={{ background: T.bg, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "flex-end", position: "relative", overflow: "hidden", paddingBottom: 80 }}>

      {/* Background image full cover */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=2000&auto=format&fit=crop')",
        backgroundSize: "cover", backgroundPosition: "center 30%",
        opacity: 0.22,
      }} />

      {/* Gradient overlay bottom */}
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${T.bg} 35%, transparent 75%)` }} />
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to right, ${T.bg} 0%, transparent 60%)` }} />

      {/* Top accent line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: T.accent }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, maxWidth: 1280, margin: "0 auto", padding: "0 40px", width: "100%" }}>

        {/* Small label */}
        <Reveal>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
            <div style={{ width: 32, height: 1, background: T.gold }} />
            <span style={{ fontFamily: sans, fontSize: 12, color: T.gold, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 500 }}>
              Abidjan · Côte d'Ivoire · 2026
            </span>
          </div>
        </Reveal>

        {/* Main headline - huge editorial */}
        <Reveal delay={80}>
          <h1 style={{ fontFamily: serif, fontWeight: 900, fontSize: "clamp(52px, 8vw, 108px)", color: T.cream, lineHeight: 0.95, letterSpacing: "-0.02em", margin: "0 0 32px" }}>
            La vraie<br/>
            <span style={{ color: T.accent, fontStyle: "italic" }}>cuisine</span><br/>
            d'ici.
          </h1>
        </Reveal>

        {/* Sub + CTA row */}
        <Reveal delay={180}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 48, marginBottom: 48 }}>
            <p style={{ fontFamily: sans, fontSize: 17, color: T.muted, maxWidth: 420, lineHeight: 1.65, margin: 0, fontWeight: 300 }}>
              Du menu à la livraison, en passant par le paiement Mobile Money — une plateforme pensée pour les restaurants et les entreprises ivoiriennes.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="/menu" style={{
                padding: "16px 36px", background: T.accent, color: T.white,
                fontFamily: sans, fontSize: 15, fontWeight: 600, textDecoration: "none",
                borderRadius: 4, letterSpacing: "0.01em",
                transition: "background 0.2s",
              }}>Voir le Menu</a>
              <a href="/register?type=b2b" style={{
                padding: "16px 36px", border: `1px solid #B8E8C4`,
                color: "#0F3F24", background: "#DBF6E5",
                fontFamily: sans, fontSize: 15, fontWeight: 600, textDecoration: "none",
                borderRadius: 4, letterSpacing: "0.01em",
              }}>Espace Entreprise</a>
            </div>
          </div>
        </Reveal>

        {/* Horizontal rule + social proof */}
        <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 28, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 32 }}>
          {[
            { n: "12 000+", l: "Clients satisfaits" },
            { n: "98 %",    l: "Commandes livrées" },
            { n: "3 min",   l: "Pour commander" },
          ].map(({ n, l }) => (
            <Reveal key={l} delay={280}>
              <div>
                <p style={{ fontFamily: serif, fontSize: 26, color: T.cream, fontWeight: 700, margin: "0 0 2px" }}>{n}</p>
                <p style={{ fontFamily: sans, fontSize: 13, color: T.muted, margin: 0 }}>{l}</p>
              </div>
            </Reveal>
          ))}

          {/* Floating payment badge */}
          <Reveal delay={350}>
            <div style={{ marginLeft: "auto", background: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(46,204,113,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#2ECC71" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <p style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: T.cream, margin: "0 0 2px" }}>Paiement validé</p>
                <p style={{ fontFamily: sans, fontSize: 11, color: T.muted, margin: 0 }}>Wave · 3 500 FCFA</p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── Features ─── */
function Features() {
  const feats = [
    { n: "01", icon: "⬡", title: "QR Code Table", body: "Scannez, commandez, payez — sans téléchargement, directement depuis votre navigateur." },
    { n: "02", icon: "◎", title: "Mobile Money", body: "Orange Money, MTN MoMo, Wave. Confirmation de paiement en moins de 10 secondes." },
    { n: "03", icon: "◈", title: "Suivi Temps Réel", body: "Notifications push à chaque étape de votre commande jusqu'à la livraison." },
    { n: "04", icon: "◉", title: "Dashboard Gérant", body: "Stocks, trésorerie et KPIs financiers centralisés sur un seul tableau de bord." },
  ];

  return (
    <section id="fonctionnalites" style={{ background: T.bg, padding: "120px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>

        <Reveal>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 72, flexWrap: "wrap", gap: 24 }}>
            <div>
              <span style={{ fontFamily: sans, fontSize: 11, color: T.gold, letterSpacing: "0.15em", textTransform: "uppercase" }}>Pourquoi Resto d'ici</span>
              <h2 style={{ fontFamily: serif, fontSize: "clamp(34px, 4vw, 56px)", color: T.cream, fontWeight: 700, lineHeight: 1.1, margin: "12px 0 0", letterSpacing: "-0.02em" }}>
                Pensé pour <br/><em>l'Afrique</em>.
              </h2>
            </div>
            <p style={{ fontFamily: sans, fontSize: 16, color: T.muted, maxWidth: 360, lineHeight: 1.7, fontWeight: 300 }}>
              Nous combinons technologie de pointe et réalités locales pour offrir le meilleur de la restauration digitale.
            </p>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 1, border: `1px solid ${T.line}`, borderRadius: 16, overflow: "hidden" }}>
          {feats.map((f, i) => (
            <Reveal key={f.n} delay={i * 70}>
              <div style={{ background: T.card, padding: "48px 36px", borderRight: i < 3 ? `1px solid ${T.line}` : "none", transition: "background 0.3s" }}
                   onMouseEnter={e => e.currentTarget.style.background = "#DBF6E5"}
                   onMouseLeave={e => e.currentTarget.style.background = T.card}>
                <span style={{ fontFamily: sans, fontSize: 11, color: T.accent, letterSpacing: "0.1em", fontWeight: 600 }}>{f.n}</span>
                <div style={{ fontFamily: serif, fontSize: 32, color: T.gold, margin: "16px 0 20px", lineHeight: 1 }}>{f.icon}</div>
                <h3 style={{ fontFamily: serif, fontSize: 22, color: T.cream, fontWeight: 700, margin: "0 0 12px" }}>{f.title}</h3>
                <p style={{ fontFamily: sans, fontSize: 15, color: T.muted, lineHeight: 1.65, margin: 0, fontWeight: 300 }}>{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Editorial Split ─── */
function Editorial() {
  return (
    <section style={{ background: T.surface, padding: "120px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>

        {/* Image col */}
        <Reveal dir="left">
          <div style={{ position: "relative" }}>
            <img
              src="https://images.unsplash.com/photo-1578474846511-04ba529f0b88?q=80&w=1000&auto=format&fit=crop"
              alt="Cuisine africaine"
              style={{ width: "100%", height: 600, objectFit: "cover", borderRadius: 12, display: "block" }}
            />
            {/* Floating stat card */}
            <div style={{
              position: "absolute", bottom: -24, right: -24,
              background: T.accent, borderRadius: 12, padding: "20px 28px",
              boxShadow: "0 20px 60px rgba(224,78,26,0.4)",
            }}>
              <p style={{ fontFamily: serif, fontSize: 40, fontWeight: 900, color: T.white, margin: "0 0 2px", lineHeight: 1 }}>
                <Counter end={47} />k
              </p>
              <p style={{ fontFamily: sans, fontSize: 12, color: "rgba(255,255,255,0.75)", margin: 0, letterSpacing: "0.05em" }}>COMMANDES CE MOIS</p>
            </div>
            {/* Gold badge top-left */}
            <div style={{
              position: "absolute", top: 24, left: 24,
              background: "rgba(12,9,7,0.85)", backdropFilter: "blur(8px)",
              border: `1px solid ${T.gold}`, borderRadius: 8, padding: "10px 16px",
            }}>
              <p style={{ fontFamily: sans, fontSize: 12, color: T.gold, margin: 0, letterSpacing: "0.05em" }}>★ ★ ★ ★ ★ &nbsp; Note moyenne</p>
            </div>
          </div>
        </Reveal>

        {/* Text col */}
        <Reveal dir="right" delay={100}>
          <div>
            <span style={{ fontFamily: sans, fontSize: 11, color: T.gold, letterSpacing: "0.15em", textTransform: "uppercase" }}>L'expérience client</span>
            <h2 style={{ fontFamily: serif, fontSize: "clamp(32px, 3.5vw, 52px)", color: T.cream, fontWeight: 700, lineHeight: 1.1, margin: "16px 0 24px", letterSpacing: "-0.02em" }}>
              Du menu à la livraison, <em>sans friction</em>.
            </h2>
            <p style={{ fontFamily: sans, fontSize: 16, color: T.muted, lineHeight: 1.8, fontWeight: 300, marginBottom: 32 }}>
              Consultez le menu par catégorie, personnalisez votre plat, choisissez votre mode — sur place, à emporter ou en livraison. Payez en Mobile Money en quelques secondes et suivez votre commande en temps réel.
            </p>

            {/* Steps */}
            {[
              { step: "1.", text: "Consultez le menu & scannez le QR de table" },
              { step: "2.", text: "Composez votre panier et personnalisez chaque plat" },
              { step: "3.", text: "Payez via Orange Money, MTN ou Wave" },
              { step: "4.", text: "Suivez la préparation jusqu'à la livraison" },
            ].map(({ step, text }) => (
              <div key={step} style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${T.line}` }}>
                <span style={{ fontFamily: serif, fontSize: 18, color: T.accent, fontStyle: "italic", minWidth: 28, fontWeight: 700 }}>{step}</span>
                <span style={{ fontFamily: sans, fontSize: 15, color: T.muted, lineHeight: 1.5, fontWeight: 300 }}>{text}</span>
              </div>
            ))}

            <a href="/menu" style={{
              display: "inline-block", marginTop: 20,
              padding: "15px 32px", background: "#DBF6E5",
              border: `1px solid #B8E8C4`, color: "#0F3F24",
              fontFamily: sans, fontSize: 14, fontWeight: 600, textDecoration: "none",
              borderRadius: 4, letterSpacing: "0.04em",
              transition: "all 0.2s",
            }}>Explorer le menu →</a>
          </div>
        </Reveal>

      </div>
    </section>
  );
}

/* ─── B2C vs B2B ─── */
function DualOffer() {
  return (
    <section id="espacepr" style={{ background: T.bg, padding: "120px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>

        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <span style={{ fontFamily: sans, fontSize: 11, color: T.gold, letterSpacing: "0.15em", textTransform: "uppercase" }}>Deux mondes, une solution</span>
            <h2 style={{ fontFamily: serif, fontSize: "clamp(34px, 4vw, 56px)", color: T.cream, fontWeight: 700, lineHeight: 1.1, margin: "16px 0 0", letterSpacing: "-0.02em" }}>
              Particuliers & <em>Entreprises</em>
            </h2>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

          {/* B2C */}
          <Reveal dir="left">
            <div style={{
              background: T.surface, borderRadius: 16, overflow: "hidden",
              border: `1px solid ${T.line}`, position: "relative",
            }}>
              <div style={{ height: 280, overflow: "hidden", position: "relative" }}>
                <img
                  src="https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?q=80&w=800&auto=format&fit=crop"
                  alt="Repas famille" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent, rgba(12,9,7,0.85))" }} />
                <span style={{ position: "absolute", bottom: 20, left: 24, fontFamily: serif, fontSize: 28, fontWeight: 700, color: T.white, fontStyle: "italic" }}>
                  Grand Public
                </span>
              </div>
              <div style={{ padding: "32px 32px 36px" }}>
                <p style={{ fontFamily: sans, fontSize: 15, color: T.muted, lineHeight: 1.7, margin: "0 0 28px", fontWeight: 300 }}>
                  Retrouvez les saveurs d'Abidjan. Commandez depuis la table, à emporter ou en livraison. Payez avec votre opérateur mobile.
                </p>
                {["Menu dynamique & QR Code Table", "Orange Money · MTN · Wave", "Suivi commande temps réel", "Reçu SMS/Email automatique"].map(item => (
                  <div key={item} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                    <span style={{ color: T.accent, fontSize: 13, fontWeight: 700 }}>—</span>
                    <span style={{ fontFamily: sans, fontSize: 14, color: T.muted }}>{item}</span>
                  </div>
                ))}
                <a href="/menu" style={{
                  display: "block", marginTop: 28, padding: "14px 0", textAlign: "center",
                  background: T.accent, color: T.white, fontFamily: sans, fontSize: 14,
                  fontWeight: 600, textDecoration: "none", borderRadius: 6,
                }}>Commander maintenant</a>
              </div>
            </div>
          </Reveal>

          {/* B2B */}
          <Reveal dir="right" delay={100}>
            <div style={{
              background: T.surface, borderRadius: 16, overflow: "hidden",
              border: `1px solid ${T.gold}33`, position: "relative",
            }}>
              <div style={{ height: 280, overflow: "hidden", position: "relative" }}>
                <img
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=800&auto=format&fit=crop"
                  alt="Équipe entreprise" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent, rgba(12,9,7,0.85))" }} />
                <span style={{ position: "absolute", top: 20, right: 20, fontFamily: sans, fontSize: 11, color: T.gold, background: "rgba(196,154,82,0.15)", border: "1px solid rgba(196,154,82,0.3)", borderRadius: 4, padding: "6px 12px", letterSpacing: "0.08em" }}>
                  ENTREPRISE
                </span>
                <span style={{ position: "absolute", bottom: 20, left: 24, fontFamily: serif, fontSize: 28, fontWeight: 700, color: T.white, fontStyle: "italic" }}>
                  Professionnel
                </span>
              </div>
              <div style={{ padding: "32px 32px 36px" }}>
                <p style={{ fontFamily: sans, fontSize: 15, color: T.muted, lineHeight: 1.7, margin: "0 0 28px", fontWeight: 300 }}>
                  Gérez les repas de vos équipes. Centralisez la facturation. Conformité SYSCOHADA incluse.
                </p>
                {["Commandes groupées (50+ repas)", "Facturation mensuelle consolidée", "Gestion des budgets par collaborateur", "Conformité TVA & SYSCOHADA"].map(item => (
                  <div key={item} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                    <span style={{ color: T.gold, fontSize: 13, fontWeight: 700 }}>—</span>
                    <span style={{ fontFamily: sans, fontSize: 14, color: T.muted }}>{item}</span>
                  </div>
                ))}
                <a href="/register?type=b2b" style={{
                  display: "block", marginTop: 28, padding: "14px 0", textAlign: "center",
                  background: "#DBF6E5", color: "#0F3F24", fontFamily: sans, fontSize: 14,
                  fontWeight: 600, textDecoration: "none", borderRadius: 6,
                  border: `1px solid #B8E8C4`,
                }}>Créer un compte Pro</a>
              </div>
            </div>
          </Reveal>

        </div>
      </div>
    </section>
  );
}

/* ─── Stats Band ─── */
function StatsBand() {
  const stats = [
    { pre: "+", n: 12000, suf: "", label: "Clients actifs" },
    { pre: "",  n: 98,    suf: "%", label: "Taux de livraison" },
    { pre: "",  n: 47,    suf: "k", label: "Commandes ce mois" },
    { pre: "",  n: 5,     suf: "min", label: "Délai commande moyen" },
  ];
  return (
    <section style={{ background: T.accent, padding: "72px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1 }}>
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 80}>
            <div style={{ textAlign: "center", padding: "0 24px", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.2)" : "none" }}>
              <p style={{ fontFamily: serif, fontSize: "clamp(36px, 4vw, 56px)", fontWeight: 900, color: T.white, margin: "0 0 6px", lineHeight: 1 }}>
                <Counter end={s.n} prefix={s.pre} suffix={s.suf} />
              </p>
              <p style={{ fontFamily: sans, fontSize: 13, color: "rgba(255,255,255,0.7)", margin: 0, letterSpacing: "0.05em", textTransform: "uppercase" }}>{s.label}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ─── Testimonials ─── */
function Testimonials() {
  const items = [
    {
      q: "Le QR Code table a transformé notre service. Moins d'erreurs en salle, un confort client incomparable.",
      name: "Koffi Jean-Claude",
      role: "Gérant — Le Wôrôwôrô",
      img: "https://images.unsplash.com/photo-1531384441138-2736e62e0919?auto=format&fit=crop&w=100&q=80"
    },
    {
      q: "La facturation mensuelle consolidée pour nos 50 employés. Un vrai gain de temps et de sérénité.",
      name: "Aminata Touré",
      role: "Responsable RH — TechCI",
      img: "https://images.unsplash.com/photo-1589156280159-27698a70f29e?auto=format&fit=crop&w=100&q=80"
    },
    {
      q: "Payer avec Wave et voir ma commande avancer en direct. Simple, rapide. Je ne commande plus autrement.",
      name: "Marc Kouassi",
      role: "Client fidèle",
      img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80"
    },
  ];

  return (
    <section style={{ background: T.surface, padding: "120px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>

        <Reveal>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 72, flexWrap: "wrap", gap: 16 }}>
            <h2 style={{ fontFamily: serif, fontSize: "clamp(32px, 4vw, 52px)", color: T.cream, fontWeight: 700, lineHeight: 1.1, margin: 0, letterSpacing: "-0.02em" }}>
              Ils nous font<br/><em style={{ color: T.accent }}>confiance</em>.
            </h2>
            <div style={{ display: "flex", gap: 4 }}>
              {[1,2,3,4,5].map(s => <span key={s} style={{ color: T.gold, fontSize: 18 }}>★</span>)}
              <span style={{ fontFamily: sans, fontSize: 13, color: T.muted, marginLeft: 8, alignSelf: "center" }}>4.9 / 5</span>
            </div>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {items.map((t, i) => (
            <Reveal key={t.name} delay={i * 100}>
              <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: "36px 32px", display: "flex", flexDirection: "column", gap: 28 }}>
                <div style={{ display: "flex", gap: 2 }}>
                  {[1,2,3,4,5].map(s => <span key={s} style={{ color: T.accent, fontSize: 14 }}>★</span>)}
                </div>
                <p style={{ fontFamily: serif, fontSize: 19, color: T.cream, lineHeight: 1.6, fontStyle: "italic", margin: 0, fontWeight: 400 }}>
                  "{t.q}"
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 14, paddingTop: 20, borderTop: `1px solid ${T.line}`, marginTop: "auto" }}>
                  <img src={t.img} alt={t.name} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
                  <div>
                    <p style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: T.cream, margin: 0 }}>{t.name}</p>
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
    <section style={{ background: T.bg, padding: "80px 40px 120px" }}>
      <div style={{
        maxWidth: 1280, margin: "0 auto",
        background: T.surface,
        border: `1px solid ${T.line}`,
        borderRadius: 24, padding: "80px 80px",
        display: "grid", gridTemplateColumns: "1fr auto",
        alignItems: "center", gap: 60,
        position: "relative", overflow: "hidden",
      }}>
        {/* Accent bar left */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: T.accent }} />

        <Reveal>
          <div>
            <span style={{ fontFamily: sans, fontSize: 11, color: T.gold, letterSpacing: "0.15em", textTransform: "uppercase" }}>Rejoindre la plateforme</span>
            <h2 style={{ fontFamily: serif, fontSize: "clamp(32px, 3.5vw, 52px)", color: T.cream, fontWeight: 700, lineHeight: 1.1, margin: "16px 0 20px", letterSpacing: "-0.02em" }}>
              Prêt à commander <em>maintenant</em> ?
            </h2>
            <p style={{ fontFamily: sans, fontSize: 16, color: T.muted, lineHeight: 1.7, margin: 0, fontWeight: 300, maxWidth: 480 }}>
              Rejoignez des milliers de clients et de restaurateurs sur la première plateforme de restauration digitale de Côte d'Ivoire.
            </p>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 200 }}>
            <a href="/menu" style={{
              padding: "16px 36px", background: T.accent,
              color: T.white, fontFamily: sans, fontSize: 15, fontWeight: 600,
              textDecoration: "none", borderRadius: 6, textAlign: "center",
              whiteSpace: "nowrap",
            }}>Explorer le Menu →</a>
            <a href="/register" style={{
              padding: "16px 36px", background: "#DBF6E5",
              border: `1px solid #B8E8C4`, color: "#0F3F24", fontFamily: sans,
              fontSize: 15, fontWeight: 600, textDecoration: "none", borderRadius: 6, textAlign: "center",
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
    <footer style={{ background: T.surface, borderTop: `1px solid ${T.line}`, padding: "72px 0 40px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 60, marginBottom: 60 }}>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: serif, fontStyle: "italic", fontWeight: 700, color: T.white, fontSize: 17 }}>R</span>
              </div>
              <span style={{ fontFamily: sans, fontWeight: 600, color: T.cream, fontSize: 16 }}>Resto d'ici</span>
            </div>
            <p style={{ fontFamily: sans, fontSize: 14, color: T.muted, lineHeight: 1.7, maxWidth: 280, fontWeight: 300 }}>
              La plateforme digitale qui modernise la restauration en Afrique. Commandez, gérez et payez en toute simplicité.
            </p>
          </div>

          {[
            { title: "Plateforme", links: ["Menu", "Connexion", "Espace B2B", "Inscription"] },
            { title: "Restaurateurs", links: ["Interface Gérant", "Gestion Stocks", "Trésorerie", "Portail Admin"] },
            { title: "Contact", links: ["Abidjan, Cocody", "+225 07 00 00 00", "contact@restodici.ci", "© 2026 Novasend"] },
          ].map(col => (
            <div key={col.title}>
              <p style={{ fontFamily: sans, fontSize: 11, color: T.gold, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>{col.title}</p>
              {col.links.map(l => (
                <p key={l} style={{ fontFamily: sans, fontSize: 14, color: T.muted, margin: "0 0 10px", cursor: "pointer", fontWeight: 300 }}
                   onMouseEnter={e => e.target.style.color = T.cream}
                   onMouseLeave={e => e.target.style.color = T.muted}>{l}</p>
              ))}
            </div>
          ))}
        </div>

        <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontFamily: sans, fontSize: 12, color: T.muted, margin: 0 }}>© 2026 Resto d'ici — Tous droits réservés.</p>
          <p style={{ fontFamily: sans, fontSize: 12, color: T.muted, margin: 0 }}>Développé par <span style={{ color: T.gold }}>Sankofa-Lab × Novasend</span></p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page Root ─── */
export default function Home() {
  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.cream }}>
      <FontLoader />
      <Hero />
      <Marquee />
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