import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Commande } from '../../commandes/entities/commande.entity';

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

/**
 * Trace transactionnelle d'un paiement (audit + rapprochement).
 * Écrite à l'initiation (PENDING) puis mise à jour au webhook. Additif : ne
 * remplace pas Commande.estPaye, il l'historise.
 */
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Référence transmise à la gateway (ex: id de commande, ou 'b2b-facture-<id>').
  @Index()
  @Column()
  reference!: string;

  @Column()
  provider!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount!: number;

  @Column({ default: 'XOF' })
  currency!: string;

  @Index()
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  // Identifiant de transaction retourné par la gateway (session/transaction id).
  @Column({ nullable: true })
  externalTransactionId?: string;

  @Column({ type: 'text', nullable: true })
  paymentUrl?: string;

  @Column({ nullable: true })
  customerName?: string;

  @Column({ nullable: true })
  customerPhone?: string;

  @Column({ nullable: true })
  customerEmail?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  // Commande associée (nullable : un paiement peut concerner une facture B2B).
  @ManyToOne(() => Commande, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'commandeId' })
  commande?: Commande | null;

  @Column({ nullable: true })
  commandeId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: User | null;

  @Column({ nullable: true })
  userId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
