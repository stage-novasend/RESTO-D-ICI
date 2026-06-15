/* ═══════════════════════════════════════════════════════════════
   GerantDashboard.jsx — Tableau de bord du gérant de restaurant
   7 onglets : vue d'ensemble, menu, commandes, stocks, finance,
               promotions, paramètres, historique
   Fonctionnalités : WebSocket temps réel, QR Code, carte Leaflet
   ═══════════════════════════════════════════════════════════════ */
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import QRCode from "qrcode";
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
  FileText,
  Tag,
  Percent,
  Copy,
  ToggleLeft,
  ToggleRight,
  History,
  LocateFixed,
  QrCode,
  Printer,
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
  uploadsAPI,
  promosAPI,
  commandesExtraAPI,
  fournisseursAPI,
  retraitAPI,
} from "../../services/api";
import { getArticleImage } from "../../utils/articleImage";
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
import { buildFinanceReportBlob, buildBonCommandeBlob } from "../../utils/syscohada-pdf";

/* ── Badge compte à rebours B2B ── */
function B2BCountdown({ deadlineAt, statut }) {
  const DONE = ['LIVREE', 'ANNULEE'];
  const [ms, setMs] = useState(() => deadlineAt ? new Date(deadlineAt) - Date.now() : null);

  useEffect(() => {
    if (!deadlineAt || DONE.includes(statut)) return;
    const id = setInterval(() => setMs(new Date(deadlineAt) - Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadlineAt, statut]);

  if (!deadlineAt || DONE.includes(statut) || ms === null) return null;
  if (ms <= 0) {
    return <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-bold">⏱ Délai dépassé</span>;
  }
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const urgent = ms < 60 * 60 * 1000;
  const warn = ms < 2 * 60 * 60 * 1000;
  return (
    <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${urgent ? 'bg-red-100 text-red-700' : warn ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
      ⏱ {h}h {String(m).padStart(2, '0')}m {String(s).padStart(2, '0')}s
    </span>
  );
}

/* ── Constantes de couleurs et thème visuel ── */
const COLORS = {
  primary: {
    bg: "bg-[#FFF0DF]",
    border: "border-[rgba(0,0,0,0.07)]",
    text: "text-[#FF8C00]",
    button: "bg-[#FF8C00] hover:bg-[#E07A00]",
    light: "bg-[#FFF0DF]",
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
    border: "border-[rgba(0,0,0,0.07)]",
    text: "text-[#FF8C00]",
    button: "bg-[#FF8C00] hover:bg-[#E07A00]",
    light: "bg-[#FFF0DF]",
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
  const [locating, setLocating] = useState(false);

  const restaurantCenter = [
    Number(restaurantPosition.lat) || 5.3364,
    Number(restaurantPosition.lng) || -4.0267,
  ];
  const pendingCenter = [
    Number(selectedPosition.lat) || restaurantCenter[0],
    Number(selectedPosition.lng) || restaurantCenter[1],
  ];

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onPick({ lat: Number(coords.latitude.toFixed(6)), lng: Number(coords.longitude.toFixed(6)) });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="mt-4 overflow-hidden rounded-[20px] border border-amber-200">
      <div className="flex justify-end bg-amber-50/50 px-3 py-2">
        <button
          type="button"
          onClick={handleLocate}
          disabled={locating}
          className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-[#0F172A] shadow-sm transition hover:bg-[#FFF0DF] hover:text-[#FF8C00] disabled:opacity-50"
        >
          <LocateFixed className={`h-4 w-4 ${locating ? 'animate-pulse' : ''}`} />
          {locating ? 'Localisation…' : 'Utiliser ma position'}
        </button>
      </div>
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

/* ══════════════════ Module Menu — Catalogue et articles ══════════════════ */
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
    estMenuDuJour: false,
    activationDate: "",
    expirationDate: "",
    variants: [],
  });
  const [newCategory, setNewCategory] = useState({ nom: "", icone: "" });
  const [formErrors, setFormErrors] = useState({});
  const [categoryErrors, setCategoryErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingEdit, setUploadingEdit] = useState(false);

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

    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner une image (jpg, png, webp)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("La taille de l'image ne doit pas dépasser 5 MB");
      return;
    }

    setUploading(true);
    try {
      const res = await uploadsAPI.uploadImage(file);
      setNewArticle((prev) => ({ ...prev, photoUrl: res.data.url }));
    } catch (err) {
      const msg = err?.response?.data?.message || "Erreur lors de l'upload. Vérifiez la configuration S3.";
      alert(msg);
      // Fallback : prévisualisation locale sans persistance
      const localUrl = URL.createObjectURL(file);
      setNewArticle((prev) => ({ ...prev, photoUrl: localUrl }));
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
        estMenuDuJour: false,
        activationDate: "",
        expirationDate: "",
        variants: [],
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

  const handleEditFileUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Image uniquement (jpg, png, webp)'); return; }
    if (file.size > 5 * 1024 * 1024) { alert("Taille max : 5 Mo"); return; }
    setUploadingEdit(true);
    try {
      const res = await uploadsAPI.uploadImage(file);
      setEditArticle(p => ({ ...p, photoUrl: res.data.url }));
    } catch {
      const localUrl = URL.createObjectURL(file);
      setEditArticle(p => ({ ...p, photoUrl: localUrl }));
    } finally {
      setUploadingEdit(false);
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
        prixPromo: editArticle.prixPromo ? parseFloat(editArticle.prixPromo) : null,
        promoActif: !!editArticle.promoActif,
        estMenuDuJour: !!editArticle.estMenuDuJour,
        activationDate: editArticle.activationDate || undefined,
        expirationDate: editArticle.expirationDate || undefined,
        variants: editArticle.variants || [],
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
        <div className="h-9 w-9 rounded-full border-4 border-[#FF8C00] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF0DF] px-3 py-1 text-xs font-medium text-[#FF8C00]">
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
              <span className="rounded-full bg-[#FFF0DF] px-3 py-1.5 text-[#1A1A1A]">
                {articles.length} article(s)
              </span>
              <span className="rounded-full bg-[#FFF0DF] px-3 py-1.5 text-[#1A1A1A]">
                {articles.filter((article) => article.disponible).length} disponible(s)
              </span>
              <span className="rounded-full bg-[#FFF0DF] px-3 py-1.5 text-[#FF8C00]">
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
              className="inline-flex items-center gap-2 rounded-2xl bg-[#FF8C00] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#E07A00]"
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
                className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] ${categoryErrors.nom ? "border-red-500" : "border-[#E2E8F0]"}`}
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
                className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 outline-none transition focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00]"
                placeholder="Ex: 🍽️"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleCreateCategory}
              className="rounded-2xl bg-[#FF8C00] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#E07A00]"
            >
              Créer la catégorie
            </button>
            <button
              onClick={() => {
                setShowCategoryForm(false);
                setCategoryErrors({});
              }}
              className="rounded-2xl border border-[#E2E8F0] bg-white px-6 py-3 font-semibold text-[#0F172A] transition hover:bg-[#FFF0DF]"
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
                className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] ${formErrors.nom ? "border-red-500" : "border-[#E2E8F0]"}`}
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
                className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] ${formErrors.prix ? "border-red-500" : "border-[#E2E8F0]"}`}
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
                className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] ${formErrors.categorieId ? "border-red-500" : "border-[#E2E8F0]"}`}
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
                className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] ${formErrors.stock ? "border-red-500" : "border-[#E2E8F0]"}`}
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
                    className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 outline-none transition focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00]"
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
              className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 outline-none transition focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00]"
              rows="3"
              placeholder="Description du plat..."
            />
          </div>
          {/* Variantes (tailles / suppléments) */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-3">
            <p className="text-sm font-bold text-blue-900">🔀 Variantes (S/M/L, suppléments…)</p>
            {(newArticle.variants || []).map((v, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input type="text" placeholder="Label (ex: Grande)" value={v.label}
                  onChange={e => setNewArticle(p => { const vs=[...p.variants]; vs[idx]={...vs[idx],label:e.target.value}; return {...p,variants:vs}; })}
                  className="flex-1 bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50" />
                <input type="number" placeholder="Supplément F CFA" min="0" value={v.prixSupplement}
                  onChange={e => setNewArticle(p => { const vs=[...p.variants]; vs[idx]={...vs[idx],prixSupplement:e.target.value}; return {...p,variants:vs}; })}
                  className="w-36 bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50" />
                <button type="button" onClick={() => setNewArticle(p => ({ ...p, variants: p.variants.filter((_,i)=>i!==idx) }))}
                  className="text-red-400 hover:text-red-600 text-lg font-bold px-1">×</button>
              </div>
            ))}
            <button type="button" onClick={() => setNewArticle(p => ({ ...p, variants: [...(p.variants||[]), { label:'', prixSupplement:0 }] }))}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 border border-blue-300 rounded-xl px-3 py-1.5 hover:bg-blue-100 transition">
              + Ajouter une variante
            </button>
          </div>
          {/* Menu du jour */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="new-menu-jour" checked={!!newArticle.estMenuDuJour}
                onChange={e => setNewArticle(p => ({ ...p, estMenuDuJour: e.target.checked }))}
                className="accent-[#FF8C00] h-4 w-4" />
              <label htmlFor="new-menu-jour" className="text-sm font-bold text-amber-900 cursor-pointer">
                📅 Menu du jour (activation/désactivation automatique)
              </label>
            </div>
            {newArticle.estMenuDuJour && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-amber-900">Activation (date & heure)</label>
                  <input type="datetime-local" value={newArticle.activationDate}
                    onChange={e => setNewArticle(p => ({ ...p, activationDate: e.target.value }))}
                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-amber-900">Expiration (date & heure)</label>
                  <input type="datetime-local" value={newArticle.expirationDate}
                    onChange={e => setNewArticle(p => ({ ...p, expirationDate: e.target.value }))}
                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
                  <p className="mt-1 text-[10px] text-amber-700">Désactivé automatiquement à cette heure</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleAddArticle}
              className="rounded-2xl bg-[#FF8C00] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#E07A00]"
            >
              Créer l'article
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setFormErrors({});
              }}
              className="rounded-2xl border border-[#E2E8F0] bg-white px-6 py-3 font-semibold text-[#0F172A] transition hover:bg-[#FFF0DF]"
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
            className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-3 pl-10 pr-4 outline-none transition focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00]"
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
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-[#FFF0DF] text-2xl shadow-sm">
                    <img
                      src={getArticleImage(a, { width: 128, quality: 70 })}
                      alt={a.nom}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#1C1917]">{a.nom}</p>
                      <span className="rounded-full bg-[#FFF0DF] px-2.5 py-1 text-xs font-medium text-[#57534E]">
                        {a.categorie?.nom || "Sans catégorie"}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${a.disponible ? "bg-[#FFF0DF] text-[#1A1A1A]" : "bg-red-50 text-red-700"}`}
                      >
                        {a.disponible ? "Disponible" : "Masqué"}
                      </span>
                      {a.estMenuDuJour && (
                        <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          📅 Menu du jour{a.expirationDate ? ` · expire ${new Date(a.expirationDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </span>
                      )}
                      {Array.isArray(a.variants) && a.variants.length > 0 && (
                        <span className="rounded-full bg-blue-100 border border-blue-300 px-2.5 py-1 text-xs font-semibold text-blue-800">
                          🔀 {a.variants.length} variante{a.variants.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#78716C]">Stock: {a.stock ?? 0}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    {a.promoActif && a.prixPromo ? (
                      <>
                        <span className="text-lg font-bold text-[#FF8C00]">{formatFCFA(Number(a.prixPromo))}</span>
                        <span className="text-sm text-[#6B7280] line-through">{formatFCFA(Number(a.prix || 0))}</span>
                        <span className="rounded-full bg-[#FF8C00] px-2 py-0.5 text-[10px] font-bold text-white">PROMO</span>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-[#1C1917]">{formatFCFA(Number(a.prix || 0))}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleDisponibilite(a.id, !a.disponible)}
                    className={`relative h-8 w-14 rounded-full transition-all ${a.disponible ? "bg-[#FF8C00]" : "bg-[#D1CBC5]"}`}
                    title={a.disponible ? "Désactiver" : "Activer"}
                  >
                    <span
                      className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${a.disponible ? "translate-x-6" : ""}`}
                    />
                  </button>
                  {/* Edit */}
                  <button
                    onClick={() => setEditArticle({ ...a, prix: String(a.prix), stock: String(a.stock ?? 0), categorieId: a.categorie?.id || a.categorieId || '', variants: Array.isArray(a.variants) ? a.variants : [] })}
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
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-[24px] border border-dashed border-[#E2E8F0] bg-[#FFF7ED]">
            <Package className="w-12 h-12 mb-3" style={{ color: '#FF8C00', opacity: 0.4 }} />
            <p className="text-sm font-medium" style={{ color: '#0F172A' }}>Aucun article pour l'instant</p>
            <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Ajoutez votre premier article au menu pour commencer.</p>
          </div>
        )}
      </div>

      {/* ── Edit Article Modal ── */}
      {editArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && setEditArticle(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-[#FF8C00] px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-extrabold">Modifier l'article</h3>
              <button onClick={() => setEditArticle(null)} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
              {[
                { k: 'nom',         label: 'Nom *',          type: 'text' },
                { k: 'prix',        label: 'Prix (F CFA) *', type: 'number' },
                { k: 'stock',       label: 'Stock',          type: 'number' },
                { k: 'description', label: 'Description',    type: 'text' },
              ].map(f => (
                <div key={f.k} className="space-y-1">
                  <label className="text-xs font-semibold text-[#1A1A1A]">{f.label}</label>
                  <input type={f.type} value={editArticle[f.k] || ''} onChange={e => setEditArticle(p => ({ ...p, [f.k]: e.target.value }))}
                    className="w-full bg-[#FFF0DF] border-0 rounded-xl px-3 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF8C00]/40" />
                </div>
              ))}
              {/* Photo article */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#1A1A1A]">Photo de l'article</label>
                <div className="flex gap-3 items-start">
                  <div className="flex-1 space-y-2">
                    <input type="text" value={editArticle.photoUrl || ''} onChange={e => setEditArticle(p => ({ ...p, photoUrl: e.target.value }))}
                      placeholder="URL de la photo" className="w-full bg-[#FFF0DF] border-0 rounded-xl px-3 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF8C00]/40" />
                    <label className={`flex items-center gap-2 cursor-pointer text-xs font-semibold px-3 py-2 rounded-xl border border-dashed border-[#FF8C00]/40 text-[#FF8C00] hover:bg-[#FFF0DF] transition ${uploadingEdit ? 'opacity-60 pointer-events-none' : ''}`}>
                      {uploadingEdit ? 'Upload en cours…' : '📷 Télécharger une photo'}
                      <input type="file" accept="image/*" className="hidden" disabled={uploadingEdit}
                        onChange={e => handleEditFileUpload(e.target.files[0])} />
                    </label>
                  </div>
                  {editArticle.photoUrl ? (
                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-[#E2E8F0] shadow-sm flex-shrink-0">
                      <img src={editArticle.photoUrl} alt="Aperçu" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-[#FFF0DF] flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1A1A]">Catégorie</label>
                <select value={editArticle.categorieId || ''} onChange={e => setEditArticle(p => ({ ...p, categorieId: e.target.value }))}
                  className="w-full bg-[#FFF0DF] border-0 rounded-xl px-3 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF8C00]/40">
                  <option value="">Sélectionner…</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              {/* Prix promo */}
              <div className="rounded-xl bg-[#FFF0DF] p-3 space-y-2">
                <p className="text-xs font-bold text-[#FF8C00] uppercase tracking-wide">Prix promotionnel (optionnel)</p>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1A1A1A]">Prix promo (F CFA)</label>
                  <input type="number" min="0" value={editArticle.prixPromo || ''} onChange={e => setEditArticle(p => ({ ...p, prixPromo: e.target.value }))}
                    placeholder="Ex : 2 500"
                    className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF8C00]/40" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="edit-promo-actif" checked={!!editArticle.promoActif}
                    onChange={e => setEditArticle(p => ({ ...p, promoActif: e.target.checked }))} />
                  <label htmlFor="edit-promo-actif" className="text-sm font-semibold text-[#FF8C00]">Activer le prix promo</label>
                </div>
              </div>
              {/* Variantes */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                <p className="text-xs font-bold text-blue-900">🔀 Variantes (tailles / suppléments)</p>
                {(editArticle.variants || []).map((v, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input type="text" placeholder="Label" value={v.label || ''}
                      onChange={e => setEditArticle(p => { const vs=[...( p.variants||[])]; vs[idx]={...vs[idx],label:e.target.value}; return {...p,variants:vs}; })}
                      className="flex-1 bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50" />
                    <input type="number" placeholder="Supplément" min="0" value={v.prixSupplement || 0}
                      onChange={e => setEditArticle(p => { const vs=[...(p.variants||[])]; vs[idx]={...vs[idx],prixSupplement:e.target.value}; return {...p,variants:vs}; })}
                      className="w-32 bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50" />
                    <button type="button" onClick={() => setEditArticle(p => ({ ...p, variants: (p.variants||[]).filter((_,i)=>i!==idx) }))}
                      className="text-red-400 hover:text-red-600 text-lg font-bold px-1">×</button>
                  </div>
                ))}
                <button type="button" onClick={() => setEditArticle(p => ({ ...p, variants: [...(p.variants||[]), { label:'', prixSupplement:0 }] }))}
                  className="text-xs font-semibold text-blue-700 border border-blue-300 rounded-xl px-3 py-1.5 hover:bg-blue-100 transition">
                  + Ajouter une variante
                </button>
              </div>
              {/* Menu du jour */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="edit-menu-jour" checked={!!editArticle.estMenuDuJour}
                    onChange={e => setEditArticle(p => ({ ...p, estMenuDuJour: e.target.checked }))} />
                  <label htmlFor="edit-menu-jour" className="text-sm font-semibold text-amber-800">📅 Menu du jour (activation/désactivation automatique)</label>
                </div>
                {editArticle.estMenuDuJour && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-amber-700">Activation (date & heure)</label>
                      <input type="datetime-local" value={editArticle.activationDate || ''} onChange={e => setEditArticle(p => ({ ...p, activationDate: e.target.value }))}
                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-amber-700">Expiration (date & heure)</label>
                      <input type="datetime-local" value={editArticle.expirationDate || ''} onChange={e => setEditArticle(p => ({ ...p, expirationDate: e.target.value }))}
                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="edit-dispo" checked={!!editArticle.disponible} onChange={e => setEditArticle(p => ({ ...p, disponible: e.target.checked }))} />
                <label htmlFor="edit-dispo" className="text-sm font-semibold text-[#1A1A1A]">Disponible</label>
              </div>
              <button onClick={handleUpdateArticle}
                className="w-full py-3 rounded-2xl bg-[#FF8C00] hover:bg-[#E07A00] text-white font-bold text-sm flex items-center justify-center gap-2">
                <Pencil className="w-3.5 h-3.5" />Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════ Module Commandes ══════════════════ */
function OrdersTab({ restaurantId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [error, setError] = useState(null);
  const [nowTs, setNowTs] = useState(0);
  const [receiptLoading, setReceiptLoading] = useState({});
  const [rembourseModal, setRembourseModal] = useState(null); // order | null
  const [rembourseMotif, setRembourseMotif] = useState('');
  const [rembourseLoading, setRembourseLoading] = useState(false);

  const handleDownloadReceipt = async (order) => {
    setReceiptLoading(s => ({ ...s, [order.id]: true }));
    try {
      const r = await commandesService.getReceiptPdf(order.id);
      const blob = new Blob([r.data], { type: 'application/pdf' });
      downloadAndOpenBlob(blob, `recu-commande-${order.numero || order.id.slice(0, 8)}.pdf`);
    } catch {
      alert('Erreur téléchargement reçu PDF. Veuillez réessayer.');
    } finally {
      setReceiptLoading(s => ({ ...s, [order.id]: false }));
    }
  };

  const handleRembourser = async () => {
    if (!rembourseModal) return;
    setRembourseLoading(true);
    try {
      await commandesExtraAPI.rembourser(rembourseModal.id, rembourseMotif);
      setRembourseModal(null);
      setRembourseMotif('');
      loadOrders({ silent: true });
    } catch {
      alert('Erreur lors du remboursement. Veuillez réessayer.');
    } finally {
      setRembourseLoading(false);
    }
  };

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
      RECUE: "bg-[#FFF0DF] text-[#FF8C00]",
      CONFIRMEE: "bg-[#FFF0DF] text-[#1A1A1A]",
      EN_PREP: "bg-[#FFF0DF] text-[#E07A00]",
      PRETE: "bg-[#FFF0DF] text-[#1C1917]",
      LIVREE: "bg-[#FFF0DF] text-[#57534E]",
      ANNULEE: "bg-red-50 text-red-700",
      EN_ATTENTE: "bg-[#FFFBEB] text-[#92400E]",
    };
    return colors[status] || "bg-[#FFF0DF] text-[#1A1A1A]";
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
        <div className="w-8 h-8 border-4 border-[#FF8C00] border-t-transparent rounded-full animate-spin" />
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
                  <span className="text-xs px-2 py-1 rounded-full bg-[#FFF0DF] text-slate-700">
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
                <p className="text-sm text-[#6B7280]">Référence CDC: {order.numero}</p>
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
                    className="px-3 py-1.5 bg-[#FF8C00] text-white rounded-lg text-sm hover:bg-[#E07A00] transition"
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
                  <span className="px-3 py-1.5 bg-[#FFF0DF] text-slate-700 rounded-lg text-sm">
                    Commande entreprise - lecture seule
                  </span>
                )}
                {order.type === "B2B" && order.deadlineAt && (
                  <B2BCountdown deadlineAt={order.deadlineAt} statut={order.statut} />
                )}
                {order.statut === "LIVREE" && (
                  <>
                    <button
                      onClick={() => handleDownloadReceipt(order)}
                      disabled={receiptLoading[order.id]}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-[#FF8C00] text-[#FF8C00] rounded-lg text-sm hover:bg-[#FFF0DF] transition disabled:opacity-60"
                      title="Télécharger le reçu PDF (RG-16)"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {receiptLoading[order.id] ? '…' : 'Reçu PDF'}
                    </button>
                    {!order.rembourse && (
                      <button
                        onClick={() => { setRembourseModal(order); setRembourseMotif(''); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 transition"
                        title="Enregistrer un remboursement"
                      >
                        <RefreshCcw className="w-3.5 h-3.5" />
                        Rembourser
                      </button>
                    )}
                    {order.rembourse && (
                      <span className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium">Remboursée</span>
                    )}
                  </>
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
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl" style={{ background: '#FFF7ED' }}>
          <ClipboardList className="w-12 h-12 mb-3" style={{ color: '#FF8C00', opacity: 0.4 }} />
          <p className="text-sm font-medium" style={{ color: '#0F172A' }}>Aucune commande en cours</p>
          <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Les nouvelles commandes arriveront ici en temps réel.</p>
        </div>
      )}

      {/* Modal remboursement */}
      {rembourseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-[420px] max-w-[95vw] shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-bold text-slate-900">Confirmer le remboursement</h3>
              <button onClick={() => setRembourseModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-600 mb-4">
                Commande <strong>{rembourseModal.numero}</strong> — {Number(rembourseModal.montantTotal).toLocaleString()} FCFA
              </p>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Motif du remboursement</label>
              <textarea
                value={rembourseMotif}
                onChange={e => setRembourseMotif(e.target.value)}
                placeholder="Ex: article indisponible, qualité insuffisante..."
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end px-6 py-4 border-t">
              <button onClick={() => setRembourseModal(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition">Annuler</button>
              <button onClick={handleRembourser} disabled={rembourseLoading} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition disabled:opacity-60">
                {rembourseLoading ? 'Traitement…' : 'Confirmer le remboursement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════ Module Stocks — Inventaire et alertes ══════════════════ */
function StocksTab({ restaurantId }) {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [adjustmentForm, setAdjustmentForm] = useState({ articleId: '', quantity: '', motif: '' });
  const [entreeForm, setEntreeForm] = useState({ articleId: '', quantity: '', fournisseurId: '', motif: '' });
  const [fournisseurs, setFournisseurs] = useState([]);
  const [stockTab, setStockTab] = useState('entree'); // 'entree' | 'ajustement' | 'rapport' | 'bon'
  const [rapportItems, setRapportItems] = useState([]); // [{id, nom, categorie, stockTheorique, stockReel}]
  const [rapportLoading, setRapportLoading] = useState(false);
  const [bonForm, setBonForm] = useState({ fournisseurId: '', dateLivraison: '', lignes: [{ article: '', quantite: '', prixUnit: '' }] });
  const [restaurantInfo, setRestaurantInfo] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadRapportEcarts = async () => {
    if (!restaurantId) return;
    setRapportLoading(true);
    try {
      const res = await stocksAPI.getRapportEcarts(restaurantId);
      setRapportItems((res.data || []).map(a => ({ ...a, stockReel: '' })));
    } catch { showToast('Erreur chargement rapport'); }
    finally { setRapportLoading(false); }
  };

  const loadRestaurantInfo = async () => {
    if (restaurantInfo) return;
    try { const r = await restaurantAPI.getMine(); setRestaurantInfo(r.data); } catch { /* ignore */ }
  };

  const generateBonCommande = () => {
    const fournisseur = fournisseurs.find(f => f.id === bonForm.fournisseurId);
    if (!fournisseur || bonForm.lignes.every(l => !l.article)) {
      showToast('Sélectionnez un fournisseur et au moins un article');
      return;
    }
    const lignes = bonForm.lignes.filter(l => l.article && l.quantite);
    const num = `BC-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const blob = buildBonCommandeBlob({
      num,
      restaurantNom: restaurantInfo?.nom || 'Restaurant',
      restaurantAdresse: restaurantInfo?.adresse || '',
      fournisseur,
      lignes,
      dateLivraison: bonForm.dateLivraison,
    });
    downloadAndOpenBlob(blob, `bon-commande-${num}.pdf`);
  };

  const exportRapportCSV = () => {
    const date = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
    const rows = [
      ['Article', 'Catégorie', 'Stock Théorique', 'Stock Réel', 'Écart', 'Statut'],
      ...rapportItems.map(r => {
        const reel = r.stockReel !== '' ? Number(r.stockReel) : null;
        const ecart = reel !== null ? reel - r.stockTheorique : '';
        const statut = reel === null ? 'Non compté' : ecart === 0 ? 'OK' : ecart > 0 ? 'Excédent' : 'Manquant';
        return [r.nom, r.categorie, r.stockTheorique, reel ?? '', ecart, statut];
      }),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `inventaire-ecarts-${date}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const loadStocks = useCallback(async () => {
    if (!restaurantId) return;
    try {
      setLoading(true);
      const [stocksRes, fourRes] = await Promise.all([
        stocksAPI.getAll({ restaurantId }),
        fournisseursAPI.getActifs().catch(() => ({ data: [] })),
      ]);
      setStocks(stocksRes.data || []);
      setFournisseurs(fourRes.data || []);
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

  const handleEntreeStock = async () => {
    if (!entreeForm.articleId || !entreeForm.quantity) {
      showToast('Article et quantité requis');
      return;
    }
    if (!entreeForm.fournisseurId) {
      showToast('Fournisseur obligatoire pour une entrée de stock (RG-24)');
      return;
    }
    if (parseInt(entreeForm.quantity) <= 0) {
      showToast('La quantité doit être positive');
      return;
    }
    try {
      setSaving(true);
      await stocksAPI.entreeStock(
        entreeForm.articleId,
        parseInt(entreeForm.quantity),
        entreeForm.fournisseurId,
        entreeForm.motif,
      );
      setEntreeForm({ articleId: '', quantity: '', fournisseurId: '', motif: '' });
      showToast('Entrée de stock enregistrée');
      await loadStocks();
    } catch (e) {
      showToast(e?.response?.data?.message || "Erreur lors de l'entrée de stock");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="h-9 w-9 rounded-full border-4 border-[#FF8C00] border-t-transparent animate-spin" />
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
          { label: 'Articles suivis', value: stocks.length, icon: Package, iconBg: '#FFF0DF', iconColor: '#FF8C00' },
          { label: 'Niveaux OK', value: okItems, icon: CheckCircle, iconBg: '#F0FDF4', iconColor: '#16A34A' },
          { label: 'Alertes critiques', value: criticalItems.length, icon: AlertTriangle, iconBg: criticalItems.length > 0 ? '#FEF2F2' : '#F0FDF4', iconColor: criticalItems.length > 0 ? '#DC2626' : '#16A34A' },
        ].map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <div key={label} className="rounded-2xl bg-white border border-[#E2E8F0] p-4 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
              <Icon className="w-5 h-5" style={{ color: iconColor }} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">{label}</p>
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
            <p className="text-xs text-[#6B7280] mt-0.5">Vue détaillée par article avec niveau de stock</p>
          </div>
          <button onClick={loadStocks}
            className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-semibold text-[#475569] hover:border-[#FF8C00]/40 hover:text-[#FF8C00] transition-colors">
            <RefreshCcw className="w-3.5 h-3.5" />
            Actualiser
          </button>
        </div>
        {stocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center" style={{ background: '#FFF7ED' }}>
            <Package className="w-12 h-12 mb-3" style={{ color: '#FF8C00', opacity: 0.4 }} />
            <p className="text-sm font-medium" style={{ color: '#0F172A' }}>Aucun article en stock</p>
            <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Le stock de vos articles apparaîtra ici dès qu'ils seront créés.</p>
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
                    <p className="text-xs text-[#6B7280]">{item.unite || 'unités'}</p>
                  </div>
                  <div className="text-right flex-shrink-0 hidden sm:block w-20">
                    <p className="text-[10px] text-[#6B7280] uppercase tracking-wide">Seuil min.</p>
                    <p className="text-sm font-semibold text-[#475569]">{seuil} {item.unite || 'u.'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Entrée de stock / Ajustement — tabs */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        {/* Tab switcher */}
        <div className="flex border-b border-[#E2E8F0]">
          <button
            onClick={() => setStockTab('entree')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition ${stockTab === 'entree' ? 'bg-[#FFF0DF] text-[#FF8C00] border-b-2 border-[#FF8C00]' : 'text-[#64748B] hover:bg-[#F8FAFC]'}`}
          >
            <Plus className="w-4 h-4" /> Entrée de stock
          </button>
          <button
            onClick={() => setStockTab('ajustement')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition ${stockTab === 'ajustement' ? 'bg-slate-100 text-slate-700 border-b-2 border-slate-400' : 'text-[#64748B] hover:bg-[#F8FAFC]'}`}
          >
            <RefreshCcw className="w-4 h-4" /> Ajustement manuel
          </button>
          <button
            onClick={() => { setStockTab('rapport'); loadRapportEcarts(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition ${stockTab === 'rapport' ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500' : 'text-[#64748B] hover:bg-[#F8FAFC]'}`}
          >
            <FileText className="w-4 h-4" /> Rapport d'écarts
          </button>
          <button
            onClick={() => { setStockTab('bon'); loadRestaurantInfo(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition ${stockTab === 'bon' ? 'bg-violet-50 text-violet-700 border-b-2 border-violet-500' : 'text-[#64748B] hover:bg-[#F8FAFC]'}`}
          >
            <Printer className="w-4 h-4" /> Bon de commande
          </button>
        </div>

        <div className="p-5">
          {stockTab === 'entree' ? (
            <>
              <p className="text-xs text-[#6B7280] mb-4 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#FF8C00] inline-block" />
                Réception marchandise — fournisseur <strong>obligatoire</strong> (RG-24)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#475569]">Article</label>
                  <select value={entreeForm.articleId}
                    onChange={e => setEntreeForm({ ...entreeForm, articleId: e.target.value })}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm outline-none focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] transition">
                    <option value="">Sélectionner un article</option>
                    {stocks.map(item => <option key={item.id} value={item.id}>{item.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#475569]">
                    Fournisseur <span className="text-red-500">*</span>
                  </label>
                  {fournisseurs.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                      Aucun fournisseur actif — contactez l'administrateur
                    </p>
                  ) : (
                    <select value={entreeForm.fournisseurId}
                      onChange={e => setEntreeForm({ ...entreeForm, fournisseurId: e.target.value })}
                      className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm outline-none focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] transition">
                      <option value="">Sélectionner un fournisseur</option>
                      {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}{f.delaiLivraison ? ` (${f.delaiLivraison}j)` : ''}</option>)}
                    </select>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#475569]">Quantité reçue</label>
                  <input type="number" min="1" value={entreeForm.quantity}
                    onChange={e => setEntreeForm({ ...entreeForm, quantity: e.target.value })}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm outline-none focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] transition"
                    placeholder="Ex: 10" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#475569]">Motif / Référence bon de livraison</label>
                  <input type="text" value={entreeForm.motif}
                    onChange={e => setEntreeForm({ ...entreeForm, motif: e.target.value })}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm outline-none focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] transition"
                    placeholder="BL-2026-042, livraison hebdo..." />
                </div>
              </div>
              <button onClick={handleEntreeStock} disabled={saving || !entreeForm.fournisseurId}
                className="flex items-center gap-2 rounded-xl bg-[#FF8C00] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#E07A00] disabled:opacity-60">
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Enregistrement...' : 'Enregistrer la réception'}
              </button>
            </>
          ) : stockTab === 'ajustement' ? (
            <>
              <p className="text-xs text-slate-500 mb-4">
                Correction manuelle de stock (casse, inventaire, erreur) — sans lien fournisseur
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#475569]">Article</label>
                  <select value={adjustmentForm.articleId}
                    onChange={e => setAdjustmentForm({ ...adjustmentForm, articleId: e.target.value })}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm outline-none focus:border-[#FF8C00] focus:ring-1 transition">
                    <option value="">Sélectionner un article</option>
                    {stocks.map(item => <option key={item.id} value={item.id}>{item.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#475569]">Quantité (+/-)</label>
                  <input type="number" value={adjustmentForm.quantity}
                    onChange={e => setAdjustmentForm({ ...adjustmentForm, quantity: e.target.value })}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm outline-none focus:border-[#FF8C00] focus:ring-1 transition"
                    placeholder="Ex: -2 (casse)" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#475569]">Motif</label>
                  <input type="text" value={adjustmentForm.motif}
                    onChange={e => setAdjustmentForm({ ...adjustmentForm, motif: e.target.value })}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm outline-none focus:border-[#FF8C00] focus:ring-1 transition"
                    placeholder="Casse, correction inventaire..." />
                </div>
              </div>
              <button onClick={handleAdjustStock} disabled={saving}
                className="mt-4 flex items-center gap-2 rounded-xl bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:opacity-60">
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                {saving ? 'Enregistrement...' : 'Ajuster'}
              </button>
            </>
          ) : stockTab === 'rapport' ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-emerald-800">Rapport d'écarts inventaire</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">Saisissez le stock réel compté — l'écart est calculé automatiquement</p>
                </div>
                <button onClick={exportRapportCSV} disabled={rapportItems.length === 0}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition">
                  <FileText className="w-3.5 h-3.5" /> Export CSV (Excel)
                </button>
              </div>
              {rapportLoading ? (
                <div className="flex justify-center py-8"><div className="h-8 w-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" /></div>
              ) : rapportItems.length === 0 ? (
                <p className="text-center text-sm text-[#6B7280] py-8">Aucun article trouvé</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                        <th className="text-left pb-2 pr-4">Article</th>
                        <th className="text-left pb-2 pr-4">Catégorie</th>
                        <th className="text-right pb-2 pr-4">Théorique</th>
                        <th className="text-right pb-2 pr-4">Réel (comptage)</th>
                        <th className="text-right pb-2">Écart</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F4F6F8]">
                      {rapportItems.map((r, idx) => {
                        const reel = r.stockReel !== '' ? Number(r.stockReel) : null;
                        const ecart = reel !== null ? reel - r.stockTheorique : null;
                        return (
                          <tr key={r.id} className="hover:bg-[#F8FAFC]">
                            <td className="py-2.5 pr-4 font-medium text-[#0F172A]">{r.nom}</td>
                            <td className="py-2.5 pr-4 text-[#64748B]">{r.categorie}</td>
                            <td className="py-2.5 pr-4 text-right font-semibold text-[#0F172A]">{r.stockTheorique}</td>
                            <td className="py-2.5 pr-4 text-right">
                              <input type="number" min="0" value={r.stockReel}
                                onChange={e => setRapportItems(prev => prev.map((x, i) => i === idx ? { ...x, stockReel: e.target.value } : x))}
                                placeholder="—"
                                className="w-20 rounded-lg border border-[#E2E8F0] px-2 py-1 text-right text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400" />
                            </td>
                            <td className={`py-2.5 text-right font-bold ${ecart === null ? 'text-[#6B7280]' : ecart === 0 ? 'text-emerald-600' : ecart > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              {ecart === null ? '—' : ecart > 0 ? `+${ecart}` : ecart}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : stockTab === 'bon' ? (
            <>
              <p className="text-xs text-[#6B7280] mb-4">Générez un bon de commande PDF à envoyer à votre fournisseur</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#475569]">Fournisseur <span className="text-red-500">*</span></label>
                  <select value={bonForm.fournisseurId} onChange={e => setBonForm(p => ({ ...p, fournisseurId: e.target.value }))}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 transition">
                    <option value="">Sélectionner…</option>
                    {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#475569]">Date de livraison souhaitée</label>
                  <input type="date" value={bonForm.dateLivraison} onChange={e => setBonForm(p => ({ ...p, dateLivraison: e.target.value }))}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-1 transition" />
                </div>
              </div>

              <p className="text-xs font-semibold text-[#475569] mb-2">Lignes de commande</p>
              <div className="space-y-2 mb-3">
                {bonForm.lignes.map((l, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input type="text" placeholder="Article / désignation" value={l.article}
                      onChange={e => setBonForm(p => { const ls=[...p.lignes]; ls[idx]={...ls[idx],article:e.target.value}; return {...p,lignes:ls}; })}
                      className="flex-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-1 transition" />
                    <input type="number" min="1" placeholder="Qté" value={l.quantite}
                      onChange={e => setBonForm(p => { const ls=[...p.lignes]; ls[idx]={...ls[idx],quantite:e.target.value}; return {...p,lignes:ls}; })}
                      className="w-20 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-1 transition" />
                    <input type="number" min="0" placeholder="Prix unit." value={l.prixUnit}
                      onChange={e => setBonForm(p => { const ls=[...p.lignes]; ls[idx]={...ls[idx],prixUnit:e.target.value}; return {...p,lignes:ls}; })}
                      className="w-28 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-1 transition" />
                    <button type="button" onClick={() => setBonForm(p => ({ ...p, lignes: p.lignes.filter((_,i)=>i!==idx) }))}
                      className="text-red-400 hover:text-red-600 text-lg font-bold px-1">×</button>
                  </div>
                ))}
                <button type="button" onClick={() => setBonForm(p => ({ ...p, lignes: [...p.lignes, { article:'', quantite:'', prixUnit:'' }] }))}
                  className="text-xs font-semibold text-violet-700 border border-violet-300 rounded-xl px-3 py-1.5 hover:bg-violet-50 transition">
                  + Ajouter une ligne
                </button>
              </div>

              <button onClick={generateBonCommande}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700">
                <Printer className="w-4 h-4" /> Générer le PDF
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ Module Finance — Trésorerie ══════════════════ */
const EXPENSE_CATS = [
  { value: 'loyer',        label: 'Loyer',          color: '#8B5CF6' },
  { value: 'salaires',     label: 'Salaires',       color: '#F59E0B' },
  { value: 'charges',      label: 'Charges sociales',color:'#EC4899' },
  { value: 'fournitures',  label: 'Fournitures',    color: '#10B981' },
  { value: 'electricite',  label: 'Électricité',    color: '#FF8C00' },
  { value: 'eau',          label: 'Eau',            color: '#0EA5E9' },
  { value: 'maintenance',  label: 'Maintenance',    color: '#64748B' },
  { value: 'marketing',    label: 'Marketing',      color: '#FF8C00' },
  { value: 'autre',        label: 'Autre',          color: '#334155' },
];

function FinanceTab({ restaurantId }) {
  const [kpiData, setKpiData]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [period, setPeriod]     = useState('day');
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState({ msg: '', ok: true });
  const [expenses, setExpenses] = useState([]);
  const [expenseForm, setExpenseForm] = useState({ categorie: '', montant: '', description: '' });
  const [budget, setBudget]     = useState({ plafond: '', alerte80: true, alerte100: true, saving: false });
  const [dlState, setDlState]   = useState({});
  const donutRef = useRef(null);
  const donutChart = useRef(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg: '', ok: true }), 3000); };

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const r = await tresorerieAPI.getStats(period);
      setKpiData(r.data);
    } catch {
      setKpiData({ caJour: 0, caSemaine: 0, caMois: 0, nbCommandes: 0, ticketMoyen: 0, margesBrutes: 0 });
    } finally { setLoading(false); }
  }, [restaurantId, period]);

  useEffect(() => { loadData(); }, [loadData]);

  /* Donut paiements */
  useEffect(() => {
    if (!donutRef.current || !kpiData) return;
    donutChart.current?.destroy();
    const ca = kpiData.caJour || kpiData.caMois || 100000;
    donutChart.current = new Chart(donutRef.current, {
      type: 'doughnut',
      data: {
        labels: ['Mobile Money', 'Carte bancaire', 'Espèces'],
        datasets: [{ data: [Math.round(ca * 0.55), Math.round(ca * 0.25), Math.round(ca * 0.20)], backgroundColor: ['#FF8C00', '#0F172A', '#9CA3AF'], borderWidth: 0, hoverOffset: 4 }],
      },
      options: {
        cutout: '72%', responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 10, color: '#475569' } },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${Number(ctx.raw).toLocaleString()} F CFA` } },
        },
      },
    });
    return () => donutChart.current?.destroy();
  }, [kpiData]);

  const handleRecordExpense = async () => {
    if (!expenseForm.categorie) { showToast('Catégorie obligatoire (RG-27)', false); return; }
    const m = parseFloat(expenseForm.montant);
    if (!m || m <= 0) { showToast('Montant strictement positif requis (RG-27)', false); return; }
    setSaving(true);
    try {
      await tresorerieAPI.recordExpense({ categorie: expenseForm.categorie, montant: m, description: expenseForm.description, date: new Date().toISOString() });
      const cat = EXPENSE_CATS.find(c => c.value === expenseForm.categorie);
      setExpenses(prev => [{ id: Date.now(), categorie: expenseForm.categorie, label: cat?.label || expenseForm.categorie, montant: m, description: expenseForm.description, date: new Date() }, ...prev].slice(0, 20));
      setExpenseForm({ categorie: '', montant: '', description: '' });
      showToast('Dépense enregistrée');
    } catch { showToast("Erreur lors de l'enregistrement", false); }
    finally { setSaving(false); }
  };

  const handleSaveBudget = async () => {
    if (!budget.plafond) { showToast('Plafond mensuel requis', false); return; }
    setBudget(b => ({ ...b, saving: true }));
    try {
      await tresorerieAPI.configureBudgetAlerts({ plafondMensuel: parseFloat(budget.plafond), alerte80: budget.alerte80, alerte100: budget.alerte100 });
      showToast('Budget configuré (RG-30)');
    } catch { showToast('Erreur configuration budget', false); }
    finally { setBudget(b => ({ ...b, saving: false })); }
  };

  const downloadSyscohada = async (p) => {
    setDlState(s => ({ ...s, [p]: true }));
    try {
      const r    = await tresorerieAPI.exportSyscohada(p);
      const blob = new Blob([r.data], { type: 'text/csv;charset=utf-8;' });
      downloadAndOpenBlob(blob, `SYSCOHADA-${p}-${new Date().toISOString().slice(0,10)}.csv`);
    } catch { showToast('Erreur export SYSCOHADA', false); }
    finally { setDlState(s => ({ ...s, [p]: false })); }
  };

  const downloadReport = async (rp) => {
    setDlState(s => ({ ...s, [`rp_${rp}`]: true }));
    try {
      const r = await tresorerieAPI.generateReport(rp);
      const report = r.data || {};
      // Utilise le générateur jsPDF SYSCOHADA au lieu du PDF texte brut
      const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const rName = cachedUser?.restaurant?.nom || '';
      const blob = buildFinanceReportBlob(rp, rName, report.summary || {}, expenses);
      downloadAndOpenBlob(blob, `rapport-${rp}-${new Date().toISOString().slice(0,10)}.pdf`);
    } catch { showToast('Erreur génération rapport', false); }
    finally { setDlState(s => ({ ...s, [`rp_${rp}`]: false })); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="h-9 w-9 rounded-full border-4 border-[#FF8C00] border-t-transparent animate-spin" />
      </div>
    );
  }

  const caValue    = period === 'day' ? kpiData.caJour : period === 'week' ? kpiData.caSemaine : kpiData.caMois;
  const caLabel    = period === 'day' ? "CA aujourd'hui" : period === 'week' ? 'CA cette semaine' : 'CA ce mois';
  const plafond    = parseFloat(budget.plafond) || 0;
  const depTotal   = expenses.reduce((s, e) => s + e.montant, 0);
  const budgetPct  = plafond > 0 ? Math.min(Math.round((depTotal / plafond) * 100), 100) : 0;
  const budgetAlert = budgetPct >= 100 ? 'rouge' : budgetPct >= 80 ? 'orange' : 'vert';

  return (
    <div className="space-y-5">
      {toast.msg && (
        <div className={`fixed bottom-4 right-4 z-50 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-xl ${toast.ok ? 'bg-[#059669]' : 'bg-red-600'}`}>{toast.msg}</div>
      )}

      {/* ── Header + period ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-[#0F172A]">Trésorerie & Finances</h3>
          <p className="text-xs text-[#6B7280] mt-0.5">CA, dépenses, budget, exports SYSCOHADA — US-26, US-27, US-28, RG-27, RG-29</p>
        </div>
        <div className="flex p-1 bg-[#F4F6F8] rounded-2xl gap-1">
          {[{ v: 'day', l: "Aujourd'hui" }, { v: 'week', l: 'Semaine' }, { v: 'month', l: 'Mois' }].map(p => (
            <button key={p.v} onClick={() => setPeriod(p.v)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${period === p.v ? 'bg-white text-[#FF8C00] shadow-sm' : 'text-[#6B7280] hover:text-[#FF8C00]'}`}>
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-2xl p-5 shadow-sm col-span-2 xl:col-span-1" style={{ background: '#0F172A' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-1">{caLabel}</p>
          <p className="text-2xl font-extrabold text-white leading-none">{formatFCFA(caValue)}</p>
          <p className="text-xs text-white/30 mt-2">Chiffre d'affaires — US-26</p>
        </div>
        {[
          { label: 'Commandes', value: kpiData.nbCommandes, sub: 'période sélectionnée', icon: ShoppingBag, bg: '#FFF0DF', color: '#FF8C00' },
          { label: 'Ticket moyen', value: formatFCFA(kpiData.ticketMoyen), sub: 'par commande', icon: CreditCard, bg: '#F0FDF4', color: '#16A34A' },
          { label: 'Marge brute', value: (kpiData.margesBrutes || 0) + '%', sub: '(PV−Coût)/PV — RG-28', icon: PieChart, bg: '#EFF6FF', color: '#2563EB' },
        ].map(({ label, value, sub, icon: Icon, bg, color }) => (
          <div key={label} className="rounded-2xl bg-white border border-[#E2E8F0] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{label}</p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-[#0F172A] leading-none">{value}</p>
            <p className="text-[10px] text-[#6B7280] mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Row 2 : Paiements + Budget ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Répartition paiements */}
        <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-[#FFF0DF] flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5 text-[#FF8C00]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#0F172A]">Répartition modes de paiement</h4>
              <p className="text-[10px] text-[#6B7280]">Mobile Money · Carte · Espèces — US-15</p>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <div style={{ height: 160, flex: 1, maxWidth: 160 }}>
              <canvas ref={donutRef} />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              {[
                { label: 'Mobile Money', pct: 55, color: '#FF8C00', note: 'Orange · MTN · Wave' },
                { label: 'Carte bancaire', pct: 25, color: '#0F172A', note: 'Visa · Mastercard' },
                { label: 'Espèces', pct: 20, color: '#9CA3AF', note: 'Caisse physique' },
              ].map(({ label, pct, color, note }) => (
                <div key={label}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-xs font-semibold text-[#0F172A]">{label}</span>
                    <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: pct + '%', background: color }} />
                  </div>
                  <p className="text-[10px] text-[#6B7280] mt-0.5">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Budget & Alertes RG-30 */}
        <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[#FFF0DF] flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5 text-[#FF8C00]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#0F172A]">Plafond budgétaire</h4>
              <p className="text-[10px] text-[#6B7280]">Alertes automatiques à 80% et 100% — RG-30</p>
            </div>
          </div>

          {/* Config plafond */}
          <div className="flex gap-2 mb-4">
            <input type="number" min="0" value={budget.plafond} onChange={e => setBudget(b => ({ ...b, plafond: e.target.value }))}
              className="flex-1 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] transition"
              placeholder="Plafond mensuel (FCFA)" />
            <button onClick={handleSaveBudget} disabled={budget.saving}
              className="rounded-xl bg-[#FF8C00] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#E07A00] disabled:opacity-60">
              {budget.saving ? '…' : 'Définir'}
            </button>
          </div>

          {/* Barre de progression */}
          {plafond > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-[#475569]">Dépenses ce mois</span>
                <span className={`font-bold ${budgetAlert === 'rouge' ? 'text-red-600' : budgetAlert === 'orange' ? 'text-orange-500' : 'text-emerald-600'}`}>{budgetPct}%</span>
              </div>
              <div className="relative h-3 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: budgetPct + '%', background: budgetAlert === 'rouge' ? '#DC2626' : budgetAlert === 'orange' ? '#FF8C00' : '#059669' }} />
                {/* Markers */}
                <div className="absolute top-0 h-full w-0.5 bg-orange-400" style={{ left: '80%' }} title="80%" />
                <div className="absolute top-0 h-full w-0.5 bg-red-600" style={{ left: '100%' }} title="100%" />
              </div>
              <div className="flex justify-between text-[10px] text-[#6B7280] mt-1">
                <span>{formatFCFA(depTotal)} dépensés</span>
                <span>{formatFCFA(plafond)} plafond</span>
              </div>
              {budgetAlert !== 'vert' && (
                <div className={`mt-2 rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-2 ${budgetAlert === 'rouge' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'}`}>
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {budgetAlert === 'rouge' ? 'Plafond atteint ! Dépenses bloquées.' : 'Attention : 80% du plafond atteint.'}
                </div>
              )}
            </div>
          )}

          {/* Checkboxes alertes */}
          <div className="flex gap-4">
            {[{ key: 'alerte80', label: 'Alerte 80%', color: '#FF8C00' }, { key: 'alerte100', label: 'Alerte 100%', color: '#DC2626' }].map(({ key, label, color }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={budget[key]} onChange={e => setBudget(b => ({ ...b, [key]: e.target.checked }))}
                  className="h-4 w-4 rounded" style={{ accentColor: color }} />
                <span className="text-xs font-semibold" style={{ color }}>{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 3 : Dépenses + Exports ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">

        {/* Saisie dépenses + liste */}
        <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[#FFF0DF] flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5 text-[#FF8C00]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#0F172A]">Saisir une dépense opérationnelle</h4>
              <p className="text-[10px] text-[#6B7280]">Catégorie obligatoire · montant {'>'} 0 — US-28, RG-27</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#475569]">Catégorie *</label>
              <select value={expenseForm.categorie} onChange={e => setExpenseForm(f => ({ ...f, categorie: e.target.value }))}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] transition">
                <option value="">Catégorie…</option>
                {EXPENSE_CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#475569]">Montant (FCFA) *</label>
              <input type="number" min="1" value={expenseForm.montant} onChange={e => setExpenseForm(f => ({ ...f, montant: e.target.value }))}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] transition"
                placeholder="Ex: 50 000" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#475569]">Description</label>
              <input type="text" value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] transition"
                placeholder="Optionnel" />
            </div>
          </div>
          <button onClick={handleRecordExpense} disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[#FF8C00] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#E07A00] disabled:opacity-60 mb-5">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>

          {/* Liste dépenses session */}
          {expenses.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[#475569] uppercase tracking-wide mb-2">Dépenses saisies cette session</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {expenses.map(exp => {
                  const cat = EXPENSE_CATS.find(c => c.value === exp.categorie);
                  return (
                    <div key={exp.id} className="flex items-center justify-between rounded-xl bg-[#F8FAFC] px-3 py-2 border border-[#F1F5F9]">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat?.color || '#64748B' }} />
                        <span className="text-xs font-semibold text-[#334155]">{cat?.label || exp.categorie}</span>
                        {exp.description && <span className="text-[10px] text-[#6B7280]">— {exp.description}</span>}
                      </div>
                      <span className="text-xs font-bold text-[#FF8C00] flex-shrink-0">{formatFCFA(exp.montant)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-xs font-bold border-t border-[#F1F5F9] pt-2">
                <span className="text-[#475569]">Total session</span>
                <span className="text-[#FF8C00]">{formatFCFA(depTotal)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Exports financiers */}
        <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
              <Download className="w-3.5 h-3.5 text-[#4F46E5]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#0F172A]">Exports financiers</h4>
              <p className="text-[10px] text-[#6B7280]">SYSCOHADA · Rapports — RG-29</p>
            </div>
          </div>

          {/* SYSCOHADA */}
          <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide mb-2">Export SYSCOHADA (RG-29)</p>
          <div className="space-y-2 mb-4">
            {[
              { period: 'monthly',   label: 'Mensuel',      color: '#FF8C00' },
              { period: 'quarterly', label: 'Trimestriel',  color: '#0F172A' },
              { period: 'yearly',    label: 'Annuel',       color: '#059669' },
            ].map(({ period: p, label, color }) => (
              <button key={p} onClick={() => downloadSyscohada(p)} disabled={dlState[p]}
                className="w-full flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
                style={{ background: color }}>
                <Download className="w-3.5 h-3.5 flex-shrink-0" />
                {dlState[p] ? 'Génération…' : `CSV SYSCOHADA — ${label}`}
              </button>
            ))}
          </div>

          {/* Rapports PDF */}
          <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide mb-2">Rapports PDF</p>
          <div className="space-y-2">
            {[
              { rp: 'monthly',   label: 'Rapport mensuel' },
              { rp: 'quarterly', label: 'Rapport trimestriel' },
              { rp: 'yearly',    label: 'Rapport annuel' },
            ].map(({ rp, label }) => (
              <button key={rp} onClick={() => downloadReport(rp)} disabled={dlState[`rp_${rp}`]}
                className="w-full flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-xs font-semibold text-[#334155] transition hover:border-[#FF8C00] hover:text-[#FF8C00] disabled:opacity-60">
                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                {dlState[`rp_${rp}`] ? 'Génération…' : label}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
            <p className="text-[10px] text-amber-800 font-semibold leading-relaxed">
              Les exports SYSCOHADA sont au format CSV UTF-8 (BOM) compatibles avec Sage, Ciel et les logiciels comptables ivoiriens. Rétention légale : 10 ans (OHADA).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ Module Promotions ══════════════════ */
const PROMO_TYPES = [
  { value: 'PERCENT', label: '% de réduction',   color: '#FF8C00', bg: '#FFF0DF' },
  { value: 'FIXED',   label: 'Montant fixe (FCFA)', color: '#0F172A', bg: '#F1F5F9' },
];

const VISIBILITE_OPTIONS = [
  { value: 'TOUS',      label: 'Tout le monde',      desc: 'Visible par tous les clients',            color: '#059669', bg: '#F0FDF4' },
  { value: 'CONNECTES', label: 'Clients connectés',  desc: 'Uniquement les utilisateurs connectés',   color: '#2563EB', bg: '#EFF6FF' },
  { value: 'NOUVEAUX',  label: 'Nouveaux clients',   desc: 'Clients sans commande passée',            color: '#7C3AED', bg: '#F5F3FF' },
];

const emptyForm = {
  code: '', type: 'PERCENT', valeur: '', description: '',
  minMontant: '', maxUses: '', expiresAt: '', actif: true, visibilite: 'TOUS',
};

function PromosTab({ restaurantId }) {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | promo object
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: '', ok: true });
  const [copied, setCopied] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: '', ok: true }), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await promosAPI.getAll();
      setPromos(r.data || []);
    } catch { setPromos([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(emptyForm); setModal('create'); };
  const openEdit = (p) => {
    setForm({
      code: p.code,
      type: p.type,
      valeur: String(p.valeur),
      description: p.description || '',
      minMontant: p.minMontant ? String(p.minMontant) : '',
      maxUses: p.maxUses != null ? String(p.maxUses) : '',
      expiresAt: p.expiresAt ? p.expiresAt.slice(0, 10) : '',
      actif: p.actif,
      visibilite: p.visibilite || 'TOUS',
    });
    setModal(p);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { showToast('Code obligatoire', false); return; }
    if (!form.valeur || parseFloat(form.valeur) <= 0) { showToast('Valeur > 0 obligatoire', false); return; }
    setSaving(true);
    const payload = {
      code: form.code.toUpperCase().replace(/\s+/g, ''),
      type: form.type,
      valeur: parseFloat(form.valeur),
      description: form.description || undefined,
      minMontant: form.minMontant ? parseFloat(form.minMontant) : 0,
      maxUses: form.maxUses ? parseInt(form.maxUses) : null,
      expiresAt: form.expiresAt || null,
      actif: form.actif,
      visibilite: form.visibilite || 'TOUS',
    };
    try {
      if (modal === 'create') {
        await promosAPI.create(payload);
        showToast('Code promo créé !');
      } else {
        await promosAPI.update(modal.id, payload);
        showToast('Code promo mis à jour !');
      }
      setModal(null);
      load();
    } catch (e) {
      showToast(e?.response?.data?.message || 'Erreur lors de la sauvegarde', false);
    } finally { setSaving(false); }
  };

  const handleToggle = async (p) => {
    try {
      await promosAPI.toggle(p.id);
      setPromos(prev => prev.map(x => x.id === p.id ? { ...x, actif: !x.actif } : x));
    } catch { showToast('Erreur activation', false); }
  };

  const handleDelete = async (p) => {
    if (!confirm(`Supprimer le code « ${p.code} » ?`)) return;
    try {
      await promosAPI.remove(p.id);
      setPromos(prev => prev.filter(x => x.id !== p.id));
      showToast('Code supprimé');
    } catch { showToast('Erreur suppression', false); }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const now = new Date();
  const totalUses = promos.reduce((s, p) => s + (p.usedCount || 0), 0);
  const actifCount = promos.filter(p => p.actif).length;

  const isExpired = (p) => p.expiresAt && new Date(p.expiresAt) < now;
  const statusOf = (p) => {
    if (!p.actif) return { label: 'Inactif', color: '#9CA3AF', bg: '#F1F5F9', banner: false };
    if (isExpired(p)) return { label: 'Expiré', color: '#DC2626', bg: '#FEF2F2', banner: false };
    if (p.maxUses != null && p.usedCount >= p.maxUses) return { label: 'Épuisé', color: '#FF8C00', bg: '#FFF7ED', banner: false };
    return { label: 'Actif ⚡', color: '#059669', bg: '#F0FDF4', banner: true };
  };

  return (
    <div className="space-y-5">
      {toast.msg && (
        <div className={`fixed bottom-4 right-4 z-50 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-xl ${toast.ok ? 'bg-[#059669]' : 'bg-red-600'}`}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-[#0F172A] flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#FF8C00]" /> Codes promos & Réductions
          </h3>
          <p className="text-xs text-[#6B7280] mt-0.5">Créez des codes à partager avec vos clients · Les prix promo s'activent directement sur chaque article du menu</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-2xl bg-[#FF8C00] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#E07A00] transition">
          <Plus className="w-4 h-4" /> Nouveau code promo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Codes créés', value: promos.length, icon: Tag, bg: '#FFF0DF', color: '#FF8C00' },
          { label: 'Codes actifs', value: actifCount, icon: CheckCircle, bg: '#F0FDF4', color: '#059669' },
          { label: 'Total utilisations', value: totalUses, icon: TrendingUp, bg: '#EFF6FF', color: '#2563EB' },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="rounded-2xl bg-white border border-[#E2E8F0] px-4 py-4 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-extrabold text-[#0F172A] leading-none">{value}</p>
              <p className="text-[10px] text-[#6B7280] mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-[#FF8C00] border-t-transparent animate-spin" />
          </div>
        ) : promos.length === 0 ? (
          <div className="text-center py-14">
            <Tag className="w-10 h-10 text-[#E2E8F0] mx-auto mb-3" />
            <p className="font-semibold text-[#334155]">Aucun code promo</p>
            <p className="text-xs text-[#6B7280] mt-1">Créez votre premier code et partagez-le avec vos clients</p>
            <button onClick={openCreate} className="mt-4 rounded-xl bg-[#FF8C00] px-4 py-2 text-xs font-bold text-white hover:bg-[#E07A00] transition">
              + Créer un code
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>
                  {['Code', 'Type', 'Réduction', 'Min commande', 'Utilisations', 'Expire le', 'Visibilité', 'Statut', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-[#64748B] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {promos.map(p => {
                  const st = statusOf(p);
                  const typeInfo = PROMO_TYPES.find(t => t.value === p.type);
                  return (
                    <tr key={p.id} className="hover:bg-[#FAFAFA] transition">
                      {/* Code */}
                      <td className="px-4 py-3">
                        <button onClick={() => copyCode(p.code)}
                          className="flex items-center gap-1.5 rounded-lg bg-[#F1F5F9] px-2.5 py-1 font-mono text-xs font-bold text-[#0F172A] hover:bg-[#E2E8F0] transition">
                          {p.code}
                          <Copy className="w-3 h-3 text-[#64748B]" />
                          {copied === p.code && <span className="text-[#059669] font-normal">Copié !</span>}
                        </button>
                      </td>
                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: typeInfo?.bg, color: typeInfo?.color }}>
                          {typeInfo?.label}
                        </span>
                      </td>
                      {/* Valeur */}
                      <td className="px-4 py-3">
                        <span className="font-bold text-[#FF8C00]">
                          {p.type === 'PERCENT' ? `-${p.valeur}%` : `-${Number(p.valeur).toLocaleString('fr-FR')} FCFA`}
                        </span>
                      </td>
                      {/* Min montant */}
                      <td className="px-4 py-3 text-[#475569]">
                        {p.minMontant > 0 ? `${Number(p.minMontant).toLocaleString('fr-FR')} FCFA` : <span className="text-[#9CA3AF]">Aucun</span>}
                      </td>
                      {/* Utilisations */}
                      <td className="px-4 py-3 text-[#475569]">
                        {p.usedCount}{p.maxUses != null ? ` / ${p.maxUses}` : ''}
                      </td>
                      {/* Expire */}
                      <td className="px-4 py-3 text-[#475569] whitespace-nowrap">
                        {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString('fr-FR') : <span className="text-[#9CA3AF]">Illimitée</span>}
                      </td>
                      {/* Visibilité */}
                      <td className="px-4 py-3">
                        {(() => {
                          const opt = VISIBILITE_OPTIONS.find(o => o.value === (p.visibilite || 'TOUS')) || VISIBILITE_OPTIONS[0];
                          return (
                            <span className="rounded-full px-2.5 py-1 text-[10px] font-bold whitespace-nowrap" style={{ background: opt.bg, color: opt.color }}>
                              {opt.label}
                            </span>
                          );
                        })()}
                      </td>
                      {/* Statut */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                          {st.banner && (
                            <span className="rounded-full px-2 py-0.5 text-[9px] font-bold bg-[#0F172A] text-[#E07A2D]">Visible dans menu</span>
                          )}
                        </div>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleToggle(p)} title={p.actif ? 'Désactiver' : 'Activer'}
                            className="p-1.5 rounded-lg hover:bg-[#F1F5F9] transition">
                            {p.actif
                              ? <ToggleRight className="w-4 h-4 text-[#059669]" />
                              : <ToggleLeft className="w-4 h-4 text-[#9CA3AF]" />}
                          </button>
                          <button onClick={() => openEdit(p)} title="Modifier"
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(p)} title="Supprimer"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 flex gap-3">
        <div className="w-8 h-8 rounded-xl bg-[#FFF0DF] flex items-center justify-center flex-shrink-0">
          <Percent className="w-4 h-4 text-[#FF8C00]" />
        </div>
        <div>
          <p className="text-sm font-bold text-[#0F172A]">Comment ça marche ?</p>
          <ul className="mt-1 text-xs text-[#64748B] space-y-0.5 list-disc ml-4">
            <li><strong>Code promo</strong> : le client saisit le code au checkout — la réduction est déduite automatiquement du total.</li>
            <li><strong>Prix promo sur un article</strong> : activez un « Prix promo » directement sur l'article depuis l'onglet Menu — le badge PROMO s'affiche sur la carte.</li>
            <li>Les codes à durée limitée expirent automatiquement à la date choisie.</li>
            <li>Les codes épuisés (max utilisations atteint) sont bloqués automatiquement.</li>
          </ul>
        </div>
      </div>

      {/* Modal créer/modifier */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-[#FF8C00] px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-extrabold flex items-center gap-2">
                <Tag className="w-4 h-4" /> {modal === 'create' ? 'Nouveau code promo' : `Modifier "${modal.code}"`}
              </h3>
              <button onClick={() => setModal(null)} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">

              {/* Code */}
              <div>
                <label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Code *</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                  placeholder="Ex: RESTO10, BIENVENUE, NOEL2025"
                  maxLength={30}
                  className="mt-1 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 font-mono font-bold text-sm text-[#0F172A] uppercase tracking-widest focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] outline-none transition" />
              </div>

              {/* Type */}
              <div>
                <label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Type de réduction *</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {PROMO_TYPES.map(t => (
                    <button key={t.value} onClick={() => setForm(f => ({ ...f, type: t.value }))}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition text-center ${form.type === t.value ? 'border-[#FF8C00] bg-[#FFF0DF] text-[#FF8C00]' : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] hover:border-[#FF8C00]'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Valeur */}
              <div>
                <label className="text-xs font-bold text-[#475569] uppercase tracking-wide">
                  {form.type === 'PERCENT' ? 'Pourcentage (%) *' : 'Montant (FCFA) *'}
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input type="number" min="0" value={form.valeur} onChange={e => setForm(f => ({ ...f, valeur: e.target.value }))}
                    placeholder={form.type === 'PERCENT' ? 'Ex: 10' : 'Ex: 5000'}
                    className="flex-1 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0F172A] focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] outline-none transition" />
                  <span className="text-sm font-bold text-[#64748B]">{form.type === 'PERCENT' ? '%' : 'FCFA'}</span>
                </div>
              </div>

              {/* Titre du bandeau — visible par les clients */}
              <div>
                <label className="text-xs font-bold text-[#475569] uppercase tracking-wide">
                  ⚡ Titre du bandeau (visible par vos clients)
                </label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Ex: Livraison offerte ce weekend, -20% sur tous les plats…"
                  className="mt-1 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0F172A] focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] outline-none transition" />
                <p className="mt-1 text-[10px] text-[#9CA3AF]">Ce texte s'affiche comme titre du bandeau ⚡ Offre Limitée dans votre menu client</p>
              </div>

              {/* Aperçu bandeau */}
              {(form.description || form.code || form.valeur) && (
                <div className="rounded-xl overflow-hidden border border-[#E2E8F0]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] px-3 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    Aperçu bandeau client
                  </p>
                  <div className="p-3 bg-[#0F172A] flex gap-3 items-center">
                    <div className="flex-1 min-w-0">
                      <span className="inline-block bg-red-500 text-white text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded mb-1.5">⚡ OFFRE LIMITÉE</span>
                      <p className="text-white font-bold text-sm leading-tight truncate">
                        {form.description || (form.type === 'PERCENT' ? `${form.valeur || 'X'}% de réduction` : `${Number(form.valeur || 0).toLocaleString('fr-FR')} FCFA de remise`)}
                      </p>
                      {form.minMontant > 0 && <p className="text-white/50 text-[10px] mt-0.5">Dès {Number(form.minMontant).toLocaleString('fr-FR')} FCFA d'achat</p>}
                    </div>
                    <div className="bg-[#FF8C00]/20 border border-[#FF8C00]/30 rounded-lg px-3 py-2 text-center flex-shrink-0">
                      <p className="text-[#E07A2D] font-black text-base leading-none">
                        {form.type === 'PERCENT' ? `-${form.valeur || 'X'}%` : `-${Number(form.valeur || 0).toLocaleString('fr-FR')}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Min montant + max uses */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Montant min (FCFA)</label>
                  <input type="number" min="0" value={form.minMontant} onChange={e => setForm(f => ({ ...f, minMontant: e.target.value }))}
                    placeholder="0 = aucun"
                    className="mt-1 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0F172A] focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] outline-none transition" />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Max utilisations</label>
                  <input type="number" min="1" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                    placeholder="Illimité"
                    className="mt-1 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0F172A] focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] outline-none transition" />
                </div>
              </div>

              {/* Expiration */}
              <div>
                <label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Date d'expiration</label>
                <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                  min={new Date().toISOString().slice(0, 10)}
                  className="mt-1 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0F172A] focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] outline-none transition" />
                <p className="mt-1 text-[10px] text-[#9CA3AF]">Laissez vide pour un code sans expiration</p>
              </div>

              {/* Actif */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.actif} onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))}
                  className="h-4 w-4 rounded" style={{ accentColor: '#FF8C00' }} />
                <span className="text-sm font-semibold text-[#0F172A]">Code actif dès la création</span>
              </label>

              {/* Visibilité */}
              <div>
                <label className="text-xs font-bold text-[#475569] uppercase tracking-wide">Qui peut voir ce code ?</label>
                <div className="mt-1.5 flex flex-col gap-2">
                  {VISIBILITE_OPTIONS.map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm(f => ({ ...f, visibilite: opt.value }))}
                      className={`rounded-xl border px-3 py-2.5 text-left transition flex items-start gap-3 ${form.visibilite === opt.value ? 'border-[#FF8C00] bg-[#FFF0DF]' : 'border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#FF8C00]'}`}>
                      <div className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0" style={{ background: opt.color, boxShadow: form.visibilite === opt.value ? `0 0 0 3px ${opt.color}22` : 'none' }} />
                      <div>
                        <p className="text-xs font-bold" style={{ color: form.visibilite === opt.value ? '#FF8C00' : '#0F172A' }}>{opt.label}</p>
                        <p className="text-[10px] text-[#64748B] mt-0.5">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleSave} disabled={saving}
                className="w-full rounded-xl bg-[#FF8C00] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#E07A00] disabled:opacity-60 transition flex items-center justify-center gap-2">
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {saving ? 'Enregistrement…' : modal === 'create' ? 'Créer le code' : 'Enregistrer les modifications'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════ Module Paramètres — Équipe et configuration ══════════════════ */
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
  const [uploadingLogo, setUploadingLogo] = useState(false);
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

  /* ── QR Codes tables ── */
  const [nbTables, setNbTables] = useState(10);
  const [tableQrCodes, setTableQrCodes] = useState([]);
  const [tableQrLoading, setTableQrLoading] = useState(false);

  /* ── Sidebar active section tracking ── */
  const [activeSection, setActiveSection] = useState('sec-profil');

  const handleGenerateTableQR = async () => {
    setTableQrLoading(true);
    try {
      const origin = window.location.origin;
      const codes = await Promise.all(
        Array.from({ length: nbTables }, (_, i) => i + 1).map(async (n) => {
          const url = `${origin}/menu?restaurant=${restaurantId}&table=${n}`;
          const dataUrl = await QRCode.toDataURL(url, {
            width: 220, margin: 1,
            color: { dark: '#1A0C00', light: '#FFF9F3' },
          });
          return { table: n, dataUrl, url };
        })
      );
      setTableQrCodes(codes);
    } catch (e) {
      console.error('QR gen error', e);
    } finally {
      setTableQrLoading(false);
    }
  };

  const handlePrintTableQR = () => {
    const rows = tableQrCodes.map(({ table, dataUrl }) =>
      `<div style="display:inline-flex;flex-direction:column;align-items:center;margin:16px;page-break-inside:avoid;border:1px solid #eee;border-radius:12px;padding:16px;background:#fffaf3">
        <img src="${dataUrl}" style="width:180px;height:180px"/>
        <p style="font-family:sans-serif;font-weight:900;font-size:18px;margin:10px 0 2px;color:#1a0c00">Table ${table}</p>
        <p style="font-family:sans-serif;font-size:11px;color:#b09070;margin:0">Scannez pour commander</p>
      </div>`
    ).join('');
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>QR Codes Tables</title><style>@media print{body{margin:0}}body{text-align:center;padding:24px;background:#fff}</style></head><body>${rows}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  const handleLogoUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Image uniquement (jpg, png, webp)'); return; }
    if (file.size > 5 * 1024 * 1024) { alert("Taille max : 5 Mo"); return; }
    setUploadingLogo(true);
    try {
      const res = await uploadsAPI.uploadImage(file);
      setSettings(p => ({ ...p, logo: res.data.url }));
    } catch {
      const localUrl = URL.createObjectURL(file);
      setSettings(p => ({ ...p, logo: localUrl }));
    } finally {
      setUploadingLogo(false);
    }
  };

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

  /* Observer: met à jour activeSection quand une section entre dans le viewport */
  useEffect(() => {
    if (loadingProfile) return;
    const ids = ['sec-profil','sec-horaires','sec-livraison','sec-apparence','sec-staff','sec-securite','sec-qr'];
    const obs = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );
    ids.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [loadingProfile]);

  if (loadingProfile) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-[#FF8C00] border-t-transparent animate-spin" />
      </div>
    );
  }

  const inputCls = "w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#FF8C00]/20 focus:border-[#FF8C00]/60";
  const inputStyle = { borderColor: 'rgba(192,80,21,0.2)', background: '#FDF8F3' };

  const SEC_NAV = [
    { id: 'sec-profil',    label: 'Profil',      emoji: '🏠' },
    { id: 'sec-horaires',  label: 'Horaires',    emoji: '🕐' },
    { id: 'sec-livraison', label: 'Livraison',   emoji: '📍' },
    { id: 'sec-apparence', label: 'Apparence',   emoji: '🎨' },
    { id: 'sec-staff',     label: 'Staff',       emoji: '👥' },
    { id: 'sec-securite',  label: 'Sécurité',    emoji: '🔒' },
    { id: 'sec-qr',        label: 'QR Tables',   emoji: '📱' },
  ];

  return (
    <div className="max-w-7xl">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#FF8C00' }}>Configuration</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">Paramètres du restaurant</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              `${settings.zonesLivraison.length} zone(s) de livraison`,
              `${staffAccounts.length} compte(s) staff`,
              `${settings.horaires.ouverture}–${settings.horaires.fermeture}`,
            ].map(t => (
              <span key={t} className="rounded-full px-3 py-1 text-xs font-medium text-[#0F172A]" style={{ background: '#FFF0DF' }}>{t}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {settingsSaved && (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-green-600">
              <CheckCircle className="h-4 w-4" /> Sauvegardé
            </span>
          )}
          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-60"
            style={{ background: '#FF8C00' }}
          >
            <Settings className="h-4 w-4" />
            {savingSettings ? 'Enregistrement…' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <div className="flex gap-6 items-start">

        {/* ── Sidebar navigation minimale ── */}
        <aside className="shrink-0" style={{ width: 172, position: 'sticky', top: 80, alignSelf: 'flex-start' }}>
          <nav style={{ background: '#fff', border: '1px solid rgba(192,80,21,0.14)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 10px rgba(15,23,42,0.07)' }}>
            <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid rgba(192,80,21,0.08)' }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#FF8C00' }}>
                Paramètres
              </p>
            </div>
            <div style={{ padding: '6px 0' }}>
              {SEC_NAV.map(({ id, label, emoji }) => {
                const isActive = activeSection === id;
                return (
                  <button key={id} type="button"
                    onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      width: '100%', padding: '9px 14px',
                      border: 'none',
                      borderLeft: isActive ? '3px solid #FF8C00' : '3px solid transparent',
                      background: isActive ? 'rgba(192,80,21,0.07)' : 'transparent',
                      cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 13, fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#FF8C00' : '#64748B',
                      textAlign: 'left', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#FFF0DF'; e.currentTarget.style.color = '#FF8C00'; }}}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}}
                  >
                    <span style={{ fontSize: 14 }}>{emoji}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* ── Contenu principal ── */}
        <div className="flex-1 min-w-0 space-y-6">

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Colonne gauche (2/3) ── */}
        <div className="xl:col-span-2 space-y-6">

          {/* Profil */}
          <div id="sec-profil" className="rounded-2xl border bg-white p-6 scroll-mt-4" style={{ borderColor: 'rgba(192,80,21,0.14)' }}>
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#FF8C00' }}>Identité</p>
              <h3 className="mt-1 text-base font-bold text-[#0F172A]">Profil du restaurant</h3>
              <p className="mt-0.5 text-xs text-[#64748B]">Ces informations apparaissent sur la fiche publique et le tableau de bord.</p>
            </div>

            {/* Logo */}
            <div className="flex items-start gap-4 mb-6 p-4 rounded-xl" style={{ background: '#FDF8F3', border: '1px solid rgba(192,80,21,0.1)' }}>
              <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border" style={{ borderColor: 'rgba(192,80,21,0.18)' }}>
                {settings.logo
                  ? <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-3xl" style={{ background: '#FFF0DF' }}>🍽️</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#0F172A] mb-0.5">Logo du restaurant</p>
                <p className="text-xs text-[#9CA3AF] mb-3">JPG, PNG, WebP — max 5 Mo</p>
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer border transition ${uploadingLogo ? 'opacity-50 pointer-events-none' : 'hover:bg-[#FFF0DF]'}`}
                  style={{ borderColor: 'rgba(192,80,21,0.3)', color: '#FF8C00', background: '#fff' }}>
                  📷 {uploadingLogo ? 'Téléchargement…' : 'Choisir un fichier'}
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingLogo}
                    onChange={e => handleLogoUpload(e.target.files[0])} />
                </label>
                <input type="text" value={settings.logo}
                  onChange={e => setSettings(p => ({ ...p, logo: e.target.value }))}
                  placeholder="ou collez une URL directement"
                  className="mt-2 w-full rounded-lg border px-3 py-1.5 text-xs outline-none"
                  style={{ borderColor: 'rgba(192,80,21,0.15)', background: '#fff' }}
                />
              </div>
            </div>

            {/* Champs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#374151]">Nom du restaurant</label>
                <input type="text" value={settings.nom}
                  onChange={e => setSettings(p => ({ ...p, nom: e.target.value }))}
                  className={inputCls} style={inputStyle} placeholder="Ex: Le Bistrot d'Abidjan" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#374151]">Téléphone</label>
                <input type="tel" value={settings.telephone}
                  onChange={e => setSettings(p => ({ ...p, telephone: e.target.value }))}
                  className={inputCls} style={inputStyle} placeholder="+225 07 00 00 00" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#374151]">Email</label>
                <input type="email" value={settings.email}
                  onChange={e => setSettings(p => ({ ...p, email: e.target.value }))}
                  className={inputCls} style={inputStyle} placeholder="contact@restaurant.ci" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#374151]">Adresse</label>
                <input type="text" value={settings.adresse}
                  onChange={e => setSettings(p => ({ ...p, adresse: e.target.value }))}
                  className={inputCls} style={inputStyle} placeholder="Cocody, Abidjan" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-[#374151]">Description</label>
                <textarea value={settings.description}
                  onChange={e => setSettings(p => ({ ...p, description: e.target.value }))}
                  rows={3} placeholder="Décrivez l'ambiance et la spécialité de votre restaurant…"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition resize-none focus:ring-2 focus:ring-[#FF8C00]/20 focus:border-[#FF8C00]/60"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Horaires */}
          <div id="sec-horaires" className="rounded-2xl border bg-white p-6 scroll-mt-4" style={{ borderColor: 'rgba(192,80,21,0.14)' }}>
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#FF8C00' }}>Disponibilité</p>
              <h3 className="mt-1 text-base font-bold text-[#0F172A]">Horaires d'ouverture</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#374151]">Ouverture</label>
                <input type="time" value={settings.horaires.ouverture}
                  onChange={e => setSettings(p => ({ ...p, horaires: { ...p.horaires, ouverture: e.target.value } }))}
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#374151]">Fermeture</label>
                <input type="time" value={settings.horaires.fermeture}
                  onChange={e => setSettings(p => ({ ...p, horaires: { ...p.horaires, fermeture: e.target.value } }))}
                  className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3 p-3 rounded-xl" style={{ background: '#FDF8F3' }}>
              <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
              <p className="text-xs text-[#64748B]">
                Ouvert de <strong className="text-[#0F172A]">{settings.horaires.ouverture}</strong> à <strong className="text-[#0F172A]">{settings.horaires.fermeture}</strong>
              </p>
            </div>
          </div>

          {/* Zones de livraison */}
          <div id="sec-livraison" className="rounded-2xl border bg-white p-6 scroll-mt-4" style={{ borderColor: 'rgba(192,80,21,0.14)' }}>
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#FF8C00' }}>Logistique</p>
              <h3 className="mt-1 text-base font-bold text-[#0F172A]">Zones de livraison</h3>
              <p className="mt-0.5 text-xs text-[#64748B]">Cliquez sur la carte pour définir précisément la position.</p>
            </div>
            <div className="flex gap-2 mb-4">
              <input type="text" value={settings.newZone.nom}
                onChange={e => setSettings(p => ({ ...p, newZone: { ...p.newZone, nom: e.target.value } }))}
                placeholder="Nom de la zone (ex: Cocody, Plateau…)"
                className="flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none"
                style={inputStyle}
              />
              <button onClick={handleAddZone}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition"
                style={{ background: '#FF8C00' }}>
                <Plus className="h-4 w-4" /> Ajouter
              </button>
            </div>
            {settings.zonesLivraison.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {settings.zonesLivraison.map((zone, i) => (
                  <div key={i} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
                    style={{ borderColor: 'rgba(192,80,21,0.2)', background: '#FDF8F3', color: '#0F172A' }}>
                    <MapPin className="h-3 w-3" style={{ color: '#FF8C00' }} />
                    {zone.nom}
                    <button onClick={() => handleRemoveZone(zone)} className="ml-0.5 text-[#9CA3AF] hover:text-red-500 transition font-bold">×</button>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(192,80,21,0.14)' }}>
              <DeliveryZonesMap
                restaurantPosition={{ lat: settings.latitude, lng: settings.longitude }}
                selectedPosition={{ lat: settings.newZone.lat, lng: settings.newZone.lng }}
                zones={settings.zonesLivraison}
                onPick={handleMapPick}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-[#9CA3AF]">
              <span>Restaurant : {Number(settings.latitude).toFixed(4)}, {Number(settings.longitude).toFixed(4)}</span>
              <span>·</span>
              <span>Zone : {Number(settings.newZone.lat).toFixed(4)}, {Number(settings.newZone.lng).toFixed(4)}</span>
            </div>
          </div>
        </div>

        {/* ── Colonne droite (1/3) ── */}
        <div className="space-y-5">

          {/* Apparence */}
          <div id="sec-apparence" className="rounded-2xl border bg-white p-5 scroll-mt-4" style={{ borderColor: 'rgba(192,80,21,0.14)' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#FF8C00' }}>Interface</p>
                <h4 className="mt-0.5 text-sm font-bold text-[#0F172A]">Mode sombre</h4>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">{settings.darkMode ? 'Activé' : 'Désactivé'}</p>
              </div>
              <button onClick={toggleDarkMode}
                className="relative h-7 w-12 rounded-full flex-shrink-0 transition-colors"
                style={{ background: settings.darkMode ? '#FF8C00' : '#E5E7EB' }}>
                <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${settings.darkMode ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>

          {/* Comptes staff */}
          <div id="sec-staff" className="rounded-2xl border bg-white p-5 scroll-mt-4" style={{ borderColor: 'rgba(192,80,21,0.14)' }}>
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#FF8C00' }}>Équipe</p>
              <h3 className="mt-1 text-sm font-bold text-[#0F172A]">Comptes staff</h3>
            </div>

            {/* Formulaire création */}
            <div className="rounded-xl p-4 space-y-3 mb-4" style={{ background: '#FDF8F3', border: '1px solid rgba(192,80,21,0.1)' }}>
              <p className="text-xs font-bold text-[#0F172A] flex items-center gap-2">
                <UserPlus className="h-3.5 w-3.5" style={{ color: '#FF8C00' }} /> Nouveau compte
              </p>
              <div className="space-y-2">
                {[
                  { label: 'Email *', key: 'email', type: 'email', ph: 'staff@resto.com' },
                  { label: 'Nom complet *', key: 'nom', type: 'text', ph: 'Konan Aya' },
                  { label: 'Téléphone', key: 'telephone', type: 'tel', ph: '+225 07 00 00 00' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-[10px] font-semibold text-[#64748B] mb-0.5">{f.label}</label>
                    <input type={f.type} value={staffForm[f.key]}
                      onChange={e => setStaffForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.ph}
                      className="w-full rounded-lg border px-3 py-2 text-xs outline-none transition focus:ring-1 focus:ring-[#FF8C00]/30"
                      style={{ borderColor: 'rgba(192,80,21,0.2)', background: '#fff' }}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-[10px] font-semibold text-[#64748B] mb-0.5">Mot de passe (optionnel)</label>
                  <input type="password" value={staffForm.password}
                    onChange={e => setStaffForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Vide = généré auto"
                    className="w-full rounded-lg border px-3 py-2 text-xs outline-none"
                    style={{ borderColor: 'rgba(192,80,21,0.2)', background: '#fff' }}
                  />
                </div>
              </div>
              <button onClick={handleCreateStaff}
                className="w-full rounded-xl py-2.5 text-xs font-bold text-white transition"
                style={{ background: '#FF8C00' }}>
                Créer le compte
              </button>
              {staffCreationNotice && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-800">
                  {staffCreationNotice}
                </div>
              )}
            </div>

            {/* Liste staff */}
            {loadingStaff ? (
              <div className="flex justify-center py-5">
                <div className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#FF8C00', borderTopColor: 'transparent' }} />
              </div>
            ) : staffAccounts.length === 0 ? (
              <div className="text-center py-6">
                <Users className="mx-auto h-8 w-8 mb-2 text-[#D1D5DB]" />
                <p className="text-xs text-[#9CA3AF]">Aucun compte staff créé</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF] mb-2">
                  Membres actifs ({staffAccounts.length})
                </p>
                {staffAccounts.map(staff => {
                  const ini = (staff.nom || 'S').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <div key={staff.id} className="flex items-center gap-3 p-3 rounded-xl border"
                      style={{ borderColor: 'rgba(192,80,21,0.1)', background: '#FDF8F3' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: '#FFF0DF', color: '#FF8C00' }}>
                        {ini}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#0F172A] truncate">{staff.nom}</p>
                        <p className="text-[10px] text-[#9CA3AF] truncate">{staff.email}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${staff.actif ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                          {staff.actif ? 'Actif' : 'Inactif'}
                        </span>
                        <button onClick={() => handleToggleStaff(staff.id, staff.actif)}
                          className={`rounded-lg px-2.5 py-1 text-[10px] font-bold text-white transition ${staff.actif ? 'bg-red-500 hover:bg-red-600' : 'bg-[#FF8C00] hover:bg-[#E07A00]'}`}>
                          {staff.actif ? 'Désactiver' : 'Activer'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sécurité */}
          <div id="sec-securite" className="rounded-2xl border bg-white p-5 space-y-4 scroll-mt-4" style={{ borderColor: 'rgba(192,80,21,0.14)' }}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#FF8C00' }}>Sécurité</p>
              <h3 className="mt-1 text-sm font-bold text-[#0F172A]">Authentification & Protection</h3>
            </div>

            {secSuccess && <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-xs text-green-700">{secSuccess}</div>}
            {secError   && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{secError}</div>}

            {/* Email */}
            <div className="flex items-center gap-3 p-3 rounded-xl border"
              style={{ borderColor: 'rgba(192,80,21,0.1)', background: '#FDF8F3' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-50 shrink-0">
                <Mail className="h-3.5 w-3.5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#0F172A]">Email vérifié</p>
                <p className="text-[10px] text-[#9CA3AF] truncate">{user?.email}</p>
              </div>
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 shrink-0">✓ OK</span>
            </div>

            {/* Mot de passe */}
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(192,80,21,0.1)' }}>
              <div className="flex items-center justify-between gap-3 p-3" style={{ background: '#FDF8F3' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#FFF0DF' }}>
                    <Lock className="h-3.5 w-3.5" style={{ color: '#FF8C00' }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#0F172A]">Mot de passe</p>
                    <p className="text-[10px] text-[#9CA3AF]">Modifier régulièrement</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowPasswordForm(!showPasswordForm); setSecError(''); setSecSuccess(''); }}
                  className="rounded-lg px-3 py-1.5 text-[10px] font-bold text-white transition"
                  style={{ background: '#FF8C00' }}>
                  Modifier
                </button>
              </div>
              {showPasswordForm && (
                <div className="p-3 border-t space-y-2.5" style={{ borderColor: 'rgba(192,80,21,0.1)' }}>
                  {[
                    { key: 'current', ph: 'Mot de passe actuel' },
                    { key: 'next',    ph: 'Nouveau (6 caractères min.)' },
                    { key: 'confirm', ph: 'Confirmer le nouveau' },
                  ].map(({ key, ph }) => (
                    <div key={key} className="relative">
                      <input
                        type={showSecPwd[key] ? 'text' : 'password'}
                        placeholder={ph} value={secPwd[key]}
                        onChange={e => setSecPwd(p => ({ ...p, [key]: e.target.value }))}
                        className="w-full rounded-lg border px-3 py-2 pr-9 text-xs outline-none transition focus:ring-1 focus:ring-[#FF8C00]/30"
                        style={{ borderColor: 'rgba(192,80,21,0.2)', background: '#fff' }}
                      />
                      <button type="button"
                        onClick={() => setShowSecPwd(s => ({ ...s, [key]: !s[key] }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                        {showSecPwd[key] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                  {secPwd.next.length > 0 && (
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="h-1 flex-1 rounded-full" style={{
                          background: i <= Math.min(Math.floor(secPwd.next.length / 3), 4)
                            ? (secPwd.next.length < 6 ? '#EF4444' : secPwd.next.length < 9 ? '#FF8C00' : '#16A34A')
                            : '#E5E7EB'
                        }} />
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleChangePwd} disabled={secSaving}
                      className="flex-1 rounded-lg py-2 text-xs font-bold text-white disabled:opacity-50"
                      style={{ background: '#FF8C00' }}>
                      {secSaving ? 'Enregistrement…' : 'Confirmer'}
                    </button>
                    <button onClick={() => setShowPasswordForm(false)}
                      className="rounded-lg border px-3 py-2 text-xs text-[#64748B]"
                      style={{ borderColor: 'rgba(192,80,21,0.2)' }}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2FA */}
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(192,80,21,0.1)' }}>
              <div className="flex flex-wrap items-center justify-between gap-3 p-3" style={{ background: '#FDF8F3' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#FFF0DF' }}>
                    <Shield className="h-3.5 w-3.5" style={{ color: '#FF8C00' }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#0F172A]">Double authentification</p>
                    <p className="text-[10px] text-[#9CA3AF]">TOTP — Google Auth / Authy</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {twoFactorEnabled && (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">Actif</span>
                  )}
                  <button
                    onClick={twoFactorEnabled ? handleDisable2FA : handleSetup2FA}
                    disabled={secSaving}
                    className={`rounded-lg px-3 py-1.5 text-[10px] font-bold text-white transition disabled:opacity-50 ${twoFactorEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-[#FF8C00] hover:bg-[#E07A00]'}`}>
                    {twoFactorEnabled ? 'Désactiver' : 'Configurer'}
                  </button>
                </div>
              </div>

              {show2FA && qrData && (
                <div className="p-3 border-t space-y-3" style={{ borderColor: 'rgba(192,80,21,0.1)' }}>
                  <p className="text-[11px] text-[#64748B]">
                    Scannez avec <strong>Google Authenticator</strong> ou <strong>Authy</strong>, puis saisissez le code à 6 chiffres.
                  </p>
                  {qrData.qrCodeDataUrl ? (
                    <div className="flex flex-col items-center gap-2 rounded-xl border p-3" style={{ borderColor: 'rgba(192,80,21,0.1)', background: '#fff' }}>
                      <img src={qrData.qrCodeDataUrl} alt="QR 2FA" className="h-36 w-36 rounded-lg" />
                      <div className="text-center">
                        <p className="text-[10px] text-[#9CA3AF] mb-1">Clé manuelle :</p>
                        <code className="text-[10px] text-[#64748B] select-all break-all">{qrData.secret}</code>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed p-3 text-center" style={{ borderColor: 'rgba(192,80,21,0.2)' }}>
                      <p className="text-[10px] text-[#64748B] break-all">{qrData.otpAuthUrl}</p>
                    </div>
                  )}
                  <input type="text" maxLength={6} placeholder="Code à 6 chiffres"
                    value={twoFactorCode}
                    onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full rounded-xl border px-4 py-2.5 text-center font-mono text-base tracking-[0.4em] outline-none"
                    style={{ borderColor: 'rgba(192,80,21,0.2)', background: '#FDF8F3' }}
                  />
                  <div className="flex gap-2">
                    <button onClick={handleEnable2FA} disabled={secSaving}
                      className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white disabled:opacity-50"
                      style={{ background: '#FF8C00' }}>
                      {secSaving ? 'Activation…' : 'Activer la 2FA'}
                    </button>
                    <button onClick={() => setShow2FA(false)}
                      className="rounded-xl border px-4 py-2.5 text-xs text-[#64748B]"
                      style={{ borderColor: 'rgba(192,80,21,0.2)' }}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── QR Codes Tables ── */}
            <div id="sec-qr" className="rounded-2xl border bg-white p-5 space-y-4 scroll-mt-4" style={{ borderColor: 'rgba(192,80,21,0.14)' }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <QrCode className="h-4 w-4" style={{ color: '#FF8C00' }} />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#FF8C00' }}>Commande en salle</p>
                </div>
                <h3 className="text-base font-bold text-[#0F172A]">QR Codes par table</h3>
                <p className="text-xs text-[#64748B] mt-0.5">Le client scanne le QR de sa table et commande directement sans app.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-[#374151] whitespace-nowrap">Nombre de tables</label>
                  <input
                    type="number" min={1} max={50}
                    value={nbTables}
                    onChange={e => setNbTables(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                    className="w-16 rounded-xl border px-2 py-1.5 text-sm text-center outline-none"
                    style={{ borderColor: 'rgba(192,80,21,0.3)', background: '#FDF8F3' }}
                  />
                </div>
                <button
                  onClick={handleGenerateTableQR}
                  disabled={tableQrLoading}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-60 transition"
                  style={{ background: '#FF8C00' }}
                >
                  <QrCode className="h-3.5 w-3.5" />
                  {tableQrLoading ? 'Génération…' : 'Générer les QR codes'}
                </button>
                {tableQrCodes.length > 0 && (
                  <button
                    onClick={handlePrintTableQR}
                    className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition hover:bg-orange-50"
                    style={{ borderColor: 'rgba(192,80,21,0.35)', color: '#FF8C00' }}
                  >
                    <Printer className="h-3.5 w-3.5" /> Imprimer tout
                  </button>
                )}
              </div>
              {tableQrCodes.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
                  {tableQrCodes.map(({ table, dataUrl }) => (
                    <div key={table} className="flex flex-col items-center gap-1.5 rounded-xl border p-2.5" style={{ borderColor: 'rgba(192,80,21,0.15)', background: '#FDF8F3' }}>
                      <img src={dataUrl} alt={`Table ${table}`} className="w-full aspect-square rounded-lg" />
                      <p className="text-xs font-bold text-[#0F172A]">Table {table}</p>
                      <a
                        href={dataUrl}
                        download={`qr-table-${table}.png`}
                        className="text-[10px] font-semibold rounded-lg px-2 py-0.5 hover:bg-orange-100 transition"
                        style={{ color: '#FF8C00' }}
                      >
                        Télécharger
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {backupCodes && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-amber-900">⚠ Codes de secours — notez-les maintenant !</p>
                    <p className="mt-0.5 text-[10px] text-amber-700">Affichés une seule fois. À conserver en lieu sûr.</p>
                  </div>
                  <button onClick={() => setBackupCodes(null)} className="text-amber-600 hover:text-amber-900">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {backupCodes.map((code, i) => (
                    <code key={i} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-center font-mono text-xs text-amber-900 select-all">{code}</code>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard.writeText(backupCodes.join('\n'))}
                    className="flex-1 rounded-xl border border-amber-300 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100">
                    Copier
                  </button>
                  <button onClick={() => { const b=new Blob([`Codes de secours 2FA\n\n${backupCodes.join('\n')}`],{type:'text/plain'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download='codes-secours-2fa.txt'; a.click(); URL.revokeObjectURL(u); }}
                    className="flex-1 rounded-xl bg-amber-600 py-2 text-xs font-semibold text-white hover:bg-amber-700">
                    Télécharger
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>{/* /grid */}

        </div>
      </div>
    </div>
  );
}


function downloadAndOpenBlob(blob, fileName) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => window.URL.revokeObjectURL(url), 5000);
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

/* ══════════════════ Module Historique / Audit ══════════════════ */
function HistoryTab({ restaurantId }) {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(50);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    setError('');
    try {
      const res = await commandesService.getRestaurantActivity(limit);
      setActivity(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError('Impossible de charger l\'historique');
    } finally {
      setLoading(false);
    }
  }, [restaurantId, limit]);

  useEffect(() => { void load(); }, [load]);

  const STATUS_COLORS_MAP = {
    RECUE: { bg: '#DBEAFE', color: '#1D4ED8' },
    CONFIRMEE: { bg: '#EDE9FE', color: '#6D28D9' },
    EN_PREP: { bg: '#FEF3C7', color: '#B45309' },
    PRETE: { bg: '#D1FAE5', color: '#065F46' },
    EN_LIVRAISON: { bg: '#FCE7F3', color: '#9D174D' },
    LIVREE: { bg: '#D1FAE5', color: '#065F46' },
    ANNULEE: { bg: '#FEE2E2', color: '#991B1B' },
  };

  const STAT_LABELS = {
    RECUE: 'Reçue', CONFIRMEE: 'Confirmée', EN_PREP: 'En préparation',
    PRETE: 'Prête', EN_LIVRAISON: 'En livraison', LIVREE: 'Livrée', ANNULEE: 'Annulée',
  };

  const byDay = {};
  for (const e of activity) {
    const day = new Date(e.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(e);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A]">Historique d'activité</h2>
          <p className="text-sm text-[#6B7280] mt-0.5">Audit complet des changements de statut des commandes</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            className="text-sm rounded-xl border border-[#E2E8F0] px-3 py-2 bg-white focus:outline-none"
          >
            <option value={20}>20 derniers</option>
            <option value={50}>50 derniers</option>
            <option value={100}>100 derniers</option>
            <option value={200}>200 derniers</option>
          </select>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: '#FF8C00' }}
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF8C00', borderTopColor: 'transparent' }} />
        </div>
      ) : activity.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-[#E2E8F0] bg-white">
          <Activity className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#374151]">Aucune activité enregistrée</p>
          <p className="text-xs text-[#9CA3AF] mt-1">Les changements de statut s'afficheront ici</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byDay).map(([day, entries]) => (
            <div key={day}>
              <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">{day}</p>
              <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden divide-y divide-[#F1F5F9]">
                {entries.map(entry => {
                  const prevStyle = entry.statutPrecedent ? STATUS_COLORS_MAP[entry.statutPrecedent] : null;
                  const nextStyle = STATUS_COLORS_MAP[entry.statutNouvel] || { bg: '#F3F4F6', color: '#374151' };
                  const time = new Date(entry.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={entry.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="w-12 text-right shrink-0">
                        <span className="text-xs text-[#9CA3AF] font-medium">{time}</span>
                      </div>
                      <div className="w-px h-8 bg-[#E2E8F0] shrink-0" />
                      <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-bold text-[#0F172A]">
                          #{entry.commandeNumero || entry.commandeId?.slice(0, 8)}
                        </span>
                        {prevStyle && (
                          <>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: prevStyle.bg, color: prevStyle.color }}>
                              {STAT_LABELS[entry.statutPrecedent] || entry.statutPrecedent}
                            </span>
                            <span className="text-[#9CA3AF] text-xs">→</span>
                          </>
                        )}
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: nextStyle.bg, color: nextStyle.color }}>
                          {STAT_LABELS[entry.statutNouvel] || entry.statutNouvel}
                        </span>
                        {entry.actorNom && (
                          <span className="text-xs text-[#6B7280] flex items-center gap-1">
                            <Users className="w-3 h-3" /> {entry.actorNom}
                          </span>
                        )}
                        {entry.actorRole && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: '#F1F5F9', color: '#64748B' }}>
                            {entry.actorRole}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════ Module Vue d'ensemble dynamique ══════════════════ */

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

  const adresseDone  = !!(restaurant?.adresse && restaurant.adresse !== 'À compléter');
  const horairesDone = !!(restaurant?.openingTime && restaurant?.closingTime);
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
      <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-[#FF8C00]" />
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
              <span className="text-2xl font-extrabold text-[#FF8C00]">{pct}%</span>
              <p className="text-[10px] text-[#737373]">complété</p>
            </div>
            {nextIncomplete && (
              <button onClick={() => navigate(`/gerant?tab=${nextIncomplete.tab}`)}
                className="rounded-xl bg-[#FF8C00] px-3 py-2 text-xs font-bold text-white hover:bg-[#E07A00] transition">
                Compléter →
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full rounded-full bg-[#F4F6F8] overflow-hidden">
          <div className="h-full rounded-full bg-[#FF8C00] transition-all duration-500" style={{ width: pct + '%' }} />
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
              <span className={'text-xs ' + (s.done ? 'text-emerald-600 font-medium' : s.tab ? 'text-[#FF8C00] hover:underline underline-offset-2' : 'text-[#737373]')}>
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
    socket.on('commande.b2b.nouvelle', handleDashboardUpdate);
    socket.on('commande.b2b.statut', handleDashboardUpdate);
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
                ? "#FF8C00"
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
            borderColor: "#FF8C00",
            backgroundColor: "rgba(197,138,85,0.08)",
            fill: true,
            tension: 0.42,
            pointRadius: 5,
            pointBackgroundColor: "#fff",
            pointBorderColor: "#FF8C00",
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
              color: "#FF8C00",
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
      const response = await commandesService.getReceiptPdf(order.id);
      const blob = new Blob([response.data], { type: "application/pdf" });
      downloadAndOpenBlob(blob, `recu-commande-${order?.numero || "today"}.pdf`);
    } catch (error) {
      console.error("Erreur export PDF:", error);
      alert("Erreur lors de la génération du reçu PDF. Veuillez réessayer.");
    }
  };

  const handleExportSyscohada = async () => {
    try {
      // Télécharge le CSV SYSCOHADA natif (format comptable Sage/Ciel/DGI-CI)
      const response = await tresorerieAPI.exportSyscohada("monthly");
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      downloadAndOpenBlob(blob, `SYSCOHADA-monthly-${new Date().toISOString().slice(0, 10)}.csv`);
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
      badge: "bg-[#FFF0DF] text-[#1A1A1A]",
      label: `${Math.max(ageMinutes, 0)} min`,
    };
  };

  const getOrderStatusClasses = (status) =>
    STATUS_COLORS[status] || "bg-[#FFF0DF] text-slate-700";

  const getOrderStatusLabel = (status) =>
    STATUS_LABELS[status] || status?.replace(/_/g, " ") || "-";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="h-10 w-10 rounded-full border-4 border-[#FF8C00] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF8C00]">Dashboard</p>
          <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">{restaurantName}</h2>
          <p className="mt-0.5 text-sm text-[#64748B]">Pilotez votre restaurant en temps réel.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-[#FFF0DF] bg-white p-1">
            <NotificationBell accentColor="#FF8C00" />
          </div>
          <button
            onClick={() => void loadOverviewData({ silent: true })}
            className="inline-flex items-center gap-2 rounded-xl border border-[#FFF0DF] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-[#FF8C00]/40 hover:text-[#FF8C00]"
          >
            <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Sync…" : "Actualiser"}
          </button>
          <button
            onClick={() => navigate("/gerant?tab=orders")}
            className="inline-flex items-center gap-2 rounded-xl border border-[#FFF0DF] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-[#FF8C00]/40 hover:text-[#FF8C00]"
          >
            <ClipboardList className="h-4 w-4" /> Commandes
          </button>
          <button
            onClick={() => navigate("/gerant/kds")}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF8C00] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#FF8C00]/25 transition hover:bg-[#E07A00]"
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
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-20" style={{ background: '#FF8C00', filter: 'blur(28px)' }} />
          <div className="relative">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">CA du jour</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'rgba(224,78,26,0.25)' }}>
                <TrendingUp className="h-4 w-4 text-[#FF8C00]" />
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
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280]">En cuisine</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50">
              <ClipboardList className="h-4 w-4 text-[#FF8C00]" />
            </div>
          </div>
          <p className="text-4xl font-bold text-[#0F172A] leading-none">{stats.activeOrders}</p>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-[#FF8C00]">
              {stats.b2bOrders} B2B
            </span>
            <span className="text-xs text-[#6B7280]">commandes actives</span>
          </div>
        </div>

        {/* Card 3 — alertes stock */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280]">Alertes stock</p>
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
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280]">Équipe</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
              <Users className="h-4 w-4 text-[#FF8C00]" />
            </div>
          </div>
          <p className="text-4xl font-bold text-[#0F172A] leading-none">{stats.staffCount}</p>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-[#FF8C00]">
              {stats.uniqueCustomers} clients
            </span>
            <span className="text-xs text-[#6B7280]">uniques</span>
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
              <p className="mt-0.5 text-xs text-[#6B7280]">Commandes & revenus sur 7 jours</p>
            </div>
            <div className="flex gap-3">
              <div className="rounded-xl border border-slate-100 bg-white px-4 py-2 text-center">
                <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-wider">Commandes</p>
                <p className="mt-0.5 text-xl font-bold text-[#FF8C00]">{weekOrdersTotal}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white px-4 py-2 text-center">
                <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-wider">Revenus</p>
                <p className="mt-0.5 text-xl font-bold text-[#FF8C00]">{formatFCFA(weekRevenueTotal)}</p>
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
                    <CreditCard className="h-4 w-4 text-[#FF8C00]" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Ticket moyen</span>
                </div>
                <span className="text-base font-bold text-[#0F172A]">{formatFCFA(financialHighlights.ticketMoyen)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-50 to-white px-4 py-3 border border-amber-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                    <PieChart className="h-4 w-4 text-[#FF8C00]" />
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
                { icon: Package, label: "Menu", path: "/gerant?tab=menu", color: '#FF8C00' },
                { icon: ClipboardList, label: "Commandes", path: "/gerant?tab=orders", color: '#FF8C00' },
                { icon: AlertTriangle, label: "Stocks", path: "/gerant?tab=stocks", color: '#FF8C00' },
                { icon: Wallet, label: "Trésorerie", path: "/gerant?tab=finance", color: '#FF8C00' },
                { icon: Tag, label: "Promos", path: "/gerant?tab=promos", color: '#FF8C00' },
                { icon: Users, label: "Équipe", path: "/gerant?tab=settings", color: '#64748B' },
                { icon: ChefHat, label: "KDS live", path: "/gerant/kds", color: '#FF8C00' },
                { icon: History, label: "Historique", path: "/gerant?tab=history", color: '#6366F1' },
              ].map(({ icon: Icon, label, path, color }) => (
                <button
                  key={label}
                  onClick={() => navigate(path)}
                  className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#FF8C00]"
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
            <p className="mt-0.5 text-xs text-[#6B7280]">Client + entreprise · {recentOrders.length} dernières</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportPDF}
              disabled={recentOrders.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#FFF0DF] bg-white px-3 py-2 text-xs font-medium text-[#6B7280] transition hover:bg-[#FFF0DF] disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" /> PDF
            </button>
            <button
              onClick={handleExportSyscohada}
              disabled={!restaurantId}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF8C00] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#E07A00] disabled:opacity-40"
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
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF0DF] text-[11px] font-bold text-[#FF8C00]">
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
                      <p className="mt-0.5 text-[11px] text-[#6B7280]">{order.source} · {formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-[#0F172A]">{formatFCFA(order.amount)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#FFF0DF] bg-white py-10 text-center text-sm text-[#6B7280]">
            Aucune commande récente
          </div>
        )}
      </section>
    </div>
  );
}


/* ══════════════════ Module Retrait de gains ══════════════════ */
function RetraitTab({ restaurantId }) {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ montant: '', provider: 'WAVE', numeroMobileMoney: '' });
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Solde estimé depuis le rapport mensuel
  const [soldeEstime, setSoldeEstime] = useState(null);

  useEffect(() => {
    tresorerieAPI.generateReport('monthly')
      .then((r) => setSoldeEstime(r.data?.summary?.totalRevenue ?? null))
      .catch(() => {});
  }, []);

  const loadDemandes = async () => {
    try {
      setLoading(true);
      const r = await retraitAPI.getMesDemandes();
      setDemandes(r.data || []);
    } catch {
      // silencieux si le backend n'est pas encore disponible
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDemandes(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');
    const montant = parseFloat(form.montant);
    if (!montant || montant <= 0) { setFormError('Le montant doit être supérieur à 0'); return; }
    if (!form.numeroMobileMoney.trim()) { setFormError('Numéro Mobile Money requis'); return; }
    setSubmitting(true);
    try {
      await retraitAPI.creerDemande({
        montant,
        provider: form.provider,
        numeroMobileMoney: form.numeroMobileMoney.trim(),
        restaurantId,
      });
      setSuccessMsg('Demande de retrait envoyée. Elle sera traitée par l\'administrateur.');
      setForm({ montant: '', provider: 'WAVE', numeroMobileMoney: '' });
      await loadDemandes();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Erreur lors de l\'envoi de la demande');
    } finally {
      setSubmitting(false);
    }
  };

  const statutBadge = (statut) => {
    if (statut === 'APPROVED') return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">Approuvée</span>;
    if (statut === 'REJECTED') return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">Rejetée</span>;
    return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">En attente</span>;
  };

  const providerLabel = (p) => ({ WAVE: 'Wave', ORANGE_MONEY: 'Orange Money', MTN_MONEY: 'MTN Money' }[p] || p);

  return (
    <div className="space-y-6">
      {/* Solde estimé */}
      <section className="rounded-[28px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF0DF] px-3 py-1 text-xs font-medium text-[#FF8C00] mb-2">
              <Wallet className="h-3.5 w-3.5" />
              Retrait de gains
            </div>
            <h3 className="text-xl font-bold text-[#1C1917]">Demander un retrait</h3>
            <p className="mt-1 text-sm text-[#78716C]">Soumettez une demande de virement vers votre compte Mobile Money.</p>
          </div>
          {soldeEstime !== null && (
            <div className="rounded-2xl bg-[#FFF0DF] px-5 py-3 text-right">
              <p className="text-xs text-[#78716C] font-medium">CA estimé ce mois</p>
              <p className="text-2xl font-extrabold text-[#FF8C00]">
                {Number(soldeEstime).toLocaleString('fr-FR')} FCFA
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Formulaire */}
      <section className="rounded-[26px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <h4 className="text-base font-bold text-[#1C1917] mb-4">Nouvelle demande</h4>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Montant */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#0F172A]">Montant (FCFA) *</label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.montant}
                onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))}
                placeholder="Ex : 50 000"
                className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0F172A] outline-none transition focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00]"
              />
            </div>
            {/* Provider */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#0F172A]">Opérateur *</label>
              <select
                value={form.provider}
                onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
                className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0F172A] outline-none transition focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00]"
              >
                <option value="WAVE">Wave</option>
                <option value="ORANGE_MONEY">Orange Money</option>
                <option value="MTN_MONEY">MTN Money</option>
              </select>
            </div>
            {/* Numéro */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#0F172A]">Numéro Mobile Money *</label>
              <input
                type="tel"
                value={form.numeroMobileMoney}
                onChange={(e) => setForm((f) => ({ ...f, numeroMobileMoney: e.target.value }))}
                placeholder="Ex : +225 07 00 00 00 00"
                className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0F172A] outline-none transition focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00]"
              />
            </div>
          </div>

          {formError && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 border border-red-200">{formError}</p>
          )}
          {successMsg && (
            <p className="rounded-xl bg-green-50 px-4 py-2.5 text-sm text-green-700 border border-green-200">{successMsg}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#FF8C00] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#E07A00] disabled:opacity-60"
          >
            {submitting ? (
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <DollarSign className="h-4 w-4" />
            )}
            {submitting ? 'Envoi en cours…' : 'Soumettre la demande'}
          </button>
        </form>
      </section>

      {/* Historique */}
      <section className="rounded-[26px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-bold text-[#1C1917]">Historique des demandes</h4>
          <button
            onClick={loadDemandes}
            className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-[#FFF0DF] transition"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Actualiser
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 rounded-full border-4 border-[#FF8C00] border-t-transparent animate-spin" />
          </div>
        ) : demandes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 rounded-2xl bg-[#FFF7ED]">
            <Wallet className="h-10 w-10 mb-2" style={{ color: '#FF8C00', opacity: 0.4 }} />
            <p className="text-sm font-medium text-[#0F172A]">Aucune demande de retrait</p>
            <p className="text-xs mt-1 text-[#94A3B8]">Vos demandes apparaîtront ici après soumission.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#F1F5F9]">
                  <th className="pb-3 text-left text-xs font-semibold text-[#64748B] pr-4">Date</th>
                  <th className="pb-3 text-left text-xs font-semibold text-[#64748B] pr-4">Montant</th>
                  <th className="pb-3 text-left text-xs font-semibold text-[#64748B] pr-4">Opérateur</th>
                  <th className="pb-3 text-left text-xs font-semibold text-[#64748B] pr-4">Numéro</th>
                  <th className="pb-3 text-left text-xs font-semibold text-[#64748B]">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8FAFC]">
                {demandes.map((d) => (
                  <tr key={d.id} className="hover:bg-[#FFF7ED] transition-colors">
                    <td className="py-3 pr-4 text-[#0F172A] whitespace-nowrap">{new Date(d.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td className="py-3 pr-4 font-bold text-[#FF8C00] whitespace-nowrap">{Number(d.montant).toLocaleString('fr-FR')} FCFA</td>
                    <td className="py-3 pr-4 text-[#0F172A]">{providerLabel(d.provider)}</td>
                    <td className="py-3 pr-4 text-[#0F172A] font-mono text-xs">{d.numeroMobileMoney}</td>
                    <td className="py-3">
                      {statutBadge(d.statut)}
                      {d.statut === 'REJECTED' && d.motifRejet && (
                        <p className="mt-1 text-xs text-red-600 italic">Motif : {d.motifRejet}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ═══ GerantDashboard — Composant principal ═══ */
export default function GerantDashboard({ restaurantId, token }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get("tab") || "overview";
  const cachedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const user = cachedUser?.user || cachedUser;
  const [darkMode, setDarkMode] = useState(localStorage.getItem("darkMode") === "true");
  const [tabOverlay, setTabOverlay] = useState(false);

  useEffect(() => {
    const syncDarkMode = () => setDarkMode(localStorage.getItem("darkMode") === "true");
    window.addEventListener("storage", syncDarkMode);
    window.addEventListener("gerant-dark-mode-changed", syncDarkMode);
    return () => {
      window.removeEventListener("storage", syncDarkMode);
      window.removeEventListener("gerant-dark-mode-changed", syncDarkMode);
    };
  }, []);

  useEffect(() => {
    setTabOverlay(true);
    const t = setTimeout(() => setTabOverlay(false), 180);
    return () => clearTimeout(t);
  }, [activeTab]);

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
      case "promos":
        return <PromosTab restaurantId={restaurantId} />;
      case "settings":
        return <SettingsTab restaurantId={restaurantId} user={user} />;
      case "history":
        return <HistoryTab restaurantId={restaurantId} />;
      case "retrait":
        return <RetraitTab restaurantId={restaurantId} />;
      case "overview":
      default:
        return <OverviewTab restaurantId={restaurantId} />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto" style={{ position: 'relative' }}>
      {tabOverlay && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 5,
          background: 'rgba(15,23,42,0.18)',
          pointerEvents: 'none',
          animation: 'fadeIn 0.15s ease',
        }} />
      )}
      <OnboardingWizard />
      <div
        className={`rounded-3xl p-6 shadow-sm ${
          darkMode
            ? "border border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"
            : "bg-white border border-[rgba(0,0,0,0.05)]"
        }`}
      >
        <div key={activeTab} style={{ animation: 'fadeUp 0.22s ease both' }}>
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}