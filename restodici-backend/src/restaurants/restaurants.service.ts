// src/restaurants/restaurants.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from './entities/restaurant.entity';
import { User } from '../auth/entities/user.entity';
import { Role } from '../auth/entities/user.entity'; // Import Role enum
import * as bcrypt from 'bcrypt';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant)
    private restaurantRepo: Repository<Restaurant>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  // GET /restaurants — Liste tous les restaurants actifs (filtrés)
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

  // GET /restaurants/:id — Détails d'un restaurant
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

  // POST /restaurants/:id/favorites — Ajouter/retirer des favoris
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

    // Vérifier si déjà en favori
    const isFavorite = user.favorites?.some((fav) => fav.id === restaurantId);
    if (isFavorite) {
      // Retirer des favoris
      user.favorites =
        user.favorites?.filter((fav) => fav.id !== restaurantId) || [];
    } else {
      // Ajouter aux favoris
      if (!user.favorites) user.favorites = [];
      user.favorites.push(restaurant);
    }

    return this.userRepo.save(user);
  }

  // DELETE /restaurants/:id/favorites — Retirer des favoris
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

  // GET /restaurants/qr/validate — Validation QR code table
  async validateTableQR(token: string) {
    // Mock implementation - in real app this would validate against a database
    if (!token || token.length < 10) {
      throw new BadRequestException('Token QR invalide');
    }
    return { valid: true, tableNumber: Math.floor(Math.random() * 20) + 1 };
  }

  // POST /restaurants/:restaurantId/staff — Créer un compte Staff (RBAC: GERANT/ADMIN)
  async createStaffAccount(restaurantId: string, staffData: any) {
    // Validate restaurant exists
    const restaurant = await this.restaurantRepo.findOne({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    // Validate required fields
    if (!staffData.email || !staffData.nom) {
      throw new BadRequestException('Email et nom sont requis');
    }

    // Check if email already exists
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

    // Create staff account with STAFF role
    const staffUser = this.userRepo.create({
      email: staffData.email,
      nom: staffData.nom,
      telephone: staffData.telephone || '',
      role: Role.STAFF,
      restaurant: { id: restaurantId },
      actif: true,
    });

    // Set password separately
    staffUser.password = await bcrypt.hash(rawPassword, 12);

    const savedStaff = await this.userRepo.save(staffUser);

    // Remove password from response
    const { password, ...staffWithoutPassword } = savedStaff;
    return {
      ...staffWithoutPassword,
      temporaryPassword: staffData.password ? undefined : rawPassword,
    };
  }

  // PUT /restaurants/:restaurantId/staff/:staffId — Activer/désactiver un compte Staff
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

    // Update only allowed fields
    if (updateData.actif !== undefined) {
      staffUser.actif = updateData.actif;
    }

    const updatedStaff = await this.userRepo.save(staffUser);
    const { password, ...updatedStaffWithoutPassword } = updatedStaff;
    return updatedStaffWithoutPassword;
  }

  // GET /restaurants/:restaurantId/staff — Lister tous les comptes Staff
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
