import Fuse from 'fuse.js';

// Dictionnaire de synonymes bidirectionnel
const SYNONYMS = {
  'burger': ['hamburger', 'fast-food', 'fastfood'],
  'hamburger': ['burger', 'fast-food', 'fastfood'],
  'soda': ['boisson', 'coca', 'fanta', 'sprite', 'jus', 'rafraîchissement'],
  'boisson': ['soda', 'coca', 'jus', 'eau'],
  'poulet': ['chicken', 'poule', 'volaille'],
  'chicken': ['poulet'],
  'pizza': ['pizzeria', 'italien', 'margarita', 'margherita'],
  'viande': ['boeuf', 'mouton', 'steak', 'grillade'],
  'poisson': ['fish', 'carpe', 'machoiron', 'tilapia'],
  'africain': ['ivoirien', 'local', 'garba', 'foutou', 'alloco', 'attiéké'],
  'ivoirien': ['africain', 'local', 'garba', 'foutou', 'alloco', 'attiéké'],
};

/**
 * Normalise et étend la requête de recherche avec des synonymes
 */
export function expandQuery(query) {
  if (!query) return '';
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const expanded = new Set(terms);
  
  terms.forEach(term => {
    // Check exact match
    if (SYNONYMS[term]) {
      SYNONYMS[term].forEach(syn => expanded.add(syn));
    }
    // Check partial match (fuzzy synonyms)
    Object.keys(SYNONYMS).forEach(key => {
      if (key.includes(term) || term.includes(key)) {
        expanded.add(key);
        SYNONYMS[key].forEach(syn => expanded.add(syn));
      }
    });
  });
  
  return Array.from(expanded).join(' ');
}

/**
 * Crée un index Fuse pour les restaurants
 */
export function createRestaurantIndex(restaurants) {
  return new Fuse(restaurants, {
    keys: [
      { name: 'nom', weight: 3 },
      { name: 'categories.nom', weight: 2 },
      { name: 'description', weight: 1 },
      { name: 'adresse', weight: 1 }
    ],
    threshold: 0.35, // Tolérance aux fautes (Fuzzy)
    includeScore: true,
    ignoreLocation: true,
  });
}

/**
 * Crée un index Fuse pour les plats
 */
export function createProductIndex(products) {
  return new Fuse(products, {
    keys: [
      { name: 'nom', weight: 3 },
      { name: 'categorie.nom', weight: 2 },
      { name: 'description', weight: 1 },
      { name: 'restaurantName', weight: 1 }
    ],
    threshold: 0.35,
    includeScore: true,
    ignoreLocation: true,
  });
}

/**
 * Calcule un score hybride pour le tri final (Ranking Intelligent)
 * @param {number} fuseScore Score brut Fuse.js (plus bas = meilleur)
 * @param {object} item L'objet restaurant
 * @param {number} distanceKm Distance par rapport à l'utilisateur
 */
export function calculateHybridScore(fuseScore, restaurant, distanceKm) {
  let score = fuseScore || 0; // base: 0 (perfect match) to ~0.4

  // Bonus: Note moyenne (Si note = 5, on améliore le score de 0.1)
  const rating = Number(restaurant?.noteMoyenne) || 0;
  if (rating > 0) {
    score -= (rating / 5) * 0.1;
  }

  // Bonus/Malus: Distance
  if (distanceKm !== Infinity && distanceKm !== null) {
    // Si très proche (< 1km), bonus important
    if (distanceKm < 1) score -= 0.15;
    else if (distanceKm < 3) score -= 0.05;
    // Si très loin (> 10km), malus important
    else if (distanceKm > 10) score += 0.2;
    else if (distanceKm > 5) score += 0.05;
  }

  return score; // Plus le score est bas, plus il est pertinent
}
