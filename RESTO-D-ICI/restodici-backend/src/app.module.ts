// src/app.module.ts
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './config/data-source';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './auth/entities/user.entity';
import { Restaurant } from './restaurants/entities/restaurant.entity';
import { Commande } from './commandes/entities/commande.entity';
import { SystemConfig } from './common/entities/system-config.entity';
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
import { ReceiptQueueModule } from './receipt-queue/receipt-queue.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { LivraisonsExternesModule } from './livraisons-externes/livraisons-externes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      // Dev : synchronisation auto du schéma (sauf DB_SYNC=false).
      // Production : pas de synchronisation, les migrations sont appliquées au démarrage.
      synchronize:
        process.env.DB_SYNC !== undefined
          ? process.env.DB_SYNC === 'true'
          : process.env.NODE_ENV !== 'production',
      migrationsRun: process.env.NODE_ENV === 'production',
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 60 * 1000, // 1 minute
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([User, Restaurant, Commande, SystemConfig]),
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
    ReceiptQueueModule,
    NewsletterModule,
    LivraisonsExternesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Auth JWT globale : tout est protégé par défaut, sauf routes @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Journalisation + correlation ID sur toutes les routes.
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
