import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(AdminGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.firebaseUser || request.user;

    // SECURITY FIX: Nunca permitir acceso sin usuario
    if (!user) {
      this.logger.warn('Acceso admin bloqueado: usuario no inyectado en request');
      throw new ForbiddenException('Autenticación requerida para acceso admin');
    }

    this.logger.debug(`AdminGuard user uid=${user.uid || user.localUserId || 'unknown'} role=${user.role || 'none'} permissions=${Array.isArray(user.permissions) ? user.permissions.join(',') : 'none'}`);

    const permissions = Array.isArray(user.permissions) ? user.permissions : [];
    if (permissions.includes('admin:access') || permissions.includes('admin:*')) {
      return true;
    }

    // Verificar rol ADMIN si no hay permisos definidos
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      this.logger.warn(`Acceso admin bloqueado: role=${user.role || 'none'}`);
      throw new ForbiddenException('Requiere rol ADMIN');
    }

    return true;
  }
}
