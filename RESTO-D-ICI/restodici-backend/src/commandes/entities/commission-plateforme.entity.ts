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

  @CreateDateColumn()
  createdAt!: Date;
}
