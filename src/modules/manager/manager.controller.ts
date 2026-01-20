import { Controller, Get, Post, Put, Delete, Body, Param, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { ManagerService } from './manager.service';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { CurrentUser } from '../firebase-auth/decorators/current-user.decorator';
import { RequireAuth } from '../firebase-auth/decorators/require-auth.decorator';
import { FirebaseUser } from '../firebase-auth/interfaces/firebase-user.interface';
import { resolveUserId } from '../../common/auth/user-context';

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
@RequireAuth()
export class ManagerController {
  private readonly logger = new Logger(ManagerController.name);

  constructor(private readonly managerService: ManagerService) {}

  /**
   * CHANGE: Crear nuevo apartamento
   */
  @Post()
  @ApiOperation({
    summary: 'Crear apartamento',
    description: 'Crea un apartamento asociado a la compania del usuario.',
  })
  @ApiBody({ type: CreateApartmentDto })
  @ApiResponse({ status: 201, description: 'Apartamento creado exitosamente' })
  @ApiResponse({ status: 403, description: 'Usuario no asociado a una compañía' })
  @ApiBearerAuth()
  async create(
    @Body() createApartmentDto: CreateApartmentDto,
    @CurrentUser() user: FirebaseUser | undefined,
  ) {
    const userId = resolveUserId(user);
    this.logger.log(`[POST /apartments] Usuario ${userId} creando apartamento`);
    return this.managerService.createApartment(userId, createApartmentDto);
  }

  /**
   * CHANGE: Listar apartamentos de la compañía del usuario
   */
  @Get()
  @ApiOperation({
    summary: 'Listar apartamentos',
    description: 'Lista apartamentos de la compania del usuario.',
  })
  @ApiResponse({ status: 200, description: 'Lista de apartamentos (sin datos sensibles)' })
  @ApiBearerAuth()
  async list(@CurrentUser() user?: FirebaseUser) {
    const userId = resolveUserId(user);
    this.logger.log(`[GET /apartments] Usuario ${userId} listando apartamentos`);
    return this.managerService.listApartments(userId);
  }

  /**
   * CHANGE: Obtener datos sensibles de un apartamento (desencriptados)
   */
  @Get(':id/secrets')
  @ApiOperation({
    summary: 'Obtener datos sensibles',
    description: 'Devuelve accessCode desencriptado si el usuario tiene permisos.',
  })
  @ApiParam({ name: 'id', description: 'ID del apartamento', example: '11111111-1111-1111-1111-111111111111' })
  @ApiResponse({ status: 200, description: 'Datos sensibles desencriptados' })
  @ApiResponse({ status: 403, description: 'Sin permisos para ver estos datos' })
  @ApiResponse({ status: 404, description: 'Apartamento no encontrado' })
  @ApiBearerAuth()
  async getSecrets(
    @Param('id') apartmentId: string,
    @CurrentUser() user: FirebaseUser | undefined,
  ) {
    const userId = resolveUserId(user);
    this.logger.log(`[GET /apartments/${apartmentId}/secrets] Usuario ${userId}`);
    return this.managerService.getApartmentSecrets(userId, apartmentId);
  }

  /**
   * CHANGE: Actualizar apartamento
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar apartamento',
    description: 'Actualiza datos del apartamento.',
  })
  @ApiParam({ name: 'id', description: 'ID del apartamento', example: '11111111-1111-1111-1111-111111111111' })
  @ApiBody({ type: UpdateApartmentDto })
  @ApiResponse({ status: 200, description: 'Apartamento actualizado' })
  @ApiResponse({ status: 403, description: 'Sin permisos para modificar' })
  @ApiResponse({ status: 404, description: 'Apartamento no encontrado' })
  @ApiBearerAuth()
  async update(
    @Param('id') apartmentId: string,
    @Body() updateApartmentDto: UpdateApartmentDto,
    @CurrentUser() user: FirebaseUser | undefined,
  ) {
    const userId = resolveUserId(user);
    this.logger.log(`[PUT /apartments/${apartmentId}] Usuario ${userId}`);
    return this.managerService.updateApartment(userId, apartmentId, updateApartmentDto);
  }

  /**
   * CHANGE: Eliminar apartamento (soft delete)
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar apartamento (soft delete)',
    description: 'Marca el apartamento como no publicado.',
  })
  @ApiParam({ name: 'id', description: 'ID del apartamento', example: '11111111-1111-1111-1111-111111111111' })
  @ApiResponse({ status: 200, description: 'Apartamento eliminado (marcado como no publicado)' })
  @ApiResponse({ status: 403, description: 'Sin permisos para eliminar' })
  @ApiResponse({ status: 404, description: 'Apartamento no encontrado' })
  @ApiBearerAuth()
  async delete(
    @Param('id') apartmentId: string,
    @CurrentUser() user: FirebaseUser | undefined,
  ) {
    const userId = resolveUserId(user);
    this.logger.log(`[DELETE /apartments/${apartmentId}] Usuario ${userId}`);
    return this.managerService.deleteApartment(userId, apartmentId);
  }

  /**
   * CHANGE: Publicar/despublicar apartamento
   */
  @Post(':id/publish')
  @ApiOperation({
    summary: 'Publicar/despublicar apartamento',
    description: 'Alterna el estado de publicacion del apartamento.',
  })
  @ApiParam({ name: 'id', description: 'ID del apartamento', example: '11111111-1111-1111-1111-111111111111' })
  @ApiResponse({ status: 200, description: 'Estado de publicación cambiado' })
  @ApiResponse({ status: 403, description: 'Sin permisos' })
  @ApiResponse({ status: 404, description: 'Apartamento no encontrado' })
  @ApiBearerAuth()
  async togglePublish(
    @Param('id') apartmentId: string,
    @CurrentUser() user: FirebaseUser | undefined,
  ) {
    const userId = resolveUserId(user);
    this.logger.log(`[POST /apartments/${apartmentId}/publish] Usuario ${userId}`);
    return this.managerService.togglePublish(userId, apartmentId);
  }
}
