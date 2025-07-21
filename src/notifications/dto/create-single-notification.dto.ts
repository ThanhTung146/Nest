import { IsNotEmpty, IsString, IsOptional, IsEnum, IsObject, IsUrl, IsDateString, IsNumber } from 'class-validator';
import { NotificationType } from '../entities/notification.entity';

export class CreateSingleNotificationDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType = NotificationType.SYSTEM;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsObject()
  @IsOptional()
  data?: any;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsUrl()
  @IsOptional()
  actionUrl?: string;

  @IsDateString()
  @IsOptional()
  scheduledAt?: Date;
}
