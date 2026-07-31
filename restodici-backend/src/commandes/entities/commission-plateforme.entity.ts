import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Commande } from './commande.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

/**
 * Statut du cycle commission/versement d'une ligne :
 * - Commande payée en ligne (plateforme a encaissé) → cycle "payout" :
 *   A_VERSER → EN_COURS → VERSE (ou ECHEC si le virement NovaSend échoue).
 * - Commande payée en espèces (restaurant a encaissé) → cycle "dette" :
 *   DU (avant dateEcheance) → PAYE (régularisé par l'admin), ou toujours DU
 *   après dateEcheance = restaurant bloqué pour les nouvelles commandes.
 * - HISTORIQUE : lignes créées avant l'introduction de ce suivi.
 */
export type CommissionPlateformeStatut =
  | 'A_VERSER'
  | 'EN_COURS'
  | 'VERSE'
  | 'ECHEC'
  | 'DU'
  | 'PAYE'
  | 'HISTORIQUE';

@Entity('commissions_plateforme')
export class CommissionPlateforme {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Commande, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commandeId' })
  commande!: Commande;

  @Column({ name: 'commandeId' })
  commandeId!: string;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurantId' })
  restaurant!: Restaurant;

  @Column({ name: 'restaurantId' })
  restaurantId!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  montantCommande!: number;

  @Column('decimal', { precision: 5, scale: 2 })
  tauxCommission!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  montantCommission!: number;

  /** Montant dû au restaurant après commission (montantCommande - montantCommission). */
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  montantNet!: number | null;

  /** Mode de paiement de la commande au moment du calcul (ESPECES, WAVE, ...). */
  @Column({ type: 'varchar', nullable: true })
  modePaiement!: string | null;

  @Column({ type: 'varchar', default: 'A_TRAITER' })
  statut!: CommissionPlateformeStatut | 'A_TRAITER';

  /** Dette espèces : date au-delà de laquelle le resto est bloqué si non réglée. */
  @Column({ type: 'timestamp', nullable: true })
  dateEcheance!: Date | null;

  /** Date de règlement (dette payée) ou de versement confirmé. */
  @Column({ type: 'timestamp', nullable: true })
  dateReglement!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  payoutReference!: string | null;

  @Column({ type: 'varchar', nullable: true })
  payoutProvider!: string | null;

  @Column({ type: 'varchar', nullable: true })
  payoutMsisdn!: string | null;

  @Column({ type: 'text', nullable: true })
  payoutErreur!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
