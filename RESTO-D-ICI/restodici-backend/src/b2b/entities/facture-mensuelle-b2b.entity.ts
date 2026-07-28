import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CompteB2B } from './compte-b2b.entity';

export type StatutFactureB2B =
  | 'EN_ATTENTE'
  | 'PAYEE'
  | 'RETARDEE'
  | 'EN_CONTESTATION';

@Entity('factures_mensuelles_b2b')
export class FactureMensuelleB2B {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CompteB2B, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'compteB2BId' })
  compteB2B!: CompteB2B;

  @Column()
  annee!: number;

  @Column()
  mois!: string; // ex: "MAI"

  @Column({
    type: 'enum',
    enum: ['EN_ATTENTE', 'PAYEE', 'RETARDEE', 'EN_CONTESTATION'],
    default: 'EN_ATTENTE',
  })
  statut!: StatutFactureB2B;

  @Column('decimal', { precision: 14, scale: 2 })
  montantHT!: number;

  @Column('decimal', { precision: 14, scale: 2 })
  tva!: number;

  @Column('decimal', { precision: 14, scale: 2 })
  montantTTC!: number;

  @Column({ nullable: true })
  numeroFacture?: string;

  // SYSCOHADA / infos légales
  @Column({ nullable: true })
  nifRestaurant?: string;

  @Column({ nullable: true })
  rccmRestaurant?: string;

  @Column({ nullable: true })
  nifClient?: string;

  @Column({ nullable: true })
  rccmClient?: string;

  // PDF
  @Column({ nullable: true })
  pdfUrl?: string;

  @Column({ type: 'date', nullable: true })
  echeance?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
