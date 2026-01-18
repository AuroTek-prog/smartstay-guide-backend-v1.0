import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

/**
 * CHANGE: AdminService - Lógica de negocio para panel de administración
 * 
 * Funcionalidades:
 * - CRUD de usuarios
 * - CRUD de empresas
 * - Estadísticas globales
 * - Logging automático en ActivityLog
 */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * CHANGE: Listar todos los usuarios
   */
  async listUsers() {
    this.logger.log('[ADMIN] Listando usuarios');

    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        firebaseUid: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        // CHANGE: NO incluir passwordHash por seguridad
      },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.log(`📋 [ADMIN] ${users.length} usuarios encontrados`);
    return users;
  }

  /**
   * CHANGE: Crear usuario
   */
  async createUser(adminId: string, dto: CreateUserDto) {
    this.logger.log(`[ADMIN] Usuario ${adminId} creando usuario: ${dto.email}`);

    // CHANGE: Hash de contraseña
    let passwordHash: string;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 10);
    } else {
      // CHANGE: Password dummy si no se proporciona
      passwordHash = await bcrypt.hash(Math.random().toString(), 10);
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        firebaseUid: dto.firebaseUid,
        role: dto.role || 'MANAGER',
        active: true,
      },
    });

    // CHANGE: Logging
    await this.prisma.activityLog.create({
      data: {
        userId: adminId,
        entityType: 'USER',
        entityId: user.id,
        action: 'CREATED',
        details: {
          userEmail: user.email,
          role: user.role,
        },
      },
    });

    this.logger.log(`✅ [ADMIN] Usuario ${user.email} creado`);

    return user;
  }

  /**
   * CHANGE: Actualizar usuario
   */
  async updateUser(adminId: string, userId: string, dto: UpdateUserDto) {
    this.logger.log(`[ADMIN] Actualizando usuario ${userId}`);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // CHANGE: Re-hash de contraseña si cambió
    let passwordHash: string | undefined;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.email && { email: dto.email }),
        ...(passwordHash && { passwordHash }),
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.firebaseUid !== undefined && { firebaseUid: dto.firebaseUid }),
        ...(dto.role && { role: dto.role }),
      },
    });

    // CHANGE: Logging
    await this.prisma.activityLog.create({
      data: {
        userId: adminId,
        entityType: 'USER',
        entityId: userId,
        action: 'UPDATED',
        details: {
          userEmail: updated.email,
          changes: Object.keys(dto),
        },
      },
    });

    this.logger.log(`✅ [ADMIN] Usuario ${updated.email} actualizado`);

    return updated;
  }

  /**
   * CHANGE: Eliminar usuario (soft delete)
   */
  async deleteUser(adminId: string, userId: string) {
    this.logger.log(`[ADMIN] Eliminando usuario ${userId}`);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // CHANGE: Soft delete
    await this.prisma.user.update({
      where: { id: userId },
      data: { active: false },
    });

    // CHANGE: Logging
    await this.prisma.activityLog.create({
      data: {
        userId: adminId,
        entityType: 'USER',
        entityId: userId,
        action: 'DELETED',
        details: {
          userEmail: user.email,
          softDelete: true,
        },
      },
    });

    this.logger.log(`✅ [ADMIN] Usuario ${user.email} desactivado`);

    return { success: true, message: 'Usuario desactivado' };
  }

  /**
   * CHANGE: Listar empresas
   */
  async listCompanies() {
    this.logger.log('[ADMIN] Listando empresas');

    const companies = await this.prisma.company.findMany({
      include: {
        _count: {
          select: {
            users: true,
            units: true,
            partners: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return companies;
  }

  /**
   * CHANGE: Estadísticas globales
   */
  async getStats() {
    this.logger.log('[ADMIN] Obteniendo estadísticas globales');

    const [
      totalUsers,
      totalCompanies,
      totalUnits,
      totalDevices,
      totalPartners,
      recentLogs,
    ] = await Promise.all([
      this.prisma.user.count({ where: { active: true } }),
      this.prisma.company.count({ where: { active: true } }),
      this.prisma.unit.count(),
      this.prisma.device.count(),
      this.prisma.partner.count({ where: { active: true } }),
      this.prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              fullName: true,
            },
          },
        },
      }),
    ]);

    return {
      users: totalUsers,
      companies: totalCompanies,
      units: totalUnits,
      devices: totalDevices,
      partners: totalPartners,
      recentActivity: recentLogs,
    };
  }
}
