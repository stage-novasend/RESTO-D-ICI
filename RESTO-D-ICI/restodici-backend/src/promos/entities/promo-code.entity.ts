import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

export enum TypePromo {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

export enum VisibilitePromo {
  TOUS = 'TOUS',           // visible par tous (par défaut)
  CONNECTES = 'CONNECTES', // uniquement utilisateurs connectés
  NOUVEAUX = 'NOUVEAUX',   // uniquement nouveaux clients (0 commande)
}

@Entity('promo_codes')
export class PromoCode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 40 })
  code!: string;

  @Column({ type: 'enum', enum: TypePromo, default: TypePromo.PERCENT })
  type!: TypePromo;

  @Column('decimal', { precision: 10, scale: 2 })
  valeur!: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  minMontant!: number;

  @Column({ type: 'int', nullable: true })
  maxUses?: number;

  @Column({ type: 'int', default: 0 })
  usedCount!: number;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ default: true })
  actif!: boolean;

  @Column({ type: 'enum', enum: VisibilitePromo, default: VisibilitePromo.TOUS })
  visibilite!: VisibilitePromo;

  @Column()
  restaurantId!: string;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurantId' })
  restaurant!: Restaurant;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
