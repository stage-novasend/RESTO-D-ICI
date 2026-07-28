import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CommandeGroupeeB2B } from './commande-groupee-b2b.entity';
import { CollaborateurB2B } from './collaborateur-b2b.entity';

@Entity('lignes_commandes_groupes_b2b')
export class LigneCommandeGroupeeB2B {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CommandeGroupeeB2B, (commande) => commande.lignes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'commandeGroupeeId' })
  commandeGroupee!: CommandeGroupeeB2B;

  // Référence plat/article (on réutilise l'id Article existant côté menu)
  @Column()
  articleId!: string;

  @Column('int')
  quantite!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  prixUnitaire!: number;

  @ManyToOne(() => CollaborateurB2B, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collaborateurB2BId' })
  collaborateur!: CollaborateurB2B;

  @Column({ nullable: true })
  instructions?: string;
}
