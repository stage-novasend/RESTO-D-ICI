// src/restaurants/restaurants.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant } from './entities/restaurant.entity';
import { User } from '../auth/entities/user.entity';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';
import { CommandesModule } from '../commandes/commandes.module';

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant, User]), CommandesModule],
  controllers: [RestaurantsController],
  providers: [RestaurantsService],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
