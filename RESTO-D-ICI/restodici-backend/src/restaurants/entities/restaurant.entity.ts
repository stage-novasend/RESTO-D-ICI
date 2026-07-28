import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Article } from '../../menu/entities/article.entity';

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

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  noteMoyenne!: number;

  @Column({ default: 0 })
  nbAvis!: number;

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
}
