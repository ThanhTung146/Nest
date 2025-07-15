import { forwardRef, Module } from '@nestjs/common';
import { HomeworkService } from './homework.service';
import { HomeworkController } from './homework.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Homework } from './entities/homework.entity';
import { HomeworkAssignment } from './entities/homework-assigment.entity';
import { User } from 'src/users/entity/user.entity';
import { UsersModule } from 'src/users/users.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [TypeOrmModule.forFeature([Homework, HomeworkAssignment, User]),
  forwardRef(() => UsersModule),
    NotificationsModule,
    CloudinaryModule,],
  providers: [HomeworkService],
  controllers: [HomeworkController],
  exports: [HomeworkService] // Export HomeworkService if needed in other modules
})
export class HomeworkModule { }
