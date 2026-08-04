import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

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
    if (openingTime && closingTime) {
      const now = new Date();
      const [openH, openM] = openingTime.split(':').map(Number);
      const [closeH, closeM] = closingTime.split(':').map(Number);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const openMinutes = openH * 60 + openM;
      let closeMinutes = closeH * 60 + closeM;

      // Créneau traversant minuit (ex: 11:00–00:00, 18:00–02:00) : une heure de
      // fermeture numériquement avant l'heure d'ouverture ne signifie pas que
      // le restaurant est fermé toute la journée, mais qu'il ferme le
      // lendemain. Sans ce traitement, closingTime === '00:00' (très courant)
      // donnait closeMinutes = 0, et toute heure > 0 déclenchait "fermé" en
      // permanence, quelle que soit l'heure réelle.
      const overnight = closeMinutes <= openMinutes;
      if (overnight) closeMinutes += 24 * 60;
      const effectiveCurrent =
        overnight && currentMinutes < openMinutes
          ? currentMinutes + 24 * 60
          : currentMinutes;

      if (effectiveCurrent < openMinutes || effectiveCurrent > closeMinutes) {
        const msg = `Le restaurant est fermé. Horaires : ${openingTime}–${closingTime}`;
        throw new BadRequestException(msg);
      }
    }

    return true;
  }
}
