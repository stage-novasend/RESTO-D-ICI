/* _colors.js — Palette et styles partagés par les onglets de l'AdminDashboard */

export const ACCENT = '#0F172A';
export const ROYAL_BLUE = '#2563EB';
export const EMERALD = '#059669';
export const INDIGO = '#4F46E5';
export const VIOLET = '#7C3AED';

export const ROLES = ['ADMIN', 'GERANT', 'STAFF', 'CLIENT', 'B2B'];
export const ROLE_COLOR = {
  ADMIN: { bg: '#EEF2FF', text: '#3730A3', chart: '#4F46E5' },
  GERANT: { bg: '#ECFDF5', text: '#065F46', chart: '#059669' },
  STAFF: { bg: '#F1F5F9', text: '#1E293B', chart: '#64748B' },
  CLIENT: { bg: '#EFF6FF', text: '#1E40AF', chart: '#2563EB' },
  B2B: { bg: '#F5F3FF', text: '#5B21B6', chart: '#7C3AED' },
};
export const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

/* ── Styles partagés (inputs, cartes) ── */
export const inputStyle = {
  width: '100%', padding: '12px 16px', border: '1.5px solid #CBD5E1',
  borderRadius: 12, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#FFFFFF',
  color: '#0F172A', fontWeight: 500, transition: 'all 0.15s ease',
};
export const labelStyle = { fontSize: 13, fontWeight: 700, color: '#1E293B', display: 'block', marginBottom: 6 };
export const card = {
  background: '#FFFFFF',
  borderRadius: 18,
  border: '1px solid #CBD5E1',
  boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
  overflow: 'hidden',
  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
};
