import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { commandesService } from '../services/commandes.service';
import { CreditCard, Truck, Home, ShoppingBag } from 'lucide-react';

const deliveryModes = [
  { id: 'SUR_PLACE', label: 'Sur place', icon: Home },
  { id: 'EMPORTER', label: 'À emporter', icon: ShoppingBag },
  { id: 'LIVRAISON', label: 'Livraison', icon: Truck },
];

export default function PaiementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, total, clearCart } = useCart();
  const [mode, setMode] = useState(
    location.state?.initialMode || 'LIVRAISON'
  );
  const [adresse, setAdresse] = useState('');
  const [instructions, setInstructions] = useState(
    location.state?.initialInstructions || ''
  );
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [tableNumber, setTableNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const subtotal = total();
  const fraisLivraison = mode === 'LIVRAISON' ? 1000 : 0;
  const tva = Math.round(subtotal * 0.18);
  const totalPrice = subtotal + fraisLivraison + tva;

  const handleSubmit = async () => {
    if (items.length === 0) return;
    if (mode === 'LIVRAISON' && !adresse.trim()) {
      setError('Veuillez renseigner votre adresse de livraison.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        modeLivraison: mode,
        adresseLivraison: mode === 'LIVRAISON' ? adresse.trim() : undefined,
        tableNumber: mode === 'SUR_PLACE' ? tableNumber.trim() : undefined,
        instructions: instructions.trim() || undefined,
        lignes: items.map(item => ({
          articleId: item.articleId,
          quantite: item.quantite,
          instructions: item.instructions,
        })),
      };

      const response = await commandesService.create(payload);
      clearCart();
      navigate(`/payment-success/${response.data.id}`);
    } catch (err) {
      setError(err?.response?.data?.message || 'Une erreur est survenue lors de la commande.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
        <div className="w-24 h-24 rounded-full bg-neutral-200 flex items-center justify-center text-4xl mb-4">🛒</div>
        <h1 className="text-xl font-bold text-neutral-900 mb-2">Panier vide</h1>
        <p className="text-neutral-500 mb-6">Ajoutez des plats dans votre panier avant de passer au paiement.</p>
        <button
          onClick={() => navigate('/menu')}
          className="bg-primary text-white px-6 py-3 rounded-xl font-medium shadow-button"
        >
          Retour au menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-16">
      <div className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-neutral-200">
        <h1 className="text-2xl font-bold font-display text-neutral-900">Finaliser la commande</h1>
      </div>

      <div className="px-4 pt-4 space-y-5">
        <section className="bg-white rounded-3xl p-5 shadow-card">
          <h2 className="font-bold text-lg text-neutral-900 mb-4">Mode de commande</h2>
          <div className="grid grid-cols-3 gap-3">
            {deliveryModes.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => setMode(option.id)}
                  className={`rounded-3xl border p-4 text-left transition-all ${
                    mode === option.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-neutral-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-9 h-9 rounded-2xl bg-[#FBE8DC] flex items-center justify-center text-lg">
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="text-sm font-semibold">{option.label}</span>
                  </div>
                  <p className="text-xs text-neutral-500">{option.id === 'LIVRAISON' ? 'Livraison à domicile' : option.id === 'SUR_PLACE' ? 'Manger sur place' : 'Commander à emporter'}</p>
                </button>
              );
            })}
          </div>
        </section>

        {mode === 'LIVRAISON' && (
          <section className="bg-white rounded-3xl p-5 shadow-card">
            <h2 className="font-bold text-lg text-neutral-900 mb-4">Adresse de livraison</h2>
            <textarea
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              placeholder="Adresse complète, quartier, repères..."
              className="w-full min-h-[120px] rounded-3xl border border-neutral-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </section>
        )}

        {mode === 'SUR_PLACE' && (
          <section className="bg-white rounded-3xl p-5 shadow-card">
            <h2 className="font-bold text-lg text-neutral-900 mb-4">Numéro de table</h2>
            <input
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="Ex : A5, 12"
              className="w-full rounded-3xl border border-neutral-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </section>
        )}

        <section className="bg-white rounded-3xl p-5 shadow-card">
          <h2 className="font-bold text-lg text-neutral-900 mb-4">Mode de paiement</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'CASH', label: 'Espèces' },
              { id: 'MOMO', label: 'Mobile Money' },
              { id: 'CARD', label: 'Carte' },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setPaymentMethod(option.id)}
                className={`rounded-3xl border p-4 text-center transition-all ${
                  paymentMethod === option.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-neutral-200 bg-white text-neutral-600'
                }`}
              >
                <span className="block text-sm font-semibold mb-2">{option.label}</span>
                {option.id === 'CARD' ? (
                  <CreditCard className="mx-auto w-5 h-5" />
                ) : option.id === 'MOMO' ? (
                  <span className="text-2xl">📱</span>
                ) : (
                  <span className="text-2xl">💵</span>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-500 mt-3">Le paiement est simulé ici. Votre commande sera enregistrée dans le système.</p>
        </section>

        <section className="bg-white rounded-3xl p-5 shadow-card">
          <h2 className="font-bold text-lg text-neutral-900 mb-4">Instructions</h2>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Ex : Sans oignon, sauce à part..."
            className="w-full min-h-[120px] rounded-3xl border border-neutral-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </section>

        <section className="bg-white rounded-3xl p-5 shadow-card">
          <h2 className="font-bold text-lg text-neutral-900 mb-4">Récapitulatif</h2>
          <div className="space-y-3 text-sm text-neutral-600">
            <div className="flex justify-between">
              <span>Sous-total</span>
              <span>{subtotal.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between">
              <span>Frais de livraison</span>
              <span>{fraisLivraison.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between">
              <span>TVA (18%)</span>
              <span>{tva.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="border-t border-neutral-200 pt-4 flex justify-between font-bold text-neutral-900">
              <span>Total</span>
              <span>{totalPrice.toLocaleString('fr-FR')} FCFA</span>
            </div>
          </div>
        </section>

        {error && <div className="text-sm text-red-600 bg-red-50 rounded-3xl p-4">{error}</div>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-primary text-white py-4 rounded-3xl font-bold shadow-button hover:bg-primary-dark transition-all"
        >
          {loading ? 'Envoi de la commande...' : 'Valider la commande'}
        </button>
      </div>
    </div>
  );
}
