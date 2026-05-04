import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { Article } from './entities/article.entity';
import { Categorie } from './entities/categorie.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article, Categorie]),
    CacheModule.register({
      ttl: 300, // 5 minutes
      max: 100, // max 100 entrées en cache
    }),
    AuthModule, // Pour les guards RBAC
  ],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}