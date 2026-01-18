import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { FirebaseAuthModule } from '../firebase-auth/firebase-auth.module';

/**
 * CHANGE: AdminModule - Módulo de administración (FASE 8)
 * 
 * Funcionalidades:
 * - CRUD de usuarios
 * - CRUD de empresas
 * - Estadísticas globales
 * - Requiere rol ADMIN (AdminGuard)
 * 
 * Endpoints:
 * - /api/admin/users
 * - /api/admin/companies
 * - /api/admin/stats
 */
@Module({
  imports: [
    PrismaModule,
    FirebaseAuthModule, // CHANGE: Para autenticación opcional
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
