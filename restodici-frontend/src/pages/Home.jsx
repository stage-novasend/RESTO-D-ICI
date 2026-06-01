import { useState, useEffect, useRef } from "react";
import { UtensilsCrossed, ArrowRight, Check, Star, Search, ShoppingBag, Truck, Clock } from "lucide-react";
import { menuAPI } from "../services/api";

/* ─── Palette ─── */
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

/* ─── Image fallback pool ─── */
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
  if (item?.imageUrl) return item.imageUrl;
  return `https://images.unsplash.com/${FOOD_IMGS[idx % FOOD_IMGS.length]}?q=80&w=500&auto=format&fit=crop`;
}

function formatPrix(prix) {
  if (prix === null || prix === undefined) return "—";
  return new Intl.NumberFormat("fr-FR").format(prix) + " FCFA";
}

/* ─── Utilities ─── */
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

/* ─── Skeleton card ─── */
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

/* ─── Nav ─── */
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
          <a href="/login" className="rd-nav-link" style={{ fontFamily:sans,fontSize:14,fontWeight:600,color:T.muted,textDecoration:"none",padding:"8px 16px",transition:"color .2s" }}>Connexion</a>
          <a href="/menu" className="rd-btn-cta" style={{ fontFamily:sans,fontSize:13,fontWeight:700,color:"#fff",textDecoration:"none",padding:"10px 24px",borderRadius:50,background:`linear-gradient(135deg,${T.accent},${T.accentD})`,boxShadow:`0 6px 22px ${T.accent}44`,transition:"all .22s",display:"inline-flex",alignItems:"center",gap:6 }}>Commander <ArrowRight size={13} /></a>
        </div>
      </div>
    </nav>
  );
}

/* ─── Hero ─── */
function Hero({ search, onSearch, menuRef }) {
  const handleSubmit = () => {
    if (menuRef?.current) {
      menuRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  return (
    <section style={{ background:T.bg,minHeight:"100vh",position:"relative",overflow:"hidden",display:"flex",flexDirection:"column" }}>
      <KS h={3} />
      <Brush color={T.accent} opacity={0.13} style={{ width:700,top:-60,right:-80 }} />
      <Brush color={T.yellow} opacity={0.12} style={{ width:500,bottom:80,left:-100,transform:"rotate(15deg)" }} />
      <div style={{ position:"absolute",right:-120,top:"5%",width:680,height:680,borderRadius:"50%",background:`radial-gradient(circle,${T.accent}22 0%,transparent 68%)`,pointerEvents:"none" }} />
      <div style={{ position:"absolute",left:-80,bottom:"10%",width:420,height:420,borderRadius:"50%",background:`radial-gradient(circle,${T.yellow}18 0%,transparent 70%)`,pointerEvents:"none" }} />

      <div style={{ position:"relative",zIndex:2,flex:1,maxWidth:1280,margin:"0 auto",padding:"148px 48px 80px",width:"100%",display:"grid",gridTemplateColumns:"1fr 0.9fr",gap:60,alignItems:"center" }}>
        <div>
          <Reveal>
            <Chip>Abidjan · Côte d'Ivoire · 2026</Chip>
          </Reveal>
          <Reveal delay={60}>
            <h1 style={{ fontFamily:serif,fontWeight:900,fontSize:"clamp(52px,8vw,104px)",color:T.dark,lineHeight:0.93,letterSpacing:"-0.03em",margin:"0 0 30px" }}>
              Mangez<br/>
              <em style={{ color:T.accent,fontStyle:"italic" }}>local,</em><br/>
              vivez mieux.
            </h1>
          </Reveal>
          <Reveal delay={130}>
            <p style={{ fontFamily:sans,fontSize:18,color:T.muted,lineHeight:1.78,maxWidth:480,margin:"0 0 44px",fontWeight:300 }}>
              Les saveurs authentiques d'Abidjan à portée de doigt. Commandez depuis votre table ou faites-vous livrer. Paiement Mobile Money en 3 clics.
            </p>
          </Reveal>

          {/* Search bar — contrôlé */}
          <Reveal delay={180}>
            <div style={{ display:"flex",gap:0,marginBottom:44,maxWidth:480,borderRadius:14,overflow:"hidden",boxShadow:`0 6px 30px rgba(0,0,0,0.1)`,border:`1px solid ${T.line}` }}>
              <div style={{ display:"flex",alignItems:"center",gap:10,background:T.card,padding:"0 20px",flex:1 }}>
                <Search size={18} color={T.mutedL} />
                <input
                  value={search}
                  onChange={e => onSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  placeholder="Rechercher un plat…"
                  style={{ border:"none",outline:"none",fontFamily:sans,fontSize:15,color:T.text,background:"transparent",width:"100%",padding:"17px 0" }}
                />
                {search && (
                  <button onClick={() => onSearch("")} style={{ background:"none",border:"none",cursor:"pointer",color:T.mutedL,fontSize:18,lineHeight:1,padding:"0 4px" }}>×</button>
                )}
              </div>
              <button onClick={handleSubmit} style={{ background:`linear-gradient(135deg,${T.accent},${T.accentD})`,color:"#fff",fontFamily:sans,fontSize:14,fontWeight:700,border:"none",cursor:"pointer",padding:"0 28px",whiteSpace:"nowrap" }}>Rechercher</button>
            </div>
          </Reveal>

          <Reveal delay={220}>
            <div style={{ display:"flex",gap:12,flexWrap:"wrap",marginBottom:56 }}>
              <a href="/menu" className="rd-btn-cta" style={{ padding:"16px 40px",background:`linear-gradient(135deg,${T.accent},${T.accentD})`,color:"#fff",fontFamily:sans,fontSize:15,fontWeight:700,textDecoration:"none",borderRadius:50,boxShadow:`0 10px 36px ${T.accent}50`,transition:"all .24s",display:"inline-flex",alignItems:"center",gap:9 }}>
                Commander <ArrowRight size={16} />
              </a>
              <a href="/register?type=b2b" className="rd-btn-outline" style={{ padding:"16px 40px",border:`2px solid ${T.accent}`,color:T.accent,background:"transparent",fontFamily:sans,fontSize:15,fontWeight:700,textDecoration:"none",borderRadius:50,transition:"all .24s" }}>
                Espace Entreprise
              </a>
            </div>
          </Reveal>

          <Reveal delay={270}>
            <div style={{ display:"flex",gap:0,paddingTop:28,borderTop:`1px solid ${T.line}` }}>
              {[
                { n:"12 000+", l:"Clients actifs" },
                { n:"98%",     l:"Livraisons réussies" },
                { n:"< 3 min", l:"Commande rapide" },
              ].map(({n,l},i)=>(
                <div key={l} style={{ flex:1,paddingRight:i<2?24:0,paddingLeft:i>0?24:0,borderRight:i<2?`1px solid ${T.line}`:"none" }}>
                  <p style={{ fontFamily:serif,fontSize:"clamp(22px,2.2vw,30px)",color:T.dark,fontWeight:900,margin:"0 0 4px",lineHeight:1 }}>{n}</p>
                  <p style={{ fontFamily:sans,fontSize:11,color:T.accent,margin:0,letterSpacing:"0.09em",textTransform:"uppercase",fontWeight:700 }}>{l}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Right: food photo */}
        <Reveal dir="right" delay={100}>
          <div style={{ position:"relative",height:560 }}>
            <div style={{ position:"absolute",inset:"10% -5%",borderRadius:180,background:`linear-gradient(135deg,${T.yellow}28,${T.accent}22)`,transform:"rotate(-6deg)",zIndex:0 }} />
            <div style={{ position:"absolute",top:30,right:0,width:"92%",zIndex:2,borderRadius:24,overflow:"hidden",boxShadow:"0 32px 80px rgba(0,0,0,0.16)" }}>
              <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=900&auto=format&fit=crop" alt="Plat africain" style={{ width:"100%",height:420,objectFit:"cover",display:"block" }} />
              <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom, transparent 50%, rgba(26,12,0,0.6))" }} />
              <div style={{ position:"absolute",bottom:22,left:24 }}>
                <p style={{ fontFamily:serif,fontSize:19,color:"#fff",fontWeight:700,fontStyle:"italic",margin:"0 0 4px" }}>Plats d'Abidjan</p>
                <p style={{ fontFamily:sans,fontSize:12,color:"rgba(255,255,255,0.65)",margin:0 }}>Attiéké · Kedjenou · Garba · Aloko</p>
              </div>
            </div>
            <div style={{ position:"absolute",top:16,right:"4%",zIndex:10,width:80,height:80,borderRadius:"50%",background:`linear-gradient(135deg,${T.red},#FF6020)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",boxShadow:"0 8px 28px rgba(255,59,48,0.4)",animation:"kfbadge 4s ease-in-out infinite" }}>
              <span style={{ fontFamily:sans,fontSize:20,fontWeight:900,color:"#fff",lineHeight:1 }}>50%</span>
              <span style={{ fontFamily:sans,fontSize:10,color:"rgba(255,255,255,0.85)",fontWeight:600 }}>OFF</span>
            </div>
            <div style={{ position:"absolute",bottom:10,left:0,zIndex:10,background:T.card,borderRadius:16,padding:"16px 20px",boxShadow:"0 12px 40px rgba(0,0,0,0.14)",display:"flex",alignItems:"center",gap:14,animation:"kfbadge 5s ease-in-out infinite 1.5s",minWidth:200 }}>
              <div style={{ width:50,height:50,borderRadius:12,overflow:"hidden",flexShrink:0 }}>
                <img src="https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=100&auto=format&fit=crop" alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} />
              </div>
              <div>
                <p style={{ fontFamily:sans,fontSize:13,fontWeight:700,color:T.dark,margin:"0 0 2px" }}>Ham Burger / Medium</p>
                <p style={{ fontFamily:sans,fontSize:14,fontWeight:800,color:T.accent,margin:"0 0 3px" }}>7 800 FCFA</p>
                <Stars n={5} />
              </div>
            </div>
            <div style={{ position:"absolute",top:80,left:"-8%",zIndex:10,background:T.card,borderRadius:14,padding:"14px 18px",boxShadow:"0 8px 28px rgba(0,0,0,0.12)",animation:"kfbadge 6s ease-in-out infinite 0.8s" }}>
              <div style={{ display:"flex",gap:3,marginBottom:5 }}><Stars n={5} /></div>
              <p style={{ fontFamily:sans,fontSize:15,fontWeight:800,color:T.dark,margin:"0 0 1px" }}>4.9 / 5</p>
              <p style={{ fontFamily:sans,fontSize:11,color:T.mutedL,margin:0 }}>2 400+ avis</p>
            </div>
          </div>
        </Reveal>
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

/* ─── How it works ─── */
function HowItWorks() {
  const steps=[
    { icon:<ShoppingBag size={30} color={T.accent}/>, title:"Choisissez vos plats", body:"Parcourez le menu, personnalisez chaque plat et composez votre panier en quelques secondes.", col:T.accent },
    { icon:<Truck size={30} color={T.yellow}/>, title:"Livraison express", body:"Notre réseau de livreurs prend en charge votre commande. Suivi en temps réel sur votre écran.", col:T.yellow },
    { icon:<Clock size={30} color={T.accent}/>, title:"Profitez de votre repas", body:"Votre commande arrive chaude à l'heure prévue. Payez à la livraison ou en Mobile Money.", col:T.accent },
  ];
  return (
    <section id="processus" style={{ background:T.bgAlt,padding:"120px 0",position:"relative",overflow:"hidden" }}>
      <Brush color={T.yellow} opacity={0.1} style={{ width:400,top:-20,right:100 }} />
      <Brush color={T.accent} opacity={0.08} style={{ width:350,bottom:-30,left:50,transform:"scaleX(-1)" }} />
      <div style={{ maxWidth:1280,margin:"0 auto",padding:"0 48px" }}>
        <Reveal>
          <div style={{ textAlign:"center",marginBottom:80 }}>
            <Chip color={T.accent}>Comment ça marche</Chip>
            <h2 style={{ fontFamily:serif,fontSize:"clamp(34px,4vw,56px)",color:T.dark,fontWeight:900,lineHeight:1.06,margin:0,letterSpacing:"-0.025em" }}>
              Commander en <em style={{ color:T.accent }}>3 étapes.</em>
            </h2>
          </div>
        </Reveal>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:40,position:"relative" }}>
          <div style={{ position:"absolute",top:68,left:"17%",right:"17%",height:2,background:`linear-gradient(to right,${T.accent}40,${T.yellow}40,${T.accent}40)`,zIndex:0,borderTop:"2px dashed" }} />
          {steps.map((s,i)=>(
            <Reveal key={i} delay={i*100}>
              <div style={{ textAlign:"center",position:"relative",zIndex:1,background:T.card,borderRadius:20,padding:"48px 32px",boxShadow:T.shadowS,border:`1px solid ${T.line}`,transition:"all .3s" }}>
                <div style={{ width:80,height:80,borderRadius:"50%",background:`${s.col}14`,border:`2px solid ${s.col}30`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px",boxShadow:`0 0 0 10px ${s.col}08` }}>
                  {s.icon}
                </div>
                <h3 style={{ fontFamily:serif,fontSize:22,color:T.dark,fontWeight:700,margin:"0 0 12px" }}>{s.title}</h3>
                <p style={{ fontFamily:sans,fontSize:15,color:T.muted,lineHeight:1.72,margin:0,fontWeight:300 }}>{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Menu card (real item) ─── */
function MenuItem({ item, idx }) {
  const [hov, setHov] = useState(false);
  return (
    <div className="rd-card" onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:T.card,borderRadius:20,overflow:"hidden",boxShadow:T.shadowS,border:`1px solid ${T.line}`,transition:"all .35s",cursor:"pointer",height:"100%" }}>
      <div style={{ height:200,overflow:"hidden",position:"relative" }}>
        <img
          src={getItemImg(item, idx)}
          alt={item.nom}
          onError={e => { e.target.src=`https://images.unsplash.com/${FOOD_IMGS[idx%FOOD_IMGS.length]}?q=80&w=500&auto=format&fit=crop`; }}
          style={{ width:"100%",height:"100%",objectFit:"cover",display:"block",transition:"transform .5s",transform:hov?"scale(1.07)":"scale(1)" }}
        />
        {item.categorie?.nom && (
          <span style={{ position:"absolute",top:14,left:14,background:`linear-gradient(135deg,${T.accent},${T.accentD})`,color:"#fff",fontFamily:sans,fontSize:10,fontWeight:700,letterSpacing:"0.1em",padding:"5px 12px",borderRadius:20 }}>
            {item.categorie.nom}
          </span>
        )}
      </div>
      <div style={{ padding:"20px 22px 24px" }}>
        <h3 style={{ fontFamily:serif,fontSize:18,color:T.dark,fontWeight:700,margin:"0 0 6px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{item.nom}</h3>
        {item.description && (
          <p style={{ fontFamily:sans,fontSize:13,color:T.muted,lineHeight:1.5,margin:"0 0 12px",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>{item.description}</p>
        )}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
          <p style={{ fontFamily:sans,fontSize:16,fontWeight:800,color:T.accent,margin:0 }}>{formatPrix(item.prix)}</p>
          <div style={{ display:"flex",alignItems:"center",gap:4 }}>
            <Star size={13} fill={T.yellow} color={T.yellow} />
            <span style={{ fontFamily:sans,fontSize:13,fontWeight:700,color:T.dark }}>4.8</span>
          </div>
        </div>
        <a href="/menu" style={{ display:"block",textAlign:"center",padding:"12px 0",background:`linear-gradient(135deg,${T.accent},${T.accentD})`,color:"#fff",fontFamily:sans,fontSize:14,fontWeight:700,textDecoration:"none",borderRadius:50,boxShadow:`0 6px 20px ${T.accent}38`,transition:"opacity .2s" }}
          onMouseEnter={e=>e.currentTarget.style.opacity="0.88"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
          Commander
        </a>
      </div>
    </div>
  );
}

/* ─── Menu Section — entièrement dynamique ─── */
function MenuSection({ search, onSearch, sectionRef }) {
  const [categories, setCategories] = useState([]);
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data: rests } = await menuAPI.getRestaurants();
        if (cancelled || !Array.isArray(rests) || !rests.length) {
          setLoading(false);
          return;
        }
        const restaurant = rests[0];
        const [catRes, itemsRes] = await Promise.all([
          menuAPI.getCategories({ restaurantId: restaurant.id }),
          menuAPI.getByRestaurant(restaurant.id, { cible: "CLIENT" }),
        ]);
        if (cancelled) return;
        const cats  = Array.isArray(catRes.data)   ? catRes.data   : [];
        const raw   = itemsRes.data;
        const plats = Array.isArray(raw) ? raw : (raw?.articles ?? raw?.items ?? raw?.plats ?? []);
        setCategories(cats);
        setItems(plats);
      } catch {
        /* backend hors-ligne — état vide silencieux */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  /* Scroll vers la section quand une recherche est lancée depuis le Hero */
  useEffect(() => {
    if (search && sectionRef?.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [search, sectionRef]);

  const allTabs = [{ id: null, nom: "Tout" }, ...categories];

  const filtered = items.filter(item => {
    if (item.disponible === false) return false;
    const activeCat = allTabs[activeTab];
    if (activeCat?.id && item.categorie?.id !== activeCat.id) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.nom?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.categorie?.nom?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <section id="fonctionnalites" ref={sectionRef} style={{ background:T.bg,padding:"120px 0" }}>
      <div style={{ maxWidth:1280,margin:"0 auto",padding:"0 48px" }}>
        <Reveal>
          <div style={{ textAlign:"center",marginBottom:56 }}>
            <Chip color={T.accent}>Ce qu'on vous prépare</Chip>
            <h2 style={{ fontFamily:serif,fontSize:"clamp(34px,4vw,56px)",color:T.dark,fontWeight:900,lineHeight:1.06,margin:"0 0 28px",letterSpacing:"-0.025em" }}>
              Notre <em style={{ color:T.accent }}>Menu</em>
            </h2>

            {/* Onglets catégories — dynamiques */}
            {!loading && (
              <div style={{ display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap" }}>
                {allTabs.map((tab, i) => (
                  <button key={tab.id ?? "all"} onClick={() => setActiveTab(i)}
                    style={{ fontFamily:sans,fontSize:14,fontWeight:600,padding:"9px 22px",borderRadius:50,border:`1.5px solid ${activeTab===i?T.accent:T.line}`,background:activeTab===i?`linear-gradient(135deg,${T.accent},${T.accentD})`:"transparent",color:activeTab===i?"#fff":T.muted,cursor:"pointer",transition:"all .2s" }}>
                    {tab.nom}
                  </button>
                ))}
                {search && (
                  <button onClick={() => onSearch("")}
                    style={{ fontFamily:sans,fontSize:13,fontWeight:600,padding:"9px 18px",borderRadius:50,border:`1.5px solid ${T.line}`,background:"transparent",color:T.muted,cursor:"pointer",transition:"all .2s",display:"flex",alignItems:"center",gap:6 }}>
                    <span>"{search}"</span>
                    <span style={{ color:T.accent,fontWeight:800 }}>×</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </Reveal>

        {/* Loading: squelettes */}
        {loading && (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:24 }}>
            {Array.from({length:6}).map((_,i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Résultats */}
        {!loading && filtered.length > 0 && (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:24 }}>
            {filtered.slice(0, 6).map((item, i) => (
              <Reveal key={item.id ?? i} delay={i * 60}>
                <MenuItem item={item} idx={i} />
              </Reveal>
            ))}
          </div>
        )}

        {/* État vide */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:"center",padding:"80px 0" }}>
            {search ? (
              <>
                <p style={{ fontFamily:serif,fontSize:24,color:T.muted,fontStyle:"italic",margin:"0 0 16px" }}>
                  Aucun résultat pour «&nbsp;{search}&nbsp;»
                </p>
                <button onClick={() => onSearch("")}
                  style={{ fontFamily:sans,fontSize:14,color:T.accent,background:"none",border:`1.5px solid ${T.accent}`,borderRadius:50,padding:"10px 24px",cursor:"pointer",fontWeight:600 }}>
                  Voir tout le menu
                </button>
              </>
            ) : items.length === 0 ? (
              <p style={{ fontFamily:serif,fontSize:22,color:T.muted,fontStyle:"italic" }}>
                Menu en cours de préparation…
              </p>
            ) : (
              <p style={{ fontFamily:serif,fontSize:22,color:T.muted,fontStyle:"italic" }}>
                Aucun plat dans cette catégorie.
              </p>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <Reveal delay={100}>
            <div style={{ textAlign:"center",marginTop:52 }}>
              <a href="/menu" style={{ display:"inline-flex",alignItems:"center",gap:9,fontFamily:sans,fontSize:15,fontWeight:700,color:T.accent,textDecoration:"none",border:`2px solid ${T.accent}`,borderRadius:50,padding:"14px 38px",transition:"all .22s" }}
                onMouseEnter={e=>{e.currentTarget.style.background=T.accent;e.currentTarget.style.color="#fff";}}
                onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.accent;}}>
                Voir tout le menu <ArrowRight size={16} />
              </a>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}

/* ─── Feature banners ─── */
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

/* ─── Stats ─── */
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

/* ─── Testimonials ─── */
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

/* ─── Dual Offer ─── */
function DualOffer() {
  const cards=[
    { tag:"GRAND PUBLIC", tagBg:T.accent, tagCol:"#fff", topCol:T.accent, title:"Pour toute la famille", sub:"Commandez, payez, profitez.", img:"photo-1567620905732-2d1ec7ab7445", perks:["Menu dynamique & QR Code table","Orange Money · MTN · Wave · Espèces","Suivi commande en temps réel","Reçu SYSCOHADA par email"], perkCol:T.accent, cta:"Commander maintenant", ctaBg:`linear-gradient(135deg,${T.accent},${T.accentD})`, ctaCol:"#fff", href:"/menu" },
    { tag:"ENTREPRISE",   tagBg:T.yellow, tagCol:T.dark,  topCol:T.yellow, title:"Pour vos équipes",     sub:"Gérez, facturez, conformez.",  img:"photo-1600880292203-757bb62b4baf", perks:["Commandes groupées 50+ repas","Facturation mensuelle consolidée","Budgets par collaborateur","Conformité TVA 18% & SYSCOHADA"], perkCol:T.yellow, cta:"Créer un compte Entreprise →", ctaBg:`linear-gradient(135deg,${T.yellow},#F8A020)`, ctaCol:T.dark, href:"/register?type=b2b" },
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

/* ─── CTA ─── */
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

/* ─── Footer ─── */
function Footer() {
  const cols=[
    { t:"Plateforme",    ls:[["Menu","/menu"],["Connexion","/login"],["Inscription","/register"],["Espace B2B","/register?type=b2b"]] },
    { t:"Restaurateurs", ls:[["Interface Gérant","#"],["Gestion Stocks","#"],["Trésorerie & PDF","#"],["KDS Cuisine","#"]] },
    { t:"Contact",       ls:[["Abidjan, Cocody","#"],["+225 07 00 00 00","#"],["contact@restodici.ci","#"],["Support 24/7","#"]] },
  ];
  return (
    <footer style={{ background:T.dark,borderTop:`1px solid rgba(255,255,255,0.06)` }}>
      <KS h={3} />
      <div style={{ maxWidth:1280,margin:"0 auto",padding:"72px 48px 40px" }}>
        <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:52,marginBottom:56 }}>
          <div>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:18 }}>
              <div style={{ width:40,height:40,borderRadius:12,background:`linear-gradient(135deg,${T.accent},${T.yellow})`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 6px 18px ${T.accent}40` }}>
                <UtensilsCrossed style={{ width:20,height:20,color:"#fff" }} />
              </div>
              <span style={{ fontFamily:serif,fontWeight:700,color:T.accent,fontSize:20 }}>Resto d'ici</span>
            </div>
            <p style={{ fontFamily:sans,fontSize:14,color:"rgba(255,255,255,0.35)",lineHeight:1.85,maxWidth:260,fontWeight:300,margin:"0 0 20px" }}>La plateforme qui modernise la restauration en Afrique de l'Ouest.</p>
            <div style={{ display:"flex",gap:7,flexWrap:"wrap" }}>
              {[["🟠","Orange Money"],["🟡","MTN MoMo"],["🔵","Wave"]].map(([e,n])=>(
                <div key={n} style={{ display:"flex",alignItems:"center",gap:5,background:"rgba(255,255,255,0.05)",borderRadius:6,padding:"5px 9px",border:"1px solid rgba(255,255,255,0.08)" }}>
                  <span style={{ fontSize:12 }}>{e}</span>
                  <span style={{ fontFamily:sans,fontSize:11,color:"rgba(255,255,255,0.4)" }}>{n}</span>
                </div>
              ))}
            </div>
          </div>
          {cols.map(c=>(
            <div key={c.t}>
              <p style={{ fontFamily:sans,fontSize:11,color:T.yellow,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:18,fontWeight:700 }}>{c.t}</p>
              {c.ls.map(([l,h])=>(
                <a key={l} href={h} className="rd-foot-link" style={{ display:"block",fontFamily:sans,fontSize:14,color:"rgba(255,255,255,0.35)",textDecoration:"none",margin:"0 0 11px",fontWeight:300,transition:"color .2s" }}>{l}</a>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:24,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12 }}>
          <div style={{ display:"flex",gap:3 }}>{KENTE.map((c,i)=><div key={i} style={{ width:24,height:3,background:c }} />)}</div>
          <p style={{ fontFamily:sans,fontSize:12,color:"rgba(255,255,255,0.22)",margin:0 }}>© 2026 Resto d'ici — Tous droits réservés.</p>
          <p style={{ fontFamily:sans,fontSize:12,color:"rgba(255,255,255,0.22)",margin:0 }}>Développé par <span style={{ color:T.yellow,opacity:0.6 }}>Sankofa-Lab × Novasend</span></p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ─── */
export default function Home() {
  const [search, setSearch] = useState("");
  const menuRef = useRef(null);
  return (
    <div style={{ background:T.bg,minHeight:"100vh",overflowX:"hidden" }}>
      <FontLoader />
      <Nav />
      <Hero search={search} onSearch={setSearch} menuRef={menuRef} />
      <Marquee />
      <HowItWorks />
      <MenuSection search={search} onSearch={setSearch} sectionRef={menuRef} />
      <Banners />
      <Stats />
      <Testimonials />
      <DualOffer />
      <CTA />
      <Footer />
    </div>
  );
}
