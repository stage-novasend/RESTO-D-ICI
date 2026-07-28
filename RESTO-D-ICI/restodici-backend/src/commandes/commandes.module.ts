import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommandesController } from './commandes.controller';
import { CommandesService } from './commandes.service';
import { CommandesGateway } from './commandes.gateway';
import { Commande } from './entities/commande.entity';
import { LigneCommande } from './entities/ligne-commande.entity';
import { AvisCommande } from './entities/avis-commande.entity';
import { CommandeStatusHistory } from './entities/commande-status-history.entity';
import { CommissionPlateforme } from './entities/commission-plateforme.entity';
import { Article } from '../menu/entities/article.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { AuthModule } from '../auth/auth.module';
import { MenuModule } from '../menu/menu.module';
import { TresorerieModule } from '../tresorerie/tresorerie.module';
import { PromosModule } from '../promos/promos.module';
import { User } from '../auth/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { HorairesGuard } from './guards/horaires.guard';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Commande,
      LigneCommande,
      AvisCommande,
      CommandeStatusHistory,
      CommissionPlateforme,
      Article,
      Restaurant,
      User,
    ]),
    AuthModule,
    MenuModule,
    TresorerieModule,
    PromosModule,
    NotificationsModule,
    StorageModule,
  ],
  controllers: [CommandesController],
  providers: [CommandesService, CommandesGateway, HorairesGuard],
  exports: [CommandesService, CommandesGateway],
})
export class CommandesModule {}
