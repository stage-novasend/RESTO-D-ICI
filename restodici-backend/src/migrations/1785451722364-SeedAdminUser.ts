import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crée le compte Admin Système par défaut si aucun compte avec cet email
 * n'existe déjà. `seed-admin.ts` fait la même chose mais doit être lancé
 * manuellement (npm run seed:admin) ; sur les environnements déployés sans
 * accès SSH/DB direct (CapRover), cette migration est le seul moyen fiable
 * de bootstrap le premier admin puisque les migrations s'exécutent déjà
 * automatiquement au démarrage.
 *
 * Email    : admin@restodici.ci
 * Password : Admin@2025! (hash bcrypt ci-dessous, coût 12)
 * À changer immédiatement après la première connexion — l'onboarding admin
 * (AdminService.getOnboardingStatus) détecte ce mot de passe par défaut et
 * force son remplacement.
 */
export class SeedAdminUser1785451722364 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const existing = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`,
      ['admin@restodici.ci'],
    );
    if (existing.length > 0) return;

    await queryRunner.query(
      `INSERT INTO users (id, nom, prenom, email, password, role, actif, "emailVerified", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), 'Admin', 'Système', $1, $2, 'ADMIN', true, true, NOW(), NOW())`,
      [
        'admin@restodici.ci',
        '$2b$12$3pF8YzcYxOZt7NOS7R6tyOVE5eJjwp8y8QomEPBWEN/Obm5in6ebG',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM users WHERE email = 'admin@restodici.ci' AND role = 'ADMIN'`,
    );
  }
}
