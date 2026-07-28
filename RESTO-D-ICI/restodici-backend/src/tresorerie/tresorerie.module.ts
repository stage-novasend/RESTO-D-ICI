import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TresorerieController } from './tresorerie.controller';
import { TresorerieService } from './tresorerie.service';
import { Commande } from '../commandes/entities/commande.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Commande])],
  controllers: [TresorerieController],
  providers: [TresorerieService],
  exports: [TresorerieService],
})
export class TresorerieModule {}
