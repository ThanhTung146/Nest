import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    Patch,
    Delete,
    UseGuards,
    Request
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateSingleNotificationDto } from './dto/create-single-notification.dto';
import { GetNotificationsDto } from './dto/get-notifications.dto';
import { NotificationType } from './entities/notification.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    // Send single notification (Admin/Teacher)
    @Post('send')
    async sendNotification(@Body() createNotificationDto: CreateSingleNotificationDto) {
        return this.notificationsService.createAndSend(createNotificationDto);
    }

    // Send to multiple users (Admin/Teacher)
    @Post('send-multiple')
    async sendToMultiple(@Body() createNotificationDto: CreateNotificationDto) {
        const { userIds, ...notificationData } = createNotificationDto;
        return this.notificationsService.createAndSendToMultiple(userIds, notificationData);
    }

    // Get notifications for current user
    @Get()
    async getMyNotifications(
        @Request() req,
        @Query() query: GetNotificationsDto
    ) {
        const userId = req.user.id;
        return this.notificationsService.getUserNotifications(
            userId,
            query.page,
            query.limit
        );
    }

    // Get Stats
    @Get('stats')
    async getNotificationStats(@Request() req) {
        const userId = req.user.id;
        return this.notificationsService.getNotificationStats(userId);
    }

    // Mark notification as read
    @Patch(':id/read')
    async markAsRead(@Request() req, @Param('id') id: number) {
        const userId = req.user.id;
        await this.notificationsService.markAsRead(userId, id);
        return { message: 'Notification marked as read' };
    }

    // Mark all notifications as read
    @Patch('read-all')
    async markAllAsRead(@Request() req) {
        const userId = req.user.id;
        await this.notificationsService.markAllAsRead(userId);
        return { message: 'All notifications marked as read' };
    }

    // Delete a notification
    @Delete(':id')
    async deleteNotification(@Request() req, @Param('id') id: number) {
        const userId = req.user.id;
        await this.notificationsService.deleteNotification(userId, id);
        return { message: 'Notification deleted' };
    }

    // Cleanup (Admin only)
    @Post('cleanup')
    async cleanup() {
        return this.notificationsService.cleanupExpiredNotifications();
    }

    // Debug endpoint (Admin only)
    @Post('debug/send-test')
    async sendTestNotification(@Request() req, @Body() body: { targetUserId: number }) {
        try {
            const result = await this.notificationsService.createAndSend({
                userId: body.targetUserId,
                type: NotificationType.SYSTEM,
                title: 'Test Notification',
                body: 'This is a test notification from debug endpoint',
                data: {
                    test: true,
                    timestamp: new Date().toISOString()
                }
            });

            return {
                success: true,
                message: 'Test notification sent',
                notification: result
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}
