/* _helpers.js — utilitaires purs partagés par les onglets de l'AdminDashboard */

export const ACTION_STYLE = (action = '') => {
  const a = action.toUpperCase();
  if (a.includes('LOGIN') || a.includes('AUTH')) return { bg: '#DCFCE7', text: '#166534' };
  if (a.includes('DELETE') || a.includes('REMOVE')) return { bg: '#FEE2E2', text: '#991B1B' };
  if (a.includes('CREATE') || a.includes('ADD')) return { bg: 'rgba(234,60,12,0.10)', text: '#FF3A03' };
  if (a.includes('UPDATE') || a.includes('PATCH') || a.includes('EDIT')) return { bg: '#FEF3C7', text: '#92400E' };
  if (a.includes('EXPORT') || a.includes('DOWNLOAD')) return { bg: '#F3E8FF', text: '#6B21A8' };
  if (a.includes('VALIDER') || a.includes('APPROVE')) return { bg: '#D1FAE5', text: '#065F46' };
  if (a.includes('REJECT') || a.includes('REFUSE')) return { bg: '#FFE4E6', text: '#9F1239' };
  return { bg: '#F1F5F9', text: '#475569' };
};
