import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { RolesModule } from 'src/roles/roles.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]),
  forwardRef(() => RolesModule)], // Add your User entity here
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService] // Export UsersService if needed in other modules
})
export class UsersModule { }
