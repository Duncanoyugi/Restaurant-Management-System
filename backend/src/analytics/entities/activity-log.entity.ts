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
@Entity('activity_log')
@Index(['userId', 'timestamp'])
@Index(['entityType', 'entityId'])
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'varchar', length: 100, name: 'entity_type' })
  entityType: string;

  @Column({ type: 'varchar', length: 100, name: 'entity_id' })
  entityId: string;

  @Column({ type: 'simple-json', nullable: true, name: 'old_values' })
  oldValues: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true, name: 'new_values' })
  newValues: Record<string, any>;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'ip_address' })
  ipAddress: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'user_agent' })
  userAgent: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'datetime' })
  timestamp: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}