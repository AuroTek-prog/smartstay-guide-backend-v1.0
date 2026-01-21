import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreatePartnerTypeDto, UpdatePartnerTypeDto } from './partner-types.dto';

@Injectable()
export class PartnerTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.partnerType.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async getById(id: string) {
    const type = await this.prisma.partnerType.findUnique({ where: { id } });
    if (!type) {
      throw new NotFoundException('Partner type not found');
    }
    return type;
  }

  async create(payload: CreatePartnerTypeDto) {
    return this.prisma.partnerType.create({
      data: {
        id: payload.id,
        name: payload.name,
      },
    });
  }

  async update(id: string, payload: UpdatePartnerTypeDto) {
    await this.getById(id);
    return this.prisma.partnerType.update({
      where: { id },
      data: {
        name: payload.name,
      },
    });
  }

  async remove(id: string) {
    await this.getById(id);
    return this.prisma.partnerType.delete({
      where: { id },
    });
  }
}
