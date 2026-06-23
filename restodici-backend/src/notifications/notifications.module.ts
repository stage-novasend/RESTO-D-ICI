import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsService } from './sms.service';
import { FcmService } from './fcm.service';
import { Integration } from '../common/entities/integration.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Integration])],
  providers: [SmsService, FcmService],
  exports: [SmsService, FcmService],
})
export class NotificationsModule {}
