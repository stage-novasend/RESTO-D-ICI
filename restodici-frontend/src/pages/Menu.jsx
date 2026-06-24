/* ═══════════════════════════════════════════════════════════════
   Menu.jsx — Catalogue restaurants + menu par restaurant
   Layout: découverte (grille restos) / menu (overlay fixe 2 col)
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, UtensilsCrossed, Star, Clock, Heart, ArrowLeft,
  ShoppingCart, Plus, Minus, Store, AlertCircle, MapPin, ChevronRight,
  Truck, Package, Navigation, SlidersHorizontal,
} from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { menuAPI, promosAPI } from '../services/api';
import ProductCustomizationModal from '../components/menu/ProductCustomizationModal';
import CartDrawer from '../components/cart/CartDrawer';
import DeliveryMap from '../components/maps/DeliveryMap';
import { formatFCFA } from '../utils/formatters';
import { getArticleImage } from '../utils/articleImage';

/* ── Design tokens ── */
const C = {
  bg:     '#FFFAF3',
  card:   '#FFFFFF',
  accent: '#973100',
  aD:     '#E07A00',
  aL:     '#FFF5E8',
  yellow: '#FFB800',
  red:    '#FF3B30',
  green:  '#22C55E',
  dark:   '#1C1C1E',
  text:   '#3D3D3D',
  muted:  '#8A8A8A',
  faint:  '#D1D1D6',
  line:   '#EBEBEB',
  nav:    '#FFFFFF',
  sh:     '0 1px 8px rgba(0,0,0,0.07)',
  shM:    '0 4px 24px rgba(0,0,0,0.10)',
  shL:    '0 12px 40px rgba(0,0,0,0.14)',
};
const sans = "'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif";

const DELIVERY_MODES = [
  { key: 'SUR_PLACE', label: 'Sur place',  Icon: UtensilsCrossed },
  { key: 'EMPORTER',  label: 'À emporter', Icon: Package },
  { key: 'LIVRAISON', label: 'Livraison',  Icon: Truck },
];

const FOOD_IMGS = [
  'photo-1665332195309-9d75071138f0','photo-1665400808116-f0e6339b7e9a',
  'photo-1664993101841-036f189719b6','photo-1664992960082-0ea299a9c53e',
  'photo-1665333048952-a3ee97714c6b','photo-1665332305771-e49a5dd5ba80',
  'photo-1665334217407-6688e6941a47','photo-1665332561290-cc6757172890',
  'photo-1665401015549-712c0dc5ef85','photo-1603496987674-79600a000f55',
  'photo-1773620494293-e9e075dd48fd','photo-1634324092526-91f5e878b72f',
  'photo-1569058242252-623df46b5025','photo-1665833613236-7c1d087463b1',
];
const fallback = (i, w = 600) =>
  `https://images.unsplash.com/${FOOD_IMGS[i % FOOD_IMGS.length]}?q=80&w=${w}&auto=format&fit=crop`;

const CSS = `
@keyframes sk      { 0%{background-position:200% 0}100%{background-position:-200% 0} }
@keyframes fadeUp  { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
@keyframes barIn   { from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)} }
@keyframes overlayIn { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
@keyframes modalIn { from{opacity:0;transform:translateY(20px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes spin { to{transform:rotate(360deg)} }
.cat-scroll::-webkit-scrollbar{display:none}
.prod-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px; }
.cart-panel{ display:flex; flex-direction:column; }
.cart-mobile-bar{ display:none; }
@media(max-width:900px){
  .cart-panel{ display:none !important; }
  .prod-grid{ grid-template-columns:repeat(auto-fit,minmax(155px,1fr)); gap:10px; }
  .cart-mobile-bar{ display:block; }
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

const CAT_EMOJI = {
  pizza: '🍕', burger: '🍔', sushi: '🍣', tacos: '🌮', poulet: '🍗',
  poisson: '🐟', riz: '🍚', salade: '🥗', dessert: '🍰', boisson: '🥤',
  brochette: '🥩', foutou: '🫙', soupe: '🍜',
  grillades: '🔥', sandwich: '🥪', plat: '🍽️',
  donut: '🍩', icecream: '🍦', café: '☕', viande: '🥩',
};
function catEmoji(name = '') {
  const k = name.toLowerCase();
  for (const [w, e] of Object.entries(CAT_EMOJI)) if (k.includes(w)) return e;
  return '🍽️';
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: 'linear-gradient(135deg, #973100, #FFB800)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px #97310044',
      }}>
        <UtensilsCrossed size={18} color="#fff" strokeWidth={2.5} />
      </div>
      <span style={{ fontFamily: sans, fontSize: 17, fontWeight: 900, letterSpacing: '-0.04em' }}>
        <span style={{ color: '#973100' }}>Resto</span>
        <span style={{ color: '#1C1C1E' }}>&nbsp;d'ici</span>
      </span>
    </div>
  );
}

/* ── Modal carte livraison — centrée, avec recherche d'adresse ── */
function DeliveryMapModal({ onClose, onConfirm, initial }) {
  const [loc,       setLoc]       = useState(initial || null);
  const [mapLoc,    setMapLoc]    = useState(initial || null); // valeur passée à DeliveryMap
  const [query,     setQuery]     = useState(initial?.address || '');
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  /* Recherche Nominatim avec debounce */
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

  /* Sélection d'un résultat → centre la carte sur ce point */
  const pickResult = (r) => {
    const newLoc = { lat: parseFloat(r.lat), lng: parseFloat(r.lon), address: r.display_name };
    setLoc(newLoc);
    setMapLoc(newLoc);
    setQuery(r.display_name);
    setResults([]);
  };

  /* Quand l'utilisateur clique/déplace sur la carte */
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

        {/* ── En-tête ── */}
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

        {/* ── Barre de recherche ── */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid ' + C.line, flexShrink: 0, position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.bg, border: '1.5px solid ' + C.line, borderRadius: 12, padding: '0 14px', height: 44, transition: 'border-color 0.15s' }}
            onFocus={() => {}} // pour l'état focus géré par l'input enfant
          >
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

          {/* Dropdown résultats */}
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

        {/* ── Adresse sélectionnée ── */}
        {loc?.address && (
          <div style={{ padding: '9px 20px', background: C.aL, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <MapPin size={13} color={C.accent} style={{ flexShrink: 0 }} />
            <p style={{ margin: 0, fontFamily: sans, fontSize: 12, color: C.aD, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {loc.address}
            </p>
          </div>
        )}

        {/* ── Carte — grande, pleine largeur ── */}
        <div style={{ height: 400, flexShrink: 0 }}>
          <DeliveryMap
            value={mapLoc}
            onChange={handleMapChange}
            heightClassName="h-full"
            className=""
          />
        </div>

        {/* ── Bouton confirmer ── */}
        <div style={{ padding: '14px 20px 18px', borderTop: '1px solid ' + C.line, flexShrink: 0 }}>
          <button
            onClick={() => { if (loc) { onConfirm(loc); onClose(); } }}
            disabled={!loc}
            style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none',
              background: loc ? 'linear-gradient(135deg,#973100,#C04000)' : C.line,
              color: loc ? '#fff' : C.muted,
              fontFamily: sans, fontSize: 14, fontWeight: 800,
              cursor: loc ? 'pointer' : 'not-allowed',
              boxShadow: loc ? '0 6px 20px #97310055' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (loc) e.currentTarget.style.transform = 'scale(1.01)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <Navigation size={16} />
            {loc ? 'Confirmer — ' + loc.address?.split(',')[0] : 'Sélectionnez un emplacement sur la carte'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Carte restaurant ── */
function RestaurantCard({ restaurant, idx, onSelect, favorites, onFav }) {
  const [hov, setHov] = useState(false);
  const img = restaurant.logo || restaurant.coverImage || restaurant.photoUrl || fallback(idx, 480);
  const rating = (Number(restaurant.noteMoyenne) > 0 ? Number(restaurant.noteMoyenne) : 0).toFixed(1);
  const time   = restaurant.deliveryTime || (20 + (idx % 4) * 5) + '–' + (30 + (idx % 4) * 5) + ' min';
  const isFav  = favorites?.includes(restaurant.id);
  const isOpen = restaurant.isOpen !== false;
  const BADGE_LABELS = ['⭐ Populaire', '🔥 Tendance', '✨ Nouveau', '🎯 Top'];
  const badge = idx < 4 ? BADGE_LABELS[idx] : null;

  return (
    <div
      onClick={() => isOpen && onSelect(restaurant)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: C.card, borderRadius: 20,
        boxShadow: hov ? C.shL : C.sh,
        overflow: 'hidden', cursor: isOpen ? 'pointer' : 'default',
        transform: hov ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
        opacity: isOpen ? 1 : 0.68,
        animation: 'fadeUp 0.35s ease both',
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
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: sans, fontSize: 12, fontWeight: 700, color: '#fff' }}><Star size={12} fill={C.yellow} color={C.yellow} /> {rating}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: sans, fontSize: 11, color: 'rgba(255,255,255,0.9)' }}><Clock size={11} color="rgba(255,255,255,0.8)" /> {time}</span>
        </div>
      </div>
      <div style={{ padding: '14px 14px 16px' }}>
        <p style={{ margin: '0 0 3px', fontFamily: sans, fontSize: 15, fontWeight: 800, color: C.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{restaurant.nom}</p>
        <p style={{ margin: '0 0 10px', fontFamily: sans, fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{restaurant.adresse || restaurant.ville || restaurant.description || 'Restaurant partenaire'}</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {(restaurant.cuisines || restaurant.tags || []).slice(0, 3).map((t, i) => <span key={i} style={{ fontFamily: sans, fontSize: 10, fontWeight: 700, background: C.aL, color: C.aD, borderRadius: 99, padding: '3px 8px' }}>{t}</span>)}
          {restaurant.fraisLivraison != null && <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 700, background: '#F0FFF4', color: C.green, borderRadius: 99, padding: '3px 8px' }}>{restaurant.fraisLivraison === 0 ? '🚴 Livraison offerte' : '🚴 ' + formatFCFA(restaurant.fraisLivraison)}</span>}
        </div>
        <button onClick={e => { if (!isOpen) return; e.stopPropagation(); onSelect(restaurant); }} disabled={!isOpen} style={{ width: '100%', padding: '10px', borderRadius: 12, border: 'none', background: isOpen ? 'linear-gradient(135deg,#973100,#C04000)' : C.line, color: isOpen ? '#fff' : C.muted, fontFamily: sans, fontSize: 13, fontWeight: 800, cursor: isOpen ? 'pointer' : 'not-allowed', boxShadow: isOpen ? '0 4px 14px #97310044' : 'none', transition: 'all 0.15s' }}>
          {isOpen ? 'Voir le menu →' : 'Restaurant fermé'}
        </button>
      </div>
    </div>
  );
}

/* ── Carte produit — grille verticale ── */
function ProductCard({ product, qty, onAdd, onRemove, onCustomize, idx, isFav, onToggleFav }) {
  const img = getArticleImage(product) || fallback(idx, 300);
  const isAvail = product.disponible !== false;
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: C.card, borderRadius: 18, overflow: 'hidden',
        boxShadow: hov && isAvail ? C.shM : C.sh,
        transform: hov && isAvail ? 'translateY(-3px)' : 'none',
        transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
        opacity: isAvail ? 1 : 0.6,
        display: 'flex', flexDirection: 'column',
        animation: 'fadeUp 0.3s ease both',
      }}
    >
      <div style={{ position: 'relative', height: 170, flexShrink: 0, overflow: 'hidden' }}>
        <img src={img} alt={product.nom} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: hov ? 'scale(1.06)' : 'scale(1)', transition: 'transform 0.4s ease' }} onError={e => { e.target.src = fallback(idx, 300); }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.52) 0%, transparent 55%)' }} />
        <span style={{ position: 'absolute', bottom: 8, left: 10, fontFamily: sans, fontSize: 15, fontWeight: 900, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
          {formatFCFA(product.prixClient ?? product.prix)}
        </span>
        {!isAvail && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 800, color: '#fff', background: 'rgba(0,0,0,0.72)', padding: '4px 10px', borderRadius: 99 }}>Rupture</span>
          </div>
        )}
        {/* Bouton favori fonctionnel */}
        <button
          onClick={e => { e.stopPropagation(); onToggleFav?.(product.id); }}
          style={{
            position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: '50%',
            border: 'none', cursor: 'pointer',
            background: isFav ? C.red : 'rgba(255,255,255,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
            transition: 'background 0.2s, transform 0.15s',
            transform: isFav ? 'scale(1.15)' : 'scale(1)',
          }}
        >
          <Heart size={13} color={isFav ? '#fff' : C.red} fill={isFav ? '#fff' : 'none'} strokeWidth={2} />
        </button>
      </div>

      <div style={{ flex: 1, padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <p style={{ margin: 0, fontFamily: sans, fontSize: 13, fontWeight: 800, color: C.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.nom}</p>
        {product.description && (
          <p style={{ margin: 0, fontFamily: sans, fontSize: 11, color: C.muted, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.description}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: isAvail ? C.green : C.faint, flexShrink: 0 }} />
          <span style={{ fontFamily: sans, fontSize: 10, color: C.muted, fontWeight: 600 }}>{isAvail ? 'Disponible · 15 min' : 'Indisponible'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8, gap: 6 }}>
          {/* Bouton Personnaliser */}
          {onCustomize && isAvail ? (
            <button
              onClick={e => { e.stopPropagation(); onCustomize(product); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontFamily: sans, fontSize: 11, fontWeight: 700, color: C.accent,
                background: C.aL, border: `1px solid ${C.accent}30`,
                borderRadius: 99, padding: '5px 10px',
                cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${C.accent}22`; e.currentTarget.style.borderColor = `${C.accent}60`; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.aL; e.currentTarget.style.borderColor = `${C.accent}30`; }}
            >
              <SlidersHorizontal size={11} />
              Personnaliser
            </button>
          ) : <span />}
          {/* Bouton ajouter */}
          {qty > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', background: C.accent, borderRadius: 99, overflow: 'hidden', boxShadow: '0 3px 12px #97310055' }}>
              <button onClick={e => { e.stopPropagation(); onRemove(product); }} style={{ width: 28, height: 28, border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={11} /></button>
              <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 800, color: '#fff', minWidth: 18, textAlign: 'center' }}>{qty}</span>
              <button onClick={e => { e.stopPropagation(); onAdd(product); }} style={{ width: 28, height: 28, border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={11} /></button>
            </div>
          ) : (
            <button onClick={e => { e.stopPropagation(); if (isAvail) onAdd(product); }} disabled={!isAvail} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: isAvail ? 'linear-gradient(135deg,#973100,#C04000)' : C.line, color: isAvail ? '#fff' : C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isAvail ? 'pointer' : 'not-allowed', boxShadow: isAvail ? '0 3px 12px #97310055' : 'none', flexShrink: 0, transition: 'all 0.15s' }}>
              <Plus size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Catégories circulaires ── */
function CategoryTabs({ cats, active, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const btn = ref.current.querySelector('[data-cat="' + active + '"]');
    if (btn) btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [active]);

  return (
    <div ref={ref} className="cat-scroll" style={{ display: 'flex', gap: 16, overflowX: 'auto', padding: '10px 20px 14px', scrollbarWidth: 'none' }}>
      {cats.map(cat => {
        const isActive = cat.id === active;
        return (
          <button key={cat.id} data-cat={cat.id} onClick={() => onChange(cat.id)} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: isActive ? 'linear-gradient(135deg,#973100,#C04000)' : C.card, border: isActive ? 'none' : '2px solid ' + C.line, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isActive ? '0 6px 18px #97310044' : C.sh, transition: 'all 0.2s cubic-bezier(.4,0,.2,1)', fontSize: 24 }}>
              {catEmoji(cat.nom)}
            </div>
            <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 700, color: isActive ? C.accent : C.muted, whiteSpace: 'nowrap', transition: 'color 0.15s' }}>{cat.nom}</span>
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

/* ── Panneau panier — 3 modes de livraison ── */
function CartPanel({ items, total, onUpdate, deliveryMode, onDeliveryMode, onCheckout, deliveryAddress, onOpenMap }) {
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
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontFamily: sans, fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Articles</p>
            <p style={{ margin: '3px 0 0', fontFamily: sans, fontSize: 15, fontWeight: 900, color: C.accent }}>{items.reduce((s, i) => s + (i.quantite || 0), 0)}</p>
          </div>
        </div>

        <p style={{ margin: '0 0 8px', fontFamily: sans, fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mode de livraison</p>
        <div style={{ display: 'flex', background: C.bg, borderRadius: 12, padding: 3, gap: 2 }}>
          {DELIVERY_MODES.map(({ key, label, Icon }) => {
            const isActive = deliveryMode === key;
            return (
              <button key={key} onClick={() => onDeliveryMode(key)} title={label} style={{ flex: 1, padding: '8px 4px', borderRadius: 9, border: 'none', background: isActive ? C.accent : 'transparent', color: isActive ? '#fff' : C.muted, fontFamily: sans, fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', boxShadow: isActive ? '0 2px 8px #97310044' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <Icon size={14} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Adresse livraison */}
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
          <button onClick={onCheckout} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#973100,#C04000)', color: '#fff', fontFamily: sans, fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 20px #97310055', transition: 'all 0.15s' }}
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

/* ═══════════════════════════════════════════════════════════════
   MenuPage — Composant principal
   ═══════════════════════════════════════════════════════════════ */
export default function MenuPage() {
  const navigate = useNavigate();

  const [restaurants,     setRestaurants]     = useState([]);
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
  const [quantities,      setQuantities]      = useState({});
  const [cartOpen,        setCartOpen]        = useState(false);
  const [customModal,     setCustomModal]     = useState({ open: false, product: null });
  const [error,           setError]           = useState(null);
  const [mapOpen,         setMapOpen]         = useState(false);

  /* Favoris — restaurants */
  const [restoFavs, setRestoFavs] = useState(
    () => { try { return JSON.parse(localStorage.getItem('restoFavs') || '[]'); } catch { return []; } }
  );
  /* Favoris — articles */
  const [articleFavs, setArticleFavs] = useState(
    () => { try { return JSON.parse(localStorage.getItem('articleFavs') || '[]'); } catch { return []; } }
  );

  /* Mode de livraison */
  const [deliveryMode, setDeliveryMode] = useState(
    () => localStorage.getItem('deliveryMode') || 'EMPORTER'
  );
  /* Adresse de livraison */
  const [deliveryAddress, setDeliveryAddress] = useState(
    () => { try { return JSON.parse(localStorage.getItem('deliveryAddress') || 'null'); } catch { return null; } }
  );

  const { user } = useAuth();
  const { addItem, updateQuantity, items, total } = useCart();
  const cartCount = items.reduce((s, i) => s + (i.quantite || 0), 0);

  /* Persister favoris restaurants */
  useEffect(() => { localStorage.setItem('restoFavs', JSON.stringify(restoFavs)); }, [restoFavs]);
  /* Persister favoris articles */
  useEffect(() => { localStorage.setItem('articleFavs', JSON.stringify(articleFavs)); }, [articleFavs]);
  /* Persister mode livraison */
  useEffect(() => { localStorage.setItem('deliveryMode', deliveryMode); }, [deliveryMode]);
  /* Persister adresse livraison */
  useEffect(() => { localStorage.setItem('deliveryAddress', JSON.stringify(deliveryAddress)); }, [deliveryAddress]);

  /* Verrouiller scroll body quand overlay ou modal ouverts */
  useEffect(() => {
    document.body.style.overflow = (selectedResto || mapOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selectedResto, mapOpen]);

  useEffect(() => {
    setLoading(true);
    menuAPI.getRestaurants()
      .then(r => setRestaurants(r.data || []))
      .catch(() => setError('Impossible de charger les restaurants.'))
      .finally(() => setLoading(false));
  }, []);

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
      })
      .catch(() => setError('Impossible de charger le menu.'))
      .finally(() => setMenuLoading(false));
  }, [selectedResto]);

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
    localStorage.setItem('deliveryMode', deliveryMode);
    navigate('/checkout');
  }, [navigate, deliveryMode, deliveryAddress]);

  const discoCats = useMemo(() => {
    const names = new Set();
    restaurants.forEach(r => (r.cuisines || r.tags || []).forEach(t => names.add(t)));
    return [{ id: '__all__', nom: 'Tous' }, ...[...names].map((n, i) => ({ id: String(i), nom: n }))];
  }, [restaurants]);

  const filteredRestaurants = useMemo(() => {
    const catName = discoCat !== '__all__' ? (discoCats.find(c => c.id === discoCat)?.nom || '') : '';
    return restaurants.filter(r => {
      const matchSearch = !discoSearch || r.nom.toLowerCase().includes(discoSearch.toLowerCase()) || (r.adresse || '').toLowerCase().includes(discoSearch.toLowerCase());
      const matchCat = discoCat === '__all__' || (r.cuisines || r.tags || []).includes(catName);
      return matchSearch && matchCat;
    });
  }, [restaurants, discoSearch, discoCat, discoCats]);

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

  /* Rendu produits */
  const renderProducts = () => {
    if (menuLoading) return (
      <div className="prod-grid">
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{ background: C.card, borderRadius: 18, overflow: 'hidden', boxShadow: C.sh }}>
            <SK w="100%" h={170} r={0} />
            <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <SK w="70%" h={13} /><SK w="90%" h={11} /><SK w="40%" h={11} />
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
              <span style={{ fontSize: 20 }}>{catEmoji(grp.cat?.nom)}</span>
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

  /* ── RENDU ── */
  return (
    <div style={{ background: C.bg, minHeight: '100dvh', fontFamily: sans }}>
      <style>{CSS}</style>

      {/* ═══ Mode découverte ═══ */}
      {!selectedResto && (
        <>
          <div style={{ position: 'sticky', top: 0, zIndex: 10, background: C.nav, borderBottom: '1px solid ' + C.line, boxShadow: C.sh }}>
            <div style={{ padding: '0 clamp(12px,4vw,28px)', height: 60, display: 'flex', alignItems: 'center', gap: 16 }}>
              <Logo />
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: C.bg, border: '1.5px solid ' + C.line, borderRadius: 12, padding: '0 12px', height: 38, maxWidth: 520 }}>
                <Search size={14} color={C.muted} />
                <input type="text" placeholder="Rechercher un restaurant…" value={discoSearch} onChange={e => setDiscoSearch(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', fontFamily: sans, fontSize: 13, color: C.dark, background: 'transparent' }} />
                {discoSearch && <button onClick={() => setDiscoSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={13} color={C.muted} /></button>}
              </div>
              <button onClick={() => setCartOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, background: cartCount > 0 ? 'linear-gradient(135deg,#973100,#C04000)' : C.bg, border: '1.5px solid ' + (cartCount > 0 ? 'transparent' : C.line), color: cartCount > 0 ? '#fff' : C.muted, borderRadius: 12, padding: '7px 14px', fontFamily: sans, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: cartCount > 0 ? '0 3px 12px #97310044' : 'none', transition: 'all 0.2s' }}>
                <ShoppingCart size={15} />
                {cartCount > 0 && <><span>{cartCount}</span><span style={{ opacity: 0.85 }}>·</span><span>{formatFCFA(total())}</span></>}
              </button>
            </div>
          </div>

          <div style={{ padding: 'clamp(16px,3vw,24px) clamp(12px,4vw,28px) 40px' }}>
            {/* Hero */}
            <div style={{ background: 'linear-gradient(135deg, #973100 0%, #E07A00 100%)', borderRadius: 20, padding: 'clamp(16px,4vw,28px)', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 32px #97310044', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', right: -20, top: -20, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ position: 'relative' }}>
                <p style={{ margin: '0 0 6px', fontFamily: sans, fontSize: 'clamp(16px,4vw,22px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>Commandez chez <br />vos restaurants préférés</p>
                <p style={{ margin: 0, fontFamily: sans, fontSize: 13, color: 'rgba(255,255,255,0.82)' }}>{restaurants.length > 0 ? restaurants.length + ' restaurants partenaires' : 'Restaurants à proximité'}</p>
              </div>
              <div style={{ fontSize: 'clamp(36px,8vw,60px)', position: 'relative', flexShrink: 0 }}>🍽️</div>
            </div>

            {discoCats.length > 1 && (
              <div style={{ marginBottom: 20 }}>
                <div className="cat-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                  {discoCats.map(cat => {
                    const isA = cat.id === discoCat;
                    return <button key={cat.id} onClick={() => setDiscoCat(cat.id)} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 99, border: 'none', background: isA ? C.accent : C.card, color: isA ? '#fff' : C.text, fontFamily: sans, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: C.sh, transition: 'all 0.15s' }}>{cat.id !== '__all__' && catEmoji(cat.nom)} {cat.nom}</button>;
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontFamily: sans, fontSize: 18, fontWeight: 900, color: C.dark, letterSpacing: '-0.03em' }}>{discoCat === '__all__' ? 'Tous les restaurants' : discoCats.find(c => c.id === discoCat)?.nom || 'Restaurants'}</h2>
              <span style={{ fontFamily: sans, fontSize: 13, color: C.muted, fontWeight: 600 }}>{filteredRestaurants.length} résultat{filteredRestaurants.length !== 1 ? 's' : ''}</span>
            </div>

            {loading && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{ background: C.card, borderRadius: 20, overflow: 'hidden', boxShadow: C.sh }}>
                    <SK w="100%" h={180} r={0} />
                    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 8 }}><SK w="70%" h={16} /><SK w="50%" h={12} /><SK w="100%" h={36} r={12} /></div>
                  </div>
                ))}
              </div>
            )}

            {error && !loading && <div style={{ textAlign: 'center', padding: '60px 20px' }}><AlertCircle size={36} color={C.faint} style={{ marginBottom: 12 }} /><p style={{ fontFamily: sans, fontSize: 14, color: C.muted, margin: 0 }}>{error}</p></div>}

            {!loading && !error && (filteredRestaurants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <Store size={40} color={C.faint} style={{ marginBottom: 12 }} />
                <p style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, color: C.dark, margin: '0 0 6px' }}>Aucun restaurant trouvé</p>
                <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: 0 }}>Essayez de modifier votre recherche</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {filteredRestaurants.map((r, i) => (
                  <RestaurantCard key={r.id} restaurant={r} idx={i} onSelect={setSelectedResto} favorites={restoFavs} onFav={toggleRestoFav} />
                ))}
              </div>
            ))}
          </div>

          {cartCount > 0 && (
            <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 200, animation: 'barIn 0.35s cubic-bezier(.4,0,.2,1) both' }}>
              <button onClick={() => setCartOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg,#973100,#C04000)', color: '#fff', border: 'none', borderRadius: 99, padding: '14px 24px', cursor: 'pointer', fontFamily: sans, fontSize: 14, fontWeight: 800, boxShadow: '0 8px 32px #97310066', whiteSpace: 'nowrap' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShoppingCart size={13} /></div>
                Voir le panier ({cartCount}) · {formatFCFA(total())}
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}

      {/* ═══ Overlay restaurant ═══ */}
      {selectedResto && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: C.bg, fontFamily: sans, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'overlayIn 0.25s ease both' }}>

          {/* Navbar interne */}
          <div style={{ background: C.nav, borderBottom: '1px solid ' + C.line, boxShadow: C.sh, flexShrink: 0 }}>
            <div style={{ padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', gap: 16 }}>
              <button onClick={() => { setSelectedResto(null); setMenuData([]); }} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', flexShrink: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: C.aL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowLeft size={17} color={C.accent} /></div>
                <span style={{ fontFamily: sans, fontSize: 14, fontWeight: 700, color: C.accent }}>Retour</span>
              </button>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: C.bg, border: '1.5px solid ' + C.line, borderRadius: 12, padding: '0 12px', height: 38, maxWidth: 520 }}>
                <Search size={14} color={C.muted} />
                <input type="text" placeholder={'Rechercher dans ' + selectedResto.nom + '…'} value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', fontFamily: sans, fontSize: 13, color: C.dark, background: 'transparent' }} />
                {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={13} color={C.muted} /></button>}
              </div>
              <button onClick={() => setCartOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, background: cartCount > 0 ? 'linear-gradient(135deg,#973100,#C04000)' : C.bg, border: '1.5px solid ' + (cartCount > 0 ? 'transparent' : C.line), color: cartCount > 0 ? '#fff' : C.muted, borderRadius: 12, padding: '7px 14px', fontFamily: sans, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: cartCount > 0 ? '0 3px 12px #97310044' : 'none', transition: 'all 0.2s' }}>
                <ShoppingCart size={15} />
                {cartCount > 0 && <><span>{cartCount}</span><span style={{ opacity: 0.85 }}>·</span><span>{formatFCFA(total())}</span></>}
              </button>
            </div>
          </div>

          {/* Corps 2 colonnes */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* Colonne gauche */}
            <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
              {/* Info restaurant */}
              <div style={{ background: C.card, borderBottom: '1px solid ' + C.line }}>
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 16, overflow: 'hidden', flexShrink: 0, background: C.bg, boxShadow: C.sh }}>
                      <img src={selectedResto.logo || selectedResto.photoUrl || fallback(0, 120)} alt={selectedResto.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.src = fallback(0, 120); }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 5px', fontFamily: sans, fontSize: 18, fontWeight: 900, color: C.dark }}>{selectedResto.nom}</p>
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: sans, fontSize: 12, color: C.muted }}><Star size={12} fill={C.yellow} color={C.yellow} />{Number(selectedResto.noteMoyenne) > 0 ? Number(selectedResto.noteMoyenne).toFixed(1) : '–'}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: sans, fontSize: 12, color: C.muted }}><Clock size={12} color={C.muted} />{selectedResto.deliveryTime || '25–40 min'}</span>
                        {selectedResto.adresse && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: sans, fontSize: 12, color: C.muted }}><MapPin size={12} color={C.muted} />{selectedResto.adresse}</span>}
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: sans, fontSize: 12, color: C.green, fontWeight: 700 }}><Truck size={12} color={C.green} />{selectedResto.fraisLivraison === 0 ? 'Livraison offerte' : selectedResto.fraisLivraison ? formatFCFA(selectedResto.fraisLivraison) : 'Livraison disponible'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid ' + C.line }}>
                  <p style={{ margin: '12px 20px 0', fontFamily: sans, fontSize: 11, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Choisir la catégorie</p>
                  {menuLoading ? (
                    <div style={{ display: 'flex', gap: 16, padding: '10px 20px 14px' }}>{[...Array(5)].map((_, i) => <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}><SK w={60} h={60} r={99} /><SK w={50} h={10} r={4} /></div>)}</div>
                  ) : (
                    <CategoryTabs cats={menuCats} active={activeCat} onChange={setActiveCat} />
                  )}
                </div>
              </div>

              {/* Grille produits — pleine largeur */}
              <div style={{ padding: '20px 20px 0' }}>
                {promos.length > 0 && <PromoStrip promos={promos} />}
                {!menuLoading && filteredProducts.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h2 style={{ margin: 0, fontFamily: sans, fontSize: 16, fontWeight: 900, color: C.dark }}>{activeCat === '__all__' ? 'Choisissez votre plat' : (menuCats.find(c => c.id === activeCat)?.nom || 'Plats')}</h2>
                    <span style={{ fontFamily: sans, fontSize: 12, color: C.muted, fontWeight: 600 }}>{filteredProducts.length} article{filteredProducts.length > 1 ? 's' : ''}</span>
                  </div>
                )}
                {renderProducts()}
                <div style={{ height: cartCount > 0 ? 90 : 24 }} />
              </div>
            </div>

            {/* Colonne droite : panier desktop */}
            <CartPanel
              items={items}
              total={total}
              onUpdate={updateQuantity}
              deliveryMode={deliveryMode}
              onDeliveryMode={handleDeliveryMode}
              onCheckout={handleCheckout}
              deliveryAddress={deliveryAddress}
              onOpenMap={() => setMapOpen(true)}
            />
          </div>

          {/* Barre panier mobile */}
          {cartCount > 0 && (
            <div className="cart-mobile-bar" style={{ padding: '12px 16px 20px', background: C.card, borderTop: '1px solid ' + C.line, boxShadow: '0 -4px 20px rgba(0,0,0,0.08)', flexShrink: 0 }}>
              <button onClick={handleCheckout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg,#973100,#C04000)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 20px', cursor: 'pointer', fontFamily: sans, fontSize: 14, fontWeight: 800, boxShadow: '0 4px 16px #97310055' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ShoppingCart size={16} /> {cartCount} article{cartCount > 1 ? 's' : ''}</span>
                <span>Payer · {formatFCFA(total())}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Modal carte livraison ── */}
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

      {/* ── Modals ── */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
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
