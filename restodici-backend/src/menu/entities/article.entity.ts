import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Categorie } from './categorie.entity';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  nom!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  prix!: number;

  @Column({ nullable: true })
  photoUrl!: string;

  @Column({ default: true })
  disponible!: boolean; // RG-02: synchronisation < 30s

  @Column({ default: 0 })
  stock!: number; // Pour RG-03: rupture auto si stock = 0

  @Column('simple-array', { nullable: true })
  allergenes!: string[]; // Ex: ['gluten', 'lait', 'arachides']

  @Column({ default: 'CLIENT' })
  cible!: string; // 'CLIENT', 'B2B', 'TOUS'

  @ManyToOne(() => Categorie, categorie => categorie.articles, { eager: true })
  categorie!: Categorie;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Méthode utilitaire pour calculer la marge brute (RG-28)
  calculerMargeBrute(coutIngredients: number): number {
    if (this.prix <= 0) return 0;
    return ((this.prix - coutIngredients) / this.prix) * 100;
  }
}