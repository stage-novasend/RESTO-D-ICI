import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * La trésorerie gérant (dépenses opérationnelles, plafond budgétaire) était
 * purement décorative côté backend : POST /tresorerie/expenses et
 * POST /tresorerie/budget-alerts renvoyaient un objet écho sans jamais rien
 * persister. Ajoute une vraie table pour les dépenses et de vrais champs de
 * config budget sur le restaurant.
 */
export class TresorerieRealPersistence1785513935664 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('depenses_operationnelles')) return;

    await queryRunner.query(`
      CREATE TABLE "depenses_operationnelles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "restaurantId" uuid NOT NULL,
        "categorie" character varying NOT NULL,
        "montant" numeric(10,2) NOT NULL,
        "description" character varying,
        "date" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_depenses_operationnelles" PRIMARY KEY ("id"),
        CONSTRAINT "FK_depenses_operationnelles_restaurant" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_depenses_operationnelles_restaurantId_date" ON "depenses_operationnelles" ("restaurantId", "date")`,
    );

    await queryRunner.query(
      `ALTER TABLE "restaurants" ADD "budgetPlafondMensuel" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurants" ADD "budgetAlerte80" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurants" ADD "budgetAlerte100" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "restaurants" DROP COLUMN "budgetAlerte100"`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurants" DROP COLUMN "budgetAlerte80"`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurants" DROP COLUMN "budgetPlafondMensuel"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_depenses_operationnelles_restaurantId_date"`,
    );
    await queryRunner.query(`DROP TABLE "depenses_operationnelles"`);
  }
}
