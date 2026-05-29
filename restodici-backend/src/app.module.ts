// src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MenuModule } from './menu/menu.module';
import { CommandesModule } from './commandes/commandes.module';
import { StocksModule } from './stocks/stocks.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { TresorerieModule } from './tresorerie/tresorerie.module';
import { B2BModule } from './b2b/b2b.module';
import { AdminModule } from './admin/admin.module';
import { UploadsModule } from './uploads/uploads.module';
import { PromosModule } from './promos/promos.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaiementsModule } from './paiements/paiements.module';
import { FournisseursModule } from './fournisseurs/fournisseurs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username:
        process.env.DB_USERNAME || process.env.DB_USER || 'restodici_user',
      password: process.env.DB_PASSWORD || 'restodici_pass',
      database:
        process.env.DB_DATABASE || process.env.DB_NAME || 'restodici_db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize:
        process.env.DB_SYNC !== undefined
          ? process.env.DB_SYNC === 'true'
          : process.env.NODE_ENV !== 'production',
      logging: process.env.DB_LOGGING === 'true' || false,
      ssl: process.env.DB_SSL === 'true' || false,
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 60 * 1000, // 1 minute
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    B2BModule,
    AdminModule,
    UploadsModule,
    PromosModule,
    RestaurantsModule,
    MenuModule,
    CommandesModule,
    StocksModule,
    TresorerieModule,
    NotificationsModule,
    PaiementsModule,
    FournisseursModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
