import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadsController } from './uploads.controller';
import { S3Service } from './s3.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MulterModule.register({ storage: memoryStorage() }), AuthModule],
  controllers: [UploadsController],
  providers: [S3Service],
  exports: [S3Service],
})
export class UploadsModule {}
