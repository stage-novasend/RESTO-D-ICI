// src/pages/OrderTracking.jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Clock, MapPin, Phone, Truck, Home } from 'lucide-react';

export default function OrderTrackingPage() {
  const { id } = useParams();
  const [currentStep, setCurrentStep] = useState(2);

  const steps = [
    { id: 0, title: 'Commande confirmée', desc: 'Votre commande a été reçue par le restaurant.', time: '19:45', icon: Check },
    { id: 1, title: 'En préparation', desc: 'Le chef prépare vos plats avec soin.', time: '19:50', icon: Clock },
    { id: 2, title: 'Prête / En livraison', desc: 'Le livreur a récupéré votre commande. Arrivée estimée dans :', time: 'En cours', icon: Truck, isCurrent: true },
    { id: 3, title: 'Livrée', desc: 'Bon appétit !', time: '', icon: Home },
  ];

  const order = {
    id: 'R1234',
    date: "Aujourd'hui",
    items: [
      { nom: '1x Poulet Braisé Entier', prix: 8500 },
      { nom: '2x Alloco portion', prix: 2000 },
    ],
    total: 10500,
    deliveryAddress: 'Cocody Danga, Villa 42, Abidjan',
    restaurant: 'La Braise Ivoirienne',
    driver: { nom: 'Amadou', role: 'Votre livreur' },
    estimatedTime: '15 min',
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-display text-neutral-900">Suivi de commande</h1>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-neutral-500">Commande</span>
          <span className="text-sm font-bold text-primary">#{order.id}</span>
          <span className="text-xs bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded-full">
            {order.date}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Timeline statut */}
        <div className="bg-white rounded-2xl p-5 shadow-card">
          <h2 className="font-bold text-lg text-neutral-900 mb-4">Statut actuel</h2>
          
          <div className="space-y-0">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStep;
              const isCurrent = step.isCurrent;
              const isLast = index === steps.length - 1;

              return (
                <div key={step.id} className="flex gap-4">
                  {/* Ligne verticale */}
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isCompleted
                        ? 'bg-primary text-white'
                        : isCurrent
                        ? 'bg-primary-lighter text-primary animate-pulse'
                        : 'bg-neutral-200 text-neutral-400'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 h-16 ${
                        isCompleted ? 'bg-primary' : 'bg-neutral-200'
                      }`} />
                    )}
                  </div>

                  {/* Contenu */}
                  <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
                    <h3 className={`font-bold ${
                      isCurrent ? 'text-primary' : isCompleted ? 'text-neutral-900' : 'text-neutral-400'
                    }`}>
                      {step.title}
                    </h3>
                    <p className="text-sm text-neutral-500 mt-1">{step.desc}</p>
                    
                    {isCurrent && (
                      <div className="mt-3 bg-neutral-100 rounded-xl p-4">
                        <div className="text-3xl font-bold text-primary mb-1">
                          {order.estimatedTime}
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                          <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-white text-sm font-bold">
                            {order.driver.nom[0]}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-neutral-900">{order.driver.nom}</p>
                            <p className="text-xs text-neutral-500">{order.driver.role}</p>
                          </div>
                          <button className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center">
                            <Phone className="w-5 h-5 text-neutral-700" />
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {step.time && !isCurrent && (
                      <span className="text-xs text-neutral-400 mt-1 block">{step.time}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Détails livraison */}
        <div className="bg-white rounded-2xl p-5 shadow-card space-y-4">
          <h3 className="font-bold text-neutral-900">Détails de livraison</h3>
          
          {/* Carte placeholder */}
          <div className="h-32 bg-neutral-200 rounded-xl flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-300 to-neutral-400 opacity-50" />
            <MapPin className="w-8 h-8 text-primary relative z-10" />
            <span className="absolute bottom-2 text-xs text-neutral-600 font-medium">Carte</span>
          </div>

          <div className="space-y-3">
            <div className="flex gap-3">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-neutral-500">Adresse</p>
                <p className="text-sm font-medium text-neutral-900">{order.deliveryAddress}</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <ChefHat className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-neutral-500">Restaurant</p>
                <p className="text-sm font-medium text-neutral-900">{order.restaurant}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ma Commande */}
        <div className="bg-white rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-neutral-900">Ma Commande</h3>
            <button className="text-sm text-primary font-medium">Voir détails</button>
          </div>
          
          <div className="space-y-2">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-neutral-600">{item.nom}</span>
                <span className="font-medium text-neutral-900">{item.prix.toLocaleString('fr-FR')} FCFA</span>
              </div>
            ))}
          </div>
          
          <div className="border-t border-neutral-200 mt-3 pt-3 flex justify-between">
            <span className="font-bold text-neutral-900">Total</span>
            <span className="text-lg font-bold text-primary">
              {order.total.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}