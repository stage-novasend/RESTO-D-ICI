import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, X, ChefHat } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';

export default function ClientLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    <div className="min-h-screen bg-[#F9F7F5] flex flex-col">
      {/* Header Responsive */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#E8E2D9] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-[#D94500] to-[#B83A00] rounded-xl flex items-center justify-center text-white font-extrabold shadow-sm group-hover:shadow-md transition">
                R
              </div>
              <div className="hidden sm:block">
                <div className="text-lg sm:text-xl font-bold text-[#2D2720] leading-tight">Resto d'ici</div>
                <div className="text-[11px] text-[#8B7355] font-semibold -mt-0.5">Table digitale • Mobile Money</div>
              </div>
            </Link>


            {/* Navigation Desktop - Essential links that work for all audiences */}
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-sm font-medium text-[#8B7355] hover:text-[#D94500] transition">Accueil</Link>
              <Link to="/menu" className="text-sm font-medium text-[#8B7355] hover:text-[#D94500] transition">Restaurants</Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3 sm:gap-4">
              {!user && (
                <Link 
                  to="/register?type=restaurant"
                  className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-[#D94500] text-[#D94500] font-semibold hover:bg-[#D94500] hover:text-white transition text-sm"
                >
                  <ChefHat className="w-4 h-4" />
                  Inscrire un restaurant
                </Link>
              )}
              
              {user && (
                <button 
                  onClick={() => navigate('/cart')}
                  className="relative p-2 text-[#8B7355] hover:text-[#D94500] transition"
                >
                  <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#D94500] text-white text-[10px] sm:text-xs font-bold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                </button>
              )}
              
              <div className="flex items-center gap-2">
                <Link 
                  to={user ? "/account" : "/login"}
                  className="hidden items-center gap-2 rounded-full border border-[#E8E2D9] bg-[#FFF8F3] px-3 py-1.5 text-sm font-semibold text-[#D94500] transition hover:border-[#D94500] hover:bg-[#FFF1E8] sm:inline-flex"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D94500] text-sm font-bold text-white">
                    {(user?.prenom?.charAt(0) || user?.nom?.charAt(0) || 'P').toUpperCase()}
                  </span>
                  <span>{user ? 'Profil' : 'Connexion'}</span>
                </Link>
                {user && (
                  <button 
                    onClick={() => { 
                      logout(); 
                      navigate('/login'); 
                    }}
                    className="hidden text-xs text-[#8B7355] transition hover:text-red-600 sm:block"
                  >
                    Déconnexion
                  </button>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-[#8B7355]">
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-[#E8E2D9] px-4 py-3 space-y-2">
            <Link 
              to="/" 
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-[#2D2720] font-medium"
            >
              Accueil
            </Link>
            <Link 
              to="/menu" 
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-[#2D2720] font-medium"
            >
              Restaurants
            </Link>
            {!user && (
              <Link 
                to="/register?type=restaurant"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-[#D94500] font-medium flex items-center gap-2"
              >
                <ChefHat className="w-4 h-4" />
                Inscrire un restaurant
              </Link>
            )}
            {user && (
              <Link 
                to="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-[#2D2720] font-medium"
              >
                Commander
              </Link>
            )}
            <Link 
              to={user ? "/account" : "/login"}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-[#2D2720] font-medium flex items-center gap-2"
            >
              👤 Mon Profil
            </Link>
            {user && (
              <button onClick={() => { 
                logout(); 
                navigate('/login'); 
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
    </div>
  );
}