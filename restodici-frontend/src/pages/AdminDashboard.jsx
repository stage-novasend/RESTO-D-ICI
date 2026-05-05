// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { menuService } from '../services/menu.service';
import { LogOut, UtensilsCrossed, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Chargement des données
  useEffect(() => {
    menuService.getMenu(null, 'TOUS')
      .then(res => {
        setArticles(res.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Toggle disponibilité
  const handleToggle = async (id, currentStatus) => {
    try {
      await menuService.toggleArticle(id, !currentStatus);
      // Mise à jour locale immédiate (optimistic UI)
      setArticles(prev => prev.map(a => 
        a.id === id ? { ...a, disponible: !currentStatus } : a
      ));
    } catch (err) {
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F9F7F5]">
        <Loader2 className="w-10 h-10 text-[#D94500] animate-spin" />
      </div>
    );
  }

  const stats = {
    total: articles.length,
    dispo: articles.filter(a => a.disponible).length,
    rupture: articles.filter(a => !a.disponible).length,
  };

  return (
    <div className="min-h-screen bg-[#F9F7F5]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-[#E8E2D9] px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#D94500] rounded-xl flex items-center justify-center text-white font-bold text-lg">R</div>
          <div>
            <h1 className="text-xl font-bold text-[#2D2720]">RestoDici Admin</h1>
            <p className="text-xs text-[#8B7355]">Gestion du Menu</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-[#D94500] hover:bg-[#FFF5EB] rounded-lg">
          <LogOut size={18} /> Déconnexion
        </button>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#E8E2D9] rounded-2xl p-5 flex items-center gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm"><UtensilsCrossed className="text-[#2D2720]" /></div>
            <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-[#8B7355]">Total Plats</p></div>
          </div>
          <div className="bg-[#E6F7ED] rounded-2xl p-5 flex items-center gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm"><CheckCircle className="text-[#2ECC71]" /></div>
            <div><p className="text-2xl font-bold">{stats.dispo}</p><p className="text-sm text-[#8B7355]">Disponibles</p></div>
          </div>
          <div className="bg-[#FDE8E8] rounded-2xl p-5 flex items-center gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm"><AlertTriangle className="text-[#D94500]" /></div>
            <div><p className="text-2xl font-bold">{stats.rupture}</p><p className="text-sm text-[#8B7355]">Rupture</p></div>
          </div>
        </div>

        {/* Liste des articles */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8E2D9] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E8E2D9] bg-[#FAFAFA]">
            <h2 className="text-lg font-bold text-[#2D2720]">Liste des articles</h2>
          </div>
          <div className="divide-y divide-[#E8E2D9]">
            {articles.map(article => (
              <div key={article.id} className="px-6 py-4 flex items-center justify-between hover:bg-[#F9F7F5]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden">
                    {article.photoUrl ? <img src={article.photoUrl} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-xl">🍽️</div>}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#2D2720]">{article.nom}</h3>
                    <p className="text-sm text-[#8B7355]">{Number(article.prix).toLocaleString()} FCFA • {article.categorie?.nom}</p>
                  </div>
                </div>
                
                {/* Toggle Switch */}
                <button
                  onClick={() => handleToggle(article.id, article.disponible)}
                  className={`relative w-12 h-7 rounded-full transition-all duration-300 ${
                    article.disponible ? 'bg-[#2ECC71]' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                    article.disponible ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}