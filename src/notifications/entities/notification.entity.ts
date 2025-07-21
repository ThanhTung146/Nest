import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { NotificationRecipient } from './notification-recipient.entity';

export enum NotificationType {
  HOMEWORK_ASSIGNED = 'homework_assigned',
  HOMEWORK_DUE = 'homework_due',
  HOMEWORK_GRADED = 'homework_graded',
  LESSON_CREATED = 'lesson_created',
  GROUP_INVITE = 'group_invite',
  ANNOUNCEMENT = 'announcement',
  SYSTEM = 'system'
}

export enum NotificationStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

@Entity('notifications')
@Index(['type', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM
  })
  type: NotificationType;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.SENT
  })
  status: NotificationStatus;

  @Column({ type: 'json', nullable: true })
  data: any; // Additional data (homework ID, group ID, etc.)

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  actionUrl: string; // URL to navigate when clicked

  @Column({ nullable: true })
  fcmMessageId: string; // FCM message ID for tracking

  @Column({ default: 0 })
  retryCount: number;

  @Column({ nullable: true })
  scheduledAt: Date; // For scheduled notifications

  @Column({ nullable: true })
  expiresAt: Date; // Auto-delete after this date

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => NotificationRecipient, recipient => recipient.notification)
  recipients: NotificationRecipient[];
}
