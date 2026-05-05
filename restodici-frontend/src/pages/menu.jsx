import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { menuService } from '../services/menu.service';
import { Search, ShoppingBag, Bell, User, Flame } from 'lucide-react';

export default function MenuPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [articles, setArticles] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [search, setSearch] = useState('');
  const cible = user?.role === 'B2B' ? 'B2B' : 'CLIENT';

  useEffect(() => {
    Promise.all([
      menuService.getCategories(),
      menuService.getMenu(selectedCat, cible)
    ]).then(([cats, arts]) => {
      setCategories(cats.data);
      setArticles(arts.data);
    });
  }, [selectedCat, cible]);

  // Recherche temps réel (debounce simulé)
  useEffect(() => {
    if (search.length > 2) {
      menuService.search(search, cible).then(res => setArticles(res.data));
    } else if (search === '') {
      menuService.getMenu(selectedCat, cible).then(res => setArticles(res.data));
    }
  }, [search]);

  return (
    <div className="min-h-screen bg-[#F9F7F5] pb-24">
      {/* Header Sticky */}
      <div className="bg-white px-4 pt-4 pb-3 sticky top-0 z-20 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="text-sm text-gray-500">Bon retour parmi nous</p>
            <h1 className="text-xl font-bold text-[#2D2720]">Bonjour, {user?.nom?.split(' ')[0]} 👋</h1>
          </div>
          <div className="flex gap-2">
            <button className="p-2 bg-gray-100 rounded-full"><Bell size={20} /></button>
            <div className="w-9 h-9 bg-[#FFF0EB] rounded-full flex items-center justify-center text-[#D94500]">
              <User size={18} />
            </div>
          </div>
        </div>

        {/* Barre Recherche */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher un plat ou ingrédient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-100 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
          />
        </div>

        {/* Filtres Catégories */}
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedCat(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              !selectedCat ? 'bg-[#D94500] text-white shadow-md' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Tous
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-2 transition-all ${
                selectedCat === cat.id ? 'bg-[#D94500] text-white shadow-md' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {cat.icone} {cat.nom}
            </button>
          ))}
        </div>
      </div>

      {/* Grille Articles */}
      <div className="px-4 pt-4 space-y-4">
        {articles.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Aucun plat trouvé.</p>
        ) : (
          articles.map(art => <ArticleCard key={art.id} article={art} />)
        )}
      </div>

      {/* Nav Bas */}
      <div className="fixed bottom-0 w-full bg-white border-t border-gray-200 px-6 py-3 flex justify-around items-center z-30">
        <NavItem icon={<ShoppingBag size={24} />} label="Menu" active />
        <NavItem icon={<ShoppingBag size={24} />} label="Panier" badge={2} />
        <NavItem icon={<User size={24} />} label="Profil" />
      </div>
    </div>
  );
}

function ArticleCard({ article }) {
  const isOut = article.stock <= 0;
  return (
    <div className={`flex gap-3 bg-white rounded-2xl p-3 shadow-sm ${isOut ? 'opacity-60' : ''}`}>
      <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
        {article.photoUrl ? (
          <img src={article.photoUrl} alt={article.nom} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
        )}
        {isOut && <span className="absolute top-1 left-1 bg-[#E74C3C] text-white text-[10px] px-2 py-0.5 rounded-full font-medium">RUPTURE</span>}
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-[#2D2720]">{article.nom}</h3>
          <p className="text-xs text-gray-500 line-clamp-2 mt-1">{article.description}</p>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="font-bold text-[#D94500]">{Number(article.prix).toLocaleString()} FCFA</span>
          <button disabled={isOut} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${isOut ? 'bg-gray-200 text-gray-400' : 'bg-[#D94500] text-white shadow-md'}`}>
            {isOut ? 'Indisponible' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, badge }) {
  return (
    <button className={`flex flex-col items-center gap-1 relative ${active ? 'text-[#D94500]' : 'text-gray-400'}`}>
      {badge && <span className="absolute -top-1 right-0 w-4 h-4 bg-[#D94500] text-white text-[10px] rounded-full flex items-center justify-center">{badge}</span>}
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}