// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-change-me-in-prod',
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub, actif: true },
      select: ['id', 'email', 'nom', 'role', 'actif'],
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé ou désactivé');
    }

    //  CRITIQUE : Retourner un objet PLAIN avec le rôle
    // Passport attachera cet objet à request.user
    return {
      id: user.id,
      email: user.email,
      nom: user.nom,
      role: user.role, // ← Doit être présent
      actif: user.actif,
    };
  }
}
