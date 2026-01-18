import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

/**
 * CHANGE: AnalyticsService - Métricas y estadísticas (FASE 10)
 * 
 * Funcionalidades:
 * - Métricas por apartamento
 * - Logs de acceso
 * - Estadísticas de uso
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * CHANGE: Métricas de apartamentos
   */
  async getApartmentMetrics(companyId?: string) {
    this.logger.log('[ANALYTICS] Obteniendo métricas de apartamentos');

    const where = companyId ? { companyId } : {};

    const [total, published, withDevices] = await Promise.all([
      this.prisma.unit.count({ where }),
      this.prisma.unit.count({ where: { ...where, published: true } }),
      this.prisma.unit.count({
        where: {
          ...where,
          devices: {
            some: {},
          },
        },
      }),
    ]);

    return {
      total,
      published,
      withDevices,
      publishRate: total > 0 ? (published / total) * 100 : 0,
    };
  }

  /**
   * CHANGE: Logs de acceso recientes
   */
  async getAccessLogs(limit: number = 50) {
    this.logger.log('[ANALYTICS] Obteniendo logs de acceso');

    const logs = await this.prisma.accessLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        unit: {
          select: {
            name: true,
            slug: true,
          },
        },
        device: {
          select: {
            name: true,
            provider: true,
          },
        },
      },
    });

    return logs;
  }

  /**
   * CHANGE: Estadísticas de éxito/fallo de accesos
   */
  async getAccessStats(unitId?: string) {
    this.logger.log('[ANALYTICS] Obteniendo estadísticas de accesos');

    const where = unitId ? { unitId } : {};

    const [total, successful, failed] = await Promise.all([
      this.prisma.accessLog.count({ where }),
      this.prisma.accessLog.count({ where: { ...where, success: true } }),
      this.prisma.accessLog.count({ where: { ...where, success: false } }),
    ]);

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
    };
  }
}
