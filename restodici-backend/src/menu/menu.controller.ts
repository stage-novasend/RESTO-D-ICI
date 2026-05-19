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
  Req, // <--- AJOUTER CET IMPORT
} from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // GET /menu — Récupération menu avec filtres (US-01, US-03)
  @Get()
  getMenu(
    @Query('categorie') categorieId?: string,
    @Query('cible') cible: string = 'CLIENT',
    @Query('restaurantId') restaurantId?: string,
    @Req() req?,
  ) {
    return this.menuService.getMenu(categorieId, cible, req.user, restaurantId);
  }

  // GET /menu/restaurants — Liste des restaurants actifs
  @Get('restaurants')
  getRestaurants() {
    return this.menuService.getRestaurants();
  }

  // GET /menu/categories — Liste catégories
  @Get('categories')
  getCategories(@Query('restaurantId') restaurantId?: string) {
    return this.menuService.getCategories(restaurantId);
  }

  // GET /menu/search — Recherche articles
  @Get('search')
  searchArticles(
    @Query('q') query: string,
    @Query('cible') cible: string = 'CLIENT',
    @Query('restaurantId') restaurantId?: string,
    @Req() req?,
  ) {
    return this.menuService.searchArticles(
      query,
      cible,
      req.user,
      restaurantId,
    );
  }

  // GET /menu/restaurant/:id — Menu d'un restaurant spécifique
  @Get('restaurant/:id')
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
  createCategorie(@Body() dto: CreateCategorieDto, @Req() req) {
    // On passe req.user pour que le service sache à quel restaurant lier la catégorie
    return this.menuService.createCategorie(dto, req.user);
  }

  //  POST /menu/articles — Création (Lier au restaurant du gérant)
  @Post('articles')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  createArticle(@Body() dto: CreateArticleDto, @Req() req) {
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
    @Req() req,
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
    @Req() req,
  ) {
    return this.menuService.updateArticle(id, dto, req.user);
  }

  //  DELETE
  @Delete('articles/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GERANT')
  softDeleteArticle(@Param('id') id: string, @Req() req) {
    return this.menuService.softDeleteArticle(id, req.user);
  }
}
