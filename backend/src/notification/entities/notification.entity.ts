// FIX: Use string enums for MSSQL compatibility
export enum NotificationType {
  EMAIL = 'Email',
  SMS = 'SMS',
  IN_APP = 'In-App',
  PUSH = 'Push',
}

export enum NotificationStatus {
  SENT = 'Sent',
  PENDING = 'Pending',
  FAILED = 'Failed',
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('notification')
@Index(['userId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  // FIX: Change enum to varchar for MSSQL
  @Column({ type: 'varchar', length: 20 })
  type: NotificationType;

  // FIX: Change enum to varchar for MSSQL
  @Column({ type: 'varchar', length: 20, default: NotificationStatus.PENDING })
  status: NotificationStatus;

  // FIX: Change boolean to bit for MSSQL
  @Column({ type: 'bit', default: 0 })
  read: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string; // order, reservation, payment, etc.

  // FIX: Change simple-json to nvarchar for MSSQL
  @Column({ type: 'nvarchar', nullable: true })
  data: string;

  @Column({ type: 'datetime', nullable: true, name: 'read_at' })
  readAt: Date;

  @Column({ type: 'datetime', nullable: true, name: 'sent_at' })
  sentAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}