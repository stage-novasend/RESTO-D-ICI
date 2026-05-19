import axios from "axios";
import { io } from "socket.io-client";
import { resolveFrontendApiAndSocketBase } from "./backend-endpoints.js";

const { apiBaseUrl, socketBase } = resolveFrontendApiAndSocketBase({
  viteApiUrl: (import.meta as any).env?.VITE_API_URL,
  browserOrigin: window.location.origin,
});

const API = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const createCommandesSocket = (user: {
  id?: string;
  role?: string;
  restaurant?: { id?: string };
}) => {
  const token = localStorage.getItem("token");
  const roles = user?.role ? [user.role] : [];
  const restaurantId = user?.restaurant?.id;

  const socket = io(`${socketBase}/commandes`, {
    // allow polling first then upgrade to websocket for more robust local dev
    transports: ["polling", "websocket"],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
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
    const t = localStorage.getItem("token");
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

export const commandesService = {
  create: (data: any) => API.post("/commandes", data),
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
  registerPayment: (
    id: string,
    payload: { montantRemis: number; modePaiement: "ESPECES" | "LIVRAISON" },
  ) => API.patch(`/commandes/${id}/paiement`, payload),
  getKDS: () => API.get("/commandes/kds"),
};
