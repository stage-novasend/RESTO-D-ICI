/* ═══════════════════════════════════════════════════════════════
   Home.jsx — Page d'accueil = catalogue restaurants
   Hero avec grande image aux bordures arrondies (border-radius)
   + Sidebar dynamique Yango Deli pour le filtrage
   + Grille des restaurants + Footer.
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  UtensilsCrossed, ArrowRight, Check, Star, Search, Truck, Clock,
  Mail, X, Zap, Smartphone, ShieldCheck, SlidersHorizontal, RotateCcw
} from "lucide-react";
import { menuAPI, newsletterAPI } from "../services/api";
import FilterSidebar from "../components/menu/FilterSidebar";
import LanguageSwitcher from "../components/shared/LanguageSwitcher";
import orangeMoneyLogo   from "../assets/payments/orange-money.svg";
import mtnMomoLogo       from "../assets/payments/mtn-momo.svg";
import moovMoneyLogo     from "../assets/payments/moov-money.svg";
import waveLogo          from "../assets/payments/wave.svg";
import carteBancaireLogo from "../assets/payments/carte-bancaire.svg";

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
@keyframes slideInLeft { from{transform:translateX(-100%)} to{transform:translateX(0)} }
.rd-nav-link:hover  { color:${T.accent} !important; }
.rd-btn-cta:hover   { transform:translateY(-2px) !important; box-shadow:0 16px 40px rgba(234,88,12,0.5) !important; }
.rd-card:hover      { transform:translateY(-6px) !important; box-shadow:0 18px 48px rgba(234,88,12,0.2) !important; }
.rd-foot-link:hover { color:${T.accent} !important; }
@media (max-width: 900px) {
  .rd-desktop-sidebar { display: none !important; }
  .rd-mobile-filter-btn { display: flex !important; }
}
@media (min-width: 901px) {
  .rd-mobile-filter-btn { display: none !important; }
}
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
    <nav style={{ position:"fixed",top:0,left:0,right:0,zIndex:1000, background:scrolled?"rgba(255,250,243,0.95)":"rgba(26,12,0,0.35)", backdropFilter:"blur(20px)", boxShadow:scrolled?"0 2px 24px rgba(234,88,12,0.1)":"none", transition:"all 0.35s cubic-bezier(.22,1,.36,1)" }}>
      <KS h={3} />
      <div style={{ maxWidth:1280,margin:"0 auto",padding:"0 40px",height:70,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <a href="/" style={{ display:"flex",alignItems:"center",gap:10,textDecoration:"none" }}>
          <div style={{ width:38,height:38,borderRadius:10,background:`linear-gradient(135deg,${T.accent},${T.yellow})`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 16px ${T.accent}44` }}>
            <UtensilsCrossed style={{ width:19,height:19,color:"#fff" }} />
          </div>
          <span style={{ fontFamily:serif,fontWeight:700,color:scrolled?T.accent:"#fff",fontSize:22,letterSpacing:"-0.02em" }}>Resto d'ici</span>
        </a>
        <div style={{ display:"flex",gap:34,alignItems:"center" }}>
          {links.map(([l,h])=>(
            <a key={l} href={h} className="rd-nav-link" style={{ fontFamily:sans,fontSize:14,color:scrolled?T.accent:"#fff",textDecoration:"none",fontWeight:600,transition:"color .2s" }}>{l}</a>
          ))}
        </div>
        <div style={{ display:"flex",gap:10,alignItems:"center" }}>
          <LanguageSwitcher variant={scrolled ? "light" : "dark"} />
          <a href="/login" className="rd-btn-cta" style={{ fontFamily:sans,fontSize:13,fontWeight:700,textDecoration:"none",padding:"10px 24px",borderRadius:50,transition:"all .22s",display:"inline-flex",alignItems:"center",gap:6, color:scrolled?T.accent:"#fff", background:"transparent", border:`1.5px solid ${scrolled?T.accent:"rgba(255,255,255,0.55)"}` }}>Connexion</a>
          <a href="/register" className="rd-btn-cta" style={{ fontFamily:sans,fontSize:13,fontWeight:700,textDecoration:"none",padding:"10px 24px",borderRadius:50,transition:"all .22s",display:"inline-flex",alignItems:"center",gap:6, color:"#fff", background:"#16A34A", border:"1.5px solid #16A34A", boxShadow:"0 4px 14px rgba(22,163,74,0.35)" }}>S'inscrire</a>
        </div>
      </div>
    </nav>
  );
}

/* ─── Hero compact avec grande image aux bords arrondis (border-radius) ─── */
function CatalogHero({ search, onSearch, resultCount, hasQuery }) {
  return (
    <section style={{ position:"relative", padding:"10px 12px 0", width:"100%", margin:0 }}>
      {/* Conteneur grand format qui occupe tout l'espace avec 4 angles arrondis (border-radius) */}
      <div
        style={{
          position:"relative",
          borderRadius:"28px",
          overflow:"hidden",
          minHeight:"calc(100vh - 20px)",
          width:"100%",
          display:"flex",
          flexDirection:"column",
          justifyContent:"center",
          boxShadow:"0 16px 48px rgba(234,88,12,0.14)"
        }}
      >
        {/* Grande image pleine largeur avec 4 angles arrondis */}
        <img
          src="https://images.unsplash.com/photo-1665400808116-f0e6339b7e9a?q=95&w=3200&auto=format&fit=crop"
          alt="Plats d'Abidjan"
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center 42%", display:"block" }}
        />
        {/* Voile sombre dégradé */}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(10,5,0,0.20) 0%, rgba(10,5,0,0.45) 50%, rgba(10,5,0,0.80) 100%)" }} />

        <div style={{ position:"relative", zIndex:2, maxWidth:820, margin:"0 auto", padding:"80px 24px 60px", width:"100%", textAlign:"center" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.15)", backdropFilter:"blur(12px)", border:"1px solid rgba(255,255,255,0.25)", borderRadius:100, padding:"6px 18px", marginBottom:18 }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:T.yellow, boxShadow:`0 0 10px ${T.yellow}` }} />
            <p style={{ fontFamily:sans, fontSize:12, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color:"#fff", margin:0 }}>
              Abidjan · Côte d'Ivoire
            </p>
          </div>

          <h1 style={{ fontFamily:serif, fontWeight:900, fontSize:"clamp(36px,6vw,72px)", color:"#fff", lineHeight:1.02, letterSpacing:"-0.03em", margin:"0 0 20px", textShadow:"0 4px 28px rgba(0,0,0,0.5)" }}>
            Trouvez un plat, <em style={{ color:T.yellow, fontStyle:"italic" }}>on trouve</em> le resto.
          </h1>
          <p style={{ fontFamily:sans, fontSize:"clamp(14px,2vw,18px)", color:"rgba(255,255,255,0.85)", lineHeight:1.6, maxWidth:560, margin:"0 auto 32px", fontWeight:300 }}>
            Cherchez par type de cuisine, budget ou nom de plat — les restaurants s'affichent instantanément.
          </p>

          {/* Barre de recherche flottante */}
          <div style={{ display:"flex", gap:0, maxWidth:620, margin:"0 auto", borderRadius:50, overflow:"hidden", boxShadow:"0 16px 48px rgba(0,0,0,0.4)", background:"#fff" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"0 24px", flex:1 }}>
              <Search size={20} color={T.accent} />
              <input
                value={search}
                onChange={e => onSearch(e.target.value)}
                placeholder="Ex. : attiéké, garba, pizza, poulet braisé…"
                style={{ border:"none", outline:"none", fontFamily:sans, fontSize:15, color:T.text, background:"transparent", width:"100%", padding:"20px 0" }}
              />
              {search && <button onClick={() => onSearch("")} aria-label="Effacer" style={{ background:"none", border:"none", cursor:"pointer", color:T.mutedL, display:"flex" }}><X size={18} /></button>}
            </div>
            <div style={{ display:"flex", alignItems:"center", background:`linear-gradient(135deg,${T.accent},${T.accentD})`, color:"#fff", fontFamily:sans, fontSize:14, fontWeight:800, padding:"0 30px", whiteSpace:"nowrap" }}>
              {hasQuery ? `${resultCount} résultat${resultCount !== 1 ? "s" : ""}` : "Rechercher"}
            </div>
          </div>

          {/* Boutons CTA */}
          <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap", marginTop:30 }}>
            <a href="#catalogue" style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"14px 32px", background:`linear-gradient(135deg,${T.accent},${T.accentD})`, color:"#fff", fontFamily:sans, fontSize:14, fontWeight:800, textDecoration:"none", borderRadius:50, boxShadow:`0 10px 30px ${T.accent}66` }}>
              Je commande <ArrowRight size={16} />
            </a>
            <a href="/register?type=b2b" style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"14px 32px", background:"rgba(255,255,255,0.16)", color:"#fff", fontFamily:sans, fontSize:14, fontWeight:700, textDecoration:"none", borderRadius:50, backdropFilter:"blur(10px)", border:"1px solid rgba(255,255,255,0.35)" }}>
              Espace Entreprise
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Trois piliers de confiance ─── */
function Pillars() {
  const items = [
    { Icon: Zap,         title: "Livraison rapide",   text: "Vos plats chauds livrés en moins de 30 minutes, à la maison comme au bureau." },
    { Icon: UtensilsCrossed, title: "Cuisine d'ici",  text: "Attiéké, garba, alloco, kedjenou… le meilleur des restaurants d'Abidjan, à portée de clic." },
    { Icon: Smartphone,  title: "Paiement mobile",    text: "Orange Money, MTN MoMo, Wave ou carte — réglez en toute sécurité, en un geste." },
  ];
  return (
    <section style={{ background:"#fff", padding:"54px 0", borderBottom:`1px solid ${T.line}` }}>
      <div style={{ maxWidth:1180, margin:"0 auto", padding:"0 24px" }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:`${T.accent}12`, border:`1px solid ${T.accent}28`, borderRadius:100, padding:"7px 18px", marginBottom:14 }}>
            <ShieldCheck size={14} color={T.accent} />
            <span style={{ fontFamily:sans, fontSize:11, color:T.accent, letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:800 }}>Pourquoi Resto d'ici</span>
          </div>
          <h2 style={{ fontFamily:serif, fontSize:"clamp(24px,3.2vw,38px)", color:T.dark, fontWeight:900, margin:0, letterSpacing:"-0.025em" }}>
            Bien manger, <em style={{ color:T.accent, fontStyle:"italic" }}>simplement.</em>
          </h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:24 }}>
          {items.map(({ Icon, title, text }) => (
            <div key={title} style={{ textAlign:"center", padding:"16px", borderRadius:20, background:T.bg, border:`1px solid ${T.line}` }}>
              <div style={{ width:60, height:60, borderRadius:18, margin:"0 auto 16px", background:`linear-gradient(135deg,${T.accent}18,${T.yellow}28)`, border:`1px solid ${T.line}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon size={26} color={T.accent} strokeWidth={2} />
              </div>
              <h3 style={{ fontFamily:serif, fontSize:18, color:T.dark, fontWeight:800, margin:"0 0 8px" }}>{title}</h3>
              <p style={{ fontFamily:sans, fontSize:13.5, color:T.muted, lineHeight:1.6, margin:0, fontWeight:400 }}>{text}</p>
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
      style={{ background:T.card, borderRadius:22, overflow:"hidden", boxShadow:T.shadowS, border:`1px solid ${T.line}`, transition:"all .35s cubic-bezier(.22,1,.36,1)", display:"flex", flexDirection:"column" }}>

      {/* Photo */}
      <div onClick={()=>onOpenResto(restaurant)} style={{ position:"relative", height:180, overflow:"hidden", cursor:"pointer" }}>
        <img src={restoImg(restaurant, idx)} alt={restaurant.nom}
          onError={e=>{ e.target.src=fallbackImg(idx); }}
          style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform .55s", transform:hov?"scale(1.06)":"scale(1)" }} />
        {rating && (
          <div style={{ position:"absolute", top:12, left:12, background:"rgba(255,255,255,0.95)", borderRadius:10, padding:"4px 10px", display:"flex", alignItems:"center", gap:5, boxShadow:"0 2px 10px rgba(0,0,0,0.12)" }}>
            <Star size={12} fill={T.yellow} color={T.yellow} />
            <span style={{ fontFamily:sans, fontSize:12, fontWeight:800, color:T.dark }}>{rating}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding:"16px 18px 18px", display:"flex", flexDirection:"column", flex:1 }}>
        <h3 onClick={()=>onOpenResto(restaurant)} style={{ fontFamily:serif, fontSize:19, color:T.dark, fontWeight:800, margin:"0 0 4px", cursor:"pointer", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{restaurant.nom}</h3>
        <p style={{ fontFamily:sans, fontSize:12.5, color:T.muted, margin:"0 0 12px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
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
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:`1px solid ${T.line}`, paddingTop:12, marginTop:"auto" }}>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:4, color:T.muted }}>
              <Clock size={12} /><span style={{ fontFamily:sans, fontSize:11.5, fontWeight:600 }}>{time}</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <Truck size={12} color="#16A34A" /><span style={{ fontFamily:sans, fontSize:11.5, fontWeight:700, color:T.green }}>Livraison</span>
            </div>
          </div>
          <button onClick={()=>onOpenResto(restaurant)}
            style={{ display:"inline-flex", alignItems:"center", gap:5, fontFamily:sans, fontSize:12.5, fontWeight:800, color:T.accent, background:"none", border:"none", cursor:"pointer", padding:0 }}>
            Voir le menu <ArrowRight size={14} />
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
    <div style={{ background:T.card, borderRadius:22, overflow:"hidden", boxShadow:T.shadowS, border:`1px solid ${T.line}` }}>
      <div style={{ height:180, ...shimmer }} />
      <div style={{ padding:"16px 18px 20px" }}>
        <div style={{ height:18, width:"60%", borderRadius:6, marginBottom:10, ...shimmer }} />
        <div style={{ height:12, width:"45%", borderRadius:6, marginBottom:18, ...shimmer }} />
        <div style={{ height:32, borderRadius:8, ...shimmer }} />
      </div>
    </div>
  );
}

/* ─── Catalogue avec Sidebar dynamique Yango Deli ─── */
function Catalog({
  loading, types, activeType, onType,
  restaurants, selectedRestoId, onRestoChange,
  priceRange, onPriceRangeChange,
  minRating, onMinRatingChange,
  freeDeliveryOnly, onFreeDeliveryChange,
  fastDeliveryOnly, onFastDeliveryChange,
  sortBy, onSortByChange,
  onResetFilters, activeFiltersCount,
  results, query, onOpenResto, onOpenDish
}) {
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  /* Formattage des catégories pour FilterSidebar */
  const sidebarCats = useMemo(() => {
    return [
      { id: "__all__", nom: "Tous les plats", count: types.reduce((acc, t) => acc + (t.count || 0), 0) },
      ...types.map(t => ({ id: t.nom, nom: t.nom, count: t.count }))
    ];
  }, [types]);

  return (
    <section id="catalogue" style={{ background:T.bg, padding:"40px 0 96px", minHeight:"70vh" }}>
      <div style={{ maxWidth:1320, margin:"0 auto", padding:"0 24px" }}>

        {/* Bouton mobile pour ouvrir la sidebar Yango Deli */}
        <div className="rd-mobile-filter-btn" style={{ marginBottom: 18 }}>
          <button
            onClick={() => setMobileFilterOpen(true)}
            style={{
              width: "100%", padding: "12px 18px", borderRadius: 14,
              background: `linear-gradient(135deg, ${T.accent}, ${T.accentD})`,
              color: "#fff", border: "none", fontFamily: sans, fontSize: 14, fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              boxShadow: "0 6px 20px rgba(234,88,12,0.3)"
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <SlidersHorizontal size={18} /> Filtres Yango Deli
            </span>
            {activeFiltersCount > 0 && (
              <span style={{ background: "#fff", color: T.accent, borderRadius: 99, padding: "2px 10px", fontSize: 12, fontWeight: 900 }}>
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Disposition 2 Colonnes Desktop : Left = FilterSidebar, Right = Results */}
        <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>

          {/* Sidebar fixe desktop / mobile drawer */}
          <div className="rd-desktop-sidebar">
            <FilterSidebar
              categories={sidebarCats}
              activeCat={activeType}
              onCatChange={onType}
              restaurants={restaurants}
              selectedRestoId={selectedRestoId}
              onRestoChange={onRestoChange}
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
              onReset={onResetFilters}
              activeCount={activeFiltersCount}
            />
          </div>

          {/* Drawer mobile */}
          {mobileFilterOpen && (
            <FilterSidebar
              categories={sidebarCats}
              activeCat={activeType}
              onCatChange={onType}
              restaurants={restaurants}
              selectedRestoId={selectedRestoId}
              onRestoChange={onRestoChange}
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
              onReset={onResetFilters}
              activeCount={activeFiltersCount}
              isOpenMobile={true}
              onCloseMobile={() => setMobileFilterOpen(false)}
            />
          )}

          {/* Colonne Principale : Grille des résultats */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* En-tête des résultats & Filtres rapides */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
              <div>
                <h2 style={{ fontFamily:serif, fontSize:"clamp(22px,3vw,30px)", color:T.dark, fontWeight:900, margin:0, letterSpacing:"-0.02em" }}>
                  {query ? `Résultats pour « ${query} »` : activeType !== "__all__" ? `Restaurants — ${activeType}` : "Tous les restaurants"}
                </h2>
                {!loading && (
                  <p style={{ fontFamily:sans, fontSize:13, color:T.muted, margin:"4px 0 0", fontWeight:500 }}>
                    {results.length} restaurant{results.length !== 1 ? "s" : ""} disponible{results.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {activeFiltersCount > 0 && (
                <button
                  onClick={onResetFilters}
                  style={{
                    display:"inline-flex", alignItems:"center", gap:6,
                    padding:"8px 14px", borderRadius:99, background:T.accentL, border:`1px solid ${T.line}`,
                    color:T.accentD, fontFamily:sans, fontSize:12, fontWeight:700, cursor:"pointer"
                  }}
                >
                  <RotateCcw size={13} /> Effacer les filtres ({activeFiltersCount})
                </button>
              )}
            </div>

            {/* Grille */}
            {loading ? (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:20 }}>
                {Array.from({ length:6 }).map((_,i)=><SkeletonCard key={i} />)}
              </div>
            ) : results.length === 0 ? (
              <div style={{ textAlign:"center", padding:"70px 20px", background:T.card, borderRadius:24, border:`1px solid ${T.line}` }}>
                <p style={{ fontFamily:serif, fontSize:22, color:T.dark, fontWeight:800, margin:"0 0 8px" }}>
                  Aucun résultat trouvé
                </p>
                <p style={{ fontFamily:sans, fontSize:14, color:T.muted, margin:"0 0 20px" }}>
                  {query ? `Aucun restaurant ne correspond à « ${query} ».` : "Essayez de modifier vos filtres Yango Deli."}
                </p>
                <button
                  onClick={onResetFilters}
                  style={{
                    padding:"10px 24px", borderRadius:50, background:T.accent, color:"#fff",
                    fontFamily:sans, fontSize:13, fontWeight:700, border:"none", cursor:"pointer",
                    boxShadow:`0 4px 16px ${T.accent}44`
                  }}
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:20 }}>
                {results.map(({ restaurant, matched }, i) => (
                  <RestaurantCard key={restaurant.id ?? i} restaurant={restaurant} idx={i} matched={matched} query={query}
                    onOpenResto={onOpenResto} onOpenDish={onOpenDish} />
                ))}
              </div>
            )}
          </div>
        </div>
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
    try { await newsletterAPI.subscribe(nlEmail.trim()); } catch { /* silension */ }
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
    { label: "Orange Money", logo: orangeMoneyLogo },
    { label: "MTN MoMo",     logo: mtnMomoLogo },
    { label: "Moov Money",   logo: moovMoneyLogo },
    { label: "Wave",         logo: waveLogo },
    { label: "Carte Bancaire", logo: carteBancaireLogo },
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
              La plateforme qui modernise la restauration en Afrique de l'Ouest — de la commande à la facturation.
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
              <p style={{ fontFamily:sans,fontSize:10,color:"rgba(255,255,255,0.35)",letterSpacing:"0.12em",textTransform:"uppercase",margin:"0 0 10px",fontWeight:800 }}>Paiements 100% Sécurisés</p>
              <div style={{ display:"flex",gap:8,flexWrap:"wrap",alignItems:"center" }}>
                {PAYMENTS.map(({ label, logo }) => (
                  <div key={label} style={{ display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.06)",borderRadius:8,padding:"5px 10px",border:"1px solid rgba(255,255,255,0.12)" }}>
                    <img src={logo} alt={label} style={{ height:16,width:"auto",objectFit:"contain" }} />
                    <span style={{ fontFamily:sans,fontSize:11,color:"rgba(255,255,255,0.8)",fontWeight:700 }}>{label}</span>
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
  const [restaurants, setRestaurants]     = useState([]);
  const [dishesByResto, setDishesByResto] = useState({});
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");

  /* Filtres avancés style Yango Deli */
  const [activeType, setActiveType]           = useState("__all__");
  const [selectedRestoId, setSelectedRestoId] = useState("__all__");
  const [priceRange, setPriceRange]           = useState("__all__");
  const [minRating, setMinRating]             = useState(0);
  const [freeDeliveryOnly, setFreeDelivery]   = useState(false);
  const [fastDeliveryOnly, setFastDelivery]   = useState(false);
  const [sortBy, setSortBy]                   = useState("popular");

  useEffect(() => {
    let cancelled = false;
    menuAPI.getRestaurants()
      .then(async res => {
        const list = Array.isArray(res.data) ? res.data : [];
        if (cancelled) return;
        setRestaurants(list);
        setLoading(false);
        /* Charge les menus en arrière-plan */
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

  /* Types de cuisine disponibles avec décompte */
  const types = useMemo(() => {
    const counts = {};
    Object.values(dishesByResto).forEach(dishes =>
      dishes.forEach(d => {
        const n = d.categorie?.nom;
        if (n) counts[n] = (counts[n] || 0) + 1;
      })
    );
    return Object.entries(counts)
      .map(([nom, count]) => ({ nom, count }))
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  }, [dishesByResto]);

  /* Réinitialisation complète des filtres Yango Deli */
  const resetFilters = () => {
    setActiveType("__all__");
    setSelectedRestoId("__all__");
    setPriceRange("__all__");
    setMinRating(0);
    setFreeDelivery(false);
    setFastDelivery(false);
    setSortBy("popular");
    setSearch("");
  };

  /* Compteur des filtres actifs */
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (activeType !== "__all__") count++;
    if (selectedRestoId !== "__all__") count++;
    if (priceRange !== "__all__") count++;
    if (minRating > 0) count++;
    if (freeDeliveryOnly) count++;
    if (fastDeliveryOnly) count++;
    if (sortBy !== "popular") count++;
    if (search.trim()) count++;
    return count;
  }, [activeType, selectedRestoId, priceRange, minRating, freeDeliveryOnly, fastDeliveryOnly, sortBy, search]);

  /* Calcul et filtrage dynamique des restaurants et plats */
  const q = search.trim().toLowerCase();
  const results = useMemo(() => {
    let filtered = restaurants.map((r, idx) => {
      const dishes = dishesByResto[r.id] || [];

      /* Filtre par restaurant spécifique */
      if (selectedRestoId !== "__all__" && String(r.id) !== String(selectedRestoId)) return null;

      /* Filtre par type/catégorie de plat */
      if (activeType !== "__all__" && !dishes.some(d => d.categorie?.nom === activeType)) return null;

      /* Filtre par note minimum */
      const rRating = Number(r.noteMoyenne) || 0;
      if (minRating > 0 && rRating < minRating) return null;

      /* Filtre par livraison offerte */
      if (freeDeliveryOnly && r.fraisLivraison !== 0) return null;

      /* Filtre par délai rapide (< 30 min) */
      if (fastDeliveryOnly) {
        const timeStr = r.deliveryTime || "25 min";
        const firstNum = parseInt(timeStr, 10);
        if (!isNaN(firstNum) && firstNum > 30) return null;
      }

      /* Filtre par tranche de prix des plats du restaurant */
      if (priceRange !== "__all__") {
        const hasMatchingPrice = dishes.some(d => {
          const p = Number(d.prixClient ?? d.prix) || 0;
          if (priceRange === "under_3000") return p < 3000;
          if (priceRange === "3000_6000") return p >= 3000 && p <= 6000;
          if (priceRange === "over_6000") return p > 6000;
          return true;
        });
        if (!hasMatchingPrice) return null;
      }

      /* Recherche par mot-clé */
      if (!q) return { restaurant: r, matched: null, _idx: idx };

      const nameMatch = r.nom?.toLowerCase().includes(q) || (r.adresse || "").toLowerCase().includes(q);
      const matchedDishes = dishes.filter(d =>
        d.nom?.toLowerCase().includes(q) || d.categorie?.nom?.toLowerCase().includes(q)
      );
      if (!nameMatch && matchedDishes.length === 0) return null;

      return { restaurant: r, matched: matchedDishes.slice(0, 4), _idx: idx };
    }).filter(Boolean);

    /* Tri des résultats */
    filtered.sort((a, b) => {
      const rA = a.restaurant;
      const rB = b.restaurant;
      if (sortBy === "rating") {
        return (Number(rB.noteMoyenne) || 0) - (Number(rA.noteMoyenne) || 0);
      }
      if (sortBy === "time") {
        const tA = parseInt(rA.deliveryTime || "20", 10);
        const tB = parseInt(rB.deliveryTime || "20", 10);
        return tA - tB;
      }
      if (sortBy === "price_asc" || sortBy === "price_desc") {
        const avgPrice = (restoId) => {
          const d = dishesByResto[restoId] || [];
          if (!d.length) return 0;
          return d.reduce((acc, x) => acc + Number(x.prixClient ?? x.prix), 0) / d.length;
        };
        const pA = avgPrice(rA.id);
        const pB = avgPrice(rB.id);
        return sortBy === "price_asc" ? pA - pB : pB - pA;
      }
      return 0; // Popularité / défaut
    });

    return filtered;
  }, [restaurants, dishesByResto, activeType, selectedRestoId, priceRange, minRating, freeDeliveryOnly, fastDeliveryOnly, sortBy, q]);

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
        restaurants={restaurants}
        selectedRestoId={selectedRestoId}
        onRestoChange={setSelectedRestoId}
        priceRange={priceRange}
        onPriceRangeChange={setPriceRange}
        minRating={minRating}
        onMinRatingChange={setMinRating}
        freeDeliveryOnly={freeDeliveryOnly}
        onFreeDeliveryChange={setFreeDelivery}
        fastDeliveryOnly={fastDeliveryOnly}
        onFastDeliveryChange={setFastDelivery}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onResetFilters={resetFilters}
        activeFiltersCount={activeFiltersCount}
        results={results}
        query={search.trim()}
        onOpenResto={openResto}
        onOpenDish={openDish}
      />
      <Footer />
    </div>
  );
}
