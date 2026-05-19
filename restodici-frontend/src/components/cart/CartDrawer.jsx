import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, MapPin, Minus, Plus, Store, Truck, X } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { commandesService } from '../../services/commandes.service';
import { useAuth } from '../../hooks/useAuth';
import { formatFCFA } from '../../utils/formatters';

export default function CartDrawer({ isOpen, onClose }) {
  const { items, total, updateQuantity, removeItem, clearCart, checkExpiration } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('SUR_PLACE');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    if (checkExpiration()) {
      alert('Panier expiré par inactivité (30 min). Veuillez recommencer.');
      return;
    }

    if (mode === 'LIVRAISON' && !address.trim()) {
      alert('Adresse obligatoire pour la livraison');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        lignes: items.map((item) => ({
          articleId: item.articleId,
          quantite: item.quantite,
          instructions: item.instructions,
        })),
        modeLivraison: mode,
        adresseLivraison: mode === 'LIVRAISON' ? address : null,
      };

      const res = await commandesService.create(payload);
      clearCart();
      onClose();
      navigate(`/suivi/${res.data.id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur commande');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col bg-[#F9F7F5] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E8E2D9] bg-white p-6">
          <h2 className="text-xl font-bold text-[#2D2720]">Mon panier ({items.length})</h2>
          <button onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-[#F9F7F5]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="py-12 text-center text-[#8B7355]">
              <ChefHat className="mx-auto mb-3 h-12 w-12 opacity-50" />
              <p>Votre panier est vide</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.lineId} className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-sm">
                <div className="mb-2 flex justify-between gap-3">
                  <h3 className="font-semibold text-[#2D2720]">{item.nom}</h3>
                  <button onClick={() => removeItem(item.lineId)} className="text-red-500 hover:text-red-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {item.instructions && (
                  <p className="mb-2 text-xs italic text-[#8B7355]">{item.instructions}</p>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 rounded-lg bg-[#F9F7F5] p-1">
                    <button
                      onClick={() => updateQuantity(item.lineId, item.quantite - 1)}
                      className="rounded-md p-1 transition hover:bg-white"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center font-bold">{item.quantite}</span>
                    <button
                      onClick={() => updateQuantity(item.lineId, item.quantite + 1)}
                      className="rounded-md p-1 transition hover:bg-white"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="font-bold text-[#D94500]">
                    {formatFCFA(Number(item.prix) * Number(item.quantite))}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-4 border-t border-[#E8E2D9] bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-[#2D2720]">Mode de retrait</h3>
            {!user && <span className="text-xs text-[#8B7355]">Connexion requise</span>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'SUR_PLACE', label: 'Sur place', icon: <Store className="h-4 w-4" /> },
              { id: 'EMPORTER', label: 'À emporter', icon: <Truck className="h-4 w-4" /> },
              { id: 'LIVRAISON', label: 'Livraison', icon: <MapPin className="h-4 w-4" /> },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setMode(option.id)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                  mode === option.id
                    ? 'border-[#D94500] bg-[#FFF5EB] text-[#D94500]'
                    : 'border-[#E8E2D9] text-[#8B7355] hover:border-[#D94500]/50'
                }`}
              >
                {option.icon}
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            ))}
          </div>

          {mode === 'LIVRAISON' && (
            <input
              type="text"
              placeholder="Adresse complète de livraison..."
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              className="w-full rounded-xl border border-[#E8E2D9] bg-[#F9F7F5] px-4 py-3 outline-none focus:ring-2 focus:ring-[#D94500]"
            />
          )}

          <div className="flex items-center justify-between border-t border-[#E8E2D9] pt-2">
            <span className="text-lg font-bold">Total</span>
            <span className="text-2xl font-bold text-[#D94500]">{formatFCFA(total())}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading || items.length === 0 || !user}
            className="w-full rounded-2xl bg-[#D94500] py-4 font-bold text-white shadow-lg transition-all hover:bg-[#B83A00] disabled:opacity-50"
          >
            {loading ? 'Validation...' : 'VALIDER LA COMMANDE'}
          </button>
        </div>
      </div>
    </div>
  );
}
