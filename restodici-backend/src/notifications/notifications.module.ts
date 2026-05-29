import { Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { FcmService } from './fcm.service';

@Module({
  providers: [SmsService, FcmService],
  exports: [SmsService, FcmService],
})
export class NotificationsModule {}
