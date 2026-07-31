import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaiementsController } from './paiements.controller';
import { PaiementsService } from './paiements.service';
import { NovaSendService } from './novasend.service';
import { PaymentGatewaysModule } from './gateways/payment-gateways.module';
import { PaymentLockService } from './payment-lock.service';
import { Commande } from '../commandes/entities/commande.entity';
import { FactureMensuelleB2B } from '../b2b/entities/facture-mensuelle-b2b.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { Payment } from './entities/payment.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommandesModule } from '../commandes/commandes.module';
import { ReceiptQueueModule } from '../receipt-queue/receipt-queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Commande,
      FactureMensuelleB2B,
      PaymentMethod,
      Payment,
    ]),
    NotificationsModule,
    CommandesModule,
    ReceiptQueueModule,
    PaymentGatewaysModule,
  ],
  controllers: [PaiementsController],
  providers: [
    PaiementsService,
    NovaSendService,
    PaymentLockService,
  ],
  exports: [PaiementsService, NovaSendService, PaymentGatewaysModule],
})
export class PaiementsModule {}
