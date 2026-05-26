import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from './entities/restaurant.entity';
import { User } from '../auth/entities/user.entity';
import { Role } from '../auth/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { CommandesGateway } from '../commandes/commandes.gateway';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant)
    private restaurantRepo: Repository<Restaurant>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private commandesGateway: CommandesGateway,
  ) {}

  private normalizeDeliveryZones(zones?: unknown) {
    if (!Array.isArray(zones)) return [];

    return zones
      .map((zone) => {
        if (typeof zone === 'string') {
          const trimmed = zone.trim();
          return trimmed ? { nom: trimmed, lat: null, lng: null } : null;
        }

        if (zone && typeof zone === 'object') {
          const record = zone as Record<string, unknown>;
          const rawNom =
            typeof record.nom === 'string'
              ? record.nom
              : typeof record.name === 'string'
                ? record.name
                : '';
          const nom = rawNom.trim();
          if (!nom) return null;
          const lat = Number(record.lat);
          const lng = Number(record.lng);
          return {
            nom,
            lat: Number.isFinite(lat) ? lat : null,
            lng: Number.isFinite(lng) ? lng : null,
          };
        }

        return null;
      })
      .filter(
        (
          zone,
        ): zone is { nom: string; lat: number | null; lng: number | null } =>
          zone !== null,
      );
  }

  async getAllActive(zone?: string, categorie?: string): Promise<Restaurant[]> {
    const query = this.restaurantRepo
      .createQueryBuilder('restaurant')
      .leftJoinAndSelect('restaurant.articles', 'articles')
      .leftJoinAndSelect('articles.categorie', 'categorie')
      .where('restaurant.actif = :actif', { actif: true });

    if (zone) {
      query.andWhere('restaurant.zone ILIKE :zone', { zone: `%${zone}%` });
    }
    if (categorie) {
      query.andWhere('restaurant.categorie ILIKE :categorie', {
        categorie: `%${categorie}%`,
      });
    }

    return query.getMany();
  }

  async getById(id: string): Promise<Restaurant> {
    const restaurant = await this.restaurantRepo.findOne({
      where: { id },
      relations: ['articles', 'articles.categorie'],
    });
    if (!restaurant) {
      throw new NotFoundException(`Restaurant avec ID ${id} non trouvé`);
    }
    return restaurant;
  }

  async updateRestaurant(
    restaurantId: string,
    updateData: any,
    requester?: { role?: string; restaurant?: { id?: string } },
  ) {
    const restaurant = await this.restaurantRepo.findOne({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant non trouvé');
    }

    if (
      requester?.role === 'GERANT' &&
      requester.restaurant?.id &&
      requester.restaurant.id !== restaurantId
    ) {
      throw new ForbiddenException(
        'Access denied: Gérant can only update their own restaurant',
      );
    }

    const allowedFields = [
      'nom',
      'logo',
      'telephone',
      'adresse',
      'description',
      'email',
      'openingTime',
      'closingTime',
      'latitude',
      'longitude',
    ] as const;

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        (restaurant as any)[field] = updateData[field];
      }
    }

    if (updateData.deliveryZones !== undefined) {
      restaurant.deliveryZones = this.normalizeDeliveryZones(
        updateData.deliveryZones,
      );
    }

    const savedRestaurant = await this.restaurantRepo.save(restaurant);
    const hydratedRestaurant = await this.getById(savedRestaurant.id);

    this.commandesGateway.emitToKitchen(
      hydratedRestaurant.id,
      'restaurant.profile.updated',
      {
        id: hydratedRestaurant.id,
        nom: hydratedRestaurant.nom,
        logo: hydratedRestaurant.logo,
        telephone: hydratedRestaurant.telephone,
        adresse: hydratedRestaurant.adresse,
        description: hydratedRestaurant.description,
        email: hydratedRestaurant.email,
        openingTime: hydratedRestaurant.openingTime,
        closingTime: hydratedRestaurant.closingTime,
        deliveryZones: hydratedRestaurant.deliveryZones,
        latitude: hydratedRestaurant.latitude,
        longitude: hydratedRestaurant.longitude,
      },
    );

    return hydratedRestaurant;
  }

  async toggleFavorite(userId: string, restaurantId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['favorites'],
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const restaurant = await this.restaurantRepo.findOne({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant non trouvé');
    }

    const isFavorite = user.favorites?.some((fav) => fav.id === restaurantId);
    if (isFavorite) {
      user.favorites =
        user.favorites?.filter((fav) => fav.id !== restaurantId) || [];
    } else {
      if (!user.favorites) user.favorites = [];
      user.favorites.push(restaurant);
    }

    return this.userRepo.save(user);
  }

  async removeFavorite(userId: string, restaurantId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['favorites'],
    });
    if (!user) return;

    user.favorites =
      user.favorites?.filter((fav) => fav.id !== restaurantId) || [];
    return this.userRepo.save(user);
  }

  async validateTableQR(token: string) {
    if (!token || token.length < 10) {
      throw new BadRequestException('Token QR invalide');
    }
    return { valid: true, tableNumber: Math.floor(Math.random() * 20) + 1 };
  }

  async createStaffAccount(restaurantId: string, staffData: any) {
    const restaurant = await this.restaurantRepo.findOne({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    if (!staffData.email || !staffData.nom) {
      throw new BadRequestException('Email et nom sont requis');
    }

    const existingUser = await this.userRepo.findOne({
      where: { email: staffData.email },
    });
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    if (staffData.password && staffData.password.length < 6) {
      throw new BadRequestException(
        'Le mot de passe du staff doit contenir au moins 6 caractères',
      );
    }

    const rawPassword = staffData.password
      ? staffData.password
      : this.generateTemporaryPassword();

    const staffUser = this.userRepo.create({
      email: staffData.email,
      nom: staffData.nom,
      telephone: staffData.telephone || '',
      role: Role.STAFF,
      restaurant: { id: restaurantId },
      actif: true,
      // Gérant creates staff directly — no email verification required
      emailVerified: true,
    });

    staffUser.password = await bcrypt.hash(rawPassword, 12);

    const savedStaff = await this.userRepo.save(staffUser);

    const { password, ...staffWithoutPassword } = savedStaff;
    return {
      ...staffWithoutPassword,
      temporaryPassword: staffData.password ? undefined : rawPassword,
    };
  }

  async toggleStaffAccount(staffId: string, updateData: any) {
    const staffUser = await this.userRepo.findOne({
      where: { id: staffId },
      relations: ['restaurant'],
    });

    if (!staffUser) {
      throw new NotFoundException('Staff account not found');
    }

    if (staffUser.role !== Role.STAFF) {
      throw new BadRequestException('User is not a staff member');
    }

    if (updateData.actif !== undefined) {
      staffUser.actif = updateData.actif;
    }

    const updatedStaff = await this.userRepo.save(staffUser);
    const { password, ...updatedStaffWithoutPassword } = updatedStaff;
    return updatedStaffWithoutPassword;
  }

  async getStaffAccounts(restaurantId: string) {
    const staffAccounts = await this.userRepo.find({
      where: {
        restaurant: { id: restaurantId },
        role: Role.STAFF,
      },
      select: {
        id: true,
        email: true,
        nom: true,
        telephone: true,
        actif: true,
        createdAt: true,
      },
    });

    return staffAccounts;
  }

  private generateTemporaryPassword(): string {
    return Math.random().toString(36).slice(-8);
  }
}
