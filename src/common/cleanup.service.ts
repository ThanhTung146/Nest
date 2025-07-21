import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RefreshTokenService } from '../auth/refresh-token.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CleanupService {
    constructor(
        private refreshTokenService: RefreshTokenService,
        private notificationsService: NotificationsService,
    ) {}

    // Chạy mỗi ngày lúc 2:00 AM để cleanup expired tokens
    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async cleanupExpiredTokens() {
        console.log('🧹 Starting cleanup of expired refresh tokens...');
        
        try {
            const result = await this.refreshTokenService.cleanupExpiredTokens();
            console.log(`✅ Cleaned up ${result.deletedCount} expired refresh tokens`);
        } catch (error) {
            console.error('❌ Error cleaning up refresh tokens:', error);
        }
    }

    // Chạy mỗi ngày lúc 3:00 AM để cleanup expired notifications
    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    async cleanupExpiredNotifications() {
        console.log('🧹 Starting cleanup of expired notifications...');
        
        try {
            const result = await this.notificationsService.cleanupExpiredNotifications();
            console.log(`✅ Cleaned up ${result.deletedCount} expired notifications`);
        } catch (error) {
            console.error('❌ Error cleaning up notifications:', error);
        }
    }

    // Manual cleanup method (có thể gọi từ admin endpoint)
    async manualCleanup(): Promise<{
        refreshTokens: { deletedCount: number };
        notifications: { deletedCount: number };
    }> {
        console.log('🧹 Manual cleanup started...');
        
        const refreshTokens = await this.refreshTokenService.cleanupExpiredTokens();
        const notifications = await this.notificationsService.cleanupExpiredNotifications();
        
        console.log(`✅ Manual cleanup completed - Tokens: ${refreshTokens.deletedCount}, Notifications: ${notifications.deletedCount}`);
        
        return { refreshTokens, notifications };
    }
}
