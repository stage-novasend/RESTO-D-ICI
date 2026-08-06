import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * La table "system_configs" a été ajoutée à InitialSchema APRÈS que cette
 * migration ait déjà été exécutée sur la base de production (voir commit
 * 931dfb0, 2026-07-10) — TypeORM ne rejoue jamais une migration déjà
 * marquée comme exécutée, et la garde d'idempotence de InitialSchema
 * (`if (await queryRunner.hasTable('users')) return;`, ajoutée le 30/07)
 * la rend de toute façon définitivement no-op sur cette base. Résultat :
 * "relation system_configs does not exist" en boucle au démarrage
 * (SlaService lit la clé sla_last_heartbeat via un CRON planifié).
 *
 * Migration séparée, avec sa propre garde d'idempotence, pour les
 * environnements où la table existe déjà (dev/local dont InitialSchema
 * a tourné après le 10/07, ou toute base provisionnée depuis).
 */
export class AddSystemConfigsTable1786026488005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('system_configs')) return;
    await queryRunner.query(
      `CREATE TABLE "system_configs" ("key" character varying NOT NULL, "value" text, "description" character varying, "category" character varying NOT NULL DEFAULT 'system', "updatedBy" character varying, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5aff9a6d272a5cedf54d7aaf617" PRIMARY KEY ("key"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "system_configs"`);
  }
}
