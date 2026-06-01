import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Commande } from '../commandes/entities/commande.entity';
import { TresorerieModule } from '../tresorerie/tresorerie.module';
import { EmailModule } from '../email/email.module';
import { StorageModule } from '../storage/storage.module';
import { ReceiptQueueProcessor } from './receipt-queue.processor';
import { RECEIPT_QUEUE } from './receipt-queue.constants';

export { RECEIPT_QUEUE };

@Module({
  imports: [
    BullModule.registerQueue({ name: RECEIPT_QUEUE }),
    TypeOrmModule.forFeature([Commande]),
    TresorerieModule,
    EmailModule,
    StorageModule,
  ],
  providers: [ReceiptQueueProcessor],
  exports: [BullModule],
})
export class ReceiptQueueModule {}
