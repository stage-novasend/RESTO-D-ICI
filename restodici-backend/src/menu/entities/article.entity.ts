import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Categorie } from './categorie.entity';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() nom!: string;
  @Column({ type: 'text', nullable: true }) description!: string;
  @Column('decimal', { precision: 10, scale: 2 }) prix!: number; // RG-05: prix > 0
  @Column({ nullable: true }) photoUrl!: string;
  @Column({ default: true }) disponible!: boolean; // RG-02: synchro < 30s
  @Column({ default: 0 }) stock!: number; // RG-03: rupture auto si 0
  @Column('simple-array', { nullable: true }) allergenes!: string[];
  @Column({ default: 'CLIENT' }) cible!: string; // CLIENT | B2B | TOUS
  @ManyToOne(() => Categorie, (cat) => cat.articles, { eager: true })
  categorie!: Categorie; // RG-01: article obligatoirement dans une catégorie
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}