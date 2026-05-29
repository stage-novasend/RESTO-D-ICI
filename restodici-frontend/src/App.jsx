// src/App.jsx — Version corrigée ESM strict
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { CartProvider } from './hooks/useCart';

// ===== LAYOUTS — Imports directs sans extension .jsx =====
import GerantLayout from './layouts/GerantLayout';
import ClientLayout from './layouts/ClientLayout';
import B2BLayout from './layouts/B2BLayout';
import StaffLayout from './layouts/StaffLayout';
import AdminLayout from './layouts/AdminLayout';

// ===== PAGES PUBLIQUES — Imports directs sans extension .jsx =====
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import MenuPage from './pages/Menu';
import CartPage from './pages/Cart';
import CheckoutPage from './pages/Checkout';
import OrdersPage from './pages/Orders';
import PaymentSuccessPage from './pages/PaymentSuccess';
import OrderTrackingPage from './pages/order/OrderTracking';
import ClientDashboard from './pages/client/clientDashboard';

// ===== DASHBOARDS — Imports directs sans extension .jsx =====
import GerantDashboard from './pages/gerant/GerantDashboard';
import KDSPage from './pages/gerant/KDSPage';
import StaffDashboard from './pages/staff/StaffDashboard';
import KDSStaff from './pages/staff/KDSStaff';
import B2BDashboard from './pages/b2b/B2BDashboard';
import BulkOrder from './pages/b2b/BulkOrder';
import B2BOrders from './pages/b2b/B2BOrders';
import B2BTeams from './pages/b2b/B2BTeams';
import B2BInvoices from './pages/b2b/B2BInvoices';
import B2BReports from './pages/b2b/B2BReports';
import AcceptInvitation from './pages/b2b/AcceptInvitation';
import B2BOrderTracking from './pages/b2b/B2BOrderTracking';
import AdminDashboard from './pages/admin/AdminDashboard';

// ===== UTILITAIRES — Imports directs sans extension .jsx =====
const queryClient = new QueryClient();

// ─── Composant de protection des routes admin ───────────────────────────────
function ProtectedAdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  if (!user || user.role !== 'ADMIN') return <Navigate to="/login" replace />;
  return children;
}

// ─── Composant de protection des routes gérant ──────────────────────────────
function ProtectedGerantRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  if (!user || user.role !== 'GERANT') return <Navigate to="/login" replace />;
  return children;
}

// ─── Composant de protection des routes staff ───────────────────────────────
function ProtectedStaffRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  if (!user || (user.role !== 'STAFF' && user.role !== 'GERANT')) return <Navigate to="/login" replace />;
  return children;
}

// ─── Checkout/panier — CLIENT + B2B autorisés ────────────────────────────
function ProtectedCheckoutRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  if (!user) return <Navigate to="/login" state={{ redirect: 'checkout' }} replace />;
  if (user.role === 'STAFF')  return <Navigate to="/staff" replace />;
  if (user.role === 'GERANT') return <Navigate to="/gerant" replace />;
  if (user.role === 'ADMIN')  return <Navigate to="/admin" replace />;
  // CLIENT and B2B can both use the cart/checkout/suivi flow
  return children;
}

// ─── Pages client uniquement — B2B redirigé vers son dashboard ───────────
function ProtectedClientRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'STAFF')  return <Navigate to="/staff" replace />;
  if (user.role === 'GERANT') return <Navigate to="/gerant" replace />;
  if (user.role === 'ADMIN')  return <Navigate to="/admin" replace />;
  if (user.role === 'B2B')    return <Navigate to="/b2b" replace />;
  return children;
}

// ─── Composant de protection des routes entreprise ───────────────────────────
function ProtectedBusinessRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  if (!user || user.role !== 'B2B') return <Navigate to="/login" replace />;
  return children;
}

// ─── Wrapper pour le tableau de bord gérant avec props nécessaires ───────────
function GerantDashboardWrapper() {
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  
  const restaurantId = user?.restaurant?.id || user?.restaurantId;
  
  return <GerantDashboard restaurantId={restaurantId} token={token} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* === PAGE D'ACCUEIL sans layout (hero auto-suffisant) === */}
            <Route path="/" element={<Home />} />

            {/* === ROUTES PUBLIQUES avec ClientLayout et CartProvider === */}
            <Route element={
              <CartProvider>
                <ClientLayout />
              </CartProvider>
            }>
              <Route path="/menu" element={<MenuPage />} />
              <Route path="/cart" element={<CartPage />} />
            </Route>
            
            {/* === CHECKOUT / SUIVI — CLIENT + B2B autorisés === */}
            <Route
              element={
                <CartProvider>
                  <ProtectedCheckoutRoute>
                    <ClientLayout />
                  </ProtectedCheckoutRoute>
                </CartProvider>
              }
            >
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/checkout/success/:id" element={<PaymentSuccessPage />} />
              <Route path="/suivi/:id" element={<OrderTrackingPage />} />
            </Route>

            {/* === ESPACE CLIENT — CLIENT uniquement (B2B → /b2b) === */}
            <Route
              element={
                <CartProvider>
                  <ProtectedClientRoute>
                    <ClientLayout />
                  </ProtectedClientRoute>
                </CartProvider>
              }
            >
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/mes-commandes" element={<Navigate to="/account" replace />} />
              <Route path="/client/orders" element={<Navigate to="/account" replace />} />
              <Route path="/account" element={<ClientDashboard />} />
            </Route>
            
            {/* === ROUTES SANS LAYOUT (authentification + invitation B2B) === */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/b2b/invitation/:token" element={<AcceptInvitation />} />


            {/* === DASHBOARD GÉRANT === */}
            <Route 
              path="/gerant/*" 
              element={
                <ProtectedGerantRoute>
                  <GerantLayout />
                </ProtectedGerantRoute>
              } 
            >
              <Route index element={<GerantDashboardWrapper />} />
              <Route path="kds" element={<KDSPage />} />
            </Route>

            {/* === DASHBOARD STAFF (KDS) — layout sombre collapsible === */}
            <Route
              path="/staff/*"
              element={
                <ProtectedStaffRoute>
                  <StaffLayout />
                </ProtectedStaffRoute>
              }
            >
              <Route index element={<StaffDashboard />} />
              <Route path="kds" element={<KDSStaff />} />
            </Route>

            {/* === DASHBOARD ENTREPRISE (B2B) — layout sombre collapsible === */}
            <Route
              path="/b2b/*"
              element={
                <ProtectedBusinessRoute>
                  <B2BLayout />
                </ProtectedBusinessRoute>
              }
            >
              <Route index element={<B2BDashboard />} />
              <Route path="dashboard" element={<B2BDashboard />} />
              <Route path="order" element={<BulkOrder />} />
              <Route path="bulk-order" element={<BulkOrder />} />
              <Route path="orders" element={<B2BOrders />} />
              <Route path="billing" element={<B2BInvoices />} />
              <Route path="invoices" element={<B2BInvoices />} />
              <Route path="teams" element={<B2BTeams />} />
              <Route path="reports" element={<B2BReports />} />
              <Route path="deliveries" element={<B2BOrders />} />
              <Route path="suivi/:id" element={<B2BOrderTracking />} />
            </Route>

            {/* === DASHBOARD ADMIN SYSTÈME === */}
            <Route
              path="/admin/*"
              element={
                <ProtectedAdminRoute>
                  <AdminLayout />
                </ProtectedAdminRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
            </Route>

            {/* === REDIRECTION PAR DÉFAUT === */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}