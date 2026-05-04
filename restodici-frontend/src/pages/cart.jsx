// src/pages/Cart.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Minus, Plus } from 'lucide-react';
import { useCart } from '../hooks/useCart';

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeFromCart, clearCart } = useCart();
  const [deliveryMode, setDeliveryMode] = useState('livraison');
  const [instructions, setInstructions] = useState('');

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const deliveryFees = deliveryMode === 'livraison' ? 1000 : 0;
  const tva = subtotal * 0.18;
  const total = subtotal + deliveryFees + tva;

  const deliveryModes = [
    { id: 'sur_place', label: 'Sur place', icon: '🍽️' },
    { id: 'emporter', label: 'À emporter', icon: '🥡' },
    { id: 'livraison', label: 'Livraison', icon: '🚗' },
  ];

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4">
        <div className="w-24 h-24 bg-neutral-200 rounded-full flex items-center justify-center text-4xl mb-4">
          🛒
        </div>
        <h2 className="text-xl font-bold text-neutral-900 mb-2">Votre panier est vide</h2>
        <p className="text-neutral-500 text-center mb-6">
          Ajoutez des plats délicieux pour commencer votre commande
        </p>
        <button
          onClick={() => navigate('/menu')}
          className="bg-primary text-white px-6 py-3 rounded-xl font-medium shadow-button"
        >
          Découvrir le menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-48">
      {/* Header */}
      <div className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-neutral-200">
        <h1 className="text-2xl font-bold font-display text-neutral-900">Votre Panier</h1>
      </div>

      {/* Mode de livraison */}
      <div className="px-4 mt-4">
        <div className="flex bg-neutral-100 rounded-xl p-1">
          {deliveryModes.map(mode => (
            <button
              key={mode.id}
              onClick={() => setDeliveryMode(mode.id)}
              className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                deliveryMode === mode.id
                  ? 'bg-primary text-white shadow-button'
                  : 'text-neutral-500'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Articles du panier */}
      <div className="px-4 mt-4 space-y-3">
        {cart.map(item => (
          <div key={item.id} className="bg-white rounded-2xl p-4 shadow-card flex gap-3">
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-200">
              {item.photoUrl ? (
                <img src={item.photoUrl} alt={item.nom} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-neutral-900">{item.nom}</h3>
                  <p className="text-xs text-neutral-500 mt-1">{item.description}</p>
                  <span className="text-primary font-bold mt-2 block">
                    {item.prix.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-neutral-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2 bg-neutral-100 rounded-lg px-2 py-1">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-7 h-7 rounded-md bg-white shadow-sm flex items-center justify-center"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-7 h-7 rounded-md bg-white shadow-sm flex items-center justify-center"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="font-bold text-neutral-900">
                  {(item.prix * item.quantity).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Instructions spéciales */}
      <div className="px-4 mt-6">
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Instructions spéciales
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Ex: Pas d'oignons, sauce à part..."
          className="w-full p-4 bg-white rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light resize-none h-20"
        />
      </div>

      {/* Résumé de commande */}
      <div className="px-4 mt-6">
        <div className="bg-white rounded-2xl p-5 shadow-card space-y-3">
          <h3 className="font-bold text-lg text-neutral-900 mb-4">Résumé de la commande</h3>
          
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Sous-total</span>
            <span className="font-medium">{subtotal.toLocaleString('fr-FR')} FCFA</span>
          </div>
          
          {deliveryMode === 'livraison' && (
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Frais de livraison</span>
              <span className="font-medium">{deliveryFees.toLocaleString('fr-FR')} FCFA</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">TVA (18%)</span>
            <span className="font-medium">{tva.toLocaleString('fr-FR')} FCFA</span>
          </div>
          
          <div className="border-t border-neutral-200 pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg text-neutral-900">TOTAL</span>
              <span className="text-2xl font-bold text-primary">
                {total.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate('/paiement')}
            className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-button hover:bg-primary-dark transition-all flex items-center justify-center gap-2 mt-4"
          >
            PROCÉDER AU PAIEMENT
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <p className="text-xs text-neutral-400 text-center mt-2">
            Paiement sécurisé par carte ou mobile money.
          </p>
        </div>
      </div>
    </div>
  );
}