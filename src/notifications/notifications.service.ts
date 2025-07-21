import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Notification, NotificationType, NotificationStatus } from './entities/notification.entity';
import { NotificationRecipient } from './entities/notification-recipient.entity';
import { DeviceTokenService } from '../device-token/device-token.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateSingleNotificationDto } from './dto/create-single-notification.dto';
import * as admin from 'firebase-admin';
import * as path from 'path';

// Firebase Admin initialization với đường dẫn tuyệt đối
const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationRecipient)
    private recipientRepository: Repository<NotificationRecipient>,
    private deviceTokenService: DeviceTokenService,
  ) {
    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      try {
        // Thử đọc service account file
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log('✅ Firebase Admin initialized successfully with service account file');
      } catch (error) {
        console.error('❌ Firebase Admin initialization error:', error);
        
        // Fallback to environment variables
        try {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID || 'online-learning-f9d31',
              privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            }),
          });
        } catch (envError) {
          console.error('❌ Firebase Admin env initialization error:', envError);
        }
      }
    }
  }

  // Tạo và gửi thông báo cho nhiều users (OPTIMIZED)
  async createAndSendToMultiple(
    userIds: number[], 
    notificationData: {
      type?: NotificationType;
      title: string;
      body: string;
      data?: any;
      imageUrl?: string;
      actionUrl?: string;
      scheduledAt?: Date;
    }
  ): Promise<{ notification: Notification, recipients: NotificationRecipient[] }> {
    // Tạo 1 notification duy nhất
    const notification = this.notificationRepository.create({
      ...notificationData,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // Tạo nhiều recipients cho notification này
    const recipients = userIds.map(userId => 
      this.recipientRepository.create({
        userId,
        notificationId: savedNotification.id,
        isRead: false,
      })
    );

    const savedRecipients = await this.recipientRepository.save(recipients);

    // Gửi FCM notification
    try {
      await this.sendFCMToUsers(userIds, savedNotification);
      savedNotification.status = NotificationStatus.DELIVERED;
    } catch (error) {
      console.error('Failed to send FCM notification:', error);
      savedNotification.status = NotificationStatus.FAILED;
    }

    await this.notificationRepository.save(savedNotification);

    return { notification: savedNotification, recipients: savedRecipients };
  }

  // Tạo và gửi thông báo cho 1 user
  async createAndSend(createDto: CreateSingleNotificationDto): Promise<{ notification: Notification, recipient: NotificationRecipient }> {

    // Tạo notification
    const notification = this.notificationRepository.create({
      type: createDto.type,
      title: createDto.title,
      body: createDto.body,
      data: createDto.data,
      imageUrl: createDto.imageUrl,
      actionUrl: createDto.actionUrl,
      scheduledAt: createDto.scheduledAt,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // Tạo recipient
    const recipient = this.recipientRepository.create({
      userId: createDto.userId,
      notificationId: savedNotification.id,
      isRead: false,
    });

    const savedRecipient = await this.recipientRepository.save(recipient);

    // Gửi FCM
    try {
      await this.sendFCMToUsers([createDto.userId], savedNotification);
      savedNotification.status = NotificationStatus.DELIVERED;
    } catch (error) {
      console.error('Failed to send FCM notification:', error);
      savedNotification.status = NotificationStatus.FAILED;
    }

    await this.notificationRepository.save(savedNotification);

    return { notification: savedNotification, recipient: savedRecipient };
  }

  // FCM Methods
  async sendNotificationToToken(tokens: string[], title: string, body: string, data?: any) {

    try {
      // Filter out mock tokens
      const realTokens = tokens.filter(token => 
        token && 
        token !== 'mock-token-1' && 
        token !== 'mock-token-2' && 
        token !== 'mock-token-3' &&
        token.length > 50
      );

      if (realTokens.length === 0) {
        return {
          successCount: 0,
          failureCount: tokens.length,
          responses: tokens.map(token => ({
            success: false,
            error: { code: 'invalid-token', message: 'Mock token detected' }
          }))
        };
      }

      const message = {
        notification: { title, body },
        tokens: realTokens,
        data: data || {},
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      return response;
    } catch (error) {
      console.error('Firebase send error:', error);
      throw error;
    }
  }

  // Gửi FCM cho nhiều users
  private async sendFCMToUsers(userIds: number[], notification: Notification): Promise<void> {

    // Lấy tất cả tokens của users
    const allTokens = await Promise.all(
      userIds.map(userId => this.deviceTokenService.getUserTokens(userId))
    );

    const tokens = allTokens.flat().filter(token => token);

    if (tokens.length === 0) {
      console.log('No FCM tokens found for users');
      return;
    }

    await this.sendNotificationToToken(
      tokens,
      notification.title,
      notification.body,
      notification.data
    );
  }

  // Lấy thông báo của user (WITH SECURITY CHECK)
  async getUserNotifications(
    userId: number, 
    page: number = 1, 
    limit: number = 20
  ): Promise<{ notifications: any[], total: number, unreadCount: number }> {
    // JOIN với recipients để chỉ lấy notifications của user này
    const [recipients, total] = await this.recipientRepository.findAndCount({
      where: { userId },
      relations: ['notification'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const notifications = recipients.map(recipient => ({
      id: recipient.notification.id,
      title: recipient.notification.title,
      body: recipient.notification.body,
      type: recipient.notification.type,
      data: recipient.notification.data,
      imageUrl: recipient.notification.imageUrl,
      actionUrl: recipient.notification.actionUrl,
      isRead: recipient.isRead,
      readAt: recipient.readAt,
      createdAt: recipient.notification.createdAt,
    }));

    const unreadCount = await this.recipientRepository.count({
      where: { userId, isRead: false },
    });

    return { notifications, total, unreadCount };
  }

  // Đánh dấu đã đọc (WITH SECURITY CHECK)
  async markAsRead(userId: number, notificationId: number): Promise<void> {
    const recipient = await this.recipientRepository.findOne({
      where: { userId, notificationId },
    });

    if (!recipient) {
      throw new NotFoundException('Notification not found for this user');
    }

    if (!recipient.isRead) {
      recipient.isRead = true;
      recipient.readAt = new Date();
      await this.recipientRepository.save(recipient);
    }
  }

  // Đánh dấu tất cả đã đọc (WITH SECURITY CHECK)
  async markAllAsRead(userId: number): Promise<void> {
    await this.recipientRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }

  // Xóa thông báo (WITH SECURITY CHECK)
  async deleteNotification(userId: number, notificationId: number): Promise<void> {
    const result = await this.recipientRepository.delete({
      userId,
      notificationId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Notification not found for this user');
    }
  }

  // Thống kê thông báo
  async getNotificationStats(userId: number): Promise<{
    total: number;
    unread: number;
    read: number;
    byType: Record<NotificationType, number>;
  }> {
    const total = await this.recipientRepository.count({ where: { userId } });
    const unread = await this.recipientRepository.count({ 
      where: { userId, isRead: false } 
    });
    const read = total - unread;

    // Thống kê theo loại
    const byTypeQuery = await this.recipientRepository
      .createQueryBuilder('recipient')
      .leftJoin('recipient.notification', 'notification')
      .select('notification.type, COUNT(*) as count')
      .where('recipient.userId = :userId', { userId })
      .groupBy('notification.type')
      .getRawMany();

    const byType = byTypeQuery.reduce((acc, item) => {
      acc[item.notification_type] = parseInt(item.count);
      return acc;
    }, {} as Record<NotificationType, number>);

    return { total, unread, read, byType };
  }

  // Manual cleanup method
  async cleanupExpiredNotifications(): Promise<{ deletedCount: number }> {
    
    const result = await this.notificationRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    return { deletedCount: result.affected || 0 };
  }
}
