import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('fournisseurs')
export class Fournisseur {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  nom!: string;

  @Column({ nullable: true })
  contact?: string;

  @Column({ nullable: true })
  telephone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  adresse?: string;

  @Column({ type: 'int', default: 0 })
  delaiLivraison!: number; // jours

  @Column({ type: 'text', nullable: true })
  articlesRef?: string; // liste articles virgule séparés

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ default: true })
  actif!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
