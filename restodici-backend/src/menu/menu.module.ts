// src/menu/menu.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager'; // Add CacheModule import
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { Article } from './entities/article.entity';
import { Categorie } from './entities/categorie.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity'; // ✅ Import
import { AuditLog } from '../common/entities/audit-log.entity';
import { AuditService } from '../common/audit.service';

@Module({
  imports: [
    CacheModule.register(), // Register CacheModule
    // Enregistrer TOUTES les entités utilisées par ce module
    TypeOrmModule.forFeature([Article, Categorie, Restaurant, AuditLog]),
  ],
  controllers: [MenuController],
  providers: [MenuService, AuditService],
  exports: [MenuService], // Pour l'utiliser dans d'autres modules si besoin
})
export class MenuModule {}
