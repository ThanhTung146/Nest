import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entity/user.entity';
import { Notification } from './notification.entity';

@Entity('notification_recipients')
@Index(['userId', 'notificationId'], { unique: true })
@Index(['userId', 'isRead'])
@Index(['userId', 'createdAt'])
export class NotificationRecipient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  userId: number;

  @Column()
  @Index()
  notificationId: number;

  @Column({ default: false })
  @Index()
  isRead: boolean;

  @Column({ nullable: true })
  readAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, user => user.notificationRecipients)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Notification, notification => notification.recipients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notificationId' })
  notification: Notification;
}
