// src/pages/Menu.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Search, ChefHat, Flame, Coffee, ShoppingBag, Bell, User } from 'lucide-react';
import { menuService } from '../services/menu.service';
import MenuCard from '../components/menu/MenuCard';

export default function MenuPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState('B2C');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const categoriesData = [
    { id: 'entrees', nom: 'Entrées', icone: '🍽️' },
    { id: 'plats', nom: 'Plats', icone: '🍖' },
    { id: 'desserts', nom: 'Desserts', icone: '🍰' },
    { id: 'boissons', nom: 'Boissons', icone: '☕' },
  ];

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const [catRes, menuRes] = await Promise.all([
          menuService.getCategories(),
          menuService.getMenu(selectedCategory, mode)
        ]);
        setCategories(catRes.data.length ? catRes.data : categoriesData);
        setArticles(menuRes.data);
      } catch (err) {
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [selectedCategory, mode]);

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* Header avec salutation */}
      <div className="bg-white px-4 pt-6 pb-4 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-neutral-500">Bon retour parmi nous</p>
            <h1 className="text-2xl font-bold font-display text-neutral-900">
              Bonjour, {user?.nom?.split(' ')[0] || 'Client'} ! 👋
            </h1>
          </div>
          <div className="flex gap-3">
            <button className="p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors">
              <Bell className="w-5 h-5 text-neutral-700" />
            </button>
            <div className="w-10 h-10 rounded-full bg-primary-lighter flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>

        {/* Toggle B2C / B2B */}
        <div className="flex bg-neutral-100 rounded-xl p-1 mb-4">
          <button
            onClick={() => setMode('B2C')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'B2C' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-neutral-500'
            }`}
          >
            B2C (Particulier)
          </button>
          <button
            onClick={() => setMode('B2B')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'B2B' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-neutral-500'
            }`}
          >
            B2B (Entreprise)
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher un plat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-light transition-all"
          />
        </div>
      </div>

      {/* Catégories */}
      <div className="px-4 mt-4">
        <h2 className="text-lg font-bold text-neutral-900 mb-3">Catégories</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              className={`flex flex-col items-center min-w-[72px] gap-2 transition-all ${
                selectedCategory === cat.id ? 'scale-105' : ''
              }`}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all ${
                selectedCategory === cat.id
                  ? 'bg-primary text-white shadow-button'
                  : 'bg-neutral-200 text-neutral-600'
              }`}>
                {cat.icone}
              </div>
              <span className={`text-xs font-medium ${
                selectedCategory === cat.id ? 'text-primary' : 'text-neutral-500'
              }`}>
                {cat.nom}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Section Populaire */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-neutral-900">Populaire en ce moment</h2>
          <button className="text-sm text-primary font-medium">Voir tout</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {articles.slice(0, 6).map(article => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>

      {/* Bannière Promo */}
      <div className="px-4 mt-6 mb-4">
        <div className="bg-gradient-to-r from-primary to-primary-light rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="relative z-10">
            <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-xs font-medium mb-2">
              Offre Midi
            </span>
            <h3 className="text-xl font-bold mb-1">Boisson offerte</h3>
            <p className="text-sm text-white/90 mb-3">
              Pour toute commande avant 14h.
            </p>
            <button className="bg-neutral-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors">
              En profiter
            </button>
          </div>
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
        </div>
      </div>

      {/* Navigation du bas */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 px-6 py-3 flex justify-around items-center z-30">
        <NavItem icon={<ShoppingBag className="w-6 h-6" />} label="Découvrir" active />
        <NavItem icon={<ShoppingBag className="w-6 h-6" />} label="Commandes" />
        <NavItem icon={<ShoppingBag className="w-6 h-6" />} label="Panier" badge={2} />
        <NavItem icon={<User className="w-6 h-6" />} label="Profil" />
      </div>
    </div>
  );
}

function ArticleCard({ article }) {
  const isOutOfStock = article.stock <= 0;
  const isLowStock = article.stock > 0 && article.stock <= 5;
  
  return (
    <div className="flex gap-3 bg-white rounded-2xl p-3 shadow-card hover:shadow-card-hover transition-shadow">
      <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-200">
        {article.photoUrl ? (
          <img src={article.photoUrl} alt={article.nom} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">
            🍽️
          </div>
        )}
        {isOutOfStock && (
          <span className="absolute top-1 left-1 bg-status-rupture text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
            RUPTURE
          </span>
        )}
        {isLowStock && (
          <span className="absolute top-1 left-1 bg-status-epuise text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
            Bientôt épuisé
          </span>
        )}
      </div>
      
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-neutral-900 text-sm">{article.nom}</h3>
          <p className="text-xs text-neutral-500 line-clamp-2 mt-1">
            {article.description || 'Description non disponible'}
          </p>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="font-bold text-primary">{article.prix?.toLocaleString('fr-FR') || '0'} FCFA</span>
          <button
            disabled={isOutOfStock}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              isOutOfStock
                ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                : 'bg-primary text-white shadow-button hover:bg-primary-dark'
            }`}
          >
            {isOutOfStock ? 'Indisponible' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, badge }) {
  return (
    <button className={`flex flex-col items-center gap-1 relative ${active ? 'text-primary' : 'text-neutral-400'}`}>
      {badge && (
        <span className="absolute -top-1 -right-2 w-4 h-4 bg-primary text-white text-[10px] rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}