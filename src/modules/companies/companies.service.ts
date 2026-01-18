import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateCompanyDto, UpdateCompanyDto } from './companies.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async create(payload: CreateCompanyDto) {
    return this.prisma.company.create({
      data: {
        name: payload.name,
        slug: payload.slug,
        legalName: payload.legalName,
        taxId: payload.taxId,
        countryId: payload.countryId,
        active: payload.active,
      },
    });
  }

  async update(id: string, payload: UpdateCompanyDto) {
    await this.getById(id);

    return this.prisma.company.update({
      where: { id },
      data: {
        name: payload.name,
        slug: payload.slug,
        legalName: payload.legalName,
        taxId: payload.taxId,
        countryId: payload.countryId,
        active: payload.active,
      },
    });
  }

  async remove(id: string) {
    await this.getById(id);

    return this.prisma.company.delete({
      where: { id },
    });
  }
}
