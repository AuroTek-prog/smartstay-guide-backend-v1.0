import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../common/prisma.module';
import { EncryptionService } from '../../common/encryption.service';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';
import { UploadController } from './upload.controller';
import { FirebaseAuthModule } from '../firebase-auth/firebase-auth.module';

/**
 * CHANGE: ManagerModule - Módulo de gestión de apartamentos
 * 
 * Funcionalidades:
 * - CRUD completo de apartamentos (Unit)
 * - Upload de imágenes con Multer
 * - Encriptación automática de datos sensibles (AES-256)
 * - Logging en ActivityLog
 * - Autenticación opcional con Firebase
 * 
 * Controladores:
 * - ManagerController: /api/manager/apartments
 * - UploadController: /api/manager/upload
 * 
 * Servicios:
 * - ManagerService: Lógica de negocio + encriptación
 * - EncryptionService: AES-256-CBC
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    FirebaseAuthModule, // CHANGE: Para autenticación opcional
  ],
  controllers: [
    ManagerController,
    UploadController,
  ],
  providers: [
    ManagerService,
    EncryptionService, // CHANGE: Servicio de encriptación
  ],
  exports: [
    ManagerService,
    EncryptionService,
  ],
})
export class ManagerModule {}
