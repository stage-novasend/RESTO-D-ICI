// src/services/backend-endpoints.js
// Calcule dynamiquement l'URL du backend (API REST + WebSocket)
// selon la variable d'environnement VITE_API_URL ou l'origine du navigateur.
// Utilisé par api.js et commandes.service.ts.

// Vérifie si une chaîne est une URL absolue (commence par http:// ou https://)
const ABSOLUTE_URL_RE = /^https?:\/\//i;

// Retourne la chaîne nettoyée (supprime espaces) ou vide si pas une string
const toTrimmed = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

// Extrait l'origine (schéma + domaine + port) d'une URL, ou '' si invalide
const toOrigin = (value) => {
  const normalized = toTrimmed(value).replace(/\/$/, '');
  if (!normalized || !ABSOLUTE_URL_RE.test(normalized)) return '';
  try {
    return new URL(normalized).origin;
  } catch {
    return '';
  }
};

// Détermine l'origine du backend (utilisé pour les WebSockets)
export const resolveBackendOrigin = ({
  viteApiUrl,
  viteBackendOrigin,
  fallbackOrigin = 'http://localhost:3000',
} = {}) => {
  const apiOrigin = toOrigin(viteApiUrl);
  if (apiOrigin) return apiOrigin;

  const backendOrigin = toOrigin(viteBackendOrigin);
  if (backendOrigin) return backendOrigin;

  return fallbackOrigin;
};

// Retourne { apiBaseUrl, socketBase } prêts à l'emploi dans api.js
// apiBaseUrl = URL complète vers /api (ex: http://localhost:3000/api)
// socketBase = domaine pour la connexion Socket.IO
export const resolveFrontendApiAndSocketBase = ({
  viteApiUrl,
  browserOrigin,
} = {}) => {
  const rawApiBase = toTrimmed(viteApiUrl);
  const apiBase = String(rawApiBase || '/api').replace(/\/$/, '');
  // S'assure que l'URL se termine bien par /api
  const apiBaseUrl = apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`;

  const apiOrigin = toOrigin(rawApiBase);
  const socketBase = apiOrigin || browserOrigin;

  return {
    apiBaseUrl,
    socketBase,
  };
};
