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
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import NotificationBell from "../../components/notifications/NotificationBell";
import {
  menuAPI,
  commandesService,
  stocksAPI,
  tresorerieAPI,
  staffAPI,
  b2bAPI,
  restaurantAPI,
  authAPI,
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
import OnboardingWizard from "../../components/wizard/OnboardingWizard";

// ==================== COLOR THEME CONSTANTS ====================
const COLORS = {
  primary: {
    bg: "bg-[#FBE8DC]",
    border: "border-[rgba(224,78,26,0.2)]",
    text: "text-[#C05015]",
    button: "bg-[#C05015] hover:bg-[#9A3E10]",
    light: "bg-[#FFE4D4]",
  },
  secondary: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    button: "bg-emerald-500 hover:bg-emerald-600",
    light: "bg-emerald-100",
  },
  accent: {
    bg: "bg-white",
    border: "border-[rgba(197,138,85,0.25)]",
    text: "text-[#F97316]",
    button: "bg-[#F97316] hover:bg-[#A87040]",
    light: "bg-[#F5E8D5]",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    button: "bg-amber-500 hover:bg-amber-600",
    light: "bg-amber-100",
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
          pathOptions={{ color: "#E8906A", fillColor: "#E8906A", fillOpacity: 0.95 }}
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
  const [editArticle, setEditArticle] = useState(null);
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

  const handleDeleteArticle = async (articleId) => {
    if (!window.confirm("Supprimer cet article définitivement ?")) return;
    try {
      await menuAPI.deleteArticle(articleId);
      setArticles((prev) => prev.filter((a) => a.id !== articleId));
    } catch (error) {
      alert(error.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  const handleUpdateArticle = async () => {
    if (!editArticle) return;
    try {
      await menuAPI.updateArticle(editArticle.id, {
        nom: editArticle.nom,
        prix: parseFloat(editArticle.prix),
        description: editArticle.description,
        stock: parseInt(editArticle.stock) || 0,
        disponible: editArticle.disponible,
        categorieId: editArticle.categorieId || editArticle.categorie?.id,
        photoUrl: editArticle.photoUrl,
      });
      const artRes = await menuAPI.getAll({ restaurantId, cible: "TOUS" });
      setArticles(artRes.data || []);
      setEditArticle(null);
    } catch (error) {
      alert(error.response?.data?.message || "Erreur lors de la mise à jour");
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm("Supprimer cette catégorie ? Les articles associés devront être recatégorisés.")) return;
    try {
      await menuAPI.deleteArticle(`categories/${categoryId}`).catch(() => {});
      const catRes = await menuAPI.getCategories({ restaurantId });
      setCategories(catRes.data || []);
    } catch (error) {
      alert("Impossible de supprimer cette catégorie");
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
        <div className="h-9 w-9 rounded-full border-4 border-[#C05015] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FBE8DC] px-3 py-1 text-xs font-medium text-[#C05015]">
              <Package className="h-3.5 w-3.5" />
              Gestion visuelle du catalogue
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#1C1917]">Gestion du menu</h3>
              <p className="mt-1 text-sm text-[#78716C]">
                Activez, organisez et enrichissez le catalogue de votre restaurant.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-[#FBE8DC] px-3 py-1.5 text-[#1A1A1A]">
                {articles.length} article(s)
              </span>
              <span className="rounded-full bg-[#FBE8DC] px-3 py-1.5 text-[#1A1A1A]">
                {articles.filter((article) => article.disponible).length} disponible(s)
              </span>
              <span className="rounded-full bg-[#FBE8DC] px-3 py-1.5 text-[#C05015]">
                {categories.length} catégorie(s)
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowCategoryForm(!showCategoryForm)}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0F172A] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-black"
            >
              <Plus className="h-4 w-4" />
              {showCategoryForm ? "Fermer catégorie" : "Nouvelle catégorie"}
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#C05015] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#9A3E10]"
            >
              <Plus className="h-4 w-4" />
              {showAddForm ? "Fermer article" : "Nouvel article"}
            </button>
          </div>
        </div>
      </section>

      {showCategoryForm && (
        <div className="rounded-[26px] border border-[#E2E8F0] bg-white p-6 shadow-sm space-y-4">
          <h4 className="text-lg font-bold text-[#1C1917]">Créer une nouvelle catégorie</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#0F172A]">
                Nom de la catégorie *
              </label>
              <input
                type="text"
                value={newCategory.nom}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, nom: e.target.value })
                }
                className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-[#C05015] focus:ring-1 focus:ring-[#C05015] ${categoryErrors.nom ? "border-red-500" : "border-[#E2E8F0]"}`}
                placeholder="Ex: Plats Principaux"
              />
              {categoryErrors.nom && (
                <p className="mt-1 text-xs text-red-500">{categoryErrors.nom}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#0F172A]">
                Icône
              </label>
              <input
                type="text"
                value={newCategory.icone}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, icone: e.target.value })
                }
                className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 outline-none transition focus:border-[#C05015] focus:ring-1 focus:ring-[#C05015]"
                placeholder="Ex: 🍽️"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleCreateCategory}
              className="rounded-2xl bg-[#C05015] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#9A3E10]"
            >
              Créer la catégorie
            </button>
            <button
              onClick={() => {
                setShowCategoryForm(false);
                setCategoryErrors({});
              }}
              className="rounded-2xl border border-[#E2E8F0] bg-white px-6 py-3 font-semibold text-[#0F172A] transition hover:bg-[#FBE8DC]"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="rounded-[26px] border border-[#E2E8F0] bg-white p-6 shadow-sm space-y-4">
          <h4 className="text-lg font-bold text-[#1C1917]">Créer un nouvel article</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#0F172A]">Nom *</label>
              <input
                type="text"
                value={newArticle.nom}
                onChange={(e) =>
                  setNewArticle({ ...newArticle, nom: e.target.value })
                }
                className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-[#C05015] focus:ring-1 focus:ring-[#C05015] ${formErrors.nom ? "border-red-500" : "border-[#E2E8F0]"}`}
                placeholder="Ex: Attiéké Poisson"
              />
              {formErrors.nom && <p className="mt-1 text-xs text-red-500">{formErrors.nom}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#0F172A]">Prix (FCFA) *</label>
              <input
                type="number"
                min="1"
                value={newArticle.prix}
                onChange={(e) =>
                  setNewArticle({ ...newArticle, prix: e.target.value })
                }
                className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-[#C05015] focus:ring-1 focus:ring-[#C05015] ${formErrors.prix ? "border-red-500" : "border-[#E2E8F0]"}`}
                placeholder="Ex: 3500"
              />
              {formErrors.prix && <p className="mt-1 text-xs text-red-500">{formErrors.prix}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#0F172A]">Catégorie *</label>
              <select
                value={newArticle.categorieId}
                onChange={(e) =>
                  setNewArticle({ ...newArticle, categorieId: e.target.value })
                }
                className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-[#C05015] focus:ring-1 focus:ring-[#C05015] ${formErrors.categorieId ? "border-red-500" : "border-[#E2E8F0]"}`}
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
              <label className="mb-1 block text-sm font-medium text-[#0F172A]">Stock initial</label>
              <input
                type="number"
                min="0"
                value={newArticle.stock}
                onChange={(e) =>
                  setNewArticle({ ...newArticle, stock: e.target.value })
                }
                className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-[#C05015] focus:ring-1 focus:ring-[#C05015] ${formErrors.stock ? "border-red-500" : "border-[#E2E8F0]"}`}
                placeholder="Ex: 50"
              />
              {formErrors.stock && <p className="mt-1 text-xs text-red-500">{formErrors.stock}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[#0F172A]">Photo de l'article</label>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newArticle.photoUrl}
                    onChange={(e) =>
                      setNewArticle({ ...newArticle, photoUrl: e.target.value })
                    }
                    className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 outline-none transition focus:border-[#C05015] focus:ring-1 focus:ring-[#C05015]"
                    placeholder="URL de l'image ou laissez vide"
                  />
                  <p className="mt-2 text-xs text-[#78716C]">
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
                    <p className="mt-2 text-sm text-[#78716C]">Chargement en cours...</p>
                  )}
                </div>
                {newArticle.photoUrl && (
                  <div className="h-24 w-24 overflow-hidden rounded-2xl border border-[#E2E8F0] shadow-sm">
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
            <label className="mb-1 block text-sm font-medium text-[#0F172A]">Description</label>
            <textarea
              value={newArticle.description}
              onChange={(e) =>
                setNewArticle({ ...newArticle, description: e.target.value })
              }
              className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 outline-none transition focus:border-[#C05015] focus:ring-1 focus:ring-[#C05015]"
              rows="3"
              placeholder="Description du plat..."
            />
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleAddArticle}
              className="rounded-2xl bg-[#C05015] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#9A3E10]"
            >
              Créer l'article
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setFormErrors({});
              }}
              className="rounded-2xl border border-[#E2E8F0] bg-white px-6 py-3 font-semibold text-[#0F172A] transition hover:bg-[#FBE8DC]"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A8A29E]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un article ou une catégorie..."
            className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-3 pl-10 pr-4 outline-none transition focus:border-[#C05015] focus:ring-1 focus:ring-[#C05015]"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredArticles.length > 0 ? (
          filteredArticles.map((a) => (
            <div
              key={a.id}
              className="rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-[#FBE8DC] text-2xl shadow-sm">
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
                      <p className="font-semibold text-[#1C1917]">{a.nom}</p>
                      <span className="rounded-full bg-[#FBE8DC] px-2.5 py-1 text-xs font-medium text-[#57534E]">
                        {a.categorie?.nom || "Sans catégorie"}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${a.disponible ? "bg-[#FBE8DC] text-[#1A1A1A]" : "bg-red-50 text-red-700"}`}
                      >
                        {a.disponible ? "Disponible" : "Masqué"}
                      </span>
                    </div>
                    <p className="text-sm text-[#78716C]">Stock: {a.stock ?? 0}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-lg font-bold text-[#1C1917]">
                    {formatFCFA(Number(a.prix || 0))}
                  </span>
                  <button
                    onClick={() => handleToggleDisponibilite(a.id, !a.disponible)}
                    className={`relative h-8 w-14 rounded-full transition-all ${a.disponible ? "bg-[#C05015]" : "bg-[#D1CBC5]"}`}
                    title={a.disponible ? "Désactiver" : "Activer"}
                  >
                    <span
                      className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${a.disponible ? "translate-x-6" : ""}`}
                    />
                  </button>
                  {/* Edit */}
                  <button
                    onClick={() => setEditArticle({ ...a, prix: String(a.prix), stock: String(a.stock ?? 0), categorieId: a.categorie?.id || a.categorieId || '' })}
                    className="p-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    title="Modifier"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteArticle(a.id)}
                    className="p-1.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[24px] border border-dashed border-[#E2E8F0] bg-white px-4 py-10 text-center text-[#78716C]">
            Aucun article trouvé
          </div>
        )}
      </div>

      {/* ── Edit Article Modal ── */}
      {editArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && setEditArticle(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-[#C05015] px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-extrabold">Modifier l'article</h3>
              <button onClick={() => setEditArticle(null)} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3.5 max-h-[70vh] overflow-y-auto">
              {[
                { k: 'nom',         label: 'Nom *',          type: 'text' },
                { k: 'prix',        label: 'Prix (F CFA) *', type: 'number' },
                { k: 'stock',       label: 'Stock',          type: 'number' },
                { k: 'description', label: 'Description',    type: 'text' },
                { k: 'photoUrl',    label: 'URL photo',      type: 'text' },
              ].map(f => (
                <div key={f.k} className="space-y-1">
                  <label className="text-xs font-semibold text-[#1A1A1A]">{f.label}</label>
                  <input type={f.type} value={editArticle[f.k] || ''} onChange={e => setEditArticle(p => ({ ...p, [f.k]: e.target.value }))}
                    className="w-full bg-[#FDDDD4] border-0 rounded-xl px-3 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#C05015]/40" />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Catégorie</label>
                <select value={editArticle.categorieId || ''} onChange={e => setEditArticle(p => ({ ...p, categorieId: e.target.value }))}
                  className="w-full bg-[#FDDDD4] border-0 rounded-xl px-3 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#C05015]/40">
                  <option value="">Sélectionner…</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="edit-dispo" checked={!!editArticle.disponible} onChange={e => setEditArticle(p => ({ ...p, disponible: e.target.checked }))} />
                <label htmlFor="edit-dispo" className="text-sm font-semibold text-[#1A1A1A]">Disponible</label>
              </div>
              <button onClick={handleUpdateArticle}
                className="w-full py-3 rounded-2xl bg-[#C05015] hover:bg-[#9A3E10] text-white font-bold text-sm flex items-center justify-center gap-2">
                <Pencil className="w-3.5 h-3.5" />Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      )}
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
      RECUE: "bg-[#FBE8DC] text-[#C05015]",
      CONFIRMEE: "bg-[#FBE8DC] text-[#1A1A1A]",
      EN_PREP: "bg-[#FBE8DC] text-[#9A3E10]",
      PRETE: "bg-[#FBE8DC] text-[#1C1917]",
      LIVREE: "bg-[#FBE8DC] text-[#57534E]",
      ANNULEE: "bg-red-50 text-red-700",
      EN_ATTENTE: "bg-[#FFFBEB] text-[#92400E]",
    };
    return colors[status] || "bg-[#FBE8DC] text-[#1A1A1A]";
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
        <div className="w-8 h-8 border-4 border-[#C05015] border-t-transparent rounded-full animate-spin" />
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
            className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-semibold">Commande #{order.numero}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-[#FBE8DC] text-slate-700">
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
                <p className="text-sm text-[#9A7060]">Référence CDC: {order.numero}</p>
                <p className="font-bold text-[#1C1917]">
                  {Number(order.amount || 0).toLocaleString()} FCFA
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {order.type === "CLIENT" && canCancelOrder(order) && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "ANNULEE")}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
                  >
                    Annuler
                  </button>
                )}
                {order.type === "CLIENT" && canConfirmOrder(order) && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "CONFIRMEE")}
                    className="px-3 py-1.5 bg-[#C05015] text-white rounded-lg text-sm hover:bg-[#9A3E10] transition"
                  >
                    Valider
                  </button>
                )}
                {order.type === "CLIENT" && canPrepareOrder(order) && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "EN_PREP")}
                    className="px-3 py-1.5 bg-[#0F172A] text-white rounded-lg text-sm hover:bg-black transition"
                  >
                    En préparation
                  </button>
                )}
                {order.type === "CLIENT" && canMarkReady(order) && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "PRETE")}
                    className="px-3 py-1.5 bg-[#1A1A1A] text-white rounded-lg text-sm hover:bg-[#292524] transition"
                  >
                    Prête
                  </button>
                )}
                {order.type === "CLIENT" && canCompleteOrder(order) && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "LIVREE")}
                    className="px-3 py-1.5 bg-[#57534E] text-white rounded-lg text-sm hover:bg-[#1A1A1A] transition"
                  >
                    Valider remise
                  </button>
                )}
                {order.type === "B2B" && (
                  <span className="px-3 py-1.5 bg-[#FBE8DC] text-slate-700 rounded-lg text-sm">
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [adjustmentForm, setAdjustmentForm] = useState({ articleId: '', quantity: '', motif: '' });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadStocks = useCallback(async () => {
    if (!restaurantId) return;
    try {
      setLoading(true);
      const stocksRes = await stocksAPI.getAll({ restaurantId });
      setStocks(stocksRes.data || []);
    } catch {
      setStocks([
        { id: '1', nom: 'Riz', stock: 25, unite: 'kg', seuil: 10 },
        { id: '2', nom: 'Poisson', stock: 3, unite: 'kg', seuil: 5 },
        { id: '3', nom: 'Tomates', stock: 15, unite: 'kg', seuil: 8 },
      ]);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { loadStocks(); }, [loadStocks]);

  const handleAdjustStock = async () => {
    if (!adjustmentForm.articleId || !adjustmentForm.quantity) {
      showToast('Article et quantité requis');
      return;
    }
    try {
      setSaving(true);
      await stocksAPI.adjust(
        adjustmentForm.articleId,
        parseInt(adjustmentForm.quantity),
        adjustmentForm.motif || 'Ajustement manuel',
      );
      setAdjustmentForm({ articleId: '', quantity: '', motif: '' });
      showToast('Stock ajusté avec succès');
      await loadStocks();
    } catch {
      showToast("Erreur lors de l'ajustement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="h-9 w-9 rounded-full border-4 border-[#C05015] border-t-transparent animate-spin" />
      </div>
    );
  }

  const criticalItems = stocks.filter(s => Number(s.stock) <= Number(s.seuilMin || s.seuil || 5));
  const okItems = stocks.length - criticalItems.length;

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-2xl bg-[#0F172A] px-4 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div>
      )}

      {/* KPI header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Articles suivis', value: stocks.length, icon: Package, iconBg: '#FBE8DC', iconColor: '#C05015' },
          { label: 'Niveaux OK', value: okItems, icon: CheckCircle, iconBg: '#F0FDF4', iconColor: '#16A34A' },
          { label: 'Alertes critiques', value: criticalItems.length, icon: AlertTriangle, iconBg: criticalItems.length > 0 ? '#FEF2F2' : '#F0FDF4', iconColor: criticalItems.length > 0 ? '#DC2626' : '#16A34A' },
        ].map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <div key={label} className="rounded-2xl bg-white border border-[#E2E8F0] p-4 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
              <Icon className="w-5 h-5" style={{ color: iconColor }} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#9A7060] uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-extrabold text-[#0F172A]">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alert banner */}
      {criticalItems.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">
            <span className="font-bold">{criticalItems.length} article{criticalItems.length > 1 ? 's' : ''} en alerte :</span>{' '}
            {criticalItems.map(i => i.nom).join(', ')}
          </p>
        </div>
      )}

      {/* Inventory table */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F4F6F8]">
          <div>
            <h4 className="text-sm font-bold text-[#0F172A]">Inventaire</h4>
            <p className="text-xs text-[#9A7060] mt-0.5">Vue détaillée par article avec niveau de stock</p>
          </div>
          <button onClick={loadStocks}
            className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-semibold text-[#475569] hover:border-[#C05015]/40 hover:text-[#C05015] transition-colors">
            <RefreshCcw className="w-3.5 h-3.5" />
            Actualiser
          </button>
        </div>
        {stocks.length === 0 ? (
          <div className="px-5 py-12 text-center text-[#9A7060] text-sm">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-[#E2E8F0]" />
            Aucun article dans le stock
          </div>
        ) : (
          <div className="divide-y divide-[#F4F6F8]">
            {stocks.map((item) => {
              const stockVal = Math.max(0, Number(item.stock || 0));
              const seuil    = Math.max(1, Number(item.seuilMin || item.seuil || 5));
              const pct      = Math.min(100, Math.round((stockVal / Math.max(seuil * 3, 1)) * 100));
              const isAlert  = stockVal <= seuil;
              return (
                <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold text-[#0F172A] text-sm truncate">{item.nom}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold flex-shrink-0 ${isAlert ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {isAlert ? 'Alerte' : 'OK'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#F4F6F8] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${isAlert ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: pct + '%' }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-lg font-extrabold ${isAlert ? 'text-red-600' : 'text-[#0F172A]'}`}>{stockVal}</p>
                    <p className="text-xs text-[#9A7060]">{item.unite || 'unités'}</p>
                  </div>
                  <div className="text-right flex-shrink-0 hidden sm:block w-20">
                    <p className="text-[10px] text-[#9A7060] uppercase tracking-wide">Seuil min.</p>
                    <p className="text-sm font-semibold text-[#475569]">{seuil} {item.unite || 'u.'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Adjustment form */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-[#FBE8DC] flex items-center justify-center">
            <Plus className="w-4 h-4 text-[#C05015]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#0F172A]">Ajustement de stock</h4>
            <p className="text-xs text-[#9A7060]">Correction, réception ou casse</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#475569]">Article</label>
            <select value={adjustmentForm.articleId}
              onChange={e => setAdjustmentForm({ ...adjustmentForm, articleId: e.target.value })}
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#C05015] focus:ring-1 focus:ring-[#C05015] transition">
              <option value="">Sélectionner un article</option>
              {stocks.map(item => <option key={item.id} value={item.id}>{item.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#475569]">Quantité (+réception / -casse)</label>
            <input type="number" value={adjustmentForm.quantity}
              onChange={e => setAdjustmentForm({ ...adjustmentForm, quantity: e.target.value })}
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#C05015] focus:ring-1 focus:ring-[#C05015] transition"
              placeholder="Ex: +5 ou -2" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#475569]">Motif</label>
            <input type="text" value={adjustmentForm.motif}
              onChange={e => setAdjustmentForm({ ...adjustmentForm, motif: e.target.value })}
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#C05015] focus:ring-1 focus:ring-[#C05015] transition"
              placeholder="Réception, casse, correction..." />
          </div>
        </div>
        <button onClick={handleAdjustStock} disabled={saving}
          className="mt-4 flex items-center gap-2 rounded-xl bg-[#C05015] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#9A3E10] disabled:opacity-60">
          {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}

// ==================== FINANCE MODULE ====================
function FinanceTab({ restaurantId }) {
  const [kpiData, setKpiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('day');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [expenseForm, setExpenseForm] = useState({ categorie: '', montant: '', description: '' });
  const [budgetConfig, setBudgetConfig] = useState({ plafondMensuel: '', alerte80: true, alerte100: true });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    try {
      setLoading(true);
      const r = await tresorerieAPI.getStats(period);
      setKpiData(r.data);
    } catch {
      setKpiData({ caJour: 125000, caSemaine: 875000, caMois: 3500000, nbCommandes: 42, ticketMoyen: 29762, margesBrutes: 68.5 });
    } finally {
      setLoading(false);
    }
  }, [restaurantId, period]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRecordExpense = async () => {
    if (!expenseForm.categorie || !expenseForm.montant) { showToast('Catégorie et montant requis'); return; }
    try {
      setSaving(true);
      await tresorerieAPI.recordExpense({
        categorie: expenseForm.categorie,
        montant: parseFloat(expenseForm.montant),
        description: expenseForm.description || '',
        date: new Date().toISOString(),
      });
      setExpenseForm({ categorie: '', montant: '', description: '' });
      showToast('Dépense enregistrée');
    } catch {
      showToast("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateReport = async (rp) => {
    try {
      const r = await tresorerieAPI.generateReport(rp);
      const report = r.data || {};
      const blob = buildSimplePdfBlob(`Rapport ${rp}`, [
        `Periode: ${rp}`,
        `Généré le: ${new Date().toLocaleString('fr-FR')}`,
        `Revenus: ${formatFCFA(report.summary?.totalRevenue || 0)}`,
        `Dépenses: ${formatFCFA(report.summary?.totalExpenses || 0)}`,
        `Profit net: ${formatFCFA(report.summary?.netProfit || 0)}`,
        `Marge: ${report.summary?.profitMargin || 0}%`,
      ]);
      downloadAndOpenBlob(blob, `rapport-${rp}-${restaurantId || 'restaurant'}.pdf`);
    } catch {
      showToast('Erreur génération rapport');
    }
  };

  const handleConfigureBudget = async () => {
    if (!budgetConfig.plafondMensuel) { showToast('Plafond mensuel requis'); return; }
    try {
      await tresorerieAPI.configureBudgetAlerts({
        plafondMensuel: parseFloat(budgetConfig.plafondMensuel),
        alerte80: budgetConfig.alerte80,
        alerte100: budgetConfig.alerte100,
      });
      showToast('Budget configuré');
    } catch {
      showToast('Erreur configuration budget');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="h-9 w-9 rounded-full border-4 border-[#C05015] border-t-transparent animate-spin" />
      </div>
    );
  }

  const caValue = period === 'day' ? kpiData.caJour : period === 'week' ? kpiData.caSemaine : kpiData.caMois;
  const caLabel = period === 'day' ? "CA aujourd'hui" : period === 'week' ? 'CA semaine' : 'CA mois';
  const EXPENSE_CATS = ['loyer', 'salaires', 'fournitures', 'electricite', 'eau', 'autre'];

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-2xl bg-[#0F172A] px-4 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-[#0F172A]">Trésorerie & finances</h3>
          <p className="text-xs text-[#9A7060] mt-0.5">CA, dépenses et pilotage du budget restaurant</p>
        </div>
        <div className="flex p-1 bg-[#F4F6F8] rounded-2xl gap-1">
          {[{ v: 'day', l: "Aujourd'hui" }, { v: 'week', l: 'Semaine' }, { v: 'month', l: 'Mois' }].map(p => (
            <button key={p.v} onClick={() => setPeriod(p.v)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${period === p.v ? 'bg-white text-[#C05015] shadow-sm' : 'text-[#9A7060] hover:text-[#C05015]'}`}>
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5 shadow-sm border border-transparent" style={{ background: '#0F172A' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">{caLabel}</p>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(192,80,21,0.25)' }}>
              <TrendingUp className="w-4 h-4 text-[#C05015]" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white leading-none">{formatFCFA(caValue)}</p>
        </div>
        {[
          { label: 'Nb commandes', value: kpiData.nbCommandes, icon: ShoppingBag, iconBg: '#FBE8DC', iconColor: '#C05015' },
          { label: 'Ticket moyen', value: formatFCFA(kpiData.ticketMoyen), icon: CreditCard, iconBg: '#F0FDF4', iconColor: '#16A34A' },
          { label: 'Marge brute', value: kpiData.margesBrutes + '%', icon: PieChart, iconBg: '#EFF6FF', iconColor: '#2563EB' },
        ].map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <div key={label} className="rounded-2xl bg-white border border-[#E2E8F0] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#9A7060]">{label}</p>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
                <Icon className="w-4 h-4" style={{ color: iconColor }} />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-[#0F172A] leading-none">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-5">
        {/* Expense form */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-[#FBE8DC] flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-[#C05015]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#0F172A]">Saisir une dépense</h4>
              <p className="text-xs text-[#9A7060]">Enregistrée dans la vue trésorerie</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#475569]">Catégorie *</label>
              <select value={expenseForm.categorie}
                onChange={e => setExpenseForm({ ...expenseForm, categorie: e.target.value })}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#C05015] focus:ring-1 focus:ring-[#C05015] transition capitalize">
                <option value="">Sélectionner...</option>
                {EXPENSE_CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#475569]">Montant (FCFA) *</label>
              <input type="number" min="1" value={expenseForm.montant}
                onChange={e => setExpenseForm({ ...expenseForm, montant: e.target.value })}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#C05015] focus:ring-1 focus:ring-[#C05015] transition"
                placeholder="Ex: 50 000" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#475569]">Description</label>
              <input type="text" value={expenseForm.description}
                onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#C05015] focus:ring-1 focus:ring-[#C05015] transition"
                placeholder="Optionnel" />
            </div>
          </div>
          <button onClick={handleRecordExpense} disabled={saving}
            className="mt-4 flex items-center gap-2 rounded-xl bg-[#C05015] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#9A3E10] disabled:opacity-60">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Enregistrement...' : 'Enregistrer la dépense'}
          </button>
        </div>

        {/* Reports + budget */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <h4 className="text-sm font-bold text-[#0F172A] mb-3">Exports financiers</h4>
            <div className="space-y-2">
              {[
                { rp: 'monthly',   label: 'Rapport mensuel',     icon: Download,  bg: '#0F172A' },
                { rp: 'quarterly', label: 'Rapport trimestriel', icon: BarChart3,  bg: '#1A1A1A' },
                { rp: 'yearly',    label: 'Rapport annuel',      icon: TrendingUp, bg: '#C05015' },
              ].map(({ rp, label, icon: Icon, bg }) => (
                <button key={rp} onClick={() => handleGenerateReport(rp)}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                  style={{ background: bg }}>
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl bg-[#FBE8DC] flex items-center justify-center flex-shrink-0">
                <Wallet className="w-4 h-4 text-[#C05015]" />
              </div>
              <h4 className="text-sm font-bold text-[#0F172A]">Plafond mensuel</h4>
            </div>
            <div className="flex gap-2">
              <input type="number" min="0" value={budgetConfig.plafondMensuel}
                onChange={e => setBudgetConfig({ ...budgetConfig, plafondMensuel: e.target.value })}
                className="flex-1 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#C05015] focus:ring-1 focus:ring-[#C05015] transition"
                placeholder="Plafond (FCFA)" />
              <button onClick={handleConfigureBudget}
                className="rounded-xl bg-[#C05015] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#9A3E10]">
                Sauvegarder
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              {[{ key: 'alerte80', label: 'Alerte à 80%' }, { key: 'alerte100', label: 'Alerte à 100%' }].map(({ key, label }) => (
                <label key={key} className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={budgetConfig[key]}
                    onChange={e => setBudgetConfig({ ...budgetConfig, [key]: e.target.checked })}
                    className="h-4 w-4 rounded accent-[#C05015]" />
                  <span className="text-xs font-medium text-[#0F172A]">{label}</span>
                </label>
              ))}
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

  /* ── Security state ── */
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [secPwd, setSecPwd] = useState({ current: "", next: "", confirm: "" });
  const [showSecPwd, setShowSecPwd] = useState({ current: false, next: false, confirm: false });
  const [secSaving, setSecSaving] = useState(false);
  const [secSuccess, setSecSuccess] = useState("");
  const [secError, setSecError] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled ?? false);
  const [show2FA, setShow2FA] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [backupCodes, setBackupCodes] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const handleChangePwd = async () => {
    setSecError(""); setSecSuccess("");
    if (!secPwd.current) { setSecError("Mot de passe actuel requis"); return; }
    if (secPwd.next.length < 6) { setSecError("Minimum 6 caractères"); return; }
    if (secPwd.next !== secPwd.confirm) { setSecError("Les mots de passe ne correspondent pas"); return; }
    setSecSaving(true);
    try {
      await authAPI.changePassword({ currentPassword: secPwd.current, newPassword: secPwd.next });
      setSecSuccess("Mot de passe modifié avec succès.");
      setSecPwd({ current: "", next: "", confirm: "" });
      setTimeout(() => { setShowPasswordForm(false); setSecSuccess(""); }, 2500);
    } catch (e) { setSecError(e?.response?.data?.message || "Mot de passe actuel incorrect."); }
    finally { setSecSaving(false); }
  };

  const handleSetup2FA = async () => {
    setSecSaving(true); setSecError(""); setSecSuccess("");
    try {
      const res = await authAPI.setup2FA();
      setQrData(res.data); setShow2FA(true);
    } catch { setSecError("Erreur lors de la configuration 2FA"); }
    finally { setSecSaving(false); }
  };

  const handleEnable2FA = async () => {
    if (!/^\d{6}$/.test(twoFactorCode)) { setSecError("Code à 6 chiffres requis"); return; }
    setSecSaving(true); setSecError("");
    try {
      const res = await authAPI.enable2FA(twoFactorCode);
      setTwoFactorEnabled(true); setShow2FA(false);
      if (res.data?.backupCodes?.length) setBackupCodes(res.data.backupCodes);
      setSecSuccess("2FA activée avec succès — conservez vos codes de secours !");
      setTwoFactorCode("");
    } catch (e) { setSecError(e?.response?.data?.message || "Code invalide"); }
    finally { setSecSaving(false); }
  };

  const handleDisable2FA = async () => {
    setSecSaving(true); setSecError(""); setSecSuccess("");
    try {
      await authAPI.disable2FA();
      setTwoFactorEnabled(false); setShow2FA(false);
      setSecSuccess("2FA désactivée.");
    } catch { setSecError("Erreur lors de la désactivation"); }
    finally { setSecSaving(false); }
  };

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
        <div className="h-10 w-10 rounded-full border-4 border-[#C05015] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FBE8DC] px-3 py-1 text-xs font-medium text-[#C05015]">
              <Settings className="h-3.5 w-3.5" />
              Paramètres & configuration
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#1C1917]">Centre de configuration</h3>
              <p className="mt-1 text-sm text-[#78716C]">
                Profil restaurant, horaires, apparence, zones de livraison et comptes staff.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-[#FBE8DC] px-3 py-1.5 text-[#1A1A1A]">
                {settings.zonesLivraison.length} zone(s)
              </span>
              <span className="rounded-full bg-[#FBE8DC] px-3 py-1.5 text-[#1A1A1A]">
                {staffAccounts.length} staff
              </span>
              <span className="rounded-full bg-[#FBE8DC] px-3 py-1.5 text-[#1A1A1A]">
                {settings.horaires.ouverture} - {settings.horaires.fermeture}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 xl:items-end">
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="rounded-2xl bg-[#C05015] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#9A3E10] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {savingSettings ? "Sauvegarde..." : "Sauvegarder les paramètres"}
            </button>
            {settingsSaved && (
              <p className="text-sm font-medium text-[#1A1A1A]">
                Paramètres sauvegardés avec succès.
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">
        <div className="space-y-6">
          <div className="rounded-[26px] border border-[#FFD8CC] bg-white p-6 shadow-sm">
            <h4 className="text-lg font-bold text-[#0F172A]">Profil du restaurant</h4>
            <p className="mt-1 text-sm text-[#7A6A58]">
              Ces informations alimentent la première carte du dashboard et la fiche publique du restaurant.
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#0F172A]">Nom du restaurant</label>
                <input
                  type="text"
                  value={settings.nom}
                  onChange={(e) => setSettings((prev) => ({ ...prev, nom: e.target.value }))}
                  className="w-full rounded-2xl border border-[#FFD8CC] bg-[#FBE8DC] px-4 py-3 outline-none transition focus:border-[#E8906A]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#0F172A]">Téléphone</label>
                <input
                  type="tel"
                  value={settings.telephone}
                  onChange={(e) => setSettings((prev) => ({ ...prev, telephone: e.target.value }))}
                  className="w-full rounded-2xl border border-[#FFD8CC] bg-[#FBE8DC] px-4 py-3 outline-none transition focus:border-[#E8906A]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#0F172A]">Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-2xl border border-[#FFD8CC] bg-[#FBE8DC] px-4 py-3 outline-none transition focus:border-[#E8906A]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#0F172A]">Logo / photo</label>
                <input
                  type="text"
                  value={settings.logo}
                  onChange={(e) => setSettings((prev) => ({ ...prev, logo: e.target.value }))}
                  placeholder="URL du logo"
                  className="w-full rounded-2xl border border-[#FFD8CC] bg-[#FBE8DC] px-4 py-3 outline-none transition focus:border-[#E8906A]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-[#0F172A]">Adresse</label>
                <input
                  type="text"
                  value={settings.adresse}
                  onChange={(e) => setSettings((prev) => ({ ...prev, adresse: e.target.value }))}
                  className="w-full rounded-2xl border border-[#FFD8CC] bg-[#FBE8DC] px-4 py-3 outline-none transition focus:border-[#E8906A]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-[#0F172A]">Description</label>
                <textarea
                  value={settings.description}
                  onChange={(e) => setSettings((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full rounded-2xl border border-[#FFD8CC] bg-[#FBE8DC] px-4 py-3 outline-none transition focus:border-[#E8906A]"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-lg font-bold text-[#1C1917]">Apparence</h4>
                <p className="mt-1 text-sm text-[#78716C]">
                  Le mode sombre s'applique à tout le circuit gérant/admin.
                </p>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`relative h-8 w-14 rounded-full transition-all ${
                  settings.darkMode ? "bg-[#0F172A]" : "bg-[#D1CBC5]"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    settings.darkMode ? "translate-x-6" : ""
                  }`}
                />
              </button>
            </div>
            <div className="mt-4 rounded-[22px] border border-[#E2E8F0] bg-white p-4">
              <p className="text-sm font-medium text-[#0F172A]">Thème actuel</p>
              <p className="mt-1 text-sm text-[#7A6A58]">
                {settings.darkMode ? "Mode sombre activé" : "Mode clair activé"}
              </p>
            </div>
          </div>

          <div className="rounded-[26px] border border-[rgba(224,78,26,0.15)] bg-white p-6 shadow-sm">
            <h4 className="text-lg font-bold text-[#0F172A]">Horaires d'ouverture</h4>
            <p className="mt-1 text-sm text-[#7A6A58]">
              Les horaires utilisés proviennent désormais du profil restaurant et peuvent être modifiés ici.
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#0F172A]">Ouverture</label>
                <input
                  type="time"
                  value={settings.horaires.ouverture}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      horaires: { ...prev.horaires, ouverture: e.target.value },
                    }))
                  }
                  className="w-full rounded-2xl border border-[rgba(224,78,26,0.15)] bg-[#FBE8DC] px-4 py-3 outline-none transition focus:border-[#C05015]/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#0F172A]">Fermeture</label>
                <input
                  type="time"
                  value={settings.horaires.fermeture}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      horaires: { ...prev.horaires, fermeture: e.target.value },
                    }))
                  }
                  className="w-full rounded-2xl border border-[rgba(224,78,26,0.15)] bg-[#FBE8DC] px-4 py-3 outline-none transition focus:border-[#C05015]/50"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[26px] border border-amber-200 bg-white p-6 shadow-sm">
            <h4 className="text-lg font-bold text-[#0F172A]">Zones de livraison</h4>
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
                  <p className="text-sm font-semibold text-[#0F172A]">Carte OpenStreetMap</p>
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

          <div className="rounded-[26px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-lg font-bold text-[#1C1917]">Gestion des comptes staff</h4>
                <p className="mt-1 text-sm text-[#78716C]">
                  RBAC strict : un seul rôle actif par utilisateur (RG-31).
                </p>
              </div>
              <span className="rounded-full bg-[#FBE8DC] px-3 py-1.5 text-xs font-medium text-[#1A1A1A]">
                {staffAccounts.length} compte(s)
              </span>
            </div>

            <div className="mt-4 rounded-[24px] border border-[#E2E8F0] bg-white p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">
                <UserPlus className="h-4 w-4" />
                Créer un nouveau compte staff
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#0F172A]">Email *</label>
                  <input
                    type="email"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 outline-none transition focus:border-[#C05015] focus:ring-1 focus:ring-[#C05015]"
                    placeholder="staff@restaurant.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#0F172A]">Téléphone</label>
                  <input
                    type="tel"
                    value={staffForm.telephone}
                    onChange={(e) => setStaffForm({ ...staffForm, telephone: e.target.value })}
                    className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 outline-none transition focus:border-[#C05015] focus:ring-1 focus:ring-[#C05015]"
                    placeholder="+225 XX XX XX XX"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-[#0F172A]">Nom complet *</label>
                  <input
                    type="text"
                    value={staffForm.nom}
                    onChange={(e) => setStaffForm({ ...staffForm, nom: e.target.value })}
                    className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 outline-none transition focus:border-[#C05015] focus:ring-1 focus:ring-[#C05015]"
                    placeholder="Ex: Konan Aya"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-[#0F172A]">Mot de passe (optionnel)</label>
                  <input
                    type="password"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 outline-none transition focus:border-[#C05015] focus:ring-1 focus:ring-[#C05015]"
                    placeholder="Laisser vide pour générer un mot de passe"
                  />
                </div>
              </div>
              <button
                onClick={handleCreateStaff}
                className="mt-4 rounded-2xl bg-[#C05015] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#9A3E10]"
              >
                Créer le compte staff
              </button>
              {staffCreationNotice && (
                <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#1A1A1A] shadow-sm">
                  {staffCreationNotice}
                </div>
              )}
            </div>

            <div className="mt-5">
              <h5 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#78716C]">
                Comptes existants
              </h5>
              {loadingStaff ? (
                <div className="flex items-center justify-center py-6">
                  <div className="h-7 w-7 rounded-full border-4 border-[#C05015] border-t-transparent animate-spin" />
                </div>
              ) : staffAccounts.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {staffAccounts.map((staff) => (
                    <div
                      key={staff.id}
                      className="flex flex-col gap-3 rounded-[22px] border border-[#E2E8F0] bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-[#1C1917]">{staff.nom}</p>
                        <p className="text-sm text-[#78716C]">{staff.email}</p>
                        <p className="text-xs text-[#A8A29E]">{staff.telephone || "Pas de téléphone"}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                            staff.actif ? "bg-[#FBE8DC] text-[#1A1A1A]" : "bg-red-50 text-red-700"
                          }`}
                        >
                          {staff.actif ? "Actif" : "Inactif"}
                        </span>
                        <button
                          onClick={() => handleToggleStaff(staff.id, staff.actif)}
                          className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                            staff.actif
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-[#C05015] hover:bg-[#9A3E10]"
                          }`}
                        >
                          {staff.actif ? "Désactiver" : "Activer"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-center text-sm text-[#78716C]">Aucun compte staff créé</p>
              )}
            </div>
          </div>

          {/* ── Sécurité gérant ── */}
          <div className="rounded-[26px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-sm space-y-4">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-[#F97316] mb-1">Sécurité</h4>
              <h3 className="text-lg font-bold text-[#0F172A] mb-1">Authentification & Protection</h3>
              <p className="text-sm text-[#64748B]">Gérez votre mot de passe et l'authentification à deux facteurs.</p>
            </div>

            {secSuccess && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{secSuccess}</div>}
            {secError   && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{secError}</div>}

            {/* Email status */}
            <div className="flex items-center justify-between rounded-2xl border border-[rgba(0,0,0,0.07)] bg-[#FAFBFC] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50">
                  <Mail className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">Vérification email</p>
                  <p className="text-xs text-[#64748B]">{user?.email}</p>
                </div>
              </div>
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">✓ Vérifié</span>
            </div>

            {/* Password change */}
            <div className="rounded-2xl border border-[rgba(0,0,0,0.07)] bg-[#FAFBFC] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBE8DC]">
                    <Lock className="h-4 w-4 text-[#C05015]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">Mot de passe</p>
                    <p className="text-xs text-[#64748B]">Changez régulièrement pour plus de sécurité</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowPasswordForm(!showPasswordForm); setSecError(""); setSecSuccess(""); }}
                  className="rounded-xl bg-[#C05015] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#9A3E10]"
                >
                  Modifier
                </button>
              </div>
              {showPasswordForm && (
                <div className="mt-4 space-y-3">
                  {[
                    { key: "current", label: "Mot de passe actuel" },
                    { key: "next",    label: "Nouveau mot de passe" },
                    { key: "confirm", label: "Confirmer" },
                  ].map(({ key, label }) => (
                    <div key={key} className="relative">
                      <input
                        type={showSecPwd[key] ? "text" : "password"}
                        placeholder={label}
                        value={secPwd[key]}
                        onChange={e => setSecPwd(p => ({ ...p, [key]: e.target.value }))}
                        className="w-full rounded-xl border border-[rgba(89,67,42,0.18)] bg-white px-4 py-3 pr-11 text-sm text-[#0F172A] outline-none transition focus:border-[#C05015] focus:ring-2 focus:ring-[#C05015]/15"
                      />
                      <button type="button" onClick={() => setShowSecPwd(s => ({ ...s, [key]: !s[key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]">
                        {showSecPwd[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  ))}
                  {secPwd.next.length > 0 && (
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="h-1 flex-1 rounded-full" style={{ background: i <= Math.min(Math.floor(secPwd.next.length / 3), 4) ? (secPwd.next.length < 6 ? '#EF4444' : secPwd.next.length < 9 ? '#F97316' : '#9A3E10') : 'rgba(89,67,42,0.1)' }} />
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={handleChangePwd} disabled={secSaving}
                      className="flex-1 rounded-xl bg-[#C05015] py-2.5 text-sm font-semibold text-white transition hover:bg-[#9A3E10] disabled:opacity-50">
                      {secSaving ? "En cours…" : "Enregistrer"}
                    </button>
                    <button onClick={() => setShowPasswordForm(false)}
                      className="rounded-xl border border-[rgba(0,0,0,0.07)] px-4 py-2.5 text-sm font-medium text-[#64748B]">
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2FA */}
            <div className="rounded-2xl border border-[rgba(0,0,0,0.07)] bg-[#FAFBFC] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBE8DC]">
                    <Shield className="h-4 w-4 text-[#C05015]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">Double authentification (2FA)</p>
                    <p className="text-xs text-[#64748B]">Protégez votre compte avec une application TOTP</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {twoFactorEnabled && <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-medium text-green-700">Actif</span>}
                  <button
                    onClick={twoFactorEnabled ? handleDisable2FA : handleSetup2FA}
                    disabled={secSaving}
                    className={`rounded-xl px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50 ${twoFactorEnabled ? "bg-red-500 hover:bg-red-600" : "bg-[#C05015] hover:bg-[#9A3E10]"}`}
                  >
                    {twoFactorEnabled ? "Désactiver" : "Configurer"}
                  </button>
                </div>
              </div>

              {show2FA && qrData && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-[#64748B]">
                    Scannez le QR code avec <strong>Google Authenticator</strong> ou <strong>Authy</strong>, puis entrez le code à 6 chiffres.
                  </p>
                  {qrData.qrCodeDataUrl ? (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-[rgba(0,0,0,0.07)] bg-white p-4">
                      <img src={qrData.qrCodeDataUrl} alt="QR Code 2FA" className="h-40 w-40 rounded-lg" />
                      <div className="text-center">
                        <p className="text-[10px] text-[#64748B] mb-1">Clé manuelle :</p>
                        <code className="rounded bg-white px-2 py-1 font-mono text-xs select-all">{qrData.secret}</code>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[rgba(89,67,42,0.15)] bg-white py-6 text-center">
                      <p className="break-all px-4 font-mono text-xs text-[#64748B]">{qrData.otpAuthUrl}</p>
                    </div>
                  )}
                  <input
                    type="text" maxLength={6}
                    placeholder="Code à 6 chiffres"
                    value={twoFactorCode}
                    onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-xl border border-[rgba(89,67,42,0.18)] bg-white px-4 py-3 text-center font-mono text-lg tracking-[0.3em] outline-none focus:border-[#C05015]"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleEnable2FA} disabled={secSaving}
                      className="flex-1 rounded-xl bg-[#C05015] py-2.5 text-sm font-semibold text-white hover:bg-[#9A3E10] disabled:opacity-50">
                      {secSaving ? "Activation…" : "Activer la 2FA"}
                    </button>
                    <button onClick={() => setShow2FA(false)}
                      className="rounded-xl border border-[rgba(0,0,0,0.07)] px-4 py-2.5 text-sm text-[#64748B]">
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {backupCodes && (
                <div className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Codes de secours — notez-les maintenant !</p>
                      <p className="mt-0.5 text-xs text-amber-700">Ces codes s'affichent une seule fois. Utilisez-les en cas de perte de téléphone.</p>
                    </div>
                    <button onClick={() => setBackupCodes(null)} className="text-amber-600 hover:text-amber-900">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, i) => (
                      <code key={i} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-center font-mono text-sm text-amber-900 select-all">{code}</code>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigator.clipboard.writeText(backupCodes.join("\n"))}
                      className="flex-1 rounded-xl border border-amber-300 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100">
                      Copier
                    </button>
                    <button onClick={() => { const b=new Blob([`Codes de secours 2FA\n\n${backupCodes.join("\n")}`],{type:"text/plain"}); const u=URL.createObjectURL(b); const a=document.createElement("a"); a.href=u; a.download="codes-secours-2fa.txt"; a.click(); URL.revokeObjectURL(u); }}
                      className="flex-1 rounded-xl bg-amber-600 py-2 text-xs font-semibold text-white hover:bg-amber-700">
                      Télécharger
                    </button>
                  </div>
                </div>
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

/* ── Setup completion banner ── */
function SetupBanner({ restaurant, navigate }) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('setup-banner-dismissed-' + restaurant?.id) === '1'
  );
  const [menuCount, setMenuCount] = useState(null);

  useEffect(() => {
    if (!restaurant?.id) return;
    menuAPI.getAll({ restaurantId: restaurant.id })
      .then(r => setMenuCount((r.data || []).length))
      .catch(() => setMenuCount(0));
  }, [restaurant?.id]);

  if (dismissed) return null;

  const adresseDone  = restaurant?.adresse && restaurant.adresse !== 'À compléter';
  const horairesDone = restaurant?.horaires && restaurant.horaires !== 'Lun-Dim: 08:00-22:00';
  const descDone     = Boolean(restaurant?.description?.trim());
  const menuDone     = menuCount !== null && menuCount > 0;

  const steps = [
    { label: 'Compte créé',         done: true,           tab: null },
    { label: 'Adresse renseignée',  done: !!adresseDone,  tab: 'settings' },
    { label: 'Horaires configurés', done: !!horairesDone, tab: 'settings' },
    { label: 'Description',         done: descDone,       tab: 'settings' },
    { label: 'Menu publié',         done: menuDone,       tab: 'menu' },
  ];

  const doneCount = steps.filter(s => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);
  if (pct >= 100) return null;

  const nextIncomplete = steps.find(s => !s.done && s.tab);

  const dismiss = () => {
    localStorage.setItem('setup-banner-dismissed-' + restaurant?.id, '1');
    setDismissed(true);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white px-5 py-4 shadow-sm">
      <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-[#C05015]" />
      <button onClick={dismiss} className="absolute right-3 top-3 rounded-full p-1 text-[#737373] hover:bg-[#F4F6F8] transition" aria-label="Fermer">
        <X className="h-4 w-4" />
      </button>
      <div className="pl-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-bold text-[#0F172A]">Complétez votre profil restaurant</p>
            <p className="text-xs text-[#737373] mt-0.5">Quelques infos manquantes avant d'être 100% opérationnel</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-2xl font-extrabold text-[#C05015]">{pct}%</span>
              <p className="text-[10px] text-[#737373]">complété</p>
            </div>
            {nextIncomplete && (
              <button onClick={() => navigate(`/gerant?tab=${nextIncomplete.tab}`)}
                className="rounded-xl bg-[#C05015] px-3 py-2 text-xs font-bold text-white hover:bg-[#9A3E10] transition">
                Compléter →
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full rounded-full bg-[#F4F6F8] overflow-hidden">
          <div className="h-full rounded-full bg-[#C05015] transition-all duration-500" style={{ width: pct + '%' }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {steps.map((s) => (
            <button key={s.label}
              onClick={() => s.tab && !s.done && navigate(`/gerant?tab=${s.tab}`)}
              className={`flex items-center gap-1.5 ${s.tab && !s.done ? 'cursor-pointer' : 'cursor-default'}`}>
              {s.done ? (
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border-2 border-[#E2E8F0] shrink-0" />
              )}
              <span className={'text-xs ' + (s.done ? 'text-emerald-600 font-medium' : s.tab ? 'text-[#C05015] hover:underline underline-offset-2' : 'text-[#737373]')}>
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

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
      type: "bar",
      data: {
        labels: weeklyPerformance.labels,
        datasets: [
          {
            label: "Commandes",
            data: weeklyPerformance.orders,
            backgroundColor: weeklyPerformance.orders.map((_, i) =>
              i === weeklyPerformance.orders.indexOf(Math.max(...weeklyPerformance.orders))
                ? "#C05015"
                : "rgba(224,78,26,0.18)"
            ),
            borderRadius: 8,
            borderSkipped: false,
            yAxisID: "y",
          },
          {
            label: "Revenus (FCFA)",
            data: weeklyPerformance.revenue,
            type: "line",
            borderColor: "#F97316",
            backgroundColor: "rgba(197,138,85,0.08)",
            fill: true,
            tension: 0.42,
            pointRadius: 5,
            pointBackgroundColor: "#fff",
            pointBorderColor: "#F97316",
            pointBorderWidth: 2,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#94A3B8", font: { size: 11, weight: '600' } },
            border: { display: false },
          },
          y: {
            position: "left",
            ticks: { color: "#94A3B8", font: { size: 11 }, stepSize: 1 },
            grid: { color: "rgba(148,163,184,0.1)" },
            border: { display: false },
          },
          y1: {
            position: "right",
            grid: { drawOnChartArea: false },
            border: { display: false },
            ticks: {
              color: "#F97316",
              font: { size: 10 },
              callback: (v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v),
            },
          },
        },
        plugins: {
          legend: {
            position: "top",
            align: "end",
            labels: {
              color: "#475569",
              font: { size: 11, weight: '600' },
              boxWidth: 12,
              boxHeight: 12,
              borderRadius: 4,
              usePointStyle: false,
            },
          },
          tooltip: {
            backgroundColor: "#0F172A",
            titleColor: "#FDF5EF",
            bodyColor: "#CBD5E1",
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: (ctx) =>
                ctx.dataset.label === "Revenus (FCFA)"
                  ? `  ${ctx.dataset.label}: ${Number(ctx.parsed.y).toLocaleString()} F`
                  : `  ${ctx.dataset.label}: ${ctx.parsed.y}`,
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
      badge: "bg-[#FBE8DC] text-[#1A1A1A]",
      label: `${Math.max(ageMinutes, 0)} min`,
    };
  };

  const getOrderStatusClasses = (status) =>
    STATUS_COLORS[status] || "bg-[#FBE8DC] text-slate-700";

  const getOrderStatusLabel = (status) =>
    STATUS_LABELS[status] || status?.replace(/_/g, " ") || "-";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="h-10 w-10 rounded-full border-4 border-[#C05015] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C05015]">Dashboard</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">{restaurantName}</h2>
          <p className="mt-0.5 text-sm text-[#64748B]">Pilotez votre restaurant en temps réel.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-[#FDDDD4] bg-[#0F172A] p-1">
            <NotificationBell accentColor="#C05015" />
          </div>
          <button
            onClick={() => void loadOverviewData({ silent: true })}
            className="inline-flex items-center gap-2 rounded-xl border border-[#FDDDD4] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-[#C05015]/40 hover:text-[#C05015]"
          >
            <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Sync…" : "Actualiser"}
          </button>
          <button
            onClick={() => navigate("/gerant?tab=orders")}
            className="inline-flex items-center gap-2 rounded-xl border border-[#FDDDD4] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-[#C05015]/40 hover:text-[#C05015]"
          >
            <ClipboardList className="h-4 w-4" /> Commandes
          </button>
          <button
            onClick={() => navigate("/gerant/kds")}
            className="inline-flex items-center gap-2 rounded-xl bg-[#C05015] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#C05015]/25 transition hover:bg-[#9A3E10]"
          >
            <ChefHat className="h-4 w-4" /> KDS live
          </button>
        </div>
      </div>

      {/* ── Setup completion banner ── */}
      <SetupBanner restaurant={restaurantProfile} navigate={navigate} />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* ── 4 KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1 — primary dark (CA du jour) */}
        <div className="relative overflow-hidden rounded-2xl p-5 shadow-md" style={{ background: '#0F172A' }}>
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-20" style={{ background: '#C05015', filter: 'blur(28px)' }} />
          <div className="relative">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">CA du jour</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'rgba(224,78,26,0.25)' }}>
                <TrendingUp className="h-4 w-4 text-[#C05015]" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white leading-none">{formatFCFA(stats.todayRevenue)}</p>
            <div className="mt-3 flex items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                ↑ {stats.todayOrders}
              </span>
              <span className="text-xs text-white/40">commandes aujourd'hui</span>
            </div>
          </div>
        </div>

        {/* Card 2 — commandes actives */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9A7060]">En cuisine</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50">
              <ClipboardList className="h-4 w-4 text-[#C05015]" />
            </div>
          </div>
          <p className="text-4xl font-bold text-[#0F172A] leading-none">{stats.activeOrders}</p>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-[#C05015]">
              {stats.b2bOrders} B2B
            </span>
            <span className="text-xs text-[#9A7060]">commandes actives</span>
          </div>
        </div>

        {/* Card 3 — alertes stock */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9A7060]">Alertes stock</p>
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${stats.lowStockItems > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
              <AlertTriangle className={`h-4 w-4 ${stats.lowStockItems > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
            </div>
          </div>
          <p className="text-4xl font-bold text-[#0F172A] leading-none">{stats.lowStockItems}</p>
          <div className="mt-3">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${stats.lowStockItems > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {stats.lowStockItems === 0 ? '✓ Tout est OK' : `${stats.lowStockItems} seuil${stats.lowStockItems > 1 ? 's' : ''} critique${stats.lowStockItems > 1 ? 's' : ''}`}
            </span>
          </div>
        </div>

        {/* Card 4 — équipe */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9A7060]">Équipe</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
              <Users className="h-4 w-4 text-[#F97316]" />
            </div>
          </div>
          <p className="text-4xl font-bold text-[#0F172A] leading-none">{stats.staffCount}</p>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-[#F97316]">
              {stats.uniqueCustomers} clients
            </span>
            <span className="text-xs text-[#9A7060]">uniques</span>
          </div>
        </div>
      </div>

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">

        {/* Chart — BIG */}
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Analyse des performances</h3>
              <p className="mt-0.5 text-xs text-[#9A7060]">Commandes & revenus sur 7 jours</p>
            </div>
            <div className="flex gap-3">
              <div className="rounded-xl border border-slate-100 bg-white px-4 py-2 text-center">
                <p className="text-[10px] font-medium text-[#9A7060] uppercase tracking-wider">Commandes</p>
                <p className="mt-0.5 text-xl font-bold text-[#C05015]">{weekOrdersTotal}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white px-4 py-2 text-center">
                <p className="text-[10px] font-medium text-[#9A7060] uppercase tracking-wider">Revenus</p>
                <p className="mt-0.5 text-xl font-bold text-[#F97316]">{formatFCFA(weekRevenueTotal)}</p>
              </div>
            </div>
          </div>
          <div style={{ position: 'relative', height: '260px' }}>
            <canvas ref={chartRef} style={{ height: '260px', width: '100%' }} />
          </div>
        </section>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Indicateurs clés */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-[#0F172A]">Indicateurs clés</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-orange-50 to-white px-4 py-3 border border-orange-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
                    <CreditCard className="h-4 w-4 text-[#C05015]" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Ticket moyen</span>
                </div>
                <span className="text-base font-bold text-[#0F172A]">{formatFCFA(financialHighlights.ticketMoyen)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-50 to-white px-4 py-3 border border-amber-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                    <PieChart className="h-4 w-4 text-[#F97316]" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Marge brute</span>
                </div>
                <span className="text-base font-bold text-[#0F172A]">{financialHighlights.margesBrutes}%</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-emerald-50 to-white px-4 py-3 border border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                    <Users className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Clients uniques</span>
                </div>
                <span className="text-base font-bold text-[#0F172A]">{stats.uniqueCustomers}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-sky-50 to-white px-4 py-3 border border-sky-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100">
                    <Activity className="h-4 w-4 text-sky-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Commandes semaine</span>
                </div>
                <span className="text-base font-bold text-[#0F172A]">{weekOrdersTotal}</span>
              </div>
            </div>
          </section>

          {/* Accès rapides */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-[#0F172A]">Accès rapides</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Package, label: "Menu", path: "/gerant?tab=menu", color: '#C05015' },
                { icon: ClipboardList, label: "Commandes", path: "/gerant?tab=orders", color: '#C05015' },
                { icon: AlertTriangle, label: "Stocks", path: "/gerant?tab=stocks", color: '#F97316' },
                { icon: Wallet, label: "Trésorerie", path: "/gerant?tab=finance", color: '#F97316' },
                { icon: Users, label: "Équipe", path: "/gerant?tab=settings", color: '#64748B' },
                { icon: ChefHat, label: "KDS live", path: "/gerant/kds", color: '#C05015' },
              ].map(({ icon: Icon, label, path, color }) => (
                <button
                  key={label}
                  onClick={() => navigate(path)}
                  className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#C05015]"
                >
                  <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                  {label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ── Recent orders ── */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">Commandes récentes</h3>
            <p className="mt-0.5 text-xs text-[#9A7060]">Client + entreprise · {recentOrders.length} dernières</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportPDF}
              disabled={recentOrders.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#FDDDD4] bg-white px-3 py-2 text-xs font-medium text-[#9A7060] transition hover:bg-[#FBE8DC] disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" /> PDF
            </button>
            <button
              onClick={handleExportSyscohada}
              disabled={!restaurantId}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#C05015] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#9A3E10] disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" /> SYSCOHADA
            </button>
          </div>
        </div>

        {recentOrders.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {recentOrders.map((order) => {
              const ageTone = getOrderAgeTone(order);
              return (
                <div key={order.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FBE8DC] text-[11px] font-bold text-[#C05015]">
                      #{(order.numero ?? '').toString().slice(-3)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getOrderStatusClasses(order.statut)}`}>
                          {getOrderStatusLabel(order.statut)}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ageTone.badge}`}>
                          {ageTone.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[#9A7060]">{order.source} · {formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-[#0F172A]">{formatFCFA(order.amount)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#FDDDD4] bg-white py-10 text-center text-sm text-[#9A7060]">
            Aucune commande récente
          </div>
        )}
      </section>
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
      <OnboardingWizard />
      <div
        className={`rounded-3xl p-6 shadow-sm ${
          darkMode
            ? "border border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"
            : "bg-white border border-[rgba(0,0,0,0.05)]"
        }`}
      >
        {renderTabContent()}
      </div>
    </div>
  );
}