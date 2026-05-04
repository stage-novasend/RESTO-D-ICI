import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthModule } from './auth/auth.module';
import { MenuModule } from './menu/menu.module';
import { User } from './auth/entities/user.entity';

@Module({
  imports: [
    // 🔹 Base de données PostgreSQL
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5433,
      username: 'restodici_user',
      password: 'restodici_password',
      database: 'restodici_db',
      entities: [User],
      synchronize: true, // ⚠️ À désactiver en production (false)
    }),

    // 🔹 Cache Redis/Mémoire (Global pour tout le projet)
    CacheModule.register({
      isGlobal: true,
      ttl: 300, // 5 minutes (conforme RG performance)
      max: 100, // max 100 entrées en cache
    }),

    // 🔹 Modules métier
    AuthModule,
    MenuModule,
  ],
})
export class AppModule {}