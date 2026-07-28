/* MenuTab — extrait de GerantDashboard */
import { useEffect, useState } from "react";
import { Package, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { menuAPI, uploadsAPI } from "../../../services/api";
import { getArticleImage } from "../../../utils/articleImage";
import { formatFCFA } from "../../../utils/formatters";

export default function MenuTab({ restaurantId, token }) {
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
      errors.prix = "Prix > 0 requis";
    if (!newArticle.categorieId)
      errors.categorieId = "Catégorie requise";
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
        <div className="h-9 w-9 rounded-full border-4 border-[#EA580C] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF0DF] px-3 py-1 text-xs font-medium text-[#EA580C]">
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
              <span className="rounded-full bg-[#FFF0DF] px-3 py-1.5 text-[#EA580C]">
                {categories.length} catégorie(s)
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowCategoryForm(!showCategoryForm)}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#EA580C] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C2410C]"
            >
              <Plus className="h-4 w-4" />
              {showCategoryForm ? "Fermer catégorie" : "Nouvelle catégorie"}
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#EA580C] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C2410C]"
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
              <label className="mb-1.5 block text-sm font-semibold text-[#1A0C00]">
                Nom de la catégorie *
              </label>
              <input
                type="text"
                value={newCategory.nom}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, nom: e.target.value })
                }
                className={`w-full rounded-2xl border bg-white px-4 py-4 text-[15px] outline-none transition focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] ${categoryErrors.nom ? "border-red-500" : "border-[#E2E8F0]"}`}
                placeholder="Ex: Plats Principaux"
              />
              {categoryErrors.nom && (
                <p className="mt-1 text-xs text-red-500">{categoryErrors.nom}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#1A0C00]">
                Icône
              </label>
              <input
                type="text"
                value={newCategory.icone}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, icone: e.target.value })
                }
                className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-4 text-[15px] outline-none transition focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C]"
                placeholder="Ex: 🍽️"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleCreateCategory}
              className="rounded-2xl bg-[#EA580C] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#C2410C]"
            >
              Créer la catégorie
            </button>
            <button
              onClick={() => {
                setShowCategoryForm(false);
                setCategoryErrors({});
              }}
              className="rounded-2xl border border-[#E2E8F0] bg-white px-6 py-3 font-semibold text-[#1A0C00] transition hover:bg-[#FFF0DF]"
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
              <label className="mb-1.5 block text-sm font-semibold text-[#1A0C00]">Nom *</label>
              <input
                type="text"
                value={newArticle.nom}
                onChange={(e) =>
                  setNewArticle({ ...newArticle, nom: e.target.value })
                }
                className={`w-full rounded-2xl border bg-white px-4 py-4 text-[15px] outline-none transition focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] ${formErrors.nom ? "border-red-500" : "border-[#E2E8F0]"}`}
                placeholder="Ex: Attiéké Poisson"
              />
              {formErrors.nom && <p className="mt-1 text-xs text-red-500">{formErrors.nom}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#1A0C00]">Prix (FCFA) *</label>
              <input
                type="number"
                min="1"
                value={newArticle.prix}
                onChange={(e) =>
                  setNewArticle({ ...newArticle, prix: e.target.value })
                }
                className={`w-full rounded-2xl border bg-white px-4 py-4 text-[15px] outline-none transition focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] ${formErrors.prix ? "border-red-500" : "border-[#E2E8F0]"}`}
                placeholder="Ex: 3500"
              />
              {formErrors.prix && <p className="mt-1 text-xs text-red-500">{formErrors.prix}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#1A0C00]">Catégorie *</label>
              <select
                value={newArticle.categorieId}
                onChange={(e) =>
                  setNewArticle({ ...newArticle, categorieId: e.target.value })
                }
                className={`w-full rounded-2xl border bg-white px-4 py-4 text-[15px] outline-none transition focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] ${formErrors.categorieId ? "border-red-500" : "border-[#E2E8F0]"}`}
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
              <label className="mb-1.5 block text-sm font-semibold text-[#1A0C00]">Stock initial</label>
              <input
                type="number"
                min="0"
                value={newArticle.stock}
                onChange={(e) =>
                  setNewArticle({ ...newArticle, stock: e.target.value })
                }
                className={`w-full rounded-2xl border bg-white px-4 py-4 text-[15px] outline-none transition focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] ${formErrors.stock ? "border-red-500" : "border-[#E2E8F0]"}`}
                placeholder="Ex: 50"
              />
              {formErrors.stock && <p className="mt-1 text-xs text-red-500">{formErrors.stock}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-[#1A0C00]">Photo de l'article</label>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newArticle.photoUrl}
                    onChange={(e) =>
                      setNewArticle({ ...newArticle, photoUrl: e.target.value })
                    }
                    className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-4 text-[15px] outline-none transition focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C]"
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
            <label className="mb-1.5 block text-sm font-semibold text-[#1A0C00]">Description</label>
            <textarea
              value={newArticle.description}
              onChange={(e) =>
                setNewArticle({ ...newArticle, description: e.target.value })
              }
              className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-4 text-[15px] outline-none transition focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C]"
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
                className="accent-[#EA580C] h-4 w-4" />
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
              className="rounded-2xl bg-[#EA580C] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#C2410C]"
            >
              Créer l'article
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setFormErrors({});
              }}
              className="rounded-2xl border border-[#E2E8F0] bg-white px-6 py-3 font-semibold text-[#1A0C00] transition hover:bg-[#FFF0DF]"
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
            className="w-full rounded-2xl border border-[#E2E8F0] bg-white py-3 pl-10 pr-4 outline-none transition focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C]"
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
                        <span className="text-lg font-bold text-[#EA580C]">{formatFCFA(Number(a.prixPromo))}</span>
                        <span className="text-sm text-[#8B6E50] line-through">{formatFCFA(Number(a.prix || 0))}</span>
                        <span className="rounded-full bg-[#EA580C] px-2 py-0.5 text-[10px] font-bold text-white">PROMO</span>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-[#1C1917]">{formatFCFA(Number(a.prix || 0))}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleDisponibilite(a.id, !a.disponible)}
                    className={`relative h-8 w-14 rounded-full transition-all ${a.disponible ? "bg-[#EA580C]" : "bg-[#D1CBC5]"}`}
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
            <Package className="w-12 h-12 mb-3" style={{ color: '#EA580C', opacity: 0.4 }} />
            <p className="text-sm font-medium" style={{ color: '#1A0C00' }}>Aucun article pour l'instant</p>
            <p className="text-xs mt-1" style={{ color: '#A89070' }}>Ajoutez votre premier article au menu pour commencer.</p>
          </div>
        )}
      </div>

      {/* ── Edit Article Modal ── */}
      {editArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && setEditArticle(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-[#EA580C] px-6 py-4 flex items-center justify-between">
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
                    className="w-full bg-[#FFF0DF] border-0 rounded-xl px-3 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#EA580C]/40" />
                </div>
              ))}
              {/* Photo article */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#1A1A1A]">Photo de l'article</label>
                <div className="flex gap-3 items-start">
                  <div className="flex-1 space-y-2">
                    <input type="text" value={editArticle.photoUrl || ''} onChange={e => setEditArticle(p => ({ ...p, photoUrl: e.target.value }))}
                      placeholder="URL de la photo" className="w-full bg-[#FFF0DF] border-0 rounded-xl px-3 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#EA580C]/40" />
                    <label className={`flex items-center gap-2 cursor-pointer text-xs font-semibold px-3 py-2 rounded-xl border border-dashed border-[#EA580C]/40 text-[#EA580C] hover:bg-[#FFF0DF] transition ${uploadingEdit ? 'opacity-60 pointer-events-none' : ''}`}>
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
                  className="w-full bg-[#FFF0DF] border-0 rounded-xl px-3 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#EA580C]/40">
                  <option value="">Sélectionner…</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              {/* Prix promo */}
              <div className="rounded-xl bg-[#FFF0DF] p-3 space-y-2">
                <p className="text-xs font-bold text-[#EA580C] uppercase tracking-wide">Prix promotionnel (optionnel)</p>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1A1A1A]">Prix promo (F CFA)</label>
                  <input type="number" min="0" value={editArticle.prixPromo || ''} onChange={e => setEditArticle(p => ({ ...p, prixPromo: e.target.value }))}
                    placeholder="Ex : 2 500"
                    className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#EA580C]/40" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="edit-promo-actif" checked={!!editArticle.promoActif}
                    onChange={e => setEditArticle(p => ({ ...p, promoActif: e.target.checked }))} />
                  <label htmlFor="edit-promo-actif" className="text-sm font-semibold text-[#EA580C]">Activer le prix promo</label>
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
                className="w-full py-3 rounded-2xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-sm flex items-center justify-center gap-2">
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
