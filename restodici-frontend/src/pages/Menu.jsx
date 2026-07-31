// Menu.jsx — Catalogue restaurants + menu par restaurant avec Sidebar dynamique Yango Deli
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { getDistanceFromLatLonInKm, getUserLocation } from '../utils/geo';
import { expandQuery, createRestaurantIndex, createProductIndex, calculateHybridScore } from '../utils/searchEngine';
import {
  Search, X, UtensilsCrossed, Star, Clock, Heart, ArrowLeft,
  ShoppingCart, Plus, Minus, Store, AlertCircle, MapPin, ChevronRight,
  Truck, Package, Navigation, Trash2, SlidersHorizontal, RotateCcw,
  Flame, History, Utensils,
} from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { menuAPI, promosAPI } from '../services/api';
import ProductCustomizationModal from '../components/menu/ProductCustomizationModal';
import CartDrawer from '../components/cart/CartDrawer';
import DeliveryMap from '../components/maps/DeliveryMap';
import FilterSidebar from '../components/menu/FilterSidebar';
import LanguageSwitcher from '../components/shared/LanguageSwitcher';
import { formatFCFA } from '../utils/formatters';
import { getArticleImage } from '../utils/articleImage';
import { BrandMark } from '../components/shared/BrandLogo';

const C = {
  page:   '#FFFFFF',
  bg:     '#F1F5F9',
  card:   '#FFFFFF',
  accent: '#EA580C',
  aD:     '#C2410C',
  aL:     '#FFF7ED', // orange-50
  yellow: '#F59E0B',
  red:    '#EF4444',
  green:  '#10B981',
  dark:   '#0F172A',
  text:   '#334155',
  muted:  '#64748B',
  faint:  '#94A3B8',
  line:   '#E2E8F0',
  nav:    '#FFFFFF',
  sh:     '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  shM:    '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  shL:    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
};
const sans = "'Inter', system-ui, sans-serif";

const DELIVERY_MODES = [
  { key: 'SUR_PLACE', label: 'Sur place',  Icon: UtensilsCrossed },
  { key: 'EMPORTER',  label: 'À emporter', Icon: Package },
  { key: 'LIVRAISON', label: 'Livraison',  Icon: Truck },
];

const FOOD_IMGS = [
  '/images/food/poulet_braise.png',
  '/images/food/jollof_rice.png',
  '/images/food/poisson_braise.png',
  '/images/food/suya_brochettes.png',
];
const fallback = (i, w = 600) => FOOD_IMGS[i % FOOD_IMGS.length];

const CSS = `
@keyframes sk      { 0%{background-position:200% 0}100%{background-position:-200% 0} }
@keyframes fadeUp  { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
@keyframes barIn   { from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)} }
@keyframes overlayIn { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
@keyframes modalIn { from{opacity:0;transform:translateY(20px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes spin { to{transform:rotate(360deg)} }
@keyframes bannerMarquee  { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
@keyframes bannerMarqueeR { 0%{transform:translateX(-50%)} 100%{transform:translateX(0)} }
@keyframes slideInLeft { from{transform:translateX(-100%)} to{transform:translateX(0)} }
.cat-scroll::-webkit-scrollbar{display:none}
.prod-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:20px; }
.cart-panel{ display:flex; flex-direction:column; }
.cart-mobile-bar{ display:none; }

@media(max-width:900px){
  .cart-panel{ display:none !important; }
  .prod-grid{ grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; }
  .cart-mobile-bar{ display:block; }
  .rd-menu-desktop-sidebar { display: none !important; }
  .rd-menu-mobile-filter-btn { display: flex !important; }
}
@media(min-width:901px){
  .rd-menu-mobile-filter-btn { display: none !important; }
}
@media(max-width:820px){
  /* Barre du haut de la page restaurant : back + infos + recherche + panier
     tenaient tous sur une seule ligne de 86px sans jamais rétrécir —
     ça débordait largement un écran de téléphone. On l'empile sur 2 lignes. */
  .menu-resto-topbar { flex-wrap: wrap !important; height: auto !important; padding: 14px 16px !important; gap: 12px !important; }
  .menu-resto-info { border-right: none !important; padding-right: 0 !important; margin-right: 0 !important; }
  .menu-resto-search { order: 3; flex: 1 1 100% !important; max-width: none !important; }
  .menu-resto-cart-btn { padding: 0 16px !important; }
}
`;

function SK({ w = '100%', h = 16, r = 8 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,#EBEBEB 25%,#F5F5F5 50%,#EBEBEB 75%)',
      backgroundSize: '200% 100%',
      animation: 'sk 1.4s ease infinite',
    }} />
  );
}



function buildDynCats(articles, catList) {
  const map = new Map();
  (catList || []).forEach(c => { if (c?.id) map.set(c.id, { ...c, count: 0 }); });
  (articles || []).forEach(p => {
    const cid = p.categorieId || p.categorie?.id;
    if (cid && map.has(cid)) map.get(cid).count++;
  });
  return [{ id: '__all__', nom: 'Tout voir', count: (articles || []).length }, ...Array.from(map.values())];
}

/* ── Logo ── */
function Logo() {
  return (
    <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
      <BrandMark size={36} shadow />
      <span style={{ fontFamily: sans, fontSize: 18, fontWeight: 900, letterSpacing: '-0.04em' }}>
        <span style={{ color: '#EA580C' }}>Resto</span>
        <span style={{ color: '#1C1C1E' }}>&nbsp;d'ici</span>
      </span>
    </Link>
  );
}

/* ── Modal carte livraison ── */
function DeliveryMapModal({ onClose, onConfirm, initial }) {
  const [loc,       setLoc]       = useState(initial || null);
  const [mapLoc,    setMapLoc]    = useState(initial || null);
  const [query,     setQuery]     = useState(initial?.address || '');
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const handleQueryChange = (val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (val.length < 3) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          'https://nominatim.openstreetmap.org/search?format=json&q=' +
          encodeURIComponent(val) + '&limit=6&accept-language=fr',
          { headers: { 'Accept-Language': 'fr' } }
        );
        setResults(await res.json());
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 550);
  };

  const pickResult = (r) => {
    const newLoc = { lat: parseFloat(r.lat), lng: parseFloat(r.lon), address: r.display_name };
    setLoc(newLoc);
    setMapLoc(newLoc);
    setQuery(r.display_name);
    setResults([]);
  };

  const handleMapChange = (newLoc) => {
    setLoc(newLoc);
    if (newLoc?.address) setQuery(newLoc.address);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: '100%', maxWidth: 700, background: C.card, borderRadius: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '92vh', animation: 'modalIn 0.28s cubic-bezier(.22,1,.36,1) both', boxShadow: '0 32px 80px rgba(0,0,0,0.35)' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid ' + C.line, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: C.aL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Truck size={18} color={C.accent} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontFamily: sans, fontSize: 16, fontWeight: 900, color: C.dark }}>Adresse de livraison</p>
            <p style={{ margin: '2px 0 0', fontFamily: sans, fontSize: 12, color: C.muted }}>Recherchez ou cliquez directement sur la carte</p>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: C.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={15} color={C.muted} />
          </button>
        </div>

        <div style={{ padding: '12px 20px', borderBottom: '1px solid ' + C.line, flexShrink: 0, position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.bg, border: '1.5px solid ' + C.line, borderRadius: 12, padding: '0 14px', height: 44 }}>
            <Search size={15} color={C.muted} />
            <input
              type="text"
              placeholder="Ex : Plateau, Cocody, Zone 4, Yopougon…"
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', fontFamily: sans, fontSize: 13, color: C.dark, background: 'transparent' }}
            />
            {searching && (
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2.5px solid ' + C.accent, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
            )}
            {query && !searching && (
              <button onClick={() => { setQuery(''); setResults([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}>
                <X size={14} color={C.muted} />
              </button>
            )}
          </div>

          {results.length > 0 && (
            <div style={{ position: 'absolute', top: 'calc(100% - 2px)', left: 20, right: 20, background: C.card, border: '1px solid ' + C.line, borderRadius: 14, boxShadow: C.shL, maxHeight: 220, overflowY: 'auto', zIndex: 20 }}>
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => pickResult(r)}
                  style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', border: 'none', borderBottom: i < results.length - 1 ? '1px solid ' + C.line : 'none', background: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.aL; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                >
                  <MapPin size={13} color={C.accent} style={{ flexShrink: 0, marginTop: 3 }} />
                  <span style={{ fontFamily: sans, fontSize: 12, color: C.dark, lineHeight: 1.55 }}>{r.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {loc?.address && (
          <div style={{ padding: '9px 20px', background: C.aL, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <MapPin size={13} color={C.accent} style={{ flexShrink: 0 }} />
            <p style={{ margin: 0, fontFamily: sans, fontSize: 12, color: C.aD, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {loc.address}
            </p>
          </div>
        )}

        <div style={{ height: 400, flexShrink: 0 }}>
          <DeliveryMap
            value={mapLoc}
            onChange={handleMapChange}
            heightClassName="h-full"
            className=""
          />
        </div>

        <div style={{ padding: '14px 20px 18px', borderTop: '1px solid ' + C.line, flexShrink: 0 }}>
          <button
            onClick={() => { if (loc) { onConfirm(loc); onClose(); } }}
            disabled={!loc}
            style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none',
              background: loc ? 'linear-gradient(135deg,#EA580C,#C2410C)' : C.line,
              color: loc ? '#fff' : C.muted,
              fontFamily: sans, fontSize: 14, fontWeight: 800,
              cursor: loc ? 'pointer' : 'not-allowed',
              boxShadow: loc ? '0 6px 20px #EA580C55' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s',
            }}
          >
            <Navigation size={16} />
            {loc ? 'Confirmer — ' + loc.address?.split(',')[0] : 'Sélectionnez un emplacement sur la carte'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Carte Restaurant Yango Deli ── */
function RestaurantCard({ restaurant, idx, onSelect, matched, favorites, onFav, distance }) {
  const [hov, setHov] = useState(false);
  const img = restaurant.logo || restaurant.coverImage || restaurant.photoUrl || fallback(idx, 480);
  // Note réelle uniquement : sans avis, on n'affiche pas un « 0.0 » trompeur.
  const nbAvis = Number(restaurant.nbAvis || 0);
  const rating = nbAvis > 0 ? Number(restaurant.noteMoyenne).toFixed(1) : null;
  const time   = restaurant.deliveryTime || (20 + (idx % 4) * 5) + '–' + (30 + (idx % 4) * 5) + ' min';
  const isFav  = favorites?.includes(restaurant.id);
  const isOpen = restaurant.isOpen !== false;
  const badge = Number(restaurant.noteMoyenne) >= 4.5 ? '★ Bien noté' : null;

  return (
    <div
      onClick={() => isOpen && onSelect(restaurant)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: C.card, borderRadius: 22,
        boxShadow: hov ? C.shL : C.sh,
        overflow: 'hidden', cursor: isOpen ? 'pointer' : 'default',
        transform: hov ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
        opacity: isOpen ? 1 : 0.68,
        animation: 'fadeUp 0.35s ease both',
        // La carte est blanche sur une page blanche : la bordure se renforce
        // au survol pour accompagner l'élévation.
        border: `1px solid ${hov ? '#CBD5E1' : C.line}`
      }}
    >
      <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
        <img src={img} alt={restaurant.nom}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            transform: hov ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.4s ease' }}
          onError={e => { e.target.src = fallback(idx, 480); }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)' }} />
        <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {badge && <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 800, background: 'rgba(255,255,255,0.95)', color: C.dark, borderRadius: 99, padding: '3px 8px' }}>{badge}</span>}
            {!isOpen && <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 800, background: 'rgba(0,0,0,0.72)', color: '#fff', borderRadius: 99, padding: '3px 8px' }}>Fermé</span>}
          </div>
          <button onClick={e => { e.stopPropagation(); onFav?.(restaurant.id); }} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.90)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Heart size={15} fill={isFav ? C.red : 'none'} color={isFav ? C.red : C.muted} strokeWidth={2} />
          </button>
        </div>
        <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: sans, fontSize: 12, fontWeight: 700, color: '#fff' }}>
            {rating
              ? <><Star size={12} fill={C.yellow} color={C.yellow} /> {rating} <span style={{ fontWeight: 500, opacity: 0.75 }}>({nbAvis})</span></>
              : 'Nouveau'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {distance != null && distance !== Infinity && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: sans, fontSize: 11, color: 'rgba(255,255,255,0.9)' }}><MapPin size={11} color="rgba(255,255,255,0.8)" /> {distance < 1 ? '< 1 km' : distance.toFixed(1) + ' km'}</span>}
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: sans, fontSize: 11, color: 'rgba(255,255,255,0.9)' }}><Clock size={11} color="rgba(255,255,255,0.8)" /> {time}</span>
          </div>
        </div>
      </div>
      <div style={{ padding: '14px 14px 16px' }}>
        <p style={{ margin: '0 0 3px', fontFamily: sans, fontSize: 15, fontWeight: 800, color: C.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{restaurant.nom}</p>
        <p style={{ margin: '0 0 10px', fontFamily: sans, fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{restaurant.adresse || restaurant.ville || restaurant.description || 'Restaurant partenaire'}</p>
        {matched && matched.length > 0 ? (
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: '0 0 6px', fontFamily: sans, fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.accent }}>Propose votre recherche</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {matched.map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, background: C.aL, border: '1px solid ' + C.line, borderRadius: 8, padding: '5px 9px' }}>
                  <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nom}</span>
                  <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 800, color: C.accent, flexShrink: 0 }}>{formatFCFA(d.prixClient ?? d.prix)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {(restaurant.cuisines || restaurant.tags || []).slice(0, 3).map((t, i) => <span key={i} style={{ fontFamily: sans, fontSize: 10, fontWeight: 700, background: C.aL, color: C.aD, borderRadius: 99, padding: '3px 8px' }}>{t}</span>)}
            {restaurant.fraisLivraison != null && <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 700, background: '#F0FFF4', color: C.green, borderRadius: 99, padding: '3px 8px' }}>{restaurant.fraisLivraison === 0 ? '🚴 Livraison offerte' : '🚴 ' + formatFCFA(restaurant.fraisLivraison)}</span>}
          </div>
        )}
        <button onClick={e => { if (!isOpen) return; e.stopPropagation(); onSelect(restaurant); }} disabled={!isOpen} style={{ width: '100%', padding: '10px', borderRadius: 12, border: 'none', background: isOpen ? 'linear-gradient(135deg,#EA580C,#C2410C)' : C.line, color: isOpen ? '#fff' : C.muted, fontFamily: sans, fontSize: 13, fontWeight: 800, cursor: isOpen ? 'pointer' : 'not-allowed', boxShadow: isOpen ? '0 4px 14px #EA580C44' : 'none', transition: 'all 0.15s' }}>
          {isOpen ? 'Voir le menu →' : 'Restaurant fermé'}
        </button>
      </div>
    </div>
  );
}

/* ── Carte produit Yango Deli ── */
function ProductCard({ product, qty, onAdd, onRemove, onCustomize, idx, isFav, onToggleFav }) {
  const img = getArticleImage(product) || fallback(idx, 400);
  const isAvail = product.disponible !== false;
  const [hov, setHov] = useState(false);
  const price = product.prixClient ?? product.prix;
  const openDetail = () => { if (isAvail && onCustomize) onCustomize(product); };

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={openDetail}
      style={{
        background: C.card, borderRadius: 22, overflow: 'hidden',
        border: `1px solid ${C.line}`,
        boxShadow: hov && isAvail ? C.shM : C.sh,
        transform: hov && isAvail ? 'translateY(-4px)' : 'none',
        transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
        opacity: isAvail ? 1 : 0.6,
        display: 'flex', flexDirection: 'column',
        height: 340,
        cursor: isAvail && onCustomize ? 'pointer' : 'default',
        animation: 'fadeUp 0.3s ease both',
      }}
    >
      <div style={{ position: 'relative', height: 196, flexShrink: 0, overflow: 'hidden' }}>
        <img src={img} alt={product.nom} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: hov ? 'scale(1.06)' : 'scale(1)', transition: 'transform 0.45s ease' }} onError={e => { e.target.src = fallback(idx, 400); }} />
        {!isAvail && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 800, color: '#fff', background: 'rgba(0,0,0,0.72)', padding: '5px 12px', borderRadius: 99 }}>Rupture</span>
          </div>
        )}
        <button
          onClick={e => { e.stopPropagation(); onToggleFav?.(product.id); }}
          style={{
            position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: '50%',
            border: 'none', cursor: 'pointer',
            background: isFav ? C.red : 'rgba(255,255,255,0.94)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            transition: 'background 0.2s, transform 0.15s',
            transform: isFav ? 'scale(1.15)' : 'scale(1)',
          }}
        >
          <Heart size={15} color={isFav ? '#fff' : C.red} fill={isFav ? '#fff' : 'none'} strokeWidth={2} />
        </button>
      </div>

      <div style={{ flex: 1, padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <p style={{ margin: 0, fontFamily: sans, fontSize: 15, fontWeight: 800, color: C.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.nom}</p>
        <p style={{ margin: '4px 0 0', fontFamily: sans, fontSize: 12, color: C.muted, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {product.description || (isAvail ? 'Prêt en ~15 min' : 'Indisponible')}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 10, gap: 8 }}>
          <span style={{ fontFamily: sans, fontSize: 18, fontWeight: 900, color: C.dark }}>{formatFCFA(price)}</span>
          {qty > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', background: C.accent, borderRadius: 99, overflow: 'hidden', boxShadow: '0 4px 14px #EA580C55' }}>
              <button onClick={e => { e.stopPropagation(); onRemove(product); }} style={{ width: 34, height: 34, border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={14} /></button>
              <span style={{ fontFamily: sans, fontSize: 15, fontWeight: 800, color: '#fff', minWidth: 20, textAlign: 'center' }}>{qty}</span>
              <button onClick={e => { e.stopPropagation(); onAdd(product); }} style={{ width: 34, height: 34, border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={14} /></button>
            </div>
          ) : (
            <button onClick={e => { e.stopPropagation(); if (isAvail) onAdd(product); }} disabled={!isAvail} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: isAvail ? 'linear-gradient(135deg,#EA580C,#C2410C)' : C.line, color: isAvail ? '#fff' : C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isAvail ? 'pointer' : 'not-allowed', boxShadow: isAvail ? '0 4px 14px #EA580C55' : 'none', flexShrink: 0, transition: 'all 0.15s' }}>
              <Plus size={19} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Catégories en onglets plats (SaaS Style) ── */
// eslint-disable-next-line react/prop-types
function CategoryTabs({ cats, active, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const btn = ref.current.querySelector('[data-cat="' + active + '"]');
    if (btn) btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [active]);

  return (
    <div ref={ref} className="cat-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 20px 16px', scrollbarWidth: 'none' }}>
      {/* eslint-disable-next-line react/prop-types */}
      {cats.map(cat => {
        const isActive = cat.id === active;
        return (
          <button 
            key={cat.id} 
            data-cat={cat.id} 
            onClick={() => onChange(cat.id)} 
            style={{ 
              flexShrink: 0, 
              display: 'inline-flex', 
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 16px',
              borderRadius: '8px',
              background: isActive ? '#0F172A' : '#FFFFFF',
              border: '1px solid',
              borderColor: isActive ? '#0F172A' : '#E2E8F0',
              color: isActive ? '#FFFFFF' : '#334155',
              fontFamily: sans,
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: 'none'
            }}
          >
            {cat.nom}
          </button>
        );
      })}
    </div>
  );
}

/* ── Bandeau promos ── */
function PromoStrip({ promos }) {
  const [copied, setCopied] = useState(null);
  const copy = code => { navigator.clipboard.writeText(code).then(() => { setCopied(code); setTimeout(() => setCopied(null), 1800); }); };
  const fmtRemise = p => p.type === 'PERCENT' ? '-' + p.valeur + '%' : '-' + Number(p.valeur).toLocaleString('fr-FR') + ' FCFA';

  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontFamily: sans, fontSize: 11, fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 10px' }}>🎉 Codes promo disponibles</p>
      <div className="cat-scroll" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {promos.map(p => (
          <div key={p.id} style={{ flexShrink: 0, background: '#fff', border: '1.5px dashed ' + C.accent, borderRadius: 14, padding: '12px 16px', minWidth: 220, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: sans, fontSize: 20, fontWeight: 900, color: C.accent }}>{fmtRemise(p)}</span>
              {p.minMontant > 0 && <span style={{ fontFamily: sans, fontSize: 10, color: C.muted }}>dès {Number(p.minMontant).toLocaleString('fr-FR')} FCFA</span>}
            </div>
            {p.description && <p style={{ margin: 0, fontFamily: sans, fontSize: 12, color: C.text, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{p.description}</p>}
            <button onClick={() => copy(p.code)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: copied === p.code ? '#F0FDF4' : C.aL, border: '1px solid ' + (copied === p.code ? '#86EFAC22' : C.accent + '22'), borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontFamily: 'monospace', fontSize: 13, fontWeight: 900, color: copied === p.code ? '#16A34A' : C.aD, gap: 8, width: '100%' }}>
              <span>{p.code}</span>
              <span style={{ fontSize: 11 }}>{copied === p.code ? '✓ Copié !' : 'Copier'}</span>
            </button>
            {p.expiresAt && <p style={{ margin: 0, fontFamily: sans, fontSize: 10, color: C.muted }}>Expire le {new Date(p.expiresAt).toLocaleDateString('fr-FR')}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Panneau panier ── */
function CartPanel({ items, total, onUpdate, onClear, deliveryMode, onDeliveryMode, onCheckout, deliveryAddress, onOpenMap }) {
  const subtotal = total();
  const fraisLiv = deliveryMode === 'LIVRAISON' ? 500 : 0;
  const grandTotal = subtotal + fraisLiv;

  return (
    <div className="cart-panel" style={{ width: 310, flexShrink: 0, background: C.card, borderLeft: '1px solid ' + C.line, height: '100%', overflowY: 'auto', boxShadow: '-4px 0 20px rgba(0,0,0,0.04)' }}>
      <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid ' + C.line }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <p style={{ margin: 0, fontFamily: sans, fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Commande actuelle</p>
            <p style={{ margin: '3px 0 0', fontFamily: sans, fontSize: 14, fontWeight: 900, color: C.dark }}>#{String(Math.floor(Date.now() / 1000)).slice(-7)}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontFamily: sans, fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Articles</p>
              <p style={{ margin: '3px 0 0', fontFamily: sans, fontSize: 15, fontWeight: 900, color: C.accent }}>{items.reduce((s, i) => s + (i.quantite || 0), 0)}</p>
            </div>
            {items.length > 0 && (
              <button onClick={onClear} title="Vider le panier"
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(255,140,0,0.25)', borderRadius: 8, padding: '5px 9px', cursor: 'pointer', color: C.accent, fontSize: 11, fontWeight: 700, lineHeight: 1, marginTop: 2 }}>
                <Trash2 size={11} /> Vider
              </button>
            )}
          </div>
        </div>

        <p style={{ margin: '0 0 8px', fontFamily: sans, fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mode de livraison</p>
        <div style={{ display: 'flex', background: C.bg, borderRadius: 12, padding: 3, gap: 2 }}>
          {DELIVERY_MODES.map(({ key, label, Icon }) => {
            const isActive = deliveryMode === key;
            return (
              <button key={key} onClick={() => onDeliveryMode(key)} title={label} style={{ flex: 1, padding: '8px 4px', borderRadius: 9, border: 'none', background: isActive ? C.accent : 'transparent', color: isActive ? '#fff' : C.muted, fontFamily: sans, fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', boxShadow: isActive ? '0 2px 8px #EA580C44' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <Icon size={14} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {deliveryMode === 'LIVRAISON' && (
          <div style={{ marginTop: 10 }}>
            {deliveryAddress?.address ? (
              <button onClick={onOpenMap} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: C.aL, border: '1px solid ' + C.accent + '30', borderRadius: 10, padding: '9px 12px', cursor: 'pointer', textAlign: 'left' }}>
                <MapPin size={13} color={C.accent} style={{ flexShrink: 0 }} />
                <span style={{ fontFamily: sans, fontSize: 11, color: C.aD, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deliveryAddress.address}</span>
                <span style={{ fontFamily: sans, fontSize: 10, color: C.accent, fontWeight: 700, flexShrink: 0 }}>Modifier</span>
              </button>
            ) : (
              <button onClick={onOpenMap} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: C.bg, border: '1.5px dashed ' + C.faint, borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>
                <MapPin size={13} color={C.muted} />
                <span style={{ fontFamily: sans, fontSize: 12, color: C.muted, fontWeight: 600 }}>Choisir mon adresse de livraison</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: '14px 18px', overflowY: 'auto' }}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><ShoppingCart size={24} color={C.faint} /></div>
            <p style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: C.muted, margin: '0 0 4px' }}>Panier vide</p>
            <p style={{ fontFamily: sans, fontSize: 11, color: C.faint, margin: 0 }}>Ajoutez des plats depuis le menu</p>
          </div>
        ) : (
          <>
            <p style={{ margin: '0 0 12px', fontFamily: sans, fontSize: 11, fontWeight: 800, color: C.dark, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mes commandes</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map(item => (
                <div key={item.lineId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: C.bg }}>
                    {item.photoUrl && <img src={item.photoUrl} alt={item.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 2px', fontFamily: sans, fontSize: 12, fontWeight: 700, color: C.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nom}</p>
                    <p style={{ margin: 0, fontFamily: sans, fontSize: 11, fontWeight: 800, color: C.accent }}>{formatFCFA(item.prix)}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => onUpdate(item.lineId, item.quantite - 1)} style={{ width: 24, height: 24, borderRadius: 6, border: '1.5px solid ' + C.line, background: C.bg, color: C.dark, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={10} /></button>
                    <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 800, color: C.dark, minWidth: 16, textAlign: 'center' }}>{item.quantite}</span>
                    <button onClick={() => onUpdate(item.lineId, item.quantite + 1)} style={{ width: 24, height: 24, borderRadius: 6, border: '1.5px solid ' + C.accent, background: C.aL, color: C.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={10} /></button>
                  </div>
                  <p style={{ margin: 0, fontFamily: sans, fontSize: 12, fontWeight: 800, color: C.dark, minWidth: 48, textAlign: 'right', flexShrink: 0 }}>{formatFCFA(item.prix * item.quantite)}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {items.length > 0 && (
        <div style={{ padding: '14px 18px 20px', borderTop: '1px solid ' + C.line }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: sans, fontSize: 13, color: C.muted }}>Sous-total</span>
              <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: C.dark }}>{formatFCFA(subtotal)}</span>
            </div>
            {deliveryMode === 'LIVRAISON' && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: sans, fontSize: 13, color: C.muted }}>Frais de livraison</span>
                <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: C.dark }}>{formatFCFA(fraisLiv)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1.5px solid ' + C.line }}>
              <span style={{ fontFamily: sans, fontSize: 15, fontWeight: 900, color: C.dark }}>Total</span>
              <span style={{ fontFamily: sans, fontSize: 16, fontWeight: 900, color: C.accent }}>{formatFCFA(grandTotal)}</span>
            </div>
          </div>
          <button onClick={onCheckout} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#EA580C,#C2410C)', color: '#fff', fontFamily: sans, fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 20px #EA580C55', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            Continuer le paiement →
          </button>
        </div>
      )}
    </div>
  );
}

export default function MenuPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const pendingPlatRef = useRef(searchParams.get('plat') || null);

  const [restaurants,     setRestaurants]     = useState([]);
  const [dishesByResto,   setDishesByResto]   = useState({});
  const [selectedResto,   setSelectedResto]   = useState(null);
  const [menuData,        setMenuData]        = useState([]);
  const [categories,      setCategories]      = useState([]);
  const [promos,          setPromos]          = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [menuLoading,     setMenuLoading]     = useState(false);
  const [search,          setSearch]          = useState('');
  const [discoSearch,     setDiscoSearch]     = useState('');
  const [activeCat,       setActiveCat]       = useState('__all__');
  const [discoCat,        setDiscoCat]        = useState('__all__');

  // Search History & GeoLocation
  const [searchHistory, setSearchHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('restodici_search_history') || '[]'); } catch { return []; }
  });
  const [userLocation, setUserLocation] = useState(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  /* États des filtres avancés Yango Deli */
  const [discoRestoId,    setDiscoRestoId]    = useState('__all__');
  const [discoPriceRange, setDiscoPriceRange] = useState('__all__');
  const [discoMinRating,  setDiscoMinRating]  = useState(0);
  const [discoFreeDelivery, setDiscoFreeDelivery] = useState(false);
  const [discoFastDelivery, setDiscoFastDelivery] = useState(false);
  const [discoSortBy,     setDiscoSortBy]     = useState('popular');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const [quantities,      setQuantities]      = useState({});
  const [cartOpen,        setCartOpen]        = useState(false);
  const [customModal,     setCustomModal]     = useState({ open: false, product: null });
  const [error,           setError]           = useState(null);
  const [mapOpen,         setMapOpen]         = useState(false);

  const bannerItems = restaurants.length > 0
    ? restaurants.map(r => r.nom)
    : ['Cocody', 'Plateau', 'Adjamé', 'Treichville', 'Marcory', 'Yopougon', 'Abobo', 'Koumassi'];

  const [restoFavs, setRestoFavs] = useState(
    () => { try { return JSON.parse(localStorage.getItem('restoFavs') || '[]'); } catch { return []; } }
  );
  const [articleFavs, setArticleFavs] = useState(
    () => { try { return JSON.parse(localStorage.getItem('articleFavs') || '[]'); } catch { return []; } }
  );

  const [deliveryMode, setDeliveryMode] = useState(
    () => localStorage.getItem('deliveryMode') || 'EMPORTER'
  );
  const [deliveryAddress, setDeliveryAddress] = useState(
    () => { try { return JSON.parse(localStorage.getItem('deliveryAddress') || 'null'); } catch { return null; } }
  );

  const { user } = useAuth();
  const { addItem, updateQuantity, clearCart, items, total } = useCart();
  const cartCount = items.reduce((s, i) => s + (i.quantite || 0), 0);

  useEffect(() => { localStorage.setItem('restoFavs', JSON.stringify(restoFavs)); }, [restoFavs]);
  useEffect(() => { localStorage.setItem('articleFavs', JSON.stringify(articleFavs)); }, [articleFavs]);
  useEffect(() => { localStorage.setItem('deliveryMode', deliveryMode); }, [deliveryMode]);
  useEffect(() => { localStorage.setItem('deliveryAddress', JSON.stringify(deliveryAddress)); }, [deliveryAddress]);
  useEffect(() => { localStorage.setItem('restodici_search_history', JSON.stringify(searchHistory)); }, [searchHistory]);

  // GeoLocation effect
  useEffect(() => {
    if (deliveryAddress && deliveryAddress.lat && deliveryAddress.lng) {
      setUserLocation({ lat: deliveryAddress.lat, lng: deliveryAddress.lng });
    } else {
      getUserLocation().then(loc => loc && setUserLocation(loc));
    }
  }, [deliveryAddress]);

  // Add search to history
  const saveSearchToHistory = useCallback((q) => {
    const term = q.trim();
    if (!term) return;
    setSearchHistory(prev => {
      const filtered = prev.filter(x => x.toLowerCase() !== term.toLowerCase());
      return [term, ...filtered].slice(0, 8); // Keep last 8 searches
    });
  }, []);

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter') {
      saveSearchToHistory(discoSearch);
      setIsSearchFocused(false);
      e.target.blur();
    }
  };

  useEffect(() => {
    document.body.style.overflow = (selectedResto || mapOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selectedResto, mapOpen]);

  useEffect(() => {
    setLoading(true);
    menuAPI.getRestaurants()
      .then(r => {
        const list = r.data || [];
        setRestaurants(list);
        const restoId = searchParams.get('resto');
        if (restoId) {
          const target = list.find(x => String(x.id) === String(restoId));
          if (target) setSelectedResto(target);
        }
        Promise.all(list.map(rr =>
          menuAPI.getByRestaurant(rr.id)
            .then(mr => {
              const raw = mr.data;
              const plats = Array.isArray(raw) ? raw : (raw?.articles ?? raw?.items ?? raw?.plats ?? []);
              return [rr.id, plats.filter(p => p.disponible !== false)];
            })
            .catch(() => [rr.id, []])
        )).then(entries => setDishesByResto(Object.fromEntries(entries)));
      })
      .catch(() => setError('Impossible de charger les restaurants.'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedResto) { setPromos([]); return; }
    setMenuLoading(true);
    setSearch('');
    setActiveCat('__all__');
    setQuantities({});
    Promise.all([
      menuAPI.getByRestaurant(selectedResto.id),
      menuAPI.getCategories({ restaurantId: selectedResto.id }),
      promosAPI.getActives(selectedResto.id, user?.id).catch(() => ({ data: [] })),
    ])
      .then(([mr, cr, pr]) => {
        setMenuData(mr.data || []);
        setCategories(cr.data || []);
        setPromos(pr.data || []);
        if (pendingPlatRef.current) {
          setSearch(pendingPlatRef.current);
          pendingPlatRef.current = null;
          setSearchParams({}, { replace: true });
        }
      })
      .catch(() => setError('Impossible de charger le menu.'))
      .finally(() => setMenuLoading(false));
  }, [selectedResto]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = {};
    items.forEach(i => { map[i.articleId] = (map[i.articleId] || 0) + (i.quantite || 0); });
    setQuantities(map);
  }, [items]);

  const toggleRestoFav = useCallback(id => {
    setRestoFavs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const toggleArticleFav = useCallback(id => {
    setArticleFavs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const handleAdd = useCallback(product => {
    addItem({
      articleId: product.id,
      nom: product.nom,
      prix: Number(product.prixClient ?? (product.promoActif && product.prixPromo ? product.prixPromo : product.prix)),
      photoUrl: product.photoUrl || product.imageUrl,
      categorie: product.categorie,
      restaurantId: selectedResto.id,
      restaurantName: selectedResto.nom,
    }, 1);
  }, [addItem, selectedResto]);

  const handleCustomize = useCallback(product => setCustomModal({ open: true, product }), []);

  const handleRemove = useCallback(product => {
    const lineItem = items.find(i => i.articleId === product.id);
    if (lineItem) updateQuantity(lineItem.lineId, lineItem.quantite - 1);
  }, [updateQuantity, items]);

  const handleDeliveryMode = useCallback(key => {
    setDeliveryMode(key);
    if (key === 'LIVRAISON') setMapOpen(true);
  }, []);

  const handleCheckout = useCallback(() => {
    if (deliveryMode === 'LIVRAISON' && !deliveryAddress) {
      setMapOpen(true);
      return;
    }
    const subtotal    = total();
    const deliveryFee = deliveryMode === 'LIVRAISON' ? 500 : 0;
    const pendingOrder = {
      restaurantId:   selectedResto?.id,
      restaurantName: selectedResto?.nom,
      orderMode:      deliveryMode,
      items:          items.map(i => ({ ...i })),
      deliveryFee,
      deliveryAddress: deliveryAddress?.address ?? null,
      deliveryZone:    deliveryAddress?.zone ?? null,
      total:           subtotal + deliveryFee,
    };
    localStorage.setItem('pendingOrder', JSON.stringify(pendingOrder));
    navigate('/checkout');
  }, [navigate, deliveryMode, deliveryAddress, selectedResto, items, total]);

  /* Catégories structurées avec décompte */
  const discoCats = useMemo(() => {
    const counts = {};
    Object.values(dishesByResto).forEach(dishes => dishes.forEach(d => {
      const n = d.categorie?.nom;
      if (n) counts[n] = (counts[n] || 0) + 1;
    }));
    return [
      { id: '__all__', nom: 'Tous les plats', count: Object.values(counts).reduce((a,b)=>a+b,0) },
      ...Object.entries(counts).map(([nom, count]) => ({ id: nom, nom, count }))
    ];
  }, [dishesByResto]);

  /* Compteur des filtres Yango Deli actifs en mode découverte */
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (discoCat !== '__all__') count++;
    if (discoRestoId !== '__all__') count++;
    if (discoPriceRange !== '__all__') count++;
    if (discoMinRating > 0) count++;
    if (discoFreeDelivery) count++;
    if (discoFastDelivery) count++;
    if (discoSortBy !== 'popular') count++;
    if (discoSearch.trim()) count++;
    return count;
  }, [discoCat, discoRestoId, discoPriceRange, discoMinRating, discoFreeDelivery, discoFastDelivery, discoSortBy, discoSearch]);

  const resetDiscoFilters = () => {
    setDiscoCat('__all__');
    setDiscoRestoId('__all__');
    setDiscoPriceRange('__all__');
    setDiscoMinRating(0);
    setDiscoFreeDelivery(false);
    setDiscoFastDelivery(false);
    setDiscoSortBy('popular');
    setDiscoSearch('');
  };

  // ── Fuse.js Indices ──
  const restaurantIndex = useMemo(() => createRestaurantIndex(restaurants), [restaurants]);
  const productIndex = useMemo(() => {
    const allProds = [];
    restaurants.forEach(r => {
      const dishes = dishesByResto[r.id] || [];
      dishes.forEach(d => allProds.push({ ...d, restaurantId: r.id, restaurantName: r.nom, fakeResto: r }));
    });
    return createProductIndex(allProds);
  }, [restaurants, dishesByResto]);

  /* ── Recherche Avancée (Fuse + Geo + Filtres) ── */
  const searchResults = useMemo(() => {
    const q = discoSearch.trim();
    const expandedQ = expandQuery(q);
    
    let matchedRestos = [];
    let matchedProds = [];

    // 1. Initial Match (Fuse.js)
    if (!expandedQ) {
      matchedRestos = restaurants.map(r => ({ item: r, score: 0 }));
    } else {
      matchedRestos = restaurantIndex.search(expandedQ);
      matchedProds = productIndex.search(expandedQ);
      
      // Assurer que les restos dont les plats correspondent sont inclus
      matchedProds.forEach(prodMatch => {
        const rId = prodMatch.item.restaurantId;
        if (!matchedRestos.find(rm => rm.item.id === rId)) {
          const resto = restaurants.find(r => r.id === rId);
          if (resto) matchedRestos.push({ item: resto, score: prodMatch.score + 0.1 });
        }
      });
    }

    // 2. Filtres métier & Score hybride
    const finalRestos = [];
    matchedRestos.forEach(match => {
      const r = match.item;
      const dishes = dishesByResto[r.id] || [];
      
      // Appliquer les filtres existants
      if (discoRestoId !== '__all__' && String(r.id) !== String(discoRestoId)) return;
      if (discoCat !== '__all__' && !dishes.some(d => d.categorie?.nom === discoCat)) return;
      const rating = Number(r.noteMoyenne) || 0;
      if (discoMinRating > 0 && rating < discoMinRating) return;
      if (discoFreeDelivery && r.fraisLivraison !== 0) return;
      if (discoFastDelivery) {
        const firstNum = parseInt(r.deliveryTime || "25", 10);
        if (!isNaN(firstNum) && firstNum > 30) return;
      }
      if (discoPriceRange !== '__all__') {
        const hasMatchingPrice = dishes.some(d => {
          const p = Number(d.prixClient ?? d.prix) || 0;
          if (discoPriceRange === 'under_3000') return p < 3000;
          if (discoPriceRange === '3000_6000') return p >= 3000 && p <= 6000;
          if (discoPriceRange === 'over_6000') return p > 6000;
          return true;
        });
        if (!hasMatchingPrice) return;
      }

      // Distance
      let dist = Infinity;
      if (userLocation && r.latitude && r.longitude) {
        dist = getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, r.latitude, r.longitude);
      }

      // Calcul du score de pertinence intelligent
      let finalScore = calculateHybridScore(match.score, r, dist);

      // Tri additionnel si forcé par l'utilisateur
      if (discoSortBy === 'rating') finalScore -= rating;
      if (discoSortBy === 'time') finalScore += parseInt(r.deliveryTime || '20', 10) * 0.01;

      // Associer les meilleurs plats trouvés pour l'aperçu du restaurant
      const rDishesMatch = !expandedQ ? [] : matchedProds
        .filter(pm => pm.item.restaurantId === r.id)
        .slice(0, 3)
        .map(pm => pm.item);

      finalRestos.push({ restaurant: r, matched: rDishesMatch, _score: finalScore, _dist: dist });
    });

    // 3. Tri final des restaurants
    finalRestos.sort((a, b) => a._score - b._score);

    // 4. Filtrer les plats trouvés globalement (ne garder que ceux des restos non filtrés)
    const finalProds = !expandedQ ? [] : matchedProds
      .filter(pm => finalRestos.some(fr => fr.restaurant.id === pm.item.restaurantId))
      .sort((a, b) => a.score - b.score)
      .map(pm => pm.item);

    return { filteredRestaurants: finalRestos, discoMatchedProducts: finalProds };
  }, [
    restaurants, dishesByResto, discoSearch, discoCat, discoRestoId, 
    discoPriceRange, discoMinRating, discoFreeDelivery, discoFastDelivery, 
    discoSortBy, restaurantIndex, productIndex, userLocation
  ]);

  const filteredRestaurants = searchResults.filteredRestaurants;
  const discoMatchedProducts = searchResults.discoMatchedProducts;

  const menuCats = useMemo(() => buildDynCats(menuData, categories), [menuData, categories]);

  const filteredProducts = useMemo(() => menuData.filter(p => {
    const matchSearch = !search || p.nom.toLowerCase().includes(search.toLowerCase()) || (p.description || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCat === '__all__' || p.categorieId === activeCat || p.categorie?.id === activeCat;
    return matchSearch && matchCat;
  }), [menuData, search, activeCat]);

  const grouped = useMemo(() => {
    if (activeCat !== '__all__') return { single: filteredProducts };
    const grp = {};
    filteredProducts.forEach(p => {
      const cid = p.categorieId || p.categorie?.id || '__none__';
      if (!grp[cid]) grp[cid] = { cat: p.categorie || categories.find(c => c.id === cid) || { nom: 'Autres' }, items: [] };
      grp[cid].items.push(p);
    });
    return { grouped: Object.values(grp) };
  }, [filteredProducts, activeCat, categories]);

  const renderProducts = () => {
    if (menuLoading) return (
      <div className="prod-grid">
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{ background: C.card, borderRadius: 22, overflow: 'hidden', boxShadow: C.sh, border: `1px solid ${C.line}`, height: 340 }}>
            <SK w="100%" h={196} r={0} />
            <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SK w="70%" h={15} /><SK w="90%" h={12} /><SK w="45%" h={18} />
            </div>
          </div>
        ))}
      </div>
    );
    if (filteredProducts.length === 0) return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <UtensilsCrossed size={36} color={C.faint} style={{ marginBottom: 12 }} />
        <p style={{ fontFamily: sans, fontSize: 14, color: C.muted }}>Aucun plat trouvé</p>
      </div>
    );
    if (grouped.single) return (
      <div className="prod-grid">
        {grouped.single.map((p, i) => (
          <ProductCard key={p.id} product={p} idx={i} qty={quantities[p.id] || 0} onAdd={handleAdd} onRemove={handleRemove} onCustomize={handleCustomize} isFav={articleFavs.includes(p.id)} onToggleFav={toggleArticleFav} />
        ))}
      </div>
    );
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {grouped.grouped.map((grp, gi) => (
          <div key={gi}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontFamily: sans, fontSize: 15, fontWeight: 900, color: C.dark }}>{grp.cat?.nom || 'Autres'}</h3>
              <span style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>({grp.items.length})</span>
              <div style={{ flex: 1, height: 1, background: C.line }} />
            </div>
            <div className="prod-grid">
              {grp.items.map((p, i) => (
                <ProductCard key={p.id} product={p} idx={gi * 10 + i} qty={quantities[p.id] || 0} onAdd={handleAdd} onRemove={handleRemove} onCustomize={handleCustomize} isFav={articleFavs.includes(p.id)} onToggleFav={toggleArticleFav} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ background: C.page, minHeight: '100dvh', fontFamily: sans }}>
      <style>{CSS}</style>

      {/* ═══ Mode découverte ═══ */}
      {!selectedResto && (
        <>
          <div style={{ position: 'sticky', top: 0, zIndex: 100, background: C.nav, borderBottom: '1px solid ' + C.line, boxShadow: C.sh }}>
            <div style={{ padding: '0 clamp(12px,4vw,28px)', height: 64, display: 'flex', alignItems: 'center', gap: 16 }}>
              <Link to="/">
                <Logo />
              </Link>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, background: C.bg, border: '1.5px solid ' + C.line, borderRadius: 50, padding: '0 16px', height: 42, maxWidth: 540, position: 'relative' }}>
                <Search size={16} color={C.accent} />
                <input 
                  type="text" 
                  placeholder="Rechercher un plat, une spécialité ou un resto…" 
                  value={discoSearch} 
                  onChange={e => setDiscoSearch(e.target.value)} 
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  onKeyDown={handleSearchSubmit}
                  style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', fontFamily: sans, fontSize: 13.5, color: C.dark, background: 'transparent' }}
                />
                {discoSearch && <button onClick={() => { setDiscoSearch(''); setIsSearchFocused(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={14} color={C.muted} /></button>}
                
                {/* Dropdown Auto-complétion */}
                {isSearchFocused && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 8, background: '#fff', borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.15)', border: `1px solid ${C.line}`, padding: '12px 0', zIndex: 1000, maxHeight: '70vh', overflowY: 'auto' }}>
                    {!discoSearch.trim() ? (
                      // Suggestions intelligentes & Historique
                      <>
                        {searchHistory.length > 0 && (
                          <div style={{ padding: '0 16px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                              <History size={14} color={C.muted} />
                              <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recherches récentes</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {searchHistory.map((h, i) => (
                                <button key={i} onClick={() => { setDiscoSearch(h); saveSearchToHistory(h); setIsSearchFocused(false); }} style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 99, padding: '6px 12px', fontFamily: sans, fontSize: 13, color: C.dark, cursor: 'pointer' }}>{h}</button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{ padding: '0 16px' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                              <Flame size={14} color={C.accent} />
                              <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suggestions populaires</span>
                           </div>
                           <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {['Pizza', 'Burger', 'Poulet braisé', 'Garba', 'Chawarma', 'Alloco'].map((s, i) => (
                                <button key={i} onClick={() => { setDiscoSearch(s); saveSearchToHistory(s); setIsSearchFocused(false); }} style={{ background: '#FFF5E8', border: `1px solid #FFE4C4`, color: C.accent, borderRadius: 99, padding: '6px 12px', fontFamily: sans, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{s}</button>
                              ))}
                           </div>
                        </div>
                      </>
                    ) : (
                      // Auto-complétion des résultats
                      <div style={{ padding: '0 8px' }}>
                         {filteredRestaurants.length === 0 && discoMatchedProducts.length === 0 ? (
                           <div style={{ padding: '20px', textAlign: 'center', color: C.muted, fontFamily: sans, fontSize: 13 }}>Aucun résultat trouvé pour "{discoSearch}"</div>
                         ) : (
                           <>
                             {filteredRestaurants.slice(0, 3).map((fr, i) => (
                               <div key={fr.restaurant.id} onClick={() => { saveSearchToHistory(discoSearch); setSelectedResto(fr.restaurant); setIsSearchFocused(false); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = C.bg} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                 <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                                   <img src={fr.restaurant.logo || fallback(i, 100)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                 </div>
                                 <div style={{ flex: 1, overflow: 'hidden' }}>
                                   <div style={{ fontFamily: sans, fontSize: 14, fontWeight: 700, color: C.dark, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{fr.restaurant.nom}</div>
                                   <div style={{ fontFamily: sans, fontSize: 12, color: C.muted, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Restaurant • {fr._dist < Infinity ? (fr._dist < 1 ? '< 1 km' : fr._dist.toFixed(1) + ' km') : (fr.restaurant.adresse || 'Abidjan')}</div>
                                 </div>
                                 <ChevronRight size={16} color={C.muted} />
                               </div>
                             ))}
                             
                             {discoMatchedProducts.length > 0 && <div style={{ height: 1, background: C.line, margin: '8px 0' }} />}
                             
                             {discoMatchedProducts.slice(0, 4).map((p, i) => (
                               <div key={p.id + '_' + i} onClick={() => { saveSearchToHistory(discoSearch); setSelectedResto(p.fakeResto); setIsSearchFocused(false); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = C.bg} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                 <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#FFF5E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                   <Utensils size={18} color={C.accent} />
                                 </div>
                                 <div style={{ flex: 1, overflow: 'hidden' }}>
                                   <div style={{ fontFamily: sans, fontSize: 14, fontWeight: 700, color: C.dark, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{p.nom}</div>
                                   <div style={{ fontFamily: sans, fontSize: 12, color: C.muted, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Plat • {p.restaurantName}</div>
                                 </div>
                                 <ChevronRight size={16} color={C.muted} />
                               </div>
                             ))}
                           </>
                         )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <LanguageSwitcher variant="light" />
              <button onClick={() => setCartOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, background: cartCount > 0 ? 'linear-gradient(135deg,#EA580C,#C2410C)' : C.bg, border: '1.5px solid ' + (cartCount > 0 ? 'transparent' : C.line), color: cartCount > 0 ? '#fff' : C.muted, borderRadius: 50, padding: '8px 16px', fontFamily: sans, fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: cartCount > 0 ? '0 4px 14px #EA580C44' : 'none', transition: 'all 0.2s' }}>
                <ShoppingCart size={15} />
                {cartCount > 0 && <><span>{cartCount}</span><span style={{ opacity: 0.85 }}>·</span><span>{formatFCFA(total())}</span></>}
              </button>
              <Link
                to={!user ? '/login' : user.role === 'B2B' ? '/b2b' : '/account'}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFF5E8', border: '1.5px solid ' + C.line, borderRadius: 50, padding: '4px 14px 4px 4px', textDecoration: 'none', color: C.accent, fontFamily: sans, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.line; }}
              >
                <span
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#EA580C,#C2410C)', color: '#fff', fontSize: 14, fontWeight: 800 }}
                >
                  {(user?.prenom?.charAt(0) || user?.nom?.charAt(0) || 'P').toUpperCase()}
                </span>
                <span className="hidden sm:inline">{user ? 'Profil' : 'Connexion'}</span>
              </Link>
            </div>
          </div>

          <div style={{ padding: 'clamp(16px,3vw,24px) clamp(12px,4vw,28px) 40px', maxWidth: 1380, margin: '0 auto' }}>
            {/* Bannière défilante */}
            <div style={{ background: '#0E0600', borderRadius: 22, marginBottom: 26, overflow: 'hidden', position: 'relative', boxShadow: '0 10px 36px rgba(0,0,0,0.24)' }}>
              <div style={{ height: 3, background: 'linear-gradient(90deg, #EA580C, #FFB800, #EA580C)' }} />
              <div style={{ padding: 'clamp(14px,3vw,20px) clamp(14px,4vw,24px) 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ margin: 0, fontFamily: sans, fontSize: 'clamp(13px,3vw,15px)', fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Restaurants partenaires à Abidjan
                </p>
                {restaurants.length > 0 && (
                  <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 800, color: '#EA580C', background: 'rgba(255,140,0,0.12)', border: '1px solid rgba(255,140,0,0.25)', borderRadius: 99, padding: '3px 12px' }}>
                    {restaurants.length} Restos
                  </span>
                )}
              </div>
              <div style={{ overflow: 'hidden', paddingBottom: 'clamp(14px,3vw,20px)', maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}>
                <div style={{ display: 'flex', alignItems: 'center', width: 'max-content', animation: `bannerMarquee ${Math.max(18, bannerItems.length * 3)}s linear infinite` }}>
                  {[...bannerItems, ...bannerItems, ...bannerItems].map((nom, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <span style={{ fontFamily: sans, fontSize: 'clamp(16px,4vw,22px)', fontWeight: 900, color: '#fff', whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>{nom}</span>
                      <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#EA580C', margin: '0 clamp(16px,4vw,28px)', flexShrink: 0, opacity: 0.7 }} />
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bouton mobile filtres Yango Deli */}
            <div className="rd-menu-mobile-filter-btn" style={{ marginBottom: 18 }}>
              <button
                onClick={() => setMobileFilterOpen(true)}
                style={{
                  width: "100%", padding: "12px 18px", borderRadius: 14,
                  background: `linear-gradient(135deg, ${C.accent}, ${C.aD})`,
                  color: "#fff", border: "none", fontFamily: sans, fontSize: 14, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  boxShadow: "0 6px 20px rgba(234,88,12,0.3)"
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <SlidersHorizontal size={18} /> Filtres
                </span>
                {activeFiltersCount > 0 && (
                  <span style={{ background: "#fff", color: C.accent, borderRadius: 99, padding: "2px 10px", fontSize: 12, fontWeight: 900 }}>
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            {/* Disposition 2 Colonnes Yango Deli : Left = FilterSidebar, Right = Main Content */}
            <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>

              {/* Sidebar Desktop */}
              <div className="rd-menu-desktop-sidebar">
                <FilterSidebar
                  categories={discoCats}
                  activeCat={discoCat}
                  onCatChange={setDiscoCat}
                  restaurants={restaurants}
                  selectedRestoId={discoRestoId}
                  onRestoChange={setDiscoRestoId}
                  priceRange={discoPriceRange}
                  onPriceRangeChange={setDiscoPriceRange}
                  minRating={discoMinRating}
                  onMinRatingChange={setDiscoMinRating}
                  freeDeliveryOnly={discoFreeDelivery}
                  onFreeDeliveryChange={setDiscoFreeDelivery}
                  fastDeliveryOnly={discoFastDelivery}
                  onFastDeliveryChange={setDiscoFastDelivery}
                  sortBy={discoSortBy}
                  onSortByChange={setDiscoSortBy}
                  onReset={resetDiscoFilters}
                  activeCount={activeFiltersCount}
                />
              </div>

              {/* Drawer Mobile */}
              {mobileFilterOpen && (
                <FilterSidebar
                  categories={discoCats}
                  activeCat={discoCat}
                  onCatChange={setDiscoCat}
                  restaurants={restaurants}
                  selectedRestoId={discoRestoId}
                  onRestoChange={setDiscoRestoId}
                  priceRange={discoPriceRange}
                  onPriceRangeChange={setDiscoPriceRange}
                  minRating={discoMinRating}
                  onMinRatingChange={setDiscoMinRating}
                  freeDeliveryOnly={discoFreeDelivery}
                  onFreeDeliveryChange={setDiscoFreeDelivery}
                  fastDeliveryOnly={discoFastDelivery}
                  onFastDeliveryChange={setDiscoFastDelivery}
                  sortBy={discoSortBy}
                  onSortByChange={setDiscoSortBy}
                  onReset={resetDiscoFilters}
                  activeCount={activeFiltersCount}
                  isOpenMobile={true}
                  onCloseMobile={() => setMobileFilterOpen(false)}
                />
              )}

              {/* Colonne des résultats */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 style={{ margin: 0, fontFamily: sans, fontSize: 22, fontWeight: 900, color: C.dark, letterSpacing: '-0.03em' }}>
                      {discoSearch.trim() ? `Résultats pour « ${discoSearch.trim()} »` : discoCat === '__all__' ? 'Tous les restaurants' : `Restaurants — ${discoCat}`}
                    </h2>
                    <p style={{ margin: '4px 0 0', fontFamily: sans, fontSize: 13, color: C.muted, fontWeight: 500 }}>
                      {filteredRestaurants.length} restaurant{filteredRestaurants.length !== 1 ? 's' : ''} disponible{filteredRestaurants.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {activeFiltersCount > 0 && (
                    <button
                      onClick={resetDiscoFilters}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px', borderRadius: 99, background: C.aL, border: `1px solid ${C.line}`,
                        color: C.aD, fontFamily: sans, fontSize: 12, fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      <RotateCcw size={13} /> Effacer les filtres ({activeFiltersCount})
                    </button>
                  )}
                </div>

                {loading && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 20 }}>
                    {[...Array(6)].map((_, i) => (
                      <div key={i} style={{ background: C.card, borderRadius: 22, overflow: 'hidden', boxShadow: C.sh, border: `1px solid ${C.line}` }}>
                        <SK w="100%" h={180} r={0} />
                        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 8 }}><SK w="70%" h={16} /><SK w="50%" h={12} /><SK w="100%" h={36} r={12} /></div>
                      </div>
                    ))}
                  </div>
                )}

                {error && !loading && <div style={{ textAlign: 'center', padding: '60px 20px' }}><AlertCircle size={36} color={C.faint} style={{ marginBottom: 12 }} /><p style={{ fontFamily: sans, fontSize: 14, color: C.muted, margin: 0 }}>{error}</p></div>}

                {!loading && !error && (filteredRestaurants.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', background: C.card, borderRadius: 24, border: `1px solid ${C.line}` }}>
                    <Store size={40} color={C.faint} style={{ marginBottom: 12 }} />
                    <p style={{ fontFamily: sans, fontSize: 16, fontWeight: 800, color: C.dark, margin: '0 0 6px' }}>Aucun restaurant trouvé</p>
                    <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: '0 0 18px' }}>Essayez de modifier votre recherche ou vos filtres</p>
                    <button
                      onClick={resetDiscoFilters}
                      style={{
                        padding: '10px 24px', borderRadius: 50, background: C.accent, color: '#fff',
                        fontFamily: sans, fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer',
                        boxShadow: `0 4px 14px ${C.accent}44`
                      }}
                    >
                      Réinitialiser les filtres
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 20 }}>
                    {filteredRestaurants.map(({ restaurant, matched, _dist }, i) => (
                      <RestaurantCard key={restaurant.id} restaurant={restaurant} idx={i} matched={matched} distance={_dist}
                        onSelect={(r) => { if (matched && matched.length) pendingPlatRef.current = discoSearch.trim(); setSelectedResto(r); }}
                        favorites={restoFavs} onFav={toggleRestoFav} />
                    ))}
                  </div>
                ))}
                
                {/* Plats trouvés dans la recherche globale */}
                {!loading && !error && discoMatchedProducts.length > 0 && (
                  <div style={{ marginTop: 40 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <span style={{ fontSize: 22 }}>🍽️</span>
                      <h2 style={{ margin: 0, fontFamily: sans, fontSize: 20, fontWeight: 900, color: C.dark }}>
                        Plats correspondants
                      </h2>
                      <span style={{ fontFamily: sans, fontSize: 13, color: C.muted, fontWeight: 600 }}>({discoMatchedProducts.length})</span>
                      <div style={{ flex: 1, height: 1, background: C.line }} />
                    </div>
                    <div className="prod-grid">
                      {discoMatchedProducts.map((p, i) => (
                        <ProductCard 
                          key={p.id + '_' + i} 
                          product={p} 
                          idx={i} 
                          qty={quantities[p.id] || 0} 
                          onAdd={() => {
                            if (!selectedResto) {
                              setSelectedResto(p.fakeResto);
                            } else {
                              handleAdd(p);
                            }
                          }} 
                          onRemove={handleRemove} 
                          onCustomize={handleCustomize} 
                          isFav={articleFavs.includes(p.id)} 
                          onToggleFav={toggleArticleFav} 
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {cartCount > 0 && (
            <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 200, animation: 'barIn 0.35s cubic-bezier(.4,0,.2,1) both' }}>
              <button onClick={() => setCartOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg,#EA580C,#C2410C)', color: '#fff', border: 'none', borderRadius: 99, padding: '14px 24px', cursor: 'pointer', fontFamily: sans, fontSize: 14, fontWeight: 800, boxShadow: '0 8px 32px #EA580C66', whiteSpace: 'nowrap' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ShoppingCart size={13} color="#EF4444" /></div>
                Voir le panier ({cartCount}) · {formatFCFA(total())}
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}

      {/* ═══ Overlay restaurant ═══ */}
      {selectedResto && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 150, background: C.page, fontFamily: sans, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'overlayIn 0.25s ease both' }}>

          {/* Unified Dynamic Top Bar for Restaurant Menu */}
          <div style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid ' + C.line, boxShadow: '0 8px 30px rgba(15,23,42,0.06)', flexShrink: 0, position: 'relative', zIndex: 10 }}>
            <div className="menu-resto-topbar" style={{ padding: '0 24px', height: 86, display: 'flex', alignItems: 'center', gap: 20 }}>

              {/* Back Button */}
              <button onClick={() => { setSelectedResto(null); setMenuData([]); }} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: '#fff', border: '1.5px solid ' + C.line, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
                     onMouseEnter={e => e.currentTarget.style.transform = 'translateX(-3px)'}
                     onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}>
                  <ArrowLeft size={20} color={C.dark} />
                </div>
              </button>

              {/* Restaurant Info (Logo + Name + Meta) */}
              <div className="menu-resto-info" style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0, borderRight: '1px solid ' + C.line, paddingRight: 20, marginRight: 10 }}>
                <div style={{ width: 54, height: 54, borderRadius: 16, overflow: 'hidden', flexShrink: 0, background: C.bg, boxShadow: '0 4px 14px rgba(0,0,0,0.08)' }}>
                  <img src={selectedResto.logo || selectedResto.photoUrl || fallback(0, 120)} alt={selectedResto.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.src = fallback(0, 120); }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <h2 style={{ margin: '0 0 3px', fontFamily: sans, fontSize: 19, fontWeight: 900, color: C.dark, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedResto.nom}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: sans, fontSize: 12, fontWeight: 800, color: C.dark }}>
                      <Star size={12} fill={C.yellow} color={C.yellow} /> {Number(selectedResto.noteMoyenne) > 0 ? Number(selectedResto.noteMoyenne).toFixed(1) : 'Nouveau'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: sans, fontSize: 12, color: C.muted }}>
                      <Clock size={12} color={C.muted} /> {selectedResto.deliveryTime || '30 min'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: sans, fontSize: 12, fontWeight: 700, color: C.green }}>
                      <Truck size={12} color={C.green} /> {selectedResto.fraisLivraison === 0 ? 'Offerte' : (selectedResto.fraisLivraison ? formatFCFA(selectedResto.fraisLivraison) : 'Livraison')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="menu-resto-search" style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1.5px solid rgba(234,88,12,0.15)', borderRadius: 50, padding: '0 18px', height: 46, width: '100%', maxWidth: 340, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                <Search size={16} color={C.accent} />
                <input type="text" placeholder={'Rechercher un plat…'} value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', fontFamily: sans, fontSize: 13.5, color: C.dark, background: 'transparent', fontWeight: 600 }} />
                {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={14} color={C.muted} /></button>}
              </div>

              {/* Cart Button */}
              <button className="menu-resto-cart-btn" onClick={() => setCartOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: cartCount > 0 ? 'linear-gradient(135deg,#EA580C,#C2410C)' : '#fff', border: '1.5px solid ' + (cartCount > 0 ? 'transparent' : C.line), color: cartCount > 0 ? '#fff' : C.dark, borderRadius: 50, padding: '0 24px', height: 46, fontFamily: sans, fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: cartCount > 0 ? '0 8px 24px rgba(234,88,12,0.3)' : '0 4px 12px rgba(0,0,0,0.04)', transition: 'all 0.2s', transform: 'translateY(0)' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <ShoppingCart size={17} color={cartCount > 0 ? '#fff' : C.accent} />
                {cartCount > 0 ? <><span>{cartCount} art.</span><span style={{ opacity: 0.6 }}>|</span><span>{formatFCFA(total())}</span></> : <span>Panier</span>}
              </button>

            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
              <div style={{ background: C.card, borderBottom: '1px solid ' + C.line }}>
                <div>
                  <p style={{ margin: '12px 20px 0', fontFamily: sans, fontSize: 11, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Choisir la catégorie</p>
                  {menuLoading ? (
                    <div style={{ display: 'flex', gap: 16, padding: '10px 20px 14px' }}>{[...Array(5)].map((_, i) => <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}><SK w={60} h={60} r={99} /><SK w={50} h={10} r={4} /></div>)}</div>
                  ) : (
                    <CategoryTabs cats={menuCats} active={activeCat} onChange={setActiveCat} />
                  )}
                </div>
              </div>

              <div style={{ padding: '20px 24px 0' }}>
                {promos.length > 0 && <PromoStrip promos={promos} />}
                {!menuLoading && filteredProducts.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h2 style={{ margin: 0, fontFamily: sans, fontSize: 17, fontWeight: 900, color: C.dark }}>{activeCat === '__all__' ? 'Choisissez votre plat' : (menuCats.find(c => c.id === activeCat)?.nom || 'Plats')}</h2>
                    <span style={{ fontFamily: sans, fontSize: 12, color: C.muted, fontWeight: 600 }}>{filteredProducts.length} article{filteredProducts.length > 1 ? 's' : ''}</span>
                  </div>
                )}
                {renderProducts()}
                <div style={{ height: cartCount > 0 ? 90 : 24 }} />
              </div>
            </div>

            <CartPanel
              items={items}
              total={total}
              onUpdate={updateQuantity}
              onClear={clearCart}
              deliveryMode={deliveryMode}
              onDeliveryMode={handleDeliveryMode}
              onCheckout={handleCheckout}
              deliveryAddress={deliveryAddress}
              onOpenMap={() => setMapOpen(true)}
            />
          </div>

          {cartCount > 0 && (
            <div className="cart-mobile-bar" style={{ padding: '12px 16px 20px', background: C.card, borderTop: '1px solid ' + C.line, boxShadow: '0 -4px 20px rgba(0,0,0,0.08)', flexShrink: 0 }}>
              <button onClick={() => setCartOpen(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg,#EF4444,#DC2626)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 20px', cursor: 'pointer', fontFamily: sans, fontSize: 14, fontWeight: 800, boxShadow: '0 4px 16px rgba(246, 39, 39, 0.4)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ShoppingCart size={16} /> {cartCount} article{cartCount > 1 ? 's' : ''}</span>
                <span>Voir le panier · {formatFCFA(total())}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {mapOpen && (
        <DeliveryMapModal
          initial={deliveryAddress}
          onClose={() => setMapOpen(false)}
          onConfirm={loc => {
            setDeliveryAddress(loc);
            setDeliveryMode('LIVRAISON');
          }}
        />
      )}

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} initialMode={deliveryMode} />
      {customModal.open && (
        <ProductCustomizationModal
          product={customModal.product}
          restaurant={selectedResto}
          onClose={() => setCustomModal({ open: false, product: null })}
          onAdd={(product, qty, details, selectedVariant) => {
            const basePrice = Number(product.prixClient ?? (product.promoActif && product.prixPromo ? product.prixPromo : product.prix));
            const variantSupplement = selectedVariant ? Number(selectedVariant.prixSupplement || 0) : 0;
            addItem({
              articleId: product.id,
              nom: product.nom,
              prix: basePrice + variantSupplement,
              photoUrl: product.photoUrl || product.imageUrl,
              categorie: product.categorie,
              instructions: details || '',
              variantLabel: selectedVariant?.label,
              variantSupplement: variantSupplement || undefined,
              restaurantId: selectedResto.id,
              restaurantName: selectedResto.nom,
            }, qty);
            setCustomModal({ open: false, product: null });
          }}
        />
      )}
    </div>
  );
}
