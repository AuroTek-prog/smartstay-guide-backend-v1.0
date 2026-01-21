import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AddPartnerZoneDto, CreatePartnerDto, UpdatePartnerDto } from './partners.dto';

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters?: {
    typeId?: string;
    userId?: string;
    active?: boolean;
    isTop?: boolean;
    companyId?: string;
  }) {
    return this.prisma.partner.findMany({
      where: {
        typeId: filters?.typeId,
        userId: filters?.userId,
        active: filters?.active,
        isTop: filters?.isTop,
        companyId: filters?.companyId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        type: true,
      },
    });
  }

  async getByCompanyId(companyId: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { companyId },
      include: { type: true, user: true },
    });

    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    return partner;
  }

  async create(payload: CreatePartnerDto) {
    return this.prisma.partner.create({
      data: {
        companyId: payload.companyId,
        typeId: payload.typeId,
        description: payload.description,
        image: payload.image,
        active: payload.active,
        isTop: payload.isTop,
        redirectUrl: payload.redirectUrl,
        userId: payload.userId,
      },
    });
  }

  async update(companyId: string, payload: UpdatePartnerDto) {
    await this.getByCompanyId(companyId);

    return this.prisma.partner.update({
      where: { companyId },
      data: {
        typeId: payload.typeId,
        description: payload.description,
        image: payload.image,
        active: payload.active,
        isTop: payload.isTop,
        redirectUrl: payload.redirectUrl,
        userId: payload.userId,
      },
    });
  }

  async remove(companyId: string) {
    await this.getByCompanyId(companyId);
    return this.prisma.partner.delete({
      where: { companyId },
    });
  }

  async listZones(companyId: string) {
    return this.prisma.partnerZone.findMany({
      where: { companyId },
      include: { zone: true },
    });
  }

  async addZone(companyId: string, payload: AddPartnerZoneDto) {
    return this.prisma.partnerZone.create({
      data: {
        companyId,
        zoneId: payload.zoneId,
      },
    });
  }

  async removeZone(companyId: string, zoneId: string) {
    return this.prisma.partnerZone.delete({
      where: {
        companyId_zoneId: {
          companyId,
          zoneId,
        },
      },
    });
  }
}
