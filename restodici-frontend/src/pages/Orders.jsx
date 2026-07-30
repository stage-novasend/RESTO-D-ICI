import React from 'react';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Clock, CheckCircle, ChefHat, Package, Truck, MapPin,
  ArrowLeft, History, Store
} from 'lucide-react';
import { formatFCFA } from '../utils/formatters';
import { useAuth } from '../hooks/useAuth';

export default function OrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState(null);

  // Load user's orders from localStorage (in real app, this would be from API)
  useEffect(() => {
    if (!user) {
      // Redirect to login if not authenticated
      navigate('/login?redirect=orders');
      return;
    }

    const loadOrders = () => {
      try {
        const userOrders = JSON.parse(localStorage.getItem(`userOrders_${user.id}`) || '[]');
        setOrders(userOrders);
      } catch (error) {
        console.error('Error loading orders:', error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadOrders();
  }, [user, navigate]);

  const orderStatusConfig = {
    confirmed: { label: 'Confirmée', color: 'text-blue-600', icon: Clock },
    preparing: { label: 'En préparation', color: 'text-orange-600', icon: ChefHat },
    ready: { label: 'Prête', color: 'text-green-600', icon: CheckCircle },
    delivered: { label: 'Livrée', color: 'text-green-600', icon: Package }
  };

  const orderModeLabels = {
    sur_place: 'Sur place',
    emporter: 'À emporter',
    livraison: 'Livraison'
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#EA580C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#737373]">Chargement de vos commandes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white hover:rounded-xl transition"
          >
            <ArrowLeft className="w-6 h-6 text-[#737373]" />
          </button>
          <h1 className="text-2xl font-bold text-[#1A0C00] flex items-center gap-2">
            <History className="w-6 h-6" />
            Mes Commandes
          </h1>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <History className="w-16 h-16 text-[#737373] mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-[#1A0C00] mb-2">Aucune commande trouvée</h3>
            <p className="text-[#737373] mb-6">
              Vous n'avez pas encore passé de commande.
            </p>
            <Link
              to="/menu"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#EA580C] text-white rounded-xl font-semibold hover:bg-[#C2410C] transition"
            >
              <Store className="w-5 h-5" />
              Commander maintenant
            </Link>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0] mb-6">
              {/* Order header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-[#1A0C00]">Commande #{order.id}</h3>
                  <p className="text-sm text-[#737373]">
                    {new Date(order.timestamp).toLocaleDateString('fr-FR')}
                  </p>
                  <p className="text-sm text-[#737373] mt-1">
                    Restaurant: {order.restaurantName}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                    orderStatusConfig[order.status]?.color || 'text-gray-600'
                  } bg-opacity-10`}>
                    {orderStatusConfig[order.status]?.icon && 
                      React.createElement(orderStatusConfig[order.status].icon, { className: "w-3 h-3" })
                    }
                    {orderStatusConfig[order.status]?.label || order.status}
                  </span>
                  <p className="text-lg font-bold text-[#EA580C] mt-1">
                    {formatFCFA(order.total)} FCFA
                  </p>
                </div>
              </div>

              {/* Order mode */}
              <div className="flex items-center gap-2 text-sm text-[#737373] mb-4">
                {order.orderMode === 'sur_place' && <Store className="w-4 h-4" />}
                {order.orderMode === 'emporter' && <Package className="w-4 h-4" />}
                {order.orderMode === 'livraison' && <Truck className="w-4 h-4" />}
                <span>{orderModeLabels[order.orderMode] || order.orderMode}</span>
                {order.deliveryAddress && (
                  <>
                    <MapPin className="w-4 h-4 ml-2" />
                    <span>{order.deliveryAddress}</span>
                  </>
                )}
              </div>

              {/* Order items */}
              <div className="space-y-2 mb-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-[#1A0C00]">
                      {item.quantite}x {item.nom}
                    </span>
                    <span className="text-[#737373]">
                      {formatFCFA(item.prix * item.quantite)} FCFA
                    </span>
                  </div>
                ))}
              </div>

              {/* Action button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setActiveOrder(activeOrder === order.id ? null : order.id)}
                  className="px-4 py-2 text-sm text-[#EA580C] hover:bg-[#FFF0DF] rounded-lg transition"
                >
                  {activeOrder === order.id ? 'Masquer les détails' : 'Voir les détails'}
                </button>
              </div>

              {/* Detailed view */}
              {activeOrder === order.id && (
                <div className="mt-4 pt-4 border-t border-[#E2E8F0] bg-white rounded-xl p-4">
                  <h4 className="font-semibold text-[#1A0C00] mb-3">Détails de la commande</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Numéro de commande:</strong> {order.id}</p>
                      <p><strong>Date:</strong> {new Date(order.timestamp).toLocaleString('fr-FR')}</p>
                      <p><strong>Restaurant:</strong> {order.restaurantName}</p>
                    </div>
                    <div>
                      <p><strong>Mode:</strong> {orderModeLabels[order.orderMode]}</p>
                      {order.deliveryAddress && <p><strong>Adresse:</strong> {order.deliveryAddress}</p>}
                      <p><strong>Total:</strong> {formatFCFA(order.total)} FCFA</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

