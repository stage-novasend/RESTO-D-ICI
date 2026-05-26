import { useState, useEffect } from 'react';
import { commandesService } from '../services/commandes.service';
import { Clock, Check, AlertCircle } from 'lucide-react';

export default function KitchenDisplay() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await commandesService.getKDS(); // Route protégée STAFF/GERANT
        setOrders(res.data);
      } catch (err) { console.error(err); }
    };
    fetch();
    const interval = setInterval(fetch, 3000); // Sync <30s conforme RG-02
    return () => clearInterval(interval);
  }, []);

  const handleStatus = async (id, newStatut) => {
    await commandesService.updateStatus(id, newStatut);
  };

  return (
    <div className="min-h-screen bg-[#1C1917] p-6 text-white">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">👨‍ Cuisine Active (KDS)</h1>
        <span className="px-3 py-1 bg-green-600 rounded-full text-sm font-medium">● En ligne</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {orders.map(order => (
          <div key={order.id} className="bg-[#292524] rounded-2xl p-5 border border-[#1A1A1A] shadow-lg relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1 ${order.statut === 'RECUE' ? 'bg-red-500' : order.statut === 'EN_PREP' ? 'bg-orange-500' : 'bg-green-500'}`} />
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-lg font-bold">#{order.numero}</p>
                <p className="text-xs text-[#9A7060] flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(order.createdAt).toLocaleTimeString()}</p>
              </div>
              <span className="px-2 py-1 bg-[#1A1A1A] rounded text-xs font-medium">{order.modeLivraison.replace('_', ' ')}</span>
            </div>

            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {order.lignes?.map(l => (
                <div key={l.id} className="flex justify-between text-sm">
                  <span>{l.quantite}x {l.article.nom}</span>
                  {l.instructions && <span className="text-yellow-400 text-xs">📝 {l.instructions}</span>}
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              {order.statut === 'RECUE' && (
                <button onClick={() => handleStatus(order.id, 'CONFIRMEE')} className="flex-1 bg-green-700 hover:bg-green-600 py-2 rounded-xl font-bold text-sm transition">PRÉPARER</button>
              )}
              {order.statut === 'CONFIRMEE' && (
                <>
                  <button onClick={() => handleStatus(order.id, 'EN_PREP')} className="flex-1 bg-orange-700 hover:bg-orange-600 py-2 rounded-xl font-bold text-sm transition">DÉMARRER</button>
                  <button onClick={() => handleStatus(order.id, 'PRETE')} className="flex-1 bg-blue-700 hover:bg-blue-600 py-2 rounded-xl font-bold text-sm transition">PRÊTE</button>
                </>
              )}
              {order.statut === 'EN_PREP' && (
                <button onClick={() => handleStatus(order.id, 'PRETE')} className="flex-1 bg-green-700 hover:bg-green-600 py-2 rounded-xl font-bold text-sm transition">TERMINÉ</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}