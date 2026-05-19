const ABSOLUTE_URL_RE = /^https?:\/\//i;

const toTrimmed = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const toOrigin = (value) => {
  const normalized = toTrimmed(value).replace(/\/$/, '');
  if (!normalized || !ABSOLUTE_URL_RE.test(normalized)) return '';
  try {
    return new URL(normalized).origin;
  } catch {
    return '';
  }
};

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

export const resolveFrontendApiAndSocketBase = ({
  viteApiUrl,
  browserOrigin,
} = {}) => {
  const rawApiBase = toTrimmed(viteApiUrl);
  const apiBase = String(rawApiBase || '/api').replace(/\/$/, '');
  const apiBaseUrl = apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`;

  const apiOrigin = toOrigin(rawApiBase);
  const socketBase = apiOrigin || browserOrigin;

  return {
    apiBaseUrl,
    socketBase,
  };
};
