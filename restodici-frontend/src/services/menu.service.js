import axios from 'axios';
const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000' });

export const menuService = {
  getCategories: () => API.get('/menu/categories'),
  getMenu: (catId, cible = 'CLIENT') => API.get('/menu', { params: { categorie: catId, cible } }),
  search: (q, cible = 'CLIENT') => API.get('/menu/search', { params: { q, cible } }),
  toggleArticle: (id, disponible) => API.patch(`/menu/articles/${id}/disponible`, { disponible }),
};