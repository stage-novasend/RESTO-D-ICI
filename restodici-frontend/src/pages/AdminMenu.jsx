import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { menuService } from '../services/menu.service';

export default function AdminMenuPage() {
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    menuService.getMenu(null, 'TOUS').then(res => setArticles(res.data));
  }, []);

  const handleToggle = async (id, currentStatus) => {
    try {
      await menuService.toggleArticle(id, !currentStatus);
      setArticles(prev => prev.map(a => a.id === id ? { ...a, disponible: !currentStatus } : a));
    } catch (err) {
      alert('Erreur lors de la mise à jour');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F5] p-4 pb-20">
      <h1 className="text-2xl font-bold text-[#2D2720] mb-6">Gestion du Menu</h1>
      <div className="space-y-3">
        {articles.map(art => (
          <div key={art.id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-200 overflow-hidden">
                {art.photoUrl ? <img src={art.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">🍽️</div>}
              </div>
              <div>
                <h3 className="font-bold text-[#2D2720]">{art.nom}</h3>
                <p className="text-xs text-gray-500">Stock: {art.stock} | {Number(art.prix).toLocaleString()} FCFA</p>
              </div>
            </div>
            
            {/* Toggle 1 Clic */}
            <button
              onClick={() => handleToggle(art.id, art.disponible)}
              className={`w-12 h-7 rounded-full relative transition-all duration-300 ${art.disponible ? 'bg-[#2ECC71]' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${art.disponible ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}