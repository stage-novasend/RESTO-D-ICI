import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('b2b_bulk_orders')
export class BulkOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column()
  createdByUserId: string;

  @Column({ type: 'json' })
  items: Array<{
    articleId: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ length: 50, default: 'PENDING' })
  status: string; // PENDING, CONFIRMED, PROCESSING, DELIVERED, CANCELLED

  @Column({ type: 'text', nullable: true })
  deliveryAddress?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'timestamp', nullable: true })
  deliveryDateTime?: Date;

  @Column({ default: false })
  isRecurring: boolean;

  @Column({ type: 'text', nullable: true })
  recurrencePattern?: string; // DAILY, WEEKLY, MONTHLY

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
