import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class GuidesService {
  constructor(private readonly prisma: PrismaService) {}

  async getGuide(slug: string, language: string) {
    // Find unit by slug
    const unit = await this.prisma.unit.findUnique({
      where: { slug },
      include: {
        company: true,
        city: true,
        zone: true,
        wifi: true,
        media: true,
        devices: {
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
      throw new NotFoundException(`Unit with slug ${slug} not found`);
    }

    // Check if guide is already generated
    let guide = await this.prisma.guideGenerated.findUnique({
      where: {
        unitId_language: {
          unitId: unit.id,
          language,
        },
      },
    });

    // If not generated, generate it
    if (!guide) {
      guide = await this.generateGuide(unit.id, language);
    }

    return {
      unit: {
        id: unit.id,
        slug: unit.slug,
        name: unit.name,
        address: unit.address,
      },
      guide: guide.payloadJson,
      generatedAt: guide.updatedAt,
    };
  }

  async generateGuide(unitId: string, language: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
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
      throw new NotFoundException(`Unit with ID ${unitId} not found`);
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

    // Generate guide payload
    const payload = {
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
          semantic: r.rule.uiSemantic,
        })),
      },
      devices: unit.devices.map((d) => ({
        id: d.id,
        type: d.type?.name,
        provider: d.provider,
        externalId: d.externalDeviceId,
      })),
      recommendations: partners.map((p) => ({
        id: p.companyId,
        name: p.company.name,
        type: p.type?.name,
        description: p.description,
        image: p.image,
        isTop: p.isTop,
        redirectUrl: p.redirectUrl,
      })),
      media: unit.media.map((m) => ({
        id: m.id,
        type: m.mediaType,
        purpose: m.purpose,
        url: m.url,
      })),
    };

    // Save or update guide
    const guide = await this.prisma.guideGenerated.upsert({
      where: {
        unitId_language: {
          unitId,
          language,
        },
      },
      create: {
        unitId,
        language,
        payloadJson: payload,
      },
      update: {
        payloadJson: payload,
      },
    });

    return guide;
  }
}
