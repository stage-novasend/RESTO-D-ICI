import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaiementsController } from './paiements.controller';
import { PaiementsService } from './paiements.service';
import { Commande } from '../commandes/entities/commande.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommandesModule } from '../commandes/commandes.module';
import { EmailModule } from '../email/email.module';
import { TresorerieModule } from '../tresorerie/tresorerie.module';

@Module({
  imports: [TypeOrmModule.forFeature([Commande]), NotificationsModule, CommandesModule, EmailModule, TresorerieModule],
  controllers: [PaiementsController],
  providers: [PaiementsService],
  exports: [PaiementsService],
})
export class PaiementsModule {}
