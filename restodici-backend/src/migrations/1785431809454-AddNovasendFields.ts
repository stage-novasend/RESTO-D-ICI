import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNovasendFields1785431809454 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "restaurants" ADD "modeReceptionPaiement" character varying NOT NULL DEFAULT 'NOVASEND'`);
        await queryRunner.query(`ALTER TABLE "restaurants" ADD "modeReceptionDetails" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "restaurants" DROP COLUMN "modeReceptionDetails"`);
        await queryRunner.query(`ALTER TABLE "restaurants" DROP COLUMN "modeReceptionPaiement"`);
    }

}
