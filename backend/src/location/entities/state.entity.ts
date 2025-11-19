import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { City } from './city.entity';

@Entity('state')
export class State {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 10 })
  code: string;

  @OneToMany(() => City, (city) => city.state)
  cities: City[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}