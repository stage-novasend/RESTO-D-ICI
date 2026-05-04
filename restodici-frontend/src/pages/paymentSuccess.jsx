// src/pages/PaymentSuccess.jsx
import { useNavigate } from 'react-router-dom';
import { Check, Clock } from 'lucide-react';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const orderId = 'R1234';

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 shadow-card-hover max-w-sm w-full text-center">
        {/* Icône succès */}
        <div className="w-20 h-20 bg-secondary-light rounded-full flex items-center justify-center mx-auto mb-6">
          <div className="w-14 h-14 bg-secondary rounded-full flex items-center justify-center">
            <Check className="w-8 h-8 text-white" strokeWidth={3} />
          </div>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold font-display text-neutral-900 mb-2">
          Paiement réussi !
        </h1>
        <p className="text-neutral-500 mb-6">
          Votre commande <span className="font-bold text-primary">#{orderId}</span> a été confirmée.
        </p>

        {/* Temps de livraison */}
        <div className="bg-neutral-100 rounded-xl p-5 mb-6">
          <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-sm text-neutral-600 mb-1">Livraison prévue dans</p>
          <p className="text-3xl font-bold text-primary">25-35 min</p>
        </div>

        {/* Boutons */}
        <button
          onClick={() => navigate(`/suivi/${orderId}`)}
          className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-button hover:bg-primary-dark transition-all mb-3"
        >
          SUIVRE MA COMMANDE
        </button>
        
        <button
          onClick={() => navigate('/menu')}
          className="w-full text-primary font-medium py-2 hover:bg-primary-lighter rounded-xl transition-colors"
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}