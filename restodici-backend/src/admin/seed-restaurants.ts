/**
 * Script de seeding — Ajoute plusieurs restaurants africains avec des menus variés.
 *
 * Usage : npx ts-node -r tsconfig-paths/register src/admin/seed-restaurants.ts
 */
import { createConnection } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env') });

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

interface RestoDef {
  nom: string;
  logo: string;
  telephone: string;
  adresse: string;
  description: string;
  email: string;
  openingTime: string;
  closingTime: string;
  noteMoyenne: number;
  nbAvis: number;
  categories: { nom: string; icone: string; description: string }[];
  articles: {
    nom: string;
    description: string;
    prix: number;
    photoUrl: string;
    catNom: string;
  }[];
}

const RESTAURANTS: RestoDef[] = [
  // ═══════════════ 1. Maquis Chez Tanti Marie ═══════════════
  {
    nom: 'Maquis Chez Tanti Marie',
    logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
    telephone: '+2250707070701',
    adresse: 'Cocody Angré, Abidjan',
    description:
      'La vraie cuisine ivoirienne dans une ambiance chaleureuse de maquis. Spécialités attieke, foutou, kedjenou.',
    email: 'tantiemarie@restodici.ci',
    openingTime: '07:00',
    closingTime: '23:00',
    noteMoyenne: 4.7,
    nbAvis: 234,
    categories: [
      {
        nom: 'Plats Ivoiriens',
        icone: 'utensils',
        description: 'Les classiques de la cuisine ivoirienne',
      },
      {
        nom: 'Grillades & Braisés',
        icone: 'flame',
        description: 'Poulets et poissons braisés au feu de bois',
      },
      {
        nom: 'Accompagnements',
        icone: 'bowl-food',
        description: 'Attiéké, alloco, riz et autres',
      },
      {
        nom: 'Boissons Locales',
        icone: 'glass-water',
        description: 'Jus naturels et boissons artisanales',
      },
    ],
    articles: [
      {
        nom: 'Foutou Banane & Sauce Graine',
        description:
          "Foutou de banane plantain pilé accompagné d'une sauce graine onctueuse au poulet fumé et crabes frais.",
        prix: 3000,
        photoUrl:
          'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=500',
        catNom: 'Plats Ivoiriens',
      },
      {
        nom: 'Kédjénou de Poulet',
        description:
          "Poulet fermier mijoté à l'étouffée dans une sauce aux légumes et piment, cuit en canari traditionnel.",
        prix: 3500,
        photoUrl:
          'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500',
        catNom: 'Plats Ivoiriens',
      },
      {
        nom: 'Garba Attiéké-Thon',
        description:
          'Attiéké frais garni de thon frit croustillant, oignons émincés, piment frais et tomates.',
        prix: 2000,
        photoUrl:
          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
        catNom: 'Plats Ivoiriens',
      },
      {
        nom: 'Placali & Sauce Kopé',
        description:
          'Pâte de manioc fermenté légère servie avec une sauce feuilles de kopé riche et parfumée.',
        prix: 2500,
        photoUrl:
          'https://images.unsplash.com/photo-1574484284002-952d92456975?w=500',
        catNom: 'Plats Ivoiriens',
      },
      {
        nom: 'Attiéké Poisson Braisé',
        description:
          'Dorade royale braisée au charbon de bois, assaisonnée aux épices locales, avec attiéké et alloco.',
        prix: 4000,
        photoUrl:
          'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500',
        catNom: 'Grillades & Braisés',
      },
      {
        nom: 'Poulet Braisé Complet',
        description:
          'Demi-poulet braisé mariné 24h aux épices secrètes, servi avec alloco doré et piment.',
        prix: 4500,
        photoUrl:
          'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=500',
        catNom: 'Grillades & Braisés',
      },
      {
        nom: 'Choukouya de Bœuf',
        description:
          "Brochettes de bœuf grillées à la flamme, assaisonnées au mélange d'épices du Nord.",
        prix: 2000,
        photoUrl:
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500',
        catNom: 'Grillades & Braisés',
      },
      {
        nom: 'Alloco Sauce Pimentée',
        description:
          "Bananes plantain mûres frites dorées à l'huile de palme avec sauce tomate-piment maison.",
        prix: 1500,
        photoUrl:
          'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500',
        catNom: 'Accompagnements',
      },
      {
        nom: 'Riz Gras au Poulet',
        description:
          'Riz parfumé cuit dans un bouillon riche de tomates, légumes et morceaux de poulet tendre.',
        prix: 3000,
        photoUrl:
          'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=500',
        catNom: 'Plats Ivoiriens',
      },
      {
        nom: 'Jus de Bissap',
        description:
          "Infusion glacée de fleurs d'hibiscus avec une touche de menthe et de vanille.",
        prix: 800,
        photoUrl:
          'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500',
        catNom: 'Boissons Locales',
      },
      {
        nom: 'Jus de Gingembre Miel',
        description:
          'Gnamakoudji artisanal : gingembre frais pressé sucré au miel de savane.',
        prix: 800,
        photoUrl:
          'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=500',
        catNom: 'Boissons Locales',
      },
      {
        nom: 'Jus de Baobab (Bouye)',
        description:
          'Boisson crémeuse et rafraîchissante à base de pulpe de fruit de baobab.',
        prix: 1000,
        photoUrl:
          'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=500',
        catNom: 'Boissons Locales',
      },
    ],
  },

  // ═══════════════ 2. Le Sénégalais — Teranga ═══════════════
  {
    nom: 'Le Sénégalais — Teranga',
    logo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
    telephone: '+2250707070702',
    adresse: 'Zone 4, Marcory, Abidjan',
    description:
      "Cuisine sénégalaise authentique : thiéboudienne, yassa, mafé. La teranga au cœur d'Abidjan.",
    email: 'teranga@restodici.ci',
    openingTime: '08:00',
    closingTime: '22:30',
    noteMoyenne: 4.8,
    nbAvis: 187,
    categories: [
      {
        nom: 'Spécialités Sénégalaises',
        icone: 'utensils',
        description: 'Les grands classiques du Sénégal',
      },
      {
        nom: 'Grillades Dibi',
        icone: 'flame',
        description: 'Viandes et poissons grillés style Dibi',
      },
      {
        nom: 'Desserts & Boissons',
        icone: 'cake',
        description: 'Douceurs et rafraîchissements',
      },
    ],
    articles: [
      {
        nom: 'Thiéboudienne (Riz au Poisson)',
        description:
          'Le plat national sénégalais : riz wolof rouge cuit dans une sauce tomate riche avec thiof, légumes farcis et tamarin.',
        prix: 4000,
        photoUrl:
          'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=500',
        catNom: 'Spécialités Sénégalaises',
      },
      {
        nom: 'Yassa Poulet',
        description:
          'Poulet grillé mijoté dans une sauce aux oignons caramélisés, citron et moutarde de Dijon.',
        prix: 3500,
        photoUrl:
          'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500',
        catNom: 'Spécialités Sénégalaises',
      },
      {
        nom: 'Mafé de Bœuf',
        description:
          "Ragoût de bœuf fondant dans une sauce crémeuse à la pâte d'arachide, patates douces et carottes.",
        prix: 3500,
        photoUrl:
          'https://images.unsplash.com/photo-1574484284002-952d92456975?w=500',
        catNom: 'Spécialités Sénégalaises',
      },
      {
        nom: 'Thiéré Mboum (Couscous Sénégalais)',
        description:
          "Couscous de mil fin accompagné d'une sauce aux légumes variés et viande de mouton.",
        prix: 3000,
        photoUrl:
          'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500',
        catNom: 'Spécialités Sénégalaises',
      },
      {
        nom: 'Suppu Kandia (Gombo)',
        description:
          'Sauce gombo onctueuse au poisson fumé et fruits de mer, servie avec du riz blanc parfumé.',
        prix: 3500,
        photoUrl:
          'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=500',
        catNom: 'Spécialités Sénégalaises',
      },
      {
        nom: 'Pastels (x6)',
        description:
          'Beignets farcis au thon frais épicé, oignons et persil, frits à la perfection. Servis avec sauce piquante.',
        prix: 2000,
        photoUrl:
          'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500',
        catNom: 'Spécialités Sénégalaises',
      },
      {
        nom: 'Dibi Agneau Grillé',
        description:
          "Côtelettes d'agneau marinées et grillées au charbon de bois, servies avec sauce moutarde-oignon.",
        prix: 5000,
        photoUrl:
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500',
        catNom: 'Grillades Dibi',
      },
      {
        nom: 'Fataya au Poulet (x6)',
        description:
          'Petits chaussons feuilletés farcis au poulet épicé et légumes, parfaits en apéritif.',
        prix: 1500,
        photoUrl:
          'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500',
        catNom: 'Spécialités Sénégalaises',
      },
      {
        nom: 'Thiakry (Dessert Lait Caillé)',
        description:
          "Couscous de mil sucré au lait caillé frais, parfumé à la fleur d'oranger et raisins secs.",
        prix: 1500,
        photoUrl:
          'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500',
        catNom: 'Desserts & Boissons',
      },
      {
        nom: 'Jus de Bouye (Baobab)',
        description:
          'Boisson onctueuse et sucrée à la pulpe de baobab, riche en vitamines C.',
        prix: 1000,
        photoUrl:
          'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=500',
        catNom: 'Desserts & Boissons',
      },
    ],
  },

  // ═══════════════ 3. Saveurs du Cameroun ═══════════════
  {
    nom: 'Saveurs du Cameroun',
    logo: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400',
    telephone: '+2250707070703',
    adresse: 'Yopougon Selmer, Abidjan',
    description:
      'Voyage culinaire au Cameroun : ndolé, eru, poulet DG, poisson braisé à la camerounaise.',
    email: 'cameroun@restodici.ci',
    openingTime: '09:00',
    closingTime: '23:00',
    noteMoyenne: 4.6,
    nbAvis: 156,
    categories: [
      {
        nom: 'Plats Camerounais',
        icone: 'utensils',
        description: 'Les incontournables du Cameroun',
      },
      {
        nom: 'Braisés & Grillades',
        icone: 'flame',
        description: 'Viandes et poissons braisés camerounais',
      },
      {
        nom: 'Beignets & Snacks',
        icone: 'cookie',
        description: 'Beignets haricots, puff-puff et accompagnements',
      },
      {
        nom: 'Boissons',
        icone: 'glass-water',
        description: 'Boissons maison et jus tropicaux',
      },
    ],
    articles: [
      {
        nom: 'Ndolé au Bœuf & Crevettes',
        description:
          'Plat emblématique camerounais : feuilles amères de ndolé cuites avec arachides pilées, bœuf et crevettes fumées.',
        prix: 4500,
        photoUrl:
          'https://images.unsplash.com/photo-1574484284002-952d92456975?w=500',
        catNom: 'Plats Camerounais',
      },
      {
        nom: 'Poulet DG (Directeur Général)',
        description:
          'Poulet sauté aux plantains mûrs frits, légumes croquants et une sauce tomate épicée irrésistible.',
        prix: 5000,
        photoUrl:
          'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=500',
        catNom: 'Plats Camerounais',
      },
      {
        nom: 'Eru & Water Fufu',
        description:
          "Sauce eru (feuilles d'okok) parfumée aux écrevisses et vache fumée, servie avec water fufu.",
        prix: 4000,
        photoUrl:
          'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=500',
        catNom: 'Plats Camerounais',
      },
      {
        nom: 'Koki de Niébé',
        description:
          "Gâteau de haricots à l'huile de palme cuit à la vapeur dans des feuilles de bananier. Servi chaud.",
        prix: 2000,
        photoUrl:
          'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500',
        catNom: 'Plats Camerounais',
      },
      {
        nom: 'Mbongo Tchobi (Sauce Noire)',
        description:
          'Poisson mijoté dans une sauce noire épicée aux épices grillées et aromates du terroir camerounais.',
        prix: 4500,
        photoUrl:
          'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500',
        catNom: 'Plats Camerounais',
      },
      {
        nom: 'Poisson Braisé Camerounais',
        description:
          "Machoiron braisé au charbon, farci d'une pâte d'épices maison, servi avec miondo et plantain.",
        prix: 5000,
        photoUrl:
          'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=500',
        catNom: 'Braisés & Grillades',
      },
      {
        nom: 'Soya (Brochettes de Bœuf)',
        description:
          'Brochettes de bœuf marinées aux épices kamga, grillées au feu de bois, style street-food Douala.',
        prix: 2500,
        photoUrl:
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500',
        catNom: 'Braisés & Grillades',
      },
      {
        nom: 'Beignets Haricots-Bouillie (x8)',
        description:
          "Beignets croustillants aux haricots accompagnés d'une bouillie de maïs crémeuse et sucrée.",
        prix: 1500,
        photoUrl:
          'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500',
        catNom: 'Beignets & Snacks',
      },
      {
        nom: 'Puff-Puff (x10)',
        description:
          "Boules de pâte frites et sucrées, moelleuses à l'intérieur, croustillantes à l'extérieur.",
        prix: 1000,
        photoUrl:
          'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=500',
        catNom: 'Beignets & Snacks',
      },
      {
        nom: 'Jus de Foléré (Hibiscus)',
        description:
          "Infusion de fleurs d'hibiscus à la camerounaise avec gingembre et sucre de canne.",
        prix: 800,
        photoUrl:
          'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500',
        catNom: 'Boissons',
      },
    ],
  },

  // ═══════════════ 4. Mali Délices ═══════════════
  {
    nom: 'Mali Délices',
    logo: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400',
    telephone: '+2250707070704',
    adresse: 'Adjamé Liberté, Abidjan',
    description:
      'Cuisine malienne généreuse : tô, tigadèguèna, fakoye. Les saveurs authentiques du Mali à Abidjan.',
    email: 'malidelices@restodici.ci',
    openingTime: '07:30',
    closingTime: '22:00',
    noteMoyenne: 4.5,
    nbAvis: 142,
    categories: [
      {
        nom: 'Spécialités Maliennes',
        icone: 'utensils',
        description: 'Les grands classiques de la cuisine du Mali',
      },
      {
        nom: 'Grillades Sahéliennes',
        icone: 'flame',
        description: 'Viandes grillées et brochettes',
      },
      {
        nom: 'Desserts & Jus',
        icone: 'glass-water',
        description: 'Douceurs et boissons maliennes',
      },
    ],
    articles: [
      {
        nom: 'Tô Sauce Gombo',
        description:
          "Pâte de mil ou maïs fondante accompagnée d'une sauce gombo au poisson fumé et soumbala.",
        prix: 2500,
        photoUrl:
          'https://images.unsplash.com/photo-1574484284002-952d92456975?w=500',
        catNom: 'Spécialités Maliennes',
      },
      {
        nom: 'Tigadèguèna (Mafé Malien)',
        description:
          "Ragoût de viande de bœuf mijoté dans une sauce riche à la pâte d'arachide, pommes de terre et carottes.",
        prix: 3500,
        photoUrl:
          'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500',
        catNom: 'Spécialités Maliennes',
      },
      {
        nom: 'Fakoye (Riz au Gras Malien)',
        description:
          'Riz cuit dans un bouillon de viande parfumé au soumbala, tomates et oignons caramélisés.',
        prix: 3000,
        photoUrl:
          'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=500',
        catNom: 'Spécialités Maliennes',
      },
      {
        nom: 'Poulet Yassa à la Malienne',
        description:
          'Adaptation malienne du yassa : poulet grillé aux oignons confits, citron vert et piment doux.',
        prix: 3500,
        photoUrl:
          'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=500',
        catNom: 'Spécialités Maliennes',
      },
      {
        nom: 'Djouka (Couscous de Fonio)',
        description:
          "Couscous fin de fonio accompagné d'une sauce aux feuilles de baobab et viande séchée.",
        prix: 3000,
        photoUrl:
          'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500',
        catNom: 'Spécialités Maliennes',
      },
      {
        nom: 'Brochettes de Mouton Grillé',
        description:
          'Morceaux de mouton marinés aux épices sahéliennes, grillés au charbon et servis avec riz.',
        prix: 4000,
        photoUrl:
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500',
        catNom: 'Grillades Sahéliennes',
      },
      {
        nom: 'Capitaine Braisé Sauce Djougou',
        description:
          'Poisson capitaine braisé servi avec une sauce tomate pimentée aux oignons grillés.',
        prix: 5000,
        photoUrl:
          'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500',
        catNom: 'Grillades Sahéliennes',
      },
      {
        nom: 'Dègué (Dessert au Yaourt)',
        description:
          'Bouillie de mil granulée mélangée à du yaourt onctueux, sucre et crème de baobab.',
        prix: 1200,
        photoUrl:
          'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500',
        catNom: 'Desserts & Jus',
      },
      {
        nom: 'Jus de Tamarin Frais',
        description:
          'Boisson acidulée et rafraîchissante à base de pulpe de tamarin avec une touche de sucre.',
        prix: 800,
        photoUrl:
          'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=500',
        catNom: 'Desserts & Jus',
      },
    ],
  },

  // ═══════════════ 5. Afro Fusion Kitchen ═══════════════
  {
    nom: 'Afro Fusion Kitchen',
    logo: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400',
    telephone: '+2250707070705',
    adresse: 'Riviera Palmeraie, Abidjan',
    description:
      'Cuisine africaine moderne et créative. Fusion de saveurs ouest-africaines revisitées avec élégance.',
    email: 'afrofusion@restodici.ci',
    openingTime: '11:00',
    closingTime: '00:00',
    noteMoyenne: 4.9,
    nbAvis: 310,
    categories: [
      {
        nom: 'Entrées Afro',
        icone: 'leaf',
        description: 'Amuse-bouches et entrées créatives',
      },
      {
        nom: 'Plats Fusion',
        icone: 'utensils',
        description: 'Plats africains revisités',
      },
      {
        nom: 'Bowls & Healthy',
        icone: 'salad',
        description: 'Bowls protéinés et options légères',
      },
      {
        nom: 'Cocktails & Smoothies',
        icone: 'glass-water',
        description: 'Cocktails tropicaux et smoothies vitaminés',
      },
    ],
    articles: [
      {
        nom: 'Accras de Niébé Croustillants',
        description:
          'Beignets de haricots niébé légers et croustillants, servis avec une mayo wasabi-piment.',
        prix: 2000,
        photoUrl:
          'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500',
        catNom: 'Entrées Afro',
      },
      {
        nom: 'Samossa Tilapia Fumé (x4)',
        description:
          'Samossas farcis au tilapia fumé, oignons verts et fromage fondu. Sauce mangue-piment.',
        prix: 2500,
        photoUrl:
          'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500',
        catNom: 'Entrées Afro',
      },
      {
        nom: 'Tataki de Thon façon Garba',
        description:
          "Thon mi-cuit en croûte de sésame sur lit d'attiéké condimenté, vinaigrette passion-gingembre.",
        prix: 5500,
        photoUrl:
          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
        catNom: 'Plats Fusion',
      },
      {
        nom: 'Risotto Fonio aux Crevettes',
        description:
          "Fonio cuisiné façon risotto crémeux avec crevettes géantes, beurre noisette et fleurs d'ail.",
        prix: 6000,
        photoUrl:
          'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=500',
        catNom: 'Plats Fusion',
      },
      {
        nom: 'Suprême de Pintade Sauce Arachide',
        description:
          "Pintade rôtie en croûte d'épices, sauce arachide onctueuse, purée de patate douce et micro-pousses.",
        prix: 6500,
        photoUrl:
          'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=500',
        catNom: 'Plats Fusion',
      },
      {
        nom: 'Burger Wagyu-Yassa',
        description:
          'Pain brioché, steak de bœuf wagyu, oignons yassa caramélisés, cheddar fumé et sauce dibi.',
        prix: 5500,
        photoUrl:
          'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
        catNom: 'Plats Fusion',
      },
      {
        nom: 'Bowl Teranga',
        description:
          'Base de riz wolof, poulet grillé épicé, avocat, mangue fraîche, plantain chips et vinaigrette tamarin.',
        prix: 4500,
        photoUrl:
          'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500',
        catNom: 'Bowls & Healthy',
      },
      {
        nom: 'Poke Bowl Thiof',
        description:
          'Thiof (mérou) mariné sauce soja-gingembre, edamame, mangue, riz vinaigré et sésame noir.',
        prix: 5000,
        photoUrl:
          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
        catNom: 'Bowls & Healthy',
      },
      {
        nom: 'Smoothie Mangue-Baobab',
        description:
          'Mangue Kent, poudre de baobab, banane et lait de coco. Protéiné et vitaminé.',
        prix: 1500,
        photoUrl:
          'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=500',
        catNom: 'Cocktails & Smoothies',
      },
      {
        nom: 'Cocktail Bissap Spritz',
        description:
          'Bissap infusé à froid, prosecco, sirop de gingembre, zeste de citron vert et glace pilée.',
        prix: 3000,
        photoUrl:
          'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500',
        catNom: 'Cocktails & Smoothies',
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Seed execution
// ─────────────────────────────────────────────────────────────────────────────

async function seedRestaurants() {
  const connection = await createConnection({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username:
      process.env.DB_USERNAME || process.env.DB_USER || 'restodici_user',
    password: process.env.DB_PASSWORD || 'restodici_pass',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'restodici_db',
    ssl: process.env.DB_SSL === 'true',
  });

  console.log('🚀 Démarrage du Seeding de restaurants africains...\n');

  let totalRestos = 0;
  let totalCats = 0;
  let totalArticles = 0;

  for (const resto of RESTAURANTS) {
    // ── Upsert restaurant ──────────────────────────────────────────────────
    let restaurantId: string;
    const existingResto = await connection.query(
      `SELECT id FROM restaurants WHERE nom = $1 LIMIT 1`,
      [resto.nom],
    );

    if (existingResto.length > 0) {
      restaurantId = existingResto[0].id;
      await connection.query(
        `UPDATE restaurants SET logo = $1, telephone = $2, adresse = $3, description = $4,
         email = $5, "openingTime" = $6, "closingTime" = $7, "noteMoyenne" = $8,
         "nbAvis" = $9, actif = true, "updatedAt" = NOW()
         WHERE id = $10`,
        [
          resto.logo,
          resto.telephone,
          resto.adresse,
          resto.description,
          resto.email,
          resto.openingTime,
          resto.closingTime,
          resto.noteMoyenne,
          resto.nbAvis,
          restaurantId,
        ],
      );
      console.log(`🔄 Restaurant mis à jour : ${resto.nom}`);
    } else {
      const insert = await connection.query(
        `INSERT INTO restaurants (
          id, nom, logo, telephone, adresse, description, email,
          "openingTime", "closingTime", actif, "tauxCommission",
          "noteMoyenne", "nbAvis", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6,
          $7, $8, true, 8.00,
          $9, $10, NOW(), NOW()
        ) RETURNING id`,
        [
          resto.nom,
          resto.logo,
          resto.telephone,
          resto.adresse,
          resto.description,
          resto.email,
          resto.openingTime,
          resto.closingTime,
          resto.noteMoyenne,
          resto.nbAvis,
        ],
      );
      restaurantId = insert[0].id;
      console.log(`✨ Restaurant créé : ${resto.nom} (${restaurantId})`);
    }
    totalRestos++;

    // ── Upsert categories ────────────────────────────────────────────────
    const catMap = new Map<string, string>();
    for (const cat of resto.categories) {
      const existing = await connection.query<{ id: string }[]>(
        `SELECT id FROM categories WHERE nom = $1 AND "restaurantId" = $2 LIMIT 1`,
        [cat.nom, restaurantId],
      );
      if (existing.length > 0) {
        catMap.set(cat.nom, existing[0].id);
      } else {
        const ins = await connection.query<{ id: string }[]>(
          `INSERT INTO categories (id, nom, description, icone, actif, "restaurantId", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, true, $4, NOW(), NOW()) RETURNING id`,
          [cat.nom, cat.description, cat.icone, restaurantId],
        );
        catMap.set(cat.nom, ins[0].id);
        totalCats++;
      }
    }

    // ── Upsert articles ──────────────────────────────────────────────────
    for (const art of resto.articles) {
      const catId = catMap.get(art.catNom);
      const existing = await connection.query(
        `SELECT id FROM articles WHERE nom = $1 AND "restaurantId" = $2 LIMIT 1`,
        [art.nom, restaurantId],
      );
      if (existing.length > 0) {
        await connection.query(
          `UPDATE articles SET prix = $1, description = $2, "photoUrl" = $3,
           disponible = true, stock = 100, "categorieId" = $4, "updatedAt" = NOW()
           WHERE id = $5`,
          [art.prix, art.description, art.photoUrl, catId, existing[0].id],
        );
      } else {
        await connection.query(
          `INSERT INTO articles (
            id, nom, description, prix, "photoUrl", stock, "seuilMin",
            disponible, cible, "categorieId", "restaurantId", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, 100, 10,
            true, 'TOUS', $5, $6, NOW(), NOW()
          )`,
          [
            art.nom,
            art.description,
            art.prix,
            art.photoUrl,
            catId,
            restaurantId,
          ],
        );
        totalArticles++;
      }
    }

    console.log(
      `   📦 ${resto.articles.length} plats configurés pour ${resto.nom}\n`,
    );
  }

  console.log('🎉 ════════════════════════════════════════════════════════');
  console.log(`✅ SEEDING TERMINÉ !`);
  console.log(`   🏪 ${totalRestos} restaurants`);
  console.log(`   📁 ${totalCats} nouvelles catégories`);
  console.log(`   🍲 ${totalArticles} nouveaux articles`);
  console.log('════════════════════════════════════════════════════════\n');

  await connection.close();
}

seedRestaurants().catch((err) => {
  console.error('❌ Erreur lors du seeding restaurants :', err);
  process.exit(1);
});
