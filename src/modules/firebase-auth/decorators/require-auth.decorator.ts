import { UseGuards, applyDecorators } from '@nestjs/common';
import { FirebaseAuthGuard } from '../firebase-auth.guard';

/**
 * Marca un endpoint como PROTEGIDO con Firebase Auth
 * Requiere token válido en header Authorization
 * 
 * Uso:
 * @RequireAuth()
 * @Get('/protected')
 * async protectedEndpoint(@CurrentUser() user: FirebaseUser) { ... }
 */
export const RequireAuth = () => applyDecorators(UseGuards(FirebaseAuthGuard));
