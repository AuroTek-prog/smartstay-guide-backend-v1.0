import { FirebaseUser } from '../../modules/firebase-auth/interfaces/firebase-user.interface';

export function resolveUserId(
  user?: FirebaseUser,
  fallback = 'demo-user',
) {
  return user?.uid || fallback;
}
