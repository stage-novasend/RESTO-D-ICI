// src/menu/menu.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { MenuService } from './menu.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { Public } from '../auth/decorators/public.decorator';
import { PromosService } from '../promos/promos.service';
import type { Request } from 'express';
import type {
  RequestUser,
  AuthenticatedRequest,
} from '../common/types/authenticated-request';

// @Public() : req est toujours fourni par Express, mais req.user n'existe
// que si un JWT valide a été envoyé (optionnel sur ces routes).
type OptionallyAuthenticatedRequest = Request & { user?: RequestUser };

@Controller('menu')
export class MenuController {
  constructor(
    private readonly menuService: MenuService,
    private readonly promosService: PromosService,
  ) {}

  // GET /menu — Récupération menu avec filtres (US-01, US-03)
  @Public()
  @Get()
  getMenu(
    @Query('categorie') categorieId?: string,
    @Query('cible') cible: string = 'CLIENT',
    @Query('restaurantId') restaurantId?: string,
    @Req() req?: OptionallyAuthenticatedRequest,
  ) {
    return this.menuService.getMenu(
      categorieId,
      cible,
      req?.user,
      restaurantId,
    );
  }

  // GET /menu/restaurants — Liste des restaurants actifs
  // [PERF] Cache 5 min (audit §4.3)
  @Public()
  @Get('restaurants')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(5 * 60 * 1000)
  getRestaurants(@Query('withArticles') withArticles?: string) {
    return this.menuService.getRestaurants(withArticles === 'true');
  }

  // GET /menu/plats-populaires — Suggestions de recherche de l'accueil.
  // Plats disponibles les plus commandés. Cache 10 min : un classement de
  // popularité n'a pas besoin d'être à la seconde, et la requête agrège.
  @Public()
  @Get('plats-populaires')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(10 * 60 * 1000)
  getPlatsPopulaires(@Query('limit') limit?: string) {
    const parsed = Number.parseInt(limit ?? '', 10);
    const safeLimit = Number.isFinite(parsed)
      ? Math.min(Math.max(parsed, 1), 20)
      : 6;
    return this.menuService.getPlatsPopulaires(safeLimit);
  }

  // GET /menu/promos-actives?restaurantId=xxx&userId=yyy — Offres limitées actives (public)
  @Public()
  @Get('promos-actives')
  getPromosActives(
    @Query('restaurantId') restaurantId: string,
    @Query('userId') userId?: string,
  ) {
    return this.promosService.getActives(restaurantId ?? '', userId);
  }

  // GET /menu/categories — Liste catégories
  // [PERF] Cache 5 min (audit §4.3)
  @Public()
  @Get('categories')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(5 * 60 * 1000)
  getCategories(@Query('restaurantId') restaurantId?: string) {
    return this.menuService.getCategories(restaurantId);
  }

  // GET /menu/search — Recherche articles
  @Public()
  @Get('search')
  searchArticles(
    @Query('q') query: string,
    @Query('cible') cible: string = 'CLIENT',
    @Query('restaurantId') restaurantId?: string,
    @Req() req?: OptionallyAuthenticatedRequest,
  ) {
    return this.menuService.searchArticles(
      query,
      cible,
      req?.user,
      restaurantId,
    );
  }

  // GET /menu/restaurant/:id — Menu d'un restaurant spécifique
  // [PERF] Cache 2 min (audit §4.3)
  @Public()
  @Get('restaurant/:id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(2 * 60 * 1000)
  getMenuByRestaurant(
    @Param('id') restaurantId: string,
    @Query('categorie') categorieId?: string,
    @Query('cible') cible: string = 'CLIENT',
  ) {
    return this.menuService.getMenuByRestaurant(
      restaurantId,
      categorieId,
      cible,
    );
  }

  //  POST /menu/categories — Création (Lier au restaurant du gérant)
  @Post('categories')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  createCategorie(
    @Body() dto: CreateCategorieDto,
    @Req() req: AuthenticatedRequest,
  ) {
    // On passe req.user pour que le service sache à quel restaurant lier la catégorie
    return this.menuService.createCategorie(dto, req.user);
  }

  //  POST /menu/articles — Création (Lier au restaurant du gérant)
  @Post('articles')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  createArticle(
    @Body() dto: CreateArticleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    // CRITIQUE : req.user contient { id, role, restaurant: { id, nom } }
    return this.menuService.createArticle(dto, req.user);
  }

  //  PATCH /menu/articles/:id/disponible
  @Patch('articles/:id/disponible')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  toggleDisponibilite(
    @Param('id') id: string,
    @Body('disponible') disponible: boolean,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.menuService.toggleDisponibilite(id, disponible, req.user);
  }

  //  PUT /menu/articles/:id
  @Put('articles/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  updateArticle(
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.menuService.updateArticle(id, dto, req.user);
  }

  //  DELETE
  @Delete('articles/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GERANT')
  softDeleteArticle(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.menuService.softDeleteArticle(id, req.user);
  }
}
