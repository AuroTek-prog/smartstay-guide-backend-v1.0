import { Module } from '@nestjs/common';
import { FirebaseAuthService } from './firebase-auth.service';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { FirebaseAuthController } from './firebase-auth.controller';
import { PrismaModule } from '../../common/prisma.module';

/**
 * Módulo Firebase Auth - Totalmente OPCIONAL e AISLADO
 * 
 * Solo se activa si FIREBASE_ENABLED=true
 * No afecta endpoints existentes
 * Los guards solo aplican donde se usan explícitamente
 */
@Module({
  imports: [PrismaModule],
  providers: [FirebaseAuthService, FirebaseAuthGuard],
  controllers: [FirebaseAuthController],
  exports: [FirebaseAuthService, FirebaseAuthGuard],
})
export class FirebaseAuthModule {}
