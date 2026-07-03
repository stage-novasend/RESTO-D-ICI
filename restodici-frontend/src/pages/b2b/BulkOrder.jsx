// src/pages/b2b/BulkOrder.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, MapPin, Clock, Search, CheckCircle,
  AlertCircle, Loader2, Navigation, Users,
  Star, Store, Phone, Trash2, ShoppingBag, X, Plus, Minus, UtensilsCrossed,
} from 'lucide-react';
import { menuAPI, b2bAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import DeliveryMap from '../../components/maps/DeliveryMap';
import { formatFCFA } from '../../utils/formatters';
import { getArticleImage } from '../../utils/articleImage';
import B2BOnboardingWizard from './B2BOnboardingWizard';

const A  = '#EA580C';
const AL = '#FFF0DF';
const SF = '#F9F7F5';
const BD = 'rgba(89,67,42,0.10)';

/* ── Tokens visuels partagés avec menu.jsx ─────────────────────────────────── */
const C = {
  bg: '#F4F4F4', card: '#FFFFFF', accent: '#EA580C',
  aD: '#C2410C', aL: '#FFF3E0', yellow: '#FFB800',
  dark: '#1C1C1E', text: '#3D3D3D', muted: '#8A8A8A',
  faint: '#C5C5C5', line: '#EBEBEB', green: '#22C55E',
  sh: '0 1px 8px rgba(0,0,0,0.07)',
  shL: '0 12px 40px rgba(0,0,0,0.14)',
};
const sans = "'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif";

const FOOD_IMGS = [
  'photo-1665332195309-9d75071138f0','photo-1665400808116-f0e6339b7e9a',
  'photo-1664993101841-036f189719b6','photo-1664992960082-0ea299a9c53e',
  'photo-1665333048952-a3ee97714c6b','photo-1665332305771-e49a5dd5ba80',
  'photo-1665334217407-6688e6941a47','photo-1665332561290-cc6757172890',
];
const fallback = (i, w = 480) =>
  `https://images.unsplash.com/${FOOD_IMGS[i % FOOD_IMGS.length]}?q=80&w=${w}&auto=format&fit=crop`;

const catEmoji = (name = '') => {
  const k = name.toLowerCase();
  const MAP = { pizza:'🍕', burger:'🍔', sushi:'🍣', tacos:'🌮', poulet:'🍗',
    poisson:'🐟', riz:'🍚', salade:'🥗', dessert:'🍰', boisson:'🥤',
    brochette:'🥩', sandwich:'🥪', plat:'🍽️' };
  for (const [w, e] of Object.entries(MAP)) if (k.includes(w)) return e;
  return '🍽️';
};

/* ── Carte restaurant B2B — même visuel que menu.jsx ────────────────────────── */
function B2BRestaurantCard({ restaurant, idx, isActive, onSelect }) {
  const [hov, setHov] = useState(false);
  const img = restaurant.logo || fallback(idx, 480);
  const note = Number(restaurant.noteMoyenne);
  const rating = note > 0 ? note.toFixed(1) : null;

  return (
    <div
      onClick={() => onSelect(restaurant.id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: C.card, borderRadius: 20,
        boxShadow: isActive ? C.shL : hov ? C.shL : C.sh,
        overflow: 'hidden', cursor: 'pointer',
        transform: hov ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
        outline: isActive ? `2.5px solid ${C.accent}` : 'none',
        outlineOffset: 2,
      }}
    >
      {/* Cover image */}
      <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
        <img src={img} alt={restaurant.nom}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            transform: hov ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.4s ease' }}
          onError={e => { e.target.src = fallback(idx, 480); }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.52) 0%, transparent 55%)' }} />
        <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 800, background: 'rgba(255,255,255,0.95)', color: C.dark, borderRadius: 99, padding: '3px 8px', boxShadow: C.sh }}>
            🤝 Partenaire B2B
          </span>
          {isActive && (
            <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 800, background: C.accent, color: '#fff', borderRadius: 99, padding: '3px 8px' }}>
              ✓ Sélectionné
            </span>
          )}
        </div>
        <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {rating ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: sans, fontSize: 12, fontWeight: 700, color: '#fff' }}>
              <Star size={12} fill={C.yellow} color={C.yellow} /> {rating}
              {restaurant.nbAvis > 0 && <span style={{ fontSize: 10, opacity: 0.8 }}>({restaurant.nbAvis})</span>}
            </span>
          ) : <span />}
          {restaurant.estimatedTime ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: sans, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
              <Clock size={11} color="rgba(255,255,255,0.8)" /> {restaurant.estimatedTime}
            </span>
          ) : <span />}
        </div>
      </div>
      {/* Card body */}
      <div style={{ padding: '12px 14px 14px' }}>
        <p style={{ margin: '0 0 4px', fontFamily: sans, fontSize: 15, fontWeight: 800, color: C.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {restaurant.nom}
        </p>
        <p style={{ margin: '0 0 10px', fontFamily: sans, fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {restaurant.adresse || 'Restaurant partenaire'}
        </p>
        <button style={{
          width: '100%', padding: '10px', borderRadius: 12, border: 'none',
          background: isActive ? `linear-gradient(135deg,${C.aD},${C.accent})` : `linear-gradient(135deg,${C.accent},${C.aD})`,
          color: '#fff', fontFamily: sans, fontSize: 13, fontWeight: 800,
          cursor: 'pointer', boxShadow: `0 4px 14px ${C.accent}44`, transition: 'all 0.15s',
        }}>
          {isActive ? '✓ Menu affiché' : 'Voir le menu →'}
        </button>
      </div>
    </div>
  );
}

/* ── Carte produit B2B — même layout horizontal que menu.jsx ────────────────── */
function B2BProductCard({ product, idx, qty, assignedNames, onOpen, onRemove }) {
  const img = getArticleImage(product) || fallback(idx, 200);
  const isAvail = product.disponible !== false;

  return (
    <div style={{
      background: C.card, borderRadius: 16, boxShadow: C.sh,
      display: 'flex', alignItems: 'center', gap: 0,
      opacity: isAvail ? 1 : 0.6, overflow: 'hidden',
      outline: qty > 0 ? `2px solid ${C.accent}66` : 'none',
    }}>
      {/* Image */}
      <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
        <img src={img} alt={product.nom}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.src = fallback(idx, 200); }}
        />
        {!isAvail && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: sans, fontSize: 9, fontWeight: 800, color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '3px 7px', borderRadius: 99 }}>Rupture</span>
          </div>
        )}
        {qty > 0 && (
          <div style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 900, color: '#fff' }}>{qty}</span>
          </div>
        )}
      </div>
      {/* Infos */}
      <div style={{ flex: 1, padding: '10px 12px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <p style={{ margin: 0, fontFamily: sans, fontSize: 14, fontWeight: 800, color: C.dark, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {product.nom}
        </p>
        {product.description && (
          <p style={{ margin: 0, fontFamily: sans, fontSize: 12, color: C.muted, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {product.description}
          </p>
        )}
        <span style={{ fontFamily: sans, fontSize: 15, fontWeight: 900, color: C.accent }}>
          {formatFCFA(product.prixClient ?? product.prix)}
        </span>
        {assignedNames && (
          <p style={{ margin: 0, fontFamily: sans, fontSize: 11, fontWeight: 600, color: C.aD, background: C.aL, borderRadius: 6, padding: '2px 6px' }}>
            👥 {assignedNames}
          </p>
        )}
      </div>
      {/* Action B2B */}
      <div style={{ padding: '0 12px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <button
          onClick={() => isAvail && onOpen()}
          disabled={!isAvail}
          style={{
            width: qty > 0 ? 'auto' : 36, height: qty > 0 ? 'auto' : 36,
            padding: qty > 0 ? '6px 10px' : 0,
            borderRadius: qty > 0 ? 10 : '50%', border: 'none',
            background: isAvail ? `linear-gradient(135deg,${C.accent},${C.aD})` : C.line,
            color: isAvail ? '#fff' : C.muted,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: isAvail ? 'pointer' : 'not-allowed',
            boxShadow: isAvail ? `0 3px 12px ${C.accent}55` : 'none',
            fontFamily: sans, fontSize: 11, fontWeight: 700, gap: 4,
          }}
        >
          {qty > 0 ? <><Users size={12} /> Modifier</> : <Users size={15} />}
        </button>
        {qty > 0 && (
          <button onClick={onRemove}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: sans, fontSize: 10, color: '#EF4444', fontWeight: 600, padding: 0 }}>
            Retirer
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Onglets de catégories B2B ───────────────────────────────────────────────── */
function B2BCategoryTabs({ cats, active, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const btn = ref.current.querySelector(`[data-cat="${active}"]`);
    if (btn) btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [active]);
  return (
    <div ref={ref} style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px', scrollbarWidth: 'none' }}>
      {cats.map(cat => {
        const isA = cat.id === active;
        return (
          <button key={cat.id} data-cat={cat.id} onClick={() => onChange(cat.id)}
            style={{
              flexShrink: 0, padding: '7px 16px', borderRadius: 99, border: 'none',
              background: isA ? C.accent : C.card, color: isA ? '#fff' : C.text,
              fontFamily: sans, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: C.sh, transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}>
            {catEmoji(cat.nom)} {cat.nom}
            {cat.articleCount > 0 && <span style={{ marginLeft: 5, fontSize: 11, fontWeight: 600, opacity: 0.75 }}>({cat.articleCount})</span>}
          </button>
        );
      })}
    </div>
  );
}

const STEPS = ['Choisir les plats', 'Livraison & lieu', 'Confirmer'];

// ── helpers ───────────────────────────────────────────────────────────────────
const getMinDatetime = () => {
  // +1 min ensures the truncated HH:MM value always passes the strict "≥ 4h" backend check
  const d = new Date(Date.now() + (4 * 60 + 1) * 60 * 1000);
  return { minDate: d.toISOString().slice(0, 10), minTime: d.toTimeString().slice(0, 5) };
};

const getDeliveryLabel = (dateStr, timeStr) => {
  try {
    return new Date(`${dateStr}T${timeStr}`).toLocaleString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    });
  } catch { return `${dateStr} à ${timeStr}`; }
};

function buildDynamicCategories(menuData, categoryList) {
  const map = new Map();
  (Array.isArray(categoryList) ? categoryList : []).forEach(c => {
    if (c?.id) map.set(c.id, { ...c, articleCount: 0 });
  });
  (Array.isArray(menuData) ? menuData : []).forEach(p => {
    const cid = p.categorieId || p.categorie?.id;
    if (!cid) return;
    const ex = map.get(cid);
    map.set(cid, {
      id: cid,
      nom: ex?.nom || p.categorie?.nom || 'Catégorie',
      icone: ex?.icone || p.categorie?.icone || '',
      articleCount: (ex?.articleCount || 0) + 1,
    });
  });
  return Array.from(map.values()).sort((a, b) => a.nom.localeCompare(b.nom));
}

function getAllergenIcons(product) {
  const al = (product.allergene || product.allergènes || product.allergenes || '').toString().toLowerCase();
  const icons = [];
  if (al.includes('arachide') || al.includes('noix')) icons.push('🥜');
  if (al.includes('piment') || al.includes('épicé') || product.epice) icons.push('🌶️');
  if (icons.length === 0 && al) icons.push('⚠️');
  return icons;
}

// ── Step bar ─────────────────────────────────────────────────────────────────
function StepBar({ current }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center flex-1">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all"
                style={{ background: done ? '#16A34A' : active ? A : '#E5E7EB', color: (done || active) ? '#fff' : '#6B7280' }}>
                {done ? '✓' : i + 1}
              </div>
              <span className="text-xs font-semibold hidden sm:block" style={{ color: active ? A : done ? '#16A34A' : '#6B7280' }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 mx-2 h-0.5 rounded-full transition-all"
                style={{ background: done ? '#16A34A' : '#E5E7EB' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BulkOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'schedule'; // 'instant' | 'schedule'
  const { user } = useAuth();
  const uid = user?.id;

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Compte B2B check ─────────────────────────────────────────────────────
  const [compte, setCompte] = useState(undefined); // undefined = loading, null = missing

  useEffect(() => {
    b2bAPI.getCompte()
      .then(r => setCompte(r.data?.id ? r.data : null))
      .catch(() => setCompte(null));
  }, []);

  // ── Restaurant + menu state ───────────────────────────────────────────────
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [menuData, setMenuData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [restaurantDetails, setRestaurantDetails] = useState({ nom: '', logoUrl: '', isOpen: true, estimatedTime: '', rating: 0, address: '', phone: '' });
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(false);

  // ── B2B-specific state ────────────────────────────────────────────────────
  const [collaborateurs, setCollaborateurs] = useState([]);
  // panier: { articleId → { article, members: { [collabId|'libre']: qty } } }
  const [panier, setPanier] = useState({});
  // pickerArticle: article currently open in the member-assignment popover
  const [pickerArticle, setPickerArticle] = useState(null);
  const [pickerMembers, setPickerMembers] = useState({}); // { [collabId|'libre']: qty }

  // ── Delivery state ────────────────────────────────────────────────────────
  const [livraison, setLivraison] = useState(() => {
    const { minDate, minTime } = getMinDatetime();
    return { dateLivraison: minDate, heureLivraison: minTime, lieuLivraison: '', adresseLivraison: '' };
  });
  const deliveryLabel = getDeliveryLabel(livraison.dateLivraison, livraison.heureLivraison);
  const [mapPos, setMapPos] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  // ── Debounce search ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const [timeRefreshed, setTimeRefreshed] = useState(false);

  // ── Auto-refresh delivery time in instant mode (handles slow form fill) ──
  useEffect(() => {
    if (mode !== 'instant') return;
    const id = setInterval(() => {
      const { minDate, minTime } = getMinDatetime();
      setLivraison(prev => ({ ...prev, dateLivraison: minDate, heureLivraison: minTime }));
      setTimeRefreshed(true);
      setTimeout(() => setTimeRefreshed(false), 3000);
    }, 30_000);
    return () => clearInterval(id);
  }, [mode]);

  // ── Load restaurants + collabs ────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingRestaurants(true);
      try {
        const [restRes, collabRes] = await Promise.allSettled([
          menuAPI.getRestaurants(),
          b2bAPI.getCollaborateurs(),
        ]);
        const list = restRes.status === 'fulfilled' ? (restRes.value.data || []) : [];
        setRestaurants(list);
        if (list.length > 0) setSelectedRestaurantId(list[0].id);
        setCollaborateurs(collabRes.status === 'fulfilled' ? (collabRes.value.data || []) : []);
      } catch { /* ignore */ }
      finally { setLoadingRestaurants(false); }
    };
    void load();
  }, []);

  // ── Load menu when restaurant changes ─────────────────────────────────────
  useEffect(() => {
    if (!selectedRestaurantId) return;
    const load = async () => {
      setLoadingMenu(true);
      setMenuData([]);
      setCategories([]);
      setActiveCategory('all');
      try {
        const [menuRes, catRes] = await Promise.allSettled([
          menuAPI.getByRestaurant(selectedRestaurantId, { cible: 'CLIENT' }),
          menuAPI.getCategories({ restaurantId: selectedRestaurantId }),
        ]);
        const mData = menuRes.status === 'fulfilled' ? (menuRes.value.data || []) : [];
        const catList = catRes.status === 'fulfilled' ? (catRes.value.data || []) : [];
        setMenuData(mData);
        setCategories(buildDynamicCategories(mData, catList));

        const info = mData[0]?.restaurant || {};
        const selectedR = restaurants.find(r => r.id === selectedRestaurantId) || {};
        setRestaurantDetails({
          nom: info.nom || mData[0]?.restaurantNom || selectedR.nom || 'Restaurant',
          logoUrl: info.logoUrl || selectedR.logo || '',
          isOpen: typeof info.ouvert === 'boolean' ? info.ouvert : true,
          estimatedTime: info.delaiLivraison || '',
          rating: parseFloat(selectedR.noteMoyenne || info.noteMoyenne || 0) || 0,
          address: info.adresse || selectedR.adresse || '',
          phone: info.telephone || selectedR.telephone || '',
        });
      } catch { /* ignore */ }
      finally { setLoadingMenu(false); }
    };
    void load();
  }, [selectedRestaurantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Panier helpers ────────────────────────────────────────────────────────
  const getArticleQty = (articleId) => {
    const entry = panier[articleId];
    if (!entry) return 0;
    return Object.values(entry.members).reduce((s, q) => s + q, 0);
  };

  const openPicker = (article) => {
    if (article.disponible === false) return;
    setPickerArticle(article);
    setPickerMembers(panier[article.id]?.members || {});
  };

  const applyPicker = () => {
    if (!pickerArticle) return;
    const totalQty = Object.values(pickerMembers).reduce((s, q) => s + q, 0);
    if (totalQty === 0) {
      // Remove article from cart if all zeroed out
      setPanier(prev => { const { [pickerArticle.id]: _, ...rest } = prev; return rest; });
    } else {
      setPanier(prev => ({
        ...prev,
        [pickerArticle.id]: { article: pickerArticle, members: { ...pickerMembers } },
      }));
    }
    setPickerArticle(null);
    setPickerMembers({});
  };

  const deleteFromCart = (articleId) => {
    setPanier(prev => { const { [articleId]: _, ...rest } = prev; return rest; });
  };

  // Monthly spend already consumed per collaborator (from their data)
  const getMemberSpent = (collabId) => {
    const c = collaborateurs.find(x => x.id === collabId);
    return Number(c?.depenseActuelle || c?.depenses || 0);
  };
  const getMemberBudget = (collabId) => {
    const c = collaborateurs.find(x => x.id === collabId);
    return Number(c?.limiteBudget || c?.budgetMax || 0);
  };

  // Budget already committed in cart (excluding pickerMembers for live preview)
  const getCartSpend = (collabId) => {
    return Object.values(panier).reduce((total, entry) => {
      if (!entry.members[collabId]) return total;
      return total + entry.members[collabId] * Number(entry.article.prixClient ?? (entry.article.prix || 0));
    }, 0);
  };

  // Lines to submit: one ligne per (article, member) pair
  const buildLignes = () => {
    const lines = [];
    Object.values(panier).forEach(({ article, members }) => {
      Object.entries(members).forEach(([collabId, qty]) => {
        if (qty <= 0) return;
        lines.push({
          articleId: article.id,
          nomArticle: article.nom,
          quantite: qty,
          prixUnitaire: Number(article.prixClient ?? (article.prix || 0)),
          collaborateurId: collabId === 'libre' ? undefined : collabId,
        });
      });
    });
    return lines;
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const panierItems = Object.values(panier);
  const totalCouverts = panierItems.reduce((s, i) =>
    s + Object.values(i.members).reduce((ms, q) => ms + q, 0), 0);
  const totalEstime = panierItems.reduce((s, i) =>
    s + Object.values(i.members).reduce((ms, q) => ms + q, 0) * Number(i.article.prixClient ?? (i.article.prix || 0)), 0);

  // Per-member totals for recap
  const memberTotals = collaborateurs.reduce((acc, c) => {
    const cartSpend = getCartSpend(c.id);
    if (cartSpend > 0) acc[c.id] = cartSpend;
    return acc;
  }, {});

  const filteredProducts = useMemo(() => {
    let list = [...menuData];
    if (activeCategory !== 'all') list = list.filter(p => p.categorieId === activeCategory || p.categorie?.id === activeCategory);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(p => p.nom?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.categorie?.nom?.toLowerCase().includes(q));
    }
    return list;
  }, [menuData, activeCategory, debouncedSearch]);

  // ── Geolocation ───────────────────────────────────────────────────────────
  const handleMyLocation = () => {
    if (!navigator.geolocation) { setLocError('Géolocalisation non disponible'); return; }
    setLocating(true); setLocError('');
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        setMapPos({ lat, lng });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fr`, { headers: { 'Accept-Language': 'fr' } });
          const d = await res.json();
          setLivraison(p => ({ ...p, lieuLivraison: d.address?.suburb || d.address?.city || 'Ma position', adresseLivraison: d.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}` }));
        } catch {
          setLivraison(p => ({ ...p, lieuLivraison: 'Ma position', adresseLivraison: `${lat.toFixed(4)}, ${lng.toFixed(4)}` }));
        } finally { setLocating(false); }
      },
      () => { setLocError("Impossible d'obtenir votre position"); setLocating(false); }
    );
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validateStep0 = () => { if (panierItems.length === 0) { setError('Sélectionnez au moins un plat'); return false; } setError(''); return true; };
  const validateStep1 = () => {
    if (!livraison.dateLivraison || !livraison.heureLivraison) { setError('Date et heure requises'); return false; }
    if (!livraison.lieuLivraison.trim()) { setError('Lieu de livraison requis'); return false; }
    if (new Date(`${livraison.dateLivraison}T${livraison.heureLivraison}`) < new Date(Date.now() + 4 * 60 * 60 * 1000)) { setError('Délai minimum 4 heures avant livraison'); return false; }
    setError(''); return true;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true); setError('');
    try {
      const result = await b2bAPI.createCommandeGroupee({
        dateLivraison: livraison.dateLivraison,
        heureLivraison: livraison.heureLivraison,
        lieuLivraison: livraison.lieuLivraison,
        adresseLivraison: livraison.adresseLivraison || livraison.lieuLivraison,
        lignes: buildLignes(),
      });
      const orderId = result?.data?.id || result?.id;
      setSuccess('Commande enregistrée ! Le restaurant a été notifié.');
      setTimeout(() => navigate(orderId ? `/b2b/suivi/${orderId}` : '/b2b'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la commande');
    } finally { setSubmitting(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  const selectedRestaurant = restaurants.find(r => r.id === selectedRestaurantId) || null;

  // Compte loading
  if (compte === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: SF }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: A }} />
      </div>
    );
  }

  // No compte → show wizard
  if (compte === null) {
    return (
      <B2BOnboardingWizard
        user={user}
        onComplete={(action) => {
          if (uid) localStorage.setItem(`b2b_onboarded_${uid}`, '1');
          // Reload compte then continue
          b2bAPI.getCompte()
            .then(r => setCompte(r.data?.id ? r.data : null))
            .catch(() => {});
          if (action === 'order') {
            // Stay on this page and reload compte
          } else {
            navigate('/b2b');
          }
        }}
      />
    );
  }

  const prix = Number(pickerArticle?.prixClient ?? (pickerArticle?.prix || 0));
  const totalPickerQty = Object.values(pickerMembers).reduce((s, q) => s + q, 0);
  const activeCollabs = collaborateurs.filter(c => c.actif !== false);
  const pickerRows = pickerArticle ? [
    ...activeCollabs,
    { id: 'libre', nom: 'Sans attribution', limiteBudget: 0, depenseActuelle: 0 },
  ] : [];

  return (
    <>
    <div className="min-h-screen" style={{ background: SF }}>

      {/* ── Top nav ──────────────────────────────────────────────────────── */}
      <header className="bg-white border-b sticky top-0 z-20" style={{ borderColor: BD }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/b2b')}
            className="w-9 h-9 rounded-xl border flex items-center justify-center text-[#6B7280] hover:text-[#111827] transition shrink-0"
            style={{ borderColor: BD }}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#6B7280]">
              {mode === 'instant' ? '⚡ Commande express — livraison aujourd\'hui' : '📅 Commande planifiée'}
            </p>
            <p className="text-sm font-extrabold text-[#111827] leading-none">{STEPS[step]}</p>
          </div>
          {totalCouverts > 0 && (
            <div className="shrink-0 text-right">
              <p className="text-xs text-[#6B7280]">{totalCouverts} couvert{totalCouverts > 1 ? 's' : ''}</p>
              <p className="text-sm font-extrabold" style={{ color: A }}>{totalEstime.toLocaleString('fr-FR')} FCFA</p>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <StepBar current={step} />

        {/* ── STEP 0 — Restaurant + menu explorer (même visuel que menu.jsx) ── */}
        {step === 0 && (
          <>
            {/* Hero banner */}
            <div style={{
              background: `linear-gradient(135deg, ${C.accent} 0%, ${C.aD} 100%)`,
              borderRadius: 20, padding: 'clamp(16px,4vw,28px)', marginBottom: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: `0 8px 32px ${C.accent}44`, overflow: 'hidden', position: 'relative',
            }}>
              <div style={{ position: 'absolute', right: -20, top: -20, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ position: 'relative' }}>
                <p style={{ margin: '0 0 6px', fontFamily: sans, fontSize: 'clamp(15px,4vw,20px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>
                  Commande groupée B2B
                </p>
                <p style={{ margin: 0, fontFamily: sans, fontSize: 13, color: 'rgba(255,255,255,0.82)' }}>
                  {restaurants.length > 0 ? `${restaurants.length} partenaire${restaurants.length > 1 ? 's' : ''} disponible${restaurants.length > 1 ? 's' : ''}` : 'Chargement…'}
                </p>
              </div>
              <div style={{ fontSize: 'clamp(32px,7vw,52px)', position: 'relative', flexShrink: 0 }}>🤝</div>
            </div>

            {/* Search bar */}
            <div style={{ position: 'relative', marginBottom: 24 }}>
              <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.accent, pointerEvents: 'none' }} />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un plat, une catégorie…"
                style={{ width: '100%', boxSizing: 'border-box', borderRadius: 99, border: `1px solid ${C.line}`, paddingLeft: 44, paddingRight: search ? 40 : 16, paddingTop: 12, paddingBottom: 12, fontFamily: sans, fontSize: 14, background: C.card, outline: 'none', boxShadow: C.sh }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex' }}>
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Restaurant grid */}
            {loadingRestaurants ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', border: `4px solid ${C.accent}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : restaurants.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', background: '#FFF7ED', borderRadius: 16 }}>
                <UtensilsCrossed size={48} style={{ marginBottom: 12, color: '#EA580C', opacity: 0.4 }} />
                <p style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>Aucun restaurant disponible</p>
                <p style={{ fontFamily: sans, fontSize: 13, color: '#94A3B8', margin: 0 }}>Aucun restaurant partenaire n'est disponible pour le moment.</p>
              </div>
            ) : (
              <>
                {/* Grille restaurants — même design que menu.jsx */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
                  {restaurants.map((r, i) => (
                    <B2BRestaurantCard key={r.id} restaurant={r} idx={i}
                      isActive={r.id === selectedRestaurantId}
                      onSelect={id => { setSelectedRestaurantId(id); setSearch(''); setActiveCategory('all'); }}
                    />
                  ))}
                </div>

                {/* Menu du restaurant sélectionné */}
                {selectedRestaurant && (
                  <>
                    {/* Bannière restaurant — même design que menu.jsx */}
                    <div style={{ background: C.card, borderBottom: `1px solid ${C.line}`, boxShadow: C.sh, borderRadius: '16px 16px 0 0', marginBottom: 0 }}>
                      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{ width: 60, height: 60, borderRadius: 14, overflow: 'hidden', flexShrink: 0, background: C.bg }}>
                            <img src={restaurantDetails.logoUrl || fallback(0, 120)} alt={restaurantDetails.nom}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              onError={e => { e.target.src = fallback(0, 120); }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: '0 0 4px', fontFamily: sans, fontSize: 17, fontWeight: 900, color: C.dark, letterSpacing: '-0.02em' }}>
                              {restaurantDetails.nom}
                            </p>
                            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                              {restaurantDetails.rating > 0 ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: sans, fontSize: 12, color: C.muted }}>
                                  <Star size={12} fill={C.yellow} color={C.yellow} />
                                  {restaurantDetails.rating.toFixed(1)}
                                  {selectedRestaurant.nbAvis > 0 && <span style={{ fontSize: 11, opacity: 0.7 }}>({selectedRestaurant.nbAvis})</span>}
                                </span>
                              ) : null}
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: sans, fontSize: 12, color: C.muted }}>
                                <Clock size={12} color={C.muted} /> {restaurantDetails.estimatedTime}
                              </span>
                              {restaurantDetails.address && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: sans, fontSize: 12, color: C.muted }}>
                                  <MapPin size={12} color={C.muted} /> {restaurantDetails.address}
                                </span>
                              )}
                            </div>
                          </div>
                          {totalCouverts > 0 && (
                            <div style={{ flexShrink: 0, textAlign: 'right' }}>
                              <p style={{ margin: 0, fontFamily: sans, fontSize: 12, color: C.muted }}>Sélection</p>
                              <p style={{ margin: 0, fontFamily: sans, fontSize: 15, fontWeight: 900, color: C.accent }}>{totalCouverts} plat{totalCouverts > 1 ? 's' : ''}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Onglets catégories */}
                      <div style={{ paddingBottom: 12, paddingTop: 4 }}>
                        {loadingMenu ? (
                          <div style={{ display: 'flex', gap: 8, padding: '0 20px' }}>
                            {[...Array(4)].map((_, i) => (
                              <div key={i} style={{ width: 80, height: 34, borderRadius: 99, background: 'linear-gradient(90deg,#EBEBEB 25%,#F5F5F5 50%,#EBEBEB 75%)', backgroundSize: '200% 100%' }} />
                            ))}
                          </div>
                        ) : (
                          <B2BCategoryTabs
                            cats={[{ id: 'all', nom: 'Tout voir', articleCount: menuData.length }, ...categories]}
                            active={activeCategory}
                            onChange={setActiveCategory}
                          />
                        )}
                      </div>
                    </div>

                    {/* Error */}
                    {error && (
                      <div style={{ margin: '12px 0', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                        <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0 }} />
                        <p style={{ margin: 0, fontFamily: sans, fontSize: 13, color: '#B91C1C' }}>{error}</p>
                      </div>
                    )}

                    {/* Liste plats — même layout horizontal que menu.jsx */}
                    <div style={{ background: C.bg, borderRadius: '0 0 16px 16px', padding: '20px clamp(12px,4vw,20px)', marginBottom: 90 }}>
                      {loadingMenu ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {[...Array(5)].map((_, i) => (
                            <div key={i} style={{ background: C.card, borderRadius: 16, overflow: 'hidden', display: 'flex', height: 100 }}>
                              <div style={{ width: 100, height: 100, background: '#EBEBEB', flexShrink: 0 }} />
                              <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                                <div style={{ width: '65%', height: 14, borderRadius: 4, background: '#EBEBEB' }} />
                                <div style={{ width: '45%', height: 11, borderRadius: 4, background: '#EBEBEB' }} />
                                <div style={{ width: '30%', height: 16, borderRadius: 6, background: '#EBEBEB' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : filteredProducts.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', textAlign: 'center', background: '#FFF7ED', borderRadius: 12 }}>
                          <ShoppingBag size={48} style={{ marginBottom: 12, color: '#EA580C', opacity: 0.4 }} />
                          <p style={{ fontFamily: sans, fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Aucun article disponible</p>
                          <p style={{ fontFamily: sans, fontSize: 12, color: '#94A3B8', margin: 0 }}>Essayez une autre catégorie ou modifiez votre recherche.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {filteredProducts.map((product, i) => {
                            const qty = getArticleQty(product.id);
                            const assignedNames = qty > 0 && panier[product.id]
                              ? Object.entries(panier[product.id].members)
                                  .filter(([, q]) => q > 0)
                                  .map(([cid, q]) => {
                                    const collab = collaborateurs.find(x => x.id === cid);
                                    return `${collab ? collab.nom.split(' ')[0] : 'Libre'} ×${q}`;
                                  }).join(', ')
                              : '';
                            return (
                              <B2BProductCard key={product.id} product={product} idx={i}
                                qty={qty} assignedNames={assignedNames}
                                onOpen={() => openPicker(product)}
                                onRemove={() => deleteFromCart(product.id)}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Barre flottante */}
                    {totalCouverts > 0 && (
                      <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 30, width: '100%', maxWidth: 400, padding: '0 16px', boxSizing: 'border-box' }}>
                        <button onClick={() => { if (validateStep0()) setStep(1); }}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 20, padding: '14px 20px', background: C.accent, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: `0 8px 32px ${C.accent}88`, fontFamily: sans, fontWeight: 800, fontSize: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ShoppingBag size={18} />
                            <span>{totalCouverts} plat{totalCouverts > 1 ? 's' : ''} · {formatFCFA(totalEstime)}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            Livraison <ArrowRight size={16} />
                          </div>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Bouton continuer quand pas encore de sélection */}
            {totalCouverts === 0 && selectedRestaurant && (
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => { if (validateStep0()) setStep(1); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, border: 'none', background: C.accent, color: '#fff', fontFamily: sans, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                  Continuer <ArrowRight size={16} />
                </button>
              </div>
            )}
            {error && totalCouverts === 0 && (
              <p style={{ marginTop: 8, fontFamily: sans, fontSize: 13, color: '#EF4444', fontWeight: 600, textAlign: 'right' }}>{error}</p>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════
            STEP 1 — Livraison & lieu
        ════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left: delivery form */}
            <div className="lg:col-span-2 space-y-5">

              {/* Date / heure */}
              <div className="bg-white rounded-2xl border p-5" style={{ borderColor: BD }}>
                <h3 className="font-bold text-[#111827] mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: A }} />
                  {mode === 'instant' ? 'Livraison aujourd\'hui' : 'Choisissez votre créneau'}
                </h3>

                {mode === 'instant' ? (
                  /* Mode instant — date verrouillée, heure auto */
                  <div className="rounded-xl p-4 flex items-center gap-3"
                    style={{ background: '#FFF7ED', border: '1px solid #FDBA74' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: A }}>
                      <span className="text-white text-lg">⚡</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{ color: '#92400E' }}>Commande express</p>
                      <p className="text-xs mt-0.5" style={{ color: '#B45309' }}>
                        Livraison prévue le <strong style={{ color: '#92400E' }}>{deliveryLabel}</strong>
                      </p>
                    </div>
                    <div className="shrink-0">
                      <input type="hidden" value={livraison.dateLivraison} />
                      <input type="hidden" value={livraison.heureLivraison} />
                    </div>
                  </div>
                ) : (
                  /* Mode schedule — date et heure éditables */
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#374151] mb-1.5">📅 Date *</label>
                      <input type="date" min={minDate} value={livraison.dateLivraison}
                        onChange={e => setLivraison(p => ({ ...p, dateLivraison: e.target.value }))}
                        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: SF, border: `1px solid ${BD}` }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#374151] mb-1.5">🕐 Heure *</label>
                      <input type="time" value={livraison.heureLivraison}
                        onChange={e => setLivraison(p => ({ ...p, heureLivraison: e.target.value }))}
                        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: SF, border: `1px solid ${BD}` }} />
                    </div>
                  </div>
                )}
                {timeRefreshed && mode === 'instant' && (
                  <p className="text-[11px] mt-1.5 font-medium" style={{ color: '#B45309' }}>
                    Heure de livraison mise à jour automatiquement.
                  </p>
                )}
                <p className="text-[11px] text-[#6B7280] mt-2">
                  {mode === 'instant'
                    ? 'Heure calculée automatiquement — délai minimum 4 heures.'
                    : 'Délai minimum 4 heures entre la commande et la livraison.'}
                </p>
              </div>

              {/* Lieu de livraison + map */}
              <div className="bg-white rounded-2xl border p-5" style={{ borderColor: BD }}>
                <h3 className="font-bold text-[#111827] mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4" style={{ color: A }} /> Lieu de livraison
                </h3>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1.5">Nom du lieu *</label>
                    <input type="text" placeholder="Ex : Plateau, Zone 4, Cocody…"
                      value={livraison.lieuLivraison}
                      onChange={e => setLivraison(p => ({ ...p, lieuLivraison: e.target.value }))}
                      className="w-full rounded-xl px-4 py-2.5 text-sm outline-none" style={{ background: SF, border: `1px solid ${BD}` }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1.5">Adresse complète</label>
                    <input type="text" placeholder="Immeuble, étage, repères…"
                      value={livraison.adresseLivraison}
                      onChange={e => setLivraison(p => ({ ...p, adresseLivraison: e.target.value }))}
                      className="w-full rounded-xl px-4 py-2.5 text-sm outline-none" style={{ background: SF, border: `1px solid ${BD}` }} />
                  </div>
                </div>

                {/* Geoloc button */}
                <button onClick={handleMyLocation} disabled={locating}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition mb-4"
                  style={{ borderColor: A, color: A, opacity: locating ? 0.6 : 1 }}>
                  {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                  {locating ? 'Localisation…' : 'Utiliser ma position actuelle'}
                </button>
                {locError && <p className="text-xs text-red-500 mb-3">{locError}</p>}

                <DeliveryMap value={mapPos} onChange={(pos) => { setMapPos(pos); if (pos?.address) setLivraison(p => ({ ...p, adresseLivraison: pos.address })); }} heightClassName="h-56" />
                <p className="text-[11px] text-[#6B7280] mt-2 text-center">Cliquez ou déplacez le repère pour ajuster le point de livraison</p>
              </div>

              {/* Budget summary per member */}
              {Object.keys(memberTotals).length > 0 && (
                <div className="bg-white rounded-2xl border p-5" style={{ borderColor: BD }}>
                  <h3 className="font-bold text-[#111827] mb-1 flex items-center gap-2">
                    <Users className="w-4 h-4" style={{ color: A }} /> Impact budgétaire par membre
                  </h3>
                  <p className="text-xs text-[#6B7280] mb-4">
                    Ces montants seront déduits du budget mensuel de chaque collaborateur.
                  </p>
                  <div className="space-y-3">
                    {Object.entries(memberTotals).map(([collabId, cartSpend]) => {
                      const collab   = collaborateurs.find(c => c.id === collabId);
                      if (!collab) return null;
                      const spent    = getMemberSpent(collabId);
                      const budget   = getMemberBudget(collabId);
                      const newTotal = spent + cartSpend;
                      const pct      = budget > 0 ? Math.min(100, Math.round((newTotal / budget) * 100)) : 0;
                      const isOver   = budget > 0 && newTotal > budget;
                      return (
                        <div key={collabId} className="p-3 rounded-xl" style={{ background: SF }}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                                style={{ background: AL, color: A }}>
                                {(collab.nom || '?').charAt(0).toUpperCase()}
                              </div>
                              <p className="text-sm font-semibold text-[#111827]">{collab.nom}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold" style={{ color: isOver ? '#DC2626' : A }}>
                                +{cartSpend.toLocaleString('fr-FR')} FCFA
                              </p>
                              {budget > 0 && (
                                <p className="text-[10px] text-[#6B7280]">
                                  {newTotal.toLocaleString('fr-FR')} / {budget.toLocaleString('fr-FR')}
                                </p>
                              )}
                            </div>
                          </div>
                          {budget > 0 && (
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
                              <div className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, background: isOver ? '#DC2626' : pct > 80 ? '#F59E0B' : '#16A34A' }} />
                            </div>
                          )}
                          {isOver && (
                            <p className="text-[10px] font-bold text-red-500 mt-1">
                              ⚠ Dépasse le budget de {(newTotal - budget).toLocaleString('fr-FR')} FCFA
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(0)}
                  className="px-5 py-3 rounded-2xl border text-sm font-semibold text-[#6B7280] transition hover:bg-[#F3F4F6]"
                  style={{ borderColor: BD }}>
                  Retour
                </button>
                <button onClick={() => { if (validateStep1()) setStep(2); }}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
                  style={{ background: A }}>
                  Vérifier la commande <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right: cart recap */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 bg-white rounded-2xl border p-5" style={{ borderColor: BD }}>
                <h3 className="font-bold text-[#111827] mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" style={{ color: A }} /> Votre sélection
                </h3>
                <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                  {panierItems.map(item => (
                    <div key={item.article.id} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: A }}>{item.quantite}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#111827] truncate">{item.article.nom}</p>
                        <p className="text-[11px] text-[#6B7280]">{(item.quantite * Number(item.article.prixClient ?? (item.article.prix || 0))).toLocaleString('fr-FR')} FCFA</p>
                      </div>
                      <button onClick={() => deleteFromCart(item.article.id)} className="text-[#6B7280] hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t" style={{ borderColor: BD }}>
                  <div className="flex justify-between text-sm font-bold text-[#111827]">
                    <span>Total estimé</span>
                    <span style={{ color: A }}>{totalEstime.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <p className="text-[11px] text-[#6B7280] mt-1">Facturation mensuelle SYSCOHADA</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            STEP 2 — Confirm
        ════════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="max-w-xl mx-auto space-y-5">

            {success ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <CheckCircle className="w-16 h-16 text-green-500" />
                <p className="text-lg font-bold text-[#111827]">{success}</p>
                <p className="text-sm text-[#6B7280]">Redirection vers le tableau de bord…</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl border p-5" style={{ borderColor: BD }}>
                  <h3 className="font-bold text-[#111827] mb-4">Récapitulatif de la commande</h3>

                  {/* Items — regroupés par membre */}
                  <div className="space-y-2 mb-4">
                    {buildLignes().map((ligne, i) => {
                      const collab = ligne.collaborateurId
                        ? collaborateurs.find(c => c.id === ligne.collaborateurId)
                        : null;
                      return (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: SF }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: A }}>{ligne.quantite}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#111827] truncate">{ligne.nomArticle}</p>
                          <p className="text-[11px] text-[#6B7280]">
                            {collab ? `→ ${collab.nom}` : '→ Sans attribution'}
                          </p>
                        </div>
                        <p className="text-sm font-bold shrink-0" style={{ color: A }}>
                          {(ligne.quantite * ligne.prixUnitaire).toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>
                    );
                    })}
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-4 space-y-2" style={{ borderColor: BD }}>
                    <div className="flex justify-between text-sm text-[#6B7280]">
                      <span>Sous-total HT</span>
                      <span>{Math.round(totalEstime / 1.18).toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex justify-between text-sm text-[#6B7280]">
                      <span>TVA 18%</span>
                      <span>{Math.round(totalEstime - totalEstime / 1.18).toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-[#111827]">
                      <span>Total TTC</span>
                      <span style={{ color: A }}>{totalEstime.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  </div>
                </div>

                {/* Delivery recap */}
                <div className="bg-white rounded-2xl border p-5" style={{ borderColor: BD }}>
                  <h3 className="font-bold text-[#111827] mb-3">
                    {mode === 'instant' ? '⚡ Livraison express' : '📅 Livraison planifiée'}
                  </h3>
                  <div className="space-y-2 text-sm text-[#6B7280]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" style={{ color: A }} />
                      <span className="font-medium" style={{ color: '#111827' }}>
                        {getDeliveryLabel(livraison.dateLivraison, livraison.heureLivraison)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" style={{ color: A }} />
                      <span>{livraison.lieuLivraison} — {livraison.adresseLivraison || '(adresse non précisée)'}</span>
                    </div>
                  </div>
                </div>

                {/* SYSCOHADA note */}
                <div className="flex items-start gap-3 px-4 py-3 rounded-2xl" style={{ background: AL }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: A }}>
                    <span className="text-white text-[10px] font-bold">i</span>
                  </div>
                  <p className="text-xs text-[#374151] leading-relaxed">
                    <strong>Aucun paiement immédiat.</strong> Toutes vos commandes du mois sont consolidées en une facture SYSCOHADA payable en fin de mois.
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-200">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)}
                    className="px-5 py-3 rounded-2xl border text-sm font-semibold text-[#6B7280] transition hover:bg-[#F3F4F6]"
                    style={{ borderColor: BD }}>
                    Modifier
                  </button>
                  <button onClick={handleSubmit} disabled={submitting}
                    className="flex-1 py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition"
                    style={{ background: A, opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {submitting ? 'Envoi en cours…' : 'Confirmer la commande groupée'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>

    {/* ── Member assignment popover ────────────────────────────────────── */}
    {pickerArticle && (
      <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={e => e.target === e.currentTarget && setPickerArticle(null)}>
        <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">

          {/* Header */}
          <div className="px-5 py-4 flex items-start justify-between gap-3"
            style={{ background: AL, borderBottom: `1px solid ${BD}` }}>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#111827] truncate">{pickerArticle.nom}</p>
              <p className="text-xs mt-0.5" style={{ color: A }}>
                {formatFCFA(prix)} / portion · Qui veut ce plat ?
              </p>
            </div>
            <button onClick={() => setPickerArticle(null)}
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(0,0,0,0.08)' }}>
              <X className="w-3.5 h-3.5 text-gray-600" />
            </button>
          </div>

          {/* Member list */}
          <div className="divide-y max-h-80 overflow-y-auto" style={{ borderColor: BD }}>
            {pickerRows.map(member => {
              const qty         = pickerMembers[member.id] || 0;
              const isLibre     = member.id === 'libre';
              const budget      = getMemberBudget(member.id);
              const spent       = getMemberSpent(member.id);
              const cartAlready = getCartSpend(member.id);
              const preview     = spent + cartAlready + qty * prix;
              const solde       = !isLibre && budget > 0 ? budget - preview : null;
              const isOver      = solde !== null && solde < 0;
              return (
                <div key={member.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
                    style={{ background: isLibre ? '#F3F4F6' : AL, color: isLibre ? '#6B7280' : A }}>
                    {isLibre ? '—' : member.nom.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#111827] truncate">{member.nom}</p>
                    {!isLibre && budget > 0 && (
                      <p className="text-[10px]" style={{ color: isOver ? '#DC2626' : '#6B7280' }}>
                        {isOver
                          ? `⚠ Dépasse de ${formatFCFA(Math.abs(solde))}`
                          : `Solde après : ${formatFCFA(Math.max(0, solde))}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setPickerMembers(p => {
                        const next = Math.max(0, (p[member.id] || 0) - 1);
                        if (next === 0) { const { [member.id]: _, ...rest } = p; return rest; }
                        return { ...p, [member.id]: next };
                      })}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-lg font-bold transition"
                      style={{ background: qty > 0 ? '#FFF0DF' : '#F3F4F6', color: qty > 0 ? A : '#6B7280' }}>
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-[#111827]">{qty}</span>
                    <button
                      onClick={() => {
                        if (isOver) return;
                        setPickerMembers(p => ({ ...p, [member.id]: (p[member.id] || 0) + 1 }));
                      }}
                      disabled={isOver}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-lg font-bold transition disabled:opacity-30"
                      style={{ background: isOver ? '#F3F4F6' : AL, color: isOver ? '#6B7280' : A }}>
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-5 py-4" style={{ borderTop: `1px solid ${BD}` }}>
            <button onClick={applyPicker}
              className="w-full py-3 rounded-2xl text-sm font-bold text-white transition hover:opacity-90"
              style={{ background: totalPickerQty > 0 ? `linear-gradient(135deg, #EA580C, ${A})` : '#D1D5DB' }}>
              {totalPickerQty > 0
                ? `Valider — ${totalPickerQty} portion${totalPickerQty > 1 ? 's' : ''} · ${formatFCFA(totalPickerQty * prix)}`
                : 'Retirer ce plat du panier'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
