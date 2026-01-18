import { Controller, Get, Post, Put, Delete, Body, Param, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ManagerService } from './manager.service';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { CurrentUser } from '../firebase-auth/decorators/current-user.decorator';
import { OptionalAuth } from '../firebase-auth/decorators/optional-auth.decorator';

/**
 * CHANGE: ManagerController - Endpoints de gestión de apartamentos
 * 
 * Rutas:
 * - POST   /api/manager/apartments         → Crear apartamento
 * - GET    /api/manager/apartments         → Listar apartamentos
 * - GET    /api/manager/apartments/:id/secrets → Obtener datos sensibles
 * - PUT    /api/manager/apartments/:id     → Actualizar apartamento
 * - DELETE /api/manager/apartments/:id     → Eliminar (soft delete)
 * - POST   /api/manager/apartments/:id/publish → Publicar/despublicar
 * 
 * Autenticación: Opcional (Firebase Auth)
 * - Si Firebase está habilitado: Requiere token válido
 * - Si Firebase está deshabilitado: Usa userId dummy para testing
 */
@ApiTags('Manager')
@Controller('api/manager/apartments')
@OptionalAuth()
export class ManagerController {
  private readonly logger = new Logger(ManagerController.name);

  constructor(private readonly managerService: ManagerService) {}

  /**
   * CHANGE: Crear nuevo apartamento
   */
  @Post()
  @ApiOperation({ summary: 'Crear apartamento' })
  @ApiResponse({ status: 201, description: 'Apartamento creado exitosamente' })
  @ApiResponse({ status: 403, description: 'Usuario no asociado a una compañía' })
  @ApiBearerAuth()
  async create(
    @CurrentUser() user: any,
    @Body() createApartmentDto: CreateApartmentDto,
  ) {
    const userId = user?.uid || 'demo-user';
    this.logger.log(`[POST /apartments] Usuario ${userId} creando apartamento`);
    return this.managerService.createApartment(userId, createApartmentDto);
  }

  /**
   * CHANGE: Listar apartamentos de la compañía del usuario
   */
  @Get()
  @ApiOperation({ summary: 'Listar apartamentos' })
  @ApiResponse({ status: 200, description: 'Lista de apartamentos (sin datos sensibles)' })
  @ApiBearerAuth()
  async list(@CurrentUser() user: any) {
    const userId = user?.uid || 'demo-user';
    this.logger.log(`[GET /apartments] Usuario ${userId} listando apartamentos`);
    return this.managerService.listApartments(userId);
  }

  /**
   * CHANGE: Obtener datos sensibles de un apartamento (desencriptados)
   */
  @Get(':id/secrets')
  @ApiOperation({ summary: 'Obtener datos sensibles (accessCode desencriptado)' })
  @ApiResponse({ status: 200, description: 'Datos sensibles desencriptados' })
  @ApiResponse({ status: 403, description: 'Sin permisos para ver estos datos' })
  @ApiResponse({ status: 404, description: 'Apartamento no encontrado' })
  @ApiBearerAuth()
  async getSecrets(
    @CurrentUser() user: any,
    @Param('id') apartmentId: string,
  ) {
    const userId = user?.uid || 'demo-user';
    this.logger.log(`[GET /apartments/${apartmentId}/secrets] Usuario ${userId}`);
    return this.managerService.getApartmentSecrets(userId, apartmentId);
  }

  /**
   * CHANGE: Actualizar apartamento
   */
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar apartamento' })
  @ApiResponse({ status: 200, description: 'Apartamento actualizado' })
  @ApiResponse({ status: 403, description: 'Sin permisos para modificar' })
  @ApiResponse({ status: 404, description: 'Apartamento no encontrado' })
  @ApiBearerAuth()
  async update(
    @CurrentUser() user: any,
    @Param('id') apartmentId: string,
    @Body() updateApartmentDto: UpdateApartmentDto,
  ) {
    const userId = user?.uid || 'demo-user';
    this.logger.log(`[PUT /apartments/${apartmentId}] Usuario ${userId}`);
    return this.managerService.updateApartment(userId, apartmentId, updateApartmentDto);
  }

  /**
   * CHANGE: Eliminar apartamento (soft delete)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar apartamento (soft delete)' })
  @ApiResponse({ status: 200, description: 'Apartamento eliminado (marcado como no publicado)' })
  @ApiResponse({ status: 403, description: 'Sin permisos para eliminar' })
  @ApiResponse({ status: 404, description: 'Apartamento no encontrado' })
  @ApiBearerAuth()
  async delete(
    @CurrentUser() user: any,
    @Param('id') apartmentId: string,
  ) {
    const userId = user?.uid || 'demo-user';
    this.logger.log(`[DELETE /apartments/${apartmentId}] Usuario ${userId}`);
    return this.managerService.deleteApartment(userId, apartmentId);
  }

  /**
   * CHANGE: Publicar/despublicar apartamento
   */
  @Post(':id/publish')
  @ApiOperation({ summary: 'Publicar/despublicar apartamento' })
  @ApiResponse({ status: 200, description: 'Estado de publicación cambiado' })
  @ApiResponse({ status: 403, description: 'Sin permisos' })
  @ApiResponse({ status: 404, description: 'Apartamento no encontrado' })
  @ApiBearerAuth()
  async togglePublish(
    @CurrentUser() user: any,
    @Param('id') apartmentId: string,
  ) {
    const userId = user?.uid || 'demo-user';
    this.logger.log(`[POST /apartments/${apartmentId}/publish] Usuario ${userId}`);
    return this.managerService.togglePublish(userId, apartmentId);
  }
}
