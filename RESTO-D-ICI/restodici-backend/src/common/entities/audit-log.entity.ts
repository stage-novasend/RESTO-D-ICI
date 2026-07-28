import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column({ nullable: true })
  restaurantId?: string;

  @Column()
  action!: string;

  @Column({ type: 'json', nullable: true })
  payload?: any;

  @CreateDateColumn()
  createdAt!: Date;
}
