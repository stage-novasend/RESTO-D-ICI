// src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

   
    const request = context.switchToHttp().getRequest();
    
    
    const user = request.user;

    // Debug log (à supprimer en prod)
    console.log('🔍 RolesGuard:', {
      hasUser: !!user,
      userRole: user?.role,
      requiredRoles,
    });

    if (!user || !user.role) {
      throw new ForbiddenException('Accès refusé : utilisateur non authentifié');
    }

    const hasRole = requiredRoles.includes(user.role);
    
    if (!hasRole) {
      throw new ForbiddenException(`Accès refusé : rôle "${user.role}" non autorisé`);
    }

    return true;
  }
}