import { IsOptional, IsBoolean, IsEnum, IsDateString } from 'class-validator';
import { NotificationType, NotificationStatus } from '../entities/notification.entity';

export class UpdateNotificationDto {
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @IsEnum(NotificationStatus)
  @IsOptional()
  status?: NotificationStatus;

  @IsDateString()
  @IsOptional()
  readAt?: Date;
}
