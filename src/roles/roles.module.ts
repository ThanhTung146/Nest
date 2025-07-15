import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entity/roles.entity';
import { RolesService } from './roles.service';

@Module({
  imports: [TypeOrmModule.forFeature([Role])], // Add your Role entity here
  providers: [RolesService],
  exports: [RolesService],
  controllers: [RolesController]
})
export class RolesModule { }
