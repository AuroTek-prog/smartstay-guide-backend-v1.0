import { SetMetadata } from '@nestjs/common';

/**
 * Marca un endpoint como de autenticación OPCIONAL
 * El guard intentará autenticar, pero permitirá el acceso sin token
 */
export const OPTIONAL_AUTH_KEY = 'optionalAuth';
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH_KEY, true);
