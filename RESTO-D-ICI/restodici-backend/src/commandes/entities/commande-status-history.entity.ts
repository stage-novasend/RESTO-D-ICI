import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Commande, StatutCommande } from './commande.entity';

@Entity('commande_status_history')
export class CommandeStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Commande, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commandeId' })
  commande!: Commande;

  @Column()
  commandeId!: string;

  @Column({ nullable: true })
  actorId?: string;

  @Column({ nullable: true })
  actorRole?: string;

  @Column({ nullable: true })
  actorNom?: string;

  @Column({ type: 'enum', enum: StatutCommande, nullable: true })
  statutPrecedent?: StatutCommande;

  @Column({ type: 'enum', enum: StatutCommande })
  statutNouvel!: StatutCommande;

  @CreateDateColumn()
  createdAt!: Date;
}
