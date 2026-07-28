// src/hooks/useAuth.jsx — contexte d'authentification JWT
//
// L'access token vit EN MÉMOIRE (token-store), jamais en localStorage : une
// faille XSS ne peut donc pas le voler. Au rechargement de page il est perdu et
// régénéré silencieusement via le refresh token (cookie HttpOnly) au montage.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import { authService } from "../services/auth.service";
import { resolveFrontendApiAndSocketBase } from "../services/backend-endpoints.js";
import { setAccessToken, clearAccessToken } from "../services/token-store.js";

const { apiBaseUrl: API_URL } = resolveFrontendApiAndSocketBase({
  viteApiUrl: import.meta.env.VITE_API_URL,
  browserOrigin: window.location.origin,
});

const AuthContext = createContext(null);

function getErrorMessage(error, fallback) {
  const apiError = error?.response?.data;
  const message = apiError?.message || apiError?.error || apiError;

  if (Array.isArray(message)) return message.join(", ");
  if (typeof message === "string") return message;

  return error?.message || fallback;
}

// Profil (nom, rôle…) mis en cache localStorage pour l'affichage instantané.
// Ce n'est PAS une donnée d'authentification : le token n'y est jamais.
function getStoredUser() {
  try {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(true);

  // ── Silent refresh au montage ─────────────────────────────────────────────
  // L'access token en mémoire est perdu à chaque reload : on le régénère via le
  // cookie refresh HttpOnly. Tant que ce n'est pas résolu, loading=true (les
  // routes protégées affichent un loader au lieu de rediriger vers /login).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const token = data?.accessToken ?? data?.access_token ?? data?.token;
        if (!token) throw new Error("Pas de token de session");
        setAccessToken(token);
        // Profil frais = source de vérité ; à défaut on garde le user en cache.
        try {
          const profile = await authService.getProfile();
          if (active && profile) {
            localStorage.setItem("user", JSON.stringify(profile));
            setUser(profile);
          }
        } catch {
          // profil indisponible : on conserve l'utilisateur mis en cache
        }
      } catch {
        // Pas de session valide (aucun cookie / expiré) → état déconnecté.
        if (active) {
          clearAccessToken();
          localStorage.removeItem("user");
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const syncUser = useCallback((nextUser) => {
    localStorage.setItem("user", JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await authService.getProfile();
      return syncUser(profile);
    } catch (error) {
      console.error("Profile refresh error:", error);
      return null;
    }
  }, [syncUser]);

  const login = useCallback(async (email, password) => {
    try {
      const data = await authService.login(email, password);
      const {
        access_token,
        token,
        user: userData,
        requiresTwoFactor,
        tempToken,
      } = data;

      // 2FA requise — on ne pose pas l'état d'auth ici (cf. Login.jsx).
      if (requiresTwoFactor && tempToken) {
        return { success: false, requiresTwoFactor: true, tempToken };
      }

      const jwtToken = access_token ?? token;

      if (!jwtToken || !userData) {
        return { success: false, error: "Réponse invalide du serveur" };
      }

      setAccessToken(jwtToken); // en mémoire uniquement
      localStorage.setItem("user", JSON.stringify(userData));
      // Nettoie une éventuelle sélection de restaurant d'une session précédente.
      localStorage.removeItem("selectedRestaurantId");
      localStorage.removeItem("currentRestaurantId");
      setUser(userData);

      return { success: true, user: userData };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: getErrorMessage(error, "Erreur de connexion"),
      };
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      const data = await authService.register(userData);
      const { user: newUser } = data;
      if (!newUser) {
        return { success: false, error: "Réponse invalide du serveur" };
      }
      // On ne stocke jamais le token ici : l'utilisateur doit se connecter manuellement
      return { success: true, user: newUser };
    } catch (error) {
      console.error("Register error:", error);
      return {
        success: false,
        error: getErrorMessage(error, "Erreur d'inscription"),
      };
    }
  }, []);

  const logout = useCallback(async () => {
    // Efface le cookie refresh HttpOnly côté serveur (invalide la session).
    try {
      await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true });
    } catch {
      // même si l'appel échoue, on nettoie l'état local
    }
    clearAccessToken();
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshProfile, syncUser }),
    [user, loading, login, register, logout, refreshProfile, syncUser],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
