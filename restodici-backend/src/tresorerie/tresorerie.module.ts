import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TresorerieController } from './tresorerie.controller';
import { TresorerieService } from './tresorerie.service';
import { Commande } from '../commandes/entities/commande.entity';
import { CommissionPlateforme } from '../commandes/entities/commission-plateforme.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Commande, CommissionPlateforme])],
  controllers: [TresorerieController],
  providers: [TresorerieService],
  exports: [TresorerieService],
})
export class TresorerieModule {}
