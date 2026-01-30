import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FirebaseAuthService } from './firebase-auth.service';
import { OPTIONAL_AUTH_KEY } from './decorators/optional-auth.decorator';
import { verifyLocalToken } from '../../common/local-jwt';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(
    private firebaseAuthService: FirebaseAuthService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // SECURITY FIX: Si Firebase está deshabilitado, validar con token de desarrollo
    if (!this.firebaseAuthService.isEnabled()) {
      const devToken = request.headers['x-dev-token'];
      if (process.env.NODE_ENV !== 'production' && devToken === process.env.DEV_BYPASS_TOKEN) {
        request.firebaseUser = {
          uid: 'demo-user',
          email: 'demo@smartstay.com',
          role: 'ADMIN',
          permissions: ['admin:access'],
        };
        this.logger.warn('⚠️ Acceso con token de desarrollo');
        return true;
      }
      throw new UnauthorizedException('Firebase Auth requerido o DEV_BYPASS_TOKEN inválido');
    }

    const authHeader = request.headers['authorization'];
    this.logger.debug(`Authorization header present=${!!authHeader}`);

    // Verificar si el endpoint tiene @OptionalAuth()
    const isOptional = this.reflector.get<boolean>(
      OPTIONAL_AUTH_KEY,
      context.getHandler(),
    );

    // Si no hay header de autorización
    if (!authHeader) {
      if (isOptional) {
        this.logger.debug('Auth opcional, permitiendo acceso sin token');
        return true;
      }
      throw new UnauthorizedException('Token de autenticación requerido');
    }

    // Soportar token local: "Local <token>"
    if (/^Local\s+/i.test(authHeader)) {
      this.logger.debug('Using local token auth');
      const token = authHeader.replace(/^Local\s+/i, '');
      if (!token) {
        throw new UnauthorizedException('Formato de token inválido');
      }
      try {
        const payload = verifyLocalToken(token);
        request.firebaseUser = {
          uid: payload.sub,
          email: payload.email,
          role: payload.role,
          permissions: payload.permissions,
          localUserId: payload.sub,
          emailVerified: true,
        };
        return true;
      } catch (error) {
        if (isOptional) {
          this.logger.debug('Token local inválido pero auth opcional, permitiendo acceso');
          return true;
        }
        throw new UnauthorizedException('Token local inválido o expirado');
      }
    }

    // Extraer token Firebase (formato: "Bearer <token>")
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      if (isOptional) {
        return true;
      }
      throw new UnauthorizedException('Formato de token inválido');
    }

    // Verificar token con Firebase
    this.logger.debug('Verifying Firebase token');
    const firebaseUser = await this.firebaseAuthService.verifyToken(token);

    if (!firebaseUser) {
      if (isOptional) {
        this.logger.debug('Token inválido pero auth opcional, permitiendo acceso');
        return true;
      }
      throw new UnauthorizedException('Token inválido o expirado');
    }

    // Inyectar usuario en el request para uso posterior
    request.firebaseUser = firebaseUser;
    this.logger.debug(`Usuario autenticado: ${firebaseUser.email || firebaseUser.uid}`);

    return true;
  }
}
