/* _helpers.js — utilitaires purs partagés par les onglets du GerantDashboard */

export const EXPENSE_CATS = [
  { value: 'loyer',        label: 'Loyer',          color: '#8B5CF6' },
  { value: 'salaires',     label: 'Salaires',       color: '#F59E0B' },
  { value: 'charges',      label: 'Charges sociales',color:'#EC4899' },
  { value: 'fournitures',  label: 'Fournitures',    color: '#10B981' },
  { value: 'electricite',  label: 'Électricité',    color: '#EA580C' },
  { value: 'eau',          label: 'Eau',            color: '#0EA5E9' },
  { value: 'maintenance',  label: 'Maintenance',    color: '#8B6E50' },
  { value: 'marketing',    label: 'Marketing',      color: '#EA580C' },
  { value: 'autre',        label: 'Autre',          color: '#334155' },
];

export const PROMO_TYPES = [
  { value: 'PERCENT', label: '% de réduction',   color: '#EA580C', bg: '#FFF0DF' },
  { value: 'FIXED',   label: 'Montant fixe (FCFA)', color: '#1A0C00', bg: '#FFF5E6' },
];

export const VISIBILITE_OPTIONS = [
  { value: 'TOUS',      label: 'Tout le monde',      desc: 'Visible par tous les clients',            color: '#059669', bg: '#F0FDF4' },
  { value: 'CONNECTES', label: 'Clients connectés',  desc: 'Uniquement les utilisateurs connectés',   color: '#2563EB', bg: '#EFF6FF' },
  { value: 'NOUVEAUX',  label: 'Nouveaux clients',   desc: 'Clients sans commande passée',            color: '#7C3AED', bg: '#F5F3FF' },
];

export const emptyForm = {
  code: '', type: 'PERCENT', valeur: '', description: '',
  minMontant: '', maxUses: '', expiresAt: '', actif: true, visibilite: 'TOUS',
};

export function downloadAndOpenBlob(blob, fileName) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => window.URL.revokeObjectURL(url), 5000);
}

export function computeWeeklyPerformance(orders) {
  const today = new Date();
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  const labels = [];
  const orderCounts = Array(7).fill(0);
  const revenue = Array(7).fill(0);

  for (let dayOffset = 6; dayOffset >= 0; dayOffset -= 1) {
    const day = new Date(startOfToday);
    day.setDate(day.getDate() - dayOffset);
    labels.push(
      day
        .toLocaleDateString("fr-FR", { weekday: "short" })
        .replace(".", ""),
    );
  }

  orders.forEach((order) => {
    const created = new Date(order.createdAt);
    if (Number.isNaN(created.getTime())) return;
    const createdDay = new Date(created);
    createdDay.setHours(0, 0, 0, 0);
    const diffDays = Math.round(
      (startOfToday.getTime() - createdDay.getTime()) / 86400000,
    );
    if (diffDays >= 0 && diffDays < 7) {
      const index = 6 - diffDays;
      orderCounts[index] += 1;
      const amount = Number(order.montantTotal ?? order.total ?? 0);
      revenue[index] += Number.isFinite(amount) ? amount : 0;
    }
  });

  return {
    labels,
    orders: orderCounts,
    revenue,
  };
}

