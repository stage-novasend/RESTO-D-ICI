import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Nettoyage ponctuel demandé par l'équipe : supprime tous les utilisateurs
 * de l'environnement sandbox SAUF les comptes ADMIN (donc le compte
 * admin@restodici.ci créé par SeedAdminUser reste utilisable).
 *
 * La plupart des FK vers users(id) sont en ON DELETE NO ACTION : un simple
 * `DELETE FROM users` échouerait (violation de contrainte) et ferait
 * planter le démarrage du backend, comme la table "migrations" était déjà
 * plantée avant la correction de l'idempotence des migrations. On détache
 * donc d'abord les lignes dépendantes (mise à NULL des FK nullable, ou
 * suppression des lignes qui n'ont pas de sens sans l'utilisateur) avant de
 * supprimer les comptes.
 *
 * Irréversible — `down()` ne peut pas restaurer les données supprimées.
 */
export class WipeNonAdminUsers1785486196118 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const nonAdmin = `(SELECT id FROM users WHERE role != 'ADMIN')`;

        // Jetons de réinitialisation de mot de passe : NOT NULL, sans intérêt
        // une fois l'utilisateur supprimé.
        await queryRunner.query(`DELETE FROM password_resets WHERE "userId" IN ${nonAdmin}`);

        // Appartenance à une équipe B2B : table de jonction, vide de sens
        // sans l'utilisateur.
        await queryRunner.query(`DELETE FROM b2b_team_members WHERE user_id IN ${nonAdmin}`);

        // Équipes / factures / commandes groupées B2B, commandes et avis
        // clients : on détache (FK nullable) plutôt que supprimer, pour
        // conserver l'historique métier.
        await queryRunner.query(`UPDATE b2b_teams SET created_by = NULL WHERE created_by IN ${nonAdmin}`);
        await queryRunner.query(`UPDATE b2b_invoices SET b2b_client_id = NULL WHERE b2b_client_id IN ${nonAdmin}`);
        await queryRunner.query(`UPDATE b2b_bulk_orders SET created_by = NULL WHERE created_by IN ${nonAdmin}`);
        await queryRunner.query(`UPDATE commandes SET "clientId" = NULL WHERE "clientId" IN ${nonAdmin}`);
        await queryRunner.query(`UPDATE avis_commandes SET "clientId" = NULL WHERE "clientId" IN ${nonAdmin}`);

        // comptes_b2b (responsableUserId → CASCADE), user_favorites (→ CASCADE)
        // et payments (userId → SET NULL) sont gérés automatiquement par
        // leurs contraintes FK lors du DELETE ci-dessous.

        await queryRunner.query(`DELETE FROM users WHERE role != 'ADMIN'`);
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // Suppression de données irréversible — pas de rollback possible.
    }

}
