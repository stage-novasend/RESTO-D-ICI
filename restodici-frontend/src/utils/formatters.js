// src/utils/formatters.js
// Utilitaires de formatage conformes au CDC §10 (Design System)

/**
 * Formate un montant en FCFA selon les standards ivoiriens
 * @param {number} amount - Montant à formater
 * @returns {string} Montant formaté ex: "3 500 FCFA"
 */
export const formatFCFA = (amount) => {
  const n = Number(amount);
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('fr-CI', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(n).replace('XOF', 'FCFA').trim();
};

/**
 * Formate une date ISO en format lisible fr-FR
 * @param {string|Date} dateString - Date à formater
 * @returns {string} Date formatée ex: "05 mai 2026, 14:30"
 */
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Labels des statuts de commande (RG-10 - séquentiels)
 */
export const STATUS_LABELS = {
  RECUE: 'Reçue',
  CONFIRMEE: 'Confirmée',
  EN_PREP: 'En préparation',
  PRETE: 'Prête',
  EN_LIVRAISON: 'En livraison',
  LIVREE: 'Livrée',
  ANNULEE: 'Annulée',
};

/**
 * Classes Tailwind pour les badges de statut (palette Savane Moderne)
 */
export const STATUS_COLORS = {
  RECUE: 'bg-blue-100 text-blue-700',
  CONFIRMEE: 'bg-indigo-100 text-indigo-700',
  EN_PREP: 'bg-orange-100 text-orange-700',
  PRETE: 'bg-yellow-100 text-yellow-700',
  EN_LIVRAISON: 'bg-purple-100 text-purple-700',
  LIVREE: 'bg-[#2ECC71]/20 text-[#2ECC71]',
  ANNULEE: 'bg-red-100 text-red-700',
};

/**
 * Formatage des modes de livraison
 */
export const formatDeliveryMode = (mode) => {
  const modes = {
    SUR_PLACE: 'Sur place',
    EMPORTER: 'À emporter',
    LIVRAISON: 'Livraison',
  };
  return modes[mode] || mode;
};

/**
 * Tronque un texte avec ellipsis pour l'UI mobile
 */
export const truncate = (text, maxLength = 50) => {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
};

/**
 * Calcule le temps écoulé depuis une date (pour le suivi commande US-07)
 */
export const timeAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  return formatDate(dateString);
};