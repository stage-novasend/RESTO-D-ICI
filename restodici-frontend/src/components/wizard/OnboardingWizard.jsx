import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  ArrowRight, ArrowLeft, X, ChefHat, Building2, ShoppingBag,
  Users, Package, TrendingUp, Settings, Star, Flame, Check,
  Shield, LayoutDashboard, Bell,
} from 'lucide-react';

import { ORANGE as ACCENT, DARK_STONE as DARK, MUTED_WARM as MUTED } from '../../theme/colors';

const STEPS_BY_ROLE = {
  CLIENT: [
    {
      icon: ShoppingBag,
      title: "Bienvenue sur Resto d'ici !",
      desc: "Commandez vos plats préférés en quelques clics auprès des meilleurs restaurants d'Abidjan. Votre premier repas est à portée de main.",
      action: { label: 'Explorer le menu', to: '/menu' },
    },
    {
      icon: Star,
      title: 'Découvrez les restaurants',
      desc: "Parcourez les cartes, filtrez par catégorie ou zone de livraison. Chaque restaurant affiche ses notes réelles laissées par d'autres clients.",
      action: null,
    },
    {
      icon: Package,
      title: 'Suivez vos commandes',
      desc: "Dans l'onglet \"Commandes\" de votre espace, retrouvez l'historique de vos achats, téléchargez vos reçus et suivez chaque livraison en direct.",
      action: null,
    },
    {
      icon: Settings,
      title: 'Complétez votre profil',
      desc: "Ajoutez votre adresse de livraison préférée et vos moyens de paiement (Orange Money, Wave, MTN MoMo) pour commander encore plus vite.",
      action: null,
    },
  ],

  GERANT: [
    {
      icon: ChefHat,
      title: 'Bienvenue dans votre espace gérant !',
      desc: "Votre tableau de bord est prêt. Configurez votre restaurant, publiez votre menu et commencez à recevoir des commandes en temps réel.",
      action: null,
    },
    {
      icon: Settings,
      title: 'Configurez votre restaurant',
      desc: "Dans l'onglet Paramètres : ajoutez votre logo, vos horaires d'ouverture, vos zones de livraison et vos coordonnées de contact.",
      action: null,
    },
    {
      icon: Package,
      title: 'Publiez votre premier plat',
      desc: "Menu → Catégories → Nouveau plat. Renseignez nom, photo, description et prix. Vos clients voient les changements instantanément.",
      action: null,
    },
    {
      icon: Users,
      title: 'Invitez votre équipe',
      desc: "Créez les comptes de vos serveurs et cuisiniers depuis l'onglet Équipe. Ils accèderont au KDS cuisine pour préparer les commandes.",
      action: null,
    },
    {
      icon: TrendingUp,
      title: 'Pilotez votre trésorerie',
      desc: "L'onglet Trésorerie affiche vos recettes en temps réel et permet d'exporter vos données au format SYSCOHADA pour votre comptabilité.",
      action: null,
    },
  ],

  B2B: [
    {
      icon: Building2,
      title: "Bienvenue dans l'espace entreprise !",
      desc: "Gérez les repas de vos équipes, contrôlez les dépenses par collaborateur et obtenez des factures SYSCOHADA générées automatiquement.",
      action: null,
    },
    {
      icon: Settings,
      title: 'Validez votre compte entreprise',
      desc: "Renseignez votre RCCM, NIF et adresse pour activer la facturation mensuelle et les commandes groupées.",
      action: { label: 'Configurer le compte', to: '/b2b/teams' },
    },
    {
      icon: Users,
      title: 'Ajoutez vos collaborateurs',
      desc: "Invitez vos employés et fixez un budget journalier ou mensuel par personne. Chaque commande se déduira automatiquement de leur enveloppe.",
      action: { label: 'Gérer les équipes', to: '/b2b/teams' },
    },
    {
      icon: Package,
      title: 'Passez votre première commande groupée',
      desc: "Sélectionnez un restaurant, choisissez les plats par collaborateur, indiquez lieu et heure de livraison. Minimum 4h à l'avance.",
      action: { label: 'Commander maintenant', to: '/b2b/bulk-order' },
    },
  ],

  STAFF: [
    {
      icon: ChefHat,
      title: "Bienvenue dans l'espace cuisine !",
      desc: "Votre espace est actif. Traitez les commandes en temps réel et mettez à jour les statuts pour informer les serveurs et les clients.",
      action: null,
    },
    {
      icon: Flame,
      title: 'Le KDS — votre outil principal',
      desc: "Le KDS affiche toutes les commandes entrant par ordre de priorité. Changez le statut (En préparation → Prête) au fur et à mesure.",
      action: null,
    },
    {
      icon: Bell,
      title: 'Notifications en temps réel',
      desc: "Dès qu'une nouvelle commande arrive, une notification s'affiche. Activez le son dans votre navigateur pour ne rien manquer.",
      action: null,
    },
  ],

  ADMIN: [
    {
      icon: Shield,
      title: "Bienvenue dans l'interface d'administration !",
      desc: "Vous avez accès à l'ensemble du système : gestion des utilisateurs, des restaurants, des commandes, et supervision de la facturation B2B.",
      action: null,
    },
    {
      icon: LayoutDashboard,
      title: "Vue d'ensemble",
      desc: "L'onglet Overview affiche les métriques clés en temps réel : revenus, commandes actives, restaurants en ligne et alertes système.",
      action: null,
    },
    {
      icon: Users,
      title: 'Gérez les utilisateurs',
      desc: "Validez les comptes B2B en attente, gérez les rôles (CLIENT, GÉRANT, STAFF, B2B) et suspendez les comptes si nécessaire.",
      action: null,
    },
    {
      icon: TrendingUp,
      title: 'Supervisions & rapports',
      desc: "Consultez les rapports financiers par restaurant, suivez les KPIs de livraison et exportez les données comptables au format SYSCOHADA.",
      action: null,
    },
  ],
};

function StepDot({ total, current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 6, borderRadius: 3,
          width: i === current ? 20 : 6,
          background: i === current ? ACCENT : 'rgba(89,67,42,0.15)',
          transition: 'all 0.25s ease',
        }} />
      ))}
    </div>
  );
}

export default function OnboardingWizard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [step, setStep]       = useState(0);
  const [visible, setVisible] = useState(false);

  const role  = user?.role?.toUpperCase();
  const userId = user?.id;
  const steps  = STEPS_BY_ROLE[role] ?? [];

  useEffect(() => {
    if (!userId || !steps.length) return;
    const key = `wizard_done_${userId}`;
    if (!localStorage.getItem(key)) setVisible(true);
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
  const Icon    = current.icon;
  const isLast  = step === steps.length - 1;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(17,16,13,0.60)', backdropFilter: 'blur(4px)' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 420, borderRadius: 24, background: '#fff', boxShadow: '0 24px 80px rgba(0,0,0,0.20)', overflow: 'hidden' }}>

        {/* Bande accent */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${ACCENT}, #FFB800)` }} />

        {/* Fermer */}
        <button onClick={dismiss} style={{ position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: 10, border: 'none', background: '#F4F5F7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={14} color={MUTED} />
        </button>

        {/* Contenu */}
        <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ padding: '28px 32px 20px', textAlign: 'center' }}
        >
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, #FFF1EC, #FFD8CC)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: `0 4px 16px ${ACCENT}28` }}>
            <Icon size={28} color={ACCENT} />
          </div>

          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: ACCENT }}>
            Étape {step + 1} sur {steps.length}
          </p>
          <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 800, color: DARK, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
            {current.title}
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: MUTED, lineHeight: 1.65 }}>
            {current.desc}
          </p>
        </motion.div>
        </AnimatePresence>

        {/* Points de progression */}
        <div style={{ paddingBottom: 16 }}>
          <StepDot total={steps.length} current={step} />
        </div>

        {/* Boutons */}
        <div style={{ padding: '0 32px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {current.action && (
            <button onClick={() => handleAction(current.action)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, padding: '12px 0', background: ACCENT, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, boxShadow: `0 4px 16px ${ACCENT}44` }}>
              {current.action.label} <ArrowRight size={15} />
            </button>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(89,67,42,0.14)', background: '#fff', fontSize: 13, fontWeight: 600, color: MUTED, cursor: 'pointer' }}>
                <ArrowLeft size={14} /> Retour
              </button>
            )}
            {!isLast ? (
              <button onClick={() => setStep(s => s + 1)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 0', borderRadius: 12, border: 'none', background: '#FDF5EF', color: DARK, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Suivant <ArrowRight size={14} />
              </button>
            ) : (
              <button onClick={dismiss}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 0', borderRadius: 12, border: 'none', background: '#FDF5EF', color: DARK, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <Check size={14} /> C'est parti !
              </button>
            )}
          </div>

          <button onClick={dismiss}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: MUTED, padding: 0, textAlign: 'center' }}>
            Passer l'introduction
          </button>
        </div>
      </div>
    </div>
  );
}
