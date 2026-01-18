import { Injectable, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { EncryptionService } from '../../common/encryption.service';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';

/**
 * CHANGE: ManagerService - Lógica de negocio para gestión de apartamentos
 * 
 * Responsabilidades:
 * - CRUD completo de apartamentos (Unit)
 * - Encriptación automática de datos sensibles
 * - Logging en ActivityLog
 * - Validación de permisos (usuario pertenece a la compañía)
 * - Soft delete
 */
@Injectable()
export class ManagerService {
  private readonly logger = new Logger(ManagerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * CHANGE: Crear nuevo apartamento
   * - Valida que el usuario pertenezca a una compañía
   * - Encripta accessCode si existe
   * - Registra en ActivityLog
   */
  async createApartment(userId: string, dto: CreateApartmentDto) {
    this.logger.log(`[CREATE] Usuario ${userId} creando apartamento: ${dto.slug}`);

    // CHANGE: Verificar que el usuario pertenece a una compañía
    const userCompany = await this.prisma.userCompany.findFirst({
      where: { userId },
      include: { company: true },
    });

    if (!userCompany) {
      throw new ForbiddenException('Usuario no asociado a ninguna compañía');
    }

    // CHANGE: Encriptar código de acceso si existe
    let encryptedAccessCode: string | null = null;
    if (dto.accessCode) {
      encryptedAccessCode = this.encryption.encrypt(dto.accessCode);
      this.logger.log(`[ENCRYPT] Código de acceso encriptado para ${dto.slug}`);
    }

    // CHANGE: Crear apartamento
    const apartment = await this.prisma.unit.create({
      data: {
        companyId: userCompany.companyId,
        slug: dto.slug,
        name: dto.name,
        address: dto.address,
        cityId: dto.cityId,
        zoneId: dto.zoneId,
        lat: dto.lat,
        lng: dto.lng,
        images: dto.images as any,
        hostName: dto.hostName,
        hostPhone: dto.hostPhone,
        hostPhoto: dto.hostPhoto,
        accessType: dto.accessType,
        accessCode: encryptedAccessCode,
        accessInstructions: dto.accessInstructions as any,
        languages: dto.languages || ['es'],
        published: dto.published ?? false,
      },
    });

    // CHANGE: Registrar en ActivityLog
    await this.prisma.activityLog.create({
      data: {
        userId,
        entityType: 'APARTMENT',
        entityId: apartment.id,
        action: 'CREATED',
        details: {
          apartmentName: apartment.name,
          slug: apartment.slug,
          companyId: userCompany.companyId || 'N/A',
        },
      },
    });

    this.logger.log(`✅ [CREATE] Apartamento ${apartment.slug} creado (ID: ${apartment.id})`);

    return apartment;
  }

  /**
   * CHANGE: Listar apartamentos de la compañía del usuario
   * - Solo retorna apartamentos de la compañía del usuario
   * - NO incluye datos sensibles (accessCode)
   */
  async listApartments(userId: string) {
    this.logger.log(`[LIST] Usuario ${userId} listando apartamentos`);

    // CHANGE: Obtener compañías del usuario
    const userCompanies = await this.prisma.userCompany.findMany({
      where: { userId },
      select: { companyId: true },
    });

    if (userCompanies.length === 0) {
      return [];
    }

    const companyIds = userCompanies.map((uc) => uc.companyId);

    // CHANGE: Listar apartamentos (sin accessCode)
    const apartments = await this.prisma.unit.findMany({
      where: {
        companyId: { in: companyIds },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        address: true,
        cityId: true,
        zoneId: true,
        lat: true,
        lng: true,
        images: true,
        hostName: true,
        hostPhone: true,
        hostPhoto: true,
        accessType: true,
        // CHANGE: NO incluir accessCode por seguridad
        accessInstructions: true,
        languages: true,
        published: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.log(`📋 [LIST] Retornando ${apartments.length} apartamentos`);

    return apartments;
  }

  /**
   * CHANGE: Obtener datos sensibles de un apartamento
   * - Desencripta accessCode
   * - Solo accesible por usuarios de la compañía propietaria
   */
  async getApartmentSecrets(userId: string, apartmentId: string) {
    this.logger.log(`[SECRETS] Usuario ${userId} solicitando datos sensibles de ${apartmentId}`);

    // CHANGE: Verificar permisos
    const apartment = await this.prisma.unit.findUnique({
      where: { id: apartmentId },
      include: { company: true },
    });

    if (!apartment) {
      throw new NotFoundException('Apartamento no encontrado');
    }

    const userCompany = await this.prisma.userCompany.findFirst({
      where: {
        userId,
        companyId: apartment.companyId ?? undefined,
      },
    });

    if (!userCompany) {
      throw new ForbiddenException('No tienes permisos para ver estos datos');
    }

    // CHANGE: Desencriptar accessCode
    let decryptedAccessCode: string | null = null;
    if (apartment.accessCode) {
      decryptedAccessCode = this.encryption.decrypt(apartment.accessCode);
      this.logger.log(`[DECRYPT] Código de acceso desencriptado para ${apartment.slug}`);
    }

    // CHANGE: Registrar acceso a datos sensibles
    await this.prisma.activityLog.create({
      data: {
        userId,
        entityType: 'APARTMENT_SECRETS',
        entityId: apartment.id,
        action: 'VIEWED',
        details: {
          apartmentSlug: apartment.slug,
        },
      },
    });

    return {
      accessCode: decryptedAccessCode,
      wifiPassword: null, // CHANGE: Implementar desencriptación de WiFi si existe
    };
  }

  /**
   * CHANGE: Actualizar apartamento
   * - Re-encripta accessCode si cambió
   * - Registra en ActivityLog
   */
  async updateApartment(userId: string, apartmentId: string, dto: UpdateApartmentDto) {
    this.logger.log(`[UPDATE] Usuario ${userId} actualizando ${apartmentId}`);

    // CHANGE: Verificar permisos
    const apartment = await this.prisma.unit.findUnique({
      where: { id: apartmentId },
    });

    if (!apartment) {
      throw new NotFoundException('Apartamento no encontrado');
    }

    const userCompany = await this.prisma.userCompany.findFirst({
      where: {
        userId,
        companyId: apartment.companyId ?? undefined,
      },
    });

    if (!userCompany) {
      throw new ForbiddenException('No tienes permisos para modificar este apartamento');
    }

    // CHANGE: Encriptar accessCode si cambió
    let encryptedAccessCode: string | null | undefined;
    if (dto.accessCode !== undefined) {
      encryptedAccessCode = dto.accessCode ? this.encryption.encrypt(dto.accessCode) : null;
      this.logger.log(`[ENCRYPT] Código de acceso re-encriptado para ${apartment.slug}`);
    }

    // CHANGE: Actualizar
    const updated = await this.prisma.unit.update({
      where: { id: apartmentId },
      data: {
        ...(dto.slug && { slug: dto.slug }),
        ...(dto.name && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.cityId !== undefined && { cityId: dto.cityId }),
        ...(dto.zoneId !== undefined && { zoneId: dto.zoneId }),
        ...(dto.lat !== undefined && { lat: dto.lat }),
        ...(dto.lng !== undefined && { lng: dto.lng }),
        ...(dto.images !== undefined && { images: dto.images as any }),
        ...(dto.hostName !== undefined && { hostName: dto.hostName }),
        ...(dto.hostPhone !== undefined && { hostPhone: dto.hostPhone }),
        ...(dto.hostPhoto !== undefined && { hostPhoto: dto.hostPhoto }),
        ...(dto.accessType !== undefined && { accessType: dto.accessType }),
        ...(encryptedAccessCode !== undefined && { accessCode: encryptedAccessCode }),
        ...(dto.accessInstructions !== undefined && { accessInstructions: dto.accessInstructions as any }),
        ...(dto.languages !== undefined && { languages: dto.languages }),
        ...(dto.published !== undefined && { published: dto.published }),
      },
    });

    // CHANGE: Registrar actualización
    await this.prisma.activityLog.create({
      data: {
        userId,
        entityType: 'APARTMENT',
        entityId: apartmentId,
        action: 'UPDATED',
        details: {
          apartmentSlug: updated.slug,
          changes: Object.keys(dto),
        },
      },
    });

    this.logger.log(`✅ [UPDATE] Apartamento ${updated.slug} actualizado`);

    return updated;
  }

  /**
   * CHANGE: Eliminar apartamento (soft delete)
   * - Marca como published=false en lugar de eliminar
   * - Registra en ActivityLog
   */
  async deleteApartment(userId: string, apartmentId: string) {
    this.logger.log(`[DELETE] Usuario ${userId} eliminando ${apartmentId}`);

    // CHANGE: Verificar permisos
    const apartment = await this.prisma.unit.findUnique({
      where: { id: apartmentId },
    });

    if (!apartment) {
      throw new NotFoundException('Apartamento no encontrado');
    }

    const userCompany = await this.prisma.userCompany.findFirst({
      where: {
        userId,
        companyId: apartment.companyId ?? undefined,
      },
    });

    if (!userCompany) {
      throw new ForbiddenException('No tienes permisos para eliminar este apartamento');
    }

    // CHANGE: Soft delete - marcar como no publicado
    await this.prisma.unit.update({
      where: { id: apartmentId },
      data: { published: false },
    });

    // CHANGE: Registrar eliminación
    await this.prisma.activityLog.create({
      data: {
        userId,
        entityType: 'APARTMENT',
        entityId: apartmentId,
        action: 'DELETED',
        details: {
          apartmentSlug: apartment.slug,
          softDelete: true,
        },
      },
    });

    this.logger.log(`✅ [DELETE] Apartamento ${apartment.slug} marcado como no publicado`);

    return { success: true, message: 'Apartamento eliminado (soft delete)' };
  }

  /**
   * CHANGE: Publicar/despublicar apartamento
   * - Toggle del campo published
   * - Registra en ActivityLog
   */
  async togglePublish(userId: string, apartmentId: string) {
    this.logger.log(`[PUBLISH] Usuario ${userId} cambiando estado de publicación ${apartmentId}`);

    // CHANGE: Verificar permisos
    const apartment = await this.prisma.unit.findUnique({
      where: { id: apartmentId },
    });

    if (!apartment) {
      throw new NotFoundException('Apartamento no encontrado');
    }

    const userCompany = await this.prisma.userCompany.findFirst({
      where: {
        userId,
        companyId: apartment.companyId ?? undefined,
      },
    });

    if (!userCompany) {
      throw new ForbiddenException('No tienes permisos para publicar/despublicar este apartamento');
    }

    // CHANGE: Toggle published
    const updated = await this.prisma.unit.update({
      where: { id: apartmentId },
      data: { published: !apartment.published },
    });

    // CHANGE: Registrar cambio
    await this.prisma.activityLog.create({
      data: {
        userId,
        entityType: 'APARTMENT',
        entityId: apartmentId,
        action: updated.published ? 'PUBLISHED' : 'UNPUBLISHED',
        details: {
          apartmentSlug: apartment.slug,
          newStatus: updated.published,
        },
      },
    });

    this.logger.log(`✅ [PUBLISH] Apartamento ${apartment.slug} ${updated.published ? 'publicado' : 'despublicado'}`);

    return updated;
  }
}
