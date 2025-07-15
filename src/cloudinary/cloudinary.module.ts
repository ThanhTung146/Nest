import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService] // Export CloudinaryService if needed in other modules
})
export class CloudinaryModule { }
