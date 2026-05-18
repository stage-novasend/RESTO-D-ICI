// src/pages/gerant/GerantDashboard.jsx
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";
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
} from "../../services/api";

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
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="font-bold text-gray-800 text-lg">Gestion du Menu</h3>
          <p className="text-sm text-gray-600">
            Activer/désactiver des articles et gérer le catalogue
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryForm(!showCategoryForm)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-xl text-sm font-medium hover:bg-violet-600 transition"
          >
            <Plus className="w-4 h-4" />
            {showCategoryForm ? "Annuler" : "Nouvelle catégorie"}
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition"
          >
            <Plus className="w-4 h-4" />
            {showAddForm ? "Annuler" : "Nouvel article"}
          </button>
        </div>
      </div>

      {/* Formulaire création catégorie */}
      {showCategoryForm && (
        <div className="bg-violet-50 rounded-2xl p-6 border border-violet-200 space-y-4">
          <h4 className="font-bold text-gray-800">
            Créer une nouvelle catégorie
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Nom de la catégorie *
              </label>
              <input
                type="text"
                value={newCategory.nom}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, nom: e.target.value })
                }
                className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:ring-2 focus:ring-violet-500 outline-none ${categoryErrors.nom ? "border-red-500" : "border-violet-200"}`}
                placeholder="Ex: Plats Principaux"
              />
              {categoryErrors.nom && (
                <p className="text-red-500 text-xs mt-1">
                  {categoryErrors.nom}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Icône (optionnel)
              </label>
              <input
                type="text"
                value={newCategory.icone}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, icone: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-white border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
                placeholder="Ex: 🍽️ ou emoji"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCreateCategory}
              className="px-6 py-2.5 bg-violet-500 text-white rounded-xl font-medium hover:bg-violet-600 transition"
            >
              Créer la catégorie
            </button>
            <button
              onClick={() => {
                setShowCategoryForm(false);
                setCategoryErrors({});
              }}
              className="px-6 py-2.5 bg-white border border-violet-200 text-gray-800 rounded-xl font-medium hover:bg-violet-50 transition"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200 space-y-4">
          <h4 className="font-bold text-gray-800">Créer un nouvel article</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Nom *
              </label>
              <input
                type="text"
                value={newArticle.nom}
                onChange={(e) =>
                  setNewArticle({ ...newArticle, nom: e.target.value })
                }
                className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none ${formErrors.nom ? "border-red-500" : "border-emerald-200"}`}
                placeholder="Ex: Attiéké Poisson"
              />
              {formErrors.nom && (
                <p className="text-red-500 text-xs mt-1">{formErrors.nom}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Prix (FCFA) *
              </label>
              <input
                type="number"
                min="1"
                value={newArticle.prix}
                onChange={(e) =>
                  setNewArticle({ ...newArticle, prix: e.target.value })
                }
                className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none ${formErrors.prix ? "border-red-500" : "border-emerald-200"}`}
                placeholder="Ex: 3500"
              />
              {formErrors.prix && (
                <p className="text-red-500 text-xs mt-1">{formErrors.prix}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Catégorie *
              </label>
              <select
                value={newArticle.categorieId}
                onChange={(e) =>
                  setNewArticle({ ...newArticle, categorieId: e.target.value })
                }
                className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none ${formErrors.categorieId ? "border-red-500" : "border-emerald-200"}`}
              >
                <option value="">Sélectionner une catégorie</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nom} {cat.icone || ""}
                  </option>
                ))}
              </select>
              {formErrors.categorieId && (
                <p className="text-red-500 text-xs mt-1">
                  {formErrors.categorieId}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Stock initial
              </label>
              <input
                type="number"
                min="0"
                value={newArticle.stock}
                onChange={(e) =>
                  setNewArticle({ ...newArticle, stock: e.target.value })
                }
                className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none ${formErrors.stock ? "border-red-500" : "border-emerald-200"}`}
                placeholder="Ex: 50"
              />
              {formErrors.stock && (
                <p className="text-red-500 text-xs mt-1">{formErrors.stock}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Photo de l'article
              </label>
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newArticle.photoUrl}
                    onChange={(e) =>
                      setNewArticle({ ...newArticle, photoUrl: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="URL de l'image ou laissez vide"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Ou téléchargez depuis votre ordinateur :
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files[0])}
                    className="mt-1"
                    disabled={uploading}
                  />
                  {uploading && (
                    <p className="text-sm text-emerald-600 mt-1">
                      Chargement en cours...
                    </p>
                  )}
                </div>
                {newArticle.photoUrl && (
                  <div className="w-24 h-24 rounded-xl overflow-hidden border border-emerald-200">
                    <img
                      src={newArticle.photoUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Description
            </label>
            <textarea
              value={newArticle.description}
              onChange={(e) =>
                setNewArticle({ ...newArticle, description: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              rows="3"
              placeholder="Description du plat..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleAddArticle}
              className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition"
            >
              Créer l'article
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setFormErrors({});
              }}
              className="px-6 py-2.5 bg-white border border-emerald-200 text-gray-800 rounded-xl font-medium hover:bg-emerald-50 transition"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher un article ou une catégorie..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
        />
      </div>

      {/* Liste des articles */}
      <div className="space-y-3">
        {filteredArticles.length > 0 ? (
          filteredArticles.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between p-4 bg-white rounded-2xl border border-violet-100 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-violet-50 flex items-center justify-center text-2xl overflow-hidden">
                  {a.photoUrl ? (
                    <img
                      src={a.photoUrl}
                      alt={a.nom}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    a.categorie?.icone || "🍽️"
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{a.nom}</p>
                  <p className="text-sm text-gray-600">
                    {a.categorie?.nom} • Stock: {a.stock}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-violet-600">
                  {Number(a.prix).toLocaleString()} FCFA
                </span>
                <button
                  onClick={() => handleToggleDisponibilite(a.id, !a.disponible)}
                  className={`relative w-12 h-7 rounded-full transition-all ${a.disponible ? "bg-green-500" : "bg-gray-300"}`}
                  title={a.disponible ? "Désactiver" : "Activer"}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${a.disponible ? "translate-x-5" : ""}`}
                  />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-600 py-8">Aucun article trouvé</p>
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

  useEffect(() => {
    const loadOrders = async () => {
      if (!restaurantId) return;
      try {
        setLoading(true);
        setError(null);
        const [clientRes, b2bRes] = await Promise.all([
          commandesService.getAll({ restaurantId, limit: 50 }),
          b2bAPI.getManagerOrders(),
        ]);

        const clientOrders = (clientRes.data || []).map((order) => ({
          ...order,
          type: "CLIENT",
          source: "Client",
          amount: Number(order.montantTotal ?? order.total ?? 0),
        }));

        const b2bOrders = (b2bRes.data || []).map((order) => ({
          ...order,
          type: "B2B",
          source: order.source || "Entreprise",
          amount: Number(order.total ?? order.montantTotal ?? 0),
        }));

        const merged = [...clientOrders, ...b2bOrders].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setOrders(merged);
      } catch (loadError) {
        console.error("Erreur chargement commandes:", loadError);
        setError("Impossible de charger les commandes client et entreprise.");
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, [restaurantId]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await commandesService.updateStatus(orderId, newStatus);
      const [clientRes, b2bRes] = await Promise.all([
        commandesService.getAll({ restaurantId, limit: 50 }),
        b2bAPI.getManagerOrders(),
      ]);
      const clientOrders = (clientRes.data || []).map((order) => ({
        ...order,
        type: "CLIENT",
        source: "Client",
        amount: Number(order.montantTotal ?? order.total ?? 0),
      }));
      const b2bOrders = (b2bRes.data || []).map((order) => ({
        ...order,
        type: "B2B",
        source: order.source || "Entreprise",
        amount: Number(order.total ?? order.montantTotal ?? 0),
      }));
      const merged = [...clientOrders, ...b2bOrders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setOrders(merged);
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
    (Date.now() - new Date(order.createdAt).getTime()) / 60000;

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
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-gray-800 text-lg">Gestion des Stocks</h3>
        <p className="text-sm text-gray-600">
          Inventaire en temps réel et alertes de seuil
        </p>
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
          <h4 className="font-semibold text-rose-800 mb-2">
            ⚠️ Alertes de stock
          </h4>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center gap-2 text-sm text-rose-700"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>
                  {alert.nom}: stock actuel {alert.stock} {"<"} {alert.seuil}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ajustement manuel */}
      <div className="bg-white rounded-2xl border border-amber-100 p-6">
        <h4 className="font-semibold text-gray-800 mb-4">
          Ajustement manuel de stock
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Article
            </label>
            <select
              value={adjustmentForm.articleId}
              onChange={(e) =>
                setAdjustmentForm({
                  ...adjustmentForm,
                  articleId: e.target.value,
                })
              }
              className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
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
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Quantité
            </label>
            <input
              type="number"
              value={adjustmentForm.quantity}
              onChange={(e) =>
                setAdjustmentForm({
                  ...adjustmentForm,
                  quantity: e.target.value,
                })
              }
              className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
              placeholder="Ex: +5 ou -2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Motif
            </label>
            <input
              type="text"
              value={adjustmentForm.motif}
              onChange={(e) =>
                setAdjustmentForm({ ...adjustmentForm, motif: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
              placeholder="Optionnel"
            />
          </div>
        </div>
        <button
          onClick={handleAdjustStock}
          className="mt-4 px-6 py-2.5 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition"
        >
          Ajuster le stock
        </button>
      </div>

      {/* Inventaire */}
      <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-amber-50 font-semibold">
          <div>Article</div>
          <div className="text-center">Stock actuel</div>
          <div className="text-center">Seuil min</div>
          <div className="text-center">Statut</div>
        </div>
        <div className="divide-y divide-amber-100">
          {stocks.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 items-center"
            >
              <div className="font-medium">{item.nom}</div>
              <div className="text-center font-semibold">
                {item.stock || 0} {item.unite || "unités"}
              </div>
              <div className="text-center">
                {item.seuilMin || 5} {item.unite || "unités"}
              </div>
              <div className="text-center">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    (item.stock || 0) <= (item.seuilMin || 5)
                      ? "bg-rose-100 text-rose-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {(item.stock || 0) <= (item.seuilMin || 5) ? "Alerte" : "OK"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {stocks.length === 0 && (
        <div className="text-center py-12 text-gray-600">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
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
      alert(`Rapport ${reportPeriod} généré! URL: ${reportRes.data.reportUrl}`);
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
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-gray-800 text-lg">
          Trésorerie & Reporting
        </h3>
        <p className="text-sm text-gray-600">
          Tableau de bord financier et analyse des performances
        </p>
      </div>

      {/* Période selector */}
      <div className="flex gap-2">
        {["day", "week", "month"].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              period === p
                ? "bg-emerald-500 text-white"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            {p === "day" ? "Jour" : p === "week" ? "Semaine" : "Mois"}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-4 border border-emerald-200">
          <div className="text-sm text-emerald-700 mb-1">
            {period === "day"
              ? "CA Aujourd'hui"
              : period === "week"
                ? "CA Semaine"
                : "CA Mois"}
          </div>
          <div className="text-2xl font-bold text-emerald-800">
            {period === "day"
              ? kpiData.caJour.toLocaleString()
              : period === "week"
                ? kpiData.caSemaine.toLocaleString()
                : kpiData.caMois.toLocaleString()}{" "}
            FCFA
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-violet-100">
          <div className="text-sm text-violet-700 mb-1">Nb Commandes</div>
          <div className="text-2xl font-bold text-gray-800">
            {kpiData.nbCommandes}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-amber-100">
          <div className="text-sm text-amber-700 mb-1">Ticket Moyen</div>
          <div className="text-2xl font-bold text-gray-800">
            {kpiData.ticketMoyen.toLocaleString()} FCFA
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-sky-100">
          <div className="text-sm text-sky-700 mb-1">Marge Brute</div>
          <div className="text-2xl font-bold text-gray-800">
            {kpiData.margesBrutes}%
          </div>
        </div>
      </div>

      {/* Enregistrement des dépenses */}
      <div className="bg-white rounded-2xl border border-emerald-100 p-6">
        <h4 className="font-semibold text-gray-800 mb-4">
          Saisir une dépense opérationnelle
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Catégorie *
            </label>
            <select
              value={expenseForm.categorie}
              onChange={(e) =>
                setExpenseForm({ ...expenseForm, categorie: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
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
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Montant (FCFA) *
            </label>
            <input
              type="number"
              min="1"
              value={expenseForm.montant}
              onChange={(e) =>
                setExpenseForm({ ...expenseForm, montant: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Ex: 50000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Description
            </label>
            <input
              type="text"
              value={expenseForm.description}
              onChange={(e) =>
                setExpenseForm({ ...expenseForm, description: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Optionnel"
            />
          </div>
        </div>
        <button
          onClick={handleRecordExpense}
          className="mt-4 px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition"
        >
          Enregistrer la dépense
        </button>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-2xl border border-violet-100 p-6">
        <h4 className="font-semibold text-gray-800 mb-4">
          Actions disponibles
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => handleGenerateReport("monthly")}
            className="flex items-center gap-2 px-4 py-3 bg-violet-50 rounded-xl hover:bg-violet-100 transition border border-violet-200"
          >
            <Download className="w-5 h-5 text-violet-600" />
            Rapport mensuel (PDF/Excel)
          </button>
          <button
            onClick={() => handleGenerateReport("quarterly")}
            className="flex items-center gap-2 px-4 py-3 bg-amber-50 rounded-xl hover:bg-amber-100 transition border border-amber-200"
          >
            <BarChart3 className="w-5 h-5 text-amber-600" />
            Rapport trimestriel
          </button>
          <button
            onClick={() => handleGenerateReport("yearly")}
            className="flex items-center gap-2 px-4 py-3 bg-sky-50 rounded-xl hover:bg-sky-100 transition border border-sky-200"
          >
            <TrendingUp className="w-5 h-5 text-sky-600" />
            Rapport annuel
          </button>
          <div className="flex flex-col gap-2">
            <h5 className="font-medium text-gray-800">Configuration Budget</h5>
            <div className="grid grid-cols-2 gap-2">
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
                className="px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm"
                placeholder="Plafond (FCFA)"
              />
              <button
                onClick={handleConfigureBudget}
                className="px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 transition"
              >
                Sauvegarder
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={budgetConfig.alerte80}
                onChange={(e) =>
                  setBudgetConfig({
                    ...budgetConfig,
                    alerte80: e.target.checked,
                  })
                }
                className="w-4 h-4 text-emerald-500 rounded"
              />
              <span>Alerte à 80%</span>
              <input
                type="checkbox"
                checked={budgetConfig.alerte100}
                onChange={(e) =>
                  setBudgetConfig({
                    ...budgetConfig,
                    alerte100: e.target.checked,
                  })
                }
                className="w-4 h-4 text-emerald-500 rounded ml-4"
              />
              <span>Alerte à 100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== SETTINGS MODULE ====================
function SettingsTab({ restaurantId, user }) {
  const [settings, setSettings] = useState({
    horaires: { ouverture: "08:00", fermeture: "22:00" },
    zonesLivraison: ["Plateau", "Cocody", "Marcory"],
    newZone: "",
    darkMode: localStorage.getItem("darkMode") === "true",
  });
  const [staffAccounts, setStaffAccounts] = useState([]);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("gerantSettings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings((prev) => ({
          ...prev,
          ...parsed,
          horaires: {
            ...prev.horaires,
            ...(parsed.horaires || {}),
          },
          zonesLivraison: parsed.zonesLivraison || prev.zonesLivraison,
          newZone: parsed.newZone || "",
          darkMode: parsed.darkMode ?? prev.darkMode,
        }));
      } catch {
        // Ignore malformed saved settings
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("gerantSettings", JSON.stringify(settings));
  }, [settings]);

  const handleSaveSettings = () => {
    localStorage.setItem("gerantSettings", JSON.stringify(settings));
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
    alert("Paramètres sauvegardés avec succès !");
  };
  const [staffForm, setStaffForm] = useState({
    email: "",
    nom: "", // Only 'nom' field exists in backend, not separate 'prenom'
    telephone: "",
    password: "",
  });
  const [staffCreationNotice, setStaffCreationNotice] = useState("");
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 5.3417, lng: -4.0262 }); // Abidjan coordinates

  // Load staff accounts
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

  // Apply dark mode class to body
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("darkMode", "true");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("darkMode", "false");
    }
  }, [settings.darkMode]);

  const handleAddZone = () => {
    const zone = settings.newZone.trim();
    if (!zone) return;
    if (settings.zonesLivraison.includes(zone)) {
      alert("Cette zone existe déjà.");
      return;
    }
    setSettings((prev) => ({
      ...prev,
      zonesLivraison: [...prev.zonesLivraison, zone],
      newZone: "",
    }));
  };

  const handleRemoveZone = (zoneToRemove) => {
    setSettings((prev) => ({
      ...prev,
      zonesLivraison: prev.zonesLivraison.filter(
        (zone) => zone !== zoneToRemove,
      ),
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

      let successMessage = "Compte staff créé avec succès !";
      if (generatedPassword) {
        successMessage += ` Mot de passe temporaire : ${generatedPassword}`;
        setStaffCreationNotice(
          `Mot de passe temporaire généré : ${generatedPassword}. Transmets-le au nouveau staff.`,
        );
      } else {
        setStaffCreationNotice(
          "Le compte staff a été créé. Le mot de passe fourni est utilisé.",
        );
      }

      alert(successMessage);
      setStaffForm({ email: "", nom: "", telephone: "", password: "" });

      // Refresh staff list
      const staffRes = await staffAPI.getStaffAccounts(restaurantId);
      setStaffAccounts(staffRes.data || []);
    } catch (error) {
      console.error("Erreur création staff:", error);
      alert("Erreur lors de la création du compte staff");
    }
  };

  const handleToggleStaff = async (staffId, currentStatus) => {
    try {
      await staffAPI.toggleStaffAccount(restaurantId, staffId, {
        actif: !currentStatus,
      });
      alert(`Compte ${currentStatus ? "désactivé" : "activé"} avec succès!`);

      // Refresh staff list
      const staffRes = await staffAPI.getStaffAccounts(restaurantId);
      setStaffAccounts(staffRes.data || []);
    } catch (error) {
      console.error("Erreur activation/désactivation staff:", error);
      alert("Erreur lors de la modification du statut du compte");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-gray-800 text-lg">
          Paramètres & Configuration
        </h3>
        <p className="text-sm text-gray-600">
          Configurer les paramètres du restaurant
        </p>
      </div>

      {/* Mode Sombre */}
      <div className="bg-white rounded-2xl border border-sky-100 p-6">
        <h4 className="font-semibold text-gray-800 mb-4">Apparence</h4>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-800">Mode sombre</p>
            <p className="text-sm text-gray-600">
              Basculer entre thème clair et sombre
            </p>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`relative w-12 h-7 rounded-full transition-all ${
              settings.darkMode ? "bg-sky-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                settings.darkMode ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2 items-end">
        <button
          onClick={handleSaveSettings}
          className="px-4 py-2.5 bg-sky-500 text-white rounded-xl font-medium hover:bg-sky-600 transition"
        >
          Sauvegarder les paramètres
        </button>
        {settingsSaved && (
          <p className="text-sm text-emerald-600">
            Paramètres sauvegardés avec succès.
          </p>
        )}
      </div>

      {/* Horaires */}
      <div className="bg-white rounded-2xl border border-violet-100 p-6">
        <h4 className="font-semibold text-gray-800 mb-4">
          Horaires d'ouverture
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Ouverture
            </label>
            <input
              type="time"
              value={settings.horaires.ouverture}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  horaires: { ...prev.horaires, ouverture: e.target.value },
                }))
              }
              className="w-full px-4 py-2.5 bg-white border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Fermeture
            </label>
            <input
              type="time"
              value={settings.horaires.fermeture}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  horaires: { ...prev.horaires, fermeture: e.target.value },
                }))
              }
              className="w-full px-4 py-2.5 bg-white border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
            />
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Les commandes seront bloquées hors de ces horaires (RG-09)
        </p>
      </div>

      {/* Zones de livraison avec carte */}
      <div className="bg-white rounded-2xl border border-amber-100 p-6">
        <h4 className="font-semibold text-gray-800 mb-4">Zones de livraison</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={settings.newZone}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, newZone: e.target.value }))
                }
                placeholder="Ajouter une nouvelle zone..."
                className="flex-1 px-4 py-2.5 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <button
                onClick={handleAddZone}
                className="px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition"
              >
                Ajouter
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings.zonesLivraison.map((zone, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-full text-sm"
                >
                  {zone}
                  <button
                    onClick={() => handleRemoveZone(zone)}
                    className="text-gray-600 hover:text-amber-600 transition"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Validation d'adresse obligatoire pour le mode livraison (RG-09)
            </p>
          </div>
          <div>
            <h5 className="font-medium text-gray-800 mb-2">Carte des zones</h5>
            <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl h-64 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Intégration Google Maps</p>
                <p className="text-xs text-gray-500 mt-1">
                  Affichage des zones de livraison
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Coordonnées: {mapCenter.lat.toFixed(4)},{" "}
              {mapCenter.lng.toFixed(4)}
            </p>
          </div>
        </div>
      </div>

      {/* Gestion Staff */}
      <div className="bg-white rounded-2xl border border-violet-100 p-6">
        <h4 className="font-semibold text-gray-800 mb-4">
          Gestion des comptes Staff (RBAC)
        </h4>

        {/* Formulaire création staff */}
        <div className="mb-6 p-4 bg-violet-50 rounded-xl">
          <h5 className="font-medium text-gray-800 mb-3">
            Créer un nouveau compte Staff
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={staffForm.email}
                onChange={(e) =>
                  setStaffForm({ ...staffForm, email: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-white border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
                placeholder="staff@restaurant.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={staffForm.telephone}
                onChange={(e) =>
                  setStaffForm({ ...staffForm, telephone: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-white border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
                placeholder="+225 XX XX XX XX"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Nom complet *
              </label>
              <input
                type="text"
                value={staffForm.nom}
                onChange={(e) =>
                  setStaffForm({ ...staffForm, nom: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-white border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
                placeholder="Ex: Konan Aya"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Mot de passe (optionnel)
              </label>
              <input
                type="password"
                value={staffForm.password}
                onChange={(e) =>
                  setStaffForm({ ...staffForm, password: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-white border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
                placeholder="Laisser vide pour générer un mot de passe"
              />
              <p className="text-xs text-gray-500 mt-2">
                Si vous ne renseignez pas de mot de passe, un mot de passe temporaire sera généré automatiquement.
              </p>
            </div>
          </div>
          <button
            onClick={handleCreateStaff}
            className="mt-4 px-6 py-2.5 bg-violet-500 text-white rounded-xl font-medium hover:bg-violet-600 transition"
          >
            Créer le compte Staff
          </button>
          {staffCreationNotice && (
            <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-700">
              {staffCreationNotice}
            </div>
          )}
        </div>

        {/* Liste des comptes staff */}
        <div>
          <h5 className="font-medium text-gray-800 mb-3">
            Comptes Staff existants
          </h5>
          {loadingStaff ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : staffAccounts.length > 0 ? (
            <div className="space-y-3">
              {staffAccounts.map((staff) => (
                <div
                  key={staff.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-800">{staff.nom}</p>
                    <p className="text-sm text-gray-600">{staff.email}</p>
                    <p className="text-xs text-gray-500">
                      {staff.telephone || "Pas de téléphone"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        staff.actif
                          ? "bg-green-100 text-green-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {staff.actif ? "Actif" : "Inactif"}
                    </span>
                    <button
                      onClick={() => handleToggleStaff(staff.id, staff.actif)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        staff.actif
                          ? "bg-rose-500 text-white hover:bg-rose-600"
                          : "bg-green-500 text-white hover:bg-green-600"
                      }`}
                    >
                      {staff.actif ? "Désactiver" : "Activer"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-4">
              Aucun compte staff créé
            </p>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-4">
          RBAC strict: un seul rôle actif par utilisateur (RG-31)
        </p>
      </div>
    </div>
  );
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
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    activeOrders: 0,
    lowStockItems: 0,
    newCustomers: 0,
  });
  const [weeklyPerformance, setWeeklyPerformance] = useState({
    labels: [],
    orders: [],
    revenue: [],
  });
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const navigate = useNavigate();
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOverviewData = async () => {
      if (!restaurantId) return;
      try {
        setLoading(true);

        const [ordersRes, alertsRes, statsRes] = await Promise.all([
          commandesService.getAll({ restaurantId, limit: 50 }),
          stocksAPI.getAlerts({ restaurantId }),
          tresorerieAPI.getStats("day"),
        ]);

        const allOrders = ordersRes.data || [];
        const recent = allOrders.slice(0, 5);
        setRecentOrders(recent);

        const todayRevenue = allOrders.reduce((sum, order) => {
          const amount = Number(order.montantTotal ?? order.total ?? 0);
          return sum + (Number.isFinite(amount) ? amount : 0);
        }, 0);

        const activeOrders = allOrders.filter(
          (order) =>
            order.statut !== "LIVREE" &&
            order.statut !== "ANNULEE" &&
            order.statut !== "RECUE"
        ).length;

        const uniqueCustomers = new Set(
          allOrders
            .map((order) => order.client?.id)
            .filter((id) => !!id),
        ).size;

        setStats({
          todayOrders: allOrders.length,
          todayRevenue: statsRes.data?.caJour ?? todayRevenue,
          activeOrders,
          lowStockItems: alertsRes.data?.length ?? 0,
          newCustomers: uniqueCustomers,
        });

        setWeeklyPerformance(computeWeeklyPerformance(allOrders));
      } catch (error) {
        console.error("Erreur chargement données tableau de bord:", error);
      } finally {
        setLoading(false);
      }
    };

    loadOverviewData();
    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(loadOverviewData, 30000);
    return () => clearInterval(interval);
  }, [restaurantId]);

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
            borderColor: "#2563EB",
            backgroundColor: "rgba(37, 99, 235, 0.2)",
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: "#2563EB",
          },
          {
            label: "Revenus FCFA",
            data: weeklyPerformance.revenue,
            borderColor: "#059669",
            backgroundColor: "rgba(5, 150, 105, 0.18)",
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: "#059669",
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
            ticks: { color: "#334155" },
          },
          y: {
            position: "left",
            title: {
              display: true,
              text: "Commandes",
              color: "#334155",
            },
            ticks: { color: "#334155" },
          },
          y1: {
            position: "right",
            grid: { drawOnChartArea: false },
            title: {
              display: true,
              text: "Revenus",
              color: "#334155",
            },
            ticks: {
              color: "#334155",
              callback: (value) => `${value.toLocaleString()}`,
            },
          },
        },
        plugins: {
          legend: {
            position: "top",
            labels: { color: "#334155" },
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

      const response = await tresorerieAPI.getReceiptPdf(recentOrders[0].id);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recu-commande-${recentOrders[0]?.numero || "today"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      alert("Reçu PDF téléchargé avec succès!");
    } catch (error) {
      console.error("Erreur export PDF:", error);
      alert("Erreur lors de la génération du reçu PDF. Veuillez réessayer.");
    }
  };

  const handleExportSyscohada = async () => {
    try {
      const response = await tresorerieAPI.exportSyscohada("monthly");
      const blob = new Blob([response.data], {
        type: "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `syscohada-export-${restaurantId || "restaurant"}-monthly.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      alert("Export SYSCOHADA téléchargé avec succès!");
    } catch (error) {
      console.error("Erreur export SYSCOHADA:", error);
      alert("Erreur lors de l'export SYSCOHADA. Veuillez réessayer.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 rounded-3xl p-8 text-white shadow-lg">
        <h2 className="text-3xl font-bold mb-2">
          Bienvenue dans votre Restaurant!
        </h2>
        <p className="text-violet-100 text-lg">
          Gérez vos opérations en temps réel avec des outils puissants et
          intuitifs.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-2xl p-6 border border-violet-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-violet-700 font-medium">
                Commandes Aujourd'hui
              </p>
              <p className="text-2xl font-bold text-gray-800">
                {stats.todayOrders}
              </p>
            </div>
            <ClipboardList className="w-8 h-8 text-violet-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-700 font-medium">
                Chiffre d'Affaires
              </p>
              <p className="text-2xl font-bold text-gray-800">
                {stats.todayRevenue.toLocaleString()} FCFA
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-6 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700 font-medium">
                Commandes Actives
              </p>
              <p className="text-2xl font-bold text-gray-800">
                {stats.activeOrders}
              </p>
            </div>
            <ChefHat className="w-8 h-8 text-amber-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-2xl p-6 border border-rose-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-rose-700 font-medium">
                Alertes Stock
              </p>
              <p className="text-2xl font-bold text-gray-800">
                {stats.lowStockItems}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-sky-50 to-sky-100 rounded-2xl p-6 border border-sky-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-sky-700 font-medium">
                Nouveaux Clients
              </p>
              <p className="text-2xl font-bold text-gray-800">
                {stats.newCustomers}
              </p>
            </div>
            <Users className="w-8 h-8 text-sky-500" />
          </div>
        </div>
      </div>

      {/* Recent Orders & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-violet-100 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
            <h3 className="font-bold text-gray-800 text-lg">
              Dernières Commandes
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportPDF}
                disabled={recentOrders.length === 0}
                className="flex items-center gap-2 px-3 py-2 bg-violet-500 text-white rounded-lg text-sm hover:bg-violet-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
              <button
                onClick={handleExportSyscohada}
                disabled={!restaurantId}
                className="flex items-center gap-2 px-3 py-2 bg-sky-500 text-white rounded-lg text-sm hover:bg-sky-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export SYSCOHADA
              </button>
            </div>
          </div>
          {recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-violet-50 rounded-xl"
                >
                  <div>
                    <p className="font-medium text-gray-800">
                      Commande #{order.numero}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleTimeString("fr-FR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-violet-600">
                      {Number(order.total).toLocaleString()} FCFA
                    </p>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.statut === "READY"
                          ? "bg-green-100 text-green-800"
                          : order.statut === "PREPARING"
                            ? "bg-amber-100 text-amber-800"
                            : order.statut === "CONFIRMED"
                              ? "bg-violet-100 text-violet-800"
                              : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {order.statut}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-4">
              Aucune commande récente
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-emerald-100 p-6">
          <h3 className="font-bold text-gray-800 text-lg mb-4">
            Actions Rapides
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button
            onClick={() => navigate('/gerant?tab=menu')}
            className="flex flex-col items-center gap-2 p-4 bg-violet-50 rounded-xl hover:bg-violet-100 transition border border-violet-200"
          >
            <Package className="w-6 h-6 text-violet-600" />
            <span className="text-sm font-medium text-gray-800">Menu</span>
          </button>
          <button
            onClick={() => navigate('/gerant?tab=orders')}
            className="flex flex-col items-center gap-2 p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition border border-amber-200"
          >
            <ClipboardList className="w-6 h-6 text-amber-600" />
            <span className="text-sm font-medium text-gray-800">
              Commandes
            </span>
          </button>
          <button
            onClick={() => navigate('/gerant?tab=stocks')}
            className="flex flex-col items-center gap-2 p-4 bg-rose-50 rounded-xl hover:bg-rose-100 transition border border-rose-200"
          >
            <AlertTriangle className="w-6 h-6 text-rose-600" />
            <span className="text-sm font-medium text-gray-800">Stocks</span>
          </button>
          <button
            onClick={() => navigate('/gerant?tab=finance')}
            className="flex flex-col items-center gap-2 p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition border border-emerald-200"
          >
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            <span className="text-sm font-medium text-gray-800">
              Trésorerie
            </span>
          </button>
          </div>
        </div>
      </div>

      {/* Performance Chart Placeholder */}
      <div className="bg-white rounded-2xl border border-sky-100 p-6">
        <h3 className="font-bold text-gray-800 text-lg mb-4">
          Performance Hebdomadaire
        </h3>
        <div className="rounded-2xl bg-sky-50 p-4">
          <canvas ref={chartRef} className="h-72 w-full" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="rounded-2xl bg-white p-4 border border-sky-100 shadow-sm">
            <p className="font-medium text-gray-800">Commandes cette semaine</p>
            <p className="text-2xl font-semibold text-sky-700">
              {weeklyPerformance.orders.reduce((sum, value) => sum + value, 0)}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 border border-sky-100 shadow-sm">
            <p className="font-medium text-gray-800">Revenus cette semaine</p>
            <p className="text-2xl font-semibold text-sky-700">
              {weeklyPerformance.revenue
                .reduce((sum, value) => sum + value, 0)
                .toLocaleString()} FCFA
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN DASHBOARD COMPONENT ====================
export default function GerantDashboard({ restaurantId, token }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get("tab") || "overview";
  const { user } = JSON.parse(localStorage.getItem("user") || "{}");

  // Render the appropriate tab based on URL parameter
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
      <div className="bg-gradient-to-b from-[#FFF5EB] via-[#F9F7F5] to-white rounded-3xl p-6 shadow-sm">
        {renderTabContent()}
      </div>
    </div>
  );
}