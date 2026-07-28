import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsService } from './sms.service';
import { FcmService } from './fcm.service';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { Integration } from '../common/entities/integration.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Integration, Notification])],
  controllers: [NotificationsController],
  providers: [SmsService, FcmService, NotificationsService],
  exports: [SmsService, FcmService, NotificationsService],
})
export class NotificationsModule {}
