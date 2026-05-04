import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards } from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  getMenu(@Query('categorie') categorieId?: string, @Query('cible') cible?: string) {
    return this.menuService.getMenu(categorieId, cible || 'CLIENT');
  }

  @Get('categories')
  getCategories() {
    return this.menuService.getCategories();
  }

  @Get('search')
  search(@Query('q') query: string, @Query('cible') cible?: string) {
    return this.menuService.searchArticles(query, cible || 'CLIENT');
  }

  @Post('articles')
  @UseGuards(RolesGuard)
  @Roles('GERANT', 'ADMIN')
  createArticle(@Body() dto: CreateArticleDto) {
    return this.menuService.createArticle(dto);
  }

  @Patch('articles/:id/disponible')
  @UseGuards(RolesGuard)
  @Roles('GERANT', 'ADMIN')
  toggleDisponibilite(@Param('id') id: string, @Body('disponible') disponible: boolean) {
    return this.menuService.toggleDisponibilite(id, disponible);
  }
}