/* ═══════════════════════════════════════════════════════════════
   Home.jsx — Page d'accueil = catalogue restaurants
   Hero compact + recherche (type de plat / nom de plat / restaurant)
   + grille des restaurants + footer. Volontairement épuré.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { UtensilsCrossed, ArrowRight, Check, Star, Search, Truck, Clock, Mail, X, Zap, Smartphone, ShieldCheck } from "lucide-react";
import { menuAPI, newsletterAPI } from "../services/api";

/* ─── Palette de couleurs ─── */
const T = {
  bg:      "#FFF4ED",
  bgAlt:   "#FFF5E8",
  surface: "#FFEFD8",
  dark:    "#1A0C00",
  text:    "#3B2409",
  muted:   "#7A5E3A",
  mutedL:  "#B09070",
  card:    "#FFFFFF",
  accent:  "#EA580C",
  accentD: "#C2410C",
  accentL: "#FFAD40",
  yellow:  "#FFB800",
  yellowL: "#FFD166",
  red:     "#FF3B30",
  green:   "#16A34A",
  line:    "rgba(234,88,12,0.14)",
  shadow:  "0 6px 28px rgba(234,88,12,0.14)",
  shadowS: "0 2px 14px rgba(0,0,0,0.07)",
};
const KENTE = ["#EA580C","#FFB800","#1A0C00","#C2410C"];
const serif = "'Playfair Display', Georgia, serif";
const sans  = "'Manrope', system-ui, sans-serif";

const CSS = `
@keyframes kfpulse    { 0%,100%{opacity:1} 50%{opacity:0.55} }
@keyframes kfskeleton { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.rd-nav-link:hover  { color:${T.accent} !important; }
.rd-btn-cta:hover   { transform:translateY(-2px) !important; box-shadow:0 16px 40px rgba(234,88,12,0.5) !important; }
.rd-card:hover      { transform:translateY(-6px) !important; box-shadow:0 18px 48px rgba(234,88,12,0.2) !important; }
.rd-foot-link:hover { color:${T.accent} !important; }
`;

/* ─── Images de substitution pour les plats/restaurants sans photo ─── */
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
  "photo-1773620494293-e9e075dd48fd",
  "photo-1634324092526-91f5e878b72f",
  "photo-1569058242252-623df46b5025",
  "photo-1665833613236-7c1d087463b1",
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

/* ─── Emoji par type de cuisine ─── */
const EMOJI_MAP = [
  { keys:["pizza"],                                    emoji:"🍕" },
  { keys:["grillade","grillé","bœuf","viande","braisé","steak","brochette"], emoji:"🥩" },
  { keys:["local","ivoirien","attiéké","alloco","aloko","foutou","placali","garba"], emoji:"🍛" },
  { keys:["salade","crudité"],                         emoji:"🥗" },
  { keys:["dessert","pâtisserie","gâteau","sucré"],    emoji:"🍰" },
  { keys:["boisson","jus","soda","eau","drink","cocktail"], emoji:"🥤" },
  { keys:["poisson","thon","capitaine","tilapia","sardine"], emoji:"🐟" },
  { keys:["poulet","volaille","dinde","yassa"],        emoji:"🍗" },
  { keys:["riz","tchep","cheb"],                       emoji:"🍚" },
  { keys:["burger","sandwich","wrap"],                 emoji:"🍔" },
  { keys:["soupe","sauce","bouillon","kandia","graine","mafé"], emoji:"🍲" },
  { keys:["pâtes","pasta","spaghetti"],                emoji:"🍝" },
];
function catEmoji(nom) {
  const lower = (nom || "").toLowerCase();
  for (const { keys, emoji } of EMOJI_MAP) if (keys.some(k => lower.includes(k))) return emoji;
  return "🍽️";
}

/* ─── Chargement des polices + CSS global ─── */
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

/* ─── Barre de navigation ─── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn=()=>setScrolled(window.scrollY>40);
    window.addEventListener("scroll",fn,{passive:true});
    return ()=>window.removeEventListener("scroll",fn);
  },[]);
  const links=[["Restaurants","#catalogue"],["Entreprises","/register?type=b2b"],["Aide","/aide"]];
  return (
    <nav style={{ position:"fixed",top:0,left:0,right:0,zIndex:1000, background:scrolled?"rgba(255,250,243,0.95)":"transparent", backdropFilter:scrolled?"blur(20px)":"none", boxShadow:scrolled?"0 2px 24px rgba(234,88,12,0.1)":"none", transition:"all 0.35s cubic-bezier(.22,1,.36,1)" }}>
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
            <a key={l} href={h} className="rd-nav-link" style={{ fontFamily:sans,fontSize:14,color:scrolled?T.accent:"#fff",textDecoration:"none",fontWeight:600,transition:"color .2s" }}>{l}</a>
          ))}
        </div>
        <div style={{ display:"flex",gap:10,alignItems:"center" }}>
          <a href="/login" className="rd-btn-cta" style={{ fontFamily:sans,fontSize:13,fontWeight:700,textDecoration:"none",padding:"10px 24px",borderRadius:50,transition:"all .22s",display:"inline-flex",alignItems:"center",gap:6, color:scrolled?T.accent:"#fff", background:"transparent", border:`1.5px solid ${scrolled?T.accent:"rgba(255,255,255,0.55)"}` }}>Connexion</a>
          <a href="/register" className="rd-btn-cta" style={{ fontFamily:sans,fontSize:13,fontWeight:700,textDecoration:"none",padding:"10px 24px",borderRadius:50,transition:"all .22s",display:"inline-flex",alignItems:"center",gap:6, color:"#fff", background:"#16A34A", border:"1.5px solid #16A34A", boxShadow:"0 4px 14px rgba(22,163,74,0.35)" }}>S'inscrire</a>
        </div>
      </div>
    </nav>
  );
}

/* ─── Hero compact avec recherche ─── */
function CatalogHero({ search, onSearch, resultCount, hasQuery }) {
  return (
    <section style={{ position:"relative", overflow:"hidden", display:"flex", flexDirection:"column", justifyContent:"center", minHeight:"100dvh" }}>
      <img
        src="https://images.unsplash.com/photo-1665400808116-f0e6339b7e9a?q=95&w=3200&auto=format&fit=crop"
        alt="Plats d'Abidjan"
        style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center 42%", display:"block" }}
      />
      {/* Voile plus clair — laisse voir l'image, assez sombre en bas pour le texte */}
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(10,5,0,0.12) 0%, rgba(10,5,0,0.30) 45%, rgba(10,5,0,0.72) 100%)" }} />

      <div style={{ position:"relative", zIndex:2, maxWidth:820, margin:"0 auto", padding:"120px 24px 60px", width:"100%", textAlign:"center" }}>
        <p style={{ fontFamily:sans, fontSize:12, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color:"rgba(255,255,255,0.65)", margin:"0 0 16px" }}>
          Abidjan · Côte d'Ivoire
        </p>
        <h1 style={{ fontFamily:serif, fontWeight:900, fontSize:"clamp(34px,6vw,68px)", color:"#fff", lineHeight:1.02, letterSpacing:"-0.03em", margin:"0 0 18px", textShadow:"0 4px 24px rgba(0,0,0,0.4)" }}>
          Trouvez un plat, <em style={{ color:T.yellow, fontStyle:"italic" }}>on trouve</em> le resto.
        </h1>
        <p style={{ fontFamily:sans, fontSize:"clamp(14px,2vw,17px)", color:"rgba(255,255,255,0.75)", lineHeight:1.6, maxWidth:520, margin:"0 auto 30px", fontWeight:300 }}>
          Cherchez par type de cuisine ou par nom de plat — les restaurants qui le préparent s'affichent aussitôt.
        </p>

        {/* Barre de recherche */}
        <div style={{ display:"flex", gap:0, maxWidth:600, margin:"0 auto", borderRadius:50, overflow:"hidden", boxShadow:"0 12px 48px rgba(0,0,0,0.35)", background:"#fff" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"0 22px", flex:1 }}>
            <Search size={19} color={T.mutedL} />
            <input
              value={search}
              onChange={e => onSearch(e.target.value)}
              placeholder="Ex. : attiéké, poulet, pizza, un restaurant…"
              style={{ border:"none", outline:"none", fontFamily:sans, fontSize:15, color:T.text, background:"transparent", width:"100%", padding:"18px 0" }}
            />
            {search && <button onClick={() => onSearch("")} aria-label="Effacer" style={{ background:"none", border:"none", cursor:"pointer", color:T.mutedL, display:"flex" }}><X size={18} /></button>}
          </div>
          <div style={{ display:"flex", alignItems:"center", background:`linear-gradient(135deg,${T.accent},${T.accentD})`, color:"#fff", fontFamily:sans, fontSize:14, fontWeight:700, padding:"0 28px", whiteSpace:"nowrap" }}>
            {hasQuery ? `${resultCount} résultat${resultCount !== 1 ? "s" : ""}` : "Rechercher"}
          </div>
        </div>

        {/* Deux accès profil — comme restodici.fr */}
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", marginTop:26 }}>
          <a href="#catalogue" style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"13px 30px", background:`linear-gradient(135deg,${T.accent},${T.accentD})`, color:"#fff", fontFamily:sans, fontSize:14, fontWeight:700, textDecoration:"none", borderRadius:50, boxShadow:`0 8px 28px ${T.accent}55` }}>
            Je commande <ArrowRight size={15} />
          </a>
          <a href="/register?type=b2b" style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"13px 30px", background:"rgba(255,255,255,0.14)", color:"#fff", fontFamily:sans, fontSize:14, fontWeight:600, textDecoration:"none", borderRadius:50, backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.3)" }}>
            Espace Entreprise
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─── Trois piliers de confiance — inspiré de restodici.fr ─── */
function Pillars() {
  const items = [
    { Icon: Zap,         title: "Livraison rapide",   text: "Vos plats chauds livrés en moins de 30 minutes, à la maison comme au bureau." },
    { Icon: UtensilsCrossed, title: "Cuisine d'ici",  text: "Attiéké, garba, alloco, kedjenou… le meilleur des restaurants d'Abidjan, à portée de clic." },
    { Icon: Smartphone,  title: "Paiement mobile",    text: "Orange Money, MTN MoMo, Wave ou carte — réglez en toute sécurité, en un geste." },
  ];
  return (
    <section style={{ background:"#fff", padding:"64px 0", borderBottom:`1px solid ${T.line}` }}>
      <div style={{ maxWidth:1080, margin:"0 auto", padding:"0 24px" }}>
        <div style={{ textAlign:"center", marginBottom:44 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:`${T.accent}12`, border:`1px solid ${T.accent}28`, borderRadius:100, padding:"7px 18px", marginBottom:16 }}>
            <ShieldCheck size={14} color={T.accent} />
            <span style={{ fontFamily:sans, fontSize:11, color:T.accent, letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:700 }}>Pourquoi Resto d'ici</span>
          </div>
          <h2 style={{ fontFamily:serif, fontSize:"clamp(26px,3.4vw,40px)", color:T.dark, fontWeight:900, margin:0, letterSpacing:"-0.025em" }}>
            Bien manger, <em style={{ color:T.accent, fontStyle:"italic" }}>simplement.</em>
          </h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:24 }}>
          {items.map(({ Icon, title, text }) => (
            <div key={title} style={{ textAlign:"center", padding:"8px 12px" }}>
              <div style={{ width:64, height:64, borderRadius:20, margin:"0 auto 18px", background:`linear-gradient(135deg,${T.accent}14,${T.yellow}22)`, border:`1px solid ${T.line}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon size={28} color={T.accent} strokeWidth={2} />
              </div>
              <h3 style={{ fontFamily:serif, fontSize:19, color:T.dark, fontWeight:800, margin:"0 0 8px" }}>{title}</h3>
              <p style={{ fontFamily:sans, fontSize:14, color:T.muted, lineHeight:1.7, margin:0, fontWeight:300, maxWidth:300, marginLeft:"auto", marginRight:"auto" }}>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Carte restaurant ─── */
function RestaurantCard({ restaurant, idx, matched, query, onOpenResto, onOpenDish }) {
  const [hov, setHov] = useState(false);
  const rating = Number(restaurant.noteMoyenne) > 0 ? Number(restaurant.noteMoyenne).toFixed(1) : null;
  const time   = restaurant.deliveryTime || (20 + (idx % 4) * 5) + "–" + (30 + (idx % 4) * 5) + " min";

  return (
    <div className="rd-card" onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:T.card, borderRadius:20, overflow:"hidden", boxShadow:T.shadowS, border:`1px solid ${T.line}`, transition:"all .35s cubic-bezier(.22,1,.36,1)", display:"flex", flexDirection:"column" }}>

      {/* Photo */}
      <div onClick={()=>onOpenResto(restaurant)} style={{ position:"relative", height:170, overflow:"hidden", cursor:"pointer" }}>
        <img src={restoImg(restaurant, idx)} alt={restaurant.nom}
          onError={e=>{ e.target.src=fallbackImg(idx); }}
          style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform .55s", transform:hov?"scale(1.06)":"scale(1)" }} />
        {rating && (
          <div style={{ position:"absolute", top:12, left:12, background:"rgba(255,255,255,0.95)", borderRadius:8, padding:"4px 10px", display:"flex", alignItems:"center", gap:5, boxShadow:"0 2px 10px rgba(0,0,0,0.12)" }}>
            <Star size={12} fill={T.yellow} color={T.yellow} />
            <span style={{ fontFamily:sans, fontSize:12, fontWeight:700, color:T.dark }}>{rating}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding:"14px 18px 18px", display:"flex", flexDirection:"column", flex:1 }}>
        <h3 onClick={()=>onOpenResto(restaurant)} style={{ fontFamily:serif, fontSize:18, color:T.dark, fontWeight:700, margin:"0 0 3px", cursor:"pointer", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{restaurant.nom}</h3>
        <p style={{ fontFamily:sans, fontSize:12, color:T.muted, margin:"0 0 10px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {restaurant.adresse || restaurant.ville || "Restaurant partenaire"}
        </p>

        {/* Plats correspondant à la recherche */}
        {matched && matched.length > 0 && (
          <div style={{ marginBottom:12 }}>
            <p style={{ fontFamily:sans, fontSize:10, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", color:T.accent, margin:"0 0 7px" }}>
              Propose « {query} »
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {matched.map(d => (
                <button key={d.id ?? d.nom} onClick={()=>onOpenDish(restaurant, d)}
                  style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, background:`${T.accent}0D`, border:`1px solid ${T.line}`, borderRadius:10, padding:"7px 10px", cursor:"pointer", textAlign:"left" }}>
                  <span style={{ fontFamily:sans, fontSize:12.5, fontWeight:600, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.nom}</span>
                  <span style={{ fontFamily:sans, fontSize:12, fontWeight:800, color:T.accent, flexShrink:0 }}>{formatPrix(d.prix)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pied : délai livraison + CTA */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:`1px solid ${T.line}`, paddingTop:11, marginTop:"auto" }}>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:4, color:T.muted }}>
              <Clock size={12} /><span style={{ fontFamily:sans, fontSize:11, fontWeight:500 }}>{time}</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <Truck size={12} color="#22C55E" /><span style={{ fontFamily:sans, fontSize:11, fontWeight:600, color:T.green }}>Livraison</span>
            </div>
          </div>
          <button onClick={()=>onOpenResto(restaurant)}
            style={{ display:"inline-flex", alignItems:"center", gap:5, fontFamily:sans, fontSize:12.5, fontWeight:700, color:T.accent, background:"none", border:"none", cursor:"pointer", padding:0 }}>
            Voir le menu <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  const shimmer = {
    background: `linear-gradient(90deg, ${T.bgAlt} 25%, ${T.surface} 50%, ${T.bgAlt} 75%)`,
    backgroundSize: "200% 100%",
    animation: "kfskeleton 1.6s ease-in-out infinite",
  };
  return (
    <div style={{ background:T.card, borderRadius:20, overflow:"hidden", boxShadow:T.shadowS, border:`1px solid ${T.line}` }}>
      <div style={{ height:170, ...shimmer }} />
      <div style={{ padding:"16px 18px 20px" }}>
        <div style={{ height:18, width:"60%", borderRadius:6, marginBottom:10, ...shimmer }} />
        <div style={{ height:12, width:"45%", borderRadius:6, marginBottom:18, ...shimmer }} />
        <div style={{ height:32, borderRadius:8, ...shimmer }} />
      </div>
    </div>
  );
}

/* ─── Catalogue : filtres par type + grille ─── */
function Catalog({ loading, types, activeType, onType, results, query, onOpenResto, onOpenDish }) {
  return (
    <section id="catalogue" style={{ background:T.bg, padding:"44px 0 96px", minHeight:"60vh" }}>
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px" }}>

        {/* Filtres par type de cuisine */}
        {!loading && types.length > 0 && (
          <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:10, marginBottom:26 }}>
            {["__all__", ...types].map(t => {
              const active = t === activeType;
              return (
                <button key={t} onClick={()=>onType(t)}
                  style={{ flexShrink:0, display:"inline-flex", alignItems:"center", gap:6, padding:"9px 18px", borderRadius:99, border:`1.5px solid ${active?T.accent:T.line}`, background:active?T.accent:T.card, color:active?"#fff":T.text, fontFamily:sans, fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:T.shadowS, transition:"all .15s", whiteSpace:"nowrap" }}>
                  {t === "__all__" ? "🍽️ Tous" : `${catEmoji(t)} ${t}`}
                </button>
              );
            })}
          </div>
        )}

        {/* Titre */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:22, flexWrap:"wrap", gap:8 }}>
          <h2 style={{ fontFamily:serif, fontSize:"clamp(22px,3vw,30px)", color:T.dark, fontWeight:900, margin:0, letterSpacing:"-0.02em" }}>
            {query ? `Résultats pour « ${query} »` : activeType !== "__all__" ? `Restaurants — ${activeType}` : "Tous les restaurants"}
          </h2>
          {!loading && (
            <span style={{ fontFamily:sans, fontSize:13, color:T.muted, fontWeight:600 }}>
              {results.length} restaurant{results.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Grille */}
        {loading ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:20 }}>
            {Array.from({ length:6 }).map((_,i)=><SkeletonCard key={i} />)}
          </div>
        ) : results.length === 0 ? (
          <div style={{ textAlign:"center", padding:"70px 0" }}>
            <p style={{ fontFamily:serif, fontSize:22, color:T.muted, fontStyle:"italic", margin:0 }}>
              {query ? `Aucun restaurant ne propose « ${query} » pour l'instant.` : "Aucun restaurant disponible."}
            </p>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:20 }}>
            {results.map(({ restaurant, matched }, i) => (
              <RestaurantCard key={restaurant.id ?? i} restaurant={restaurant} idx={i} matched={matched} query={query}
                onOpenResto={onOpenResto} onOpenDish={onOpenDish} />
            ))}
          </div>
        )}
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
        ["Explorer les restaurants", "#catalogue"],
        ["Commander en ligne",       "/menu"],
        ["Suivi de commande",        "/login"],
        ["Livraison à domicile",     "#"],
      ],
    },
    {
      title: "Entreprises",
      links: [
        ["Espace B2B",             "/register?type=b2b"],
        ["Commandes groupées",     "/b2b"],
        ["Facturation SYSCOHADA",  "/b2b/invoices"],
        ["Budgets collaborateurs", "/b2b/teams"],
      ],
    },
    {
      title: "Restaurateurs",
      links: [
        ["Interface Gérant",   "/gerant"],
        ["Gestion des stocks", "/gerant"],
        ["KDS Cuisine",        "/gerant"],
        ["Devenir partenaire", "/register"],
      ],
    },
    {
      title: "Support",
      links: [
        ["Centre d'aide",    "/aide"],
        ["Nous contacter",   "/contact"],
        ["Mentions légales", "/legal"],
        ["Confidentialité",  "/privacy"],
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
      <div style={{ maxWidth:1280, margin:"0 auto", padding:"64px 48px 0" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1.8fr 1fr 1fr 1fr 1fr", gap:48, paddingBottom:48, borderBottom:"1px solid rgba(255,255,255,0.07)" }}>

          {/* Colonne marque */}
          <div>
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
            <div style={{ display:"flex",gap:8,marginBottom:28 }}>
              {SOCIALS.map(({ label, href, path }) => (
                <a key={label} href={href} aria-label={label}
                  style={{ width:34,height:34,borderRadius:9,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.09)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",textDecoration:"none" }}
                  onMouseEnter={e=>{e.currentTarget.style.background=`${T.accent}22`;e.currentTarget.style.borderColor=`${T.accent}55`;}}
                  onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.borderColor="rgba(255,255,255,0.09)";}}>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="rgba(255,255,255,0.5)"><path d={path} /></svg>
                </a>
              ))}
            </div>
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
                    <a href={href} className="rd-foot-link" style={{ fontFamily:sans,fontSize:13.5,color:"rgba(255,255,255,0.45)",textDecoration:"none",fontWeight:400,transition:"color .18s" }}>{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter band */}
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
                <input type="email" required value={nlEmail} onChange={e => setNlEmail(e.target.value)} placeholder="votre@email.ci"
                  style={{ border:"none",outline:"none",background:"transparent",fontFamily:sans,fontSize:13,color:"#fff",width:200,padding:"12px 0" }} />
              </div>
              <button type="submit" style={{ background:"#16A34A",color:"#fff",fontFamily:sans,fontSize:13,fontWeight:700,border:"none",cursor:"pointer",padding:"0 22px",whiteSpace:"nowrap" }}>S'inscrire</button>
            </form>
          )}
        </div>

        {/* Barre de bas */}
        <div style={{ padding:"22px 0 28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16 }}>
          <div style={{ display:"flex",alignItems:"center",gap:14 }}>
            <div style={{ display:"flex",gap:2 }}>
              {KENTE.map((c,i) => <div key={i} style={{ width:18,height:3,borderRadius:2,background:c }} />)}
            </div>
            <p style={{ fontFamily:sans,fontSize:12,color:"rgba(255,255,255,0.22)",margin:0 }}>© 2026 Resto d'ici. Tous droits réservés.</p>
          </div>
          <div style={{ display:"flex",gap:20,flexWrap:"wrap" }}>
            {[["CGU","/legal"],["Confidentialité","/privacy"],["Cookies","#"],["Accessibilité","#"]].map(([l, href]) => (
              <a key={l} href={href} className="rd-foot-link" style={{ fontFamily:sans,fontSize:12,color:"rgba(255,255,255,0.25)",textDecoration:"none",transition:"color .18s" }}>{l}</a>
            ))}
          </div>
          <p style={{ fontFamily:sans,fontSize:12,color:"rgba(255,255,255,0.18)",margin:0 }}>
            par <span style={{ color:"rgba(255,255,255,0.35)" }}>Sankofa-Lab</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Composant principal — Accueil = catalogue ─── */
export default function Home() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants]   = useState([]);
  const [dishesByResto, setDishesByResto] = useState({});
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [activeType, setActiveType]     = useState("__all__");

  useEffect(() => {
    let cancelled = false;
    menuAPI.getRestaurants()
      .then(async res => {
        const list = Array.isArray(res.data) ? res.data : [];
        if (cancelled) return;
        setRestaurants(list);
        setLoading(false);
        /* Charge les menus en arrière-plan → recherche par plat + filtres par type */
        const entries = await Promise.all(list.map(r =>
          menuAPI.getByRestaurant(r.id, { cible: "CLIENT" })
            .then(mr => {
              const raw = mr.data;
              const plats = Array.isArray(raw) ? raw : (raw?.articles ?? raw?.items ?? raw?.plats ?? []);
              return [r.id, plats.filter(p => p.disponible !== false)];
            })
            .catch(() => [r.id, []])
        ));
        if (!cancelled) setDishesByResto(Object.fromEntries(entries));
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  /* Types de cuisine disponibles (catégories réelles des plats) */
  const types = useMemo(() => {
    const set = new Set();
    Object.values(dishesByResto).forEach(dishes =>
      dishes.forEach(d => { const n = d.categorie?.nom; if (n) set.add(n); })
    );
    return [...set].sort((a, b) => a.localeCompare(b, "fr"));
  }, [dishesByResto]);

  /* Restaurants filtrés par type + recherche (nom resto ou nom de plat) */
  const q = search.trim().toLowerCase();
  const results = useMemo(() => {
    return restaurants.map((r, idx) => {
      const dishes = dishesByResto[r.id] || [];
      if (activeType !== "__all__" && !dishes.some(d => d.categorie?.nom === activeType)) return null;
      if (!q) return { restaurant: r, matched: null, _idx: idx };
      const nameMatch = r.nom?.toLowerCase().includes(q) || (r.adresse || "").toLowerCase().includes(q);
      const matchedDishes = dishes.filter(d =>
        d.nom?.toLowerCase().includes(q) || d.categorie?.nom?.toLowerCase().includes(q)
      );
      if (!nameMatch && matchedDishes.length === 0) return null;
      return { restaurant: r, matched: matchedDishes.slice(0, 4), _idx: idx };
    }).filter(Boolean);
  }, [restaurants, dishesByResto, activeType, q]);

  const openResto = (r) => navigate(`/menu?resto=${r.id}`);
  const openDish  = (r, d) => navigate(`/menu?resto=${r.id}&plat=${encodeURIComponent(d.nom || "")}`);

  return (
    <div style={{ background:T.bg, minHeight:"100dvh", overflowX:"hidden" }}>
      <FontLoader />
      <Nav />
      <CatalogHero search={search} onSearch={setSearch} resultCount={results.length} hasQuery={!!q} />
      <Pillars />
      <Catalog
        loading={loading}
        types={types}
        activeType={activeType}
        onType={setActiveType}
        results={results}
        query={search.trim()}
        onOpenResto={openResto}
        onOpenDish={openDish}
      />
      <Footer />
    </div>
  );
}
