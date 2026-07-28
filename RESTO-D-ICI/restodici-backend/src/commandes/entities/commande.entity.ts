import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { LigneCommande } from './ligne-commande.entity';

export enum StatutCommande {
  RECUE = 'RECUE',
  CONFIRMEE = 'CONFIRMEE',
  EN_PREP = 'EN_PREP',
  PRETE = 'PRETE',
  EN_LIVRAISON = 'EN_LIVRAISON',
  LIVREE = 'LIVREE',
  ANNULEE = 'ANNULEE',
}

export enum ModeLivraison {
  SUR_PLACE = 'SUR_PLACE',
  EMPORTER = 'EMPORTER',
  LIVRAISON = 'LIVRAISON',
}

export enum ModePaiementCommande {
  ESPECES = 'ESPECES',
  LIVRAISON = 'LIVRAISON',
  WAVE = 'WAVE',
  NOVASEND = 'NOVASEND',
  ORANGE_MONEY = 'ORANGE_MONEY',
  MTN_MONEY = 'MTN_MONEY',
  MOOV_MONEY = 'MOOV_MONEY',
  CARTE_BANCAIRE = 'CARTE_BANCAIRE',
}
// Note: si TypeORM synchronize ne met pas à jour l'enum PG, executer :
// ALTER TYPE commandes_modepaiement_enum ADD VALUE IF NOT EXISTS 'WAVE';
// ALTER TYPE commandes_modepaiement_enum ADD VALUE IF NOT EXISTS 'NOVASEND';

@Entity('commandes')
export class Commande {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  numero!: string;

  @Column({ type: 'enum', enum: StatutCommande, default: StatutCommande.RECUE })
  statut!: StatutCommande;

  @Column({ type: 'enum', enum: ModeLivraison })
  modeLivraison!: ModeLivraison;

  @Column({ nullable: true })
  adresseLivraison!: string;

  @Column({ nullable: true, type: 'varchar', length: 20 })
  tableNumber?: string;

  // Délai de préparation estimé en minutes (fixé par le staff)
  @Column({ type: 'int', nullable: true })
  delaiEstime?: number;

  @Column('decimal', { precision: 10, scale: 2 })
  montantTotal!: number;

  /* ── Livraison externe ── */
  @Column('decimal', { precision: 10, scale: 2, nullable: true, default: 0 })
  fraisLivraison?: number;

  @Column({ nullable: true })
  livraisonExterneId?: string;

  /* escrow : frais livreur bloqués dès le paiement client */
  @Column({ default: false })
  livreurPaiementBloque!: boolean;

  /* libéré quand le client confirme la réception */
  @Column({ default: false })
  livreurPaye!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  receptionConfirmeeAt?: Date;

  /* ── Commissions ── */
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  montantNetRestaurant?: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  tauxCommission?: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  montantCommissionPlateforme?: number;

  @Column({ default: false })
  estPaye!: boolean;

  @Column({ type: 'enum', enum: ModePaiementCommande, nullable: true })
  modePaiement?: ModePaiementCommande;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  montantRemise?: number;

  @Column({ nullable: true })
  codePromoId?: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  montantRemis?: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  renduMonnaie?: number;

  @Column({ type: 'timestamp', nullable: true })
  payeAt?: Date;

  @Column({ default: false })
  rembourse!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  rembourseLe?: Date;

  @Column({ type: 'text', nullable: true })
  motifRemboursement?: string;

  @Column({ nullable: true, type: 'text' })
  recuPdfS3Key?: string;

  @Column({ default: false })
  recuEmailSent!: boolean;

  @Column({ default: false })
  recuSmsSent!: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'clientId' })
  client!: User;

  @ManyToOne(() => Restaurant)
  @JoinColumn({ name: 'restaurantId' })
  restaurant!: Restaurant;

  @OneToMany(() => LigneCommande, (ligne) => ligne.commande, { cascade: true })
  lignes!: LigneCommande[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
