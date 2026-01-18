import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateUnitDto, UpdateUnitDto } from './units.dto';

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.unit.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    return unit;
  }

  async create(payload: CreateUnitDto) {
    return this.prisma.unit.create({
      data: {
        companyId: payload.companyId,
        slug: payload.slug,
        name: payload.name,
        address: payload.address,
        cityId: payload.cityId,
        zoneId: payload.zoneId,
      },
    });
  }

  async update(id: string, payload: UpdateUnitDto) {
    await this.getById(id);

    return this.prisma.unit.update({
      where: { id },
      data: {
        slug: payload.slug,
        name: payload.name,
        address: payload.address,
        cityId: payload.cityId,
        zoneId: payload.zoneId,
      },
    });
  }

  async remove(id: string) {
    await this.getById(id);

    return this.prisma.unit.delete({
      where: { id },
    });
  }
}
