// src/utils/articleImage.js
// Retourne l'image d'un article : photo réelle si disponible, sinon
// une image Unsplash choisie selon le nom/catégorie du plat.
// Les plats africains ont la priorité dans la correspondance.

// Identifiants Unsplash — plats africains et ivoiriens
const FOOD_POOL = [
  '1665332195309-9d75071138f0', // poisson frit + jollof rice africain
  '1665400808116-f0e6339b7e9a', // table yassa poulet sénégalais
  '1664993101841-036f189719b6', // jollof rice au poulet
  '1664992960082-0ea299a9c53e', // jollof rice + brochettes de poulet
  '1665333048952-a3ee97714c6b', // jollof rice présentation gastronomique
  '1665332305771-e49a5dd5ba80', // thiéboudienne rouge sénégal
  '1665334217407-6688e6941a47', // jollof rice assiette et bol
  '1665332561290-cc6757172890', // soupe okra nigériane
  '1665401015549-712c0dc5ef85', // poisson grillé africain au citron
  '1603496987674-79600a000f55', // poulet frit sur riz jaune
  '1773620494293-e9e075dd48fd', // poulet frit riz et légumes, Malawi
  '1634324092526-91f5e878b72f', // pilaf — riz à la viande
  '1569058242252-623df46b5025', // riz viande et oeuf frit
  '1665833613236-7c1d087463b1', // puff puff dessert africain
];

// Les plats africains sont en premier pour prendre la priorité
const CATEGORY_MAP = [
  // ── Plats ivoiriens et africains spécifiques ──
  [['alloco', 'banane plantain', 'plantain frit'], '1603496987674-79600a000f55'],        // alloco → fried plantain style
  [['poisson braisé', 'poisson grillé', 'tilapia', 'capitaine', 'carpe braisé', 'poisson fumé'], '1665401015549-712c0dc5ef85'], // poisson africain
  [['kedjenou', 'yassa'], '1664992960082-0ea299a9c53e'],                                  // kedjenou/yassa → poulet braisé
  [['mafé', 'maafe', 'sauce arachide'], '1665332561290-cc6757172890'],                    // mafé → sauce ragoût
  [['ndolé', 'egusi', 'sauce graine', 'sauce claire', 'okra', 'gombo'], '1665332561290-cc6757172890'], // sauces africaines
  [['thiébou', 'thiebou', 'jollof', 'riz sénégalais', 'riz wolof'], '1665332305771-e49a5dd5ba80'], // thiéboudienne
  [['foutou', 'foufou', 'fufu', 'ablo', 'placali'], '1664993101841-036f189719b6'],        // foutou/fufu
  [['attiéké', 'attieke'], '1665332195309-9d75071138f0'],                                 // attiéké + poisson
  [['riz gras', 'riz complet', 'riz sauce'], '1665334217407-6688e6941a47'],               // riz ivoirien

  // ── Catégories génériques ──
  [['pizza'], '1665333048952-a3ee97714c6b'],
  [['burger', 'hambur', 'sandwich', 'wrap'], '1665333048952-a3ee97714c6b'],
  [['salade', 'salad', 'crudité', 'légume', 'veggie'], '1665400808116-f0e6339b7e9a'],
  [['viand', 'boeuf', 'bbq', 'grill', 'côte', 'cote', 'steak', 'filet'], '1634324092526-91f5e878b72f'],
  [['soupe', 'bouill', 'pot-au'], '1665332561290-cc6757172890'],
  [['dessert', 'gâteau', 'gateau', 'cake', 'glace', 'pâtisserie', 'patisserie', 'sucré', 'puff puff'], '1665833613236-7c1d087463b1'],
  [['café', 'cafe', 'thé', 'boisson', 'jus', 'soda', 'drink', 'cocktail', 'smoothie'], '1665400808116-f0e6339b7e9a'],
  [['poulet', 'volail', 'chicken', 'brochette'], '1773620494293-e9e075dd48fd'],
  [['poisson', 'mer', 'seafood', 'crevette', 'thon', 'poissons'], '1665401015549-712c0dc5ef85'],
  [['riz'], '1665334217407-6688e6941a47'],
  [['pâtes', 'pasta', 'spaghetti', 'macaroni'], '1569058242252-623df46b5025'],
];

// Hash déterministe pour choisir toujours la même image par nom d'article
function simpleHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getArticleImage(article, { width = 400, quality = 75 } = {}) {
  if (article?.photoUrl) return article.photoUrl;

  const nom = (article?.nom || '').toLowerCase();
  const cat = (article?.categorie?.nom || article?.categorieNom || '').toLowerCase();
  const text = `${nom} ${cat}`;

  for (const [keywords, photoId] of CATEGORY_MAP) {
    if (keywords.some((kw) => text.includes(kw))) {
      return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${width}&q=${quality}`;
    }
  }

  const idx = simpleHash(article?.id || article?.nom || 'food') % FOOD_POOL.length;
  return `https://images.unsplash.com/photo-${FOOD_POOL[idx]}?auto=format&fit=crop&w=${width}&q=${quality}`;
}
