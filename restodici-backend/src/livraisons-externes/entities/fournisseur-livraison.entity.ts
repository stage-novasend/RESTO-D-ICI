import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum TypeFournisseurLivraison {
  YANGO    = 'YANGO',
  GOZEM    = 'GOZEM',
  KOOLI    = 'KOOLI',
  JUMIA_FOOD = 'JUMIA_FOOD',
  CUSTOM   = 'CUSTOM',
}

@Entity('fournisseurs_livraison')
export class FournisseurLivraison {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  nom!: string;

  @Column({ type: 'enum', enum: TypeFournisseurLivraison, default: TypeFournisseurLivraison.CUSTOM })
  type!: TypeFournisseurLivraison;

  @Column({ nullable: true })
  apiUrl?: string;

  @Column({ nullable: true, select: false })
  apiKey?: string;

  @Column({ nullable: true, select: false })
  webhookSecret?: string;

  // Endpoint de notre système à appeler pour les mises à jour de statut
  @Column({ nullable: true })
  webhookCallbackUrl?: string;

  // URL pour rechercher les livreurs disponibles (ex: Dobi, Gozem)
  @Column({ nullable: true })
  rechercheUrl?: string;

  // Frais de livraison par défaut en FCFA (0 = calculé dynamiquement par l'API)
  @Column({ type: 'int', default: 0 })
  fraisLivraisonDefaut!: number;

  @Column({ default: true })
  actif!: boolean;

  @Column({ nullable: true })
  restaurantId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
