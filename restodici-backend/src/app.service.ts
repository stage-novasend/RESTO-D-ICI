import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User, Role } from './auth/entities/user.entity';
import { Restaurant } from './restaurants/entities/restaurant.entity';
import { Commande } from './commandes/entities/commande.entity';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Restaurant) private restaurantRepo: Repository<Restaurant>,
    @InjectRepository(Commande) private commandeRepo: Repository<Commande>,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getPublicStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [clients, commandesMois, restaurants] = await Promise.all([
      this.userRepo.count({ where: { role: Role.CLIENT } }),
      this.commandeRepo.count({ where: { createdAt: Between(startOfMonth, now) } }),
      this.restaurantRepo.count({ where: { actif: true } }),
    ]);
    return { clients, commandesMois, restaurants };
  }
}
