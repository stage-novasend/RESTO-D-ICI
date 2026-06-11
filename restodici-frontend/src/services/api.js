// src/services/api.js
import axios from "axios";
import { resolveFrontendApiAndSocketBase } from "./backend-endpoints.js";

const { apiBaseUrl: API_URL } = resolveFrontendApiAndSocketBase({
  viteApiUrl: import.meta.env.VITE_API_URL,
  browserOrigin: window.location.origin,
});

// Instance Axios partagée — baseURL + token JWT injecté automatiquement
export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// Injecte le token JWT sur chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Sur 401 : vide la session et redirige vers /login (sauf si déjà dessus)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);

// ── Helpers privés ────────────────────────────────────────────────────────────

const _UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const _isUUID = (v) => typeof v === "string" && _UUID_RE.test(v.trim());

// Lit le restaurantId depuis le user en cache (fallback localStorage)
function _getStoredRestaurantId() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const rid  = user?.restaurant?.id ?? localStorage.getItem("currentRestaurantId");
    return _isUUID(rid) ? rid : null;
  } catch {
    return null;
  }
}

// Enrichit un payload avec restaurantId si absent
function _withRestaurantId(data) {
  const payload = { ...data };
  if (!payload.restaurantId) {
    const rid = _getStoredRestaurantId();
    if (rid) payload.restaurantId = rid;
  }
  return payload;
}

// ── Menu ─────────────────────────────────────────────────────────────────────

export const menuAPI = {
  getAll: (params) => api.get("/menu", { params }),
  // Alias maintenu pour les fichiers qui utilisent menuAPI.get(...)
  get: (params) => menuAPI.getAll(params),

  getRestaurants: () => api.get("/menu/restaurants"),

  getByRestaurant: (restaurantId, params = {}) =>
    api.get(`/menu/restaurant/${restaurantId}`, { params }),

  getCategories: ({ restaurantId } = {}) =>
    api.get("/menu/categories", {
      params: restaurantId ? { restaurantId } : undefined,
    }),

  createCategorie: (data) => api.post("/menu/categories", _withRestaurantId(data)),
  // Alias anglais
  createCategory: (data) => menuAPI.createCategorie(data),

  createArticle: (data) => api.post("/menu/articles", _withRestaurantId(data)),

  toggleArticle: (id, disponible) =>
    api.patch(`/menu/articles/${id}/disponible`, { disponible }),

  updateArticle: (id, data) => api.put(`/menu/articles/${id}`, data),

  deleteArticle: (id) => api.delete(`/menu/articles/${id}`),
};

// ── Commandes ─────────────────────────────────────────────────────────────────

export const commandesService = {
  getAll: (params) => api.get("/commandes", { params }),

  create: (data) => {
    const payload = _withRestaurantId(data);
    // Retire restaurantId s'il n'est pas un UUID valide
    if (payload.restaurantId && !_isUUID(payload.restaurantId)) {
      delete payload.restaurantId;
    }
    return api.post("/commandes", payload);
  },

  findOne: (id) => api.get(`/commandes/${id}`),

  updateStatus: (id, statut) => api.patch(`/commandes/${id}/statut`, { statut }),
  // Alias francophone conservé (utilisé dans KDSPage, StaffDashboard, KDSStaff)
  updateStatut: (id, statut) => commandesService.updateStatus(id, statut),

  getKDS: () => api.get("/commandes/kds"),

  getMyOrders: () => api.get("/commandes/me"),

  getRecentOrders: (restaurantId, limit = 50) =>
    api.get("/commandes", { params: { restaurantId, limit } }),

  getReceiptPdf: (id) =>
    api.get(`/commandes/${id}/receipt/pdf`, { responseType: "blob" }),

  addAvis: (id, data) => api.post(`/commandes/${id}/avis`, data),
  getAvis: (id)       => api.get(`/commandes/${id}/avis`),

  getCommandeHistory: (id) => api.get(`/commandes/${id}/history`),

  registerPayment: (id, data) => api.patch(`/commandes/${id}/paiement`, data),

  getRestaurantActivity: (limit = 50) =>
    api.get("/commandes/activity/restaurant", { params: { limit } }),
};

// ── Stocks ────────────────────────────────────────────────────────────────────

export const stocksAPI = {
  getAll: (params) => api.get("/stocks", { params }),

  getAlerts: (params) => api.get("/stocks/alerts", { params }),

  adjust: (id, quantity, motif = "") =>
    api.patch(`/stocks/${id}/adjust`, { quantity, motif }),

  entreeStock: (id, quantity, fournisseurId, motif = "") =>
    api.post(`/stocks/${id}/entree`, { quantity, fournisseurId, motif }),

  getRapportEcarts: (restaurantId) =>
    api.get("/stocks/rapport-ecarts", { params: { restaurantId } }),
};

// ── B2B ───────────────────────────────────────────────────────────────────────

export const b2bAPI = {
  // Dashboard
  getDashboard: () => api.get("/b2b/dashboard"),

  // Compte entreprise
  getCompte:     ()                    => api.get("/b2b/compte"),
  createCompte:  (data)                => api.post("/b2b/compte", data),
  updateCompte:  (data)                => api.patch("/b2b/compte", data),
  validerCompte: (compteId, approved)  => api.put(`/b2b/compte/${compteId}/valider`, { approved }),

  // Collaborateurs
  getCollaborateurs:       ()          => api.get("/b2b/collaborateurs"),
  createCollaborateur:     (data)      => api.post("/b2b/collaborateurs", data),
  updateCollaborateur:     (id, data)  => api.patch(`/b2b/collaborateurs/${id}`, data),
  getCollaborateurSolde:   (id)        => api.get(`/b2b/collaborateurs/${id}/solde`),
  deleteCollaborateur:     (id)        => api.delete(`/b2b/collaborateurs/${id}`),
  // Alias legacy (endpoint anglais)
  getCollaborators:        ()          => api.get("/b2b/collaborators"),
  createCollaborator:      (data)      => api.post("/b2b/collaborators", data),

  // Commandes groupées
  createCommandeGroupee:          (data)          => api.post("/b2b/commandes-groupees", data),
  getCommandesGroupees:           ()              => api.get("/b2b/commandes-groupees"),
  getCommandeGroupeeDetail:       (id)            => api.get(`/b2b/commandes-groupees/${id}`),
  updateCommandeGroupeeStatut:    (id, statut)    => api.patch(`/b2b/commandes-groupees/${id}/statut`, { statut }),
  confirmerPaiementB2B:           (id)            => api.patch(`/b2b/commandes-groupees/${id}/paiement`),
  annulerCommandeGroupee:         (id)            => api.patch(`/b2b/commandes-groupees/${id}/annuler`),
  submitAvis:                     (id, data)      => api.post(`/b2b/commandes-groupees/${id}/avis`, data),
  getRestaurantKDS:               ()              => api.get("/b2b/restaurant-kds"),

  // Legacy
  bulkOrder:       (data) => api.post("/b2b/bulk-orders", data),
  getOrders:       ()     => api.get("/b2b/orders"),
  getManagerOrders:()     => api.get("/b2b/orders/management"),
  getInvoices:     ()     => api.get("/b2b/invoices"),

  // Factures mensuelles
  getFacturesMensuelles: ()           => api.get("/b2b/factures-mensuelles"),
  payerFacture:          (id)         => api.post(`/b2b/factures-mensuelles/${id}/payer`),
  initierPaiement:       (id)         => api.post(`/b2b/factures-mensuelles/${id}/initier-paiement`),
  seedFactureTest:       ()           => api.post("/b2b/factures-mensuelles/test-seed"),
  contesterFacture:      (id, motif)  => api.post(`/b2b/factures-mensuelles/${id}/contester`, { motif }),
  exportSyscohadaCsv:    (id)         => api.get(`/b2b/factures-mensuelles/${id}/export-syscohada`),

  // Invitations collaborateur (endpoint public — token dans l'URL, pas dans le header)
  getInvitation:   (token)        => api.get(`/b2b/invitations/${token}`),
  acceptInvitation:(token, data)  => api.post(`/b2b/invitations/${token}/accept`, data),

  // Plans repas récurrents
  getPlansRepas:    ()              => api.get("/b2b/plans-repas"),
  createPlanRepas:  (data)          => api.post("/b2b/plans-repas", data),
  togglePlanRepas:  (id)            => api.patch(`/b2b/plans-repas/${id}/toggle`),
  deletePlanRepas:  (id)            => api.delete(`/b2b/plans-repas/${id}`),

  // Audit & rapports
  getAuditLogs: () => api.get("/b2b/audit-logs"),
  getReports:   () => api.get("/b2b/reports"),
};

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authAPI = {
  login:              (credentials)           => api.post("/auth/login", credentials),
  register:           (data)                  => api.post("/auth/register", data),
  me:                 ()                      => api.get("/auth/me"),
  updateProfile:      (data)                  => api.patch("/auth/me", data),
  logout:             ()                      => api.post("/auth/logout"),
  changePassword:     (data)                  => api.patch("/auth/change-password", data),
  setup2FA:           ()                      => api.post("/auth/2fa/setup"),
  enable2FA:          (code)                  => api.post("/auth/2fa/enable", { code }),
  disable2FA:         ()                      => api.post("/auth/2fa/disable"),
  verify2FALogin:     (tempToken, code)       => api.post("/auth/2fa/verify-login", { tempToken, code }),
  verifyEmail:        (token)                 => api.post("/auth/verify-email", { token }),
  resendVerification: (email)                 => api.post("/auth/resend-verification", { email }),
  forgotPassword:     (email)                 => api.post("/auth/forgot-password", { email }),
  resetPassword:      (token, newPassword)    => api.post("/auth/reset-password", { token, newPassword }),
};

// ── Trésorerie ────────────────────────────────────────────────────────────────

export const tresorerieAPI = {
  getStats: (period = "day") =>
    api.get("/tresorerie/stats", { params: { period } }),

  getReceiptPdf: (commandeId) =>
    api.get(`/tresorerie/receipt/${commandeId}/pdf`, { responseType: "blob" }),

  exportSyscohada: (period = "monthly") =>
    api.get("/tresorerie/export/syscohada", { params: { period }, responseType: "blob" }),

  recordExpense: (data) => api.post("/tresorerie/expenses", data),

  generateReport: (period = "monthly") =>
    api.get("/tresorerie/reports", { params: { period } }),

  configureBudgetAlerts: (config) =>
    api.post("/tresorerie/budget-alerts", config),
};

// ── Restaurant ────────────────────────────────────────────────────────────────

export const restaurantAPI = {
  getMine:  ()                    => api.get("/restaurants/me/profile"),
  update:   (restaurantId, data)  => api.patch(`/restaurants/${restaurantId}`, data),
};

// ── Admin ─────────────────────────────────────────────────────────────────────

export const adminAPI = {
  getStats:           ()              => api.get("/admin/stats"),
  getChartData:       ()              => api.get("/admin/stats/charts"),
  getUsers:           (params)        => api.get("/admin/users", { params }),
  createUser:         (data)          => api.post("/admin/users", data),
  updateUser:         (id, data)      => api.patch(`/admin/users/${id}`, data),
  toggleUser:         (id)            => api.patch(`/admin/users/${id}/toggle`),
  getRestaurants:     ()              => api.get("/admin/restaurants"),
  createRestaurant:   (data)          => api.post("/admin/restaurants", data),
  updateRestaurant:   (id, data)      => api.patch(`/admin/restaurants/${id}`, data),
  toggleRestaurant:   (id)            => api.patch(`/admin/restaurants/${id}/toggle`),
  getAuditLogs:       (params)        => api.get("/admin/audit-logs", { params }),
  exportSyscohada:    (period)        => api.get("/admin/exports/syscohada", { params: { period }, responseType: "blob" }),
  exportAudit:        (params)        => api.get("/admin/exports/audit", { params, responseType: "blob" }),
  getPendingB2B:      ()              => api.get("/admin/b2b/pending"),
  validateB2B:        (id, approved)  => api.patch(`/admin/b2b/${id}/valider`, { approved }),
  getConfig:          ()              => api.get("/admin/config"),
  setConfig:          (key, value)    => api.patch(`/admin/config/${key}`, { value }),
  changePassword:     (cur, next)     => api.patch("/admin/change-password", { currentPassword: cur, newPassword: next }),
  getIntegrations:    ()              => api.get("/admin/integrations"),
  createIntegration:  (data)          => api.post("/admin/integrations", data),
  updateIntegration:  (id, data)      => api.patch(`/admin/integrations/${id}`, data),
  deleteIntegration:  (id)            => api.delete(`/admin/integrations/${id}`),
  testIntegration:    (id)            => api.post(`/admin/integrations/${id}/test`),
  getSystemMetrics:   ()              => api.get("/admin/system-metrics"),
  getCommissions:     ()              => api.get("/admin/commissions"),
  updateTauxCommission:(id, taux)     => api.patch(`/admin/restaurants/${id}/commission`, { taux }),
  getBackups:         ()              => api.get("/admin/backup/list"),
  runBackup:          ()              => api.post("/admin/backup/run"),
};

// ── Paiements digitaux (NovaSend) ─────────────────────────────────────────────

export const paiementsAPI = {
  // POST /paiements/initier → { sessionId, paymentUrl?, simulated }
  initier: (data) => api.post("/paiements/initier", data),
  // POST /paiements/simuler — déclenche le webhook en dev uniquement
  simuler: (data) => api.post("/paiements/simuler", data),
};

// ── Uploads ───────────────────────────────────────────────────────────────────

export const uploadsAPI = {
  // Ne pas forcer Content-Type manuellement : le navigateur ajoute automatiquement
  // le boundary correct pour multipart/form-data. Le forcer casse l'upload.
  uploadImage: (file) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/uploads/image", form);
  },
  getStatus: () => api.get("/uploads/status"),
};

// ── Promos ────────────────────────────────────────────────────────────────────

export const promosAPI = {
  getAll:   ()              => api.get("/promos"),
  create:   (data)          => api.post("/promos", data),
  update:   (id, data)      => api.patch(`/promos/${id}`, data),
  toggle:   (id)            => api.patch(`/promos/${id}/toggle`),
  remove:   (id)            => api.delete(`/promos/${id}`),
  validate: (code, restaurantId, montantCommande) =>
    api.post("/promos/validate", { code, restaurantId, montantCommande }),
  getActives: (restaurantId) =>
    api.get("/menu/promos-actives", { params: { restaurantId } }),
};

// ── Staff ─────────────────────────────────────────────────────────────────────

export const staffAPI = {
  getStaffAccounts:   (restaurantId)              => api.get(`/restaurants/${restaurantId}/staff`),
  createStaffAccount: (restaurantId, data)        => api.post(`/restaurants/${restaurantId}/staff`, data),
  toggleStaffAccount: (restaurantId, id, data)    => api.put(`/restaurants/${restaurantId}/staff/${id}`, data),
};

// ── Fournisseurs ──────────────────────────────────────────────────────────────

export const fournisseursAPI = {
  getAll:   ()          => api.get("/fournisseurs"),
  // Filtre côté client — à remplacer par ?actif=true dès que l'endpoint le supporte
  getActifs:()          => api.get("/fournisseurs").then((r) => ({ ...r, data: r.data.filter((f) => f.actif) })),
  create:   (data)      => api.post("/fournisseurs", data),
  update:   (id, data)  => api.patch(`/fournisseurs/${id}`, data),
  toggle:   (id)        => api.patch(`/fournisseurs/${id}/toggle`),
  remove:   (id)        => api.delete(`/fournisseurs/${id}`),
};

// ── Commandes — extras ────────────────────────────────────────────────────────

export const commandesExtraAPI = {
  rembourser: (id, motif) => api.patch(`/commandes/${id}/rembourser`, { motif }),
};
