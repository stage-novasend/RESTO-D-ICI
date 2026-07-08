// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';

// TEMP DEBUG: logger la raison du 401 JWT côté backend.

import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CompteB2B } from '../../b2b/entities/compte-b2b.entity';
import { Role } from '../entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(CompteB2B)
    private compteB2BRepository: Repository<CompteB2B>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: any) => {
          const handshakeToken = request?.handshake?.auth?.token;
          if (typeof handshakeToken === 'string' && handshakeToken.trim()) {
            return handshakeToken.trim();
          }

          const authorization = request?.handshake?.headers?.authorization;
          if (
            typeof authorization === 'string' &&
            authorization.startsWith('Bearer ')
          ) {
            return authorization.slice(7).trim();
          }

          return null;
        },
      ]),
      ignoreExpiration: false,
      // [SÉCURITÉ] Pas de fallback : JWT_SECRET est validé au démarrage (audit §3.1)
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub, actif: true },
      relations: ['restaurant'],
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé ou désactivé');
    }

    let compteB2BId: string | undefined;

    // Si le user est Responsable B2B, on rattache son CompteB2B
    if (user.role === Role.B2B) {
      const compteB2B = await this.compteB2BRepository.findOne({
        where: { responsable: { id: user.id } },
        select: ['id'],
      });
      compteB2BId = compteB2B?.id;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      compteB2BId,
      restaurant: user.restaurant
        ? { id: user.restaurant.id, nom: user.restaurant.nom }
        : undefined,
    };
  }
}
