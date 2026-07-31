import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Le CDC §9.3 « Paiement caisse » exige que le règlement au comptoir couvre
 * espèces ET chèque à égalité. Le frontend (CaissePage) proposait déjà
 * « Chèque » comme mode de paiement sélectionnable, mais l'enum Postgres
 * `commandes_modepaiement_enum` ne le contenait pas : PATCH /commandes/:id/paiement
 * avec modePaiement=CHEQUE plantait en 500 (valeur invalide pour l'enum).
 */
export class AddChequePaymentMode1785515300911 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "commandes_modepaiement_enum" ADD VALUE IF NOT EXISTS 'CHEQUE'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres ne supporte pas DROP VALUE sur un type enum — retrait non
    // réversible sans recréer le type (risque de perte de données si des
    // lignes existantes utilisent déjà 'CHEQUE').
  }
}
