// FIX: Use string enum for MSSQL compatibility
export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Order } from '../../order/entities/order.entity';
import { Reservation } from '../../reservation/entities/reservation.entity';
import { RoomBooking } from '../../room/entities/room-booking.entity';
import { Invoice } from './invoice.entity';

@Entity('payment')
@Index(['reference'])
@Index(['userId', 'createdAt'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', nullable: true, name: 'order_id' })
  orderId: string;

  @Column({ type: 'uuid', nullable: true, name: 'reservation_id' })
  reservationId: string;

  @Column({ type: 'uuid', nullable: true, name: 'room_booking_id' })
  roomBookingId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'NGN' })
  currency: string;

  // FIX: Change enum to varchar for MSSQL
  @Column({ type: 'varchar', length: 20, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 50, default: 'Paystack' })
  method: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  reference: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'access_code' })
  accessCode: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'authorization_url' })
  authorizationUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'gateway_response' })
  gatewayResponse: string;

  // FIX: Change simple-json to nvarchar for MSSQL
  @Column({ type: 'nvarchar', nullable: true })
  metadata: string;

  @Column({ type: 'datetime', nullable: true, name: 'paid_at' })
  paidAt: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  channel: string; // card, bank, ussd, etc.

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'ip_address' })
  ipAddress: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToOne(() => Order, (order) => order.payment)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @OneToOne(() => Reservation, (reservation) => reservation.payment)
  @JoinColumn({ name: 'reservation_id' })
  reservation: Reservation;

  @OneToOne(() => RoomBooking, (booking) => booking.payment)
  @JoinColumn({ name: 'room_booking_id' })
  roomBooking: RoomBooking;

  @OneToMany(() => Invoice, (invoice) => invoice.payment)
  invoices: Invoice[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}