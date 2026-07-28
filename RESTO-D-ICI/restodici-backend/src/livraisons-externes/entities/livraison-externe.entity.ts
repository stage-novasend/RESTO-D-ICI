import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { FournisseurLivraison } from './fournisseur-livraison.entity';

export enum StatutLivraisonExterne {
  EN_ATTENTE  = 'EN_ATTENTE',
  AFFECTEE    = 'AFFECTEE',
  EN_COURS    = 'EN_COURS',
  LIVREE      = 'LIVREE',
  ECHEC       = 'ECHEC',
  ANNULEE     = 'ANNULEE',
}

@Entity('livraisons_externes')
export class LivraisonExterne {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  commandeId!: string;

  @ManyToOne(() => FournisseurLivraison)
  @JoinColumn({ name: 'fournisseurId' })
  fournisseur!: FournisseurLivraison;

  @Column()
  fournisseurId!: string;

  // Identifiant de la livraison côté fournisseur
  @Column({ nullable: true })
  referenceExterne?: string;

  @Column({ type: 'enum', enum: StatutLivraisonExterne, default: StatutLivraisonExterne.EN_ATTENTE })
  statut!: StatutLivraisonExterne;

  @Column({ nullable: true, type: 'text' })
  adresseLivraison?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  fraisLivraison?: number;

  @Column({ nullable: true })
  nomLivreur?: string;

  @Column({ nullable: true })
  telephoneLivreur?: string;

  @Column({ nullable: true, type: 'text' })
  trackingUrl?: string;

  @Column({ nullable: true, type: 'jsonb' })
  metadonnees?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
