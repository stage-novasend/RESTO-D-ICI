// src/pages/OrderTracking.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, Clock, MapPin, Phone, ChevronRight, Truck } from 'lucide-react';
import {
  commandesService,
  createCommandesSocket,
} from '../../services/commandes.service';
import { formatFCFA, formatDate, STATUS_LABELS, STATUS_COLORS } from '../../utils/formatters';

const STEPS = [
  { key: 'RECUE', label: 'Reçue en cuisine', icon: Check, color: 'bg-gray-300' },
  { key: 'CONFIRMEE', label: 'Confirmée', icon: Check, color: 'bg-[#D94500]' },
  { key: 'EN_PREP', label: 'En préparation', icon: Clock, color: 'bg-[#D94500]' },
  { key: 'PRETE', label: 'Prête / En livraison', icon: Truck, color: 'bg-[#2ECC71]' },
  { key: 'LIVREE', label: 'Livrée', icon: MapPin, color: 'bg-[#2ECC71]' },
];

export default function OrderTrackingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    
    let active = true;
    let poll;
    const fetchOrder = async () => {
      try {
        const res = await commandesService.findOne(id);
        if (!active) return;
        setOrder(res.data);
        setLoading(false);
        
        // Arrêt du polling si statut final (RG-10)
        if (['LIVREE', 'ANNULEE'].includes(res.data.statut)) {
          clearInterval(poll);
        }
      } catch (err) {
        if (!active) return;
        setError(err.response?.data?.message || 'Impossible de charger le suivi');
        setLoading(false);
      }
    };

    const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUser = cachedUser?.user || cachedUser;
    const socket = createCommandesSocket(currentUser);

    const refreshOrder = async () => {
      if (!id) return;
      await fetchOrder();
    };

    socket.on('commande.statut', (payload) => {
      if (payload?.id === id) {
        void refreshOrder();
      }
    });

    socket.on('commande.paiement', (payload) => {
      if (payload?.id === id) {
        void refreshOrder();
      }
    });

    fetchOrder();
    poll = setInterval(fetchOrder, 5000);

    return () => {
      active = false;
      clearInterval(poll);
      socket.disconnect();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F7F5] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#D94500] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#F9F7F5] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white rounded-2xl p-8 max-w-sm shadow-lg border border-[#E8E2D9]">
          <p className="text-red-600 font-semibold mb-4">{error || 'Aucune commande trouvée'}</p>
          <button 
            onClick={() => navigate('/menu')} 
            className="bg-[#D94500] hover:bg-[#B83A00] text-white font-bold py-3 px-6 rounded-xl transition-all"
          >
            Retour au menu
          </button>
        </div>
      </div>
    );
  }

  const currentStep = STEPS.findIndex(s => s.key === order.statut);
  const activeStep = Math.max(currentStep, 0);

  return (
    <div className="min-h-screen bg-[#F9F7F5]">
      {/* Header */}
      <header className="bg-white border-b border-[#E8E2D9] sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-[#8B7355] hover:text-[#D94500]">← Retour</button>
          <h1 className="font-bold text-[#2D2720]">Suivi de commande</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Numéro de commande */}
        <div className="text-center mb-8">
          <p className="text-sm text-[#8B7355]">Commande</p>
          <p className="text-2xl font-bold text-[#D94500]">#{order.numero}</p>
          <p className="text-xs text-[#8B7355] mt-1">{formatDate(order.createdAt)}</p>
        </div>

        {/* Timeline des statuts (RG-10: séquentiel irréversible) */}
        <div className="bg-white rounded-2xl border border-[#E8E2D9] p-6 mb-6">
          <h2 className="font-bold text-[#2D2720] mb-6">État de votre commande</h2>
          
          <div className="space-y-0">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < activeStep;
              const isCurrent = index === activeStep;
              const isLast = index === STEPS.length - 1;

              return (
                <div key={step.key} className="flex gap-4">
                  {/* Icône + Ligne */}
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isCompleted || isCurrent ? `${step.color} text-white scale-110` : 'bg-gray-200 text-gray-400'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {!isLast && (
                      <div className={`w-1 h-12 mt-2 transition-all ${
                        isCompleted ? 'bg-[#D94500]' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>

                  {/* Contenu */}
                  <div className={`flex-1 pb-8 ${isLast ? 'pb-0' : ''}`}>
                    <h3 className={`font-semibold mb-1 ${
                      isCurrent ? 'text-[#D94500]' : isCompleted ? 'text-[#2D2720]' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </h3>
                    {isCurrent && <p className="text-xs text-[#8B7355] animate-pulse">En cours...</p>}
                    {isCompleted && (
                      <span className="text-xs text-gray-400">
                        {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Détails de la commande */}
        <div className="bg-white rounded-2xl border border-[#E8E2D9] p-6 mb-6">
          <h3 className="font-bold text-[#2D2720] mb-4">Détails</h3>
          
          <div className="space-y-3 mb-4">
            {order.lignes?.map((ligne, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-[#8B7355]">
                  {ligne.quantite}x {ligne.article?.nom || 'Article'}
                  {ligne.instructions && <span className="block text-xs italic">• {ligne.instructions}</span>}
                </span>
                <span className="font-medium">{formatFCFA(ligne.prixUnitaire * ligne.quantite)}</span>
              </div>
            ))}
          </div>
          
          <div className="border-t border-[#E8E2D9] pt-4 flex justify-between items-center">
            <span className="font-bold text-[#2D2720]">Total payé</span>
            <span className="text-xl font-bold text-[#D94500]">{formatFCFA(order.montantTotal)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => navigate('/menu')}
            className="flex-1 bg-white border border-[#E8E2D9] text-[#2D2720] font-bold py-3.5 rounded-xl hover:bg-[#F9F7F5] transition-all"
          >
            Commander autre chose
          </button>
          <button 
            onClick={() => navigate('/client/orders')}
            className="flex-1 bg-[#D94500] hover:bg-[#B83A00] text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            Voir mes commandes <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </main>
    </div>
  );
}