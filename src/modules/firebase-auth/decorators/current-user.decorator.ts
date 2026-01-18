import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FirebaseUser } from '../interfaces/firebase-user.interface';

/**
 * Decorator para extraer el usuario de Firebase del request
 * Uso: @CurrentUser() user: FirebaseUser
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): FirebaseUser | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.firebaseUser;
  },
);
