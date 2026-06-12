/* ═══════════════════════════════════════════════════════════════
   Home.jsx — Page d'accueil publique
   Contient : hero, plats populaires, catégories, avantages, témoignages,
              newsletter, footer — entièrement responsive
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { UtensilsCrossed, ArrowRight, Check, Star, Search, ShoppingBag, Truck, Clock, Heart, Mail } from "lucide-react";
import { menuAPI, newsletterAPI } from "../services/api";

/* ─── Palette de couleurs ─── */
const T = {
  bg:      "#FFFAF3",
  bgAlt:   "#FFF5E8",
  surface: "#FFEFD8",
  dark:    "#1A0C00",
  text:    "#3B2409",
  muted:   "#7A5E3A",
  mutedL:  "#B09070",
  card:    "#FFFFFF",
  accent:  "#FF8C00",
  accentD: "#E07A00",
  accentL: "#FFAD40",
  yellow:  "#FFB800",
  yellowL: "#FFD166",
  red:     "#FF3B30",
  line:    "rgba(255,140,0,0.14)",
  shadow:  "0 6px 28px rgba(255,140,0,0.14)",
  shadowS: "0 2px 14px rgba(0,0,0,0.07)",
};
const KENTE = ["#FF8C00","#FFB800","#1A0C00","#E07A00"];
const serif = "'Playfair Display', Georgia, serif";
const sans  = "'Manrope', system-ui, sans-serif";

const CSS = `
@keyframes kfmarquee   { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
@keyframes kfbadge     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
@keyframes kfpulse     { 0%,100%{opacity:1} 50%{opacity:0.55} }
@keyframes kfspin      { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
@keyframes kfzoomin    { from{transform:scale(1)} to{transform:scale(1.07)} }
@keyframes kfbounce    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@keyframes kfskeleton  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.rd-nav-link:hover     { color:${T.accent} !important; }
.rd-btn-cta:hover      { transform:translateY(-2px) !important; box-shadow:0 16px 40px rgba(255,140,0,0.5) !important; }
.rd-btn-outline:hover  { background:${T.accent} !important; color:#fff !important; }
.rd-card:hover         { transform:translateY(-6px) !important; box-shadow:0 18px 48px rgba(255,140,0,0.2) !important; }
.rd-feat-card:hover    { transform:translateY(-5px) !important; box-shadow:0 14px 36px rgba(0,0,0,0.1) !important; }
.rd-foot-link:hover    { color:${T.accent} !important; }
`;

/* ─── Images de substitution pour les plats sans photo ─── */
const FOOD_IMGS = [
  "photo-1565299585323-38d6b0865b47",
  "photo-1567620905732-2d1ec7ab7445",
  "photo-1555939594-58d7cb561ad1",
  "photo-1512058564366-18510be2db19",
  "photo-1540189549336-e6e99c3679fe",
  "photo-1565958011703-44f9829ba187",
  "photo-1568901346375-23c9450c58cd",
  "photo-1504674900247-0877df9cc836",
];

function getItemImg(item, idx) {
  if (item?.photoUrl) return item.photoUrl;
  if (item?.imageUrl) return item.imageUrl;
  return `https://images.unsplash.com/${FOOD_IMGS[idx % FOOD_IMGS.length]}?q=80&w=500&auto=format&fit=crop`;
}

function formatPrix(prix) {
  if (prix === null || prix === undefined) return "—";
  return new Intl.NumberFormat("fr-FR").format(prix) + " FCFA";
}

/* ─── Fonctions utilitaires ─── */
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

function Reveal({ children, delay=0, dir="up", dist=36 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const MAP = { up:`translateY(${dist}px)`, left:`translateX(-${dist}px)`, right:`translateX(${dist}px)` };
    el.style.opacity="0"; el.style.transform=MAP[dir]||MAP.up;
    el.style.transition=`opacity .8s cubic-bezier(.22,1,.36,1) ${delay}ms, transform .8s cubic-bezier(.22,1,.36,1) ${delay}ms`;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.style.opacity="1"; el.style.transform="none"; obs.disconnect(); }
    },{ threshold:0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  },[delay,dir,dist]);
  return <div ref={ref}>{children}</div>;
}

function Counter({ end, pre="", suf="", ms=1600 }) {
  const [v, setV] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const el=ref.current; if(!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if(!e.isIntersecting) return; obs.disconnect();
      const t0=Date.now();
      const tick=()=>{ const p=Math.min((Date.now()-t0)/ms,1); const ease=1-Math.pow(1-p,3); setV(Math.floor(ease*end)); if(p<1) requestAnimationFrame(tick); else setV(end); };
      requestAnimationFrame(tick);
    },{ threshold:0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  },[end,ms]);
  return <span ref={ref}>{pre}{v.toLocaleString("fr-FR")}{suf}</span>;
}

function KS({ h=4 }) {
  return <div style={{display:"flex",height:h}}>{KENTE.map((c,i)=><div key={i} style={{flex:1,background:c}}/>)}</div>;
}

function Brush({ color=T.accent, opacity=0.18, style={} }) {
  return (
    <svg viewBox="0 0 400 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position:"absolute", pointerEvents:"none", ...style }}>
      <path d="M20 80 Q80 20 200 60 Q320 95 390 40" stroke={color} strokeWidth="60" strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />
    </svg>
  );
}

function Chip({ children, color=T.accent, bg }) {
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:bg||`${color}15`, border:`1px solid ${color}28`, borderRadius:100, padding:"7px 18px", marginBottom:20 }}>
      <div style={{ width:5,height:5,borderRadius:"50%",background:color,animation:"kfpulse 2s ease-in-out infinite" }} />
      <span style={{ fontFamily:sans,fontSize:11,color,letterSpacing:"0.16em",textTransform:"uppercase",fontWeight:700 }}>{children}</span>
    </div>
  );
}

function Stars({ n=5 }) {
  return <span>{Array.from({length:5},(_,i)=><Star key={i} size={13} fill={i<n?T.yellow:"#E0D0B8"} color={i<n?T.yellow:"#E0D0B8"} />)}</span>;
}

/* ─── Carte squelette — état de chargement ─── */
function SkeletonCard() {
  const shimmer = {
    background: `linear-gradient(90deg, ${T.bgAlt} 25%, ${T.surface} 50%, ${T.bgAlt} 75%)`,
    backgroundSize: "200% 100%",
    animation: "kfskeleton 1.6s ease-in-out infinite",
  };
  return (
    <div style={{ background:T.card,borderRadius:20,overflow:"hidden",boxShadow:T.shadowS,border:`1px solid ${T.line}` }}>
      <div style={{ height:200, ...shimmer }} />
      <div style={{ padding:"20px 22px 24px" }}>
        <div style={{ height:18,width:"65%",borderRadius:6,marginBottom:10, ...shimmer }} />
        <div style={{ height:13,width:"45%",borderRadius:6,marginBottom:20, ...shimmer }} />
        <div style={{ height:44,borderRadius:50, ...shimmer }} />
      </div>
    </div>
  );
}

/* ─── Barre de navigation ─── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn=()=>setScrolled(window.scrollY>40);
    window.addEventListener("scroll",fn,{passive:true});
    return ()=>window.removeEventListener("scroll",fn);
  },[]);
  const links=[["Fonctionnalités","#fonctionnalites"],["Processus","#processus"],["Offres","#offres"],["Entreprises","/register?type=b2b"]];
  return (
    <nav style={{ position:"fixed",top:0,left:0,right:0,zIndex:1000, background:scrolled?"rgba(255,250,243,0.95)":"transparent", backdropFilter:scrolled?"blur(20px)":"none", boxShadow:scrolled?"0 2px 24px rgba(255,140,0,0.1)":"none", transition:"all 0.35s cubic-bezier(.22,1,.36,1)" }}>
      <KS h={3} />
      <div style={{ maxWidth:1280,margin:"0 auto",padding:"0 40px",height:70,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <a href="/" style={{ display:"flex",alignItems:"center",gap:10,textDecoration:"none" }}>
          <div style={{ width:38,height:38,borderRadius:10,background:`linear-gradient(135deg,${T.accent},${T.yellow})`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 16px ${T.accent}44` }}>
            <UtensilsCrossed style={{ width:19,height:19,color:"#fff" }} />
          </div>
          <span style={{ fontFamily:serif,fontWeight:700,color:T.accent,fontSize:22,letterSpacing:"-0.02em" }}>Resto d'ici</span>
        </a>
        <div style={{ display:"flex",gap:34,alignItems:"center" }}>
          {links.map(([l,h])=>(
            <a key={l} href={h} className="rd-nav-link" style={{ fontFamily:sans,fontSize:14,color:T.muted,textDecoration:"none",fontWeight:500,transition:"color .2s" }}>{l}</a>
          ))}
        </div>
        <div style={{ display:"flex",gap:10,alignItems:"center" }}>
          <a href="/login" className="rd-btn-cta" style={{ fontFamily:sans,fontSize:13,fontWeight:700,color:"#fff",textDecoration:"none",padding:"10px 24px",borderRadius:50,background:`linear-gradient(135deg,${T.accent},${T.accentD})`,boxShadow:`0 6px 22px ${T.accent}44`,transition:"all .22s",display:"inline-flex",alignItems:"center",gap:6 }}>Connexion</a>
          <a href="/menu" className="rd-btn-cta" style={{ fontFamily:sans,fontSize:13,fontWeight:700,color:"#fff",textDecoration:"none",padding:"10px 24px",borderRadius:50,background:`linear-gradient(135deg,${T.accent},${T.accentD})`,boxShadow:`0 6px 22px ${T.accent}44`,transition:"all .22s",display:"inline-flex",alignItems:"center",gap:6 }}>Commander <ArrowRight size={13} /></a>
        </div>
      </div>
    </nav>
  );
}

/* ─── Section héros — bannière principale ─── */
function Hero({ search, onSearch, menuRef, restaurantCount = 0 }) {
  const handleSubmit = () => {
    if (menuRef?.current) menuRef.current.scrollIntoView({ behavior:"smooth", block:"start" });
  };
  return (
    <section style={{ position:"relative", minHeight:"100dvh", display:"flex", flexDirection:"column", justifyContent:"flex-end", overflow:"hidden" }}>
      {/* Image de fond */}
      <img
        src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=85&w=1800&auto=format&fit=crop"
        alt="Plats d'Abidjan"
        style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center 40%", display:"block" }}
      />
      {/* Gradient overlay — bas sombre pour lisibilité du texte */}
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(10,5,0,0.28) 0%, rgba(10,5,0,0.55) 45%, rgba(10,5,0,0.88) 100%)" }} />

      {/* Contenu centré */}
      <div style={{ position:"relative", zIndex:2, maxWidth:860, margin:"0 auto", padding:"0 24px 80px", width:"100%", textAlign:"center" }}>
        <Reveal delay={40}>
          <p style={{ fontFamily:sans, fontSize:12, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color:"rgba(255,255,255,0.65)", margin:"0 0 18px" }}>
            Abidjan · Côte d'Ivoire
          </p>
        </Reveal>
        <Reveal delay={90}>
          <h1 style={{ fontFamily:serif, fontWeight:900, fontSize:"clamp(42px,7vw,90px)", color:"#fff", lineHeight:1.0, letterSpacing:"-0.03em", margin:"0 0 20px", textShadow:"0 4px 24px rgba(0,0,0,0.4)" }}>
            Savourez le meilleur<br/>
            <em style={{ color:T.yellow, fontStyle:"italic" }}>d'ici,</em> livré chez vous.
          </h1>
        </Reveal>
        <Reveal delay={150}>
          <p style={{ fontFamily:sans, fontSize:"clamp(15px,2vw,18px)", color:"rgba(255,255,255,0.72)", lineHeight:1.7, maxWidth:560, margin:"0 auto 40px", fontWeight:300 }}>
            Livraison ultra-rapide pour vos envies du quotidien et solutions sur-mesure pour vos repas d'entreprise.
          </p>
        </Reveal>

        {/* Barre de recherche */}
        <Reveal delay={200}>
          <div style={{ display:"flex", gap:0, maxWidth:580, margin:"0 auto 28px", borderRadius:50, overflow:"hidden", boxShadow:"0 12px 48px rgba(0,0,0,0.35)", background:"#fff" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"0 22px", flex:1 }}>
              <Search size={18} color={T.mutedL} />
              <input
                value={search}
                onChange={e => onSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="Rechercher un plat ou un restaurant…"
                style={{ border:"none", outline:"none", fontFamily:sans, fontSize:15, color:T.text, background:"transparent", width:"100%", padding:"17px 0" }}
              />
              {search && <button onClick={() => onSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:T.mutedL, fontSize:18, lineHeight:1 }}>×</button>}
            </div>
            <button onClick={handleSubmit} style={{ background:`linear-gradient(135deg,${T.accent},${T.accentD})`, color:"#fff", fontFamily:sans, fontSize:14, fontWeight:700, border:"none", cursor:"pointer", padding:"0 32px", borderRadius:"0 50px 50px 0", whiteSpace:"nowrap" }}>
              Rechercher
            </button>
          </div>
        </Reveal>

        {/* Boutons CTA */}
        <Reveal delay={250}>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            <a href="/menu" style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"13px 32px", background:`linear-gradient(135deg,${T.accent},${T.accentD})`, color:"#fff", fontFamily:sans, fontSize:14, fontWeight:700, textDecoration:"none", borderRadius:50, boxShadow:`0 8px 28px ${T.accent}55`, transition:"all .2s" }}>
              Commander maintenant <ArrowRight size={15} />
            </a>
            <a href="/register?type=b2b" style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"13px 32px", background:"rgba(255,255,255,0.15)", color:"#fff", fontFamily:sans, fontSize:14, fontWeight:600, textDecoration:"none", borderRadius:50, backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.3)", transition:"all .2s" }}>
              Business Portal
            </a>
          </div>
        </Reveal>
      </div>

      {/* Stats flottantes bas */}
      <div style={{ position:"relative", zIndex:2, background:"rgba(255,255,255,0.96)", backdropFilter:"blur(12px)", borderTop:"1px solid rgba(255,255,255,0.3)" }}>
        <div style={{ maxWidth:860, margin:"0 auto", padding:"18px 24px", display:"flex", justifyContent:"center", gap:0 }}>
          {[
            { n: restaurantCount > 0 ? String(restaurantCount) : '…', l: 'Restaurants partenaires' },
            { n:"98%",     l:"Livraisons réussies" },
            { n:"30 min",  l:"Délai moyen" },
            { n:"3 clics", l:"Pour commander" },
          ].map(({n,l},i,arr) => (
            <div key={l} style={{ flex:1, textAlign:"center", paddingLeft:i>0?16:0, paddingRight:i<arr.length-1?16:0, borderRight:i<arr.length-1?`1px solid ${T.line}`:"none" }}>
              <p style={{ fontFamily:serif, fontSize:"clamp(18px,2vw,24px)", color:T.dark, fontWeight:900, margin:"0 0 2px", lineHeight:1 }}>{n}</p>
              <p style={{ fontFamily:sans, fontSize:10, color:T.mutedL, margin:0, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600 }}>{l}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Envie de quoi ? ─── */
const EMOJI_MAP = [
  { keys:["pizza"],                             emoji:"🍕" },
  { keys:["grillade","grillé","bœuf","viande","braisé","steak"], emoji:"🥩" },
  { keys:["local","ivoirien","attiéké","alloco","foutou","placali","garba"], emoji:"🍛" },
  { keys:["salade","crudité"],                  emoji:"🥗" },
  { keys:["dessert","pâtisserie","gâteau","sucré"], emoji:"🍰" },
  { keys:["boisson","jus","soda","eau","drink","cocktail"], emoji:"🥤" },
  { keys:["poisson","thon","capitaine","tilapia","sardine"], emoji:"🐟" },
  { keys:["poulet","volaille","dinde"],          emoji:"🍗" },
  { keys:["riz"],                               emoji:"🍚" },
  { keys:["burger","sandwich","wrap"],          emoji:"🍔" },
  { keys:["soupe","sauce","bouillon"],          emoji:"🍲" },
  { keys:["pâtes","pasta","spaghetti"],         emoji:"🍝" },
];

function getCatEmoji(nom) {
  const lower = (nom || "").toLowerCase();
  for (const { keys, emoji } of EMOJI_MAP) {
    if (keys.some(k => lower.includes(k))) return emoji;
  }
  return "🍽️";
}

function CategoryStrip({ activeCatId, onCategorySelect, menuRef }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    let cancelled = false;
    menuAPI.getRestaurants()
      .then(({ data: rests }) => {
        if (cancelled || !Array.isArray(rests) || !rests.length) return null;
        return menuAPI.getCategories({ restaurantId: rests[0].id });
      })
      .then(res => { if (res && !cancelled) setCategories(Array.isArray(res.data) ? res.data : []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleClick = (catId) => {
    onCategorySelect(catId === activeCatId ? null : catId);
    if (menuRef?.current) menuRef.current.scrollIntoView({ behavior:"smooth", block:"start" });
  };

  return (
    <section style={{ background:"#fff", padding:"32px 0 28px", borderBottom:`1px solid ${T.line}` }}>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 24px" }}>
        <p style={{ fontFamily:serif, fontSize:20, fontWeight:900, color:T.dark, margin:"0 0 20px" }}>Envie de quoi ?</p>
        {loading ? (
          <div style={{ display:"flex", gap:22, paddingBottom:4 }}>
            {Array.from({ length:6 }).map((_,i) => (
              <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, flexShrink:0 }}>
                <div style={{ width:68, height:68, borderRadius:"50%", background:T.bgAlt }} />
                <div style={{ width:44, height:10, borderRadius:4, background:T.bgAlt, marginTop:2 }} />
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? null : (
          <div style={{ display:"flex", gap:22, overflowX:"auto", paddingBottom:4 }}>
            {categories.map(cat => {
              const active = cat.id === activeCatId;
              return (
                <button key={cat.id} onClick={() => handleClick(cat.id)}
                  style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, background:"none", border:"none", cursor:"pointer", flexShrink:0, padding:0 }}>
                  <div style={{ width:68, height:68, borderRadius:"50%", background:active?`${T.accent}18`:T.bgAlt, border:`2px solid ${active?T.accent:T.line}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, transition:"all .18s" }}
                    onMouseEnter={e=>{ if (!active){ e.currentTarget.style.borderColor=T.accent; e.currentTarget.style.background=`${T.accent}10`; }}}
                    onMouseLeave={e=>{ if (!active){ e.currentTarget.style.borderColor=T.line; e.currentTarget.style.background=T.bgAlt; }}}>
                    {getCatEmoji(cat.nom)}
                  </div>
                  <span style={{ fontFamily:sans, fontSize:12, fontWeight:600, color:active?T.accent:T.muted }}>{cat.nom}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Marquee ─── */
function Marquee() {
  const items=["Attiéké Poisson Braisé","Alloco Poulet Grillé","Kedjenou de Poulet","Garba au Thon Frais","Foutou Sauce Graine","Riz Gras Sauté","Soupe Kandia","Placali & Sauce Graine","Aloko & Poisson Fumé","Brochettes Bœuf","Tchep au Crabe","Poulet Yassa","Mafé Mouton","Capitaine Frit"];
  return (
    <div style={{ background:T.dark,overflow:"hidden",padding:"18px 0",position:"relative" }}>
      <div style={{ position:"absolute",left:0,top:0,bottom:0,width:5,background:`linear-gradient(to bottom,${T.accent},${T.yellow})` }} />
      <div style={{ display:"flex",animation:"kfmarquee 55s linear infinite",width:"max-content" }}>
        {[...items,...items].map((d,i)=>(
          <span key={i} style={{ fontFamily:serif,fontSize:16,color:"rgba(255,255,255,0.6)",fontStyle:"italic",whiteSpace:"nowrap",padding:"0 36px" }}>
            {d}&nbsp;<span style={{ color:T.yellow,opacity:0.7 }}>◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Section "Comment ça marche" ─── */
function HowItWorks() {
  const cards = [
    {
      icon: <Truck size={26} color={T.accent} />,
      iconBg: `${T.accent}14`,
      title: "Livraison Rapide",
      body: "Des repas chauds livrés directement à votre porte ou bureau en moins de 30 minutes. Ne faites plus attendre votre faim.",
      bg: "#fff",
      titleColor: T.dark,
      bodyColor: T.muted,
      border: `1px solid ${T.line}`,
      cta: null,
    },
    {
      icon: <ShoppingBag size={26} color="#fff" />,
      iconBg: "rgba(255,255,255,0.2)",
      title: "Solutions Entreprise",
      body: "Commandes groupées, facturation mensuelle simplifiée et reçus conformes SYSCOHADA pour votre comptabilité.",
      bg: T.accent,
      titleColor: "#fff",
      bodyColor: "rgba(255,255,255,0.78)",
      border: "none",
      cta: { label:"En savoir plus →", href:"/register?type=b2b" },
    },
    {
      icon: <Heart size={26} color={T.accent} />,
      iconBg: `${T.accent}14`,
      title: "Paiement Mobile",
      body: "Réglez vos commandes en toute simplicité et sécurité avec Orange Money, MTN Mobile Money ou Wave.",
      bg: "#fff",
      titleColor: T.dark,
      bodyColor: T.muted,
      border: `1px solid ${T.line}`,
      cta: null,
    },
  ];
  return (
    <section id="processus" style={{ background:T.bgAlt, padding:"64px 0" }}>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 24px", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
        {cards.map((c,i) => (
          <Reveal key={i} delay={i*80}>
            <div style={{ background:c.bg, borderRadius:18, padding:"36px 32px", border:c.border, boxShadow:c.bg==="#fff"?"0 1px 4px rgba(0,0,0,0.06)":"0 12px 40px rgba(249,115,22,0.22)", height:"100%", display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ width:52, height:52, borderRadius:14, background:c.iconBg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                {c.icon}
              </div>
              <div style={{ flex:1 }}>
                <h3 style={{ fontFamily:serif, fontSize:20, fontWeight:800, color:c.titleColor, margin:"0 0 10px" }}>{c.title}</h3>
                <p style={{ fontFamily:sans, fontSize:14, color:c.bodyColor, lineHeight:1.7, margin:0, fontWeight:300 }}>{c.body}</p>
              </div>
              {c.cta && (
                <a href={c.cta.href} style={{ fontFamily:sans, fontSize:13, fontWeight:700, color:"#fff", textDecoration:"none", alignSelf:"flex-start" }}>
                  {c.cta.label}
                </a>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ─── Carte article du menu ─── */
function MenuItem({ item, restaurant, idx }) {
  const [fav, setFav] = useState(false);
  const [hov, setHov] = useState(false);
  const tags = [item.categorie?.nom, restaurant?.typeRestaurant || restaurant?.type].filter(Boolean);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:T.card,borderRadius:18,overflow:"hidden",boxShadow:T.shadowS,border:`1px solid ${T.line}`,transition:"all .35s cubic-bezier(.22,1,.36,1)",cursor:"pointer",transform:hov?"translateY(-4px)":"none" }}>

      {/* Photo */}
      <div style={{ position:"relative",height:200,overflow:"hidden" }}>
        <img
          src={getItemImg(item, idx)}
          alt={item.nom}
          onError={e=>{e.target.src=`https://images.unsplash.com/${FOOD_IMGS[idx%FOOD_IMGS.length]}?q=80&w=500&auto=format&fit=crop`;}}
          style={{ width:"100%",height:"100%",objectFit:"cover",display:"block",transition:"transform .55s",transform:hov?"scale(1.07)":"scale(1)" }}
        />
        {/* Bouton favori */}
        <button
          onClick={e=>{e.stopPropagation();setFav(!fav);}}
          style={{ position:"absolute",top:12,right:12,width:34,height:34,borderRadius:"50%",background:"rgba(255,255,255,0.92)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 10px rgba(0,0,0,0.15)",transition:"transform .18s" }}
          onMouseEnter={e=>e.currentTarget.style.transform="scale(1.12)"}
          onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
        >
          <Heart size={15} fill={fav?T.red:"none"} color={fav?T.red:T.muted} strokeWidth={2.5} />
        </button>
        {/* Badge note */}
        <div style={{ position:"absolute",top:12,left:12,background:"rgba(255,255,255,0.95)",borderRadius:8,padding:"4px 10px",display:"flex",alignItems:"center",gap:5,boxShadow:"0 2px 10px rgba(0,0,0,0.12)" }}>
          <Star size={12} fill={T.yellow} color={T.yellow} />
          <span style={{ fontFamily:sans,fontSize:12,fontWeight:700,color:T.dark }}>4.8</span>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding:"16px 18px 20px" }}>
        <h3 style={{ fontFamily:serif,fontSize:17,color:T.dark,fontWeight:700,margin:"0 0 3px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{item.nom}</h3>

        {/* Nom du restaurant */}
        {restaurant && (
          <p style={{ fontFamily:sans,fontSize:12,color:T.muted,margin:"0 0 9px",fontWeight:500,display:"flex",alignItems:"center",gap:5 }}>
            <UtensilsCrossed size={11} /> {restaurant.nom}
          </p>
        )}

        {/* Tags catégorie */}
        {tags.length > 0 && (
          <div style={{ display:"flex",gap:6,marginBottom:12,flexWrap:"wrap" }}>
            {tags.slice(0,2).map((t,i)=>(
              <span key={i} style={{ background:i===0?`${T.accent}18`:`${T.yellow}22`,color:i===0?T.accent:"#8A6000",fontFamily:sans,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:6 }}>{t}</span>
            ))}
          </div>
        )}

        {/* Prix + infos livraison */}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:`1px solid ${T.line}`,paddingTop:10,marginTop:6 }}>
          <span style={{ fontFamily:sans,fontSize:15,fontWeight:800,color:T.accent }}>{formatPrix(item.prix)}</span>
          <div style={{ display:"flex",gap:12,alignItems:"center" }}>
            <div style={{ display:"flex",alignItems:"center",gap:4,color:T.muted }}>
              <Clock size={12} />
              <span style={{ fontFamily:sans,fontSize:11,fontWeight:500 }}>20-35 min</span>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:4 }}>
              <Truck size={12} color="#22C55E" />
              <span style={{ fontFamily:sans,fontSize:11,fontWeight:600,color:"#16A34A" }}>Gratuit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Section menu — plats populaires ─── */
function MenuSection({ search, onSearch, sectionRef, activeCatId, onCategorySelect }) {
  const [categories, setCategories] = useState([]);
  const [items, setItems]           = useState([]);
  const [restaurantMap, setRestaurantMap] = useState({});
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data: rests } = await menuAPI.getRestaurants();
        if (cancelled || !Array.isArray(rests) || !rests.length) { setLoading(false); return; }

        /* Map id → restaurant */
        const rmap = {};
        rests.forEach(r => { rmap[r.id] = r; });

        /* Catégories du 1er restaurant */
        const catRes = await menuAPI.getCategories({ restaurantId: rests[0].id });
        if (!cancelled) setCategories(Array.isArray(catRes.data) ? catRes.data : []);

        /* Plats des 3 premiers restaurants en parallèle */
        const toFetch = rests.slice(0, 3);
        const allRaw = await Promise.all(
          toFetch.map(r =>
            menuAPI.getByRestaurant(r.id, { cible: "CLIENT" })
              .then(res => {
                const raw = res.data;
                const plats = Array.isArray(raw) ? raw : (raw?.articles ?? raw?.items ?? raw?.plats ?? []);
                return plats.map(p => ({ ...p, _restaurantId: r.id }));
              })
              .catch(() => [])
          )
        );
        if (cancelled) return;
        setRestaurantMap(rmap);
        setItems(allRaw.flat());
      } catch {
        /* backend hors-ligne */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (search && sectionRef?.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [search, sectionRef]);

  const filtered = items.filter(item => {
    if (item.disponible === false) return false;
    if (activeCatId && item.categorie?.id !== activeCatId) return false;
    if (search) {
      const q = search.toLowerCase();
      const resto = restaurantMap[item._restaurantId];
      return (
        item.nom?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.categorie?.nom?.toLowerCase().includes(q) ||
        resto?.nom?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <section id="fonctionnalites" ref={sectionRef} style={{ background:T.bg,padding:"80px 0 120px" }}>
      <div style={{ maxWidth:1280,margin:"0 auto",padding:"0 48px" }}>

        {/* ── Cuisines & Catégories ── */}
        {!loading && categories.length > 0 && (
          <Reveal>
            <div style={{ marginBottom:52 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22 }}>
                <h2 style={{ fontFamily:serif,fontSize:24,color:T.dark,fontWeight:900,margin:0 }}>Cuisines &amp; Catégories</h2>
                {search && (
                  <button onClick={()=>onSearch("")}
                    style={{ fontFamily:sans,fontSize:13,color:T.accent,background:"none",border:`1px solid ${T.accent}`,borderRadius:50,padding:"6px 16px",cursor:"pointer",fontWeight:600,display:"flex",alignItems:"center",gap:6 }}>
                    «{search}» <span style={{ fontWeight:900 }}>×</span>
                  </button>
                )}
              </div>
              <div style={{ display:"flex",gap:20,overflowX:"auto",paddingBottom:8 }}>
                {/* Tout */}
                <div onClick={()=>onCategorySelect(null)} style={{ cursor:"pointer",textAlign:"center",flexShrink:0 }}>
                  <div style={{ width:72,height:72,borderRadius:"50%",overflow:"hidden",border:`2.5px solid ${!activeCatId?T.accent:T.line}`,marginBottom:7,display:"flex",alignItems:"center",justifyContent:"center",background:!activeCatId?`${T.accent}14`:T.bgAlt,transition:"border-color .2s" }}>
                    <UtensilsCrossed size={26} color={!activeCatId?T.accent:T.muted} />
                  </div>
                  <p style={{ fontFamily:sans,fontSize:11,color:!activeCatId?T.accent:T.muted,fontWeight:700,margin:0,textAlign:"center" }}>Tout</p>
                </div>
                {categories.map((cat,i)=>(
                  <div key={cat.id} onClick={()=>onCategorySelect(activeCatId===cat.id?null:cat.id)} style={{ cursor:"pointer",textAlign:"center",flexShrink:0 }}>
                    <div style={{ width:72,height:72,borderRadius:"50%",overflow:"hidden",border:`2.5px solid ${activeCatId===cat.id?T.accent:T.line}`,marginBottom:7,transition:"border-color .2s" }}>
                      <img
                        src={`https://images.unsplash.com/${FOOD_IMGS[i%FOOD_IMGS.length]}?q=70&w=140&auto=format&fit=crop`}
                        alt={cat.nom}
                        style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }}
                      />
                    </div>
                    <p style={{ fontFamily:sans,fontSize:11,color:activeCatId===cat.id?T.accent:T.muted,fontWeight:700,margin:0,textAlign:"center",maxWidth:72,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{cat.nom}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {/* ── Titre section plats ── */}
        <Reveal>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28 }}>
            <h2 style={{ fontFamily:serif,fontSize:24,color:T.dark,fontWeight:900,margin:0 }}>Populaires près de vous</h2>
            <a href="/menu" style={{ fontFamily:sans,fontSize:13,fontWeight:700,color:T.accent,textDecoration:"none",display:"flex",alignItems:"center",gap:5 }}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.75"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              Voir tout <ArrowRight size={14} />
            </a>
          </div>
        </Reveal>

        {/* Loading */}
        {loading && (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:24 }}>
            {Array.from({length:9}).map((_,i)=><SkeletonCard key={i} />)}
          </div>
        )}

        {/* Résultats */}
        {!loading && filtered.length > 0 && (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:24 }}>
            {filtered.slice(0,9).map((item,i)=>(
              <Reveal key={item.id??i} delay={i*45}>
                <MenuItem item={item} restaurant={restaurantMap[item._restaurantId]} idx={i} />
              </Reveal>
            ))}
          </div>
        )}

        {/* État vide */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:"center",padding:"70px 0" }}>
            {search ? (
              <>
                <p style={{ fontFamily:serif,fontSize:22,color:T.muted,fontStyle:"italic",margin:"0 0 16px" }}>Aucun résultat pour «&nbsp;{search}&nbsp;»</p>
                <button onClick={()=>onSearch("")} style={{ fontFamily:sans,fontSize:14,color:T.accent,background:"none",border:`1.5px solid ${T.accent}`,borderRadius:50,padding:"10px 24px",cursor:"pointer",fontWeight:600 }}>Voir tout le menu</button>
              </>
            ) : (
              <p style={{ fontFamily:serif,fontSize:22,color:T.muted,fontStyle:"italic" }}>{items.length===0?"Menu en cours de préparation…":"Aucun plat dans cette catégorie."}</p>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <Reveal delay={80}>
            <div style={{ textAlign:"center",marginTop:48 }}>
              <a href="/menu" style={{ display:"inline-flex",alignItems:"center",gap:9,fontFamily:sans,fontSize:15,fontWeight:700,color:T.accent,textDecoration:"none",border:`2px solid ${T.accent}`,borderRadius:50,padding:"14px 38px",transition:"all .22s" }}
                onMouseEnter={e=>{e.currentTarget.style.background=T.accent;e.currentTarget.style.color="#fff";}}
                onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.accent;}}>
                Explorer tout le menu <ArrowRight size={16} />
              </a>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}

/* ─── Bandeaux des avantages ─── */
function Banners() {
  const banners=[
    { img:"photo-1568901346375-23c9450c58cd", title:"MOST POPULAR BURGER", sub:"À ne pas manquer", dark:true },
    { img:"photo-1555939594-58d7cb561ad1", title:"MORE FUN, MORE TASTE", sub:"Essayez aujourd'hui", dark:false },
    { img:"photo-1565299585323-38d6b0865b47", title:"FRESH & CHILL",       sub:"Fraîcheur garantie",  dark:false },
  ];
  return (
    <section style={{ background:T.bgAlt,padding:"120px 0",position:"relative",overflow:"hidden" }}>
      <Brush color={T.accent} opacity={0.1} style={{ width:600,top:"10%",right:-100 }} />
      <div style={{ maxWidth:1280,margin:"0 auto",padding:"0 48px" }}>
        <Reveal>
          <div style={{ textAlign:"center",marginBottom:56 }}>
            <Chip color={T.yellow}>Coups de cœur</Chip>
            <h2 style={{ fontFamily:serif,fontSize:"clamp(34px,4vw,56px)",color:T.dark,fontWeight:900,lineHeight:1.06,margin:0,letterSpacing:"-0.025em" }}>
              À essayer <em style={{ color:T.accent }}>aujourd'hui.</em>
            </h2>
          </div>
        </Reveal>
        <div style={{ display:"grid",gridTemplateColumns:"1.2fr 1fr",gridTemplateRows:"220px 220px",gap:14 }}>
          {banners.map((b,i)=>(
            <Reveal key={b.title} delay={i*80}>
              <div className="rd-feat-card" style={{ position:"relative",borderRadius:18,overflow:"hidden",cursor:"pointer",transition:"all .35s",boxShadow:T.shadowS,...(i===0?{gridRow:"1/3"}:{}) }}>
                <img src={`https://images.unsplash.com/${b.img}?q=80&w=600&auto=format&fit=crop`} alt={b.title} style={{ width:"100%",height:"100%",objectFit:"cover",display:"block",transition:"transform .5s" }} />
                <div style={{ position:"absolute",inset:0,background:b.dark?"linear-gradient(to bottom right,rgba(26,12,0,0.85) 0%,rgba(26,12,0,0.4) 100%)":"linear-gradient(to bottom,rgba(26,12,0,0.25) 0%,rgba(26,12,0,0.75) 100%)" }} />
                <div style={{ position:"absolute",top:24,left:24,bottom:24,display:"flex",flexDirection:"column",justifyContent:"flex-end" }}>
                  <span style={{ fontFamily:sans,fontSize:10,color:T.yellow,letterSpacing:"0.16em",textTransform:"uppercase",fontWeight:700,display:"block",marginBottom:6 }}>À ESSAYER</span>
                  <p style={{ fontFamily:serif,fontSize:i===0?28:22,color:"#fff",fontWeight:900,margin:"0 0 8px",lineHeight:1.1 }}>{b.title}</p>
                  <a href="/menu" style={{ display:"inline-flex",alignItems:"center",gap:6,fontFamily:sans,fontSize:13,fontWeight:700,color:"#fff",textDecoration:"none",background:`linear-gradient(135deg,${T.accent},${T.accentD})`,borderRadius:50,padding:"8px 18px",alignSelf:"flex-start",boxShadow:`0 4px 14px ${T.accent}44` }}>
                    Commander <ArrowRight size={12} />
                  </a>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Section statistiques ─── */
function Stats() {
  const items=[
    { n:12000, pre:"+", suf:"", l:"Clients actifs",     c:T.accent },
    { n:98,    pre:"",  suf:"%",l:"Taux livraison",      c:T.yellow },
    { n:47,    pre:"",  suf:"k",l:"Commandes ce mois",   c:T.accent },
    { n:4,     pre:"",  suf:" min",l:"Délai moyen",       c:T.yellow },
  ];
  return (
    <section style={{ background:T.dark,padding:"90px 0",position:"relative",overflow:"hidden" }}>
      <KS h={4} />
      <Brush color={T.accent} opacity={0.08} style={{ width:600,top:"-10%",left:"20%" }} />
      <div style={{ position:"relative",zIndex:1,maxWidth:1280,margin:"0 auto",padding:"0 48px",display:"grid",gridTemplateColumns:"repeat(4,1fr)" }}>
        {items.map((s,i)=>(
          <Reveal key={s.l} delay={i*80}>
            <div style={{ textAlign:"center",padding:"0 28px",borderRight:i<3?`1px solid rgba(255,255,255,0.08)`:"none" }}>
              <p style={{ fontFamily:serif,fontSize:"clamp(44px,5vw,70px)",fontWeight:900,color:"#fff",margin:"0 0 8px",lineHeight:1 }}>
                {s.pre}<Counter end={s.n} />{s.suf}
              </p>
              <div style={{ width:28,height:2,background:s.c,margin:"0 auto 10px",borderRadius:1 }} />
              <p style={{ fontFamily:sans,fontSize:11,color:s.c,margin:0,letterSpacing:"0.14em",textTransform:"uppercase",fontWeight:700 }}>{s.l}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <div style={{ marginTop:90 }}><KS h={4} /></div>
    </section>
  );
}

/* ─── Section témoignages ─── */
function Testimonials() {
  const items=[
    { q:"Le QR Code table a transformé notre restaurant. Moins d'erreurs, clients ravis, CA +23% en 3 mois.", name:"Koffi Jean-Claude", role:"Gérant — Le Wôrôwôrô, Cocody", ini:"KJ", c:T.accent },
    { q:"Facturation B2B consolidée pour 50 collaborateurs. La déclaration TVA se fait en 5 minutes maintenant.", name:"Aminata Touré", role:"DRH — TechCI Abidjan", ini:"AT", c:T.yellow },
    { q:"Commander avec Wave et voir ma commande avancer en direct. Simple et rapide. Je recommande à tous.", name:"Marc Kouassi", role:"Client fidèle — Yopougon", ini:"MK", c:T.accent },
  ];
  return (
    <section style={{ background:T.bg,padding:"120px 0" }}>
      <div style={{ maxWidth:1280,margin:"0 auto",padding:"0 48px" }}>
        <Reveal>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:60,flexWrap:"wrap",gap:20 }}>
            <div>
              <Chip color={T.accent}>Avis clients</Chip>
              <h2 style={{ fontFamily:serif,fontSize:"clamp(34px,4vw,52px)",color:T.dark,fontWeight:900,lineHeight:1.08,margin:0,letterSpacing:"-0.025em" }}>
                Ce qu'ils en <em style={{ color:T.accent }}>disent.</em>
              </h2>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ display:"flex",gap:3,justifyContent:"flex-end",marginBottom:4 }}><Stars n={5}/></div>
              <p style={{ fontFamily:sans,fontSize:16,fontWeight:700,color:T.dark,margin:"0 0 2px" }}>4.9 / 5</p>
              <p style={{ fontFamily:sans,fontSize:12,color:T.mutedL,margin:0 }}>2 400+ avis vérifiés</p>
            </div>
          </div>
        </Reveal>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:22 }}>
          {items.map((t,i)=>(
            <Reveal key={t.name} delay={i*90}>
              <div className="rd-feat-card" style={{ background:T.card,border:`1px solid ${T.line}`,borderTop:`3px solid ${t.c}`,borderRadius:20,padding:"38px 32px",display:"flex",flexDirection:"column",boxShadow:T.shadowS,transition:"all .35s" }}>
                <div style={{ fontFamily:serif,fontSize:80,color:`${t.c}20`,lineHeight:0.55,marginBottom:18,fontWeight:900 }}>"</div>
                <div style={{ display:"flex",gap:3,marginBottom:14 }}><Stars n={5}/></div>
                <p style={{ fontFamily:serif,fontSize:17,color:T.text,lineHeight:1.72,fontStyle:"italic",margin:"0 0 auto",fontWeight:400 }}>"{t.q}"</p>
                <div style={{ display:"flex",alignItems:"center",gap:14,paddingTop:24,marginTop:24,borderTop:`1px solid ${T.line}` }}>
                  <div style={{ width:46,height:46,borderRadius:"50%",background:`${t.c}18`,border:`2px solid ${t.c}35`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <span style={{ fontFamily:sans,fontSize:14,fontWeight:800,color:t.c }}>{t.ini}</span>
                  </div>
                  <div>
                    <p style={{ fontFamily:sans,fontSize:14,fontWeight:700,color:T.dark,margin:"0 0 2px" }}>{t.name}</p>
                    <p style={{ fontFamily:sans,fontSize:12,color:T.mutedL,margin:0 }}>{t.role}</p>
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

/* ─── Double offre — Client & Restaurant ─── */
function DualOffer() {
  const cards=[
    { tag:"GRAND PUBLIC", tagBg:T.accent, tagCol:"#fff", topCol:T.accent, title:"Pour toute la famille", sub:"Commandez, payez, profitez.", img:"photo-1567620905732-2d1ec7ab7445", perks:["Menu dynamique & QR Code table","Orange Money · MTN · Wave · Espèces","Suivi commande en temps réel","Reçu SYSCOHADA par email"], perkCol:T.accent, cta:"Commander maintenant", ctaBg:`linear-gradient(135deg,${T.accent},${T.accentD})`, ctaCol:"#fff", href:"/menu" },
    { tag:"ENTREPRISE",   tagBg:T.yellow, tagCol:T.dark,  topCol:T.yellow, title:"Pour vos équipes",     sub:"Gérez, facturez, conformez.",  img:"photo-1573164574511-73c773193279", perks:["Commandes groupées 50+ repas","Facturation mensuelle consolidée","Budgets par collaborateur","Conformité TVA 18% & SYSCOHADA"], perkCol:T.yellow, cta:"Créer un compte Entreprise →", ctaBg:`linear-gradient(135deg,${T.yellow},#F8A020)`, ctaCol:T.dark, href:"/register?type=b2b" },
  ];
  return (
    <section id="offres" style={{ background:T.bgAlt,padding:"120px 0",position:"relative",overflow:"hidden" }}>
      <Brush color={T.yellow} opacity={0.12} style={{ width:500,bottom:0,right:-80 }} />
      <div style={{ maxWidth:1280,margin:"0 auto",padding:"0 48px" }}>
        <Reveal>
          <div style={{ textAlign:"center",marginBottom:72 }}>
            <Chip color={T.accent}>Deux mondes, une solution</Chip>
            <h2 style={{ fontFamily:serif,fontSize:"clamp(34px,4vw,56px)",color:T.dark,fontWeight:900,lineHeight:1.06,margin:0,letterSpacing:"-0.025em" }}>
              Particuliers & <em style={{ color:T.accent }}>Entreprises</em>
            </h2>
          </div>
        </Reveal>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:24 }}>
          {cards.map((c,i)=>(
            <Reveal key={c.tag} dir={i===0?"left":"right"} delay={i*100}>
              <div className="rd-feat-card" style={{ borderRadius:22,overflow:"hidden",background:T.card,boxShadow:T.shadow,borderTop:`3px solid ${c.topCol}`,transition:"all .35s" }}>
                <div style={{ height:270,overflow:"hidden",position:"relative" }}>
                  <img src={`https://images.unsplash.com/${c.img}?q=80&w=800&auto=format&fit=crop`} alt={c.title} style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }} />
                  <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 25%,rgba(26,12,0,0.9))" }} />
                  <div style={{ position:"absolute",bottom:22,left:26,right:26 }}>
                    <span style={{ display:"inline-block",background:c.tagBg,color:c.tagCol,fontFamily:sans,fontSize:10,fontWeight:700,letterSpacing:"0.14em",padding:"5px 14px",borderRadius:20,marginBottom:9 }}>{c.tag}</span>
                    <p style={{ fontFamily:serif,fontSize:24,fontWeight:700,color:"#fff",fontStyle:"italic",margin:"0 0 3px" }}>{c.title}</p>
                    <p style={{ fontFamily:sans,fontSize:12,color:"rgba(255,255,255,0.55)",margin:0 }}>{c.sub}</p>
                  </div>
                </div>
                <div style={{ padding:"28px 26px 34px" }}>
                  {c.perks.map(p=>(
                    <div key={p} style={{ display:"flex",gap:11,alignItems:"center",marginBottom:12 }}>
                      <div style={{ width:22,height:22,borderRadius:"50%",background:`${c.perkCol}16`,border:`1px solid ${c.perkCol}28`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                        <Check size={11} color={c.perkCol} strokeWidth={2.5} />
                      </div>
                      <span style={{ fontFamily:sans,fontSize:14,color:T.muted }}>{p}</span>
                    </div>
                  ))}
                  <a href={c.href} style={{ display:"block",marginTop:24,padding:"14px 0",textAlign:"center",background:c.ctaBg,color:c.ctaCol,fontFamily:sans,fontSize:14,fontWeight:700,textDecoration:"none",borderRadius:50,boxShadow:i===0?`0 8px 24px ${T.accent}40`:`0 8px 24px ${T.yellow}40`,transition:"opacity .2s" }}
                    onMouseEnter={e=>e.currentTarget.style.opacity="0.88"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>{c.cta}</a>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Section appel à l'action ─── */
function CTA() {
  return (
    <section style={{ background:T.dark,padding:"100px 48px",position:"relative",overflow:"hidden" }}>
      <KS h={4} />
      <Brush color={T.accent} opacity={0.12} style={{ width:700,top:"0%",right:-100 }} />
      <Brush color={T.yellow} opacity={0.1} style={{ width:500,bottom:"0%",left:-80,transform:"scaleX(-1) rotate(10deg)" }} />
      <div style={{ position:"relative",zIndex:1,maxWidth:800,margin:"0 auto",textAlign:"center" }}>
        <Reveal>
          <Chip color={T.yellow}>Rejoindre la plateforme</Chip>
          <h2 style={{ fontFamily:serif,fontSize:"clamp(42px,6.5vw,88px)",color:"#fff",fontWeight:900,lineHeight:0.98,margin:"0 0 24px",letterSpacing:"-0.035em" }}>
            Prêt à commander<br/><em style={{ color:T.accent }}>maintenant&nbsp;?</em>
          </h2>
          <p style={{ fontFamily:sans,fontSize:18,color:"rgba(255,255,255,0.5)",lineHeight:1.8,margin:"0 auto 52px",fontWeight:300,maxWidth:500 }}>
            Rejoignez des milliers de clients sur la première plateforme de restauration digitale de Côte d'Ivoire.
          </p>
          <div style={{ display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap" }}>
            <a href="/menu" className="rd-btn-cta" style={{ padding:"17px 52px",background:`linear-gradient(135deg,${T.accent},${T.accentD})`,color:"#fff",fontFamily:sans,fontSize:15,fontWeight:700,textDecoration:"none",borderRadius:50,boxShadow:`0 12px 40px ${T.accent}55`,transition:"all .24s",display:"inline-flex",alignItems:"center",gap:9 }}>
              Explorer le Menu <ArrowRight size={16} />
            </a>
            <a href="/register" className="rd-btn-outline" style={{ padding:"17px 52px",border:"2px solid rgba(255,255,255,0.25)",color:"rgba(255,255,255,0.8)",background:"transparent",fontFamily:sans,fontSize:15,fontWeight:700,textDecoration:"none",borderRadius:50,transition:"all .24s" }}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.1)";e.currentTarget.style.color="#fff";}}
              onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="rgba(255,255,255,0.8)";}}>
              Devenir Partenaire
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Section Newsletter dédiée ─── */
function NewsletterSection() {
  const [email, setEmail]   = useState("");
  const [state, setState]   = useState("idle"); // idle | loading | success | error
  const [msg,   setMsg]     = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState("loading");
    try {
      const res = await newsletterAPI.subscribe(email.trim());
      setMsg(res.data?.message || "Inscription confirmée !");
      setState("success");
      setEmail("");
    } catch (err) {
      setMsg(err?.response?.data?.message || "Une erreur est survenue. Réessayez.");
      setState("error");
    }
  };

  return (
    <section style={{ background: T.accent, padding: "80px 48px", position: "relative", overflow: "hidden" }}>
      <Brush color="#fff" opacity={0.06} style={{ width: 600, top: "-20%", right: -100 }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
        <Reveal>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Mail size={26} color="#fff" />
          </div>
          <h2 style={{ fontFamily: serif, fontSize: "clamp(28px,4vw,46px)", color: "#fff", fontWeight: 900, lineHeight: 1.08, margin: "0 0 14px", letterSpacing: "-0.025em" }}>
            Restez dans la boucle
          </h2>
          <p style={{ fontFamily: sans, fontSize: 16, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, margin: "0 auto 36px", maxWidth: 480, fontWeight: 300 }}>
            Offres exclusives, nouveaux restaurants partenaires, promotions — recevez l'actualité Resto d'ici directement dans votre boîte mail.
          </p>

          {state === "success" ? (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 50, padding: "14px 30px" }}>
              <Check size={18} color="#fff" />
              <span style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, color: "#fff" }}>{msg}</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", gap: 0, maxWidth: 520, margin: "0 auto", borderRadius: 50, overflow: "hidden", boxShadow: "0 12px 48px rgba(0,0,0,0.18)", background: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 20px", flex: 1 }}>
                <Mail size={16} color={T.mutedL} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.ci"
                  required
                  style={{ border: "none", outline: "none", fontFamily: sans, fontSize: 14, color: T.text, background: "transparent", width: "100%", padding: "15px 0" }}
                />
              </div>
              <button
                type="submit"
                disabled={state === "loading"}
                style={{ background: T.dark, color: "#fff", fontFamily: sans, fontSize: 13, fontWeight: 700, border: "none", cursor: state === "loading" ? "wait" : "pointer", padding: "0 28px", borderRadius: "0 50px 50px 0", whiteSpace: "nowrap", opacity: state === "loading" ? 0.7 : 1 }}
              >
                {state === "loading" ? "…" : "S'inscrire"}
              </button>
            </form>
          )}
          {state === "error" && (
            <p style={{ fontFamily: sans, fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 12 }}>{msg}</p>
          )}
          <p style={{ fontFamily: sans, fontSize: 11, color: "rgba(255,255,255,0.45)", margin: "16px 0 0", letterSpacing: "0.04em" }}>
            Pas de spam. Désabonnement en un clic.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Pied de page ─── */
function Footer() {
  const [nlEmail, setNlEmail] = useState("");
  const [nlDone,  setNlDone]  = useState(false);

  const handleNl = async (e) => {
    e.preventDefault();
    if (!nlEmail.trim()) return;
    try { await newsletterAPI.subscribe(nlEmail.trim()); } catch { /* déjà inscrit ou erreur — on affiche quand même le succès */ }
    setNlDone(true);
    setNlEmail("");
  };

  const COLS = [
    {
      title: "Produit",
      links: [
        ["Explorer le menu",      "/menu"],
        ["Commander en ligne",    "/menu"],
        ["Suivi de commande",     "/login"],
        ["QR Code table",         "#"],
        ["Livraison à domicile",  "#"],
      ],
    },
    {
      title: "Entreprises",
      links: [
        ["Espace B2B",               "/register?type=b2b"],
        ["Commandes groupées",        "/b2b"],
        ["Facturation SYSCOHADA",     "/b2b/invoices"],
        ["Budgets collaborateurs",    "/b2b/teams"],
        ["Rapports & analytics",      "/b2b/reports"],
      ],
    },
    {
      title: "Restaurateurs",
      links: [
        ["Interface Gérant",      "/gerant"],
        ["Gestion des stocks",    "/gerant"],
        ["KDS Cuisine",           "/gerant"],
        ["Trésorerie & rapports", "/gerant"],
        ["Devenir partenaire",    "/register"],
      ],
    },
    {
      title: "Support",
      links: [
        ["Centre d'aide",         "/aide"],
        ["Nous contacter",        "/contact"],
        ["Statut des services",   "#"],
        ["Mentions légales",      "/legal"],
        ["Confidentialité",       "/privacy"],
      ],
    },
  ];

  const SOCIALS = [
    { label: "Instagram", href: "#", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" },
    { label: "Twitter/X", href: "#", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
    { label: "Facebook", href: "#", path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
    { label: "WhatsApp", href: "#", path: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" },
  ];

  const PAYMENTS = [
    { label: "Orange Money", color: "#FF6600" },
    { label: "Wave",         color: "#1DC9E8" },
    { label: "MTN MoMo",     color: "#FFCC02" },
  ];

  return (
    <footer style={{ background: "#0A0F1E", borderTop: `3px solid transparent`, backgroundImage: `linear-gradient(#0A0F1E,#0A0F1E) padding-box, linear-gradient(90deg,${T.accent},${T.yellow},${T.accent}) border-box` }}>

      {/* ── Corps principal ── */}
      <div style={{ maxWidth:1280, margin:"0 auto", padding:"72px 48px 0" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1.8fr 1fr 1fr 1fr 1fr", gap:48, paddingBottom:56, borderBottom:"1px solid rgba(255,255,255,0.07)" }}>

          {/* Colonne marque */}
          <div>
            {/* Logo */}
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16 }}>
              <div style={{ width:42,height:42,borderRadius:13,background:`linear-gradient(135deg,${T.accent},${T.yellow})`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 8px 24px ${T.accent}40` }}>
                <UtensilsCrossed style={{ width:21,height:21,color:"#fff" }} />
              </div>
              <div>
                <p style={{ fontFamily:serif,fontWeight:900,color:"#fff",fontSize:20,margin:0,lineHeight:1 }}>Resto d'ici</p>
                <p style={{ fontFamily:sans,fontSize:10,color:"rgba(255,255,255,0.35)",margin:0,letterSpacing:"0.08em",textTransform:"uppercase" }}>Abidjan · Côte d'Ivoire</p>
              </div>
            </div>

            <p style={{ fontFamily:sans,fontSize:13.5,color:"rgba(255,255,255,0.38)",lineHeight:1.9,maxWidth:240,fontWeight:300,margin:"0 0 24px" }}>
              La plateforme qui modernise la restauration en Afrique de l'Ouest — de la commande à la facturation SYSCOHADA.
            </p>

            {/* Réseaux sociaux */}
            <div style={{ display:"flex",gap:8,marginBottom:28 }}>
              {SOCIALS.map(({ label, href, path }) => (
                <a key={label} href={href} aria-label={label}
                  style={{ width:34,height:34,borderRadius:9,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.09)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",textDecoration:"none" }}
                  onMouseEnter={e=>{e.currentTarget.style.background=`${T.accent}22`;e.currentTarget.style.borderColor=`${T.accent}55`;}}
                  onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.borderColor="rgba(255,255,255,0.09)";}}>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="rgba(255,255,255,0.5)">
                    <path d={path} />
                  </svg>
                </a>
              ))}
            </div>

            {/* Moyens de paiement */}
            <div>
              <p style={{ fontFamily:sans,fontSize:10,color:"rgba(255,255,255,0.25)",letterSpacing:"0.1em",textTransform:"uppercase",margin:"0 0 10px" }}>Paiements acceptés</p>
              <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                {PAYMENTS.map(({ label, color }) => (
                  <div key={label} style={{ display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.05)",borderRadius:7,padding:"5px 10px",border:"1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ width:8,height:8,borderRadius:"50%",background:color,boxShadow:`0 0 6px ${color}` }} />
                    <span style={{ fontFamily:sans,fontSize:11,color:"rgba(255,255,255,0.45)",fontWeight:500 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Colonnes liens */}
          {COLS.map(col => (
            <div key={col.title}>
              <p style={{ fontFamily:sans,fontSize:11,color:"rgba(255,255,255,0.25)",letterSpacing:"0.13em",textTransform:"uppercase",marginBottom:20,fontWeight:700 }}>{col.title}</p>
              <ul style={{ listStyle:"none",padding:0,margin:0 }}>
                {col.links.map(([label, href]) => (
                  <li key={label} style={{ marginBottom:12 }}>
                    <a href={href} style={{ fontFamily:sans,fontSize:13.5,color:"rgba(255,255,255,0.45)",textDecoration:"none",fontWeight:400,display:"inline-flex",alignItems:"center",gap:4,transition:"color .18s" }}
                      onMouseEnter={e=>{e.currentTarget.style.color="#fff";}}
                      onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,0.45)";}}>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Newsletter band ── */}
        <div style={{ padding:"32px 0",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:20 }}>
          <div>
            <p style={{ fontFamily:serif,fontSize:18,color:"#fff",fontWeight:700,margin:"0 0 4px" }}>Restez informé</p>
            <p style={{ fontFamily:sans,fontSize:13,color:"rgba(255,255,255,0.35)",margin:0 }}>Offres exclusives, nouveaux restaurants, actualités Resto d'ici.</p>
          </div>
          {nlDone ? (
            <div style={{ display:"flex",alignItems:"center",gap:8,background:"rgba(16,185,129,0.12)",border:"1px solid rgba(16,185,129,0.25)",borderRadius:11,padding:"12px 20px",flexShrink:0 }}>
              <Check size={14} color="#10B981" />
              <span style={{ fontFamily:sans,fontSize:13,fontWeight:600,color:"#10B981" }}>Vous êtes inscrit !</span>
            </div>
          ) : (
            <form onSubmit={handleNl} style={{ display:"flex",gap:0,borderRadius:11,overflow:"hidden",border:"1px solid rgba(255,255,255,0.12)",flexShrink:0 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.05)",padding:"0 16px" }}>
                <Mail size={14} color="rgba(255,255,255,0.3)" />
                <input
                  type="email" required value={nlEmail} onChange={e => setNlEmail(e.target.value)}
                  placeholder="votre@email.ci"
                  style={{ border:"none",outline:"none",background:"transparent",fontFamily:sans,fontSize:13,color:"#fff",width:200,padding:"12px 0" }}
                />
              </div>
              <button type="submit" style={{ background:`linear-gradient(135deg,${T.accent},${T.accentD})`,color:"#fff",fontFamily:sans,fontSize:13,fontWeight:700,border:"none",cursor:"pointer",padding:"0 22px",whiteSpace:"nowrap" }}>
                S'inscrire
              </button>
            </form>
          )}
        </div>

        {/* ── Barre de bas ── */}
        <div style={{ padding:"22px 0 28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16 }}>

          {/* Kente strip + copyright */}
          <div style={{ display:"flex",alignItems:"center",gap:14 }}>
            <div style={{ display:"flex",gap:2 }}>
              {KENTE.map((c,i) => <div key={i} style={{ width:18,height:3,borderRadius:2,background:c }} />)}
            </div>
            <p style={{ fontFamily:sans,fontSize:12,color:"rgba(255,255,255,0.22)",margin:0 }}>
              © 2026 Resto d'ici. Tous droits réservés.
            </p>
          </div>

          {/* Liens légaux */}
          <div style={{ display:"flex",gap:20,flexWrap:"wrap" }}>
            {[["CGU","/legal"],["Confidentialité","/privacy"],["Cookies","#"],["Accessibilité","#"]].map(([l, href]) => (
              <a key={l} href={href} style={{ fontFamily:sans,fontSize:12,color:"rgba(255,255,255,0.25)",textDecoration:"none",transition:"color .18s" }}
                onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.6)"}
                onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.25)"}>
                {l}
              </a>
            ))}
          </div>

          {/* Status + crédit */}
          <div style={{ display:"flex",alignItems:"center",gap:16 }}>
            <div style={{ display:"flex",alignItems:"center",gap:6,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:20,padding:"4px 11px" }}>
              <div style={{ width:6,height:6,borderRadius:"50%",background:"#10B981",boxShadow:"0 0 6px #10B981" }} />
              <span style={{ fontFamily:sans,fontSize:11,color:"rgba(16,185,129,0.85)",fontWeight:600 }}>Systèmes opérationnels</span>
            </div>
            <p style={{ fontFamily:sans,fontSize:12,color:"rgba(255,255,255,0.18)",margin:0 }}>
              par <span style={{ color:"rgba(255,255,255,0.35)" }}>Sankofa-Lab</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Composant principal — Page d'accueil ─── */
export default function Home() {
  const [search, setSearch]           = useState("");
  const [activeCatId, setActiveCatId] = useState(null);
  const [restaurantCount, setRestaurantCount] = useState(0);
  const menuRef = useRef(null);
  useEffect(() => {
    menuAPI.getRestaurants().then(res => setRestaurantCount((res.data || []).length)).catch(() => {});
  }, []);
  return (
    <div style={{ background:T.bg,minHeight:"100dvh",overflowX:"hidden" }}>
      <FontLoader />
      <Nav />
      <Hero search={search} onSearch={setSearch} menuRef={menuRef} restaurantCount={restaurantCount} />
      <CategoryStrip activeCatId={activeCatId} onCategorySelect={setActiveCatId} menuRef={menuRef} />
      <HowItWorks />
      <Marquee />
      <MenuSection search={search} onSearch={setSearch} sectionRef={menuRef} activeCatId={activeCatId} onCategorySelect={setActiveCatId} />
      <Banners />
      <Stats />
      <Testimonials />
      <DualOffer />
      <CTA />
      <NewsletterSection />
      <Footer />
    </div>
  );
}
