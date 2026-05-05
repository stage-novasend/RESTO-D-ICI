// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from './entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    // 🔹 Enregistre User pour que Repository<User> soit injectable
    TypeOrmModule.forFeature([User]),

    // 🔹 Passport + JWT
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-change-me-in-prod',
      signOptions: { expiresIn: '24h' }, // RG-35
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy, // ← CRITIQUE : doit être ici pour que Passport l'utilise
    RolesGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtModule], // Pour l'utiliser dans d'autres modules
})
export class AuthModule {}