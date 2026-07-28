import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FournisseurLivraison } from './entities/fournisseur-livraison.entity';
import { LivraisonExterne } from './entities/livraison-externe.entity';
import { LivraisonsExternesService } from './livraisons-externes.service';
import { LivraisonsExternesController } from './livraisons-externes.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([FournisseurLivraison, LivraisonExterne]),
  ],
  providers: [LivraisonsExternesService],
  controllers: [LivraisonsExternesController],
  exports: [LivraisonsExternesService],
})
export class LivraisonsExternesModule {}
