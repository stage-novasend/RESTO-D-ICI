import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1784541866364 implements MigrationInterface {
    name = 'Migration1784541866364'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "commandes_groupes_b2b" ADD "rappelNotifie" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "commandes_groupes_b2b" DROP COLUMN "rappelNotifie"`);
    }

}
