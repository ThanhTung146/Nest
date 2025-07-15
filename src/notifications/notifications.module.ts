import { Module } from '@nestjs/common';
import { FirebaseService } from './notification.service';
@Module({
    providers: [FirebaseService],
    exports: [FirebaseService],
})
export class NotificationsModule { }
