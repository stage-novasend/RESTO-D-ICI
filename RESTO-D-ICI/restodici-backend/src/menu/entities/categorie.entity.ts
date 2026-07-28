// src/menu/entities/categorie.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Article } from './article.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

@Entity('categories')
export class Categorie {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  nom!: string;

  @Column({ nullable: true })
  description!: string;

  @Column({ nullable: true })
  icone!: string;

  @Column({ default: true })
  actif!: boolean;

  // 🔗 NOUVEAU : Lien vers le restaurant (pour isolation multi-tenant)
  @ManyToOne(() => Restaurant, (restaurant) => restaurant.articles, {
    nullable: true,
  })
  restaurant?: Restaurant;

  @OneToMany(() => Article, (article) => article.categorie)
  articles!: Article[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
