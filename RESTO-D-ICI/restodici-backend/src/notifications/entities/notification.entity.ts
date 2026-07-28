import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Notification persistée, propre à un utilisateur.
 * Créée côté serveur lors des événements métier (commande, paiement…),
 * poussée en temps réel (WebSocket) et consultable via l'API REST.
 */
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Destinataire — indexé pour retrouver rapidement les notifs d'un user.
  @Index()
  @Column()
  userId!: string;

  // Type métier : commande.creee, commande.statut, commande.paiement, commande.remboursee, systeme…
  @Column()
  type!: string;

  @Column()
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  // Données contextuelles (id de commande, numéro, statut…) pour la navigation.
  @Column({ type: 'jsonb', nullable: true })
  data?: Record<string, any> | null;

  @Index()
  @Column({ default: false })
  read!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
