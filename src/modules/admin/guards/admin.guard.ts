import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * CHANGE: AdminGuard - Protege endpoints que requieren rol ADMIN
 * 
 * Uso:
 * @UseGuards(AdminGuard)
 * @Admin() // Decorador custom
 * 
 * Requiere:
 * - Usuario autenticado (vía FirebaseAuth opcional)
 * - Role = 'ADMIN' en base de datos
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.firebaseUser || request.user;

    // SECURITY FIX: Nunca permitir acceso sin usuario
    if (!user) {
      throw new ForbiddenException('Autenticación requerida para acceso admin');
    }

    // Verificar rol ADMIN
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Requiere rol ADMIN');
    }

    return true;
  }
}
