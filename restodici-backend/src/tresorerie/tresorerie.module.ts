import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TresorerieController } from './tresorerie.controller';
import { TresorerieService } from './tresorerie.service';
import { Commande } from '../commandes/entities/commande.entity';
import { CommissionPlateforme } from '../commandes/entities/commission-plateforme.entity';
import { DepenseOperationnelle } from './entities/depense-operationnelle.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Commande,
      CommissionPlateforme,
      DepenseOperationnelle,
      Restaurant,
    ]),
  ],
  controllers: [TresorerieController],
  providers: [TresorerieService],
  exports: [TresorerieService],
})
export class TresorerieModule {}
