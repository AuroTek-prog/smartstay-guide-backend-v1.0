import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseUser } from './interfaces/firebase-user.interface';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class FirebaseAuthService {
  private readonly logger = new Logger(FirebaseAuthService.name);
  private app: admin.app.App | null = null;
  private enabled = false;

  constructor(private prisma: PrismaService) {
    this.initializeFirebase();
  }

  /**
   * Inicializa Firebase Admin SDK solo si está habilitado
   */
  private initializeFirebase(): void {
    // Feature flag: solo inicializar si está habilitado
    if (process.env.FIREBASE_ENABLED !== 'true') {
      this.logger.warn('🔓 Firebase Auth DESHABILITADO (FIREBASE_ENABLED != true)');
      this.logger.warn('📝 Todos los endpoints permanecen sin autenticación');
      return;
    }

    try {
      // Opción 1: Usar archivo de credenciales (producción)
      if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        this.app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.enabled = true;
        this.logger.log('✅ Firebase Admin SDK inicializado con archivo de credenciales');
      }
      // Opción 2: Usar variables de entorno (desarrollo)
      else if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      ) {
        this.app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
        });
        this.enabled = true;
        this.logger.log('✅ Firebase Admin SDK inicializado con variables de entorno');
      } else {
        this.logger.warn('⚠️ Firebase habilitado pero faltan credenciales');
        this.logger.warn('📝 Configura FIREBASE_SERVICE_ACCOUNT_PATH o las variables de proyecto');
      }
    } catch (error) {
      this.logger.error('❌ Error inicializando Firebase Admin SDK:', error);
      this.enabled = false;
    }
  }

  /**
   * Verifica si Firebase está habilitado y configurado
   */
  isEnabled(): boolean {
    return this.enabled && this.app !== null;
  }

  /**
   * Verifica un token de Firebase y retorna los datos del usuario
   * @param idToken Token de Firebase desde el frontend
   * @returns Datos del usuario o null si el token es inválido
   */
  async verifyToken(idToken: string): Promise<FirebaseUser | null> {
    if (!this.isEnabled()) {
      this.logger.debug('Firebase deshabilitado, token ignorado');
      return null;
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      // Buscar si el usuario ya está asociado en nuestra BD
      const localUser = await this.prisma.user.findUnique({
        where: { firebaseUid: decodedToken.uid },
        select: {
          id: true,
          role: true,
        },
      });

      const roleRecord = localUser?.role
        ? await this.prisma.role.findUnique({
            where: { id: localUser.role },
            select: { permissions: true },
          })
        : null;

      const firebaseUser: FirebaseUser = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified || false,
        displayName: decodedToken.name,
        photoURL: decodedToken.picture,
        phoneNumber: decodedToken.phone_number,
        localUserId: localUser?.id,
        role: localUser?.role || undefined,
        permissions: roleRecord?.permissions ?? [],
      };

      return firebaseUser;
    } catch (error) {
      this.logger.debug(`Token inválido: ${error.message}`);
      return null;
    }
  }

  /**
   * Asocia un firebase_uid a un usuario existente en nuestra BD
   * @param userId ID del usuario en nuestra base de datos
   * @param firebaseUid UID de Firebase
   */
  async linkFirebaseToUser(userId: string, firebaseUid: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { firebaseUid: firebaseUid },
    });

    this.logger.log(`✅ Usuario ${userId} asociado con Firebase UID ${firebaseUid}`);
  }

  /**
   * Desasocia Firebase de un usuario
   * @param userId ID del usuario
   */
  async unlinkFirebaseFromUser(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { firebaseUid: null },
    });

    this.logger.log(`🔓 Firebase UID removido del usuario ${userId}`);
  }
}
