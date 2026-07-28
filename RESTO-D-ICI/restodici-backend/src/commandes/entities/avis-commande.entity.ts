import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Commande } from './commande.entity';
import { User } from '../../auth/entities/user.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

@Entity('avis_commandes')
@Index(['commande', 'client'], { unique: true })
export class AvisCommande {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Commande)
  @JoinColumn({ name: 'commandeId' })
  commande!: Commande;

  @ManyToOne(() => Restaurant)
  @JoinColumn({ name: 'restaurantId' })
  restaurant!: Restaurant;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'clientId' })
  client!: User;

  @Column({ type: 'int' })
  note!: number;

  @Column({ nullable: true })
  commentaire?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
