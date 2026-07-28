import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Incident de disponibilité : période pendant laquelle le service a été
 * indisponible, détectée par une interruption des heartbeats.
 * Sert au calcul du vrai SLA (disponibilité = temps total − indisponibilité).
 */
@Entity('sla_incidents')
export class SlaIncident {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Début de l'indisponibilité (= dernier heartbeat connu avant le trou).
  @Index()
  @Column({ type: 'timestamptz' })
  startedAt!: Date;

  // Fin de l'indisponibilité (= redémarrage constaté).
  @Column({ type: 'timestamptz' })
  endedAt!: Date;

  @Column({ type: 'int' })
  durationSeconds!: number;

  @Column({ default: 'heartbeat-gap' })
  reason!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
