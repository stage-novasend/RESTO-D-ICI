/**
 * Script de seeding — crée le compte Admin Système initial.
 * Usage : npx ts-node -r tsconfig-paths/register src/admin/seed-admin.ts
 */
import { createConnection } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env') });

async function seedAdmin() {
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

  const ADMIN_EMAIL = 'admin@restodici.ci';
  const ADMIN_PASSWORD = 'Admin@2025!';

  const existing = await connection.query(
    `SELECT id FROM users WHERE email = $1`,
    [ADMIN_EMAIL],
  );

  if (existing.length > 0) {
    console.log(`✅ Compte admin déjà existant : ${ADMIN_EMAIL}`);
    await connection.close();
    return;
  }

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await connection.query(
    `INSERT INTO users (id, nom, prenom, email, password, role, actif, "emailVerified", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), 'Admin', 'Système', $1, $2, 'ADMIN', true, true, NOW(), NOW())`,
    [ADMIN_EMAIL, hashed],
  );

  console.log('✅ Compte admin créé avec succès !');
  console.log(`   Email    : ${ADMIN_EMAIL}`);
  console.log(`   Password : ${ADMIN_PASSWORD}`);
  console.log('   ⚠️  Changez le mot de passe après la première connexion.');

  await connection.close();
}

seedAdmin().catch((err) => {
  console.error('❌ Erreur :', err.message);
  process.exit(1);
});
