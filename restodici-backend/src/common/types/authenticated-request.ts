import { Request } from 'express';
import { Role } from '../../auth/entities/user.entity';

/**
 * Forme exacte de `req.user` attachée par JwtStrategy.validate() une fois le
 * token vérifié. Remplace les innombrables `@Req() req: any` des contrôleurs
 * (audit ISO 25010 — Maintenabilité : ~89 `any` explicites), qui rendaient
 * tout accès à `req.user.xxx` non typé (@typescript-eslint/no-unsafe-*).
 */
export interface RequestUser {
  id: string;
  email: string;
  role: Role;
  prenom?: string;
  nom?: string;
  compteB2BId?: string;
  restaurant?: { id: string; nom: string };
}

export interface AuthenticatedRequest extends Request {
  user: RequestUser;
}
