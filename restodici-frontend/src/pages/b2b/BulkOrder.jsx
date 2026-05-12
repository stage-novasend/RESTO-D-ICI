// src/pages/b2b/BulkOrder.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, UtensilsCrossed, User, Clock, MapPin, Package, Plus, Trash2, AlertCircle } from 'lucide-react';
import { menuAPI, b2bAPI } from '../../services/api';
import DeliveryMap from '../../components/maps/DeliveryMap';


export default function BulkOrder() {
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [deliveryInfo, setDeliveryInfo] = useState({
    date: '',
    time: '',
    address: '',
    location: 'siege',
  });
  const [selectedEmployeeByArticle, setSelectedEmployeeByArticle] = useState({});
  const [budgetLimit, setBudgetLimit] = useState(450000);
  const [monthlySpent, setMonthlySpent] = useState(325000); // Mock data - would come from API
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);

  const deliveryLocations = [
    { id: 'siege', label: 'Siège Abidjan', address: 'Cocody, Abidjan' },
    { id: 'succursale', label: 'Succursale Marcory', address: 'Marcory, Abidjan' },
    { id: 'entrepot', label: 'Entrepôt Treichville', address: 'Treichville, Abidjan' }
  ];

  const navigate = useNavigate();

  // Calculate total order amount
  const totalOrderAmount = orderItems.reduce((sum, item) => sum + (item.prix * item.quantite), 0);
  
  // Check if budget validation is required
  useEffect(() => {
    const remainingBudget = budgetLimit - monthlySpent;
    setRequiresApproval(totalOrderAmount > remainingBudget);
  }, [totalOrderAmount, budgetLimit, monthlySpent]);

  // Load restaurants and employees when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load restaurants (this should work as menuAPI is implemented)
        const restaurantsRes = await menuAPI.get({ cible: 'CLIENT' });
        const uniqueRestaurants = Array.from(
          new Map(restaurantsRes.data.map(item => [item.restaurantId, item])).values()
        );
        setRestaurants(uniqueRestaurants);
        
        // Load employees with fallback
        try {
          const employeesRes = await b2bAPI.getCollaborators();
          setEmployees(employeesRes.data || []);
        } catch (err) {
          console.warn('Could not load collaborators, using mock data');
          setEmployees([
            { id: 'emp1', nom: 'Jean Kouassi', email: 'jean@entreprise.com', role: 'employe' },
            { id: 'emp2', nom: 'Marie Koné', email: 'marie@entreprise.com', role: 'manager' },
            { id: 'emp3', nom: 'Paul Traoré', email: 'paul@entreprise.com', role: 'employe' }
          ]);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Impossible de charger les données nécessaires');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Load menu when restaurant is selected
  useEffect(() => {
    if (!selectedRestaurant) {
      setMenuItems([]);
      return;
    }
    
    const loadMenu = async () => {
      try {
        const menuRes = await menuAPI.get({ cible: 'CLIENT', restaurantId: selectedRestaurant.restaurantId });
        setMenuItems(menuRes.data || []);
      } catch (err) {
        console.error('Error loading menu:', err);
        setError('Impossible de charger le menu du restaurant');
      }
    };
    
    loadMenu();
  }, [selectedRestaurant]);

  const handleRestaurantSelect = async (restaurant) => {
    setSelectedRestaurant(restaurant);
  };

  const addToOrder = (menuItem, employeeId = null) => {
    setOrderItems(prev => {
      const existing = prev.find(item => item.articleId === menuItem.id && item.employeeId === employeeId);
      if (existing) {
        return prev.map(item =>
          item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, {
        id: Date.now(),
        articleId: menuItem.id,
        nom: menuItem.nom,
        prix: menuItem.prix,
        employeeId,
        quantity: 1
      }];
    });
  };

  const updateOrderItem = (id, updates) => {
    setOrderItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeOrderItem = (id) => {
    setOrderItems(prev => prev.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => total + (item.prix * item.quantity), 0);
  };

  const budgetExceeded = calculateTotal() > budgetLimit;

  const handleSubmitOrder = async () => {
    if (orderItems.length === 0) {
      setError('Veuillez ajouter au moins un article à la commande');
      return;
    }

    // Le DTO backend B2B attend deliveryAddress et/ou deliveryDateTime (optionnel),
    // mais on peut envoyer au minimum deliveryAddress + total/subtotal.
    try {
      setLoading(true);
      setError('');

      const subtotal = orderItems.reduce(
        (sum, item) => sum + (item.prix * item.quantity),
        0,
      );

      // deliveryAddress: on priorise la sélection lieu, sinon le champ adresse texte.
      const deliveryAddress =
        deliveryLocations.find((loc) => loc.id === deliveryInfo.location)?.address ||
        deliveryInfo.address;

      // deliveryDateTime: optionnel, on le construit si date et time existent.
      const deliveryDateTime =
        deliveryInfo.date && deliveryInfo.time
          ? new Date(`${deliveryInfo.date}T${deliveryInfo.time}:00`)
          : undefined;

      const orderData = {
        items: orderItems.map((item) => ({
          articleId: item.articleId,
          quantity: item.quantity,
          unitPrice: item.prix,
          total: item.prix * item.quantity,
        })),
        subtotal,
        deliveryFee: 0,
        total: subtotal,
        deliveryAddress,
        deliveryDateTime,
      };

      // Submit to backend
      await b2bAPI.bulkOrder(orderData);

      alert('Commande passée avec succès!');
      navigate('/b2b/dashboard');
    } catch (err) {
      console.error('Error submitting order:', err);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Erreur lors de la soumission de la commande',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F5] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-8 h-8 text-[#2ECC71]" />
            <h1 className="text-3xl font-bold text-[#2D2720]">Commande Groupée</h1>
          </div>
          <p className="text-[#8B7355]">
            Commandez pour plusieurs employés en une seule fois
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Restaurants & Menu */}
          <div className="lg:col-span-2 space-y-6">
            {/* Restaurant Selection */}
            <div className="bg-white rounded-2xl p-6 border border-[#E8E2D9]">
              <h2 className="text-xl font-bold text-[#2D2720] mb-4">Sélectionner un restaurant</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {restaurants.map(restaurant => (
                  <button
                    key={restaurant.id}
                    onClick={() => handleRestaurantSelect(restaurant)}
                    className={`p-4 rounded-xl border transition-all ${
                      selectedRestaurant?.id === restaurant.id
                        ? 'border-[#2ECC71] bg-[#E6F7ED]'
                        : 'border-[#E8E2D9] hover:border-[#2ECC71]/50'
                    }`}
                  >
                    <img 
                      src={restaurant.photoUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100&h=100&fit=crop'} 
                      alt={restaurant.nom}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                    <h3 className="font-bold text-[#2D2720]">{restaurant.nom}</h3>
                  </button>
                ))}
              </div>
            </div>

            {/* Menu */}
            {selectedRestaurant && (
              <div className="bg-white rounded-2xl p-6 border border-[#E8E2D9]">
                <h2 className="text-xl font-bold text-[#2D2720] mb-4">
                  Menu - {selectedRestaurant.nom}
                </h2>
                <div className="space-y-4">
                  {menuItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 border border-[#E8E2D9] rounded-xl">
                      <div className="flex items-center gap-4">
                        <img 
                          src={item.photoUrl || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=80&h=80&fit=crop'} 
                          alt={item.nom}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div>
                          <h3 className="font-bold text-[#2D2720]">{item.nom}</h3>
                          <p className="text-sm text-[#8B7355]">{item.description}</p>
                          <p className="font-bold text-[#D94500]">{item.prix} FCFA</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <select
                          value={selectedEmployeeByArticle[item.id] || ''}
                          onChange={(e) => setSelectedEmployeeByArticle(prev => ({
                            ...prev,
                            [item.id]: e.target.value
                          }))}
                          className="rounded-2xl border border-[#E8E2D9] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2ECC71]"
                        >
                          <option value="">Aucune attribution</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.nom}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => addToOrder(item, selectedEmployeeByArticle[item.id] || null)}
                          className="px-4 py-2 bg-[#2ECC71] text-white rounded-xl hover:bg-[#27AE60] transition"
                        >
                          Ajouter
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Order Summary & Delivery */}
          <div className="space-y-6">
            {/* Budget Validation Warning */}
            {requiresApproval && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
                  <div>
                    <h3 className="font-semibold text-yellow-800">Validation budgétaire requise</h3>
                    <p className="text-yellow-700 text-sm">
                      Le montant total ({totalOrderAmount.toLocaleString()} FCFA) dépasse votre budget mensuel restant ({(budgetLimit - monthlySpent).toLocaleString()} FCFA). 
                      Une validation par le responsable est nécessaire.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-white rounded-2xl p-6 border border-[#E8E2D9] mb-6">
              <h2 className="text-xl font-bold text-[#2D2720] mb-4">Résumé de la commande</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#8B7355]">Total estimé:</span>
                  <span className="font-bold text-[#2D2720]">{totalOrderAmount.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B7355]">Budget mensuel:</span>
                  <span className="font-bold text-[#2D2720]">{budgetLimit.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B7355]">Dépensé ce mois:</span>
                  <span className="font-bold text-[#2D2720]">{monthlySpent.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#E8E2D9]">
                  <span className="font-semibold">Restant:</span>
                  <span className={`font-bold ${requiresApproval ? 'text-red-600' : 'text-green-600'}`}>
                    {(budgetLimit - monthlySpent).toLocaleString()} FCFA
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitOrder}
              disabled={loading || orderItems.length === 0}
              className={`w-full py-3 px-4 rounded-2xl font-bold text-white transition-all ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : requiresApproval 
                    ? 'bg-yellow-600 hover:bg-yellow-700' 
                    : 'bg-[#2ECC71] hover:bg-[#27AE60]'
              }`}
            >
              {loading ? (
                'Envoi en cours...'
              ) : requiresApproval ? (
                'Demander validation'
              ) : (
                'Envoyer la commande'
              )}
            </button>

            {/* Delivery Information */}
            <div className="bg-white rounded-2xl p-6 border border-[#E8E2D9]">
              <h2 className="text-xl font-bold text-[#2D2720] mb-4">Informations de livraison</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#2D2720] mb-2">Date de livraison</label>
                  <input
                    type="date"
                    value={deliveryInfo.date}
                    onChange={(e) => setDeliveryInfo(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2ECC71]"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#2D2720] mb-2">Heure de livraison</label>
                  <input
                    type="time"
                    value={deliveryInfo.time}
                    onChange={(e) => setDeliveryInfo(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2ECC71]"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#2D2720] mb-2">Lieu de livraison</label>
                  <select
                    value={deliveryInfo.location}
                    onChange={(e) => {
                      const nextLocation = e.target.value;
                      setDeliveryInfo(prev => ({ ...prev, location: nextLocation }));
                    }}
                    className="w-full rounded-2xl border border-[#E8E2D9] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2ECC71]"
                  >
                    {deliveryLocations.map((location) => (
                      <option key={location.id} value={location.id}>{location.label}</option>
                    ))}
                  </select>
                </div>

                {/* Google Maps picker */}
                <div>
                  <label className="block text-sm font-medium text-[#2D2720] mb-2">Choisir sur la carte</label>
                  <DeliveryMap
                    value={{
                      lat: deliveryInfo?.lat,
                      lng: deliveryInfo?.lng,
                    }}
                    onChange={({ lat, lng, address }) => {
                      setDeliveryInfo(prev => ({
                        ...prev,
                        lat,
                        lng,
                        address: address || prev.address,
                      }));
                    }}
                    heightClassName="h-64"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2D2720] mb-2">Adresse de livraison</label>
                  <textarea
                    value={deliveryInfo.address}
                    onChange={(e) => setDeliveryInfo(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Adresse complète pour la livraison"
                    className="w-full px-3 py-2 border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2ECC71]"
                    rows="3"
                  />
                </div>

                <div className="rounded-2xl bg-[#EBF5FB] p-4 border border-[#D4E8F2] text-sm text-[#2D2720]">
                  <div className="font-medium mb-1">Suggestion pour le lieu sélectionné</div>
                  {deliveryLocations.find(loc => loc.id === deliveryInfo.location)?.address}
                </div>

              </div>
            </div>

            {/* Employee Assignment */}
            {employees.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-[#E8E2D9]">
                <h2 className="text-xl font-bold text-[#2D2720] mb-4">Assigner aux employés</h2>
                <p className="text-sm text-[#8B7355] mb-4">
                  Cliquez sur un article dans le résumé pour l'assigner à un employé
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {employees.map(employee => (
                    <div key={employee.id} className="flex items-center gap-3 p-2 hover:bg-[#F9F7F5] rounded-lg">
                      <User className="w-5 h-5 text-[#8B7355]" />
                      <span className="text-[#2D2720]">{employee.nom}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}