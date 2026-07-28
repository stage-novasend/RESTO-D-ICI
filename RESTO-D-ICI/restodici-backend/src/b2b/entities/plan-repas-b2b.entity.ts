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

export type FrequencePlan = 'HEBDO' | 'MENSUEL';

@Entity('plans_repas_b2b')
export class PlanRepasB2B {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CompteB2B, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'compteId' })
  compte!: CompteB2B;

  @Column()
  compteId!: string;

  @Column()
  nom!: string;

  @Column({ type: 'enum', enum: ['HEBDO', 'MENSUEL'], default: 'HEBDO' })
  frequence!: FrequencePlan;

  @Column({ type: 'int', default: 1 })
  nbRepas!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  budgetRepas!: number;

  @Column({ nullable: true, type: 'text' })
  notes?: string;

  @Column({ default: true })
  actif!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  prochaineLivraison?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
