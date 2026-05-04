import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) email!: string;
  @Column() password!: string;
  @Column() nom!: string;
  @Column({ nullable: true }) telephone!: string;
  @Column({ default: 'CLIENT' }) role!: string;
  @Column({ default: true }) actif!: boolean;
  @CreateDateColumn() createdAt!: Date;
}