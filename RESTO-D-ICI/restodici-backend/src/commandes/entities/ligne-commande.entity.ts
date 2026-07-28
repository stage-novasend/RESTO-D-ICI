import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Commande } from './commande.entity';
import { Article } from '../../menu/entities/article.entity';

@Entity('lignes_commandes')
export class LigneCommande {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  quantite!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  prixUnitaire!: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  prixBase?: number;

  @Column({ nullable: true })
  instructions!: string; // Personnalisation (RG-05 / EN-1917)

  @Column({ nullable: true, type: 'varchar', length: 100 })
  variantLabel?: string;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  variantSupplement?: number;

  @ManyToOne(() => Commande, (commande) => commande.lignes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'commandeId' })
  commande!: Commande;

  @ManyToOne(() => Article)
  @JoinColumn({ name: 'articleId' })
  article!: Article;
}
