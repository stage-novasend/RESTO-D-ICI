import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

/** Dépense opérationnelle saisie par le gérant (onglet Trésorerie). */
@Entity('depenses_operationnelles')
export class DepenseOperationnelle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurantId' })
  restaurant!: Restaurant;

  @Column({ name: 'restaurantId' })
  restaurantId!: string;

  @Column({ type: 'varchar' })
  categorie!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  montant!: number;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @Column({ type: 'timestamp' })
  date!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
