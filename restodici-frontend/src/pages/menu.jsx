import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  AlertCircle,
  Filter,
  X,
  UtensilsCrossed,
  Star,
  Clock,
  MapPin,
  Phone,
  Store,
  ShoppingCart,
} from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { menuAPI } from '../services/api';
import ProductCustomizationModal from '../components/menu/ProductCustomizationModal';
import { formatFCFA } from '../utils/formatters';

function buildDynamicCategories(menuData, categoryList) {
  const categoryMap = new Map();

  (Array.isArray(categoryList) ? categoryList : []).forEach((category) => {
    if (!category?.id) {
      return;
    }

    categoryMap.set(category.id, {
      ...category,
      articleCount: 0,
    });
  });

  (Array.isArray(menuData) ? menuData : []).forEach((product) => {
    const categoryId = product.categorieId || product.categorie?.id;
    if (!categoryId) {
      return;
    }

    const existing = categoryMap.get(categoryId);
    const nextCount = (existing?.articleCount || 0) + 1;

    categoryMap.set(categoryId, {
      id: categoryId,
      nom: existing?.nom || product.categorie?.nom || 'Catégorie',
      icone: existing?.icone || product.categorie?.icone || '',
      description: existing?.description || product.categorie?.description || '',
      articleCount: nextCount,
    });
  });

  return Array.from(categoryMap.values()).sort((a, b) => a.nom.localeCompare(b.nom));
}

export default function MenuPage() {
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const requestedRestaurantId =
    urlParams.get('restaurant') || localStorage.getItem('selectedRestaurantId') || '';
  const requestedCategoryId = urlParams.get('category') || 'all';
  const requestedSearch = urlParams.get('search') || '';

  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(requestedRestaurantId);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(requestedCategoryId);
  const [searchQuery, setSearchQuery] = useState(requestedSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(requestedSearch);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [serviceMode, setServiceMode] = useState('Livraison');
  const [restaurantDetails, setRestaurantDetails] = useState({
    nom: 'Restaurant',
    description: '',
    logoUrl: '',
    isOpen: true,
    estimatedTime: '25-35 min',
    rating: 4.8,
    reviews: 120,
    address: '',
    phone: '',
  });
  const [quantities, setQuantities] = useState({});
  const [filters, setFilters] = useState({
    priceRange: [0, 10000],
    showAvailableOnly: true,
    showPromotionsOnly: false,
    sortBy: 'name',
  });
  const [quickFilters, setQuickFilters] = useState({
    vegetarian: false,
    glutenFree: false,
    budgetFriendly: false,
    popular: false,
    newest: false,
  });
  const { addItem, items: cartItems } = useCart();

  const restaurantId = selectedRestaurantId;
  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === restaurantId) || null,
    [restaurants, restaurantId],
  );
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === activeCategory) || null,
    [categories, activeCategory],
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        setLoading(true);
        setError(null);
        const restaurantsRes = await menuAPI.getRestaurants();
        const restaurantList = restaurantsRes.data || [];
        setRestaurants(restaurantList);

        if (restaurantList.length === 0) {
          setSelectedRestaurantId('');
          setCategories([]);
          return;
        }

        setSelectedRestaurantId((currentRestaurantId) => {
          const requestedExists = restaurantList.some(
            (restaurant) => restaurant.id === requestedRestaurantId,
          );

          if (requestedExists) {
            return requestedRestaurantId;
          }

          const currentExists = restaurantList.some(
            (restaurant) => restaurant.id === currentRestaurantId,
          );

          if (currentExists) {
            return currentRestaurantId;
          }

          return restaurantList[0]?.id || '';
        });
      } catch (loadError) {
        console.error('Erreur chargement restaurants:', loadError);
        setError('Impossible de charger la liste des restaurants. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    };

    loadRestaurants();
  }, [requestedRestaurantId]);

  useEffect(() => {
    const loadRestaurantMenu = async () => {
      if (!restaurantId) {
        setCategories([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [menuRes, categoriesRes] = await Promise.all([
          menuAPI.getByRestaurant(restaurantId, { cible: 'CLIENT' }),
          menuAPI.getCategories({ restaurantId }),
        ]);

        if (!menuAPI.menuCache) {
          menuAPI.menuCache = {};
        }

        const menuData = Array.isArray(menuRes.data) ? menuRes.data : [];
        const categoryList = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];
        const dynamicCategories = buildDynamicCategories(menuData, categoryList);

        menuAPI.menuCache[restaurantId] = menuData;
        setCategories(dynamicCategories);

        const restaurantInfo = menuData[0]?.restaurant || menuData[0]?.restaurantData || {};
        const restaurantName =
          menuData[0]?.restaurantNom ||
          menuData[0]?.restaurant?.nom ||
          selectedRestaurant?.nom ||
          'Restaurant';
        const openStatus =
          typeof restaurantInfo.ouvert === 'boolean'
            ? restaurantInfo.ouvert
            : restaurantInfo.open === false
              ? false
              : true;

        setRestaurantDetails({
          nom: restaurantName,
          description:
            restaurantInfo.description ||
            restaurantInfo.slogan ||
            selectedRestaurant?.adresse ||
            'Découvrez les spécialités et plats disponibles de ce restaurant.',
          logoUrl:
            restaurantInfo.logoUrl ||
            restaurantInfo.photoUrl ||
            selectedRestaurant?.logo ||
            '',
          isOpen: openStatus,
          estimatedTime:
            restaurantInfo.delaiLivraison ||
            restaurantInfo.delaiPreparation ||
            '25-35 min',
          rating: parseFloat(restaurantInfo.noteMoyenne || restaurantInfo.note || 4.8) || 4.8,
          reviews:
            restaurantInfo.avisCount ||
            restaurantInfo.reviewsCount ||
            restaurantInfo.avis?.length ||
            120,
          address: selectedRestaurant?.adresse || restaurantInfo.adresse || '',
          phone: selectedRestaurant?.telephone || restaurantInfo.telephone || '',
        });

        localStorage.setItem('selectedRestaurantId', restaurantId);
        localStorage.setItem('currentRestaurantId', restaurantId);
        localStorage.setItem('currentRestaurantName', restaurantName);

        setActiveCategory((currentCategory) => {
          if (
            requestedCategoryId !== 'all' &&
            dynamicCategories.some((category) => category.id === requestedCategoryId)
          ) {
            return requestedCategoryId;
          }

          if (dynamicCategories.some((category) => category.id === currentCategory)) {
            return currentCategory;
          }

          return 'all';
        });
      } catch (loadError) {
        console.error('Erreur chargement menu:', loadError);
        setError('Impossible de charger le menu du restaurant sélectionné.');
      } finally {
        setLoading(false);
      }
    };

    loadRestaurantMenu();
  }, [restaurantId, selectedRestaurant, requestedCategoryId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (restaurantId) {
      params.set('restaurant', restaurantId);
    } else {
      params.delete('restaurant');
    }

    if (activeCategory && activeCategory !== 'all') {
      params.set('category', activeCategory);
    } else {
      params.delete('category');
    }

    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim());
    } else {
      params.delete('search');
    }

    const queryString = params.toString();
    const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
  }, [restaurantId, activeCategory, searchQuery]);

  const getProductSearchText = useCallback((product) => {
    const allergensValue = Array.isArray(product.allergenes)
      ? product.allergenes.join(' ')
      : product.allergenes || product.allergene || product.allergènes || '';

    return [
      product.nom,
      product.description,
      product.categorie?.nom,
      product.restaurantNom,
      allergensValue,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  }, []);

  const isVegetarianProduct = useCallback(
    (product) => {
      const text = getProductSearchText(product);
      const vegetarianHints = [
        'veget',
        'végé',
        'salade',
        'legume',
        'légume',
        'tofu',
        'haricot',
        'riz',
        'attiéké',
        'alloco',
      ];
      const nonVegetarianHints = [
        'poulet',
        'boeuf',
        'bœuf',
        'viande',
        'poisson',
        'thon',
        'crevette',
        'porc',
        'mouton',
        'saumon',
        'dinde',
        'jambon',
      ];

      return (
        vegetarianHints.some((hint) => text.includes(hint)) &&
        !nonVegetarianHints.some((hint) => text.includes(hint))
      );
    },
    [getProductSearchText],
  );

  const isGlutenFreeProduct = useCallback(
    (product) => {
      const text = getProductSearchText(product);
      const glutenHints = ['gluten', 'blé', 'ble', 'wheat', 'farine', 'pain', 'pâte', 'pate'];
      return !glutenHints.some((hint) => text.includes(hint));
    },
    [getProductSearchText],
  );

  const isPopularProduct = useCallback((product) => {
    return Number(product.quantiteVendue || product.commandesCount || product.orderCount || 0) > 0;
  }, []);

  const isNewProduct = useCallback((product) => {
    if (!product.createdAt) {
      return false;
    }

    const createdAt = new Date(product.createdAt).getTime();
    if (Number.isNaN(createdAt)) {
      return false;
    }

    return Date.now() - createdAt <= 1000 * 60 * 60 * 24 * 30;
  }, []);

  const toggleQuickFilter = (filterKey) => {
    setQuickFilters((current) => ({
      ...current,
      [filterKey]: !current[filterKey],
    }));
  };

  const filteredProducts = useMemo(() => {
    if (!menuAPI.menuCache?.[restaurantId]) return [];

    let products = [...menuAPI.menuCache[restaurantId]];

    if (activeCategory !== 'all') {
      products = products.filter(
        (product) =>
          product.categorieId === activeCategory || product.categorie?.id === activeCategory,
      );
    }

    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      products = products.filter(
        (product) =>
          product.nom.toLowerCase().includes(searchLower) ||
          product.description?.toLowerCase().includes(searchLower) ||
          product.categorie?.nom?.toLowerCase().includes(searchLower) ||
          product.restaurantNom?.toLowerCase().includes(searchLower),
      );
    }

    if (filters.showAvailableOnly) {
      products = products.filter((product) => product.disponible);
    }

    if (filters.showPromotionsOnly) {
      products = products.filter(
        (product) => product.prix && parseFloat(product.prix) < 2000,
      );
    }

    if (quickFilters.vegetarian) {
      products = products.filter((product) => isVegetarianProduct(product));
    }

    if (quickFilters.glutenFree) {
      products = products.filter((product) => isGlutenFreeProduct(product));
    }

    if (quickFilters.budgetFriendly) {
      products = products.filter((product) => (parseFloat(product.prix) || 0) < 2000);
    }

    if (quickFilters.popular) {
      products = products.filter((product) => isPopularProduct(product));
    }

    if (quickFilters.newest) {
      products = products.filter((product) => isNewProduct(product));
    }

    products = products.filter((product) => {
      const price = parseFloat(product.prix) || 0;
      return price >= filters.priceRange[0] && price <= filters.priceRange[1];
    });

    products.sort((a, b) => {
      const priceA = parseFloat(a.prix) || 0;
      const priceB = parseFloat(b.prix) || 0;

      switch (filters.sortBy) {
        case 'price-low':
          return priceA - priceB;
        case 'price-high':
          return priceB - priceA;
        case 'popular':
          return (b.quantiteVendue || 0) - (a.quantiteVendue || 0);
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return a.nom.localeCompare(b.nom);
      }
    });

    return products;
  }, [
    restaurantId,
    activeCategory,
    debouncedSearch,
    filters,
    quickFilters,
    isVegetarianProduct,
    isGlutenFreeProduct,
    isPopularProduct,
    isNewProduct,
  ]);

  const handleAddToCart = useCallback(
    (product, quantity = 1, instructions = '') => {
      const currentRestaurantId = restaurantId || localStorage.getItem('currentRestaurantId') || '';
      const currentRestaurantName =
        restaurantDetails.nom || localStorage.getItem('currentRestaurantName') || 'Restaurant';

      addItem(
        {
          articleId: product.id,
          nom: product.nom,
          prix: parseFloat(product.prix) || 0,
          photoUrl: product.photoUrl,
          instructions,
          categorie: product.categorie,
          restaurantId: currentRestaurantId,
          restaurantName: currentRestaurantName,
        },
        quantity,
      );
    },
    [addItem, restaurantId, restaurantDetails.nom],
  );

  const handleQuickAdd = (product) => {
    const quantity = quantities[product.id] || 1;
    handleAddToCart(product, quantity, '');
  };

  const handleRestaurantSelect = (nextRestaurantId) => {
    setSelectedRestaurantId(nextRestaurantId);
    setActiveCategory('all');
    setSelectedProduct(null);
  };

  const incrementQuantity = (productId) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 1) + 1,
    }));
  };

  const decrementQuantity = (productId) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] || 1) - 1),
    }));
  };

  const getAllergenIcons = (product) => {
    const icons = [];
    const allergenes = (product.allergene || product.allergènes || product.allergenes || '')
      .toString()
      .toLowerCase();

    if (
      allergenes.includes('arachide') ||
      allergenes.includes('noix') ||
      allergenes.includes('peanut')
    ) {
      icons.push('🥜');
    }
    if (
      allergenes.includes('piment') ||
      allergenes.includes('épicé') ||
      allergenes.includes('piquant') ||
      product.epice ||
      product.piquant
    ) {
      icons.push('🌶️');
    }
    if (icons.length === 0 && allergenes) {
      icons.push('⚠️');
    }
    return icons;
  };

  const clearFilters = () => {
    setFilters({
      priceRange: [0, 10000],
      showAvailableOnly: true,
      showPromotionsOnly: false,
      sortBy: 'name',
    });
    setQuickFilters({
      vegetarian: false,
      glutenFree: false,
      budgetFriendly: false,
      popular: false,
      newest: false,
    });
  };

  if (loading && restaurants.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement des restaurants...</p>
        </div>
      </div>
    );
  }

  if (error && restaurants.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FDFCFB]">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="font-bold text-red-800 mb-2">Erreur</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FDFCFB]">
        <div className="max-w-lg rounded-3xl border border-[#F3D5C8] bg-white p-8 text-center shadow-sm">
          <Store className="mx-auto h-14 w-14 text-orange-400" />
          <h2 className="mt-4 text-2xl font-bold text-slate-900">Aucun restaurant disponible</h2>
          <p className="mt-2 text-gray-600">
            Aucun restaurant actif n&apos;est encore visible dans l&apos;onglet restaurants.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB]">
      <div className="sticky top-0 z-20 border-b border-[#F3E4DA] bg-white/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-500">
                  Restaurants
                </p>
                <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
                  Découvrez tous les restaurants et leurs articles
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  {restaurants.length} restaurant{restaurants.length > 1 ? 's' : ''} disponible{restaurants.length > 1 ? 's' : ''}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-[280px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-orange-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un plat, un ingrédient..."
                    className="w-full rounded-2xl border border-[#F1D6C9] bg-[#FFFDFB] py-3 pl-11 pr-10 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-[#F1D6C9] px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-orange-50"
                >
                  <Filter className="h-5 w-5" />
                  Filtres
                </button>

                {cartItems.length > 0 && (
                  <Link
                    to="/cart"
                    className="flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Panier ({cartItems.length})
                  </Link>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-sm font-semibold text-slate-700">Filtres rapides :</span>
                {[
                  { key: 'vegetarian', label: '🥗 Végétarien' },
                  { key: 'glutenFree', label: '🌾 Sans gluten' },
                  { key: 'budgetFriendly', label: '💰 < 2000 FCFA' },
                  { key: 'popular', label: '🔥 Populaires' },
                  { key: 'newest', label: '✨ Nouveautés' },
                ].map((filterItem) => {
                  const isActive = quickFilters[filterItem.key];
                  return (
                    <button
                      key={filterItem.key}
                      type="button"
                      onClick={() => toggleQuickFilter(filterItem.key)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        isActive
                          ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                          : 'border-[#E9D8CE] bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50'
                      }`}
                    >
                      {filterItem.label}
                    </button>
                  );
                })}
              </div>

              <div className="text-sm text-gray-500">
                {Object.values(quickFilters).filter(Boolean).length} filtre rapide actif
                {Object.values(quickFilters).filter(Boolean).length > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="border-b border-gray-200 bg-white p-4">
          <div className="container mx-auto flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Trier par :</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              >
                <option value="name">Nom</option>
                <option value="price-low">Prix (croissant)</option>
                <option value="price-high">Prix (décroissant)</option>
                <option value="popular">Populaire</option>
                <option value="newest">Plus récent</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="available"
                checked={filters.showAvailableOnly}
                onChange={(e) => setFilters({ ...filters, showAvailableOnly: e.target.checked })}
                className="h-4 w-4 rounded text-orange-500"
              />
              <label htmlFor="available" className="text-sm">
                Disponible uniquement
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="promotions"
                checked={filters.showPromotionsOnly}
                onChange={(e) => setFilters({ ...filters, showPromotionsOnly: e.target.checked })}
                className="h-4 w-4 rounded text-orange-500"
              />
              <label htmlFor="promotions" className="text-sm">
                Promotions seulement
              </label>
            </div>

            <button
              onClick={clearFilters}
              className="text-sm font-medium text-orange-500 hover:text-orange-600"
            >
              Effacer les filtres
            </button>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <section className="mb-8 rounded-[28px] border border-[#F3E4DA] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Choisissez un restaurant</h2>
              <p className="mt-1 text-sm text-gray-600">
                Parcourez les établissements disponibles puis consultez leur menu en temps réel.
              </p>
            </div>
            <div className="rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600">
              {restaurants.length} disponible{restaurants.length > 1 ? 's' : ''}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {restaurants.map((restaurant) => {
              const isActive = restaurant.id === restaurantId;

              return (
                <button
                  key={restaurant.id}
                  type="button"
                  onClick={() => handleRestaurantSelect(restaurant.id)}
                  className={`rounded-[24px] border p-4 text-left transition-all ${
                    isActive
                      ? 'border-orange-400 bg-gradient-to-br from-orange-50 via-white to-[#FFF7F2] shadow-[0_16px_35px_rgba(255,107,53,0.16)]'
                      : 'border-[#EEE2DA] bg-white hover:border-orange-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                      {restaurant.logo ? (
                        <img
                          src={restaurant.logo}
                          alt={restaurant.nom}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl">🍽️</div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{restaurant.nom}</h3>
                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                            {restaurant.adresse || 'Restaurant actif sur la plateforme.'}
                          </p>
                        </div>
                        {isActive && (
                          <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">
                            Sélectionné
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {restaurant.adresse || 'Adresse à confirmer'}
                        </span>
                        {restaurant.telephone && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
                            <Phone className="h-3.5 w-3.5" />
                            {restaurant.telephone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {selectedRestaurant && (
          <>
            <section className="mb-8 rounded-[30px] border border-[#F3E4DA] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[28px] bg-gray-100">
                    {restaurantDetails.logoUrl ? (
                      <img
                        src={restaurantDetails.logoUrl}
                        alt={restaurantDetails.nom}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-4xl">🍽️</div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-500">
                      Restaurant sélectionné
                    </p>
                    <h2 className="mt-2 text-3xl font-bold text-slate-900">
                      {restaurantDetails.nom}
                    </h2>
                    <p className="mt-2 max-w-2xl text-gray-600">{restaurantDetails.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-600">
                      {restaurantDetails.address && (
                        <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
                          <MapPin className="h-4 w-4" />
                          {restaurantDetails.address}
                        </span>
                      )}
                      {restaurantDetails.phone && (
                        <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
                          <Phone className="h-4 w-4" />
                          {restaurantDetails.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                      restaurantDetails.isOpen
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {restaurantDetails.isOpen ? '🟢 Ouvert' : '🔴 Fermé'}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
                    <Clock className="h-4 w-4" />
                    {restaurantDetails.estimatedTime}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-800">
                    <Star className="h-4 w-4" />
                    {restaurantDetails.rating.toFixed(1)}/5 ({restaurantDetails.reviews} avis)
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {['Sur place', 'À emporter', 'Livraison'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setServiceMode(mode)}
                    className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                      serviceMode === mode
                        ? 'border-orange-500 bg-orange-500 text-white'
                        : 'border-gray-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </section>

            <div className="flex flex-col gap-8 lg:flex-row">
              <div className="lg:w-72 lg:flex-shrink-0">
                <div className="sticky top-28 rounded-[26px] border border-[#F3E4DA] bg-white p-4 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900">Catégories</h3>
                  <p className="mt-1 text-sm text-gray-500">{restaurantDetails.nom}</p>
                  <div className="mt-4 space-y-2">
                    <button
                      onClick={() => setActiveCategory('all')}
                      className={`w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                        activeCategory === 'all'
                          ? 'bg-orange-500 text-white'
                          : 'text-slate-700 hover:bg-gray-100'
                      }`}
                    >
                      Toutes les catégories
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setActiveCategory(category.id)}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                          activeCategory === category.id
                            ? 'bg-orange-500 text-white'
                            : 'text-slate-700 hover:bg-gray-100'
                        }`}
                      >
                        {category.icone && <span>{category.icone}</span>}
                        <span className="min-w-0 flex-1 truncate">{category.nom}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            activeCategory === category.id
                              ? 'bg-white/20 text-white'
                              : 'bg-orange-50 text-orange-600'
                          }`}
                        >
                          {category.articleCount || 0}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1">
                {loading ? (
                  <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-[#F3E4DA] bg-white">
                    <div className="text-center">
                      <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
                      <p className="text-gray-600">Chargement du menu...</p>
                    </div>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="rounded-[28px] border border-[#F3E4DA] bg-white py-16 text-center shadow-sm">
                    <UtensilsCrossed className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                    <h3 className="text-xl font-medium text-gray-700">Aucun plat trouvé</h3>
                    <p className="mt-2 text-gray-500">
                      Essayez de modifier vos critères pour {restaurantDetails.nom}.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">Articles disponibles</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          {filteredProducts.length} article{filteredProducts.length > 1 ? 's' : ''} affiché{filteredProducts.length > 1 ? 's' : ''}
                          {selectedCategory ? ` dans ${selectedCategory.nom}` : ' pour ce restaurant'}
                        </p>
                      </div>
                      <div className="rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600">
                        {serviceMode}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                      {filteredProducts.map((product) => {
                        const quantity = quantities[product.id] || 1;
                        const allergenIcons = getAllergenIcons(product);

                        return (
                          <div
                            key={product.id}
                            className={`overflow-hidden rounded-[26px] border border-[#F1E6DE] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                              !product.disponible ? 'opacity-60' : ''
                            }`}
                          >
                            <div className="relative h-52 bg-gray-100">
                              {product.photoUrl ? (
                                <img
                                  src={product.photoUrl}
                                  alt={product.nom}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <UtensilsCrossed className="h-16 w-16 text-gray-400" />
                                </div>
                              )}
                              <div className="absolute left-3 top-3 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold text-white">
                                {product.disponible ? '🟢 Disponible' : '🔴 Rupture'}
                              </div>
                              {parseFloat(product.prix) < 2000 && product.disponible && (
                                <div className="absolute right-3 top-3 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
                                  Promotion
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-4 p-5">
                              <div>
                                <h4 className="text-xl font-bold text-slate-900">{product.nom}</h4>
                                <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                                  {product.description || 'Description du plat non disponible.'}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                                {product.categorie?.nom && (
                                  <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
                                    {product.categorie.nom}
                                  </span>
                                )}
                                {allergenIcons.length > 0 ? (
                                  <span className="inline-flex items-center gap-1">
                                    {allergenIcons.join(' ')}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">Sans informations allergènes</span>
                                )}
                              </div>

                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center overflow-hidden rounded-lg border border-gray-200">
                                  <button
                                    type="button"
                                    onClick={() => decrementQuantity(product.id)}
                                    className="px-3 py-2 text-gray-600 transition hover:bg-gray-100"
                                    disabled={!product.disponible}
                                  >
                                    -
                                  </button>
                                  <div className="px-4 py-2 text-sm font-semibold">{quantity}</div>
                                  <button
                                    type="button"
                                    onClick={() => incrementQuantity(product.id)}
                                    className="px-3 py-2 text-gray-600 transition hover:bg-gray-100"
                                    disabled={!product.disponible}
                                  >
                                    +
                                  </button>
                                </div>

                                <span className="text-lg font-bold text-orange-500">
                                  {formatFCFA(parseFloat(product.prix) || 0)}
                                </span>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleQuickAdd(product)}
                                  disabled={!product.disponible}
                                  className={`flex-1 rounded-2xl py-3 text-sm font-semibold transition ${
                                    product.disponible
                                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                                      : 'cursor-not-allowed bg-gray-200 text-gray-500'
                                  }`}
                                >
                                  Ajouter
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedProduct(product)}
                                  className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-gray-50"
                                >
                                  Personnaliser
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {selectedProduct && (
        <ProductCustomizationModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAdd={handleAddToCart}
        />
      )}
    </div>
  );
}
