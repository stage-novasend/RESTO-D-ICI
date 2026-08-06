import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * b2b.service.ts appelait déjà `logAudit('MODIFICATION_COLLABORATEUR' as
 * any, ...)` lors de la mise à jour de la limite de dépense d'un
 * collaborateur — mais cette valeur n'a jamais fait partie de l'enum
 * Postgres `audit_logs_b2b_type_enum` (le `as any` masquait l'erreur de
 * type). `logAudit` avale les erreurs dans un try/catch, donc l'insertion
 * échouait silencieusement à chaque fois : cet événement n'a jamais été
 * tracé dans le journal d'audit B2B.
 */
export class AddModificationCollaborateurAuditType1786031924376 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."audit_logs_b2b_type_enum" ADD VALUE IF NOT EXISTS 'MODIFICATION_COLLABORATEUR'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres ne supporte pas DROP VALUE sur un type enum — retrait non
    // réversible sans recréer le type (risque de perte de données si des
    // lignes existantes utilisent déjà cette valeur).
  }
}
