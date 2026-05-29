// src/services/api.js
import axios from "axios";
import { resolveFrontendApiAndSocketBase } from "./backend-endpoints.js";

const { apiBaseUrl: API_URL } = resolveFrontendApiAndSocketBase({
  viteApiUrl: import.meta.env.VITE_API_URL,
  browserOrigin: window.location.origin,
});

// CRITIQUE : Créer l'instance axios AVANT d'utiliser les interceptors
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 secondes
});

//  Injecter token JWT automatiquement (RG-35)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

//  Gérer expiration/refresh 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Ne pas rediriger brutalement si on est déjà sur /login
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);

// ===== SERVICES MÉTIERS (structurés pour NestJS + isolation multi-tenant) =====

export const menuAPI = {
  // GET /menu?cible=CLIENT&restaurantId=xxx
  get: (params) => api.get("/menu", { params }),
  getAll: (params) => api.get("/menu", { params }),
  getRestaurants: () => api.get("/menu/restaurants"),
  getByRestaurant: (restaurantId, params = {}) =>
    api.get(`/menu/restaurant/${restaurantId}`, { params }),

  // Récupérer les catégories d'un restaurant (pour création article)
  getCategories: ({ restaurantId }) =>
    api.get("/menu/categories", {
      params: restaurantId ? { restaurantId } : undefined,
    }),

  // POST /menu/categories — avec restaurantId pour isolation (RG-31)
  createCategorie: (data) => {
    const payload = { ...data };
    if (!payload.restaurantId) {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user?.restaurant?.id) payload.restaurantId = user.restaurant.id;
        } catch {
          // Ignore malformed cached user data.
        }
      }
    }
    return api.post("/menu/categories", payload);
  },
  createCategory: (data) => menuAPI.createCategorie(data),

  // POST /menu/articles — avec restaurantId pour isolation (RG-31)
  createArticle: (data) => {
    const payload = { ...data };
    if (!payload.restaurantId) {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user?.restaurant?.id) payload.restaurantId = user.restaurant.id;
        } catch {
          // Ignore malformed cached user data.
        }
      }
    }
    return api.post("/menu/articles", payload);
  },

  // PATCH /menu/articles/:id/disponible
  toggleArticle: (id, dispo) =>
    api.patch(`/menu/articles/${id}/disponible`, { disponible: dispo }),

  // PUT /menu/articles/:id
  updateArticle: (id, data) => api.put(`/menu/articles/${id}`, data),

  // DELETE /menu/articles/:id
  deleteArticle: (id) => api.delete(`/menu/articles/${id}`),
};

const _UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const _isUUID = (v) => typeof v === 'string' && _UUID_RE.test(v.trim());

export const commandesService = {
  // GET /commandes?restaurantId=xxx&limit=50
  getAll: (params) => api.get("/commandes", { params }),

  // POST /commandes — création avec restaurantId (UUID-validated)
  create: (data) => {
    const payload = { ...data };
    if (!_isUUID(payload.restaurantId)) {
      delete payload.restaurantId;
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const rid = user?.restaurant?.id ?? localStorage.getItem("currentRestaurantId");
        if (_isUUID(rid)) payload.restaurantId = rid;
      } catch {
        // Ignore malformed cached user data.
      }
    }
    return api.post("/commandes", payload);
  },

  // PATCH /commandes/:id/statut
  updateStatus: (id, statut) =>
    api.patch(`/commandes/${id}/statut`, { statut }),
  updateStatut: (id, statut) =>
    api.patch(`/commandes/${id}/statut`, { statut }),

  // GET /commandes/:id — détail d'une commande
  findOne: (id) => api.get(`/commandes/${id}`),

  // GET /commandes/kds — interface cuisine (staff/gerant)
  getKDS: () => api.get("/commandes/kds"),

  // GET /commandes/me — historique client
  getMyOrders: () => api.get("/commandes/me"),
  getReceiptPdf: (id) =>
    api.get(`/commandes/${id}/receipt/pdf`, {
      responseType: "blob",
    }),
  getRecentOrders: (restaurantId, limit = 50) =>
    api.get("/commandes", { params: { restaurantId, limit } }),

  // POST /commandes/:id/avis — laisser un avis après livraison
  addAvis: (id, data) => api.post(`/commandes/${id}/avis`, data),

  // GET /commandes/:id/avis
  getAvis: (id) => api.get(`/commandes/${id}/avis`),

  // GET /commandes/:id/history — audit timeline for one order
  getCommandeHistory: (id) => api.get(`/commandes/${id}/history`),

  // GET /commandes/activity/restaurant — recent status changes for gérant/staff
  getRestaurantActivity: (limit = 50) =>
    api.get('/commandes/activity/restaurant', { params: { limit } }),
};

export const stocksAPI = {
  // GET /stocks/alerts?restaurantId=xxx
  getAlerts: (params) => api.get("/stocks/alerts", { params }),

  // PATCH /stocks/:id/adjust — ajustement manuel (casse, correction)
  adjust: (id, quantity, motif = "") =>
    api.patch(`/stocks/${id}/adjust`, { quantity, motif }),

  // POST /stocks/:id/entree — réception marchandise (RG-24, fournisseurId obligatoire)
  entreeStock: (id, quantity, fournisseurId, motif = "") =>
    api.post(`/stocks/${id}/entree`, { quantity, fournisseurId, motif }),

  // GET /stocks — inventaire complet
  getAll: (params) => api.get("/stocks", { params }),
};

export const b2bAPI = {
  // Dashboard
  getDashboard: () => api.get("/b2b/dashboard"),

  // Compte entreprise
  getCompte: () => api.get("/b2b/compte"),
  createCompte: (data) => api.post("/b2b/compte", data),
  updateCompte: (data) => api.patch("/b2b/compte", data),
  validerCompte: (compteId, approved) => api.put(`/b2b/compte/${compteId}/valider`, { approved }),

  // Collaborateurs (new system with budget)
  getCollaborateurs: () => api.get("/b2b/collaborateurs"),
  createCollaborateur: (data) => api.post("/b2b/collaborateurs", data),
  getCollaborateurSolde: (id) => api.get(`/b2b/collaborateurs/${id}/solde`),
  deleteCollaborateur: (id) => api.delete(`/b2b/collaborateurs/${id}`),

  // Legacy collaborators (backward compat)
  getCollaborators: () => api.get("/b2b/collaborators"),
  createCollaborator: (data) => api.post("/b2b/collaborators", data),

  // Commandes groupées
  createCommandeGroupee: (data) => api.post("/b2b/commandes-groupees", data),
  getCommandesGroupees: () => api.get("/b2b/commandes-groupees"),

  // Staff/Gérant KDS for B2B orders
  getRestaurantKDS: () => api.get("/b2b/restaurant-kds"),
  updateCommandeGroupeeStatut: (id, statut) => api.patch(`/b2b/commandes-groupees/${id}/statut`, { statut }),

  // Bulk orders (legacy)
  bulkOrder: (data) => api.post("/b2b/bulk-orders", data),

  // All orders (bulk + groupées)
  getOrders: () => api.get("/b2b/orders"),
  getManagerOrders: () => api.get("/b2b/orders/management"),

  // Factures mensuelles (new)
  getFacturesMensuelles: () => api.get("/b2b/factures-mensuelles"),
  payerFacture: (id) => api.post(`/b2b/factures-mensuelles/${id}/payer`),

  // Legacy invoices
  getInvoices: () => api.get("/b2b/invoices"),

  // Commande groupée — détail + avis
  getCommandeGroupeeDetail: (id) => api.get(`/b2b/commandes-groupees/${id}`),
  submitAvis: (id, data) => api.post(`/b2b/commandes-groupees/${id}/avis`, data),

  // Invitations collaborateur (public — pas besoin de token dans le header)
  getInvitation: (token) => api.get(`/b2b/invitations/${token}`),
  acceptInvitation: (token, data) => api.post(`/b2b/invitations/${token}/accept`, data),

  // Audit logs
  getAuditLogs: () => api.get("/b2b/audit-logs"),

  // Reports
  getReports: () => api.get("/b2b/reports"),
};

export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (data) => api.post("/auth/register", data),
  me: () => api.get("/auth/me"),
  updateProfile: (data) => api.patch("/auth/me", data),
  logout: () => api.post("/auth/logout"),
  changePassword: (data) => api.patch("/auth/change-password", data),
  setup2FA: () => api.post("/auth/2fa/setup"),
  enable2FA: (code) => api.post("/auth/2fa/enable", { code }),
  disable2FA: () => api.post("/auth/2fa/disable"),
  verify2FALogin: (tempToken, code) => api.post("/auth/2fa/verify-login", { tempToken, code }),
  verifyEmail: (token) => api.post("/auth/verify-email", { token }),
  resendVerification: (email) => api.post("/auth/resend-verification", { email }),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token, newPassword) => api.post("/auth/reset-password", { token, newPassword }),
};

export const tresorerieAPI = {
  // GET /tresorerie/stats?period=day|week|month
  getStats: (period = "day") => api.get(`/tresorerie/stats?period=${period}`),

  // GET /tresorerie/receipt/:commandeId/pdf
  getReceiptPdf: (commandeId) =>
    api.get(`/tresorerie/receipt/${commandeId}/pdf`, {
      responseType: "blob",
    }),

  // GET /tresorerie/export/syscohada?period=monthly
  exportSyscohada: (period = "monthly") =>
    api.get(`/tresorerie/export/syscohada?period=${period}`, {
      responseType: "blob",
    }),

  // POST /tresorerie/expenses
  recordExpense: (expenseData) => api.post("/tresorerie/expenses", expenseData),

  // GET /tresorerie/reports?period=monthly|quarterly|yearly
  generateReport: (period = "monthly") =>
    api.get(`/tresorerie/reports?period=${period}`),

  // POST /tresorerie/budget-alerts
  configureBudgetAlerts: (config) =>
    api.post("/tresorerie/budget-alerts", config),
};

export const restaurantAPI = {
  getMine: () => api.get('/restaurants/me/profile'),
  update: (restaurantId, data) => api.patch(`/restaurants/${restaurantId}`, data),
};

export const adminAPI = {
  getStats:           ()           => api.get('/admin/stats'),
  getChartData:       ()           => api.get('/admin/stats/charts'),
  getUsers:           (params)     => api.get('/admin/users', { params }),
  createUser:         (data)       => api.post('/admin/users', data),
  updateUser:         (id, data)   => api.patch(`/admin/users/${id}`, data),
  toggleUser:         (id)         => api.patch(`/admin/users/${id}/toggle`),
  getRestaurants:     ()           => api.get('/admin/restaurants'),
  createRestaurant:   (data)       => api.post('/admin/restaurants', data),
  updateRestaurant:   (id, data)   => api.patch(`/admin/restaurants/${id}`, data),
  toggleRestaurant:   (id)         => api.patch(`/admin/restaurants/${id}/toggle`),
  getAuditLogs:       (params)     => api.get('/admin/audit-logs', { params }),
  exportSyscohada:    (period)     => api.get('/admin/exports/syscohada', { params: { period }, responseType: 'blob' }),
  exportAudit:        (params)     => api.get('/admin/exports/audit', { params, responseType: 'blob' }),
  getPendingB2B:      ()           => api.get('/admin/b2b/pending'),
  validateB2B:        (id, approved) => api.patch(`/admin/b2b/${id}/valider`, { approved }),

  // Configuration système
  getConfig:          ()           => api.get('/admin/config'),
  setConfig:          (key, value) => api.patch(`/admin/config/${key}`, { value }),
  changePassword:     (currentPassword, newPassword) =>
    api.patch('/admin/change-password', { currentPassword, newPassword }),

  // Intégrations tierces (CRUD générique)
  getIntegrations:    ()           => api.get('/admin/integrations'),
  createIntegration:  (data)       => api.post('/admin/integrations', data),
  updateIntegration:  (id, data)   => api.patch(`/admin/integrations/${id}`, data),
  deleteIntegration:  (id)         => api.delete(`/admin/integrations/${id}`),
  testIntegration:    (id)         => api.post(`/admin/integrations/${id}/test`),

  // Métriques système
  getSystemMetrics:   ()           => api.get('/admin/system-metrics'),

  // Backup DB
  getBackups:         ()           => api.get('/admin/backup/list'),
  runBackup:          ()           => api.post('/admin/backup/run'),
};

export const uploadsAPI = {
  // POST /uploads/image — multipart/form-data, retourne { url, key }
  uploadImage: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/uploads/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getStatus: () => api.get('/uploads/status'),
};

export const promosAPI = {
  // GET /promos — liste codes promo du restaurant (gérant)
  getAll: () => api.get('/promos'),

  // POST /promos — créer un code promo
  create: (data) => api.post('/promos', data),

  // PATCH /promos/:id — modifier
  update: (id, data) => api.patch(`/promos/${id}`, data),

  // PATCH /promos/:id/toggle — activer/désactiver
  toggle: (id) => api.patch(`/promos/${id}/toggle`),

  // DELETE /promos/:id
  remove: (id) => api.delete(`/promos/${id}`),

  // POST /promos/validate — valider un code au checkout (client)
  validate: (code, restaurantId, montantCommande) =>
    api.post('/promos/validate', { code, restaurantId, montantCommande }),
};

export const staffAPI = {
  // POST /restaurants/:restaurantId/staff
  createStaffAccount: (restaurantId, staffData) =>
    api.post(`/restaurants/${restaurantId}/staff`, staffData),

  // PUT /restaurants/:restaurantId/staff/:staffId
  toggleStaffAccount: (restaurantId, staffId, updateData) =>
    api.put(`/restaurants/${restaurantId}/staff/${staffId}`, updateData),

  // GET /restaurants/:restaurantId/staff
  getStaffAccounts: (restaurantId) =>
    api.get(`/restaurants/${restaurantId}/staff`),
};

export const fournisseursAPI = {
  getAll: () => api.get('/fournisseurs'),
  // Retourne uniquement les fournisseurs actifs — pour le sélecteur d'entrée de stock
  getActifs: () => api.get('/fournisseurs').then(r => ({ ...r, data: r.data.filter(f => f.actif) })),
  create: (data) => api.post('/fournisseurs', data),
  update: (id, data) => api.patch(`/fournisseurs/${id}`, data),
  toggle: (id) => api.patch(`/fournisseurs/${id}/toggle`),
  remove: (id) => api.delete(`/fournisseurs/${id}`),
};

export const commandesExtraAPI = {
  rembourser: (id, motif) => api.patch(`/commandes/${id}/rembourser`, { motif }),
};
