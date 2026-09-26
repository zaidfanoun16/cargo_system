import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';

// What happened. The website writes the text in the user's language
// from the type and the data, so notifications work in Arabic and
// English.
export type NotificationType =
  // For customers
  | 'RESERVATION_CONFIRMED'
  | 'RESERVATION_CANCELLED'
  | 'RESERVATION_PICKED_UP'
  | 'RESERVATION_COMPLETED'
  | 'RESERVATION_NO_SHOW'
  | 'PICKUP_REMINDER'
  | 'BOOKING_BLOCKED'
  | 'BOOKING_ALLOWED'
  // For admins
  | 'NEW_RESERVATION'
  | 'CUSTOMER_CANCELLED'
  | 'CUSTOMER_RUNNING_LATE'
  | 'CUSTOMER_NO_SHOW';

// Details shown in the notification
export type NotificationData = {
  reservationId?: number;
  car?: {
    brand: string;
    brandAr: string | null;
    model: string;
    modelAr: string | null;
  };
  startDate?: Date;
  customer?: string;
  cancelledBy?: 'user' | 'admin' | 'system';
  lateCancellation?: boolean;
};

// A notification in the website's bell menu. Deleting the user removes
// their notifications too.
@Entity('notifications')
@Index(['userId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @Column({ type: 'varchar', length: 40 })
  type: NotificationType;

  @Column({ type: 'jsonb', default: {} })
  data: NotificationData;

  // Null until the user opens it
  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
