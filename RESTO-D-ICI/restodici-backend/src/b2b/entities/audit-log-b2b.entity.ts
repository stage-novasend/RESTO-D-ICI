import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { CompteB2B } from './compte-b2b.entity';

export type TypeAuditB2B =
  | 'CONNEXION'
  | 'CREATION_COLLABORATEUR'
  | 'CREATION_COMMANDE_GROUPEE'
  | 'VALIDATION_BUDGET'
  | 'GENERATION_FACTURE'
  | 'PAIEMENT_FACTURE';

@Entity('audit_logs_b2b')
export class AuditLogB2B {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CompteB2B, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'compteB2BId' })
  compteB2B!: CompteB2B;

  @Column({
    type: 'enum',
    enum: [
      'CONNEXION',
      'CREATION_COLLABORATEUR',
      'CREATION_COMMANDE_GROUPEE',
      'VALIDATION_BUDGET',
      'GENERATION_FACTURE',
      'PAIEMENT_FACTURE',
    ],
  })
  type!: TypeAuditB2B;

  @Column()
  actorUserId!: string;

  @Column({ nullable: true })
  actorEmail?: string;

  @Column({ type: 'simple-json', nullable: true })
  meta?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;
}
