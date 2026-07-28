// src/stocks/stocks.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
  Req,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StocksService } from './stocks.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  // GET /stocks — Inventaire complet du restaurant
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN', 'STAFF')
  getAll(@Req() req, @Query('restaurantId') restaurantId?: string) {
    const targetRestaurantId = req.user?.restaurant?.id || restaurantId;
    return this.stocksService.getAll(targetRestaurantId);
  }

  // GET /stocks/alerts — Alertes seuils minimum (RG-23)
  @Get('alerts')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN', 'STAFF')
  getAlerts(@Req() req) {
    const restaurantId = req.user?.restaurant?.id;
    return this.stocksService.getAlerts(restaurantId);
  }

  // GET /stocks/rapport-ecarts — Stock théorique pour rapport d'inventaire physique
  @Get('rapport-ecarts')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN', 'STAFF')
  getRapportEcarts(@Req() req, @Query('restaurantId') restaurantId?: string) {
    const targetRestaurantId = req.user?.restaurant?.id || restaurantId;
    return this.stocksService.getRapportEcarts(targetRestaurantId);
  }

  // PATCH /stocks/:id/adjust — Ajustement manuel (correction, casse, etc.)
  @Patch(':id/adjust')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN', 'STAFF')
  adjustStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
    @Body('motif') motif: string,
    @Req() req,
  ) {
    const restaurantId = req.user?.restaurant?.id;
    return this.stocksService.adjustStock(id, quantity, restaurantId, motif);
  }

  // POST /stocks/:id/entree — Réception marchandise liée à un fournisseur (RG-24)
  @Post(':id/entree')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN', 'STAFF')
  @HttpCode(HttpStatus.OK)
  entreeStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
    @Body('fournisseurId') fournisseurId: string,
    @Body('motif') motif: string,
    @Req() req,
  ) {
    const restaurantId = req.user?.restaurant?.id;
    return this.stocksService.entreeStock(
      id,
      quantity,
      fournisseurId,
      restaurantId,
      motif,
    );
  }
}
