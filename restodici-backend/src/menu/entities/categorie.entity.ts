import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { Article } from './article.entity';

@Entity('categories')
export class Categorie {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() nom!: string;
  @Column({ nullable: true }) description!: string;
  @Column({ nullable: true }) icone!: string; // Emoji ou URL icône
  @Column({ default: true }) actif!: boolean;
  @CreateDateColumn() createdAt!: Date;
  @OneToMany(() => Article, (article) => article.categorie) articles!: Article[];
}