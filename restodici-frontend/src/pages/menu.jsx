import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, X, UtensilsCrossed, Star, Clock, Truck, Heart, ArrowLeft,
  ShoppingCart, ChevronRight, Store, AlertCircle, MapPin, ArrowRight,
} from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { menuAPI } from '../services/api';
import ProductCustomizationModal from '../components/menu/ProductCustomizationModal';
import CartDrawer from '../components/cart/CartDrawer';
import { formatFCFA } from '../utils/formatters';
import { getArticleImage } from '../utils/articleImage';

/* ─── Palette ─── */
const T = {
  bg:'#FFFAF3', bgAlt:'#FFF5E8', surface:'#FFEFD8',
  dark:'#1A0C00', text:'#3B2409', muted:'#7A5E3A', mutedL:'#B09070',
  card:'#FFFFFF', accent:'#FF8C00', accentD:'#E07A00', accentL:'#FFAD40',
  yellow:'#FFB800', red:'#FF3B30', green:'#22C55E',
  line:'rgba(255,140,0,0.14)', shadow:'0 6px 28px rgba(255,140,0,0.14)',
  shadowS:'0 2px 14px rgba(0,0,0,0.07)',
};
const sans  = "'Manrope', system-ui, sans-serif";
const serif = "'Playfair Display', Georgia, serif";

const FOOD_IMGS = [
  'photo-1565299585323-38d6b0865b47','photo-1567620905732-2d1ec7ab7445',
  'photo-1555939594-58d7cb561ad1','photo-1512058564366-18510be2db19',
  'photo-1540189549336-e6e99c3679fe','photo-1565958011703-44f9829ba187',
  'photo-1568901346375-23c9450c58cd','photo-1504674900247-0877df9cc836',
];
const fallbackImg = (idx, w = 600) =>
  `https://images.unsplash.com/${FOOD_IMGS[idx % FOOD_IMGS.length]}?q=80&w=${w}&auto=format&fit=crop`;

const CSS = `
@keyframes kfskeleton{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes cartSlideUp{from{transform:translateX(-50%) translateY(100%);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
@keyframes kfspin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
.menu-card:hover{transform:translateY(-5px)!important;box-shadow:0 18px 48px rgba(255,140,0,0.18)!important;}
.menu-cat:hover{background:rgba(255,140,0,0.08)!important;}
.menu-input:focus{border-color:#FF8C00!important;}
`;

/* ─── Helpers ─── */
function buildDynamicCategories(menuData, categoryList) {
  const map = new Map();
  (Array.isArray(categoryList) ? categoryList : []).forEach(c => {
    if (c?.id) map.set(c.id, { ...c, articleCount: 0 });
  });
  (Array.isArray(menuData) ? menuData : []).forEach(p => {
    const cid = p.categorieId || p.categorie?.id; if (!cid) return;
    const ex = map.get(cid);
    map.set(cid, { id:cid, nom:ex?.nom||p.categorie?.nom||'Catégorie', icone:ex?.icone||p.categorie?.icone||'', description:ex?.description||'', articleCount:(ex?.articleCount||0)+1 });
  });
  return Array.from(map.values()).sort((a,b) => a.nom.localeCompare(b.nom));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validUUID = v => typeof v === 'string' && UUID_RE.test(v) ? v : '';

/* ─── Shimmer ─── */
function Shimmer({ w = '100%', h = 20, r = 8 }) {
  return (
    <div style={{ width:w, height:h, borderRadius:r, background:`linear-gradient(90deg,${T.bgAlt} 25%,${T.surface} 50%,${T.bgAlt} 75%)`, backgroundSize:'200% 100%', animation:'kfskeleton 1.5s ease-in-out infinite' }} />
  );
}

/* ─── Restaurant Card — Vibrant Provisions style ─── */
function RestaurantCard({ restaurant, idx, onSelect }) {
  const [fav, setFav] = useState(false);
  const img = restaurant.logo || fallbackImg(idx);
  const tag1 = restaurant.typeRestaurant || restaurant.type || 'Restaurant';
  const tag2 = restaurant.cuisine || restaurant.specialite || null;
  const TIMES = ['15–25 min','20–30 min','25–35 min','30–40 min','35–45 min'];
  const time = TIMES[idx % TIMES.length];
  const isFree = [0,3,6].includes(idx % 9);
  const feeAmt = (idx % 3 + 1) * 500;

  return (
    <div className="menu-card" onClick={() => onSelect(restaurant.id)}
      style={{ background:T.card, borderRadius:18, overflow:'hidden', boxShadow:T.shadowS, border:`1px solid ${T.line}`, transition:'all .35s', cursor:'pointer' }}>

      {/* Photo */}
      <div style={{ position:'relative', height:210, overflow:'hidden' }}>
        <img src={img} alt={restaurant.nom}
          onError={e => { e.target.src = fallbackImg(idx); }}
          style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,transparent 50%,rgba(26,12,0,0.28))' }} />

        {/* Heart */}
        <button onClick={e => { e.stopPropagation(); setFav(!fav); }}
          style={{ position:'absolute', top:12, right:12, width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.92)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 10px rgba(0,0,0,0.15)', transition:'transform .18s' }}
          onMouseEnter={e => e.currentTarget.style.transform='scale(1.12)'}
          onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
          <Heart size={16} fill={fav ? T.red : 'none'} color={fav ? T.red : T.muted} strokeWidth={2.5} />
        </button>

        {/* Open badge */}
        <div style={{ position:'absolute', top:12, left:12, background:'rgba(34,197,94,0.92)', borderRadius:20, padding:'3px 10px', display:'flex', alignItems:'center', gap:5, backdropFilter:'blur(6px)' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#fff' }} />
          <span style={{ fontFamily:sans, fontSize:11, fontWeight:700, color:'#fff' }}>Ouvert</span>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding:'14px 16px 18px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
          <h3 style={{ fontFamily:serif, fontSize:18, color:T.dark, fontWeight:700, margin:0, flex:1, marginRight:8, lineHeight:1.2 }}>{restaurant.nom}</h3>
          <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0, background:T.bgAlt, borderRadius:8, padding:'4px 8px' }}>
            <Star size={13} fill={T.yellow} color={T.yellow} />
            <span style={{ fontFamily:sans, fontSize:13, fontWeight:700, color:T.dark }}>4.8</span>
          </div>
        </div>

        {/* Tags */}
        <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
          <span style={{ background:`${T.accent}18`, color:T.accent, fontFamily:sans, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:6 }}>{tag1}</span>
          {tag2 && <span style={{ background:`${T.yellow}22`, color:'#8A6000', fontFamily:sans, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:6 }}>{tag2}</span>}
        </div>

        {/* Delivery info */}
        <div style={{ display:'flex', gap:16, alignItems:'center', borderTop:`1px solid ${T.line}`, paddingTop:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5, color:T.muted }}>
            <Clock size={13} /><span style={{ fontFamily:sans, fontSize:12, fontWeight:500 }}>{time}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <Truck size={13} color={isFree ? T.green : T.muted} />
            <span style={{ fontFamily:sans, fontSize:12, fontWeight:600, color:isFree ? '#16A34A' : T.muted }}>
              {isFree ? 'Livraison gratuite' : `${feeAmt.toLocaleString('fr-FR')} FCFA`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Product Card ─── */
function ProductCard({ product, qty, onAdd, onCustomize, onIncrement, onDecrement }) {
  const [hov, setHov] = useState(false);
  const isPromo = !!(product.promoActif && product.prixPromo && Number(product.prixPromo) > 0);
  const price = isPromo ? Number(product.prixPromo) : parseFloat(product.prix) || 0;

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:T.card, borderRadius:18, overflow:'hidden', boxShadow:T.shadowS, border:`1px solid ${T.line}`, transition:'all .35s', opacity:product.disponible?1:0.62, transform:hov&&product.disponible?'translateY(-4px)':'none' }}>

      {/* Image */}
      <div style={{ position:'relative', height:180, overflow:'hidden' }}>
        <img src={getArticleImage(product)} alt={product.nom}
          onError={e => { e.target.src = fallbackImg(0); }}
          style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', transition:'transform .5s', transform:hov?'scale(1.06)':'scale(1)' }} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,transparent 40%,rgba(26,12,0,0.28))' }} />

        <div style={{ position:'absolute', top:10, left:10, background:product.disponible?'rgba(34,197,94,0.92)':'rgba(255,59,48,0.92)', borderRadius:16, padding:'2px 9px', backdropFilter:'blur(4px)' }}>
          <span style={{ fontFamily:sans, fontSize:10, fontWeight:700, color:'#fff' }}>{product.disponible?'● Disponible':'● Rupture'}</span>
        </div>

        {isPromo && product.disponible && (
          <div style={{ position:'absolute', top:10, right:10, background:'rgba(255,59,48,0.92)', borderRadius:16, padding:'2px 9px' }}>
            <span style={{ fontFamily:sans, fontSize:10, fontWeight:700, color:'#fff' }}>
              -{Math.round((1 - Number(product.prixPromo)/Number(product.prix)) * 100)}%
            </span>
          </div>
        )}

        {product.categorie?.nom && (
          <div style={{ position:'absolute', bottom:10, left:10, background:'rgba(26,12,0,0.55)', borderRadius:20, padding:'2px 10px', backdropFilter:'blur(4px)' }}>
            <span style={{ fontFamily:sans, fontSize:10, fontWeight:600, color:'#fff' }}>{product.categorie.icone?`${product.categorie.icone} `:''}{product.categorie.nom}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding:'14px 16px 18px' }}>
        <h4 style={{ fontFamily:serif, fontSize:16, fontWeight:700, color:T.dark, margin:'0 0 4px', lineHeight:1.25 }}>{product.nom}</h4>
        <p style={{ fontFamily:sans, fontSize:12, color:T.muted, margin:'0 0 12px', lineHeight:1.6, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {product.description || 'Préparé avec soin par notre équipe.'}
        </p>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div>
            <span style={{ fontFamily:sans, fontSize:18, fontWeight:800, color:T.accent }}>{formatFCFA(price)}</span>
            {isPromo && <span style={{ fontFamily:sans, fontSize:11, color:T.mutedL, textDecoration:'line-through', marginLeft:6 }}>{formatFCFA(parseFloat(product.prix)||0)}</span>}
          </div>
          <div style={{ display:'flex', alignItems:'center', border:`1px solid ${T.line}`, borderRadius:10, overflow:'hidden' }}>
            <button onClick={() => onDecrement(product.id)} disabled={!product.disponible}
              style={{ width:30, height:30, border:'none', background:'transparent', cursor:'pointer', fontWeight:700, fontSize:16, color:T.muted, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
            <span style={{ minWidth:28, textAlign:'center', fontFamily:sans, fontSize:13, fontWeight:700, color:T.dark }}>{qty}</span>
            <button onClick={() => onIncrement(product.id)} disabled={!product.disponible}
              style={{ width:30, height:30, border:'none', background:'transparent', cursor:'pointer', fontWeight:700, fontSize:16, color:T.muted, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
          </div>
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => onAdd(product)} disabled={!product.disponible}
            style={{ flex:1, padding:'10px 0', borderRadius:12, border:'none', cursor:product.disponible?'pointer':'not-allowed', fontFamily:sans, fontSize:13, fontWeight:700, color:'#fff', background:product.disponible?`linear-gradient(135deg,${T.accent},${T.accentD})`:T.bgAlt, transition:'all .2s' }}>
            {product.disponible ? '+ Ajouter' : 'Indisponible'}
          </button>
          <button onClick={() => onCustomize(product)} disabled={!product.disponible}
            style={{ width:42, height:42, borderRadius:12, border:`1px solid ${T.line}`, background:T.card, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>
            ✏️
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function MenuPage() {
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const requestedRestaurantId = validUUID(urlParams.get('restaurant')) || validUUID(localStorage.getItem('selectedRestaurantId')) || '';
  const requestedCategoryId = urlParams.get('category') || 'all';
  const requestedSearch = urlParams.get('search') || '';

  const [restaurants, setRestaurants]         = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(requestedRestaurantId);
  const [categories, setCategories]           = useState([]);
  const [discoveryCircles, setDiscoveryCircles] = useState([]);
  const [discoveryFilter, setDiscoveryFilter] = useState(null);
  const [activeCategory, setActiveCategory]   = useState(requestedCategoryId);
  const [searchQuery, setSearchQuery]         = useState(requestedSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(requestedSearch);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [serviceMode, setServiceMode]         = useState('Livraison');
  const [restaurantDetails, setRestaurantDetails] = useState({
    nom:'Restaurant', description:'', logoUrl:'', isOpen:true,
    estimatedTime:'25-35 min', rating:4.8, reviews:120, address:'', phone:'',
  });
  const [quantities, setQuantities]   = useState({});
  const [filters, setFilters]         = useState({ priceRange:[0,10000], showAvailableOnly:true, showPromotionsOnly:false, sortBy:'name' });
  const [quickFilters, setQuickFilters] = useState({ vegetarian:false, glutenFree:false, budgetFriendly:false, popular:false, newest:false });
  const { addItem, items:cartItems, total:cartTotal, restaurantName:cartRestaurantName } = useCart();
  const [cartOpen, setCartOpen] = useState(false);

  const restaurantId = selectedRestaurantId;
  const selectedRestaurant = useMemo(() => restaurants.find(r => r.id === restaurantId) || null, [restaurants, restaurantId]);
  const selectedCategory   = useMemo(() => categories.find(c => c.id === activeCategory) || null, [categories, activeCategory]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  /* Load restaurant list */
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true); setError(null);
        const res = await menuAPI.getRestaurants();
        const list = res.data || [];
        setRestaurants(list);
        if (!list.length) { setSelectedRestaurantId(''); setLoading(false); return; }

        setSelectedRestaurantId(cur => {
          const reqOK = list.some(r => r.id === requestedRestaurantId);
          if (reqOK) return requestedRestaurantId;
          const curOK = list.some(r => r.id === cur);
          if (curOK) return cur;
          return '';
        });

        // Fetch categories from first restaurant for discovery circles
        try {
          const catRes = await menuAPI.getCategories({ restaurantId: list[0].id });
          setDiscoveryCircles(Array.isArray(catRes.data) ? catRes.data : []);
        } catch { /* ignore */ }
      } catch (e) {
        console.error(e);
        setError('Impossible de charger les restaurants.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [requestedRestaurantId]); // eslint-disable-line

  /* Load selected restaurant menu */
  useEffect(() => {
    if (!restaurantId) { setCategories([]); setLoading(false); return; }
    const load = async () => {
      try {
        setLoading(true); setError(null);
        const [menuRes, catRes] = await Promise.all([
          menuAPI.getByRestaurant(restaurantId, { cible:'CLIENT' }),
          menuAPI.getCategories({ restaurantId }),
        ]);
        if (!menuAPI.menuCache) menuAPI.menuCache = {};
        const menuData   = Array.isArray(menuRes.data) ? menuRes.data : [];
        const catList    = Array.isArray(catRes.data)  ? catRes.data  : [];
        const dynCats    = buildDynamicCategories(menuData, catList);
        menuAPI.menuCache[restaurantId] = menuData;
        setCategories(dynCats);

        const rInfo = menuData[0]?.restaurant || menuData[0]?.restaurantData || {};
        const rName = menuData[0]?.restaurantNom || menuData[0]?.restaurant?.nom || selectedRestaurant?.nom || 'Restaurant';
        const openStatus = typeof rInfo.ouvert === 'boolean' ? rInfo.ouvert : rInfo.open === false ? false : true;
        setRestaurantDetails({
          nom: rName,
          description: rInfo.description || rInfo.slogan || selectedRestaurant?.adresse || 'Découvrez les spécialités et plats disponibles.',
          logoUrl: rInfo.logoUrl || rInfo.photoUrl || selectedRestaurant?.logo || '',
          isOpen: openStatus,
          estimatedTime: rInfo.delaiLivraison || rInfo.delaiPreparation || '25-35 min',
          rating: parseFloat(rInfo.noteMoyenne || rInfo.note || 4.8) || 4.8,
          reviews: rInfo.avisCount || rInfo.reviewsCount || rInfo.avis?.length || 120,
          address: selectedRestaurant?.adresse || rInfo.adresse || '',
          phone: selectedRestaurant?.telephone || rInfo.telephone || '',
        });
        localStorage.setItem('selectedRestaurantId', restaurantId);
        localStorage.setItem('currentRestaurantId', restaurantId);
        localStorage.setItem('currentRestaurantName', rName);
        setActiveCategory(cur => {
          if (requestedCategoryId !== 'all' && dynCats.some(c => c.id === requestedCategoryId)) return requestedCategoryId;
          if (dynCats.some(c => c.id === cur)) return cur;
          return 'all';
        });
      } catch (e) {
        console.error(e); setError('Impossible de charger le menu.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [restaurantId, selectedRestaurant, requestedCategoryId]); // eslint-disable-line

  /* Sync URL */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (restaurantId) p.set('restaurant', restaurantId); else p.delete('restaurant');
    if (activeCategory && activeCategory !== 'all') p.set('category', activeCategory); else p.delete('category');
    if (searchQuery.trim()) p.set('search', searchQuery.trim()); else p.delete('search');
    const qs = p.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  }, [restaurantId, activeCategory, searchQuery]);

  /* Callbacks */
  const getProductSearchText = useCallback(p => {
    const al = Array.isArray(p.allergenes) ? p.allergenes.join(' ') : p.allergenes || p.allergene || p.allergènes || '';
    return [p.nom, p.description, p.categorie?.nom, p.restaurantNom, al].filter(Boolean).join(' ').toLowerCase();
  }, []);

  const isVegetarianProduct = useCallback(p => {
    const t = getProductSearchText(p);
    return ['veget','végé','salade','legume','légume','tofu','haricot','riz','attiéké','alloco'].some(h => t.includes(h))
      && !['poulet','boeuf','bœuf','viande','poisson','thon','crevette','porc','mouton','saumon','dinde','jambon'].some(h => t.includes(h));
  }, [getProductSearchText]);

  const isGlutenFreeProduct = useCallback(p => {
    const t = getProductSearchText(p);
    return !['gluten','blé','ble','wheat','farine','pain','pâte','pate'].some(h => t.includes(h));
  }, [getProductSearchText]);

  const isPopularProduct = useCallback(p => Number(p.quantiteVendue || p.commandesCount || p.orderCount || 0) > 0, []);

  const isNewProduct = useCallback(p => {
    if (!p.createdAt) return false;
    const t = new Date(p.createdAt).getTime();
    return !Number.isNaN(t) && Date.now() - t <= 1000 * 60 * 60 * 24 * 30;
  }, []);

  const toggleQuickFilter = k => setQuickFilters(prev => ({ ...prev, [k]: !prev[k] }));

  const filteredProducts = useMemo(() => {
    if (!menuAPI.menuCache?.[restaurantId]) return [];
    let products = [...menuAPI.menuCache[restaurantId]];
    if (activeCategory !== 'all') products = products.filter(p => p.categorieId === activeCategory || p.categorie?.id === activeCategory);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      products = products.filter(p => p.nom.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.categorie?.nom?.toLowerCase().includes(q) || p.restaurantNom?.toLowerCase().includes(q));
    }
    if (filters.showAvailableOnly) products = products.filter(p => p.disponible);
    if (filters.showPromotionsOnly) products = products.filter(p => p.prix && parseFloat(p.prix) < 2000);
    if (quickFilters.vegetarian)    products = products.filter(p => isVegetarianProduct(p));
    if (quickFilters.glutenFree)    products = products.filter(p => isGlutenFreeProduct(p));
    if (quickFilters.budgetFriendly) products = products.filter(p => (parseFloat(p.prix)||0) < 2000);
    if (quickFilters.popular)       products = products.filter(p => isPopularProduct(p));
    if (quickFilters.newest)        products = products.filter(p => isNewProduct(p));
    products = products.filter(p => { const pr = parseFloat(p.prix)||0; return pr >= filters.priceRange[0] && pr <= filters.priceRange[1]; });
    products.sort((a,b) => {
      const pa = parseFloat(a.prix)||0, pb = parseFloat(b.prix)||0;
      switch(filters.sortBy) {
        case 'price-low':  return pa - pb;
        case 'price-high': return pb - pa;
        case 'popular':    return (b.quantiteVendue||0) - (a.quantiteVendue||0);
        case 'newest':     return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:           return a.nom.localeCompare(b.nom);
      }
    });
    return products;
  }, [restaurantId, activeCategory, debouncedSearch, filters, quickFilters, isVegetarianProduct, isGlutenFreeProduct, isPopularProduct, isNewProduct]);

  /* Discovery: filter restaurants by search or circle */
  const visibleRestaurants = useMemo(() => {
    let list = restaurants;
    if (discoveryFilter) {
      const q = discoveryFilter.toLowerCase();
      list = list.filter(r => r.nom?.toLowerCase().includes(q) || r.typeRestaurant?.toLowerCase().includes(q) || r.type?.toLowerCase().includes(q) || r.cuisine?.toLowerCase().includes(q));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => r.nom?.toLowerCase().includes(q) || r.typeRestaurant?.toLowerCase().includes(q) || r.adresse?.toLowerCase().includes(q));
    }
    return list;
  }, [restaurants, discoveryFilter, searchQuery]);

  const handleAddToCart = useCallback((product, quantity = 1, instructions = '') => {
    const rawId = restaurantId || localStorage.getItem('currentRestaurantId');
    const rId = UUID_RE.test(rawId ?? '') ? rawId : undefined;
    if (!rId) return;
    const rName = restaurantDetails.nom || localStorage.getItem('currentRestaurantName') || 'Restaurant';
    addItem({ articleId:product.id, nom:product.nom, prix:(product.promoActif&&product.prixPromo)?Number(product.prixPromo):parseFloat(product.prix)||0, photoUrl:product.photoUrl, instructions, categorie:product.categorie, restaurantId:rId, restaurantName:rName }, quantity);
    setCartOpen(true);
  }, [addItem, restaurantId, restaurantDetails.nom]);

  const handleQuickAdd    = p => handleAddToCart(p, quantities[p.id] || 1, '');
  const handleRestaurantSelect = id => { setSelectedRestaurantId(id); setActiveCategory('all'); setSelectedProduct(null); };
  const handleBackToDiscovery = () => { setSelectedRestaurantId(''); localStorage.removeItem('selectedRestaurantId'); setSearchQuery(''); };
  const incrementQuantity = id => setQuantities(p => ({ ...p, [id]: (p[id]||1) + 1 }));
  const decrementQuantity = id => setQuantities(p => ({ ...p, [id]: Math.max(1,(p[id]||1) - 1) }));

  const cartCount = cartItems.reduce((s,i) => s + i.quantite, 0);
  const activeFiltersCount = Object.values(quickFilters).filter(Boolean).length;

  const QFILTERS = [
    { key:'vegetarian',    label:'🥗 Végétarien' },
    { key:'glutenFree',    label:'🌾 Sans gluten' },
    { key:'budgetFriendly',label:'💰 < 2 000 FCFA' },
    { key:'popular',       label:'🔥 Populaires' },
    { key:'newest',        label:'✨ Nouveautés' },
  ];

  /* ── Loading state ── */
  if (loading && restaurants.length === 0) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:T.bg }}>
        <style>{CSS}</style>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:48, height:48, border:`4px solid ${T.accent}`, borderTopColor:'transparent', borderRadius:'50%', animation:'kfspin 0.8s linear infinite', margin:'0 auto 16px' }} />
          <p style={{ fontFamily:sans, color:T.muted, fontSize:15 }}>Chargement des restaurants…</p>
        </div>
      </div>
    );
  }

  if (error && restaurants.length === 0) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:T.bg, padding:24 }}>
        <style>{CSS}</style>
        <div style={{ background:T.card, borderRadius:24, padding:32, maxWidth:400, textAlign:'center', boxShadow:T.shadow, border:`1px solid ${T.line}` }}>
          <AlertCircle size={36} color={T.red} style={{ margin:'0 auto 16px' }} />
          <h3 style={{ fontFamily:serif, fontSize:22, color:T.dark, fontWeight:700, margin:'0 0 8px' }}>Erreur de connexion</h3>
          <p style={{ fontFamily:sans, fontSize:14, color:T.muted, margin:'0 0 24px' }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{ background:`linear-gradient(135deg,${T.accent},${T.accentD})`, color:'#fff', border:'none', borderRadius:50, padding:'12px 28px', fontFamily:sans, fontSize:14, fontWeight:700, cursor:'pointer' }}>Réessayer</button>
        </div>
      </div>
    );
  }

  if (!loading && restaurants.length === 0) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:T.bg, padding:24 }}>
        <style>{CSS}</style>
        <div style={{ background:T.card, borderRadius:24, padding:40, maxWidth:440, textAlign:'center', boxShadow:T.shadow, border:`1px solid ${T.line}` }}>
          <Store size={56} color={T.mutedL} style={{ margin:'0 auto 16px' }} />
          <h2 style={{ fontFamily:serif, fontSize:24, color:T.dark, fontWeight:700, margin:'0 0 8px' }}>Aucun restaurant</h2>
          <p style={{ fontFamily:sans, fontSize:14, color:T.muted, margin:0 }}>Aucun restaurant actif disponible pour le moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background:T.bg, minHeight:'100vh', fontFamily:sans }}>
      <style>{CSS}</style>

      {/* ─── Sticky Header ─── */}
      <div style={{ position:'sticky', top:0, zIndex:30, background:'rgba(255,250,243,0.97)', backdropFilter:'blur(20px)', borderBottom:`1px solid ${T.line}`, boxShadow:'0 2px 20px rgba(255,140,0,0.07)' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', padding:'14px 40px', display:'flex', gap:14, alignItems:'center', flexWrap:'wrap' }}>

          {/* Back / Logo */}
          {selectedRestaurantId ? (
            <button onClick={handleBackToDiscovery}
              style={{ display:'flex', alignItems:'center', gap:6, fontFamily:sans, fontSize:13, fontWeight:700, color:T.accent, background:'transparent', border:`1.5px solid ${T.line}`, borderRadius:50, padding:'8px 16px', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0, transition:'all .2s' }}
              onMouseEnter={e => e.currentTarget.style.background = T.bgAlt}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <ArrowLeft size={14} /> Restaurants
            </button>
          ) : (
            <a href="/" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none', flexShrink:0 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:`linear-gradient(135deg,${T.accent},${T.yellow})`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <UtensilsCrossed size={16} color="#fff" />
              </div>
              <span style={{ fontFamily:serif, fontWeight:700, color:T.accent, fontSize:18 }}>Resto d'ici</span>
            </a>
          )}

          {/* Search */}
          <div style={{ flex:1, minWidth:200, position:'relative' }}>
            <Search size={16} color={T.mutedL} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
            <input className="menu-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={selectedRestaurantId ? 'Rechercher un plat…' : 'Rechercher un restaurant…'}
              style={{ width:'100%', paddingLeft:42, paddingRight:searchQuery?36:16, paddingTop:11, paddingBottom:11, border:`1.5px solid ${T.line}`, borderRadius:50, fontFamily:sans, fontSize:14, color:T.text, background:T.card, outline:'none', boxSizing:'border-box', transition:'border-color .2s' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:T.mutedL, lineHeight:0, padding:4 }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Cart */}
          {cartCount > 0 && (
            <button onClick={() => setCartOpen(true)}
              style={{ display:'flex', alignItems:'center', gap:8, background:`linear-gradient(135deg,${T.accent},${T.accentD})`, color:'#fff', border:'none', borderRadius:50, padding:'10px 18px', cursor:'pointer', fontFamily:sans, fontSize:13, fontWeight:700, flexShrink:0, boxShadow:`0 4px 14px ${T.accent}44` }}>
              <ShoppingCart size={15} />
              Panier ({cartCount})
            </button>
          )}
        </div>

        {/* Quick filters — menu mode only */}
        {selectedRestaurantId && (
          <div style={{ maxWidth:1280, margin:'0 auto', padding:'0 40px 12px', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ fontFamily:sans, fontSize:12, fontWeight:700, color:T.muted, letterSpacing:'0.06em' }}>Filtres rapides :</span>
            {QFILTERS.map(f => {
              const on = quickFilters[f.key];
              return (
                <button key={f.key} onClick={() => toggleQuickFilter(f.key)}
                  style={{ fontFamily:sans, fontSize:12, fontWeight:600, padding:'6px 14px', borderRadius:50, border:`1.5px solid ${on?T.accent:T.line}`, background:on?T.accent:'transparent', color:on?'#fff':T.muted, cursor:'pointer', transition:'all .2s' }}>
                  {f.label}
                </button>
              );
            })}
            {activeFiltersCount > 0 && (
              <button onClick={() => setQuickFilters({ vegetarian:false, glutenFree:false, budgetFriendly:false, popular:false, newest:false })}
                style={{ fontFamily:sans, fontSize:12, fontWeight:600, padding:'6px 14px', borderRadius:50, border:`1.5px solid rgba(255,59,48,0.3)`, background:'transparent', color:T.red, cursor:'pointer' }}>
                Effacer ({activeFiltersCount})
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── DISCOVERY MODE ─── */}
      {!selectedRestaurantId && (
        <div style={{ maxWidth:1280, margin:'0 auto', padding:'40px 40px 80px' }}>

          {/* Page title */}
          <div style={{ marginBottom:36 }}>
            <p style={{ fontFamily:sans, fontSize:11, fontWeight:700, color:T.accent, letterSpacing:'0.2em', textTransform:'uppercase', margin:'0 0 6px' }}>Restaurants</p>
            <h1 style={{ fontFamily:serif, fontSize:'clamp(26px,3.5vw,42px)', color:T.dark, fontWeight:900, margin:'0 0 6px', lineHeight:1.15 }}>
              Découvrez tous les restaurants<br />et leurs articles
            </h1>
            <p style={{ fontFamily:sans, fontSize:14, color:T.muted, margin:0 }}>
              {restaurants.length} restaurant{restaurants.length > 1 ? 's' : ''} disponible{restaurants.length > 1 ? 's' : ''}
            </p>
          </div>

          {/* Promo banner */}
          <div style={{ borderRadius:22, overflow:'hidden', position:'relative', height:220, marginBottom:48, cursor:'pointer' }}>
            <img src="https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=1400&auto=format&fit=crop" alt="Promo"
              style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right,rgba(15,23,42,0.92) 0%,rgba(15,23,42,0.65) 45%,rgba(15,23,42,0.1) 75%)' }} />
            <div style={{ position:'absolute', top:0, bottom:0, left:28, display:'flex', flexDirection:'column', justifyContent:'center' }}>
              <span style={{ display:'inline-block', background:T.red, color:'#fff', fontFamily:sans, fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', padding:'4px 10px', borderRadius:6, marginBottom:10, alignSelf:'flex-start' }}>OFFRE LIMITÉE</span>
              <h2 style={{ fontFamily:serif, fontSize:'clamp(22px,3vw,34px)', color:'#fff', fontWeight:900, margin:'0 0 6px', lineHeight:1.1 }}>Livraison Offerte ce Weekend</h2>
              <p style={{ fontFamily:sans, fontSize:13, color:'rgba(255,255,255,0.7)', margin:'0 0 16px', maxWidth:340 }}>Sur toutes les commandes supérieures à 3 000 FCFA.</p>
              <button style={{ display:'inline-flex', alignItems:'center', gap:7, background:`linear-gradient(135deg,${T.accent},${T.accentD})`, color:'#fff', fontFamily:sans, fontSize:13, fontWeight:700, border:'none', borderRadius:50, padding:'10px 22px', cursor:'pointer', alignSelf:'flex-start', boxShadow:`0 6px 20px ${T.accent}55` }}>
                Commander maintenant <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Cuisines & Catégories */}
          {discoveryCircles.length > 0 && (
            <div style={{ marginBottom:48 }}>
              <h2 style={{ fontFamily:serif, fontSize:22, color:T.dark, fontWeight:900, margin:'0 0 20px' }}>Cuisines &amp; Catégories</h2>
              <div style={{ display:'flex', gap:18, overflowX:'auto', paddingBottom:8 }}>
                {/* Tout */}
                <div onClick={() => setDiscoveryFilter(null)} style={{ cursor:'pointer', textAlign:'center', flexShrink:0 }}>
                  <div style={{ width:72, height:72, borderRadius:'50%', border:`2.5px solid ${!discoveryFilter ? T.accent : T.line}`, marginBottom:7, display:'flex', alignItems:'center', justifyContent:'center', background:!discoveryFilter ? `${T.accent}12` : T.bgAlt, transition:'all .2s' }}>
                    <UtensilsCrossed size={26} color={!discoveryFilter ? T.accent : T.muted} />
                  </div>
                  <p style={{ fontFamily:sans, fontSize:11, color:!discoveryFilter?T.accent:T.muted, fontWeight:700, margin:0 }}>Tout</p>
                </div>
                {discoveryCircles.slice(0, 6).map((cat, i) => {
                  const active = discoveryFilter === cat.nom;
                  return (
                    <div key={cat.id} onClick={() => setDiscoveryFilter(active ? null : cat.nom)} style={{ cursor:'pointer', textAlign:'center', flexShrink:0 }}>
                      <div style={{ width:72, height:72, borderRadius:'50%', overflow:'hidden', border:`2.5px solid ${active?T.accent:T.line}`, marginBottom:7, transition:'border-color .2s' }}>
                        <img src={`https://images.unsplash.com/${FOOD_IMGS[i%FOOD_IMGS.length]}?q=70&w=140&auto=format&fit=crop`} alt={cat.nom}
                          style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      </div>
                      <p style={{ fontFamily:sans, fontSize:11, color:active?T.accent:T.muted, fontWeight:700, margin:0, maxWidth:72, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cat.nom}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Restaurant grid */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
            <h2 style={{ fontFamily:serif, fontSize:24, color:T.dark, fontWeight:900, margin:0 }}>Populaires près de vous</h2>
            <span style={{ fontFamily:sans, fontSize:13, fontWeight:700, color:T.accent }}>
              {visibleRestaurants.length} restaurant{visibleRestaurants.length > 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:24 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ background:T.card, borderRadius:18, overflow:'hidden', boxShadow:T.shadowS }}>
                  <Shimmer h={210} r={0} />
                  <div style={{ padding:'14px 16px 18px' }}>
                    <Shimmer h={20} w="65%" r={6} /><div style={{ height:8 }} />
                    <Shimmer h={14} w="45%" r={6} /><div style={{ height:12 }} />
                    <Shimmer h={36} r={6} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:24 }}>
              {visibleRestaurants.map((r, i) => (
                <RestaurantCard key={r.id} restaurant={r} idx={i} onSelect={handleRestaurantSelect} />
              ))}
              {visibleRestaurants.length === 0 && (
                <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'60px 0' }}>
                  <p style={{ fontFamily:serif, fontSize:20, color:T.muted, fontStyle:'italic' }}>Aucun restaurant trouvé pour « {searchQuery || discoveryFilter} »</p>
                  <button onClick={() => { setSearchQuery(''); setDiscoveryFilter(null); }}
                    style={{ marginTop:16, fontFamily:sans, fontSize:13, fontWeight:700, color:T.accent, background:'none', border:`1.5px solid ${T.accent}`, borderRadius:50, padding:'10px 24px', cursor:'pointer' }}>
                    Voir tous les restaurants
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── MENU MODE ─── */}
      {selectedRestaurantId && selectedRestaurant && (
        <div style={{ maxWidth:1280, margin:'0 auto', padding:'32px 40px 80px' }}>

          {/* Restaurant header */}
          <div style={{ borderRadius:22, overflow:'hidden', marginBottom:32, boxShadow:T.shadow, border:`1px solid ${T.line}` }}>
            <div style={{ height:110, background:'linear-gradient(135deg,#0F172A,#1A0C00)', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', inset:0, opacity:0.08, background:'radial-gradient(circle at 30% 50%,#fff,transparent 60%)' }} />
              <div style={{ position:'relative', zIndex:1, height:'100%', display:'flex', alignItems:'center', gap:20, padding:'0 28px' }}>
                <div style={{ width:60, height:60, borderRadius:16, background:'rgba(255,255,255,0.1)', border:'2px solid rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
                  {restaurantDetails.logoUrl
                    ? <img src={restaurantDetails.logoUrl} alt={restaurantDetails.nom} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : <span style={{ fontSize:28 }}>🍽️</span>}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontFamily:sans, fontSize:10, color:'rgba(255,255,255,0.5)', fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', margin:'0 0 3px' }}>Restaurant sélectionné</p>
                  <h2 style={{ fontFamily:serif, fontSize:24, color:'#fff', fontWeight:800, margin:0, lineHeight:1.15 }}>{restaurantDetails.nom}</h2>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
                  <span style={{ background:restaurantDetails.isOpen?'rgba(34,197,94,0.9)':'rgba(255,59,48,0.9)', borderRadius:20, padding:'5px 12px', fontFamily:sans, fontSize:11, fontWeight:700, color:'#fff' }}>
                    {restaurantDetails.isOpen ? '● Ouvert' : '● Fermé'}
                  </span>
                  <span style={{ background:'rgba(255,255,255,0.1)', borderRadius:20, padding:'5px 12px', fontFamily:sans, fontSize:11, fontWeight:600, color:'#fff', display:'flex', alignItems:'center', gap:5 }}>
                    <Clock size={12} /> {restaurantDetails.estimatedTime}
                  </span>
                  <span style={{ background:'rgba(255,184,0,0.9)', borderRadius:20, padding:'5px 12px', fontFamily:sans, fontSize:11, fontWeight:700, color:'#7A4B00', display:'flex', alignItems:'center', gap:4 }}>
                    <Star size={11} fill="#7A4B00" color="#7A4B00" /> {restaurantDetails.rating.toFixed(1)}/5
                  </span>
                </div>
              </div>
            </div>
            <div style={{ background:T.card, padding:'16px 28px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
              <div>
                <p style={{ fontFamily:sans, fontSize:13, color:T.muted, margin:'0 0 8px', maxWidth:520 }}>{restaurantDetails.description}</p>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {restaurantDetails.address && (
                    <span style={{ background:T.bgAlt, borderRadius:20, padding:'4px 12px', fontFamily:sans, fontSize:11, fontWeight:600, color:T.muted, display:'flex', alignItems:'center', gap:4 }}>
                      <MapPin size={11} color={T.accent} /> {restaurantDetails.address}
                    </span>
                  )}
                  <span style={{ background:T.bgAlt, borderRadius:20, padding:'4px 12px', fontFamily:sans, fontSize:11, color:T.muted }}>
                    {restaurantDetails.reviews} avis
                  </span>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {['Sur place','À emporter','Livraison'].map(m => (
                  <button key={m} onClick={() => setServiceMode(m)}
                    style={{ fontFamily:sans, fontSize:12, fontWeight:600, padding:'8px 16px', borderRadius:50, border:`1.5px solid ${serviceMode===m?T.accent:T.line}`, background:serviceMode===m?T.accent:'transparent', color:serviceMode===m?'#fff':T.muted, cursor:'pointer', transition:'all .2s' }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Categories + Products */}
          <div style={{ display:'flex', gap:28, alignItems:'flex-start' }}>

            {/* Sidebar */}
            <div style={{ width:210, flexShrink:0, position:'sticky', top:140 }}>
              <div style={{ background:T.card, borderRadius:18, padding:16, boxShadow:T.shadowS, border:`1px solid ${T.line}` }}>
                <h3 style={{ fontFamily:serif, fontSize:17, color:T.dark, fontWeight:700, margin:'0 0 4px' }}>Catégories</h3>
                <p style={{ fontFamily:sans, fontSize:11, color:T.muted, margin:'0 0 12px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{restaurantDetails.nom}</p>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  <button onClick={() => setActiveCategory('all')} className="menu-cat"
                    style={{ width:'100%', textAlign:'left', padding:'9px 12px', borderRadius:10, border:'none', fontFamily:sans, fontSize:13, fontWeight:600, cursor:'pointer', transition:'all .18s', background:activeCategory==='all'?T.accent:'transparent', color:activeCategory==='all'?'#fff':T.muted }}>
                    Tout le menu
                  </button>
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className="menu-cat"
                      style={{ width:'100%', textAlign:'left', padding:'9px 12px', borderRadius:10, border:'none', fontFamily:sans, fontSize:13, fontWeight:600, cursor:'pointer', transition:'all .18s', background:activeCategory===cat.id?T.accent:'transparent', color:activeCategory===cat.id?'#fff':T.muted, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{cat.icone?`${cat.icone} `:''}{cat.nom}</span>
                      <span style={{ fontFamily:sans, fontSize:11, fontWeight:700, background:activeCategory===cat.id?'rgba(255,255,255,0.22)':`${T.accent}18`, color:activeCategory===cat.id?'#fff':T.accent, borderRadius:10, padding:'1px 7px', flexShrink:0, marginLeft:6 }}>
                        {cat.articleCount||0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Product grid */}
            <div style={{ flex:1 }}>
              {loading ? (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:20 }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{ background:T.card, borderRadius:18, overflow:'hidden', boxShadow:T.shadowS }}>
                      <Shimmer h={180} r={0} />
                      <div style={{ padding:16 }}>
                        <Shimmer h={18} w="70%" r={6} /><div style={{ height:8 }} />
                        <Shimmer h={12} r={6} /><div style={{ height:8 }} />
                        <Shimmer h={12} w="60%" r={6} /><div style={{ height:16 }} />
                        <Shimmer h={42} r={12} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div style={{ textAlign:'center', padding:'80px 0', background:T.card, borderRadius:18, boxShadow:T.shadowS }}>
                  <UtensilsCrossed size={56} color={T.mutedL} style={{ margin:'0 auto 16px' }} />
                  <h3 style={{ fontFamily:serif, fontSize:20, color:T.muted, fontStyle:'italic', margin:'0 0 12px' }}>Aucun plat trouvé</h3>
                  <p style={{ fontFamily:sans, fontSize:14, color:T.mutedL, margin:0 }}>Modifiez vos critères de recherche.</p>
                </div>
              ) : (
                <>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                    <div>
                      <h3 style={{ fontFamily:serif, fontSize:20, color:T.dark, fontWeight:700, margin:'0 0 3px' }}>Articles disponibles</h3>
                      <p style={{ fontFamily:sans, fontSize:12, color:T.muted, margin:0 }}>
                        {filteredProducts.length} article{filteredProducts.length>1?'s':''}{selectedCategory?` dans ${selectedCategory.nom}`:''}
                      </p>
                    </div>
                    <span style={{ background:`${T.accent}18`, color:T.accent, fontFamily:sans, fontSize:12, fontWeight:700, padding:'6px 14px', borderRadius:50 }}>{serviceMode}</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:20 }}>
                    {filteredProducts.map(product => (
                      <ProductCard key={product.id} product={product} qty={quantities[product.id]||1}
                        onAdd={handleQuickAdd} onCustomize={setSelectedProduct}
                        onIncrement={incrementQuantity} onDecrement={decrementQuantity} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedProduct && (
        <ProductCustomizationModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={handleAddToCart} />
      )}

      {/* Floating cart bar */}
      {cartCount > 0 && (
        <div style={{ position:'fixed', bottom:24, left:'50%', zIndex:40, width:'min(520px,calc(100vw - 32px))', animation:'cartSlideUp 0.3s cubic-bezier(0.32,0.72,0,1)', transform:'translateX(-50%)' }}>
          <button onClick={() => setCartOpen(true)}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#0F172A', color:'#fff', border:'none', borderRadius:16, padding:'14px 18px', cursor:'pointer', boxShadow:'0 8px 32px rgba(17,16,13,0.45)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ background:T.accent, borderRadius:10, padding:'6px 10px', fontWeight:900, fontSize:13, fontFamily:sans }}>{cartCount}</div>
              <div style={{ textAlign:'left' }}>
                <p style={{ fontSize:11, color:'rgba(255,255,255,0.55)', margin:'0 0 1px', fontWeight:600, fontFamily:sans }}>{cartRestaurantName||'Mon panier'}</p>
                <p style={{ fontSize:13, fontWeight:700, color:'#fff', margin:0, fontFamily:sans }}>Voir mon panier</p>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontFamily:serif, fontSize:16, fontWeight:900, color:T.accentL }}>{formatFCFA(cartTotal())}</span>
              <ChevronRight size={16} color="rgba(255,255,255,0.5)" />
            </div>
          </button>
        </div>
      )}

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
