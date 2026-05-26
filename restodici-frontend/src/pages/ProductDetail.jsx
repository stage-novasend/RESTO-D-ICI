// src/pages/ProductDetail.jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Share2, AlertTriangle, Flame, ShoppingBag } from 'lucide-react';
import { useCart } from '../hooks/useCart';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedSpicy, setSelectedSpicy] = useState('doux');
  const [selectedSupplements, setSelectedSupplements] = useState([]);

  // Données simulées (à remplacer par appel API)
  const product = {
    id,
    nom: 'Burger Grillé Poulet',
    description: 'Poulet grillé, salade fraîche, sauce maison',
    prix: 5500,
    photoUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
    allergenes: ['gluten', 'lait'],
    supplements: [
      { id: 'fromage', nom: 'Fromage', prix: 500 },
      { id: 'bacon', nom: 'Bacon', prix: 800 },
      { id: 'avocat', nom: 'Avocat', prix: 600 },
    ],
    spicyLevels: [
      { id: 'doux', nom: 'Doux', icon: '' },
      { id: 'moyen', nom: 'Moyen', icon: '' },
      { id: 'fort', nom: 'Fort 🌶️', icon: '🌶️' },
    ],
  };

  const supplementsTotal = selectedSupplements.reduce((sum, id) => {
    const sup = product.supplements.find(s => s.id === id);
    return sum + (sup?.prix || 0);
  }, 0);

  const total = (product.prix + supplementsTotal) * quantity;

  const toggleSupplement = (id) => {
    setSelectedSupplements(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAddToCart = () => {
    addToCart({
      ...product,
      quantity,
      supplements: selectedSupplements,
      spicy: selectedSpicy,
      totalPrice: total,
    });
    navigate('/panier');
  };

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-20 px-4 py-3 flex justify-between items-center bg-gradient-to-b from-black/30 to-transparent">
        <button onClick={() => navigate(-1)} className="p-2 bg-white/90 backdrop-blur rounded-full">
          <ArrowLeft className="w-5 h-5 text-neutral-900" />
        </button>
        <div className="flex gap-2">
          <button className="p-2 bg-white/90 backdrop-blur rounded-full">
            <Share2 className="w-5 h-5 text-neutral-700" />
          </button>
          <button className="p-2 bg-white/90 backdrop-blur rounded-full">
            <Heart className="w-5 h-5 text-neutral-700" />
          </button>
        </div>
      </div>

      {/* Image Produit */}
      <div className="relative h-80 bg-neutral-200">
        <img src={product.photoUrl} alt={product.nom} className="w-full h-full object-cover" />
      </div>

      {/* Contenu */}
      <div className="px-5 -mt-6 relative z-10">
        <div className="bg-white rounded-t-3xl p-6 space-y-5">
          {/* Titre et prix */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold font-display text-neutral-900">{product.nom}</h1>
              <p className="text-neutral-500 mt-1">{product.description}</p>
            </div>
            <div className="bg-primary-lighter px-4 py-2 rounded-full">
              <span className="font-bold text-primary">{product.prix.toLocaleString('fr-FR')} FCFA</span>
            </div>
          </div>

          {/* Allergènes */}
          <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-full w-fit">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">
              <span className="font-medium">Allergènes :</span> {product.allergenes.join(', ')}
            </span>
          </div>

          {/* Niveau de piquant */}
          <div>
            <h3 className="font-bold text-neutral-900 mb-3">Niveau de piquant</h3>
            <div className="flex gap-3">
              {product.spicyLevels.map(level => (
                <button
                  key={level.id}
                  onClick={() => setSelectedSpicy(level.id)}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                    selectedSpicy === level.id
                      ? 'bg-primary text-white shadow-button'
                      : 'bg-[#FBE8DC] text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {level.nom}
                </button>
              ))}
            </div>
          </div>

          {/* Suppléments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-neutral-900">Suppléments</h3>
              <span className="text-xs text-neutral-400 bg-[#FBE8DC] px-3 py-1 rounded-full">Optionnel</span>
            </div>
            <div className="space-y-3">
              {product.supplements.map(sup => (
                <button
                  key={sup.id}
                  onClick={() => toggleSupplement(sup.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                    selectedSupplements.includes(sup.id)
                      ? 'border-primary bg-primary-lighter'
                      : 'border-neutral-100 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedSupplements.includes(sup.id)
                        ? 'border-primary bg-primary'
                        : 'border-neutral-300'
                    }`}>
                      {selectedSupplements.includes(sup.id) && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                    <span className="font-medium text-neutral-800">{sup.nom}</span>
                  </div>
                  <span className="text-sm font-medium text-primary">+{sup.prix} FCFA</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Barre de commande flottante */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 p-4 z-30">
        <div className="flex items-center gap-4">
          {/* Sélecteur quantité */}
          <div className="flex items-center gap-3 bg-[#FBE8DC] rounded-xl px-2 py-2">
            <button 
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-lg font-bold text-neutral-700 hover:bg-white"
            >
              −
            </button>
            <span className="w-8 text-center font-bold text-neutral-900">{quantity}</span>
            <button 
              onClick={() => setQuantity(quantity + 1)}
              className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-lg font-bold text-neutral-700 hover:bg-white"
            >
              +
            </button>
          </div>

          {/* Bouton Ajouter */}
          <button
            onClick={handleAddToCart}
            className="flex-1 bg-primary text-white py-4 rounded-xl font-bold text-sm shadow-button hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-5 h-5" />
            AJOUTER AU PANIER
          </button>
        </div>

        {/* Total */}
        <div className="mt-3 flex items-center justify-between px-1">
          <span className="text-sm text-neutral-500">Total</span>
          <span className="text-lg font-bold text-primary">{total.toLocaleString('fr-FR')} FCFA</span>
        </div>
      </div>
    </div>
  );
}