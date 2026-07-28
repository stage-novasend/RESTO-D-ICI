import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CompteB2B } from './compte-b2b.entity';
import { LigneCommandeGroupeeB2B } from './ligne-commande-groupee-b2b.entity';

@Entity('commandes_groupes_b2b')
export class CommandeGroupeeB2B {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  numero!: string;

  @ManyToOne(() => CompteB2B, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'compteB2BId' })
  compteB2B!: CompteB2B;

  @Column()
  dateLivraison!: Date;

  @Column()
  heureLivraison!: string;

  // Lieu de livraison (ex: siège, succursale...)
  @Column()
  lieuLivraison!: string;

  // Adresse complète (si nécessaire)
  @Column({ nullable: true })
  adresseLivraison?: string;

  @Column('decimal', { precision: 14, scale: 2 })
  totalEstime!: number;

  @Column({ nullable: true })
  restaurantId?: string;

  // Statut simplifié pour US-35 (pipeline côté B2B)
  @Column({ default: 'EN_ATTENTE' })
  statut!: string;

  @OneToMany(() => LigneCommandeGroupeeB2B, (ligne) => ligne.commandeGroupee, {
    cascade: true,
  })
  lignes!: LigneCommandeGroupeeB2B[];

  // Avis après livraison (RG-35)
  @Column({ nullable: true, type: 'int' })
  avisNote?: number;

  @Column({ nullable: true, type: 'text' })
  avisCommentaire?: string;

  @Column({ nullable: true, type: 'timestamptz' })
  avisAt?: Date;

  // Paiement encaissé à la caisse avant préparation
  @Column({ default: false })
  estPaye!: boolean;

  // Rappel de livraison imminente déjà notifié (idempotence du CRON)
  @Column({ default: false })
  rappelNotifie!: boolean;

  // Délai de traitement automatique : 4h après la création (US-35)
  @Column({ nullable: true, type: 'timestamptz' })
  deadlineAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
