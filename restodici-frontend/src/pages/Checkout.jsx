import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  CreditCard, Smartphone, Wallet, CheckCircle, AlertCircle, 
  Clock, UtensilsCrossed, MapPin, Store, Package
} from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { formatFCFA } from '../utils/formatters';
import { commandesService } from '../services/commandes.service';

// Define payment methods locally as they were missing in the original scope
const paymentMethods = [
  { id: 'orange_money', name: 'Orange Money', icon: Smartphone, color: '#FF7900' },
  { id: 'mtn_money', name: 'MTN Mobile Money', icon: Smartphone, color: '#FFCC00' },
  { id: 'moov_money', name: 'Moov Money', icon: Smartphone, color: '#0066CC' },
  { id: 'card', name: 'Carte Bancaire', icon: CreditCard, color: '#2D2720' },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState('orange_money');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [createdOrderBackendId, setCreatedOrderBackendId] = useState('');
  const [pendingOrder, setPendingOrder] = useState(null);

  // Load pending order from localStorage
  useEffect(() => {
    const savedOrder = localStorage.getItem('pendingOrder');
    if (savedOrder) {
      setPendingOrder(JSON.parse(savedOrder));
    } else {
      navigate('/cart');
    }
  }, [navigate]);

  const handlePayment = async () => {
    if (!pendingOrder || !user) return; // Ensure user is authenticated
    
    setIsProcessing(true);
    
    try {
      const payload = {
        restaurantId: pendingOrder.restaurantId,
        modeLivraison: pendingOrder.orderMode,
        adresseLivraison:
          pendingOrder.orderMode === 'LIVRAISON'
            ? pendingOrder.deliveryAddress
            : undefined,
        lignes: pendingOrder.items.map((item) => ({
          articleId: item.articleId,
          quantite: item.quantite,
          instructions: item.instructions,
        })),
      };

      const response = await commandesService.create(payload);
      const createdOrder = response.data;

      setOrderId(createdOrder.numero || createdOrder.id);
      setCreatedOrderBackendId(createdOrder.id);

      clearCart();
      localStorage.removeItem('pendingOrder');

      setOrderConfirmed(true);
    } catch (error) {
      console.error('Payment failed:', error);
      // Handle payment failure
    } finally {
      setIsProcessing(false);
    }
  };

  if (!pendingOrder) return null;

  const orderModeLabels = {
    sur_place: 'Sur place',
    emporter: 'À emporter', 
    livraison: 'Livraison'
  };

  return (
    <div className="min-h-screen bg-[#F9F7F5] py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {orderConfirmed ? (
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-[#2D2720] mb-2">Commande confirmée ! 🎉</h2>
            <p className="text-[#8B7355] mb-6">
              Votre commande <span className="font-bold">#{orderId}</span> a été enregistrée avec succès.
            </p>
            
            <div className="space-y-4">
              <Link
                to="/menu"
                className="block w-full px-6 py-3 bg-[#D94500] text-white rounded-xl font-semibold hover:bg-[#B83A00] transition"
              >
                Commander à nouveau
              </Link>
              
              <button
                onClick={() => navigate(`/suivi/${createdOrderBackendId}`)}
                className="block w-full px-6 py-3 border border-[#E8E2D9] text-[#2D2720] rounded-xl font-semibold hover:bg-[#F9F7F5] transition"
              >
                Suivre ma commande
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-[#2D2720] mb-6">Paiement</h2>
            
            {/* Order Summary */}
            <div className="mb-8">
              <h3 className="font-bold text-lg text-[#2D2720] mb-4">Résumé de la commande</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#8B7355]">Restaurant</span>
                  <span className="font-medium">{pendingOrder.restaurantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B7355]">Mode</span>
                  <span className="font-medium">{orderModeLabels[pendingOrder.orderMode]}</span>
                </div>
                {pendingOrder.deliveryAddress && (
                  <div className="flex justify-between">
                    <span className="text-[#8B7355]">Adresse</span>
                    <span className="font-medium">{pendingOrder.deliveryAddress}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-[#E8E2D9]">
                  <span className="font-bold text-[#2D2720]">Total</span>
                  <span className="font-bold text-[#D94500]">{formatFCFA(pendingOrder.total)} FCFA</span>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="mb-8">
              <h3 className="font-bold text-lg text-[#2D2720] mb-4">Méthode de paiement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('orange_money')}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${
                    paymentMethod === 'orange_money'
                      ? 'border-[#D94500] bg-[#FFF5EB]'
                      : 'border-[#E8E2D9] hover:border-[#D94500]/50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Smartphone className="w-6 h-6 text-[#D94500]" />
                    <span className="font-medium">Orange Money</span>
                  </div>
                  <p className="text-sm text-[#8B7355]">Paiement instantané par Mobile Money</p>
                </button>
                
                <button
                  type="button"
                  onClick={() => setPaymentMethod('mtn_money')}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${
                    paymentMethod === 'mtn_money'
                      ? 'border-[#D94500] bg-[#FFF5EB]'
                      : 'border-[#E8E2D9] hover:border-[#D94500]/50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Wallet className="w-6 h-6 text-[#D94500]" />
                    <span className="font-medium">MTN Money</span>
                  </div>
                  <p className="text-sm text-[#8B7355]">Paiement instantané par Mobile Money</p>
                </button>
              </div>
            </div>

            {/* Payment Button */}
            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full py-4 bg-[#D94500] text-white rounded-xl font-bold hover:bg-[#B83A00] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Traitement en cours...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Payer {formatFCFA(pendingOrder.total)} FCFA
                </>
              )}
            </button>
            
            <p className="text-center text-[#8B7355] text-sm mt-4">
              En confirmant cette commande, vous acceptez nos conditions générales.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
