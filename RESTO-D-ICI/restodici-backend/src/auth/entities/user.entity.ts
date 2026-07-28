import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

//  Exporter l'enum pour qu'il soit utilisable ailleurs
export enum Role {
  ADMIN = 'ADMIN',
  GERANT = 'GERANT',
  STAFF = 'STAFF',
  CLIENT = 'CLIENT',
  B2B = 'B2B',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  nom!: string;

  @Column({ nullable: true })
  prenom!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ nullable: true })
  telephone!: string;

  //  Rôle avec enum exporté
  @Column({ type: 'enum', enum: Role, default: Role.CLIENT })
  role!: Role;

  @Column({ default: true })
  actif!: boolean;

  // Email verification fields
  @Column({ default: false })
  emailVerified!: boolean;

  @Column({ nullable: true })
  emailVerificationToken?: string;

  @Column({ nullable: true })
  emailVerificationExpires?: Date;

  // 2FA fields
  @Column({ default: false })
  twoFactorEnabled!: boolean;

  @Column({ nullable: true })
  twoFactorSecret?: string;

  @Column({ nullable: true, type: 'json' })
  twoFactorBackupCodes?: string[];

  @Column({ nullable: true })
  twoFactorTempToken?: string;

  @Column({ nullable: true })
  twoFactorTempTokenExpires?: Date;

  // 🔗 NOUVEAU : Lien vers le restaurant (pour GERANT et STAFF)
  @ManyToOne(() => Restaurant, (restaurant) => restaurant.users, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  restaurant?: Restaurant;
  // 🔗 FAVORIS : Restaurants favoris du client (remplace abonnement)
  @ManyToMany(() => Restaurant, { cascade: true, onDelete: 'CASCADE' })
  @JoinTable({
    name: 'user_favorites',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'restaurantId', referencedColumnName: 'id' },
  })
  favorites?: Restaurant[];
  @Column({ nullable: true, type: 'json' })
  adressesSauvegardees?: Array<{
    id: string;
    label: string;
    adresse: string;
    lat?: number;
    lng?: number;
    type: 'home' | 'work' | 'other';
    isDefault: boolean;
  }>;

  @Column({ nullable: true })
  refreshToken?: string;

  // [PERF/SÉCURITÉ] Identifiant de session non haché, indexé → lookup direct O(1) (audit §3.4)
  @Column({ nullable: true, unique: true })
  @Index()
  refreshTokenId?: string;

  @Column({ nullable: true })
  refreshTokenExpires?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
