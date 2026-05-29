import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaiementsController } from './paiements.controller';
import { PaiementsService } from './paiements.service';
import { Commande } from '../commandes/entities/commande.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommandesModule } from '../commandes/commandes.module';

@Module({
  imports: [TypeOrmModule.forFeature([Commande]), NotificationsModule, CommandesModule],
  controllers: [PaiementsController],
  providers: [PaiementsService],
  exports: [PaiementsService],
})
export class PaiementsModule {}
