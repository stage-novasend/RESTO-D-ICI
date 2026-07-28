// src/menu/entities/article.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Categorie } from './categorie.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { LigneCommande } from '../../commandes/entities/ligne-commande.entity';

export enum CibleEnum {
  CLIENT = 'CLIENT',
  B2B = 'B2B',
  TOUS = 'TOUS',
}

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  nom!: string; //  Requis (pas nullable)

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column('decimal', { precision: 10, scale: 2 })
  prix!: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  prixPromo?: number | null;

  @Column({ default: false })
  promoActif!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  activationDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  expirationDate?: Date;

  @Column({ default: false })
  estMenuDuJour!: boolean;

  @Column({ type: 'text', nullable: true })
  photoUrl!: string | null; // Correction TS

  @Column({ default: true })
  disponible!: boolean;

  @Column({ type: 'enum', enum: CibleEnum, default: CibleEnum.CLIENT })
  cible!: CibleEnum;

  @Column({ type: 'simple-array', nullable: true }) // Stocke les tableaux en DB
  allergenes!: string[];

  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  variants!: Array<{ label: string; prixSupplement: number }>;

  @Column({ default: 0 })
  stock!: number;

  @Column({ nullable: true })
  seuilMin!: number;

  @Column({ nullable: true })
  categorieId!: string;

  @Column()
  restaurantId!: string;

  @ManyToOne(() => Categorie, (categorie) => categorie.articles, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'categorieId' })
  categorie!: Categorie;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.articles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'restaurantId' })
  restaurant!: Restaurant;

  @OneToMany(() => LigneCommande, (ligne) => ligne.article)
  lignesCommandes!: LigneCommande[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
