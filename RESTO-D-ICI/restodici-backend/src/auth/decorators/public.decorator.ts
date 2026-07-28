import { SetMetadata } from '@nestjs/common';

/**
 * Marque une route comme publique : le JwtAuthGuard global la laisse passer
 * sans authentification. À réserver aux routes réellement ouvertes
 * (login, register, webhooks signés, invitations par token, browsing public).
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
