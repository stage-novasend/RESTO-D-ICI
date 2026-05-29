// src/pages/b2b/BulkOrder.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, MapPin, Clock, Search, CheckCircle,
  AlertCircle, Loader2, Navigation, Users,
  Star, Store, Phone, Trash2, ShoppingBag, X,
} from 'lucide-react';
import { menuAPI, b2bAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import DeliveryMap from '../../components/maps/DeliveryMap';
import { formatFCFA } from '../../utils/formatters';
import { getArticleImage } from '../../utils/articleImage';
import B2BOnboardingWizard from './B2BOnboardingWizard';

const A  = '#C05015';
const AL = '#FBE8DC';
const SF = '#F9F7F5';
const BD = 'rgba(89,67,42,0.10)';

const STEPS = ['Choisir les plats', 'Livraison & lieu', 'Confirmer'];

// ── helpers ───────────────────────────────────────────────────────────────────
const getMinDatetime = () => {
  const d = new Date(Date.now() + 4 * 60 * 60 * 1000);
  return { minDate: d.toISOString().slice(0, 10), minTime: d.toTimeString().slice(0, 5) };
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
                style={{ background: done ? '#16A34A' : active ? A : '#E5E7EB', color: (done || active) ? '#fff' : '#9CA3AF' }}>
                {done ? '✓' : i + 1}
              </div>
              <span className="text-xs font-semibold hidden sm:block" style={{ color: active ? A : done ? '#16A34A' : '#9CA3AF' }}>
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
  const [restaurantDetails, setRestaurantDetails] = useState({ nom: '', logoUrl: '', isOpen: true, estimatedTime: '25-35 min', rating: 4.8, address: '', phone: '' });
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(false);

  // ── B2B-specific state ────────────────────────────────────────────────────
  const [collaborateurs, setCollaborateurs] = useState([]);
  const [panier, setPanier] = useState({}); // { articleId → { article, quantite } }
  const [assignments, setAssignments] = useState({}); // { articleId → collaborateurId }

  // ── Delivery state ────────────────────────────────────────────────────────
  const { minDate, minTime } = getMinDatetime();
  const [livraison, setLivraison] = useState({ dateLivraison: minDate, heureLivraison: minTime, lieuLivraison: '', adresseLivraison: '' });
  const [mapPos, setMapPos] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  // ── Debounce search ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

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
          estimatedTime: info.delaiLivraison || '25-35 min',
          rating: parseFloat(info.noteMoyenne || 4.8) || 4.8,
          address: info.adresse || selectedR.adresse || '',
          phone: info.telephone || selectedR.telephone || '',
        });
      } catch { /* ignore */ }
      finally { setLoadingMenu(false); }
    };
    void load();
  }, [selectedRestaurantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Panier helpers ────────────────────────────────────────────────────────
  const addToCart = useCallback((article) => {
    if (article.disponible === false) return;
    setPanier(prev => ({
      ...prev,
      [article.id]: { article, quantite: (prev[article.id]?.quantite || 0) + 1 },
    }));
  }, []);

  const removeFromCart = useCallback((articleId) => {
    setPanier(prev => {
      const ex = prev[articleId];
      if (!ex || ex.quantite <= 1) { const { [articleId]: _, ...rest } = prev; return rest; }
      return { ...prev, [articleId]: { ...ex, quantite: ex.quantite - 1 } };
    });
  }, []);

  const deleteFromCart = (articleId) => {
    setPanier(prev => { const { [articleId]: _, ...rest } = prev; return rest; });
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const panierItems = Object.values(panier);
  const totalCouverts = panierItems.reduce((s, i) => s + i.quantite, 0);
  const totalEstime = panierItems.reduce((s, i) => s + i.quantite * Number(i.article.prix || 0), 0);

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
        lignes: panierItems.map(item => ({
          articleId: item.article.id,
          quantite: item.quantite,
          prixUnitaire: Number(item.article.prix || 0),
          collaborateurId: assignments[item.article.id] || undefined,
        })),
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

  return (
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
            <p className="text-xs text-[#9CA3AF]">Commande groupée</p>
            <p className="text-sm font-extrabold text-[#111827] leading-none">{STEPS[step]}</p>
          </div>
          {totalCouverts > 0 && (
            <div className="shrink-0 text-right">
              <p className="text-xs text-[#9CA3AF]">{totalCouverts} couvert{totalCouverts > 1 ? 's' : ''}</p>
              <p className="text-sm font-extrabold" style={{ color: A }}>{totalEstime.toLocaleString('fr-FR')} FCFA</p>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <StepBar current={step} />

        {/* ── STEP 0 — Restaurant + menu explorer ──────────────────────── */}
        {step === 0 && (
          <>
            {/* Search bar */}
            <div className="mb-6 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un plat, une catégorie…"
                className="w-full rounded-2xl border pl-12 pr-10 py-3 text-sm outline-none transition"
                style={{ background: '#fff', borderColor: '#F1D6C9' }}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A7060]">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Restaurant cards */}
            {loadingRestaurants ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: A }} />
              </div>
            ) : restaurants.length === 0 ? (
              <div className="rounded-3xl border bg-white p-12 text-center" style={{ borderColor: BD }}>
                <Store className="w-14 h-14 mx-auto text-gray-300 mb-4" />
                <p className="font-bold text-[#111827]">Aucun restaurant disponible</p>
              </div>
            ) : (
              <>
                {/* ── Restaurant selector section ── */}
                <section className="mb-8 overflow-hidden rounded-[32px] border bg-white shadow-sm" style={{ borderColor: '#F3E4DA' }}>
                  <div className="relative bg-gradient-to-r from-[#FFF9F5] to-[#FFF0E8] border-b px-6 py-5 flex items-center justify-between gap-4" style={{ borderColor: '#F3E4DA' }}>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400 mb-0.5">Établissements</p>
                      <h2 className="text-xl font-extrabold text-slate-900">Choisissez un restaurant</h2>
                      <p className="mt-0.5 text-sm text-[#9A7060]">Parcourez les établissements disponibles puis explorez leur menu.</p>
                    </div>
                    <div className="shrink-0 rounded-2xl bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-sm">
                      {restaurants.length} restaurant{restaurants.length > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                      {restaurants.map(r => {
                        const isActive = r.id === selectedRestaurantId;
                        return (
                          <button key={r.id} type="button"
                            onClick={() => { setSelectedRestaurantId(r.id); setSearch(''); }}
                            className={`group overflow-hidden rounded-[24px] border text-left transition-all hover:-translate-y-1.5 ${isActive ? 'border-orange-400 shadow-[0_20px_40px_rgba(224,78,26,0.18)] ring-2 ring-orange-400/20' : 'border-[#EEE2DA] bg-white hover:border-orange-200 hover:shadow-xl'}`}>
                            <div className="relative h-44 overflow-hidden bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-50">
                              {r.logo ? (
                                <img src={r.logo} alt={r.nom} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <span className="text-7xl opacity-20">🍽️</span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                              <div className="absolute left-3 top-3 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">● Ouvert</div>
                              {isActive && (
                                <div className="absolute right-3 top-3 rounded-full bg-orange-500 px-3 py-1 text-[11px] font-bold text-white shadow-md">✓ Sélectionné</div>
                              )}
                              <div className="absolute bottom-3 left-3 right-3">
                                <h3 className="text-base font-extrabold text-white leading-tight drop-shadow">{r.nom}</h3>
                              </div>
                            </div>
                            <div className={`p-4 ${isActive ? 'bg-gradient-to-br from-orange-50 via-white to-[#FFF7F2]' : 'bg-white'}`}>
                              <p className="text-xs text-[#9A7060] line-clamp-1 flex items-center gap-1">
                                <MapPin className="h-3 w-3 shrink-0 text-orange-400" />
                                {r.adresse || "Abidjan, Côte d'Ivoire"}
                              </p>
                              <div className="mt-3 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> 4.8
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[#9A7060]">
                                    <Clock className="h-3 w-3" /> 25-35 min
                                  </span>
                                </div>
                                {r.telephone && (
                                  <span className="text-[11px] text-[#9A7060] flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> {r.telephone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>

                {/* ── Menu section (when restaurant selected) ── */}
                {selectedRestaurant && (
                  <>
                    {/* Restaurant hero banner */}
                    <section className="mb-8 overflow-hidden rounded-[32px] border shadow-md" style={{ borderColor: '#F3E4DA' }}>
                      <div className="relative h-28 bg-gradient-to-r from-[#0F172A] via-[#2B1500] to-[#C05015]/80 overflow-hidden">
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,white,transparent_60%)]" />
                        <div className="relative z-10 flex h-full items-center gap-5 px-6">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 backdrop-blur ring-2 ring-white/20">
                            {restaurantDetails.logoUrl
                              ? <img src={restaurantDetails.logoUrl} alt={restaurantDetails.nom} className="h-full w-full object-cover" />
                              : <span className="text-3xl">🍽️</span>}
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Menu sélectionné</p>
                            <h2 className="text-2xl font-extrabold text-white leading-tight">{restaurantDetails.nom}</h2>
                          </div>
                          <div className="ml-auto hidden sm:flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 text-white px-3 py-1.5 text-xs font-bold">● Ouvert</span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur px-3 py-1.5 text-xs font-semibold text-white">
                              <Clock className="h-3.5 w-3.5" /> {restaurantDetails.estimatedTime}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/90 px-3 py-1.5 text-xs font-bold text-amber-900">
                              <Star className="h-3.5 w-3.5 fill-amber-800 text-amber-800" /> {restaurantDetails.rating.toFixed(1)}/5
                            </span>
                          </div>
                        </div>
                      </div>
                      {(restaurantDetails.address || restaurantDetails.phone) && (
                        <div className="flex flex-wrap gap-2 px-6 py-3 bg-white border-t" style={{ borderColor: '#F3E4DA' }}>
                          {restaurantDetails.address && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
                              <MapPin className="h-3.5 w-3.5" /> {restaurantDetails.address}
                            </span>
                          )}
                          {restaurantDetails.phone && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FBE8DC] px-3 py-1 text-xs font-medium text-gray-600">
                              <Phone className="h-3.5 w-3.5" /> {restaurantDetails.phone}
                            </span>
                          )}
                        </div>
                      )}
                    </section>

                    {/* Error */}
                    {error && (
                      <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-200">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    )}

                    {/* 2-col: categories + products */}
                    <div className="flex flex-col gap-6 lg:flex-row">

                      {/* Category sidebar */}
                      <div className="lg:w-64 lg:flex-shrink-0">
                        <div className="sticky top-20 rounded-[26px] border bg-white p-4 shadow-sm" style={{ borderColor: '#F3E4DA' }}>
                          <h3 className="text-base font-bold text-slate-900">Catégories</h3>
                          <p className="mt-0.5 text-xs text-[#9A7060]">{restaurantDetails.nom}</p>
                          <div className="mt-4 space-y-1.5">
                            <button onClick={() => setActiveCategory('all')}
                              className={`w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition ${activeCategory === 'all' ? 'bg-orange-500 text-white' : 'text-slate-700 hover:bg-[#FBE8DC]'}`}>
                              Toutes les catégories
                            </button>
                            {categories.map(cat => (
                              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${activeCategory === cat.id ? 'bg-orange-500 text-white' : 'text-slate-700 hover:bg-[#FBE8DC]'}`}>
                                {cat.icone && <span>{cat.icone}</span>}
                                <span className="flex-1 truncate">{cat.nom}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-600'}`}>
                                  {cat.articleCount || 0}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Products grid */}
                      <div className="flex-1">
                        {loadingMenu ? (
                          <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border bg-white" style={{ borderColor: '#F3E4DA' }}>
                            <div className="text-center">
                              <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
                              <p className="text-sm text-gray-600">Chargement du menu…</p>
                            </div>
                          </div>
                        ) : filteredProducts.length === 0 ? (
                          <div className="rounded-[28px] border bg-white py-16 text-center shadow-sm" style={{ borderColor: '#F3E4DA' }}>
                            <span className="mx-auto mb-4 block text-6xl">🍽️</span>
                            <h3 className="text-lg font-medium text-gray-700">Aucun plat trouvé</h3>
                            <p className="mt-1 text-sm text-[#9A7060]">Essayez de modifier votre recherche ou catégorie.</p>
                          </div>
                        ) : (
                          <>
                            <div className="mb-4 flex items-center justify-between">
                              <div>
                                <h3 className="text-lg font-bold text-slate-900">Articles disponibles</h3>
                                <p className="text-xs text-gray-600">{filteredProducts.length} article{filteredProducts.length > 1 ? 's' : ''}</p>
                              </div>
                              {totalCouverts > 0 && (
                                <div className="rounded-full px-4 py-2 text-sm font-bold text-white" style={{ background: A }}>
                                  {totalCouverts} ajouté{totalCouverts > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                              {filteredProducts.map(product => {
                                const qty = panier[product.id]?.quantite || 0;
                                const allergens = getAllergenIcons(product);
                                const isPromo = parseFloat(product.prix) < 2000;
                                return (
                                  <div key={product.id}
                                    className={`group overflow-hidden rounded-[28px] border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-orange-200 ${!product.disponible ? 'opacity-60' : ''} ${qty > 0 ? 'ring-2 ring-orange-400/30 border-orange-300' : ''}`}
                                    style={{ borderColor: qty > 0 ? A + '60' : '#F1E6DE' }}>
                                    {/* Image */}
                                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
                                      <img
                                        src={getArticleImage(product)}
                                        alt={product.nom}
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        loading="lazy"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                      <div className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm shadow ${product.disponible ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                        {product.disponible ? '● Disponible' : '● Rupture'}
                                      </div>
                                      {isPromo && product.disponible && (
                                        <div className="absolute right-3 top-3 rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-1 text-[11px] font-bold text-emerald-600 shadow">
                                          🏷️ Promo
                                        </div>
                                      )}
                                      {qty > 0 && (
                                        <div className="absolute right-3 bottom-3 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold text-white shadow-lg" style={{ background: A }}>
                                          {qty}
                                        </div>
                                      )}
                                      {product.categorie?.nom && (
                                        <div className="absolute bottom-3 left-3 rounded-full bg-black/55 backdrop-blur-sm px-3 py-1 text-[11px] font-semibold text-white">
                                          {product.categorie.icone ? `${product.categorie.icone} ` : ''}{product.categorie.nom}
                                        </div>
                                      )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex flex-col gap-3 p-4">
                                      <div>
                                        <h4 className="text-sm font-extrabold text-slate-900 leading-snug">{product.nom}</h4>
                                        <p className="mt-1 line-clamp-2 text-xs text-[#9A7060] leading-relaxed">
                                          {product.description || 'Plat préparé avec soin par nos équipes.'}
                                        </p>
                                      </div>

                                      {allergens.length > 0 && (
                                        <div className="flex gap-1">{allergens.map((ic, i) => <span key={i} className="text-sm">{ic}</span>)}</div>
                                      )}

                                      {/* Price + inline qty */}
                                      <div className="flex items-center justify-between gap-2">
                                        <span className={`text-lg font-extrabold ${isPromo ? 'text-emerald-600' : 'text-orange-500'}`}>
                                          {formatFCFA(parseFloat(product.prix) || 0)}
                                        </span>
                                        <div className="flex items-center overflow-hidden rounded-xl border border-gray-100 bg-white text-sm">
                                          <button type="button" onClick={() => removeFromCart(product.id)}
                                            disabled={!product.disponible || qty === 0}
                                            className="px-3 py-1.5 font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition disabled:opacity-30">
                                            −
                                          </button>
                                          <span className="min-w-[32px] px-2 py-1.5 text-center font-bold text-slate-900">{qty}</span>
                                          <button type="button" onClick={() => addToCart(product)}
                                            disabled={!product.disponible}
                                            className="px-3 py-1.5 font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition disabled:opacity-30">
                                            +
                                          </button>
                                        </div>
                                      </div>

                                      {/* Add button */}
                                      <button type="button" onClick={() => addToCart(product)}
                                        disabled={!product.disponible}
                                        className={`w-full rounded-2xl py-2.5 text-sm font-bold transition-all ${product.disponible ? 'bg-gradient-to-r from-orange-500 to-[#C05015] text-white shadow-sm hover:shadow-lg' : 'cursor-not-allowed bg-[#FBE8DC] text-[#9A7060]'}`}>
                                        {product.disponible ? (qty > 0 ? `+ Ajouter un autre (${qty} au panier)` : '+ Ajouter à la commande') : 'Indisponible'}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Floating cart bar (mobile / bottom) */}
                    {totalCouverts > 0 && (
                      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-sm px-4">
                        <button
                          onClick={() => { if (validateStep0()) setStep(1); }}
                          className="w-full flex items-center justify-between gap-3 rounded-2xl px-5 py-4 text-white shadow-2xl font-bold text-sm"
                          style={{ background: A }}>
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5" />
                            <span>{totalCouverts} plat{totalCouverts > 1 ? 's' : ''} sélectionné{totalCouverts > 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>{totalEstime.toLocaleString('fr-FR')} FCFA</span>
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Step 0 footer (when no floating bar) */}
            {totalCouverts === 0 && (
              <div className="mt-6 flex justify-end">
                <button onClick={() => { if (validateStep0()) setStep(1); }}
                  className="px-6 py-3 rounded-2xl text-sm font-bold text-white flex items-center gap-2"
                  style={{ background: A }}>
                  Continuer <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
            {error && totalCouverts === 0 && (
              <p className="mt-2 text-sm text-red-500 font-semibold text-right">{error}</p>
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
                  <Clock className="w-4 h-4" style={{ color: A }} /> Date et heure de livraison
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1.5">Date *</label>
                    <input type="date" min={minDate} value={livraison.dateLivraison}
                      onChange={e => setLivraison(p => ({ ...p, dateLivraison: e.target.value }))}
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: SF, border: `1px solid ${BD}` }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1.5">Heure *</label>
                    <input type="time" value={livraison.heureLivraison}
                      onChange={e => setLivraison(p => ({ ...p, heureLivraison: e.target.value }))}
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: SF, border: `1px solid ${BD}` }} />
                  </div>
                </div>
                <p className="text-[11px] text-[#9CA3AF] mt-2">Délai minimum 4 heures avant la livraison.</p>
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
                <p className="text-[11px] text-[#9CA3AF] mt-2 text-center">Cliquez ou déplacez le repère pour ajuster le point de livraison</p>
              </div>

              {/* Assign collaborateurs per article */}
              {collaborateurs.filter(c => c.actif !== false).length > 0 && (
                <div className="bg-white rounded-2xl border p-5" style={{ borderColor: BD }}>
                  <h3 className="font-bold text-[#111827] mb-1 flex items-center gap-2">
                    <Users className="w-4 h-4" style={{ color: A }} /> Assigner les repas (optionnel)
                  </h3>
                  <p className="text-xs text-[#9CA3AF] mb-4">Associez chaque plat à un collaborateur pour le suivi budgétaire.</p>
                  <div className="space-y-3">
                    {panierItems.map(item => (
                      <div key={item.article.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: SF }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#111827] truncate">{item.article.nom}</p>
                          <p className="text-xs text-[#9CA3AF]">×{item.quantite} — {(item.quantite * Number(item.article.prix || 0)).toLocaleString('fr-FR')} FCFA</p>
                        </div>
                        <select
                          value={assignments[item.article.id] || ''}
                          onChange={e => setAssignments(p => ({ ...p, [item.article.id]: e.target.value || undefined }))}
                          className="rounded-xl px-3 py-2 text-xs font-medium outline-none shrink-0"
                          style={{ background: '#fff', border: `1px solid ${BD}` }}>
                          <option value="">— Aucun</option>
                          {collaborateurs.filter(c => c.actif !== false).map(c => (
                            <option key={c.id} value={c.id}>{c.nom}</option>
                          ))}
                        </select>
                      </div>
                    ))}
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
                        <p className="text-[11px] text-[#9CA3AF]">{(item.quantite * Number(item.article.prix || 0)).toLocaleString('fr-FR')} FCFA</p>
                      </div>
                      <button onClick={() => deleteFromCart(item.article.id)} className="text-[#9CA3AF] hover:text-red-400">
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
                  <p className="text-[11px] text-[#9CA3AF] mt-1">Facturation mensuelle SYSCOHADA</p>
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

                  {/* Items */}
                  <div className="space-y-2 mb-4">
                    {panierItems.map(item => (
                      <div key={item.article.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: SF }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: A }}>{item.quantite}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#111827] truncate">{item.article.nom}</p>
                          {assignments[item.article.id] && (
                            <p className="text-[11px] text-[#9CA3AF]">
                              → {collaborateurs.find(c => c.id === assignments[item.article.id])?.nom || 'Collaborateur'}
                            </p>
                          )}
                        </div>
                        <p className="text-sm font-bold shrink-0" style={{ color: A }}>
                          {(item.quantite * Number(item.article.prix || 0)).toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>
                    ))}
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
                  <h3 className="font-bold text-[#111827] mb-3">Livraison</h3>
                  <div className="space-y-2 text-sm text-[#6B7280]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" style={{ color: A }} />
                      <span>{livraison.dateLivraison} à {livraison.heureLivraison}</span>
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
  );
}
