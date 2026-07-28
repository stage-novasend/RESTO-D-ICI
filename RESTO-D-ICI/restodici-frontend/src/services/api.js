// src/services/api.js — appels HTTP centralisés vers le backend
import axios from "axios";
import { resolveFrontendApiAndSocketBase } from "./backend-endpoints.js";
import { getAccessToken, setAccessToken, clearAccessToken } from "./token-store.js";

const { apiBaseUrl: API_URL } = resolveFrontendApiAndSocketBase({
  viteApiUrl: import.meta.env.VITE_API_URL,
  browserOrigin: window.location.origin,
});

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
  withCredentials: true, // envoie le cookie HttpOnly du refresh token
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let _refreshing = false;
let _refreshQueue = [];

function _flushQueue(token, error) {
  _refreshQueue.forEach((cb) => (token ? cb.resolve(token) : cb.reject(error)));
  _refreshQueue = [];
}

// Sur 401 : tente un rafraîchissement de session avant de déconnecter
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (
      err.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/login')
    ) {
      // On ne tente le refresh que si une session existait (access token présent).
      const hadSession = !!getAccessToken();
      if (!hadSession) {
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') window.location.href = '/login';
        return Promise.reject(err);
      }

      if (_refreshing) {
        return new Promise((resolve, reject) => {
          _refreshQueue.push({
            resolve: (token) => { original.headers.Authorization = `Bearer ${token}`; resolve(api(original)); },
            reject,
          });
        });
      }

      original._retry = true;
      _refreshing = true;

      try {
        // Le refresh token voyage dans le cookie HttpOnly (withCredentials).
        const res = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        const accessToken = res.data.accessToken ?? res.data.access_token ?? res.data.token;
        setAccessToken(accessToken);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        original.headers.Authorization = `Bearer ${accessToken}`;
        _flushQueue(accessToken, null);
        return api(original);
      } catch (refreshErr) {
        _flushQueue(null, refreshErr);
        clearAccessToken();
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        _refreshing = false;
      }
    }
    return Promise.reject(err);
  },
);

// helpers

const _UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const _isUUID = (v) => typeof v === "string" && _UUID_RE.test(v.trim());


function _getStoredRestaurantId() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const rid  = user?.restaurant?.id ?? localStorage.getItem("currentRestaurantId");
    return _isUUID(rid) ? rid : null;
  } catch {
    return null;
  }
}


function _withRestaurantId(data) {
  const payload = { ...data };
  if (!payload.restaurantId) {
    const rid = _getStoredRestaurantId();
    if (rid) payload.restaurantId = rid;
  }
  return payload;
}

// menu

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

// commandes

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
  updateDelai:     (id, delaiEstime) => api.patch(`/commandes/${id}/delai`, { delaiEstime }),

  getRestaurantActivity: (limit = 50) =>
    api.get("/commandes/activity/restaurant", { params: { limit } }),

  confirmerReception: (id) => api.post(`/commandes/${id}/confirmer-reception`),
};

// stocks

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

// b2b

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

// auth

export const authAPI = {
  // Le refresh token n'est plus stocké côté JS : il est dans un cookie HttpOnly.
  login:              (credentials)           => api.post('/auth/login', credentials),
  register:           (data)                  => api.post("/auth/register", data),
  me:                 ()                      => api.get("/auth/me"),
  updateProfile:      (data)                  => api.patch("/auth/me", data),
  logout: async () => {
    // /auth/logout efface le cookie HttpOnly côté serveur.
    return api.post('/auth/logout');
  },
  changePassword:     (data)                  => api.patch("/auth/change-password", data),
  setup2FA:           ()                      => api.post("/auth/2fa/setup"),
  enable2FA:          (code)                  => api.post("/auth/2fa/enable", { code }),
  disable2FA:         ()                      => api.post("/auth/2fa/disable"),
  verify2FALogin:     (tempToken, code)       => api.post('/auth/2fa/verify-login', { tempToken, code }),
  verifyEmail:        (token)                 => api.post("/auth/verify-email", { token }),
  resendVerification: (email)                 => api.post("/auth/resend-verification", { email }),
  forgotPassword:     (email)                 => api.post("/auth/forgot-password", { email }),
  resetPassword:      (token, newPassword)    => api.post("/auth/reset-password", { token, newPassword }),
};

// trésorerie

export const tresorerieAPI = {
  getStats: (period = "day") =>
    api.get("/tresorerie/stats", { params: { period } }),

  exportSyscohada: (period = "monthly") =>
    api.get("/tresorerie/export/syscohada", { params: { period }, responseType: "blob" }),

  recordExpense: (data) => api.post("/tresorerie/expenses", data),

  generateReport: (period = "monthly") =>
    api.get("/tresorerie/reports", { params: { period } }),

  configureBudgetAlerts: (config) =>
    api.post("/tresorerie/budget-alerts", config),
};

// restaurant

export const restaurantAPI = {
  getMine:  ()                    => api.get("/restaurants/me/profile"),
  update:   (restaurantId, data)  => api.patch(`/restaurants/${restaurantId}`, data),
};

// admin

export const adminAPI = {
  getStats:           ()              => api.get("/admin/stats"),
  getChartData:       ()              => api.get("/admin/stats/charts"),
  getUsers:           (params)        => api.get("/admin/users", { params }),
  createUser:         (data)          => api.post("/admin/users", data),
  updateUser:         (id, data)      => api.patch(`/admin/users/${id}`, data),
  toggleUser:         (id)            => api.patch(`/admin/users/${id}/toggle`),
  activerTousUsers:   ()              => api.post("/admin/users/activer-tous"),
  getRestaurants:     ()              => api.get("/admin/restaurants"),
  createRestaurant:   (data)          => api.post("/admin/restaurants", data),
  updateRestaurant:   (id, data)      => api.patch(`/admin/restaurants/${id}`, data),
  toggleRestaurant:   (id)            => api.patch(`/admin/restaurants/${id}/toggle`),
  getAuditLogs:       (params)        => api.get("/admin/audit-logs", { params }),
  exportSyscohada:    (period)        => api.get("/admin/exports/syscohada", { params: { period }, responseType: "blob" }),
  exportAudit:        (params)        => api.get("/admin/exports/audit", { params, responseType: "blob" }),
  getPendingB2B:          ()                      => api.get("/admin/b2b/pending"),
  validateB2B:            (id, approved)          => api.patch(`/admin/b2b/${id}/valider`, { approved }),
  getContestations:       ()                      => api.get("/admin/b2b/contestations"),
  resolveContestation:    (id, accepted, note)    => api.patch(`/admin/b2b/contestations/${id}/resoudre`, { accepted, note }),
  getConfig:          ()              => api.get("/admin/config"),
  setConfig:          (key, value)    => api.patch(`/admin/config/${key}`, { value }),
  getPaymentMethods:  ()              => api.get("/admin/payment-methods"),
  togglePaymentMethod:(id)            => api.patch(`/admin/payment-methods/${id}/toggle`),
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
  purgeHistorique:    (target, before) => api.post("/admin/maintenance/purge", { target, before }),
};

// paiements

export const paiementsAPI = {
  // GET /paiements/methodes → { methods: [...], configured: bool }
  getMethods: ()     => api.get("/paiements/methodes"),
  // POST /paiements/initier → { sessionId, paymentUrl?, simulated }
  initier:    (data) => api.post("/paiements/initier", data),
  // POST /paiements/simuler — déclenche le webhook en dev uniquement
  simuler:    (data) => api.post("/paiements/simuler", data),
  // GET /paiements/statut/:commandeId → { commandeId, status, source }
  getStatut:  (commandeId) => api.get(`/paiements/statut/${commandeId}`),
};

// uploads

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

// promos

export const promosAPI = {
  getAll:   ()              => api.get("/promos"),
  create:   (data)          => api.post("/promos", data),
  update:   (id, data)      => api.patch(`/promos/${id}`, data),
  toggle:   (id)            => api.patch(`/promos/${id}/toggle`),
  remove:   (id)            => api.delete(`/promos/${id}`),
  validate: (code, restaurantId, montantCommande) =>
    api.post("/promos/validate", { code, restaurantId, montantCommande }),
  getActives: (restaurantId, userId) =>
    api.get("/menu/promos-actives", { params: { restaurantId, ...(userId ? { userId } : {}) } }),
};

// newsletter

export const newsletterAPI = {
  subscribe:    (email)  => api.post("/newsletter/subscribe", { email }),
  getAll:       ()       => api.get("/newsletter"),
  remove:       (id)     => api.delete(`/newsletter/${id}`),
};

// staff

export const staffAPI = {
  getStaffAccounts:   (restaurantId)              => api.get(`/restaurants/${restaurantId}/staff`),
  createStaffAccount: (restaurantId, data)        => api.post(`/restaurants/${restaurantId}/staff`, data),
  toggleStaffAccount: (restaurantId, id, data)    => api.put(`/restaurants/${restaurantId}/staff/${id}`, data),
};

// fournisseurs

export const fournisseursAPI = {
  getAll:   ()          => api.get("/fournisseurs"),
  // Filtrage côté serveur (audit §4.4)
  getActifs:()          => api.get("/fournisseurs", { params: { actif: true } }),
  create:   (data)      => api.post("/fournisseurs", data),
  update:   (id, data)  => api.patch(`/fournisseurs/${id}`, data),
  toggle:   (id)        => api.patch(`/fournisseurs/${id}/toggle`),
  remove:   (id)        => api.delete(`/fournisseurs/${id}`),
};

// livraisons

export const livraisonsExtAPI = {
  getFournisseurs:       (restaurantId)  => api.get("/livraisons-externes/fournisseurs", { params: restaurantId ? { restaurantId } : undefined }),
  getFournisseursAdmin:  ()              => api.get("/livraisons-externes/fournisseurs/admin"),
  createFournisseur:     (data)          => api.post("/livraisons-externes/fournisseurs", data),
  updateFournisseur:     (id, data)      => api.patch(`/livraisons-externes/fournisseurs/${id}`, data),
  deleteFournisseur:     (id)            => api.delete(`/livraisons-externes/fournisseurs/${id}`),
  dispatch:              (data)          => api.post("/livraisons-externes/dispatch", data),
  getLivraisonCommande:  (commandeId)    => api.get(`/livraisons-externes/commande/${commandeId}`),
  rechercheLivreurs:     (id, payload)   => api.post(`/livraisons-externes/fournisseurs/${id}/recherche-livreurs`, payload),
  getSuivi:              (livraisonId)   => api.get(`/livraisons-externes/${livraisonId}/suivi`),
  estimer:               (id, payload)   => api.post(`/livraisons-externes/fournisseurs/${id}/estimer`, payload),
};

// commandes extras

export const commandesExtraAPI = {
  rembourser: (id, motif) => api.patch(`/commandes/${id}/rembourser`, { motif }),
};

// config

export const publicConfigAPI = {
  getBannerMessages: () => api.get('/config/public/banner'),
};

// modules
// L'admin active/désactive ces modules depuis son dashboard sans modifier le code.

export const modulesAPI = {
  getClientModules: () => api.get('/app/modules'),
};

// ── Notifications persistées (historique + non-lues + mark-as-read) ──
export const notificationsAPI = {
  list:        (params)  => api.get('/notifications', { params }),   // { items, total, unread }
  unreadCount: ()        => api.get('/notifications/unread-count'),  // { count }
  markRead:    (id)      => api.patch(`/notifications/${id}/read`),
  markAllRead: ()        => api.patch('/notifications/read-all'),
  remove:      (id)      => api.delete(`/notifications/${id}`),
};

