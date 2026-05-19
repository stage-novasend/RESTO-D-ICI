// src/services/api.js
import axios from "axios";

// Vite exposes env vars prefixed with VITE_ to client-side code
const RAW_API_BASE = import.meta.env.VITE_API_URL?.trim();
const API_BASE = (RAW_API_BASE || "/api").replace(/\/$/, "");
const API_URL = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

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

export const commandesService = {
  // GET /commandes?restaurantId=xxx&limit=50
  getAll: (params) => api.get("/commandes", { params }),

  // POST /commandes — création avec restaurantId
  create: (data) => {
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
};

export const stocksAPI = {
  // GET /stocks/alerts?restaurantId=xxx
  getAlerts: (params) => api.get("/stocks/alerts", { params }),

  // PATCH /stocks/:id/adjust
  adjust: (id, quantity, motif = "") =>
    api.patch(`/stocks/${id}/adjust`, { quantity, motif }),

  // GET /stocks — inventaire complet
  getAll: (params) => api.get("/stocks", { params }),
};

export const b2bAPI = {
  getDashboard: () => api.get("/b2b/dashboard"),
  getCollaborators: () => api.get("/b2b/collaborators"),
  createCollaborator: (data) => api.post("/b2b/collaborators", data),
  bulkOrder: (data) => api.post("/b2b/bulk-orders", data),
  getOrders: () => api.get("/b2b/orders"),
  getManagerOrders: () => api.get("/b2b/orders/management"),
  getInvoices: () => api.get("/b2b/invoices"),
  getReports: () => api.get("/b2b/reports"),
};

export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (data) => api.post("/auth/register", data),
  me: () => api.get("/auth/me"),
  updateProfile: (data) => api.patch("/auth/me", data),
  logout: () => api.post("/auth/logout"),
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
