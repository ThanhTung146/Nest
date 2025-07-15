import { forwardRef, Module } from '@nestjs/common';
import { DeviceTokenService } from './device-token.service';
import { DeviceTokenController } from './device-token.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceToken } from './entities/device-token.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeviceToken]),
    forwardRef(() => UsersModule)
  ],
  providers: [DeviceTokenService],
  controllers: [DeviceTokenController],
  exports: [DeviceTokenService],
})
export class DeviceTokenModule { }
