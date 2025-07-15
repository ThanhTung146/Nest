import { Module } from '@nestjs/common';
import { AwsS3Service } from './aws-s3.service';
import { AwsS3Controller } from './aws-s3.controller';

@Module({
  providers: [AwsS3Service],
  controllers: [AwsS3Controller]
})
export class AwsS3Module {}
