import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Étend commissions_plateforme pour suivre, par commande livrée :
 *  - le mode de paiement (pour distinguer dette espèces vs versement en ligne)
 *  - le montant net dû au restaurant (montantCommande - montantCommission)
 *  - le statut du cycle (dette à payer par le resto, ou versement à faire par
 *    la plateforme), avec échéance (dette espèces = 7 jours) et traçabilité
 *    du payout NovaSend (référence, provider, erreur éventuelle).
 */
export class CommissionPayoutTracking1785489200589 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('commissions_plateforme', 'statut')) return;

    // Distingue de façon fiable "la plateforme a encaissé" (webhook NovaSend)
    // de "le restaurant a encaissé lui-même" (espèces, terminal carte propre
    // via registerPayment) — plus robuste qu'une déduction depuis modePaiement,
    // qui peut valoir CARTE_BANCAIRE dans les deux cas selon la config.
    await queryRunner.query(
      `ALTER TABLE "commandes" ADD "paiementCollectePlateforme" boolean NOT NULL DEFAULT false`,
    );

    await queryRunner.query(
      `ALTER TABLE "commissions_plateforme" ADD "modePaiement" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "commissions_plateforme" ADD "montantNet" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "commissions_plateforme" ADD "statut" character varying NOT NULL DEFAULT 'A_TRAITER'`,
    );
    await queryRunner.query(
      `ALTER TABLE "commissions_plateforme" ADD "dateEcheance" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "commissions_plateforme" ADD "dateReglement" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "commissions_plateforme" ADD "payoutReference" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "commissions_plateforme" ADD "payoutProvider" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "commissions_plateforme" ADD "payoutMsisdn" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "commissions_plateforme" ADD "payoutErreur" text`,
    );

    // Backfill des lignes déjà existantes : mode inconnu, on les marque
    // traitées pour ne pas les faire apparaître comme dette/à verser.
    await queryRunner.query(
      `UPDATE "commissions_plateforme" SET "statut" = 'HISTORIQUE', "montantNet" = "montantCommande" - "montantCommission" WHERE "statut" = 'A_TRAITER'`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_commissions_plateforme_statut" ON "commissions_plateforme" ("statut")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_commissions_plateforme_restaurantId_statut" ON "commissions_plateforme" ("restaurantId", "statut")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_commissions_plateforme_restaurantId_statut"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_commissions_plateforme_statut"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commissions_plateforme" DROP COLUMN "payoutErreur"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commissions_plateforme" DROP COLUMN "payoutMsisdn"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commissions_plateforme" DROP COLUMN "payoutProvider"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commissions_plateforme" DROP COLUMN "payoutReference"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commissions_plateforme" DROP COLUMN "dateReglement"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commissions_plateforme" DROP COLUMN "dateEcheance"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commissions_plateforme" DROP COLUMN "statut"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commissions_plateforme" DROP COLUMN "montantNet"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commissions_plateforme" DROP COLUMN "modePaiement"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commandes" DROP COLUMN "paiementCollectePlateforme"`,
    );
  }
}
