import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { Article } from './article.entity';

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

  @Column({ nullable: true })
  couleur!: string; // Ex: '#FF6B35' pour la palette Savane Moderne

  @Column({ default: true })
  actif!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => Article, article => article.categorie)
  articles!: Article[];
}