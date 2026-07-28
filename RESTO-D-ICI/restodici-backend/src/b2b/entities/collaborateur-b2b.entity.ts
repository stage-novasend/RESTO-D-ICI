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

@Entity('collaborateurs_b2b')
export class CollaborateurB2B {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  nom!: string;

  @Column({ unique: true })
  email!: string;

  // Limite de dépense individuelle mensuelle (RG-33)
  @Column('decimal', { precision: 14, scale: 2 })
  limiteBudget!: number;

  // Lien optionnel vers un User (si le collaborateur a un compte)
  @Column({ nullable: true })
  userId?: string;

  @Column({ default: true })
  actif!: boolean;

  // Invitation par email (RG-33)
  @Column({ nullable: true, unique: true })
  invitationToken?: string;

  @Column({ nullable: true, type: 'timestamptz' })
  invitationExpiry?: Date;

  @Column({ default: false })
  invitationAccepted!: boolean;

  @ManyToOne(() => CompteB2B, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'compteB2BId' })
  compteB2B!: CompteB2B;

  @Column()
  compteB2BId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
