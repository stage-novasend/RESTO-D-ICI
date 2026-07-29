/**
 * Script de seeding complet — crée un utilisateur pour chaque rôle
 * (avec le même mot de passe) et peuple la boutique en articles disponibles.
 * 
 * Usage : npx ts-node -r tsconfig-paths/register src/admin/seed-demo.ts
 */
import { createConnection } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env') });

async function seedDemo() {
  const connection = await createConnection({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || process.env.DB_USER || 'restodici_user',
    password: process.env.DB_PASSWORD || 'restodici_pass',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'restodici_db',
    ssl: process.env.DB_SSL === 'true',
  });

  console.log('🚀 Démarrage du Seeding de démonstration RESTO-D-ICI...\n');

  const COMMON_PASSWORD = 'RestoDici2026!';
  const hashedPassword = await bcrypt.hash(COMMON_PASSWORD, 12);

  // ── 1. Créer ou récupérer le restaurant par défaut ───────────────────────
  let restaurantId: string;
  const existingResto = await connection.query(
    `SELECT id FROM restaurants WHERE nom = $1 LIMIT 1`,
    ["Resto D'ICI Plateau"]
  );

  if (existingResto.length > 0) {
    restaurantId = existingResto[0].id;
    console.log(`ℹ️ Restaurant existant trouvé : "Resto D'ICI Plateau" (${restaurantId})`);
  } else {
    const restoInsert = await connection.query(
      `INSERT INTO restaurants (
        id, nom, logo, telephone, adresse, description, email, 
        "openingTime", "closingTime", actif, "tauxCommission", "noteMoyenne", "nbAvis", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), 'Resto D''ICI Plateau', 
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500',
        '+2250700000000', 'Boulevard Chardy, Plateau, Abidjan',
        'Le meilleur de la gastronomie ivoirienne en plein cœur d''Abidjan.',
        'contact@restodici.ci', '08:00', '22:00', true, 8.00, 4.80, 120, NOW(), NOW()
      ) RETURNING id`
    );
    restaurantId = restoInsert[0].id;
    console.log(`✅ Restaurant créé : "Resto D'ICI Plateau" (${restaurantId})`);
  }

  // ── 2. Création des utilisateurs pour CHAQUE RÔLE ─────────────────────────
  const usersToSeed = [
    {
      email: 'admin@restodici.ci',
      role: 'ADMIN',
      nom: 'Admin',
      prenom: 'Système',
      telephone: '+2250701010101',
      restaurantId: null,
    },
    {
      email: 'gerant@restodici.ci',
      role: 'GERANT',
      nom: 'Kouassi',
      prenom: 'Jean-Marc',
      telephone: '+2250702020202',
      restaurantId: restaurantId,
    },
    {
      email: 'staff@restodici.ci',
      role: 'STAFF',
      nom: 'Konan',
      prenom: 'Awa',
      telephone: '+2250703030303',
      restaurantId: restaurantId,
    },
    {
      email: 'client@restodici.ci',
      role: 'CLIENT',
      nom: 'Yao',
      prenom: 'Marc',
      telephone: '+2250704040404',
      restaurantId: null,
    },
    {
      email: 'b2b@restodici.ci',
      role: 'B2B',
      nom: 'Société Ivoire Services',
      prenom: 'Responsable RH',
      telephone: '+2250705050505',
      restaurantId: null,
    },
  ];

  console.log('\n👥 Seeding des utilisateurs par rôle :');
  for (const user of usersToSeed) {
    const existing = await connection.query(
      `SELECT id FROM users WHERE email = $1`,
      [user.email]
    );

    if (existing.length > 0) {
      await connection.query(
        `UPDATE users SET password = $1, role = $2, actif = true, "emailVerified" = true, "restaurantId" = $3, "updatedAt" = NOW()
         WHERE email = $4`,
        [hashedPassword, user.role, user.restaurantId, user.email]
      );
      console.log(`   🔄 Mise à jour du compte ${user.role.padEnd(7)} : ${user.email}`);
    } else {
      await connection.query(
        `INSERT INTO users (id, nom, prenom, email, password, telephone, role, actif, "emailVerified", "restaurantId", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, true, $7, NOW(), NOW())`,
        [user.nom, user.prenom, user.email, hashedPassword, user.telephone, user.role, user.restaurantId]
      );
      console.log(`   ✨ Création du compte ${user.role.padEnd(7)} : ${user.email}`);
    }
  }

  // ── 3. Création des Catégories de Menu ────────────────────────────────────
  const categoriesToSeed = [
    { nom: 'Plats Authentiques', icone: 'utensils', description: 'Spécialités traditionnelles ivoiriennes' },
    { nom: 'Grillades & Accompagnements', icone: 'flame', description: 'Poulets, poissons braisés & alloco' },
    { nom: 'Boissons & Rafraîchissements', icone: 'glass-water', description: 'Jus locaux naturels et boissons fraîches' },
    { nom: 'Offres Entreprises B2B', icone: 'briefcase', description: 'Formules groupées pour réunions et équipes' },
  ];

  const categoryMap = new Map<string, string>();
  console.log('\n📁 Seeding des catégories :');

  for (const cat of categoriesToSeed) {
    const existingCat = await connection.query(
      `SELECT id FROM categories WHERE nom = $1 LIMIT 1`,
      [cat.nom]
    );

    if (existingCat.length > 0) {
      categoryMap.set(cat.nom, existingCat[0].id);
      console.log(`   ℹ️ Catégorie existante : ${cat.nom}`);
    } else {
      const catInsert = await connection.query(
        `INSERT INTO categories (id, nom, description, icone, actif, "restaurantId", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, true, $4, NOW(), NOW()) RETURNING id`,
        [cat.nom, cat.description, cat.icone, restaurantId]
      );
      categoryMap.set(cat.nom, catInsert[0].id);
      console.log(`   ✨ Catégorie créée : ${cat.nom}`);
    }
  }

  // ── 4. Création des Articles en boutique ──────────────────────────────────
  const articlesToSeed = [
    {
      nom: 'Garba Royal Poisson Thionf',
      description: 'Semoule d\'attiéké frais servi avec steak de Thon rouge frit, piment frais haché et oignons.',
      prix: 2500,
      photoUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
      stock: 100,
      seuilMin: 10,
      cible: 'TOUS',
      catNom: 'Plats Authentiques',
    },
    {
      nom: 'Poulet Braisé & Alloco Doré',
      description: 'Demi-poulet braisé aux épices de la maison, accompagné d\'alloco moelleux et sauce tomate pimentée.',
      prix: 4000,
      photoUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500',
      stock: 80,
      seuilMin: 10,
      cible: 'TOUS',
      catNom: 'Grillades & Accompagnements',
    },
    {
      nom: 'Poisson Capitaine Grillé au Feu de Bois',
      description: 'Capitaine entier assaisonné au four, servi avec attiéké et kédjenou de légumes.',
      prix: 5500,
      photoUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500',
      stock: 50,
      seuilMin: 5,
      cible: 'TOUS',
      catNom: 'Grillades & Accompagnements',
    },
    {
      nom: 'Jus de Bissap Glacé Maison (50cl)',
      description: 'Infusion artisanale de fleurs d\'hibiscus au menthol et saveur vanille.',
      prix: 1000,
      photoUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500',
      stock: 200,
      seuilMin: 20,
      cible: 'TOUS',
      catNom: 'Boissons & Rafraîchissements',
    },
    {
      nom: 'Gnamakoudji au Miel (Jus de Gingembre)',
      description: 'Jus de gingembre frais pressé à chaud, adouci au miel pur de savane.',
      prix: 1000,
      photoUrl: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=500',
      stock: 150,
      seuilMin: 15,
      cible: 'TOUS',
      catNom: 'Boissons & Rafraîchissements',
    },
    {
      nom: 'Pack Repas B2B Executive (Menu Duo)',
      description: 'Plat principal + Boisson artisanale + Dessert au choix dans un packaging isotherme écoresponsable.',
      prix: 5000,
      photoUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500',
      stock: 100,
      seuilMin: 10,
      cible: 'B2B',
      catNom: 'Offres Entreprises B2B',
    },
  ];

  console.log('\n🍲 Seeding des articles en boutique :');
  for (const art of articlesToSeed) {
    const categorieId = categoryMap.get(art.catNom);

    const existingArt = await connection.query(
      `SELECT id FROM articles WHERE nom = $1 AND "restaurantId" = $2 LIMIT 1`,
      [art.nom, restaurantId]
    );

    if (existingArt.length > 0) {
      await connection.query(
        `UPDATE articles SET prix = $1, stock = $2, disponible = true, "photoUrl" = $3, cible = $4, "updatedAt" = NOW()
         WHERE id = $5`,
        [art.prix, art.stock, art.photoUrl, art.cible, existingArt[0].id]
      );
      console.log(`   🔄 Article mis à jour : ${art.nom} (${art.prix} FCFA, Stock: ${art.stock})`);
    } else {
      await connection.query(
        `INSERT INTO articles (
          id, nom, description, prix, "photoUrl", stock, "seuilMin", disponible, 
          cible, "categorieId", "restaurantId", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, 
          $7, $8, $9, NOW(), NOW()
        )`,
        [
          art.nom,
          art.description,
          art.prix,
          art.photoUrl,
          art.stock,
          art.seuilMin,
          art.cible,
          categorieId,
          restaurantId,
        ]
      );
      console.log(`   ✨ Article créé : ${art.nom} (${art.prix} FCFA, Stock: ${art.stock})`);
    }
  }

  console.log('\n🎉 ========================================================');
  console.log('✅ SEEDING COMPLET RÉUSSI !');
  console.log('========================================================');
  console.log(`🔑 Mot de passe unique pour TOUS les comptes : ${COMMON_PASSWORD}`);
  console.log('--------------------------------------------------------');
  console.log('📧 Comptes créés par rôle :');
  console.log('   - ADMIN    : admin@restodici.ci');
  console.log('   - GERANT   : gerant@restodici.ci');
  console.log('   - STAFF    : staff@restodici.ci');
  console.log('   - CLIENT   : client@restodici.ci');
  console.log('   - B2B      : b2b@restodici.ci');
  console.log('========================================================\n');

  await connection.close();
}

seedDemo().catch((err) => {
  console.error('❌ Erreur lors du seeding demo :', err);
  process.exit(1);
});
