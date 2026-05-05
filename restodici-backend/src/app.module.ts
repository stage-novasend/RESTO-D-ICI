import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthModule } from './auth/auth.module';
import { MenuModule } from './menu/menu.module';

@Module({
  imports: [
    
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5433, 
      username: 'restodici_user',
      password: 'restodici_password',
      database: 'restodici_db',
      
      
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      
      synchronize: true, 
      logging: true, 
    }),

    // Cache Redis (Global)
    CacheModule.register({
      isGlobal: true,
      ttl: 300, // 5 minutes (RG performance)
      max: 100, // max 100 entrées
    }),

    //  Modules métier
    AuthModule,
    MenuModule,
  ],
})
export class AppModule {}