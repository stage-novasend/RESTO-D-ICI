import axios from "axios";
import { io } from "socket.io-client";
import { resolveFrontendApiAndSocketBase } from "./backend-endpoints.js";
import { getAccessToken } from "./token-store.js";

const { apiBaseUrl, socketBase } = resolveFrontendApiAndSocketBase({
  viteApiUrl: (import.meta as any).env?.VITE_API_URL,
  browserOrigin: window.location.origin,
});

const API = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

API.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const createCommandesSocket = (user: {
  id?: string;
  role?: string;
  restaurant?: { id?: string };
}) => {
  const token = getAccessToken();
  const roles = user?.role ? [user.role] : [];
  const restaurantId = user?.restaurant?.id;

  const socket = io(`${socketBase}/commandes`, {
    // polling first for the initial Engine.IO handshake (avoids "closed before established"
    // through Vite proxy); socket.io-client upgrades to WebSocket automatically after connect
    transports: ["polling", "websocket"],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  const subscribeToRooms = () => {
    try {
      socket.emit("subscribe", {
        userId: user?.id,
        roles,
        restaurantId,
      });
    } catch (e) {
      // silent
    }
  };

  socket.on("connect", () => {
    subscribeToRooms();
  });

  socket.on("reconnect_attempt", () => {
    // refresh token before reconnect attempts
    const t = getAccessToken();
    if (t) {
      // update auth used by the client for the next attempt
      // socket.auth is consumed by socket.io-client on connect
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      socket.auth = { token: t };
    }
  });

  socket.on("connect_error", (err) => {
    // expose connection errors to console for easier debugging
    // Do not throw — keep trying to reconnect
    // eslint-disable-next-line no-console
    console.warn('Socket connect_error', err && err.message ? err.message : err);
  });

  return socket;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUUID = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v.trim());

export const commandesService = {
  create: (data: any) => {
    const payload = { ...data };
    // Ensure restaurantId is always a valid UUID before sending — strip anything else.
    if (!isValidUUID(payload.restaurantId)) {
      delete payload.restaurantId;
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const rid = user?.restaurant?.id ?? localStorage.getItem("currentRestaurantId");
        if (isValidUUID(rid)) payload.restaurantId = rid;
      } catch { /* ignore */ }
    }
    return API.post("/commandes", payload);
  },
  getAll: (params?: any) => API.get("/commandes", { params }),
  getRecentOrders: async (restaurantId: string, limit = 50) => {
    const { data } = await API.get("/commandes", {
      params: { restaurantId, limit },
    });
    return data;
  },
  getMyOrders: () => API.get("/commandes/me"),
  findOne: (id: string) => API.get(`/commandes/${id}`),
  updateStatus: (id: string, statut: string) =>
    API.patch(`/commandes/${id}/statut`, { statut }),
  updateStatut: (id: string, statut: string) =>
    API.patch(`/commandes/${id}/statut`, { statut }),
  annuler: (id: string) => API.patch(`/commandes/${id}/annuler`),
  registerPayment: (
    id: string,
    payload: { montantRemis: number; modePaiement: string },
  ) => API.patch(`/commandes/${id}/paiement`, payload),
  clientRegisterPayment: (id: string, modePaiement: string) =>
    API.patch(`/commandes/${id}/client-paiement`, { modePaiement }),
  submitAvis: (id: string, note: number, commentaire?: string) =>
    API.post(`/commandes/${id}/avis`, { note, commentaire }),
  getAvisForOrder: (id: string) => API.get(`/commandes/${id}/avis`),
  getKDS: () => API.get("/commandes/kds"),
  getReceiptPdf: (id: string) =>
    API.get(`/commandes/${id}/receipt/pdf`, { responseType: "arraybuffer" }),
  getHistory: (id: string) => API.get(`/commandes/${id}/history`),
  getRestaurantActivity: (limit = 50) =>
    API.get('/commandes/activity/restaurant', { params: { limit } }),
  updateDelai: (id: string, delaiEstime: number) =>
    API.patch(`/commandes/${id}/delai`, { delaiEstime }),
};
