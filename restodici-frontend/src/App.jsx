// src/App.jsx — Version épurée (conflit résolu)
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/useAuth';
import { CartProvider } from './hooks/useCart';
import Home  from './pages/Home';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import MenuPage from './pages/Menu';
import AdminDashboard from './pages/AdminDashboard';

const queryClient = new QueryClient();

// 🔐 Route protégée — juste vérifier le token, PAS de redirection rôle
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <div className="min-h-screen bg-[#F9F7F5] text-[#2D2720]">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/*  Route /menu : protégée, mais PAS de RoleRedirect ici */}
                <Route path="/menu" element={
                  <ProtectedRoute>
                    <MenuPage />
                  </ProtectedRoute>
                } />

                {/*  Route /admin : protégée */}
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />

                <Route path="*" element={<Navigate to="/menu" replace />} />
              </Routes>
            </div>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}