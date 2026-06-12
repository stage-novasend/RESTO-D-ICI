/* ═══════════════════════════════════════════════════════════════
   menu.jsx — Page catalogue restaurants + menu par restaurant
   Deux modes :
     1) Mode découverte  → grille de restaurants
     2) Mode menu        → liste de plats après sélection d'un resto
   Responsive : grille auto-fill, barre flottante panier, scrolls horizontaux
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search, X, UtensilsCrossed, Star, Clock, Truck, Heart, ArrowLeft,
  ShoppingCart, Plus, Minus, Store, AlertCircle, MapPin, ChevronRight,
} from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { menuAPI, promosAPI } from '../services/api';
import ProductCustomizationModal from '../components/menu/ProductCustomizationModal';
import CartDrawer from '../components/cart/CartDrawer';
import { formatFCFA } from '../utils/formatters';
import { getArticleImage } from '../utils/articleImage';

/* ── Design tokens — palette orange Restodici ── */
const C = {
  bg:     '#F4F4F4',
  card:   '#FFFFFF',
  accent: '#FF8C00',
  aD:     '#E07A00',
  aL:     '#FFF3E0',
  yellow: '#FFB800',
  red:    '#FF3B30',
  green:  '#22C55E',
  dark:   '#1C1C1E',
  text:   '#3D3D3D',
  muted:  '#8A8A8A',
  faint:  '#C5C5C5',
  line:   '#EBEBEB',
  nav:    '#FFFFFF',
  sh:     '0 1px 8px rgba(0,0,0,0.07)',
  shM:    '0 4px 24px rgba(0,0,0,0.10)',
  shL:    '0 12px 40px rgba(0,0,0,0.14)',
};
const sans = "'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif";

const FOOD_IMGS = [
  'photo-1565299585323-38d6b0865b47','photo-1567620905732-2d1ec7ab7445',
  'photo-1555939594-58d7cb561ad1','photo-1512058564366-18510be2db19',
  'photo-1540189549336-e6e99c3679fe','photo-1565958011703-44f9829ba187',
  'photo-1568901346375-23c9450c58cd','photo-1504674900247-0877df9cc836',
];
const fallback = (i, w = 600) =>
  `https://images.unsplash.com/${FOOD_IMGS[i % FOOD_IMGS.length]}?q=80&w=${w}&auto=format&fit=crop`;

/* Animations injectées en CSS inline pour éviter une dépendance externe */
const CSS = `
@keyframes sk    { 0%   { background-position: 200%  0 }
                   100% { background-position: -200% 0 } }
@keyframes spin  { to   { transform: rotate(360deg) } }
@keyframes fadeUp{ from { opacity:0; transform:translateY(10px) }
                   to   { opacity:1; transform:translateY(0) } }
@keyframes barIn { from { opacity:0; transform:translateX(-50%) translateY(20px) }
                   to   { opacity:1; transform:translateX(-50%) translateY(0) } }
`;

/* ── Composant skeleton — rectangle animé affiché pendant le chargement ── */
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

/* ── Emojis associés aux noms de catégories pour enrichir visuellement les onglets ── */
const CAT_EMOJI = {
  pizza: '🍕', burger: '🍔', sushi: '🍣', tacos: '🌮', poulet: '🍗',
  poisson: '🐟', riz: '🍚', salade: '🥗', dessert: '🍰', boisson: '🥤',
  brochette: '🥩', attiéké: '🍽️', foutou: '🫙', soupe: '🍜',
  grillades: '🔥', sandwich: '🥪', pâtes: '🍝', plat: '🍽️',
};
function catEmoji(name = '') {
  const k = name.toLowerCase();
  for (const [w, e] of Object.entries(CAT_EMOJI)) if (k.includes(w)) return e;
  return '🍽️';
}

/* ── Construit la liste des catégories en comptant les articles de chaque catégorie ── */
function buildDynCats(articles, catList) {
  const map = new Map();
  (catList || []).forEach(c => { if (c?.id) map.set(c.id, { ...c, count: 0 }); });
  (articles || []).forEach(p => {
    const cid = p.categorieId || p.categorie?.id;
    if (cid && map.has(cid)) map.get(cid).count++;
  });
  return [{ id: '__all__', nom: 'Tout voir', count: (articles || []).length }, ...Array.from(map.values())];
}

/* ── Logo Restodici — utilisé dans la barre de navigation du menu ── */
function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: `linear-gradient(135deg, ${C.accent}, ${C.yellow})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 2px 8px ${C.accent}44`,
      }}>
        <UtensilsCrossed size={18} color="#fff" strokeWidth={2.5} />
      </div>
      <span style={{ fontFamily: sans, fontSize: 17, fontWeight: 900, letterSpacing: '-0.04em' }}>
        <span style={{ color: C.accent }}>Resto</span>
        <span style={{ color: C.dark }}>&nbsp;d'ici</span>
      </span>
    </div>
  );
}

/* ── Carte restaurant — image cover + note + temps + CTA ── */
function RestaurantCard({ restaurant, idx, onSelect, favorites, onFav }) {
  const [hov, setHov] = useState(false);
  const img = restaurant.logo || restaurant.coverImage || restaurant.photoUrl || fallback(idx, 480);
  const rating = (restaurant.rating || (4.0 + (idx % 10) * 0.09)).toFixed(1);
  const time   = restaurant.deliveryTime || `${20 + (idx % 4) * 5}–${30 + (idx % 4) * 5} min`;
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
      {/* Cover image */}
      <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
        <img
          src={img}
          alt={restaurant.nom}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            transform: hov ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.4s ease' }}
          onError={e => { e.target.src = fallback(idx, 480); }}
        />
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.52) 0%, transparent 55%)' }} />

        {/* Top chips */}
        <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {badge && (
              <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 800, background: 'rgba(255,255,255,0.95)', color: C.dark, borderRadius: 99, padding: '3px 8px', boxShadow: C.sh }}>
                {badge}
              </span>
            )}
            {!isOpen && (
              <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 800, background: 'rgba(0,0,0,0.72)', color: '#fff', borderRadius: 99, padding: '3px 8px' }}>
                Fermé
              </span>
            )}
          </div>
          {/* Heart */}
          <button
            onClick={e => { e.stopPropagation(); onFav?.(restaurant.id); }}
            style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.90)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <Heart size={15} fill={isFav ? C.red : 'none'} color={isFav ? C.red : C.muted} strokeWidth={2} />
          </button>
        </div>

        {/* Bottom: rating + time */}
        <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: sans, fontSize: 12, fontWeight: 700, color: '#fff' }}>
            <Star size={12} fill={C.yellow} color={C.yellow} /> {rating}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: sans, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
            <Clock size={11} color="rgba(255,255,255,0.8)" /> {time}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '12px 14px 14px' }}>
        <p style={{ margin: '0 0 4px', fontFamily: sans, fontSize: 15, fontWeight: 800, color: C.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {restaurant.nom}
        </p>
        <p style={{ margin: '0 0 10px', fontFamily: sans, fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {restaurant.adresse || restaurant.ville || restaurant.description || 'Restaurant partenaire'}
        </p>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {(restaurant.cuisines || restaurant.tags || []).slice(0, 3).map((t, i) => (
            <span key={i} style={{ fontFamily: sans, fontSize: 10, fontWeight: 700, background: C.aL, color: C.aD, borderRadius: 99, padding: '3px 8px' }}>
              {t}
            </span>
          ))}
          {restaurant.fraisLivraison != null && (
            <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 700, background: '#F0FFF4', color: C.green, borderRadius: 99, padding: '3px 8px' }}>
              {restaurant.fraisLivraison === 0 ? '🚴 Livraison offerte' : `🚴 ${formatFCFA(restaurant.fraisLivraison)}`}
            </span>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={e => { if (!isOpen) return; e.stopPropagation(); onSelect(restaurant); }}
          disabled={!isOpen}
          style={{
            width: '100%', padding: '10px', borderRadius: 12, border: 'none',
            background: isOpen ? `linear-gradient(135deg,${C.accent},${C.aD})` : C.line,
            color: isOpen ? '#fff' : C.muted,
            fontFamily: sans, fontSize: 13, fontWeight: 800,
            cursor: isOpen ? 'pointer' : 'not-allowed',
            boxShadow: isOpen ? `0 4px 14px ${C.accent}44` : 'none',
            transition: 'all 0.15s',
          }}
        >
          {isOpen ? 'Voir le menu →' : 'Restaurant fermé'}
        </button>
      </div>
    </div>
  );
}

/* ── Carte produit — image carrée à gauche, nom + prix + bouton à droite ── */
function ProductCard({ product, qty, onAdd, onRemove, onCustomize, idx }) {
  const img = getArticleImage(product) || fallback(idx, 200);
  const isAvail = product.disponible !== false;

  return (
    <div style={{
      background: C.card, borderRadius: 16, boxShadow: C.sh,
      display: 'flex', alignItems: 'center', gap: 0,
      opacity: isAvail ? 1 : 0.6, overflow: 'hidden',
    }}>
      {/* Image carrée */}
      <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
        <img
          src={img}
          alt={product.nom}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.src = fallback(idx, 200); }}
        />
        {!isAvail && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: sans, fontSize: 9, fontWeight: 800, color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '3px 7px', borderRadius: 99 }}>Rupture</span>
          </div>
        )}
      </div>

      {/* Infos */}
      <div style={{ flex: 1, padding: '12px 14px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <p style={{ margin: 0, fontFamily: sans, fontSize: 14, fontWeight: 800, color: C.dark, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {product.nom}
        </p>
        {product.description && (
          <p style={{ margin: 0, fontFamily: sans, fontSize: 12, color: C.muted, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {product.description}
          </p>
        )}
        <span style={{ fontFamily: sans, fontSize: 15, fontWeight: 900, color: C.accent, marginTop: 4 }}>
          {formatFCFA(product.prix)}
        </span>
        {onCustomize && isAvail && (
          <button
            onClick={e => { e.stopPropagation(); onCustomize(product); }}
            style={{
              fontFamily: sans, fontSize: 11, fontWeight: 600, color: C.accent,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, marginTop: 3, opacity: 0.75,
              textDecoration: 'underline', textDecorationStyle: 'dotted',
            }}
          >
            Personnaliser ›
          </button>
        )}
      </div>

      {/* Bouton + / compteur */}
      <div style={{ padding: '0 14px', flexShrink: 0 }}>
        {qty > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', background: C.accent, borderRadius: 99, overflow: 'hidden' }}>
            <button
              onClick={() => onRemove(product)}
              style={{ width: 32, height: 32, border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Minus size={13} />
            </button>
            <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 800, color: '#fff', minWidth: 22, textAlign: 'center' }}>
              {qty}
            </span>
            <button
              onClick={() => onAdd(product)}
              style={{ width: 32, height: 32, border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Plus size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => isAvail && onAdd(product)}
            disabled={!isAvail}
            style={{
              width: 36, height: 36, borderRadius: '50%', border: 'none',
              background: isAvail ? `linear-gradient(135deg,${C.accent},${C.aD})` : C.line,
              color: isAvail ? '#fff' : C.muted,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: isAvail ? 'pointer' : 'not-allowed',
              boxShadow: isAvail ? `0 3px 12px ${C.accent}55` : 'none',
            }}
          >
            <Plus size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Onglets de catégories — barre horizontale avec défilement tactile ── */
function CategoryTabs({ cats, active, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const btn = ref.current.querySelector(`[data-cat="${active}"]`);
    if (btn) btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [active]);

  return (
    <div
      ref={ref}
      style={{
        display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px',
        scrollbarWidth: 'none', msOverflowStyle: 'none',
      }}
    >
      <style>{`.cat-scroll::-webkit-scrollbar{display:none}`}</style>
      {cats.map(cat => {
        const isActive = cat.id === active;
        return (
          <button
            key={cat.id}
            data-cat={cat.id}
            onClick={() => onChange(cat.id)}
            style={{
              flexShrink: 0, padding: '7px 16px', borderRadius: 99, border: 'none',
              background: isActive ? C.accent : C.card,
              color: isActive ? '#fff' : C.text,
              fontFamily: sans, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', boxShadow: C.sh,
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {catEmoji(cat.nom)} {cat.nom}
            {cat.count > 0 && (
              <span style={{ marginLeft: 5, fontSize: 11, fontWeight: 600, opacity: 0.75 }}>
                ({cat.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Bandeau codes promo avec bouton copier ── */
function PromoStrip({ promos }) {
  const [copied, setCopied] = useState(null);

  const copy = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 1800);
    });
  };

  const fmtRemise = (p) =>
    p.type === 'PERCENT' ? `-${p.valeur}%` : `-${Number(p.valeur).toLocaleString('fr-FR')} FCFA`;

  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontFamily: sans, fontSize: 11, fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 10px' }}>
        🎉 Codes promo disponibles
      </p>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        {promos.map((p) => (
          <div key={p.id} style={{
            flexShrink: 0,
            background: '#fff',
            border: `1.5px dashed ${C.accent}`,
            borderRadius: 14,
            padding: '12px 16px',
            minWidth: 220,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            {/* Réduction */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: sans, fontSize: 20, fontWeight: 900, color: C.accent, lineHeight: 1 }}>
                {fmtRemise(p)}
              </span>
              {p.minMontant > 0 && (
                <span style={{ fontFamily: sans, fontSize: 10, color: C.muted, fontWeight: 500 }}>
                  dès {Number(p.minMontant).toLocaleString('fr-FR')} FCFA
                </span>
              )}
            </div>

            {/* Description */}
            {p.description && (
              <p style={{ margin: 0, fontFamily: sans, fontSize: 12, color: C.text, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                {p.description}
              </p>
            )}

            {/* Code + bouton copier */}
            <button
              onClick={() => copy(p.code)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: copied === p.code ? '#F0FDF4' : C.aL,
                border: `1px solid ${copied === p.code ? '#86EFAC' : C.accent}22`,
                borderRadius: 8, padding: '7px 12px', cursor: 'pointer',
                fontFamily: 'monospace', fontSize: 13, fontWeight: 900,
                color: copied === p.code ? '#16A34A' : C.aD,
                gap: 8, width: '100%',
                transition: 'all 0.15s',
              }}
            >
              <span>{p.code}</span>
              <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.8 }}>
                {copied === p.code ? '✓ Copié !' : 'Copier'}
              </span>
            </button>

            {/* Expiration */}
            {p.expiresAt && (
              <p style={{ margin: 0, fontFamily: sans, fontSize: 10, color: C.muted }}>
                Expire le {new Date(p.expiresAt).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MenuPage — Composant principal de la page catalogue
   ═══════════════════════════════════════════════════════════════ */
export default function MenuPage() {
  /* ── État local ── */
  const [restaurants,    setRestaurants]    = useState([]);
  const [selectedResto,  setSelectedResto]  = useState(null);
  const [menuData,       setMenuData]       = useState([]);
  const [categories,     setCategories]     = useState([]);
  const [promos,         setPromos]         = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [menuLoading,    setMenuLoading]    = useState(false);
  const [search,         setSearch]         = useState('');
  const [discoSearch,    setDiscoSearch]    = useState('');
  const [activeCat,      setActiveCat]      = useState('__all__');
  const [discoCat,       setDiscoCat]       = useState('__all__');
  const [quantities,     setQuantities]     = useState({});
  const [cartOpen,       setCartOpen]       = useState(false);
  const [favorites,      setFavorites]      = useState([]);
  const [customModal,    setCustomModal]    = useState({ open: false, product: null });
  const [error,          setError]          = useState(null);

  const { addItem, removeItem, updateQuantity, items, total, restaurantName } = useCart();
  const cartCount = items.reduce((s, i) => s + (i.quantite || 0), 0);

  /* ── Chargement des restaurants au montage du composant ── */
  useEffect(() => {
    setLoading(true);
    menuAPI.getRestaurants()
      .then(r => setRestaurants(r.data || []))
      .catch(() => setError('Impossible de charger les restaurants.'))
      .finally(() => setLoading(false));
  }, []);

  /* ── Chargement du menu + promos quand l'utilisateur sélectionne un restaurant ── */
  useEffect(() => {
    if (!selectedResto) { setPromos([]); return; }
    setMenuLoading(true);
    setSearch('');
    setActiveCat('__all__');
    setQuantities({});
    Promise.all([
      menuAPI.getByRestaurant(selectedResto.id),
      menuAPI.getCategories({ restaurantId: selectedResto.id }),
      promosAPI.getActives(selectedResto.id).catch(() => ({ data: [] })),
    ])
      .then(([mr, cr, pr]) => {
        setMenuData(mr.data || []);
        setCategories(cr.data || []);
        setPromos(pr.data || []);
      })
      .catch(() => setError('Impossible de charger le menu.'))
      .finally(() => setMenuLoading(false));
  }, [selectedResto]);

  /* ── Synchronisation des quantités avec le panier ── */
  useEffect(() => {
    const map = {};
    items.forEach(i => {
      const aid = i.articleId;
      map[aid] = (map[aid] || 0) + (i.quantite || 0);
    });
    setQuantities(map);
  }, [items]);

  /* ── Bascule favori/non-favori d'un restaurant ── */
  const toggleFav = useCallback(id => {
    setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  /* ── Ajout rapide au panier (bouton +) ── */
  const handleAdd = useCallback((product) => {
    addItem({
      articleId: product.id,
      nom: product.nom,
      prix: product.promoActif && product.prixPromo
        ? Number(product.prixPromo)
        : Number(product.prix),
      photoUrl: product.photoUrl || product.imageUrl,
      categorie: product.categorie,
      restaurantId: selectedResto.id,
      restaurantName: selectedResto.nom,
    }, 1);
  }, [addItem, selectedResto]);

  /* ── Ouvre la modal de personnalisation ── */
  const handleCustomize = useCallback((product) => {
    setCustomModal({ open: true, product });
  }, []);

  /* ── Décrémente la quantité d'un article dans le panier ── */
  const handleRemove = useCallback((product) => {
    const lineItem = items.find(i => i.articleId === product.id);
    if (lineItem) updateQuantity(lineItem.lineId, lineItem.quantite - 1);
  }, [updateQuantity, items]);

  /* ── Catégories de découverte — extraites des tags de tous les restaurants ── */
  const discoCats = useMemo(() => {
    const names = new Set();
    restaurants.forEach(r => (r.cuisines || r.tags || []).forEach(t => names.add(t)));
    const cats = [{ id: '__all__', nom: 'Tous' }, ...[...names].map((n, i) => ({ id: String(i), nom: n }))];
    return cats;
  }, [restaurants]);

  /* ── Restaurants filtrés selon la recherche et la catégorie sélectionnée ── */
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(r => {
      const matchSearch = !discoSearch || r.nom.toLowerCase().includes(discoSearch.toLowerCase()) || (r.adresse || '').toLowerCase().includes(discoSearch.toLowerCase());
      const matchCat = discoCat === '__all__' || (r.cuisines || r.tags || []).includes(discoCat === '__all__' ? '' : discoCats.find(c => c.id === discoCat)?.nom || '');
      return matchSearch && (discoCat === '__all__' || matchCat);
    });
  }, [restaurants, discoSearch, discoCat, discoCats]);

  /* ── Onglets de catégories du menu avec leur nombre de plats ── */
  const menuCats = useMemo(() => buildDynCats(menuData, categories), [menuData, categories]);

  /* ── Plats filtrés par recherche et catégorie active ── */
  const filteredProducts = useMemo(() => {
    return menuData.filter(p => {
      const matchSearch = !search || p.nom.toLowerCase().includes(search.toLowerCase()) || (p.description || '').toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCat === '__all__' || p.categorieId === activeCat || p.categorie?.id === activeCat;
      return matchSearch && matchCat;
    });
  }, [menuData, search, activeCat]);

  /* ── Plats regroupés par catégorie (seulement quand "Tout voir" est actif) ── */
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

  /* ═══════════════════════════════════════════════════════════════
     RENDU
     ═══════════════════════════════════════════════════════════════ */
  return (
    /* min-h-dvh évite le bug de hauteur sur Safari iOS */
    <div style={{ background: C.bg, minHeight: '100dvh', fontFamily: sans, paddingBottom: cartCount > 0 ? 90 : 0 }}>
      <style>{CSS}</style>

      {/* ── Barre de navigation sticky — reste visible au défilement ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: C.nav, borderBottom: `1px solid ${C.line}`,
        boxShadow: C.sh,
      }}>
        {/* padding horizontal responsive : 12px sur mobile, 20px sur desktop */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 clamp(12px,4vw,20px)', height: 60, display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Back / Logo */}
          {selectedResto ? (
            <button
              onClick={() => { setSelectedResto(null); setMenuData([]); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', flexShrink: 0 }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 10, background: C.aL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowLeft size={17} color={C.accent} />
              </div>
              <span style={{ fontFamily: sans, fontSize: 14, fontWeight: 700, color: C.accent, display: 'none' }}>
                Retour
              </span>
            </button>
          ) : (
            <Logo />
          )}

          {/* Search bar */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: C.bg, border: `1.5px solid ${C.line}`, borderRadius: 12, padding: '0 12px', height: 38, maxWidth: 480 }}>
            <Search size={14} color={C.muted} />
            <input
              type="text"
              placeholder={selectedResto ? `Rechercher dans ${selectedResto.nom}…` : 'Rechercher un restaurant…'}
              value={selectedResto ? search : discoSearch}
              onChange={e => selectedResto ? setSearch(e.target.value) : setDiscoSearch(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', fontFamily: sans, fontSize: 13, color: C.dark, background: 'transparent' }}
            />
            {(selectedResto ? search : discoSearch) && (
              <button onClick={() => selectedResto ? setSearch('') : setDiscoSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                <X size={13} color={C.muted} />
              </button>
            )}
          </div>

          {/* Cart button */}
          <button
            onClick={() => setCartOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
              background: cartCount > 0 ? `linear-gradient(135deg,${C.accent},${C.aD})` : C.bg,
              border: `1.5px solid ${cartCount > 0 ? 'transparent' : C.line}`,
              color: cartCount > 0 ? '#fff' : C.muted,
              borderRadius: 12, padding: '7px 14px',
              fontFamily: sans, fontSize: 13, fontWeight: 700,
              cursor: 'pointer',
              boxShadow: cartCount > 0 ? `0 3px 12px ${C.accent}44` : 'none',
              transition: 'all 0.2s',
            }}
          >
            <ShoppingCart size={15} />
            {cartCount > 0 && (
              <>
                <span>{cartCount}</span>
                <span style={{ opacity: 0.85 }}>·</span>
                <span>{formatFCFA(total())}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Mode découverte : grille de restaurants ── */}
      {!selectedResto && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: `24px clamp(12px,4vw,20px)` }}>

          {/* ── Bannière héro — dégradé orange avec cercles décoratifs ── */}
          <div style={{
            background: `linear-gradient(135deg, ${C.accent} 0%, ${C.aD} 100%)`,
            borderRadius: 20,
            /* padding responsive : plus compact sur mobile */
            padding: 'clamp(16px,4vw,28px)',
            marginBottom: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: `0 8px 32px ${C.accent}44`, overflow: 'hidden', position: 'relative',
          }}>
            {/* Cercles décoratifs en arrière-plan */}
            <div style={{ position: 'absolute', right: -20, top: -20, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', right: 60, bottom: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ position: 'relative' }}>
              <p style={{ margin: '0 0 6px', fontFamily: sans, fontSize: 'clamp(16px,4vw,22px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>
                Commandez chez <br />vos restaurants préférés
              </p>
              <p style={{ margin: 0, fontFamily: sans, fontSize: 13, color: 'rgba(255,255,255,0.82)' }}>
                {restaurants.length > 0 ? `${restaurants.length} restaurants partenaires` : 'Restaurants à proximité'}
              </p>
            </div>
            <div style={{ fontSize: 'clamp(36px,8vw,60px)', position: 'relative', flexShrink: 0 }}>🍽️</div>
          </div>

          {/* Category chips */}
          {discoCats.length > 1 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                {discoCats.map(cat => {
                  const isA = cat.id === discoCat;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setDiscoCat(cat.id)}
                      style={{
                        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                        padding: '8px 16px', borderRadius: 99, border: 'none',
                        background: isA ? C.accent : C.card,
                        color: isA ? '#fff' : C.text,
                        fontFamily: sans, fontSize: 13, fontWeight: 700,
                        cursor: 'pointer', boxShadow: C.sh, transition: 'all 0.15s',
                      }}
                    >
                      {cat.id !== '__all__' && catEmoji(cat.nom)} {cat.nom}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section title */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontFamily: sans, fontSize: 18, fontWeight: 900, color: C.dark, letterSpacing: '-0.03em' }}>
              {discoCat === '__all__' ? 'Tous les restaurants' : discoCats.find(c => c.id === discoCat)?.nom || 'Restaurants'}
            </h2>
            <span style={{ fontFamily: sans, fontSize: 13, color: C.muted, fontWeight: 600 }}>
              {filteredRestaurants.length} résultat{filteredRestaurants.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Loading skeletons */}
          {loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ background: C.card, borderRadius: 20, overflow: 'hidden', boxShadow: C.sh }}>
                  <SK w="100%" h={180} r={0} />
                  <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <SK w="70%" h={16} />
                    <SK w="50%" h={12} />
                    <SK w="100%" h={36} r={12} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
              <AlertCircle size={36} color={C.faint} style={{ marginBottom: 12 }} />
              <p style={{ fontFamily: sans, fontSize: 14, margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Restaurant grid */}
          {!loading && !error && (
            filteredRestaurants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <Store size={40} color={C.faint} style={{ marginBottom: 12 }} />
                <p style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, color: C.dark, margin: '0 0 6px' }}>Aucun restaurant trouvé</p>
                <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: 0 }}>Essayez de modifier votre recherche</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {filteredRestaurants.map((r, i) => (
                  <RestaurantCard
                    key={r.id} restaurant={r} idx={i}
                    onSelect={setSelectedResto}
                    favorites={favorites} onFav={toggleFav}
                  />
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* ── Mode menu : plats d'un restaurant sélectionné ── */}
      {selectedResto && (
        <>
          {/* Restaurant info banner */}
          <div style={{
            background: C.card, borderBottom: `1px solid ${C.line}`,
            boxShadow: C.sh,
          }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Logo/cover thumb */}
                <div style={{ width: 60, height: 60, borderRadius: 14, overflow: 'hidden', flexShrink: 0, background: C.bg }}>
                  <img
                    src={selectedResto.logo || selectedResto.photoUrl || fallback(0, 120)}
                    alt={selectedResto.nom}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.src = fallback(0, 120); }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 4px', fontFamily: sans, fontSize: 17, fontWeight: 900, color: C.dark, letterSpacing: '-0.02em' }}>
                    {selectedResto.nom}
                  </p>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: sans, fontSize: 12, color: C.muted }}>
                      <Star size={12} fill={C.yellow} color={C.yellow} />
                      {(selectedResto.rating || 4.5).toFixed(1)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: sans, fontSize: 12, color: C.muted }}>
                      <Clock size={12} color={C.muted} />
                      {selectedResto.deliveryTime || '25–40 min'}
                    </span>
                    {selectedResto.adresse && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: sans, fontSize: 12, color: C.muted }}>
                        <MapPin size={12} color={C.muted} />
                        {selectedResto.adresse}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky category tabs */}
            <div style={{ paddingBottom: 12, paddingTop: 4 }}>
              {menuLoading ? (
                <div style={{ display: 'flex', gap: 8, padding: '0 20px' }}>
                  {[...Array(4)].map((_, i) => <SK key={i} w={80} h={34} r={99} />)}
                </div>
              ) : (
                <CategoryTabs cats={menuCats} active={activeCat} onChange={setActiveCat} />
              )}
            </div>
          </div>

          {/* ── Zone des plats — centré avec padding responsive ── */}
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: `24px clamp(12px,4vw,20px)` }}>

            {/* Promos strip — codes copiables */}
            {promos.length > 0 && (
              <PromoStrip promos={promos} />
            )}

            {menuLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{ background: C.card, borderRadius: 16, overflow: 'hidden', boxShadow: C.sh, display: 'flex', height: 100 }}>
                    <SK w={100} h={100} r={0} />
                    <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                      <SK w="65%" h={14} />
                      <SK w="45%" h={11} />
                      <SK w="30%" h={16} r={6} />
                    </div>
                    <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center' }}>
                      <SK w={36} h={36} r={99} />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <p style={{ fontFamily: sans, fontSize: 14, color: C.muted }}>Aucun plat trouvé</p>
              </div>
            ) : grouped.single ? (
              /* Single category — liste verticale */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {grouped.single.map((p, i) => (
                  <ProductCard
                    key={p.id} product={p} idx={i}
                    qty={quantities[p.id] || 0}
                    onAdd={handleAdd} onRemove={handleRemove} onCustomize={handleCustomize}
                  />
                ))}
              </div>
            ) : (
              /* Groupé par catégorie — liste verticale */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {grouped.grouped.map((grp, gi) => (
                  <div key={gi}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <span style={{ fontSize: 20 }}>{catEmoji(grp.cat?.nom)}</span>
                      <h3 style={{ margin: 0, fontFamily: sans, fontSize: 16, fontWeight: 900, color: C.dark, letterSpacing: '-0.02em' }}>
                        {grp.cat?.nom || 'Autres'}
                      </h3>
                      <span style={{ fontFamily: sans, fontSize: 12, color: C.muted, fontWeight: 600 }}>
                        ({grp.items.length})
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {grp.items.map((p, i) => (
                        <ProductCard
                          key={p.id} product={p} idx={gi * 10 + i}
                          qty={quantities[p.id] || 0}
                          onAdd={handleAdd} onRemove={handleRemove} onCustomize={handleCustomize}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Barre flottante panier — apparaît en bas quand le panier est non vide ── */}
      {cartCount > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, animation: 'barIn 0.35s cubic-bezier(.4,0,.2,1) both',
        }}>
          <button
            onClick={() => setCartOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: `linear-gradient(135deg,${C.accent},${C.aD})`,
              color: '#fff', border: 'none', borderRadius: 99,
              padding: '14px 24px', cursor: 'pointer',
              fontFamily: sans, fontSize: 14, fontWeight: 800,
              boxShadow: `0 8px 32px ${C.accent}66`,
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={13} />
            </div>
            Voir le panier ({cartCount})
            <span style={{ opacity: 0.85 }}>·</span>
            <span>{formatFCFA(total())}</span>
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* ── Modals : tiroir panier + personnalisation de plat ── */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      {customModal.open && (
        <ProductCustomizationModal
          product={customModal.product}
          restaurant={selectedResto}
          onClose={() => setCustomModal({ open: false, product: null })}
          onAdd={(product, qty, details, selectedVariant) => {
            const basePrice = product.promoActif && product.prixPromo
              ? Number(product.prixPromo)
              : Number(product.prix);
            const variantSupplement = selectedVariant
              ? Number(selectedVariant.prixSupplement || 0)
              : 0;
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
