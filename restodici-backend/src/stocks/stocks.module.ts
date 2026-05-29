// src/stocks/stocks.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../menu/entities/article.entity';
import { Fournisseur } from '../fournisseurs/entities/fournisseur.entity';
import { StocksController } from './stocks.controller';
import { StocksService } from './stocks.service';
import { FournisseursModule } from '../fournisseurs/fournisseurs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article, Fournisseur]),
    FournisseursModule,
  ],
  controllers: [StocksController],
  providers: [StocksService],
  exports: [StocksService],
})
export class StocksModule {}
