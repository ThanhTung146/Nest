import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GroupsModule } from './groups/groups.module';
import { LessonsModule } from './lessons/lessons.module';
import { DeviceTokenModule } from './device-token/device-token.module';
import { AwsS3Module } from './aws-s3/aws-s3.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { RolesService } from './roles/roles.service';
import { HomeworkModule } from './homework/homework.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: true, // Set to false in production
    }),
    UsersModule,
    AuthModule,
    RolesModule,
    NotificationsModule,
    GroupsModule,
    LessonsModule,
    DeviceTokenModule,
    AwsS3Module,
    CloudinaryModule,
    HomeworkModule,
  ],
  controllers: [AppController],
  providers: [AppService], // ❌ XÓA AuthService, JwtService khỏi đây
})
export class AppModule implements OnModuleInit {
  constructor(private readonly rolesService: RolesService) {}

  async onModuleInit() {
    await this.rolesService.seedRoles();
  }
}
