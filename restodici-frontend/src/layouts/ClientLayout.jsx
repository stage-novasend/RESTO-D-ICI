import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, X, ChefHat, Package, UtensilsCrossed } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';

export default function ClientLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Cart peut ne pas être initialisé si la route n'est pas wrapée par CartProvider.
  // Pour éviter l'écran blanc, on gère ce cas proprement.
  let totalItems;
  try {
    const cart = useCart();
    totalItems = cart.items.reduce((sum, i) => sum + (i.quantite ?? i.quantity ?? 0), 0);
  } catch {
    totalItems = 0;
  }


  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header Responsive */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#E2E8F0] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#C05015] rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition">
                <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <div className="text-lg sm:text-xl font-bold text-[#0F172A] leading-tight">Resto d'ici</div>
                <div className="text-[11px] text-[#737373] font-semibold -mt-0.5">Table digitale • Mobile Money</div>
              </div>
            </Link>


            {/* Navigation Desktop - Essential links that work for all audiences */}
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-sm font-medium text-[#737373] hover:text-[#C05015] transition">Accueil</Link>
              <Link to="/menu" className="text-sm font-medium text-[#737373] hover:text-[#C05015] transition">Restaurants</Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3 sm:gap-4">
              {!user && (
                <Link 
                  to="/register?type=restaurant"
                  className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-[#C05015] text-[#C05015] font-semibold hover:bg-[#C05015] hover:text-white transition text-sm"
                >
                  <ChefHat className="w-4 h-4" />
                  Inscrire un restaurant
                </Link>
              )}
              
              {user && (
                <button 
                  onClick={() => navigate('/cart')}
                  className="relative p-2 text-[#737373] hover:text-[#C05015] transition"
                >
                  <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#C05015] text-white text-[10px] sm:text-xs font-bold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                </button>
              )}
              {user && (
                <Link
                  to={user?.role === 'B2B' ? '/b2b/orders' : '/mes-commandes'}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#FBE8DC] px-3 py-2 text-sm font-semibold text-[#C05015] transition hover:border-[#C05015] hover:bg-[#FBE8DC]"
                >
                  <Package className="w-4 h-4" />
                  Mes commandes
                </Link>
              )}
              
              <div className="flex items-center gap-2">
                <Link 
                  to={user ? "/account" : "/login"}
                  className="hidden items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#FBE8DC] px-3 py-1.5 text-sm font-semibold text-[#C05015] transition hover:border-[#C05015] hover:bg-[#FBE8DC] sm:inline-flex"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C05015] text-sm font-bold text-white">
                    {(user?.prenom?.charAt(0) || user?.nom?.charAt(0) || 'P').toUpperCase()}
                  </span>
                  <span>{user ? 'Profil' : 'Connexion'}</span>
                </Link>
                {user && (
                  <button 
                    onClick={() => setShowLogoutModal(true)}
                    className="hidden text-xs text-[#737373] transition hover:text-red-600 sm:block"
                  >
                    Déconnexion
                  </button>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-[#737373]">
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-[#E2E8F0] px-4 py-3 space-y-2">
            <Link 
              to="/" 
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-[#0F172A] font-medium"
            >
              Accueil
            </Link>
            <Link 
              to="/menu" 
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-[#0F172A] font-medium"
            >
              Restaurants
            </Link>
            {!user && (
              <Link 
                to="/register?type=restaurant"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-[#C05015] font-medium flex items-center gap-2"
              >
                <ChefHat className="w-4 h-4" />
                Inscrire un restaurant
              </Link>
            )}
            {user && (
              <Link 
                to={user?.role === 'B2B' ? '/b2b/orders' : '/mes-commandes'}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-[#0F172A] font-medium"
              >
                Mes commandes
              </Link>
            )}
            <Link 
              to={user ? "/account" : "/login"}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-[#0F172A] font-medium flex items-center gap-2"
            >
              👤 Mon Profil
            </Link>
            {user && (
              <button onClick={() => { 
                setShowLogoutModal(true);
                setMobileMenuOpen(false);
              }} className="block w-full text-left py-2 text-red-600 font-medium">🚪 Déconnexion</button>
            )}
          </div>
        )}
      </header>

      {/* Contenu Principal */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Confirmer la déconnexion ?</h3>
            <p className="text-sm text-[#737373] mb-6">Vous serez redirigé vers la page de connexion.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[#0F172A] font-medium hover:bg-white"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                  setShowLogoutModal(false);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}