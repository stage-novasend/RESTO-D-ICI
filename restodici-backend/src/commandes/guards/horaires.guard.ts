import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { isRestaurantOpenNow } from '../../common/utils/horaires.util';

@Injectable()
export class HorairesGuard implements CanActivate {
  constructor(
    @InjectRepository(Restaurant)
    private restaurantRepo: Repository<Restaurant>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    // Staff and gerant always bypass hours check — they operate inside the restaurant
    const role = req.user?.role;
    if (role === 'STAFF' || role === 'GERANT') return true;
    const restaurantId = req.body?.restaurantId;
    if (!restaurantId) return true; // laisse les autres guards gérer

    const restaurant = await this.restaurantRepo.findOne({
      where: { id: restaurantId },
    });
    if (!restaurant) return true;

    // Vérifier horaires d'ouverture si configurés
    const { openingTime, closingTime } = restaurant;
    if (!isRestaurantOpenNow(openingTime, closingTime)) {
      throw new BadRequestException(
        `Le restaurant est fermé. Horaires : ${openingTime}–${closingTime}`,
      );
    }

    return true;
  }
}
