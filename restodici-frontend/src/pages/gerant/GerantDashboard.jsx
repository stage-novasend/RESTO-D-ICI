// src/pages/gerant/GerantDashboard.jsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  Package,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  Settings,
  CheckCircle,
  Clock,
  ChefHat,
  CreditCard,
  BarChart3,
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  MapPin,
  UserPlus,
  DollarSign,
  RefreshCcw,
  Zap,
  Star,
  Activity,
  PieChart,
  Wallet,
  ShoppingBag,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import {
  menuAPI,
  commandesService,
  stocksAPI,
  tresorerieAPI,
  staffAPI,
  b2bAPI,
  restaurantAPI,
} from "../../services/api";
import { createCommandesSocket } from "../../services/commandes.service";
import { mergeManagerOrdersResults } from "../../services/orders-merge.js";
import {
  formatDate,
  formatFCFA,
  STATUS_COLORS,
  STATUS_LABELS,
} from "../../utils/formatters";
import { FREQUENT_LOCATION_ZONES } from "../../components/maps/locationAssistantData";

// ==================== COLOR THEME CONSTANTS ====================
const COLORS = {
  primary: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
    button: "bg-violet-500 hover:bg-violet-600",
    light: "bg-violet-100",
  },
  secondary: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    button: "bg-emerald-500 hover:bg-emerald-600",
    light: "bg-emerald-100",
  },
  accent: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    button: "bg-amber-500 hover:bg-amber-600",
    light: "bg-amber-100",
  },
  warning: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    button: "bg-orange-500 hover:bg-orange-600",
    light: "bg-orange-100",
  },
  info: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-700",
    button: "bg-sky-500 hover:bg-sky-600",
    light: "bg-sky-100",
  },
  danger: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    button: "bg-rose-500 hover:bg-rose-600",
    light: "bg-rose-100",
  },
  success: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    button: "bg-green-500 hover:bg-green-600",
    light: "bg-green-100",
  },
};

function DeliveryMapEvents({ onPick }) {
  useMapEvents({
    click(event) {
      onPick({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });

  return null;
}

function DeliveryMapView({ center }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

function DeliveryZonesMap({ restaurantPosition, selectedPosition, zones, onPick }) {
  const restaurantCenter = [
    Number(restaurantPosition.lat) || 5.3364,
    Number(restaurantPosition.lng) || -4.0267,
  ];
  const pendingCenter = [
    Number(selectedPosition.lat) || restaurantCenter[0],
    Number(selectedPosition.lng) || restaurantCenter[1],
  ];

  return (
    <div className="mt-4 overflow-hidden rounded-[20px] border border-amber-200">
      <MapContainer center={pendingCenter} zoom={12} scrollWheelZoom className="h-72 w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <DeliveryMapEvents onPick={onPick} />
        <DeliveryMapView center={pendingCenter} />

        <CircleMarker
          center={restaurantCenter}
          radius={10}
          pathOptions={{ color: "#00A7CB", fillColor: "#00A7CB", fillOpacity: 0.9 }}
        >
          <Popup>Position du restaurant</Popup>
        </CircleMarker>

        {zones
          .filter((zone) => Number.isFinite(Number(zone.lat)) && Number.isFinite(Number(zone.lng)))
          .map((zone, index) => (
            <CircleMarker
              key={`${zone.nom}-${index}`}
              center={[Number(zone.lat), Number(zone.lng)]}
              radius={8}
              pathOptions={{ color: "#2ECC71", fillColor: "#2ECC71", fillOpacity: 0.85 }}
            >
              <Popup>{zone.nom}</Popup>
            </CircleMarker>
          ))}

        <CircleMarker
          center={pendingCenter}
          radius={9}
          pathOptions={{ color: "#FF6B35", fillColor: "#FF6B35", fillOpacity: 0.95 }}
        >
          <Popup>Nouvelle zone en préparation</Popup>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}

// ==================== MENU MODULE ====================
function MenuTab({ restaurantId, token }) {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newArticle, setNewArticle] = useState({
    nom: "",
    prix: "",
    categorieId: "",
    description: "",
    stock: "",
    disponible: true,
    photoUrl: "",
  });
  const [newCategory, setNewCategory] = useState({ nom: "", icone: "" });
  const [formErrors, setFormErrors] = useState({});
  const [categoryErrors, setCategoryErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Load categories and articles
  useEffect(() => {
    const loadData = async () => {
      if (!restaurantId || !token) return;
      try {
        setLoading(true);
        // Load categories
        const catRes = await menuAPI.getCategories({ restaurantId });
        setCategories(catRes.data || []);

        // Load all articles for this restaurant, including unavailable items for management
        const artRes = await menuAPI.getAll({ restaurantId, cible: "TOUS" });
        setArticles(artRes.data || []);
      } catch (err) {
        console.error("Erreur chargement données menu:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [restaurantId, token]);

  const validateForm = () => {
    const errors = {};
    if (!newArticle.nom.trim()) errors.nom = "Nom requis";
    if (!newArticle.prix || parseFloat(newArticle.prix) <= 0)
      errors.prix = "Prix > 0 requis (RG-05)";
    if (!newArticle.categorieId)
      errors.categorieId = "Catégorie requise (RG-01)";
    if (newArticle.stock === "" || parseInt(newArticle.stock) < 0)
      errors.stock = "Stock >= 0 requis";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateCategoryForm = () => {
    const errors = {};
    if (!newCategory.nom.trim()) errors.nom = "Nom de catégorie requis";
    setCategoryErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateCategory = async () => {
    if (!validateCategoryForm() || !restaurantId || !token) return;
    try {
      await menuAPI.createCategorie({
        ...newCategory,
        restaurantId,
      });
      setShowCategoryForm(false);
      setNewCategory({ nom: "", icone: "" });
      // Refresh categories
      const catRes = await menuAPI.getCategories({ restaurantId });
      setCategories(catRes.data || []);
    } catch (error) {
      console.error("Erreur création catégorie:", error);
      alert(
        error.response?.data?.message ||
          "Erreur lors de la création de la catégorie",
      );
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Simple file validation
    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner une image (jpg, png, gif)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      alert("La taille de l'image ne doit pas dépasser 5MB");
      return;
    }

    setUploading(true);
    try {
      // In a real implementation, this would upload to your backend
      // For now, we'll create a local URL
      const imageUrl = URL.createObjectURL(file);
      setNewArticle((prev) => ({ ...prev, photoUrl: imageUrl }));
    } catch (error) {
      console.error("Erreur upload image:", error);
      alert("Erreur lors du chargement de l'image");
    } finally {
      setUploading(false);
    }
  };

  const handleAddArticle = async () => {
    if (!validateForm() || !restaurantId || !token) return;
    try {
      await menuAPI.createArticle({
        ...newArticle,
        prix: parseFloat(newArticle.prix),
        stock: parseInt(newArticle.stock) || 0,
        restaurantId,
      });
      setShowAddForm(false);
      setNewArticle({
        nom: "",
        prix: "",
        categorieId: "",
        description: "",
        stock: "",
        disponible: true,
        photoUrl: "",
      });
      // Refresh data
      const artRes = await menuAPI.getAll({ restaurantId, cible: "TOUS" });
      setArticles(artRes.data || []);
    } catch (error) {
      console.error("Erreur ajout article:", error);
      alert(error.response?.data?.message || "Erreur lors de la création");
    }
  };

  const handleToggleDisponibilite = async (articleId, disponible) => {
    try {
      await menuAPI.toggleArticle(articleId, disponible);
      setArticles((prev) =>
        prev.map((article) =>
          article.id === articleId ? { ...article, disponible } : article,
        ),
      );
    } catch (error) {
      console.error("Erreur mise à jour disponibilité:", error);
      alert("Erreur lors de la mise à jour");
    }
  };

  const filteredArticles = articles.filter(
    (a) =>
      a.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.categorie?.nom?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="h-9 w-9 rounded-full border-4 border-violet-500 border-t-transparent animate-spin shadow-[0_0_24px_rgba(139,92,246,0.18)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#E8D9FB] bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-violet-700 shadow-sm">
              <Package className="h-3.5 w-3.5" />
              Gestion visuelle du catalogue
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#2D2720]">Gestion du menu</h3>
              <p className="mt-1 text-sm text-[#7A6A58]">
                Activez, organisez et enrichissez le catalogue de votre restaurant.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white px-3 py-1.5 text-violet-700 shadow-sm">
                {articles.length} article(s)
              </span>
              <span className="rounded-full bg-white px-3 py-1.5 text-emerald-700 shadow-sm">
                {articles.filter((article) => article.disponible).length} disponible(s)
              </span>
              <span className="rounded-full bg-white px-3 py-1.5 text-amber-700 shadow-sm">
                {categories.length} catégorie(s)
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowCategoryForm(!showCategoryForm)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-fuchsia-700"
            >
              <Plus className="h-4 w-4" />
              {showCategoryForm ? "Fermer catégorie" : "Nouvelle catégorie"}
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-600 hover:to-teal-600"
            >
              <Plus className="h-4 w-4" />
              {showAddForm ? "Fermer article" : "Nouvel article"}
            </button>
          </div>
        </div>
      </section>

      {showCategoryForm && (
        <div className="rounded-[26px] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-6 shadow-sm space-y-4">
          <h4 className="text-lg font-bold text-[#2D2720]">Créer une nouvelle catégorie</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2720]">
                Nom de la catégorie *
              </label>
              <input
                type="text"
                value={newCategory.nom}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, nom: e.target.value })
                }
                className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-violet-400 ${categoryErrors.nom ? "border-red-500" : "border-violet-200"}`}
                placeholder="Ex: Plats Principaux"
              />
              {categoryErrors.nom && (
                <p className="mt-1 text-xs text-red-500">{categoryErrors.nom}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2720]">
                Icône
              </label>
              <input
                type="text"
                value={newCategory.icone}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, icone: e.target.value })
                }
                className="w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none transition focus:border-violet-400"
                placeholder="Ex: 🍽️"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleCreateCategory}
              className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-fuchsia-700"
            >
              Créer la catégorie
            </button>
            <button
              onClick={() => {
                setShowCategoryForm(false);
                setCategoryErrors({});
              }}
              className="rounded-2xl border border-violet-200 bg-white px-6 py-3 font-semibold text-[#2D2720] transition hover:bg-violet-50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="rounded-[26px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 shadow-sm space-y-4">
          <h4 className="text-lg font-bold text-[#2D2720]">Créer un nouvel article</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2720]">Nom *</label>
              <input
                type="text"
                value={newArticle.nom}
                onChange={(e) =>
                  setNewArticle({ ...newArticle, nom: e.target.value })
                }
                className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-emerald-400 ${formErrors.nom ? "border-red-500" : "border-emerald-200"}`}
                placeholder="Ex: Attiéké Poisson"
              />
              {formErrors.nom && <p className="mt-1 text-xs text-red-500">{formErrors.nom}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2720]">Prix (FCFA) *</label>
              <input
                type="number"
                min="1"
                value={newArticle.prix}
                onChange={(e) =>
                  setNewArticle({ ...newArticle, prix: e.target.value })
                }
                className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-emerald-400 ${formErrors.prix ? "border-red-500" : "border-emerald-200"}`}
                placeholder="Ex: 3500"
              />
              {formErrors.prix && <p className="mt-1 text-xs text-red-500">{formErrors.prix}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2720]">Catégorie *</label>
              <select
                value={newArticle.categorieId}
                onChange={(e) =>
                  setNewArticle({ ...newArticle, categorieId: e.target.value })
                }
                className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-emerald-400 ${formErrors.categorieId ? "border-red-500" : "border-emerald-200"}`}
              >
                <option value="">Sélectionner une catégorie</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nom} {cat.icone || ""}
                  </option>
                ))}
              </select>
              {formErrors.categorieId && (
                <p className="mt-1 text-xs text-red-500">{formErrors.categorieId}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2720]">Stock initial</label>
              <input
                type="number"
                min="0"
                value={newArticle.stock}
                onChange={(e) =>
                  setNewArticle({ ...newArticle, stock: e.target.value })
                }
                className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-emerald-400 ${formErrors.stock ? "border-red-500" : "border-emerald-200"}`}
                placeholder="Ex: 50"
              />
              {formErrors.stock && <p className="mt-1 text-xs text-red-500">{formErrors.stock}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[#2D2720]">Photo de l'article</label>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newArticle.photoUrl}
                    onChange={(e) =>
                      setNewArticle({ ...newArticle, photoUrl: e.target.value })
                    }
                    className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 outline-none transition focus:border-emerald-400"
                    placeholder="URL de l'image ou laissez vide"
                  />
                  <p className="mt-2 text-xs text-[#7A6A58]">
                    Ou téléchargez depuis votre ordinateur.
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files[0])}
                    className="mt-2 block text-sm"
                    disabled={uploading}
                  />
                  {uploading && (
                    <p className="mt-2 text-sm text-emerald-600">Chargement en cours...</p>
                  )}
                </div>
                {newArticle.photoUrl && (
                  <div className="h-24 w-24 overflow-hidden rounded-2xl border border-emerald-200 shadow-sm">
                    <img
                      src={newArticle.photoUrl}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#2D2720]">Description</label>
            <textarea
              value={newArticle.description}
              onChange={(e) =>
                setNewArticle({ ...newArticle, description: e.target.value })
              }
              className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 outline-none transition focus:border-emerald-400"
              rows="3"
              placeholder="Description du plat..."
            />
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleAddArticle}
              className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white shadow-sm transition hover:from-emerald-600 hover:to-teal-600"
            >
              Créer l'article
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setFormErrors({});
              }}
              className="rounded-2xl border border-emerald-200 bg-white px-6 py-3 font-semibold text-[#2D2720] transition hover:bg-emerald-50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="rounded-[24px] border border-[#EADCF6] bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un article ou une catégorie..."
            className="w-full rounded-2xl border border-violet-200 bg-violet-50/40 py-3 pl-10 pr-4 outline-none transition focus:border-violet-400"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredArticles.length > 0 ? (
          filteredArticles.map((a) => (
            <div
              key={a.id}
              className="rounded-[24px] border border-[#EADCF6] bg-gradient-to-br from-white via-white to-violet-50/40 p-4 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-violet-100 text-2xl shadow-sm">
                    {a.photoUrl ? (
                      <img
                        src={a.photoUrl}
                        alt={a.nom}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      a.categorie?.icone || "🍽️"
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#2D2720]">{a.nom}</p>
                      <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">
                        {a.categorie?.nom || "Sans catégorie"}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${a.disponible ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                      >
                        {a.disponible ? "Disponible" : "Masqué"}
                      </span>
                    </div>
                    <p className="text-sm text-[#7A6A58]">Stock: {a.stock ?? 0}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-lg font-bold text-violet-700">
                    {formatFCFA(Number(a.prix || 0))}
                  </span>
                  <button
                    onClick={() => handleToggleDisponibilite(a.id, !a.disponible)}
                    className={`relative h-8 w-14 rounded-full transition-all ${a.disponible ? "bg-emerald-500" : "bg-slate-300"}`}
                    title={a.disponible ? "Désactiver" : "Activer"}
                  >
                    <span
                      className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${a.disponible ? "translate-x-6" : ""}`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[24px] border border-dashed border-[#EADCF6] bg-white px-4 py-10 text-center text-[#8B7355]">
            Aucun article trouvé
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== COMMANDES MODULE ====================
function OrdersTab({ restaurantId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [error, setError] = useState(null);
  const [nowTs, setNowTs] = useState(0);

  const loadOrders = useCallback(async (options = {}) => {
    if (!restaurantId) return;
    try {
      if (!options.silent) {
        setLoading(true);
      }
      setError(null);

      const [clientRes, b2bRes] = await Promise.allSettled([
        commandesService.getAll({ restaurantId, limit: 50 }),
        b2bAPI.getManagerOrders(),
      ]);

      const { orders: merged, hasClientError, hasB2bError, hasAnySuccess } =
        mergeManagerOrdersResults(clientRes, b2bRes);

      setOrders(merged);

      if (!hasAnySuccess) {
        setError("Impossible de charger les commandes client et entreprise.");
      } else if (hasClientError) {
        setError(
          "Les commandes client sont temporairement indisponibles. Affichage des commandes entreprise.",
        );
      } else if (hasB2bError) {
        setError(
          "Les commandes entreprise sont temporairement indisponibles. Affichage des commandes client.",
        );
      }
    } catch (loadError) {
      console.error("Erreur chargement commandes:", loadError);
      setError("Impossible de charger les commandes client et entreprise.");
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }, [restaurantId]);

  useEffect(() => {
    const refreshNow = () => setNowTs(Date.now());
    refreshNow();
    const interval = setInterval(refreshNow, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    void loadOrders();

    const pollingInterval = setInterval(() => {
      void loadOrders({ silent: true });
    }, 30000);

    const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUser = cachedUser?.user || cachedUser;
    const socket = createCommandesSocket(currentUser);

    const refreshFromSocket = () => {
      void loadOrders({ silent: true });
    };

    socket.on('commande.nouvelle', refreshFromSocket);
    socket.on('commande.statut', refreshFromSocket);
    socket.on('commande.paiement', refreshFromSocket);

    return () => {
      clearInterval(pollingInterval);
      socket.disconnect();
    };
  }, [loadOrders]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await commandesService.updateStatus(orderId, newStatus);
      await loadOrders({ silent: true });
    } catch (error) {
      console.error("Erreur mise à jour statut:", error);
      alert("Erreur lors de la mise à jour du statut");
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      RECUE: "bg-sky-100 text-sky-800",
      CONFIRMEE: "bg-violet-100 text-violet-800",
      EN_PREP: "bg-amber-100 text-amber-800",
      PRETE: "bg-green-100 text-green-800",
      LIVREE: "bg-teal-100 text-teal-800",
      ANNULEE: "bg-rose-100 text-rose-800",
      EN_ATTENTE: "bg-yellow-100 text-yellow-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status) => {
    const labels = {
      RECUE: "Reçue",
      CONFIRMEE: "Confirmée",
      EN_PREP: "En préparation",
      PRETE: "Prête",
      LIVREE: "Livrée",
      ANNULEE: "Annulée",
      EN_ATTENTE: "En attente",
    };
    return labels[status] || status;
  };

  const orderAgeMinutes = (order) =>
    (nowTs - new Date(order.createdAt).getTime()) / 60000;

  const canCancelOrder = (order) =>
    order.statut === "RECUE" && orderAgeMinutes(order) <= 5;

  const canConfirmOrder = (order) => order.statut === "RECUE";
  const canPrepareOrder = (order) => order.statut === "CONFIRMEE";
  const canMarkReady = (order) => order.statut === "EN_PREP";
  const canCompleteOrder = (order) => order.statut === "PRETE";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-gray-800 text-lg">
          Gestion des Commandes
        </h3>
        <p className="text-sm text-gray-600">
          Valider, annuler et suivre les commandes en temps réel
        </p>
      </div>

      <div className="grid gap-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-2xl border border-violet-100 p-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-semibold">Commande #{order.numero}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                    {order.source}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.statut)}`}
                  >
                    {getStatusLabel(order.statut)}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {new Date(order.createdAt).toLocaleString("fr-FR")}
                </p>
                <p className="text-sm text-gray-500">Référence CDC: {order.numero}</p>
                <p className="font-medium text-violet-600">
                  {Number(order.amount || 0).toLocaleString()} FCFA
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {order.type === "CLIENT" && canCancelOrder(order) && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "ANNULEE")}
                    className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-sm hover:bg-rose-600 transition"
                  >
                    Annuler
                  </button>
                )}
                {order.type === "CLIENT" && canConfirmOrder(order) && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "CONFIRMEE")}
                    className="px-3 py-1.5 bg-violet-500 text-white rounded-lg text-sm hover:bg-violet-600 transition"
                  >
                    Valider
                  </button>
                )}
                {order.type === "CLIENT" && canPrepareOrder(order) && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "EN_PREP")}
                    className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 transition"
                  >
                    En préparation
                  </button>
                )}
                {order.type === "CLIENT" && canMarkReady(order) && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "PRETE")}
                    className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition"
                  >
                    Prête
                  </button>
                )}
                {order.type === "CLIENT" && canCompleteOrder(order) && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "LIVREE")}
                    className="px-3 py-1.5 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600 transition"
                  >
                    Valider remise
                  </button>
                )}
                {order.type === "B2B" && (
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm">
                    Commande entreprise - lecture seule
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="text-center py-8 text-red-600">
          {error}
        </div>
      )}
      {orders.length === 0 && !error && (
        <div className="text-center py-12 text-gray-600">
          <ClipboardList className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Aucune commande récente</p>
        </div>
      )}
    </div>
  );
}

// ==================== STOCKS MODULE ====================
function StocksTab({ restaurantId }) {
  const [stocks, setStocks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjustmentForm, setAdjustmentForm] = useState({
    articleId: "",
    quantity: "",
    motif: "",
  });

  useEffect(() => {
    const loadStocks = async () => {
      if (!restaurantId) return;
      try {
        setLoading(true);
        const stocksRes = await stocksAPI.getAll({ restaurantId });
        setStocks(stocksRes.data || []);

        const alertsRes = await stocksAPI.getAlerts({ restaurantId });
        setAlerts(alertsRes.data || []);
      } catch (error) {
        console.error("Erreur chargement stocks:", error);
        // Fallback to mock data
        setStocks([
          {
            id: "1",
            nom: "Riz",
            stock: 25,
            unite: "kg",
            seuil: 10,
          },
          {
            id: "2",
            nom: "Poisson",
            stock: 8,
            unite: "kg",
            seuil: 5,
          },
          {
            id: "3",
            nom: "Tomates",
            stock: 15,
            unite: "kg",
            seuil: 8,
          },
        ]);
        setAlerts([
          { id: "2", nom: "Poisson", stock: 8, seuil: 10 },
        ]);
      } finally {
        setLoading(false);
      }
    };
    loadStocks();
  }, [restaurantId]);

  const handleAdjustStock = async () => {
    try {
      if (!adjustmentForm.articleId || !adjustmentForm.quantity) {
        alert("Article et quantité sont requis");
        return;
      }

      await stocksAPI.adjust(
        adjustmentForm.articleId,
        parseInt(adjustmentForm.quantity),
        adjustmentForm.motif || "Ajustement manuel",
      );

      alert("Stock ajusté avec succès!");
      setAdjustmentForm({ articleId: "", quantity: "", motif: "" });

      // Refresh data
      const stocksRes = await stocksAPI.getAll({ restaurantId });
      setStocks(stocksRes.data || []);
    } catch (error) {
      console.error("Erreur ajustement stock:", error);
      alert("Erreur lors de l'ajustement du stock");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="h-9 w-9 rounded-full border-4 border-amber-500 border-t-transparent animate-spin shadow-[0_0_24px_rgba(245,158,11,0.2)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#F5DFC0] bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-700 shadow-sm">
              <AlertTriangle className="h-3.5 w-3.5" />
              Pilotage de l'inventaire
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#2D2720]">Gestion des stocks</h3>
              <p className="mt-1 text-sm text-[#7A6A58]">
                Inventaire en temps réel, seuils critiques et ajustements rapides.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white px-3 py-1.5 text-amber-700 shadow-sm">
                {stocks.length} article(s) suivis
              </span>
              <span className="rounded-full bg-white px-3 py-1.5 text-rose-700 shadow-sm">
                {alerts.length} alerte(s)
              </span>
            </div>
          </div>
          <button
            onClick={handleAdjustStock}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-amber-600 hover:to-orange-600"
          >
            <RefreshCcw className="h-4 w-4" />
            Ajuster un stock
          </button>
        </div>
      </section>

      {alerts.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-[22px] border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-orange-50 p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-rose-100 p-2 text-rose-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-[#2D2720]">{alert.nom}</div>
                  <div className="mt-1 text-sm text-rose-700">
                    Stock actuel {Math.max(0, Number(alert.stock || 0))} / seuil {Math.max(0, Number(alert.seuil || 0))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[26px] border border-[#F5DFC0] bg-white p-6 shadow-sm">
        <h4 className="text-lg font-bold text-[#2D2720]">Ajustement manuel de stock</h4>
        <p className="mt-1 text-sm text-[#7A6A58]">
          Utilisez ce panneau pour corriger un écart, enregistrer une réception ou une casse.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#2D2720]">Article</label>
            <select
              value={adjustmentForm.articleId}
              onChange={(e) =>
                setAdjustmentForm({
                  ...adjustmentForm,
                  articleId: e.target.value,
                })
              }
              className="w-full rounded-2xl border border-amber-200 bg-amber-50/30 px-4 py-3 outline-none transition focus:border-amber-400"
            >
              <option value="">Sélectionner un article</option>
              {stocks.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#2D2720]">Quantité</label>
            <input
              type="number"
              value={adjustmentForm.quantity}
              onChange={(e) =>
                setAdjustmentForm({
                  ...adjustmentForm,
                  quantity: e.target.value,
                })
              }
              className="w-full rounded-2xl border border-amber-200 bg-amber-50/30 px-4 py-3 outline-none transition focus:border-amber-400"
              placeholder="Ex: +5 ou -2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#2D2720]">Motif</label>
            <input
              type="text"
              value={adjustmentForm.motif}
              onChange={(e) =>
                setAdjustmentForm({ ...adjustmentForm, motif: e.target.value })
              }
              className="w-full rounded-2xl border border-amber-200 bg-amber-50/30 px-4 py-3 outline-none transition focus:border-amber-400"
              placeholder="Optionnel"
            />
          </div>
        </div>
        <button
          onClick={handleAdjustStock}
          className="mt-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 font-semibold text-white shadow-sm transition hover:from-amber-600 hover:to-orange-600"
        >
          Enregistrer l'ajustement
        </button>
      </div>

      <div className="rounded-[26px] border border-[#F5DFC0] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-lg font-bold text-[#2D2720]">Inventaire</h4>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            Vue détaillée
          </span>
        </div>
        <div className="grid gap-3">
          {stocks.map((item) => {
            const stockValue = Math.max(0, Number(item.stock || 0));
            const seuil = Math.max(0, Number(item.seuilMin || item.seuil || 5));
            const enAlerte = stockValue <= seuil;
            return (
              <div
                key={item.id}
                className={`rounded-[22px] border p-4 shadow-sm ${enAlerte ? "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-orange-50" : "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50"}`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="font-semibold text-[#2D2720]">{item.nom}</div>
                    <div className="mt-1 text-sm text-[#7A6A58]">
                      Stock: {stockValue} {item.unite || "unités"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#7A6A58] shadow-sm">
                      Seuil min: {seuil} {item.unite || "unités"}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${enAlerte ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}
                    >
                      {enAlerte ? "Alerte" : "OK"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {stocks.length === 0 && (
        <div className="rounded-[24px] border border-dashed border-[#F5DFC0] bg-white px-4 py-12 text-center text-[#8B7355]">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-amber-300" />
          <p>Aucun stock configuré</p>
        </div>
      )}
    </div>
  );
}

// ==================== FINANCE MODULE ====================
function FinanceTab({ restaurantId }) {
  const [kpiData, setKpiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("day");
  const [expenseForm, setExpenseForm] = useState({
    categorie: "",
    montant: "",
    description: "",
  });
  const [budgetConfig, setBudgetConfig] = useState({
    plafondMensuel: "",
    alerte80: true,
    alerte100: true,
  });

  useEffect(() => {
    const loadFinanceData = async () => {
      if (!restaurantId) return;
      try {
        setLoading(true);
        const statsRes = await tresorerieAPI.getStats(period);
        setKpiData(statsRes.data);
      } catch (error) {
        console.error("Erreur chargement données financières:", error);
        // Fallback to mock data
        setKpiData({
          caJour: 125000,
          caSemaine: 875000,
          caMois: 3500000,
          nbCommandes: 42,
          ticketMoyen: 29762,
          margesBrutes: 68.5,
        });
      } finally {
        setLoading(false);
      }
    };

    loadFinanceData();
  }, [restaurantId, period]);

  const handleRecordExpense = async () => {
    try {
      if (!expenseForm.categorie || !expenseForm.montant) {
        alert("Catégorie et montant sont requis");
        return;
      }

      const expenseData = {
        categorie: expenseForm.categorie,
        montant: parseFloat(expenseForm.montant),
        description: expenseForm.description || "",
        date: new Date().toISOString(),
      };

      await tresorerieAPI.recordExpense(expenseData);
      alert("Dépense enregistrée avec succès!");
      setExpenseForm({ categorie: "", montant: "", description: "" });
    } catch (error) {
      console.error("Erreur enregistrement dépense:", error);
      alert("Erreur lors de l'enregistrement de la dépense");
    }
  };

  const handleGenerateReport = async (reportPeriod) => {
    try {
      const reportRes = await tresorerieAPI.generateReport(reportPeriod);
      const report = reportRes.data || {};
      const pdfBlob = buildSimplePdfBlob(
        `Rapport ${reportPeriod} ${report.restaurantId || restaurantId || "restaurant"}`,
        [
          `Periode: ${reportPeriod}`,
          `Genere le: ${new Date().toLocaleString("fr-FR")}`,
          `Revenus: ${formatFCFA(report.summary?.totalRevenue || 0)}`,
          `Depenses: ${formatFCFA(report.summary?.totalExpenses || 0)}`,
          `Profit net: ${formatFCFA(report.summary?.netProfit || 0)}`,
          `Marge: ${report.summary?.profitMargin || 0}%`,
        ],
      );
      downloadAndOpenBlob(pdfBlob, `rapport-${reportPeriod}-${restaurantId || "restaurant"}.pdf`);
    } catch (error) {
      console.error("Erreur génération rapport:", error);
      alert("Erreur lors de la génération du rapport");
    }
  };

  const handleConfigureBudget = async () => {
    try {
      if (!budgetConfig.plafondMensuel) {
        alert("Plafond mensuel est requis");
        return;
      }

      const configData = {
        plafondMensuel: parseFloat(budgetConfig.plafondMensuel),
        alerte80: budgetConfig.alerte80,
        alerte100: budgetConfig.alerte100,
      };

      await tresorerieAPI.configureBudgetAlerts(configData);
      alert("Configuration du budget sauvegardée!");
    } catch (error) {
      console.error("Erreur configuration budget:", error);
      alert("Erreur lors de la configuration du budget");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="h-9 w-9 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin shadow-[0_0_24px_rgba(16,185,129,0.18)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm">
              <Wallet className="h-3.5 w-3.5" />
              Trésorerie & reporting
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#2D2720]">Pilotage financier</h3>
              <p className="mt-1 text-sm text-[#7A6A58]">
                Analysez les revenus, enregistrez les dépenses et pilotez les budgets.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {["day", "week", "month"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  period === p
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm"
                    : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                {p === "day" ? "Jour" : p === "week" ? "Semaine" : "Mois"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-[24px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 shadow-sm">
          <div className="text-sm font-medium text-emerald-700">
            {period === "day"
              ? "CA Aujourd'hui"
              : period === "week"
                ? "CA Semaine"
                : "CA Mois"}
          </div>
          <div className="mt-2 text-2xl font-bold text-[#14532D]">
            {formatFCFA(
              period === "day"
                ? kpiData.caJour
                : period === "week"
                  ? kpiData.caSemaine
                  : kpiData.caMois,
            )}
          </div>
        </div>
        <div className="rounded-[24px] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-4 shadow-sm">
          <div className="text-sm font-medium text-violet-700">Nb commandes</div>
          <div className="mt-2 text-2xl font-bold text-[#2D2720]">{kpiData.nbCommandes}</div>
        </div>
        <div className="rounded-[24px] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4 shadow-sm">
          <div className="text-sm font-medium text-amber-700">Ticket moyen</div>
          <div className="mt-2 text-2xl font-bold text-[#2D2720]">
            {formatFCFA(kpiData.ticketMoyen)}
          </div>
        </div>
        <div className="rounded-[24px] border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-4 shadow-sm">
          <div className="text-sm font-medium text-sky-700">Marge brute</div>
          <div className="mt-2 text-2xl font-bold text-[#2D2720]">{kpiData.margesBrutes}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <div className="rounded-[26px] border border-emerald-200 bg-white p-6 shadow-sm">
          <h4 className="text-lg font-bold text-[#2D2720]">Saisir une dépense opérationnelle</h4>
          <p className="mt-1 text-sm text-[#7A6A58]">
            Chaque dépense saisie est destinée à la vue trésorerie du restaurant.
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2720]">Catégorie *</label>
              <select
                value={expenseForm.categorie}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, categorie: e.target.value })
                }
                className="w-full rounded-2xl border border-emerald-200 bg-emerald-50/30 px-4 py-3 outline-none transition focus:border-emerald-400"
              >
                <option value="">Sélectionner...</option>
                <option value="loyer">Loyer</option>
                <option value="salaires">Salaires</option>
                <option value="fournitures">Fournitures</option>
                <option value="electricite">Électricité</option>
                <option value="eau">Eau</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2720]">Montant (FCFA) *</label>
              <input
                type="number"
                min="1"
                value={expenseForm.montant}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, montant: e.target.value })
                }
                className="w-full rounded-2xl border border-emerald-200 bg-emerald-50/30 px-4 py-3 outline-none transition focus:border-emerald-400"
                placeholder="Ex: 50000"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2720]">Description</label>
              <input
                type="text"
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, description: e.target.value })
                }
                className="w-full rounded-2xl border border-emerald-200 bg-emerald-50/30 px-4 py-3 outline-none transition focus:border-emerald-400"
                placeholder="Optionnel"
              />
            </div>
          </div>
          <button
            onClick={handleRecordExpense}
            className="mt-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white shadow-sm transition hover:from-emerald-600 hover:to-teal-600"
          >
            Enregistrer la dépense
          </button>
        </div>

        <div className="rounded-[26px] border border-violet-200 bg-white p-6 shadow-sm">
          <h4 className="text-lg font-bold text-[#2D2720]">Actions disponibles</h4>
          <p className="mt-1 text-sm text-[#7A6A58]">
            Exports financiers et paramètres de budget centralisés.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3">
            <button
              onClick={() => handleGenerateReport("monthly")}
              className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-violet-600 hover:to-fuchsia-600"
            >
              <Download className="h-5 w-5" />
              Rapport mensuel (PDF/Excel)
            </button>
            <button
              onClick={() => handleGenerateReport("quarterly")}
              className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-amber-600 hover:to-orange-600"
            >
              <BarChart3 className="h-5 w-5" />
              Rapport trimestriel
            </button>
            <button
              onClick={() => handleGenerateReport("yearly")}
              className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-sky-600 hover:to-cyan-600"
            >
              <TrendingUp className="h-5 w-5" />
              Rapport annuel
            </button>
            <div className="rounded-[22px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
              <h5 className="font-semibold text-[#2D2720]">Configuration budget</h5>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                <input
                  type="number"
                  min="0"
                  value={budgetConfig.plafondMensuel}
                  onChange={(e) =>
                    setBudgetConfig({
                      ...budgetConfig,
                      plafondMensuel: e.target.value,
                    })
                  }
                  className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400"
                  placeholder="Plafond (FCFA)"
                />
                <button
                  onClick={handleConfigureBudget}
                  className="rounded-2xl bg-[#1F8A70] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#166D58]"
                >
                  Sauvegarder
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[#2D2720]">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={budgetConfig.alerte80}
                    onChange={(e) =>
                      setBudgetConfig({
                        ...budgetConfig,
                        alerte80: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded text-emerald-500"
                  />
                  Alerte à 80%
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={budgetConfig.alerte100}
                    onChange={(e) =>
                      setBudgetConfig({
                        ...budgetConfig,
                        alerte100: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded text-emerald-500"
                  />
                  Alerte à 100%
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== SETTINGS MODULE ====================
function SettingsTab({ restaurantId, user }) {
  const defaultLat = 5.3364;
  const defaultLng = -4.0267;
  const [settings, setSettings] = useState({
    nom: "",
    description: "",
    adresse: "",
    telephone: "",
    email: "",
    logo: "",
    horaires: { ouverture: "08:00", fermeture: "22:00" },
    zonesLivraison: [],
    newZone: { nom: "", lat: defaultLat, lng: defaultLng },
    latitude: defaultLat,
    longitude: defaultLng,
    darkMode: localStorage.getItem("darkMode") === "true",
  });
  const [staffAccounts, setStaffAccounts] = useState([]);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [staffForm, setStaffForm] = useState({
    email: "",
    nom: "",
    telephone: "",
    password: "",
  });
  const [staffCreationNotice, setStaffCreationNotice] = useState("");
  const [loadingStaff, setLoadingStaff] = useState(false);

  const syncStoredUserRestaurant = useCallback((restaurantData) => {
    const cachedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const nextUser = {
      ...cachedUser,
      restaurant: {
        ...(cachedUser.restaurant || {}),
        ...restaurantData,
      },
    };
    localStorage.setItem("user", JSON.stringify(nextUser));
    window.dispatchEvent(new CustomEvent("gerant-restaurant-updated", { detail: nextUser.restaurant }));
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      if (!restaurantId) return;
      try {
        setLoadingProfile(true);
        const profileRes = await restaurantAPI.getMine();
        const profile = profileRes.data || {};
        const zones = Array.isArray(profile.deliveryZones) ? profile.deliveryZones : [];
        setSettings((prev) => ({
          ...prev,
          nom: profile.nom || prev.nom,
          description: profile.description || "",
          adresse: profile.adresse || "",
          telephone: profile.telephone || "",
          email: profile.email || user?.email || "",
          logo: profile.logo || "",
          horaires: {
            ouverture: profile.openingTime || prev.horaires.ouverture,
            fermeture: profile.closingTime || prev.horaires.fermeture,
          },
          zonesLivraison: zones,
          newZone: {
            nom: "",
            lat: Number(profile.latitude) || defaultLat,
            lng: Number(profile.longitude) || defaultLng,
          },
          latitude: Number(profile.latitude) || defaultLat,
          longitude: Number(profile.longitude) || defaultLng,
        }));
        syncStoredUserRestaurant(profile);
      } catch (error) {
        console.error("Erreur chargement profil restaurant:", error);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadSettings();
  }, [defaultLat, defaultLng, restaurantId, syncStoredUserRestaurant, user?.email]);

  useEffect(() => {
    localStorage.setItem("darkMode", settings.darkMode ? "true" : "false");
    window.dispatchEvent(new CustomEvent("gerant-dark-mode-changed"));
  }, [settings.darkMode]);

  useEffect(() => {
    const loadStaff = async () => {
      if (!restaurantId) return;
      try {
        setLoadingStaff(true);
        const staffRes = await staffAPI.getStaffAccounts(restaurantId);
        setStaffAccounts(staffRes.data || []);
      } catch (error) {
        console.error("Erreur chargement staff:", error);
      } finally {
        setLoadingStaff(false);
      }
    };
    loadStaff();
  }, [restaurantId]);

  const handleSaveSettings = async () => {
    try {
      if (!restaurantId) return;
      setSavingSettings(true);
      const payload = {
        nom: settings.nom.trim(),
        description: settings.description.trim(),
        adresse: settings.adresse.trim(),
        telephone: settings.telephone.trim(),
        email: settings.email.trim(),
        logo: settings.logo.trim(),
        openingTime: settings.horaires.ouverture,
        closingTime: settings.horaires.fermeture,
        latitude: settings.latitude,
        longitude: settings.longitude,
        deliveryZones: settings.zonesLivraison,
      };

      const response = await restaurantAPI.update(restaurantId, payload);
      const savedProfile = response.data || payload;
      syncStoredUserRestaurant(savedProfile);
      setSettings((prev) => ({
        ...prev,
        nom: savedProfile.nom || prev.nom,
        description: savedProfile.description || "",
        adresse: savedProfile.adresse || "",
        telephone: savedProfile.telephone || "",
        email: savedProfile.email || prev.email,
        logo: savedProfile.logo || "",
        horaires: {
          ouverture: savedProfile.openingTime || prev.horaires.ouverture,
          fermeture: savedProfile.closingTime || prev.horaires.fermeture,
        },
        zonesLivraison: Array.isArray(savedProfile.deliveryZones)
          ? savedProfile.deliveryZones
          : prev.zonesLivraison,
        latitude: Number(savedProfile.latitude) || prev.latitude,
        longitude: Number(savedProfile.longitude) || prev.longitude,
      }));
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    } catch (error) {
      console.error("Erreur sauvegarde paramètres:", error);
      alert(error.response?.data?.message || "Erreur lors de la sauvegarde des paramètres");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddZone = () => {
    const zoneName = settings.newZone.nom.trim();
    if (!zoneName) {
      alert("Le nom de la zone est requis.");
      return;
    }

    if (
      settings.zonesLivraison.some(
        (zone) => (zone.nom || "").toLowerCase() === zoneName.toLowerCase(),
      )
    ) {
      alert("Cette zone existe déjà.");
      return;
    }

    setSettings((prev) => ({
      ...prev,
      zonesLivraison: [
        ...prev.zonesLivraison,
        {
          nom: zoneName,
          lat: Number(prev.newZone.lat) || null,
          lng: Number(prev.newZone.lng) || null,
        },
      ],
      newZone: {
        ...prev.newZone,
        nom: "",
      },
    }));
  };

  const handleRemoveZone = (zoneToRemove) => {
    setSettings((prev) => ({
      ...prev,
      zonesLivraison: prev.zonesLivraison.filter((zone) => zone.nom !== zoneToRemove.nom),
    }));
  };

  const handleMapPick = ({ lat, lng }) => {
    setSettings((prev) => ({
      ...prev,
      newZone: {
        ...prev.newZone,
        lat,
        lng,
      },
      latitude: lat,
      longitude: lng,
    }));
  };

  const toggleDarkMode = () => {
    setSettings((prev) => ({ ...prev, darkMode: !prev.darkMode }));
  };

  const handleCreateStaff = async () => {
    try {
      if (!staffForm.email || !staffForm.nom) {
        alert("Email et nom sont requis");
        return;
      }

      const staffData = {
        email: staffForm.email,
        nom: staffForm.nom,
        telephone: staffForm.telephone || "",
      };
      if (staffForm.password) {
        staffData.password = staffForm.password;
      }

      const response = await staffAPI.createStaffAccount(restaurantId, staffData);
      const generatedPassword = response.data?.temporaryPassword;

      if (generatedPassword) {
        setStaffCreationNotice(
          `Mot de passe temporaire généré : ${generatedPassword}. Transmets-le au nouveau staff.`,
        );
      } else {
        setStaffCreationNotice(
          "Le compte staff a été créé. Le mot de passe fourni est utilisé.",
        );
      }

      setStaffForm({ email: "", nom: "", telephone: "", password: "" });
      const staffRes = await staffAPI.getStaffAccounts(restaurantId);
      setStaffAccounts(staffRes.data || []);
    } catch (error) {
      console.error("Erreur création staff:", error);
      alert(error.response?.data?.message || "Erreur lors de la création du compte staff");
    }
  };

  const handleToggleStaff = async (staffId, currentStatus) => {
    try {
      await staffAPI.toggleStaffAccount(restaurantId, staffId, {
        actif: !currentStatus,
      });
      const staffRes = await staffAPI.getStaffAccounts(restaurantId);
      setStaffAccounts(staffRes.data || []);
    } catch (error) {
      console.error("Erreur activation/désactivation staff:", error);
      alert("Erreur lors de la modification du statut du compte");
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-sky-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-sky-700 shadow-sm">
              <Settings className="h-3.5 w-3.5" />
              Paramètres & configuration
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#2D2720]">Centre de configuration</h3>
              <p className="mt-1 text-sm text-[#7A6A58]">
                Profil restaurant, horaires, apparence, zones de livraison et comptes staff.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white px-3 py-1.5 text-sky-700 shadow-sm">
                {settings.zonesLivraison.length} zone(s)
              </span>
              <span className="rounded-full bg-white px-3 py-1.5 text-violet-700 shadow-sm">
                {staffAccounts.length} staff
              </span>
              <span className="rounded-full bg-white px-3 py-1.5 text-emerald-700 shadow-sm">
                {settings.horaires.ouverture} - {settings.horaires.fermeture}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 xl:items-end">
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-sky-600 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {savingSettings ? "Sauvegarde..." : "Sauvegarder les paramètres"}
            </button>
            {settingsSaved && (
              <p className="text-sm font-medium text-emerald-600">
                Paramètres sauvegardés avec succès.
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">
        <div className="space-y-6">
          <div className="rounded-[26px] border border-[#FFD8CC] bg-white p-6 shadow-sm">
            <h4 className="text-lg font-bold text-[#2D2720]">Profil du restaurant</h4>
            <p className="mt-1 text-sm text-[#7A6A58]">
              Ces informations alimentent la première carte du dashboard et la fiche publique du restaurant.
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#2D2720]">Nom du restaurant</label>
                <input
                  type="text"
                  value={settings.nom}
                  onChange={(e) => setSettings((prev) => ({ ...prev, nom: e.target.value }))}
                  className="w-full rounded-2xl border border-[#FFD8CC] bg-[#FFF8F3] px-4 py-3 outline-none transition focus:border-[#FF6B35]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#2D2720]">Téléphone</label>
                <input
                  type="tel"
                  value={settings.telephone}
                  onChange={(e) => setSettings((prev) => ({ ...prev, telephone: e.target.value }))}
                  className="w-full rounded-2xl border border-[#FFD8CC] bg-[#FFF8F3] px-4 py-3 outline-none transition focus:border-[#FF6B35]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#2D2720]">Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-2xl border border-[#FFD8CC] bg-[#FFF8F3] px-4 py-3 outline-none transition focus:border-[#FF6B35]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#2D2720]">Logo / photo</label>
                <input
                  type="text"
                  value={settings.logo}
                  onChange={(e) => setSettings((prev) => ({ ...prev, logo: e.target.value }))}
                  placeholder="URL du logo"
                  className="w-full rounded-2xl border border-[#FFD8CC] bg-[#FFF8F3] px-4 py-3 outline-none transition focus:border-[#FF6B35]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-[#2D2720]">Adresse</label>
                <input
                  type="text"
                  value={settings.adresse}
                  onChange={(e) => setSettings((prev) => ({ ...prev, adresse: e.target.value }))}
                  className="w-full rounded-2xl border border-[#FFD8CC] bg-[#FFF8F3] px-4 py-3 outline-none transition focus:border-[#FF6B35]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-[#2D2720]">Description</label>
                <textarea
                  value={settings.description}
                  onChange={(e) => setSettings((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full rounded-2xl border border-[#FFD8CC] bg-[#FFF8F3] px-4 py-3 outline-none transition focus:border-[#FF6B35]"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-sky-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-lg font-bold text-[#2D2720]">Apparence</h4>
                <p className="mt-1 text-sm text-[#7A6A58]">
                  Le mode sombre s'applique à tout le circuit gérant/admin.
                </p>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`relative h-8 w-14 rounded-full transition-all ${
                  settings.darkMode ? "bg-gradient-to-r from-sky-500 to-cyan-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    settings.darkMode ? "translate-x-6" : ""
                  }`}
                />
              </button>
            </div>
            <div className="mt-4 rounded-[22px] border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-cyan-50 p-4">
              <p className="text-sm font-medium text-[#2D2720]">Thème actuel</p>
              <p className="mt-1 text-sm text-[#7A6A58]">
                {settings.darkMode ? "Mode sombre activé" : "Mode clair activé"}
              </p>
            </div>
          </div>

          <div className="rounded-[26px] border border-violet-200 bg-white p-6 shadow-sm">
            <h4 className="text-lg font-bold text-[#2D2720]">Horaires d'ouverture</h4>
            <p className="mt-1 text-sm text-[#7A6A58]">
              Les horaires utilisés proviennent désormais du profil restaurant et peuvent être modifiés ici.
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#2D2720]">Ouverture</label>
                <input
                  type="time"
                  value={settings.horaires.ouverture}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      horaires: { ...prev.horaires, ouverture: e.target.value },
                    }))
                  }
                  className="w-full rounded-2xl border border-violet-200 bg-violet-50/30 px-4 py-3 outline-none transition focus:border-violet-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#2D2720]">Fermeture</label>
                <input
                  type="time"
                  value={settings.horaires.fermeture}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      horaires: { ...prev.horaires, fermeture: e.target.value },
                    }))
                  }
                  className="w-full rounded-2xl border border-violet-200 bg-violet-50/30 px-4 py-3 outline-none transition focus:border-violet-400"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[26px] border border-amber-200 bg-white p-6 shadow-sm">
            <h4 className="text-lg font-bold text-[#2D2720]">Zones de livraison</h4>
            <p className="mt-1 text-sm text-[#7A6A58]">
              Ajoutez vos zones manuellement ou cliquez dans la carte simplifiée pour positionner la zone.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <input
                    type="text"
                    value={settings.newZone.nom}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        newZone: { ...prev.newZone, nom: e.target.value },
                      }))
                    }
                    placeholder="Nom de la zone"
                    className="rounded-2xl border border-amber-200 bg-amber-50/30 px-4 py-3 outline-none transition focus:border-amber-400 md:col-span-3"
                  />
                  <input
                    type="number"
                    step="0.000001"
                    value={settings.newZone.lat}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        newZone: { ...prev.newZone, lat: e.target.value },
                      }))
                    }
                    className="rounded-2xl border border-amber-200 bg-amber-50/30 px-4 py-3 outline-none transition focus:border-amber-400"
                  />
                  <input
                    type="number"
                    step="0.000001"
                    value={settings.newZone.lng}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        newZone: { ...prev.newZone, lng: e.target.value },
                      }))
                    }
                    className="rounded-2xl border border-amber-200 bg-amber-50/30 px-4 py-3 outline-none transition focus:border-amber-400"
                  />
                  <button
                    onClick={handleAddZone}
                    className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 font-semibold text-white shadow-sm transition hover:from-amber-600 hover:to-orange-600"
                  >
                    Ajouter
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {settings.zonesLivraison.map((zone, index) => (
                    <div
                      key={`${zone.nom}-${index}`}
                      className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-[#7A4B12]"
                    >
                      <span>{zone.nom}</span>
                      {zone.lat && zone.lng && (
                        <span className="text-xs text-[#A16207]">
                          {Number(zone.lat).toFixed(3)}, {Number(zone.lng).toFixed(3)}
                        </span>
                      )}
                      <button
                        onClick={() => handleRemoveZone(zone)}
                        className="font-semibold text-[#7A4B12] transition hover:text-[#B45309]"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="rounded-[24px] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4">
                  <p className="text-sm font-semibold text-[#2D2720]">Carte OpenStreetMap</p>
                  <p className="mt-1 text-xs text-[#7A6A58]">
                    Cliquez directement sur la carte pour récupérer une vraie latitude et longitude.
                  </p>
                  <DeliveryZonesMap
                    restaurantPosition={{ lat: settings.latitude, lng: settings.longitude }}
                    selectedPosition={{ lat: settings.newZone.lat, lng: settings.newZone.lng }}
                    zones={settings.zonesLivraison}
                    onPick={handleMapPick}
                  />
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#7A6A58]">
                    <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">
                      Position restaurant: {Number(settings.latitude).toFixed(4)}, {Number(settings.longitude).toFixed(4)}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">
                      Zone en cours: {Number(settings.newZone.lat).toFixed(4)}, {Number(settings.newZone.lng).toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-violet-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-lg font-bold text-[#2D2720]">Gestion des comptes staff</h4>
                <p className="mt-1 text-sm text-[#7A6A58]">
                  RBAC strict : un seul rôle actif par utilisateur (RG-31).
                </p>
              </div>
              <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700">
                {staffAccounts.length} compte(s)
              </span>
            </div>

            <div className="mt-4 rounded-[24px] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-violet-700">
                <UserPlus className="h-4 w-4" />
                Créer un nouveau compte staff
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#2D2720]">Email *</label>
                  <input
                    type="email"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    className="w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none transition focus:border-violet-400"
                    placeholder="staff@restaurant.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#2D2720]">Téléphone</label>
                  <input
                    type="tel"
                    value={staffForm.telephone}
                    onChange={(e) => setStaffForm({ ...staffForm, telephone: e.target.value })}
                    className="w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none transition focus:border-violet-400"
                    placeholder="+225 XX XX XX XX"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-[#2D2720]">Nom complet *</label>
                  <input
                    type="text"
                    value={staffForm.nom}
                    onChange={(e) => setStaffForm({ ...staffForm, nom: e.target.value })}
                    className="w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none transition focus:border-violet-400"
                    placeholder="Ex: Konan Aya"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-[#2D2720]">Mot de passe (optionnel)</label>
                  <input
                    type="password"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    className="w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 outline-none transition focus:border-violet-400"
                    placeholder="Laisser vide pour générer un mot de passe"
                  />
                </div>
              </div>
              <button
                onClick={handleCreateStaff}
                className="mt-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-fuchsia-700"
              >
                Créer le compte staff
              </button>
              {staffCreationNotice && (
                <div className="mt-4 rounded-2xl border border-violet-200 bg-white/80 p-4 text-sm text-violet-700 shadow-sm">
                  {staffCreationNotice}
                </div>
              )}
            </div>

            <div className="mt-5">
              <h5 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8B7355]">
                Comptes existants
              </h5>
              {loadingStaff ? (
                <div className="flex items-center justify-center py-6">
                  <div className="h-7 w-7 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
                </div>
              ) : staffAccounts.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {staffAccounts.map((staff) => (
                    <div
                      key={staff.id}
                      className="flex flex-col gap-3 rounded-[22px] border border-[#EFE7FB] bg-gradient-to-r from-white to-violet-50/70 p-4 shadow-sm md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-[#2D2720]">{staff.nom}</p>
                        <p className="text-sm text-[#7A6A58]">{staff.email}</p>
                        <p className="text-xs text-[#8B7355]">{staff.telephone || "Pas de téléphone"}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                            staff.actif ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {staff.actif ? "Actif" : "Inactif"}
                        </span>
                        <button
                          onClick={() => handleToggleStaff(staff.id, staff.actif)}
                          className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                            staff.actif
                              ? "bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600"
                              : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                          }`}
                        >
                          {staff.actif ? "Désactiver" : "Activer"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-center text-sm text-[#7A6A58]">Aucun compte staff créé</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function sanitizePdfText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[()\\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSimplePdfBlob(title, lines) {
  const safeLines = [title, ...lines].map((line) => sanitizePdfText(line));
  const contentLines = safeLines
    .map((line, index) => `BT /F1 12 Tf 50 ${760 - index * 18} Td (${line}) Tj ET`)
    .join("\n");
  const stream = `${contentLines}\n`;
  const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj
4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
5 0 obj << /Length ${stream.length} >> stream
${stream}endstream endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000063 00000 n 
0000000122 00000 n 
0000000248 00000 n 
0000000318 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
${318 + stream.length}
%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function downloadAndOpenBlob(blob, fileName) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
}

function computeWeeklyPerformance(orders) {
  const today = new Date();
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  const labels = [];
  const orderCounts = Array(7).fill(0);
  const revenue = Array(7).fill(0);

  for (let dayOffset = 6; dayOffset >= 0; dayOffset -= 1) {
    const day = new Date(startOfToday);
    day.setDate(day.getDate() - dayOffset);
    labels.push(
      day
        .toLocaleDateString("fr-FR", { weekday: "short" })
        .replace(".", ""),
    );
  }

  orders.forEach((order) => {
    const created = new Date(order.createdAt);
    if (Number.isNaN(created.getTime())) return;
    const createdDay = new Date(created);
    createdDay.setHours(0, 0, 0, 0);
    const diffDays = Math.round(
      (startOfToday.getTime() - createdDay.getTime()) / 86400000,
    );
    if (diffDays >= 0 && diffDays < 7) {
      const index = 6 - diffDays;
      orderCounts[index] += 1;
      const amount = Number(order.montantTotal ?? order.total ?? 0);
      revenue[index] += Number.isFinite(amount) ? amount : 0;
    }
  });

  return {
    labels,
    orders: orderCounts,
    revenue,
  };
}

// ==================== DYNAMIC OVERVIEW MODULE ====================
function OverviewTab({ restaurantId }) {
  const navigate = useNavigate();
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [restaurantProfile, setRestaurantProfile] = useState(() => {
    const cachedUser = JSON.parse(localStorage.getItem("user") || "{}");
    return cachedUser?.restaurant || {};
  });
  const restaurantName = restaurantProfile?.nom || "votre restaurant";
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    activeOrders: 0,
    lowStockItems: 0,
    uniqueCustomers: 0,
    staffCount: 0,
    b2bOrders: 0,
  });
  const [financialHighlights, setFinancialHighlights] = useState({
    ticketMoyen: 0,
    nbCommandes: 0,
    margesBrutes: 0,
  });
  const [weeklyPerformance, setWeeklyPerformance] = useState({
    labels: [],
    orders: [],
    revenue: [],
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState("");
  const [clockTs, setClockTs] = useState(0);

  const loadOverviewData = useCallback(
    async ({ silent = false } = {}) => {
      if (!restaurantId) return;

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [ordersRes, alertsRes, financeRes, staffRes, b2bRes] =
        await Promise.allSettled([
          commandesService.getAll({ restaurantId, limit: 50 }),
          stocksAPI.getAlerts({ restaurantId }),
          tresorerieAPI.getStats("day"),
          staffAPI.getStaffAccounts(restaurantId),
          b2bAPI.getManagerOrders(),
        ]);

      const clientOrders =
        ordersRes.status === "fulfilled"
          ? (ordersRes.value.data || []).map((order) => ({
              ...order,
              source: "Client",
              amount: Number(order.montantTotal ?? order.total ?? 0),
            }))
          : [];

      const b2bOrders =
        b2bRes.status === "fulfilled"
          ? (b2bRes.value.data || []).map((order) => ({
              ...order,
              source: order.source || "Entreprise",
              amount: Number(order.total ?? order.montantTotal ?? 0),
            }))
          : [];

      const mergedOrders = [...clientOrders, ...b2bOrders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const todayOrders = mergedOrders.filter(
        (order) => new Date(order.createdAt).getTime() >= startOfToday.getTime(),
      );

      const todayRevenueDerived = todayOrders.reduce(
        (sum, order) => sum + (Number.isFinite(order.amount) ? order.amount : 0),
        0,
      );

      const activeOrders = mergedOrders.filter(
        (order) => !["LIVREE", "ANNULEE"].includes(order.statut),
      ).length;

      const financeData =
        financeRes.status === "fulfilled" ? financeRes.value.data || {} : {};
      const alerts = alertsRes.status === "fulfilled" ? alertsRes.value.data || [] : [];
      const staffAccounts =
        staffRes.status === "fulfilled" ? staffRes.value.data || [] : [];

      setRecentOrders(mergedOrders.slice(0, 6));
      setWeeklyPerformance(computeWeeklyPerformance(mergedOrders));
      setStats({
        todayOrders: todayOrders.length,
        todayRevenue: Number(financeData.caJour ?? todayRevenueDerived),
        activeOrders,
        lowStockItems: alerts.length,
        uniqueCustomers: new Set(
          clientOrders.map((order) => order.client?.id).filter(Boolean),
        ).size,
        staffCount: staffAccounts.length,
        b2bOrders: b2bOrders.length,
      });
      setFinancialHighlights({
        ticketMoyen: Number(
          financeData.ticketMoyen ??
            (todayOrders.length > 0 ? todayRevenueDerived / todayOrders.length : 0),
        ),
        nbCommandes: Number(financeData.nbCommandes ?? todayOrders.length),
        margesBrutes: Number(financeData.margesBrutes ?? 0),
      });
      setLastRefresh(
        new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );

      if (
        ordersRes.status !== "fulfilled" &&
        b2bRes.status !== "fulfilled" &&
        financeRes.status !== "fulfilled"
      ) {
        setError("Impossible de synchroniser les données du dashboard gérant.");
      }

      setLoading(false);
      setRefreshing(false);
    },
    [restaurantId],
  );

  useEffect(() => {
    const syncRestaurantProfile = async () => {
      try {
        const profileRes = await restaurantAPI.getMine();
        const profile = profileRes.data || {};
        setRestaurantProfile(profile);
        const cachedUser = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...cachedUser,
            restaurant: {
              ...(cachedUser.restaurant || {}),
              ...profile,
            },
          }),
        );
      } catch (error) {
        console.error("Erreur chargement profil overview:", error);
      }
    };

    void syncRestaurantProfile();
    void loadOverviewData();
    const interval = setInterval(() => {
      void loadOverviewData({ silent: true });
    }, 30000);

    const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUser = cachedUser?.user || cachedUser;
    const socket = createCommandesSocket(currentUser);

    const handleDashboardUpdate = () => {
      void loadOverviewData({ silent: true });
    };

    socket.on('commande.nouvelle', handleDashboardUpdate);
    socket.on('commande.statut', handleDashboardUpdate);
    socket.on('commande.paiement', handleDashboardUpdate);
    socket.on('restaurant.profile.updated', handleDashboardUpdate);

    const handleRestaurantUpdate = (event) => {
      setRestaurantProfile(event.detail || {});
    };
    window.addEventListener('gerant-restaurant-updated', handleRestaurantUpdate);

    return () => {
      clearInterval(interval);
      socket.disconnect();
      window.removeEventListener('gerant-restaurant-updated', handleRestaurantUpdate);
    };
  }, [loadOverviewData]);

  useEffect(() => {
    setClockTs(new Date().getTime());
    const interval = setInterval(() => {
      setClockTs(new Date().getTime());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    chartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: weeklyPerformance.labels,
        datasets: [
          {
            label: "Commandes",
            data: weeklyPerformance.orders,
            borderColor: "#D94500",
            backgroundColor: "rgba(217, 69, 0, 0.14)",
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: "#D94500",
          },
          {
            label: "Revenus FCFA",
            data: weeklyPerformance.revenue,
            borderColor: "#0F766E",
            backgroundColor: "rgba(15, 118, 110, 0.14)",
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: "#0F766E",
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#5B4636" },
          },
          y: {
            position: "left",
            title: {
              display: true,
              text: "Commandes",
              color: "#5B4636",
            },
            ticks: { color: "#5B4636" },
          },
          y1: {
            position: "right",
            grid: { drawOnChartArea: false },
            title: {
              display: true,
              text: "Revenus",
              color: "#5B4636",
            },
            ticks: {
              color: "#5B4636",
              callback: (value) => `${value.toLocaleString()}`,
            },
          },
        },
        plugins: {
          legend: {
            position: "top",
            labels: { color: "#2D2720" },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                if (context.dataset.label === "Revenus FCFA") {
                  return `${context.dataset.label}: ${Number(context.parsed.y).toLocaleString()} FCFA`;
                }
                return `${context.dataset.label}: ${context.parsed.y}`;
              },
            },
          },
        },
      },
    });

    return () => chartInstanceRef.current?.destroy();
  }, [weeklyPerformance]);

  const handleExportPDF = async () => {
    try {
      if (!recentOrders[0]?.id) {
        throw new Error("Aucune commande disponible pour l'export PDF.");
      }

      const order = recentOrders[0];
      const response = await tresorerieAPI.getReceiptPdf(order.id);
      const blob = new Blob([response.data], { type: "application/pdf" });
      downloadAndOpenBlob(blob, `recu-commande-${order?.numero || "today"}.pdf`);
    } catch (error) {
      console.error("Erreur export PDF:", error);
      alert("Erreur lors de la génération du reçu PDF. Veuillez réessayer.");
    }
  };

  const handleExportSyscohada = async () => {
    try {
      const response = await tresorerieAPI.exportSyscohada("monthly");
      const csvText = await response.data.text();
      const pdfBlob = buildSimplePdfBlob(`Export SYSCOHADA ${restaurantName}`, csvText.split("\n"));
      downloadAndOpenBlob(pdfBlob, `syscohada-export-${restaurantId || "restaurant"}-monthly.pdf`);
    } catch (error) {
      console.error("Erreur export SYSCOHADA:", error);
      alert("Erreur lors de l'export SYSCOHADA. Veuillez réessayer.");
    }
  };

  const weekOrdersTotal = weeklyPerformance.orders.reduce(
    (sum, value) => sum + value,
    0,
  );
  const weekRevenueTotal = weeklyPerformance.revenue.reduce(
    (sum, value) => sum + value,
    0,
  );

  const getOrderAgeTone = (order) => {
    const ageMinutes = Math.floor(
      (clockTs - new Date(order.createdAt).getTime()) / 60000,
    );

    if (ageMinutes >= 20) {
      return {
        badge: "bg-red-100 text-red-700",
        label: `${ageMinutes} min`,
      };
    }

    if (ageMinutes >= 10) {
      return {
        badge: "bg-amber-100 text-amber-700",
        label: `${ageMinutes} min`,
      };
    }

    return {
      badge: "bg-emerald-100 text-emerald-700",
      label: `${Math.max(ageMinutes, 0)} min`,
    };
  };

  const getOrderStatusClasses = (status) =>
    STATUS_COLORS[status] || "bg-slate-100 text-slate-700";

  const getOrderStatusLabel = (status) =>
    STATUS_LABELS[status] || status?.replace(/_/g, " ") || "-";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="h-10 w-10 rounded-full border-4 border-[#D94500] border-t-transparent animate-spin shadow-[0_0_24px_rgba(217,69,0,0.2)]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[30px] border border-[#F0D7C7] bg-gradient-to-br from-[#2D2720] via-[#6B3A1E] to-[#D94500] p-7 text-white shadow-[0_24px_90px_rgba(88,43,19,0.22)]">
        <div className="absolute -right-14 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-[#FFD9C7]/20 blur-2xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
              <Activity className="h-3.5 w-3.5" />
              Pilotage gérant en temps réel
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{restaurantName}</h2>
              <p className="mt-2 text-sm text-white/80 sm:text-base">
                Supervisez les commandes, la trésorerie, le stock et l'équipe depuis une seule vue cohérente avec le backend.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-white/90">
                {stats.todayOrders} commandes aujourd'hui
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-white/90">
                {stats.staffCount} staff actif(s)
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-white/90">
                Synchronisé à {lastRefresh || "--:--"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void loadOverviewData({ silent: true })}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Mise à jour..." : "Actualiser"}
            </button>
            <button
              onClick={() => navigate("/gerant?tab=orders")}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#7A2F09] shadow-sm transition hover:bg-[#FFF4EE]"
            >
              <ClipboardList className="h-4 w-4" />
              Gérer les commandes
            </button>
            <button
              onClick={() => navigate("/gerant/kds")}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#1F8A70] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#166D58]"
            >
              <ChefHat className="h-4 w-4" />
              Ouvrir le KDS
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
        <DashboardMetricCard
          icon={<ClipboardList className="h-5 w-5" />}
          label="Commandes du jour"
          value={String(stats.todayOrders)}
          secondary="Flux client + entreprise"
          cardClass="border-[#E9D3F9] bg-gradient-to-br from-violet-50 via-white to-fuchsia-50"
          iconClass="bg-violet-500 text-white"
        />
        <DashboardMetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Chiffre d'affaires"
          value={formatFCFA(stats.todayRevenue)}
          secondary="Lecture trésorerie du jour"
          cardClass="border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50"
          iconClass="bg-emerald-500 text-white"
        />
        <DashboardMetricCard
          icon={<ChefHat className="h-5 w-5" />}
          label="Commandes actives"
          value={String(stats.activeOrders)}
          secondary="En cours de traitement"
          cardClass="border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50"
          iconClass="bg-amber-500 text-white"
        />
        <DashboardMetricCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Alertes stock"
          value={String(stats.lowStockItems)}
          secondary="Seuils à surveiller"
          cardClass="border-red-200 bg-gradient-to-br from-red-50 via-white to-rose-50"
          iconClass="bg-red-500 text-white"
        />
        <DashboardMetricCard
          icon={<Users className="h-5 w-5" />}
          label="Clients uniques"
          value={String(stats.uniqueCustomers)}
          secondary="Sur les dernières commandes"
          cardClass="border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50"
          iconClass="bg-sky-500 text-white"
        />
        <DashboardMetricCard
          icon={<Truck className="h-5 w-5" />}
          label="Commandes B2B"
          value={String(stats.b2bOrders)}
          secondary="Canal entreprise"
          cardClass="border-[#F3D7BA] bg-gradient-to-br from-[#FFF4E8] via-white to-[#FFE7CF]"
          iconClass="bg-[#D97706] text-white"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <section className="rounded-[28px] border border-[#EFDCCF] bg-white/95 p-5 shadow-[0_16px_45px_rgba(45,39,32,0.06)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#2D2720]">Commandes récentes</h3>
              <p className="mt-1 text-sm text-[#8B7355]">
                Vue consolidée des commandes client et entreprise.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportPDF}
                disabled={recentOrders.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Reçu PDF
              </button>
              <button
                onClick={handleExportSyscohada}
                disabled={!restaurantId}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-sky-700 hover:to-cyan-700 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export SYSCOHADA
              </button>
            </div>
          </div>

          {recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.map((order) => {
                const ageTone = getOrderAgeTone(order);
                return (
                  <div
                    key={order.id}
                    className="rounded-[22px] border border-[#F2E4DA] bg-gradient-to-br from-[#FFF9F5] via-white to-[#FFF2EA] p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#2D2720] shadow-sm">
                            #{order.numero}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {order.source}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${getOrderStatusClasses(order.statut)}`}
                          >
                            {getOrderStatusLabel(order.statut)}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ageTone.badge}`}>
                            {ageTone.label}
                          </span>
                        </div>
                        <div className="text-sm text-[#7A6A58]">
                          {formatDate(order.createdAt)}
                        </div>
                      </div>

                      <div className="text-left lg:text-right">
                        <div className="text-xs uppercase tracking-[0.16em] text-[#8B7355]">
                          Montant
                        </div>
                        <div className="text-lg font-bold text-[#2D2720]">
                          {formatFCFA(order.amount)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-[#E7D7CA] bg-[#FFF9F5] px-4 py-10 text-center text-[#8B7355]">
              Aucune commande récente disponible.
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="rounded-[28px] border border-[#EFDCCF] bg-white/95 p-5 shadow-[0_16px_45px_rgba(45,39,32,0.06)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#2D2720]">Actions rapides</h3>
                <p className="mt-1 text-sm text-[#8B7355]">
                  Boutons prioritaires pour piloter l'exploitation.
                </p>
              </div>
              <span className="rounded-full bg-[#FFF1E8] px-3 py-1 text-xs font-medium text-[#B83A00]">
                Navigation directe
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <QuickActionButton
                icon={<Package className="h-5 w-5" />}
                title="Menu"
                description="Articles, catégories, disponibilité"
                tone="from-violet-500 to-fuchsia-500"
                onClick={() => navigate("/gerant?tab=menu")}
              />
              <QuickActionButton
                icon={<ClipboardList className="h-5 w-5" />}
                title="Commandes"
                description={`${stats.activeOrders} commande(s) active(s)`}
                tone="from-[#D94500] to-[#F97316]"
                onClick={() => navigate("/gerant?tab=orders")}
              />
              <QuickActionButton
                icon={<AlertTriangle className="h-5 w-5" />}
                title="Stocks"
                description={`${stats.lowStockItems} alerte(s) à traiter`}
                tone="from-rose-500 to-red-500"
                onClick={() => navigate("/gerant?tab=stocks")}
              />
              <QuickActionButton
                icon={<Wallet className="h-5 w-5" />}
                title="Trésorerie"
                description={formatFCFA(financialHighlights.ticketMoyen)}
                tone="from-emerald-500 to-teal-500"
                onClick={() => navigate("/gerant?tab=finance")}
              />
              <QuickActionButton
                icon={<Users className="h-5 w-5" />}
                title="Équipe"
                description={`${stats.staffCount} compte(s) staff`}
                tone="from-sky-500 to-cyan-500"
                onClick={() => navigate("/gerant?tab=settings")}
              />
              <QuickActionButton
                icon={<ShoppingBag className="h-5 w-5" />}
                title="KDS & salle"
                description="Suivi temps réel cuisine / salle"
                tone="from-[#1F8A70] to-[#136F63]"
                onClick={() => navigate("/gerant/kds")}
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-[#EFDCCF] bg-white/95 p-5 shadow-[0_16px_45px_rgba(45,39,32,0.06)]">
            <h3 className="text-lg font-bold text-[#2D2720]">Santé de l'activité</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <MiniInsightCard
                icon={<BarChart3 className="h-4 w-4" />}
                label="Ticket moyen"
                value={formatFCFA(financialHighlights.ticketMoyen)}
                tone="bg-violet-50 text-violet-700"
              />
              <MiniInsightCard
                icon={<TrendingUp className="h-4 w-4" />}
                label="Marge brute"
                value={`${financialHighlights.margesBrutes}%`}
                tone="bg-emerald-50 text-emerald-700"
              />
              <MiniInsightCard
                icon={<Users className="h-4 w-4" />}
                label="Staff"
                value={`${stats.staffCount} membre(s)`}
                tone="bg-sky-50 text-sky-700"
              />
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-[28px] border border-[#EFDCCF] bg-white/95 p-5 shadow-[0_16px_45px_rgba(45,39,32,0.06)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[#2D2720]">Performance hebdomadaire</h3>
            <p className="mt-1 text-sm text-[#8B7355]">
              Tendance des commandes et des revenus sur 7 jours.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl bg-[#FFF4EC] px-4 py-3 text-sm">
              <div className="text-[#8B7355]">Commandes semaine</div>
              <div className="text-lg font-bold text-[#B83A00]">{weekOrdersTotal}</div>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm">
              <div className="text-emerald-700">Revenus semaine</div>
              <div className="text-lg font-bold text-emerald-800">
                {formatFCFA(weekRevenueTotal)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] bg-gradient-to-br from-[#FFF9F5] via-white to-[#F4FBFA] p-4">
          <canvas ref={chartRef} className="h-72 w-full" />
        </div>
      </section>
    </div>
  );
}

function DashboardMetricCard({ icon, label, value, secondary, cardClass, iconClass }) {
  return (
    <div className={`min-w-0 rounded-[24px] border p-4 shadow-sm ${cardClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-[#7B6A58]">{label}</div>
          <div className="mt-2 text-[clamp(1.35rem,2vw,2rem)] font-bold leading-tight text-[#2D2720] break-words">
            {value}
          </div>
          <div className="mt-1 text-xs text-[#8B7355] break-words">{secondary}</div>
        </div>
        <div className={`shrink-0 rounded-2xl p-2.5 shadow-sm ${iconClass}`}>{icon}</div>
      </div>
    </div>
  );
}

function QuickActionButton({ icon, title, description, tone, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group rounded-[22px] border border-[#F0E1D7] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className={`inline-flex rounded-2xl bg-gradient-to-r ${tone} p-3 text-white shadow-sm`}>
        {icon}
      </div>
      <div className="mt-4 font-semibold text-[#2D2720]">{title}</div>
      <div className="mt-1 text-sm text-[#8B7355]">{description}</div>
      <div className="mt-4 text-sm font-medium text-[#B83A00] transition group-hover:translate-x-0.5">
        Ouvrir
      </div>
    </button>
  );
}

function MiniInsightCard({ icon, label, value, tone }) {
  return (
    <div className="min-w-0 rounded-[22px] border border-[#F0E1D7] bg-white p-4 shadow-sm">
      <div className={`inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${tone}`}>
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-3 text-[clamp(1.1rem,1.6vw,1.35rem)] font-bold leading-tight text-[#2D2720] break-words">
        {value}
      </div>
    </div>
  );
}

// ==================== MAIN DASHBOARD COMPONENT ====================
export default function GerantDashboard({ restaurantId, token }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get("tab") || "overview";
  const cachedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const user = cachedUser?.user || cachedUser;
  const [darkMode, setDarkMode] = useState(localStorage.getItem("darkMode") === "true");

  useEffect(() => {
    const syncDarkMode = () => setDarkMode(localStorage.getItem("darkMode") === "true");
    window.addEventListener("storage", syncDarkMode);
    window.addEventListener("gerant-dark-mode-changed", syncDarkMode);
    return () => {
      window.removeEventListener("storage", syncDarkMode);
      window.removeEventListener("gerant-dark-mode-changed", syncDarkMode);
    };
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case "menu":
        return <MenuTab restaurantId={restaurantId} token={token} />;
      case "orders":
        return <OrdersTab restaurantId={restaurantId} />;
      case "stocks":
        return <StocksTab restaurantId={restaurantId} />;
      case "finance":
        return <FinanceTab restaurantId={restaurantId} />;
      case "settings":
        return <SettingsTab restaurantId={restaurantId} user={user} />;
      case "overview":
      default:
        return <OverviewTab restaurantId={restaurantId} />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div
        className={`rounded-3xl p-6 shadow-sm ${
          darkMode
            ? "border border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"
            : "bg-gradient-to-b from-[#FFF5EB] via-[#F9F7F5] to-white"
        }`}
      >
        {renderTabContent()}
      </div>
    </div>
  );
}