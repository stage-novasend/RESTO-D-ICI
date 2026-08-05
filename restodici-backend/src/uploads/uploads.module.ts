import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadsController } from './uploads.controller';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
    AuthModule,
    StorageModule,
  ],
  controllers: [UploadsController],
})
export class UploadsModule {}
