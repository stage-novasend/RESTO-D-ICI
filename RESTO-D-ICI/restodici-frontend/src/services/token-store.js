// src/services/token-store.js
// Stockage de l'access token JWT EN MÉMOIRE (pas en localStorage).
//
// Pourquoi : un token en localStorage est lisible par tout script → une faille
// XSS permettrait de le voler. En mémoire, il disparaît à la fermeture/au reload
// de l'onglet et n'est pas exposé au DOM. La session est restaurée au montage
// via le refresh token (cookie HttpOnly, inaccessible au JS) — cf. useAuth.
//
// Le refresh token reste dans un cookie HttpOnly côté serveur ; il n'apparaît
// jamais ici.

let _accessToken = null;

export function getAccessToken() {
  return _accessToken;
}

export function setAccessToken(token) {
  _accessToken = token || null;
}

export function clearAccessToken() {
  _accessToken = null;
}
