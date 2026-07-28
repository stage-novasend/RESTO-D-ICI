// src/b2b/entities/compte-b2b.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('comptes_b2b')
export class CompteB2B {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'responsableUserId' })
  responsable!: User;

  @Column()
  raisonSociale!: string;

  @Column({ unique: true })
  numeroRCCM!: string;

  @Column({ unique: true })
  numeroContribuable!: string;

  @Column({ unique: true })
  emailProfessionnel!: string;

  @Column()
  telephoneProfessionnel!: string;

  @Column({ default: 'EN_ATTENTE' })
  statutValidation!: string;

  @Column({ default: false })
  actif!: boolean;

  @Column({ nullable: true })
  adresseSiege?: string;

  @Column({ type: 'date', nullable: true })
  datePrelevement?: string;

  @Column({ type: 'int', nullable: true })
  jourPrelevement?: number;

  @Column({ nullable: true })
  validePar!: string;

  @Column({ nullable: true })
  dateValidation!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
