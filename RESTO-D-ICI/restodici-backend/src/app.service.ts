import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User, Role } from './auth/entities/user.entity';
import { Restaurant } from './restaurants/entities/restaurant.entity';
import { Commande } from './commandes/entities/commande.entity';
import { SystemConfig } from './common/entities/system-config.entity';

const BANNER_DEFAULTS = [
  'Commandez chez vos restaurants préférés',
  'Livraison rapide dans toute la ville',
  'Paiement mobile sécurisé',
];

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Restaurant) private restaurantRepo: Repository<Restaurant>,
    @InjectRepository(Commande) private commandeRepo: Repository<Commande>,
    @InjectRepository(SystemConfig) private configRepo: Repository<SystemConfig>,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getBannerMessages(): Promise<{ messages: string[] }> {
    const config = await this.configRepo.findOne({ where: { key: 'banner_messages' } });
    if (!config?.value) return { messages: BANNER_DEFAULTS };
    try {
      const parsed = JSON.parse(config.value);
      const messages = Array.isArray(parsed) && parsed.length > 0 ? parsed : BANNER_DEFAULTS;
      return { messages };
    } catch {
      return { messages: BANNER_DEFAULTS };
    }
  }

  async getClientModules(): Promise<{
    delivery:  { enabled: boolean; provider: string | null; apiUrl: string | null };
    messaging: { enabled: boolean; provider: string | null; apiUrl: string | null };
  }> {
    const keys = ['delivery_enabled', 'delivery_provider', 'delivery_api_url', 'messaging_enabled', 'messaging_provider', 'messaging_api_url'];
    const configs = await this.configRepo.find({ where: keys.map(key => ({ key })) });
    const get = (k: string) => configs.find(c => c.key === k)?.value ?? null;
    return {
      delivery:  { enabled: get('delivery_enabled')  === 'true', provider: get('delivery_provider'),  apiUrl: get('delivery_api_url')  },
      messaging: { enabled: get('messaging_enabled') === 'true', provider: get('messaging_provider'), apiUrl: get('messaging_api_url') },
    };
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
