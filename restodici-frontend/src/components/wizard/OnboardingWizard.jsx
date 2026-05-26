import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  ArrowRight, ArrowLeft, X, ChefHat, Building2, ShoppingBag,
  Users, Package, TrendingUp, Settings, Star, Flame, Check,
} from 'lucide-react';

const ACCENT = '#C05015';
const CREAM = '#0F172A';
const MUTED = '#64748B';
const GOLD = '#F97316';

const STEPS_BY_ROLE = {
  CLIENT: [
    {
      icon: ShoppingBag,
      title: "Bienvenue sur Resto d'ici !",
      desc: "Commandez vos repas préférés en quelques clics. Découvrez les restaurants locaux, suivez vos livraisons en direct et gérez vos commandes depuis votre espace.",
      action: null,
    },
    {
      icon: Star,
      title: 'Explorez les menus',
      desc: "Parcourez les cartes de nos restaurants partenaires. Filtrez par type de cuisine ou par zone de livraison pour trouver ce qui vous convient.",
      action: { label: 'Voir les menus', to: '/menu' },
    },
    {
      icon: Package,
      title: 'Suivez vos commandes',
      desc: "Dans votre espace \"Mes commandes\", retrouvez l'historique de vos achats, téléchargez vos reçus et suivez la progression de chaque livraison.",
      action: { label: 'Mes commandes', to: '/commandes' },
    },
    {
      icon: Settings,
      title: 'Sécurisez votre compte',
      desc: "Activez la double authentification (2FA) depuis l'onglet Sécurité pour protéger votre compte. Vous pouvez aussi personnaliser votre profil.",
      action: null,
    },
  ],
  GERANT: [
    {
      icon: ChefHat,
      title: 'Bienvenue, gérant !',
      desc: "Votre espace de gestion est prêt. Configurez votre restaurant, ajoutez vos plats et suivez vos commandes en temps réel depuis ce tableau de bord.",
      action: null,
    },
    {
      icon: Settings,
      title: 'Configurez votre restaurant',
      desc: "Dans l'onglet Paramètres, ajoutez votre logo, vos horaires d'ouverture, vos zones de livraison et les informations de contact.",
      action: null,
    },
    {
      icon: Package,
      title: 'Ajoutez votre premier plat',
      desc: "Dans la section Menu, créez vos catégories (Entrées, Plats, Desserts…) puis ajoutez vos articles avec photos, descriptions et prix.",
      action: null,
    },
    {
      icon: Users,
      title: 'Gérez votre équipe',
      desc: "Créez les comptes de vos serveurs et cuisiniers depuis l'onglet Équipe. Ils pourront accéder au KDS cuisine pour préparer les commandes.",
      action: null,
    },
    {
      icon: TrendingUp,
      title: 'Suivez votre trésorerie',
      desc: "L'onglet Trésorerie affiche vos recettes en temps réel et vous permet d'exporter vos données au format SYSCOHADA pour votre comptabilité.",
      action: null,
    },
  ],
  B2B: [
    {
      icon: Building2,
      title: "Bienvenue dans l'espace entreprise !",
      desc: "Gérez les repas de vos équipes, suivez les dépenses par collaborateur et obtenez des factures SYSCOHADA générées automatiquement chaque mois.",
      action: null,
    },
    {
      icon: Settings,
      title: 'Créez votre compte entreprise',
      desc: "Renseignez votre RCCM, NIF et adresse pour valider votre compte entreprise. Cela débloque les commandes groupées et la facturation mensuelle.",
      action: { label: 'Configurer le compte', to: '/b2b/teams' },
    },
    {
      icon: Users,
      title: 'Ajoutez des collaborateurs',
      desc: "Invitez vos employés et définissez un budget journalier ou mensuel par personne. Chaque collaborateur commande dans sa limite budgétaire.",
      action: { label: 'Gérer les équipes', to: '/b2b/teams' },
    },
    {
      icon: Package,
      title: 'Commandes groupées',
      desc: "Commandez pour toute l'équipe en une seule commande — idéal pour les déjeuners et événements. Minimum 20 couverts, préavis de 4h.",
      action: { label: 'Passer une commande', to: '/b2b/bulk-order' },
    },
  ],
  STAFF: [
    {
      icon: ChefHat,
      title: "Bienvenue dans l'espace cuisine !",
      desc: "Vous avez accès au tableau de bord cuisine. Traitez les commandes en temps réel et mettez à jour les statuts pour informer les serveurs et les clients.",
      action: null,
    },
    {
      icon: Flame,
      title: 'Interface KDS',
      desc: "Le KDS (Kitchen Display System) affiche toutes les commandes entrantes triées par priorité. Changez le statut de chaque commande au fur et à mesure de la préparation.",
      action: null,
    },
  ],
};

function StepDot({ total, current }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: i === current ? 20 : 6,
            background: i === current ? ACCENT : 'rgba(89,67,42,0.15)',
          }}
        />
      ))}
    </div>
  );
}

export default function OnboardingWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  const role = user?.role?.toUpperCase();
  const userId = user?.id;
  const steps = STEPS_BY_ROLE[role] ?? [];

  useEffect(() => {
    if (!userId || !steps.length) return;
    const key = `wizard_done_${userId}`;
    if (!localStorage.getItem(key)) {
      setVisible(true);
    }
  }, [userId, steps.length]);

  const dismiss = () => {
    localStorage.setItem(`wizard_done_${userId}`, '1');
    setVisible(false);
  };

  const handleAction = (action) => {
    if (action?.to) navigate(action.to);
    dismiss();
  };

  if (!visible || !steps.length) return null;

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(17,16,13,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Top accent strip */}
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${ACCENT}, ${GOLD})` }} />

        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-[#9A7060] hover:text-gray-700 hover:bg-[#FBE8DC] transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="px-8 pt-8 pb-6 text-center">
          {/* Icon */}
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm"
            style={{ background: 'linear-gradient(135deg, #FFF1EC, #FFD8CC)' }}
          >
            <Icon className="h-8 w-8" style={{ color: ACCENT }} />
          </div>

          {/* Step badge */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: GOLD }}>
            Étape {step + 1} sur {steps.length}
          </p>

          <h2 className="text-xl font-bold leading-tight mb-3" style={{ color: CREAM }}>
            {current.title}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
            {current.desc}
          </p>
        </div>

        {/* Dots */}
        <div className="pb-4">
          <StepDot total={steps.length} current={step} />
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex flex-col gap-3">
          {current.action && (
            <button
              onClick={() => handleAction(current.action)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: ACCENT }}
            >
              {current.action.label}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1.5 rounded-2xl border px-4 py-2.5 text-sm font-medium transition hover:bg-white"
                style={{ borderColor: 'rgba(89,67,42,0.15)', color: MUTED }}
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </button>
            )}

            {!isLast ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold transition"
                style={{ background: '#FDF5EF', color: CREAM }}
              >
                Suivant
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={dismiss}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold transition"
                style={{ background: '#FDF5EF', color: CREAM }}
              >
                <Check className="h-4 w-4" />
                C'est parti !
              </button>
            )}
          </div>

          <button onClick={dismiss} className="text-center text-xs transition" style={{ color: MUTED }}>
            Passer l'introduction
          </button>
        </div>
      </div>
    </div>
  );
}
