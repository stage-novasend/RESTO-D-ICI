import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum IntegrationType {
  REST_API = 'REST_API',
  WEBHOOK = 'WEBHOOK',
  PAYMENT = 'PAYMENT',
  SMS = 'SMS',
  PUSH_NOTIFICATION = 'PUSH_NOTIFICATION',
  EMAIL = 'EMAIL',
  STORAGE = 'STORAGE',
  ANALYTICS = 'ANALYTICS',
  DELIVERY = 'DELIVERY',
  MESSAGING = 'MESSAGING',
  CUSTOM = 'CUSTOM',
}

@Entity('integrations')
export class Integration {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({
    type: 'enum',
    enum: IntegrationType,
    default: IntegrationType.CUSTOM,
  })
  type!: IntegrationType;

  @Column({ nullable: true })
  baseUrl?: string;

  @Column({ nullable: true, type: 'text' })
  apiKey?: string; // stocké brut — masqué côté API

  @Column({ nullable: true, type: 'text' })
  webhookSecret?: string; // masqué côté API

  @Column({ type: 'json', nullable: true })
  customHeaders?: Record<string, string>;

  @Column({ default: false })
  enabled!: boolean;

  @Column({ nullable: true })
  createdBy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
