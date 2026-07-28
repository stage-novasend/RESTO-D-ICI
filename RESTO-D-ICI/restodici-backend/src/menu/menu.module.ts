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
import { PromosModule } from '../promos/promos.module';

@Module({
  imports: [
    CacheModule.register(),
    TypeOrmModule.forFeature([Article, Categorie, Restaurant, AuditLog]),
    PromosModule,
  ],
  controllers: [MenuController],
  providers: [MenuService, AuditService],
  exports: [MenuService],
})
export class MenuModule {}
