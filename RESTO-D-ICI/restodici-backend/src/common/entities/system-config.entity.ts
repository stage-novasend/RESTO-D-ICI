import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('system_configs')
export class SystemConfig {
  @PrimaryColumn()
  key!: string;

  @Column({ type: 'text', nullable: true })
  value!: string | null;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: 'system' })
  category!: string; // 'security' | 'integration' | 'system'

  @Column({ nullable: true })
  updatedBy?: string;

  @UpdateDateColumn()
  updatedAt!: Date;
}
