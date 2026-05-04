import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:3000/menu' });

export const menuService = {
  // Récupérer toutes les catégories actives
  getCategories: () => API.get('/categories'),
  
  // Récupérer le menu filtré par catégorie
  getMenu: (categorieId, cible = 'CLIENT') => 
    API.get('/', { params: { categorie: categorieId, cible } }),
  
  // Recherche par nom ou ingrédient
  search: (query, cible = 'CLIENT') => 
    API.get('/search', { params: { q: query, cible } }),
  
  // Activer/désactiver un article (gérant uniquement)
  toggleArticle: (id, disponible) => 
    API.patch(`/articles/${id}/disponible`, { disponible }),
};