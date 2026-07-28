// src/services/auth.service.js
import axios from "axios";
import { getAccessToken } from "./token-store.js";

//  Base URL avec préfixe '/api' pour matcher NestJS
const RAW_API_BASE = import.meta.env.VITE_API_URL?.trim();
const API_BASE = (RAW_API_BASE || "/api").replace(/\/$/, "");
const API_URL = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;
const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // reçoit/renvoie le cookie HttpOnly du refresh token
});

// Interceptor pour injecter le token JWT automatiquement
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  //  POST /api/auth/login
  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    return data;
  },

  //  POST /api/auth/register
  register: async (userData) => {
    const { data } = await api.post("/auth/register", userData);
    return data;
  },

  //  GET /api/auth/me (profil utilisateur)
  getProfile: async () => {
    const { data } = await api.get("/auth/me");
    return data;
  },

  updateProfile: async (payload) => {
    const { data } = await api.patch("/auth/me", payload);
    return data;
  },
};
