// Curated Unsplash food photo IDs (stable permalinks, no API key needed)
const FOOD_POOL = [
  '1476224203421-9ac39bcb3327', // colorful plated dishes
  '1504674900247-0877df9cc836', // food flatlay
  '1565299624946-b28f40a0ae38', // pizza
  '1568901346375-23c9450c58cd', // burger
  '1546793665-c74683f339c1',    // salad
  '1544025162-d76694265947',    // BBQ ribs
  '1547592180-85f173990554',    // soup
  '1578985545062-69928b1d9587', // chocolate cake
  '1514432324607-a09d9b4aefdd', // coffee
  '1529193591184-b1d58069ecdd', // grilled chicken
  '1482049016688-2d3e1b311543', // egg dish
  '1519984388953-d2406bc725e1', // tacos
  '1432139555190-58524dae6a55', // roast chicken
  '1603360946369-dc9bb6258143', // steak
  '1555396273-367ea4eb4db5',    // seafood platter
  '1606851091851-e8c8c0fca5ba', // rice dish
  '1563379926898-05f4575a45d8', // pasta
  '1562967914-608f82629710',    // West African chicken
];

const CATEGORY_MAP = [
  [['pizza'], '1565299624946-b28f40a0ae38'],
  [['burger', 'hambur', 'sandwich', 'wrap'], '1568901346375-23c9450c58cd'],
  [['salade', 'salad', 'crudité', 'légume', 'veggie'], '1546793665-c74683f339c1'],
  [['viand', 'boeuf', 'bbq', 'grill', 'côte', 'cote', 'steak', 'filet'], '1544025162-d76694265947'],
  [['soupe', 'bouill', 'pot-au'], '1547592180-85f173990554'],
  [['dessert', 'gâteau', 'gateau', 'cake', 'glace', 'pâtisserie', 'patisserie', 'sucré'], '1578985545062-69928b1d9587'],
  [['café', 'cafe', 'thé', 'boisson', 'jus', 'soda', 'drink', 'cocktail', 'smoothie'], '1514432324607-a09d9b4aefdd'],
  [['poulet', 'volail', 'chicken', 'brochette', 'yassa'], '1529193591184-b1d58069ecdd'],
  [['poisson', 'mer', 'seafood', 'crevette', 'thon', 'poissons'], '1555396273-367ea4eb4db5'],
  [['riz', 'attiéké', 'attieke', 'foutou', 'foufou', 'ablo', 'alloco'], '1606851091851-e8c8c0fca5ba'],
  [['pâtes', 'pasta', 'spaghetti', 'macaroni'], '1563379926898-05f4575a45d8'],
  [['kedjenou', 'thiébou', 'mafé', 'ndolé', 'sauce'], '1562967914-608f82629710'],
];

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
