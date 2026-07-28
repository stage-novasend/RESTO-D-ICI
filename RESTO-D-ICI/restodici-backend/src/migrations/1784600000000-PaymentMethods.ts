import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentMethods1784600000000 implements MigrationInterface {
  name = 'PaymentMethods1784600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "payment_methods" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying NOT NULL,
        "label" character varying NOT NULL,
        "provider" character varying NOT NULL,
        "gateway" character varying NOT NULL,
        "needsPhone" boolean NOT NULL DEFAULT false,
        "enabled" boolean NOT NULL DEFAULT true,
        "ordre" integer NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_payment_methods_code" UNIQUE ("code"),
        CONSTRAINT "PK_payment_methods_id" PRIMARY KEY ("id")
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payment_methods"`);
  }
}
