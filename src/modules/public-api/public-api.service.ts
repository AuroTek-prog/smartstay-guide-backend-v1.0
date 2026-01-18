import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { IoTService } from '../iot/iot.service';

@Injectable()
export class PublicApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly iotService: IoTService,
  ) {}

  async getGuide(slug: string, language: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { slug },
      include: {
        company: true,
        city: true,
        zone: true,
        wifi: true,
        media: true,
        devices: {
          where: { active: true },
          include: {
            type: true,
          },
        },
        rules: {
          include: {
            rule: true,
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException(`Apartment not found`);
    }

    // Get partners in the same zone
    const partners = unit.zoneId ? await this.prisma.partner.findMany({
      where: {
        active: true,
        zones: {
          some: {
            zoneId: unit.zoneId,
          },
        },
      },
      include: {
        company: true,
        type: true,
      },
      orderBy: {
        isTop: 'desc',
      },
    }) : [];

    return {
      apartment: {
        name: unit.name,
        address: unit.address,
        city: unit.city?.name,
        zone: unit.zone?.name,
      },
      essentials: {
        wifi: unit.wifi
          ? {
              network: unit.wifi.network,
              password: unit.wifi.password?.toString(),
            }
          : null,
        rules: unit.rules.map((r) => ({
          id: r.rule.id,
          title: r.rule.title,
        })),
      },
      devices: unit.devices.map((d) => ({
        id: d.id,
        type: d.type?.name,
      })),
      recommendations: partners.map((p) => ({
        id: p.companyId,
        name: p.company.name,
        type: p.type?.name,
        description: p.description,
        image: p.image,
        isTop: p.isTop,
        url: p.redirectUrl,
      })),
      media: unit.media
        .filter((m) => m.purpose === 'portada' || m.purpose === 'gallery')
        .map((m) => ({
          type: m.purpose,
          url: m.url,
        })),
    };
  }

  async getEssentials(slug: string, language: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { slug },
      include: {
        wifi: true,
        rules: {
          include: {
            rule: true,
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException(`Apartment not found`);
    }

    return {
      wifi: unit.wifi
        ? {
            network: unit.wifi.network,
            password: unit.wifi.password?.toString(),
          }
        : null,
      rules: unit.rules.map((r) => ({
        id: r.rule.id,
        title: r.rule.title,
      })),
    };
  }

  async getRecommendations(slug: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { slug },
      select: {
        zoneId: true,
      },
    });

    if (!unit) {
      throw new NotFoundException(`Apartment not found`);
    }

    const partners = unit.zoneId ? await this.prisma.partner.findMany({
      where: {
        active: true,
        zones: {
          some: {
            zoneId: unit.zoneId,
          },
        },
      },
      include: {
        company: true,
        type: true,
      },
      orderBy: {
        isTop: 'desc',
      },
    }) : [];

    return partners.map((p) => ({
      id: p.companyId,
      name: p.company.name,
      type: p.type?.name,
      description: p.description,
      image: p.image,
      isTop: p.isTop,
      url: p.redirectUrl,
    }));
  }

  /**
   * SECURITY FIX: openLock con validación completa de token temporal
   * 
   * 1. Valida token contra AccessCredential
   * 2. Verifica asociación device ↔ apartment
   * 3. Ejecuta apertura
   * 4. Revoca token (one-time use)
   * 5. Registra acceso en AccessLog
   */
  async openLock(slug: string, deviceId: string, token: string, ip?: string) {
    // 1. Validar token temporal
    const credential = await this.prisma.accessCredential.findFirst({
      where: {
        deviceId,
        validFrom: { lte: new Date() },
        validTo: { gte: new Date() },
        revoked: false,
      },
    });

    if (!credential) {
      await this.logUnauthorizedAccess(slug, deviceId, ip);
      throw new UnauthorizedException('Token inválido o expirado');
    }

    // 2. Validar asociación device ↔ apartment
    const device = await this.prisma.device.findFirst({
      where: {
        id: deviceId,
        unit: { slug, published: true },
        active: true,
      },
      include: { unit: true },
    });

    if (!device || !device.unit) {
      throw new NotFoundException('Device not found for this apartment');
    }

    // 3. Ejecutar apertura
    const result = await this.iotService.openLock(device);

    if (!result.success) {
      throw new BadRequestException(result.error || result.message);
    }

    // 4. Revocar token (one-time use)
    await this.prisma.accessCredential.update({
      where: { id: credential.id },
      data: { revoked: true },
    });

    // 5. Registrar acceso exitoso
    await this.prisma.accessLog.create({
      data: {
        unitId: device.unit.id,
        deviceId: device.id,
        action: 'unlock',
        success: true,
        ipAddress: ip,
        userAgent: 'public-api',
      },
    });

    return {
      success: result.success,
      message: result.message,
      deviceId: device.id,
      timestamp: result.timestamp.toISOString(),
      metadata: result.metadata,
    };
  }

  /**
   * Registra intento de acceso no autorizado
   */
  private async logUnauthorizedAccess(slug: string, deviceId: string, ip?: string) {
    const unit = await this.prisma.unit.findUnique({ where: { slug } });
    if (!unit) return;

    await this.prisma.accessLog.create({
      data: {
        unitId: unit.id,
        deviceId,
        action: 'unlock',
        success: false,
        ipAddress: ip,
        userAgent: 'public-api-unauthorized',
      },
    });
  }
}
