// src/restaurants/restaurants.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Delete,
  Query,
  Put,
  Patch,
  ForbiddenException,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  // GET /restaurants — Liste tous les restaurants actifs (filtrés par zone/catégorie)
  @Public()
  @Get()
  getAllRestaurants(
    @Query('zone') zone?: string,
    @Query('categorie') categorie?: string,
  ) {
    return this.restaurantsService.getAllActive(zone, categorie);
  }

  // GET /restaurants/me/profile — Profil du restaurant du gérant/admin
  @Get('me/profile')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  getMyRestaurantProfile(@Req() req) {
    const restaurantId = req.user.restaurant?.id;
    if (!restaurantId) {
      throw new ForbiddenException(
        'Aucun restaurant associé à cet utilisateur',
      );
    }
    return this.restaurantsService.getById(restaurantId);
  }

  // GET /restaurants/:id — Détails d'un restaurant
  @Public()
  @Get(':id')
  getRestaurant(@Param('id') id: string) {
    return this.restaurantsService.getById(id);
  }

  // PATCH /restaurants/:id — Mise à jour du profil restaurant
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  updateRestaurant(
    @Param('id') id: string,
    @Body() updateData: any,
    @Req() req,
  ) {
    return this.restaurantsService.updateRestaurant(id, updateData, req.user);
  }

  // POST /restaurants/:id/favorites — Ajouter/retirer des favoris
  @Post(':id/favorites')
  @UseGuards(AuthGuard('jwt'))
  toggleFavorite(@Param('id') restaurantId: string, @Req() req) {
    return this.restaurantsService.toggleFavorite(req.user.id, restaurantId);
  }

  // DELETE /restaurants/:id/favorites — Retirer des favoris
  @Delete(':id/favorites')
  @UseGuards(AuthGuard('jwt'))
  removeFavorite(@Param('id') restaurantId: string, @Req() req) {
    return this.restaurantsService.removeFavorite(req.user.id, restaurantId);
  }

  // GET /restaurants/qr/validate — Validation QR code table
  @Public()
  @Get('qr/validate')
  validateQRCode(@Query('token') token: string) {
    return this.restaurantsService.validateTableQR(token);
  }

  // POST /restaurants/:restaurantId/staff — Créer un compte Staff (RBAC: GERANT/ADMIN)
  @Post(':restaurantId/staff')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  createStaffAccount(
    @Param('restaurantId') restaurantId: string,
    @Body() staffData: any,
    @Req() req,
  ) {
    // Verify that the requesting user has access to this restaurant
    if (
      req.user.role === 'GERANT' &&
      req.user.restaurant?.id !== restaurantId
    ) {
      throw new ForbiddenException(
        'Access denied: Gérant can only manage their own restaurant',
      );
    }
    return this.restaurantsService.createStaffAccount(restaurantId, staffData);
  }

  // PUT /restaurants/:restaurantId/staff/:staffId — Activer/désactiver un compte Staff
  @Put(':restaurantId/staff/:staffId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  toggleStaffAccount(
    @Param('restaurantId') restaurantId: string,
    @Param('staffId') staffId: string,
    @Body() updateData: any,
    @Req() req,
  ) {
    // Verify that the requesting user has access to this restaurant
    if (
      req.user.role === 'GERANT' &&
      req.user.restaurant?.id !== restaurantId
    ) {
      throw new ForbiddenException(
        'Access denied: Gérant can only manage their own restaurant',
      );
    }
    return this.restaurantsService.toggleStaffAccount(staffId, updateData);
  }

  // GET /restaurants/:restaurantId/staff — Lister tous les comptes Staff
  @Get(':restaurantId/staff')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  getStaffAccounts(@Param('restaurantId') restaurantId: string, @Req() req) {
    // Verify that the requesting user has access to this restaurant
    if (
      req.user.role === 'GERANT' &&
      req.user.restaurant?.id !== restaurantId
    ) {
      throw new ForbiddenException(
        'Access denied: Gérant can only view their own restaurant staff',
      );
    }
    return this.restaurantsService.getStaffAccounts(restaurantId);
  }
}
