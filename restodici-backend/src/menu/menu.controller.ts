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
} from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport'; // ← CRITIQUE : Import manquant !

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  //  GET /menu — Public (client)
  @Get()
  getMenu(@Query('categorie') categorieId?: string, @Query('cible') cible?: string) {
    return this.menuService.getMenu(categorieId, cible);
  }

  //  GET /menu/categories — Public
  @Get('categories')
  getCategories() {
    return this.menuService.getCategories();
  }

  // GET /menu/search — Public
  @Get('search')
  search(@Query('q') q: string, @Query('cible') cible?: string) {
    return this.menuService.searchArticles(q, cible);
  }

  //  POST /menu/categories — PROTÉGÉ (GERANT/ADMIN)
  @Post('categories')
  @UseGuards(AuthGuard('jwt'), RolesGuard) // ← CRITIQUE : AuthGuard DOIT être en premier !
  @Roles('GERANT', 'ADMIN')
  createCategorie(@Body() dto: CreateCategorieDto) {
    return this.menuService.createCategorie(dto);
  }

  //  POST /menu/articles — PROTÉGÉ (GERANT/ADMIN)
  @Post('articles')
  @UseGuards(AuthGuard('jwt'), RolesGuard) // ← CRITIQUE : Ordre important !
  @Roles('GERANT', 'ADMIN')
  createArticle(@Body() dto: CreateArticleDto) {
    return this.menuService.createArticle(dto);
  }

  // ✅ PATCH /menu/articles/:id/disponible — PROTÉGÉ (GERANT/ADMIN)
  @Patch('articles/:id/disponible')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  toggleDisponibilite(@Param('id') id: string, @Body('disponible') disponible: boolean) {
    return this.menuService.toggleDisponibilite(id, disponible);
  }

  // ✅ PUT /menu/articles/:id — PROTÉGÉ (GERANT/ADMIN)
  @Put('articles/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  updateArticle(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.menuService.updateArticle(id, dto);
  }

  // ✅ DELETE logique — PROTÉGÉ (ADMIN uniquement)
  @Delete('articles/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  softDeleteArticle(@Param('id') id: string) {
    return this.menuService.softDeleteArticle(id);
  }
}