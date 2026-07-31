import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Integration } from '../../common/entities/integration.entity';
import { PaymentGatewayRegistry } from './payment-gateway.registry';

/**
 * Module dédié au registre des gateways de paiement, sans dépendance sur
 * CommandesModule — permet à CommandesModule ET PaiementsModule de
 * consommer PaymentGatewayRegistry (ex: payout au restaurant à la livraison)
 * sans créer de cycle CommandesModule ↔ PaiementsModule.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Integration])],
  providers: [PaymentGatewayRegistry],
  exports: [PaymentGatewayRegistry],
})
export class PaymentGatewaysModule {}
