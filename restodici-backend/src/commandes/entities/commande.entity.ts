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
}

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

  @Column('decimal', { precision: 10, scale: 2 })
  montantTotal!: number;

  @Column({ default: false })
  estPaye!: boolean;

  @Column({ type: 'enum', enum: ModePaiementCommande, nullable: true })
  modePaiement?: ModePaiementCommande;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  montantRemis?: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  renduMonnaie?: number;

  @Column({ type: 'timestamp', nullable: true })
  payeAt?: Date;

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
