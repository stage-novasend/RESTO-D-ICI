import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Moyen de paiement proposé au client (Orange Money, Wave, Carte…).
 * Stocké en base plutôt que codé en dur : l'admin peut activer/désactiver
 * chaque moyen depuis son dashboard.
 */
@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Identifiant stable exposé au frontend (ex: 'orange_money', 'wave').
  @Column({ unique: true })
  code!: string;

  @Column()
  label!: string;

  // Provider technique passé à la gateway (ORANGE, MOMO, WAVE, CARTE…).
  @Column()
  provider!: string;

  // Gateway qui traite ce moyen (ex: 'novasend'). Le moyen n'est proposé que
  // si sa gateway est elle-même activée (config intégrations).
  @Column()
  gateway!: string;

  // Un numéro de téléphone est-il requis (mobile money) ?
  @Column({ default: false })
  needsPhone!: boolean;

  // Activation par l'admin. Un moyen désactivé n'apparaît plus au checkout.
  @Column({ default: true })
  enabled!: boolean;

  // Ordre d'affichage.
  @Column({ type: 'int', default: 0 })
  ordre!: number;

  @UpdateDateColumn()
  updatedAt!: Date;
}
