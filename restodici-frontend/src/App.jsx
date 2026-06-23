// src/App.jsx — Point d'entrée du routage React
// Définit toutes les routes de l'application et protège les espaces privés
// selon le rôle de l'utilisateur connecté (CLIENT, GERANT, STAFF, B2B, ADMIN)
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { CartProvider } from './hooks/useCart';

// ===== LAYOUTS — chargés immédiatement (petits fichiers, toujours utilisés) =====
import GerantLayout from './layouts/GerantLayout';
import ClientLayout from './layouts/ClientLayout';
import B2BLayout from './layouts/B2BLayout';
import StaffLayout from './layouts/StaffLayout';
import AdminLayout from './layouts/AdminLayout';

// ===== PAGES — lazy loading (chaque page = chunk JS séparé chargé à la demande) =====
// Pages publiques
const Home            = lazy(() => import('./pages/Home'));
const Contact         = lazy(() => import('./pages/Contact'));
const Legal           = lazy(() => import('./pages/Legal'));
const Privacy         = lazy(() => import('./pages/Privacy'));
const Aide            = lazy(() => import('./pages/Aide'));
const Login           = lazy(() => import('./pages/Login'));
const Register        = lazy(() => import('./pages/Register'));
const VerifyEmail     = lazy(() => import('./pages/VerifyEmail'));
const ForgotPassword  = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword   = lazy(() => import('./pages/ResetPassword'));
const MenuPage        = lazy(() => import('./pages/Menu'));
const CartPage        = lazy(() => import('./pages/Cart'));
const CheckoutPage    = lazy(() => import('./pages/Checkout'));
const OrdersPage      = lazy(() => import('./pages/Orders'));
const PaymentSuccessPage  = lazy(() => import('./pages/PaymentSuccess'));
const OrderTrackingPage   = lazy(() => import('./pages/order/OrderTracking'));
const ClientDashboard     = lazy(() => import('./pages/client/clientDashboard'));

// Dashboards rôles
const GerantDashboard       = lazy(() => import('./pages/gerant/GerantDashboard'));
const KDSPage               = lazy(() => import('./pages/gerant/KDSPage'));
const GerantOnboardingWizard = lazy(() => import('./pages/gerant/GerantOnboardingWizard'));
const StaffDashboard        = lazy(() => import('./pages/staff/StaffDashboard'));
const KDSStaff              = lazy(() => import('./pages/staff/KDSStaff'));
const CaissePage            = lazy(() => import('./pages/staff/CaissePage'));
const ServeurPage           = lazy(() => import('./pages/staff/ServeurPage'));
const ArticlesStaff         = lazy(() => import('./pages/staff/ArticlesStaff'));
const StaffOnboardingWizard = lazy(() => import('./pages/staff/StaffOnboardingWizard'));
const B2BDashboard          = lazy(() => import('./pages/b2b/B2BDashboard'));
const BulkOrder             = lazy(() => import('./pages/b2b/BulkOrder'));
const B2BOrders             = lazy(() => import('./pages/b2b/B2BOrders'));
const B2BTeams              = lazy(() => import('./pages/b2b/B2BTeams'));
const B2BInvoices           = lazy(() => import('./pages/b2b/B2BInvoices'));
const B2BReports            = lazy(() => import('./pages/b2b/B2BReports'));
const AcceptInvitation      = lazy(() => import('./pages/b2b/AcceptInvitation'));
const B2BOrderTracking      = lazy(() => import('./pages/b2b/B2BOrderTracking'));
const B2BOnboardingPage     = lazy(() => import('./pages/b2b/B2BOnboardingPage'));
const AdminDashboard        = lazy(() => import('./pages/admin/AdminDashboard'));
const ClientOnboardingWizard = lazy(() => import('./pages/client/ClientOnboardingWizard'));

const queryClient = new QueryClient();

// Écran de chargement affiché pendant qu'un chunk se télécharge
function PageLoader() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFAF3' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '4px solid #FF8C00', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Composants de garde (route guards) ───────────────────────────────────────
// Chaque garde vérifie le rôle de l'utilisateur avant d'afficher la page.
// Si l'utilisateur n'a pas le bon rôle → redirection vers /login ou son espace.

// Accès réservé aux administrateurs système
function ProtectedAdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user || user.role !== 'ADMIN') return <Navigate to="/login" replace />;
  return children;
}

// Accès réservé aux gérants de restaurant
function ProtectedGerantRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user || user.role !== 'GERANT') return <Navigate to="/login" replace />;
  return children;
}

// Accès réservé au staff (serveurs, cuisiniers) — le gérant peut aussi y accéder
function ProtectedStaffRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user || (user.role !== 'STAFF' && user.role !== 'GERANT')) return <Navigate to="/login" replace />;
  return children;
}

// Checkout autorisé pour CLIENT et B2B — les autres rôles sont renvoyés vers leur espace
function ProtectedCheckoutRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" state={{ redirect: 'checkout' }} replace />;
  if (user.role === 'STAFF')  return <Navigate to="/staff" replace />;
  if (user.role === 'GERANT') return <Navigate to="/gerant" replace />;
  if (user.role === 'ADMIN')  return <Navigate to="/admin" replace />;
  return children;
}

// Espace client (compte, commandes) — le B2B est renvoyé vers /b2b
function ProtectedClientRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'STAFF')  return <Navigate to="/staff" replace />;
  if (user.role === 'GERANT') return <Navigate to="/gerant" replace />;
  if (user.role === 'ADMIN')  return <Navigate to="/admin" replace />;
  if (user.role === 'B2B')    return <Navigate to="/b2b" replace />;
  return children;
}

// Accès réservé aux comptes entreprise (B2B)
function ProtectedBusinessRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user || user.role !== 'B2B') return <Navigate to="/login" replace />;
  return children;
}

// Injecte restaurantId et token dans le dashboard gérant (lus depuis le contexte)
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
          {/* Suspense affiche PageLoader pendant le téléchargement d'un chunk lazy */}
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* === PAGE D'ACCUEIL === */}
              <Route path="/" element={<Home />} />

              {/* === PAGES PUBLIQUES INFORMATIVES === */}
              <Route path="/contact" element={<Contact />} />
              <Route path="/legal"   element={<Legal />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/aide"    element={<Aide />} />

              {/* === MENU + PANIER — publics avec layout client === */}
              <Route element={<CartProvider><ClientLayout /></CartProvider>}>
                <Route path="/menu" element={<MenuPage />} />
                <Route path="/cart" element={<CartPage />} />
              </Route>

              {/* === CHECKOUT / SUIVI — CLIENT + B2B autorisés === */}
              <Route element={
                <CartProvider>
                  <ProtectedCheckoutRoute><ClientLayout /></ProtectedCheckoutRoute>
                </CartProvider>
              }>
                <Route path="/checkout"              element={<CheckoutPage />} />
                <Route path="/checkout/success/:id"  element={<PaymentSuccessPage />} />
                <Route path="/suivi/:id"             element={<OrderTrackingPage />} />
              </Route>

              {/* === ESPACE CLIENT — CLIENT uniquement === */}
              <Route element={
                <CartProvider>
                  <ProtectedClientRoute><ClientLayout /></ProtectedClientRoute>
                </CartProvider>
              }>
                <Route path="/orders"         element={<OrdersPage />} />
                <Route path="/mes-commandes"  element={<Navigate to="/account" replace />} />
                <Route path="/client/orders"  element={<Navigate to="/account" replace />} />
              </Route>

              {/* Dashboard client — sans ClientLayout (layout propre avec sidebar navy) */}
              <Route path="/account" element={
                <CartProvider>
                  <ProtectedClientRoute><ClientDashboard /></ProtectedClientRoute>
                </CartProvider>
              } />

              {/* === AUTHENTIFICATION (sans layout) === */}
              <Route path="/login"            element={<Login />} />
              <Route path="/register"         element={<Register />} />
              <Route path="/verify-email"     element={<VerifyEmail />} />
              <Route path="/forgot-password"  element={<ForgotPassword />} />
              <Route path="/reset-password"   element={<ResetPassword />} />
              <Route path="/b2b/invitation/:token" element={<AcceptInvitation />} />

              {/* === ONBOARDING WIZARDS (post-inscription) === */}
              <Route path="/onboarding/gerant" element={
                <ProtectedGerantRoute><GerantOnboardingWizard /></ProtectedGerantRoute>
              } />
              <Route path="/onboarding/b2b" element={
                <ProtectedBusinessRoute><B2BOnboardingPage /></ProtectedBusinessRoute>
              } />
              <Route path="/onboarding/staff" element={
                <ProtectedStaffRoute><StaffOnboardingWizard /></ProtectedStaffRoute>
              } />
              <Route path="/onboarding/client" element={
                <ProtectedClientRoute>
                  <CartProvider><ClientOnboardingWizard /></CartProvider>
                </ProtectedClientRoute>
              } />

              {/* === DASHBOARD GÉRANT === */}
              <Route path="/gerant/*" element={
                <ProtectedGerantRoute><GerantLayout /></ProtectedGerantRoute>
              }>
                <Route index      element={<GerantDashboardWrapper />} />
                <Route path="kds" element={<KDSPage />} />
              </Route>

              {/* === DASHBOARD STAFF === */}
              <Route path="/staff/*" element={
                <ProtectedStaffRoute><StaffLayout /></ProtectedStaffRoute>
              }>
                <Route index             element={<Navigate to="kds" replace />} />
                <Route path="dashboard"  element={<StaffDashboard />} />
                <Route path="kds"        element={<KDSStaff />} />
                <Route path="caisse"     element={<CaissePage />} />
                <Route path="salle"      element={<ServeurPage />} />
                <Route path="articles"   element={<ArticlesStaff />} />
              </Route>

              {/* === DASHBOARD ENTREPRISE (B2B) === */}
              <Route path="/b2b/*" element={
                <ProtectedBusinessRoute><B2BLayout /></ProtectedBusinessRoute>
              }>
                <Route index                element={<B2BDashboard />} />
                <Route path="dashboard"     element={<B2BDashboard />} />
                <Route path="order"         element={<BulkOrder />} />
                <Route path="bulk-order"    element={<BulkOrder />} />
                <Route path="orders"        element={<B2BOrders />} />
                <Route path="billing"       element={<B2BInvoices />} />
                <Route path="invoices"      element={<B2BInvoices />} />
                <Route path="teams"         element={<B2BTeams />} />
                <Route path="reports"       element={<B2BReports />} />
                <Route path="deliveries"    element={<B2BOrders />} />
                <Route path="suivi/:id"     element={<B2BOrderTracking />} />
              </Route>

              {/* === DASHBOARD ADMIN === */}
              <Route path="/admin/*" element={
                <ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>
              }>
                <Route index element={<AdminDashboard />} />
              </Route>

              {/* === FALLBACK — redirige toute URL inconnue vers l'accueil === */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
