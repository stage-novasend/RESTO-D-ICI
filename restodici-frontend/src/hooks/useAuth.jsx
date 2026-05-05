// src/hooks/useAuth.js
import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // ← Pour la redirection

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({
          id: payload.sub,
          email: payload.email,
          role: payload.role,
          nom: payload.nom || 'Utilisateur'
        });
      } catch (err) {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = async ({ email, password }) => {
    const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000' });
    
    const { data } = await api.post('/auth/login', { email, password });
    
    // Stockage du token
    localStorage.setItem('token', data.access_token);
    setUser(data.user);
    
    // Redirection immédiate selon le rôle (RG-31)
    if (data.user.role === 'ADMIN' || data.user.role === 'GERANT') {
      navigate('/admin', { replace: true });
    } else {
      navigate('/menu', { replace: true });
    }
    
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);