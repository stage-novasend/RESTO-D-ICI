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
import MyOrdersPage from './pages/client/MyOrdersPage';

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

// ===== UTILITAIRES — Imports directs sans extension .jsx =====
const queryClient = new QueryClient();

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

// ─── Composant de protection pour le checkout — CLIENT + B2B autorisés ────
function ProtectedCheckoutRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  if (!user) {
    return <Navigate to="/login" state={{ redirect: 'checkout' }} replace />;
  }

  // STAFF and GERANT have no reason to access the checkout or client pages
  if (user.role === 'STAFF')  return <Navigate to="/staff" replace />;
  if (user.role === 'GERANT') return <Navigate to="/gerant" replace />;

  // CLIENT and B2B can both use the cart/checkout flow
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
            
            {/* === ROUTES REQUIÈRENT AUTHENTIFICATION === */}
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
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/mes-commandes" element={<MyOrdersPage />} />
              <Route path="/client/orders" element={<ClientDashboard />} />
              <Route path="/account" element={<ClientDashboard />} />
            </Route>
            
            {/* === ROUTES SANS LAYOUT (authentification) === */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />


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
            </Route>

            {/* === REDIRECTION PAR DÉFAUT === */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}