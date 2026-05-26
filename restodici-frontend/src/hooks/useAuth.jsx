// src/hooks/useAuth.jsx
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { authService } from "../services/auth.service";

const AuthContext = createContext(null);

function decodeToken(token) {
  const rawPayload = token.split(".")[1];
  const payload = rawPayload?.replace(/-/g, "+").replace(/_/g, "/");
  if (!payload) throw new Error("Token invalide");
  const paddedPayload = payload.padEnd(
    payload.length + ((4 - (payload.length % 4)) % 4),
    "=",
  );
  return JSON.parse(atob(paddedPayload));
}

function isExpired(payload) {
  return payload?.exp ? payload.exp * 1000 <= Date.now() : false;
}

function getErrorMessage(error, fallback) {
  const apiError = error?.response?.data;
  const message = apiError?.message || apiError?.error || apiError;

  if (Array.isArray(message)) return message.join(", ");
  if (typeof message === "string") return message;

  return error?.message || fallback;
}

function getStoredSession() {
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  if (token) {
    try {
      const payload = decodeToken(token);
      if (isExpired(payload)) {
        throw new Error("Token expiré");
      }
      const userFromStorage = storedUser ? JSON.parse(storedUser) : null;
      return userFromStorage
        ? { ...userFromStorage, token }
        : { ...payload, token };
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }

  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredSession);
  const loading = false;

  const syncUser = useCallback((nextUser) => {
    const token = localStorage.getItem("token") || user?.token;
    localStorage.setItem("user", JSON.stringify(nextUser));
    setUser(token ? { ...nextUser, token } : nextUser);
    return nextUser;
  }, [user?.token]);

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
      const { access_token, token, user: userData, requiresTwoFactor, tempToken } = data;

      // 2FA required — pass through without setting auth state
      if (requiresTwoFactor && tempToken) {
        return { success: false, requiresTwoFactor: true, tempToken };
      }

      const jwtToken = access_token ?? token;

      if (!jwtToken || !userData) {
        return { success: false, error: "Réponse invalide du serveur" };
      }

      localStorage.setItem("token", jwtToken);
      localStorage.setItem("user", JSON.stringify(userData));
      // Clear stale restaurant selection from previous sessions
      localStorage.removeItem("selectedRestaurantId");
      localStorage.removeItem("currentRestaurantId");
      setUser({ ...userData, token: jwtToken });

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
      // Ne pas auto-connecter après inscription : l'email doit être vérifié d'abord
      return { success: true, user: newUser };
    } catch (error) {
      console.error("Register error:", error);
      return {
        success: false,
        error: getErrorMessage(error, "Erreur d'inscription"),
      };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshProfile, syncUser }),
    [user, loading, login, register, logout, refreshProfile, syncUser],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
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
