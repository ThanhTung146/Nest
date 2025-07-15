import { forwardRef, Module } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { LessonsController } from './lessons.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lesson } from './entities/lesson.entity';
import { UsersModule } from 'src/users/users.module';
import { GroupsModule } from 'src/groups/groups.module';
import { User } from 'src/users/entity/user.entity';
import { Group } from 'src/groups/entities/group.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { MulterModule } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Module({
  imports: [TypeOrmModule.forFeature([Lesson, User, Group]),
  MulterModule.register({
    storage: require('multer').memoryStorage(), // Use memory storage for file uploads
  }),
  forwardRef(() => UsersModule), // Use forwardRef to avoid circular dependency issues
    NotificationsModule,
  forwardRef(() => GroupsModule),], // Use forwardRef to avoid circular dependency issues with GroupsModule
  providers: [LessonsService, CloudinaryService], // Ensure CloudinaryService is provided if used in LessonsService
  controllers: [LessonsController],
  exports: [LessonsService] // Export LessonsService if needed in other modules
})
export class LessonsModule { }
