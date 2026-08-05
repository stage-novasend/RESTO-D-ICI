import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  CreateDateColumn,
  UpdateDateColumn,
  AfterLoad,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Article } from '../../menu/entities/article.entity';
import { isRestaurantOpenNow } from '../../common/utils/horaires.util';

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  nom!: string;

  @Column({ nullable: true })
  logo!: string;

  @Column()
  telephone!: string;

  @Column()
  adresse!: string;

  @Column({ nullable: true })
  description!: string;

  @Column({ nullable: true })
  email!: string;

  @Column({ nullable: true })
  nif?: string;

  @Column({ nullable: true })
  rccm?: string;

  @Column({ nullable: true })
  openingTime!: string;

  @Column({ nullable: true })
  closingTime!: string;

  @Column({ type: 'simple-json', nullable: true })
  deliveryZones!: Array<{
    nom: string;
    lat?: number | null;
    lng?: number | null;
  }> | null;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude!: number | null;

  @Column({ default: true })
  actif!: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 8 })
  tauxCommission!: number;

  @Column({ default: 'NOVASEND' })
  modeReceptionPaiement!: string; // 'NOVASEND' | 'MOBILE_MONEY' | 'BANCAIRE'

  @Column({ type: 'simple-json', nullable: true })
  modeReceptionDetails!: {
    operator?: string; // pour MOBILE_MONEY (WAVE, ORANGE, MTN, MOOV)
    telephone?: string; // pour MOBILE_MONEY
    nomBanque?: string; // pour BANCAIRE
    titulaireCompte?: string; // pour BANCAIRE
    ibanRib?: string; // pour BANCAIRE
    novasendAccountId?: string; // pour NOVASEND
  } | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  noteMoyenne!: number;

  @Column({ default: 0 })
  nbAvis!: number;

  /** Plafond budgétaire mensuel de dépenses opérationnelles (trésorerie), null = non configuré. */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  budgetPlafondMensuel!: number | null;

  @Column({ default: true })
  budgetAlerte80!: boolean;

  @Column({ default: true })
  budgetAlerte100!: boolean;

  @OneToMany(() => User, (user) => user.restaurant)
  users!: User[];

  @ManyToMany(() => User, (user) => user.favorites)
  favoritedBy?: User[];

  @OneToMany(() => Article, (article) => article.restaurant)
  articles!: Article[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  /**
   * Calculé à chaque chargement depuis openingTime/closingTime — jamais
   * persisté. Ne fonctionne que si ces deux colonnes font partie du
   * `select` de la requête (comportement TypeORM par défaut, sauf select
   * explicite partiel — vérifier au cas par cas). Seule source de vérité
   * pour "le restaurant est-il ouvert maintenant" côté client (audit ISO
   * 25010 — le front affichait un badge "Ouvert" fixe, jamais recalculé).
   */
  isOpen?: boolean;

  @AfterLoad()
  computeIsOpen() {
    this.isOpen = isRestaurantOpenNow(this.openingTime, this.closingTime);
  }
}
