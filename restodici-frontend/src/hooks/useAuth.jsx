import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ id: payload.sub, email: payload.email, role: payload.role, nom: '' });
      } catch (e) {
        authService.logout();
      }
    }
    setLoading(false);
  }, []);

  const login = async (data) => {
    const res = await authService.login(data);
    authService.setToken(res.data.access_token);
    const payload = JSON.parse(atob(res.data.access_token.split('.')[1]));
    setUser(res.data.user);
    navigate(payload.role === 'GERANT' ? '/admin' : '/menu');
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
};