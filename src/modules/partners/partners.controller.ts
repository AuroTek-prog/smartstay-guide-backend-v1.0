import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequireAuth } from '../firebase-auth/decorators/require-auth.decorator';
import { AddPartnerZoneDto, CreatePartnerDto, UpdatePartnerDto } from './partners.dto';
import { PartnersService } from './partners.service';

@ApiTags('Partners')
@Controller('partners')
@RequireAuth()
@ApiBearerAuth()
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar partners' })
  @ApiQuery({ name: 'typeId', required: false, description: 'Filtrar por tipo' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filtrar por usuario' })
  @ApiQuery({ name: 'active', required: false, description: 'Filtrar por activo (true/false)' })
  @ApiQuery({ name: 'isTop', required: false, description: 'Filtrar por destacado (true/false)' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filtrar por companyId' })
  @ApiResponse({ status: 200, description: 'Lista de partners' })
  list(
    @Query('typeId') typeId?: string,
    @Query('userId') userId?: string,
    @Query('active') active?: string,
    @Query('isTop') isTop?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.partnersService.list({
      typeId,
      userId,
      companyId,
      active: active === undefined ? undefined : active === 'true',
      isTop: isTop === undefined ? undefined : isTop === 'true',
    });
  }

  @Get(':companyId')
  @ApiOperation({ summary: 'Obtener partner por companyId' })
  @ApiParam({ name: 'companyId', description: 'UUID de la company', example: '11111111-1111-1111-1111-111111111111' })
  @ApiResponse({ status: 200, description: 'Partner encontrado' })
  @ApiResponse({ status: 404, description: 'Partner no encontrado' })
  getByCompanyId(@Param('companyId') companyId: string) {
    return this.partnersService.getByCompanyId(companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear partner' })
  @ApiBody({ type: CreatePartnerDto })
  @ApiResponse({ status: 201, description: 'Partner creado' })
  create(@Body() payload: CreatePartnerDto) {
    return this.partnersService.create(payload);
  }

  @Patch(':companyId')
  @ApiOperation({ summary: 'Actualizar partner' })
  @ApiParam({ name: 'companyId', description: 'UUID de la company', example: '11111111-1111-1111-1111-111111111111' })
  @ApiBody({ type: UpdatePartnerDto })
  @ApiResponse({ status: 200, description: 'Partner actualizado' })
  @ApiResponse({ status: 404, description: 'Partner no encontrado' })
  update(@Param('companyId') companyId: string, @Body() payload: UpdatePartnerDto) {
    return this.partnersService.update(companyId, payload);
  }

  @Delete(':companyId')
  @ApiOperation({ summary: 'Eliminar partner' })
  @ApiParam({ name: 'companyId', description: 'UUID de la company', example: '11111111-1111-1111-1111-111111111111' })
  @ApiResponse({ status: 200, description: 'Partner eliminado' })
  @ApiResponse({ status: 404, description: 'Partner no encontrado' })
  remove(@Param('companyId') companyId: string) {
    return this.partnersService.remove(companyId);
  }

  @Get(':companyId/zones')
  @ApiOperation({ summary: 'Listar zonas de partner' })
  @ApiParam({ name: 'companyId', description: 'UUID de la company', example: '11111111-1111-1111-1111-111111111111' })
  @ApiResponse({ status: 200, description: 'Zonas del partner' })
  listZones(@Param('companyId') companyId: string) {
    return this.partnersService.listZones(companyId);
  }

  @Post(':companyId/zones')
  @ApiOperation({ summary: 'Agregar zona a partner' })
  @ApiParam({ name: 'companyId', description: 'UUID de la company', example: '11111111-1111-1111-1111-111111111111' })
  @ApiBody({ type: AddPartnerZoneDto })
  @ApiResponse({ status: 201, description: 'Zona agregada' })
  addZone(@Param('companyId') companyId: string, @Body() payload: AddPartnerZoneDto) {
    return this.partnersService.addZone(companyId, payload);
  }

  @Delete(':companyId/zones/:zoneId')
  @ApiOperation({ summary: 'Eliminar zona de partner' })
  @ApiParam({ name: 'companyId', description: 'UUID de la company', example: '11111111-1111-1111-1111-111111111111' })
  @ApiParam({ name: 'zoneId', description: 'UUID de la zona', example: '22222222-2222-2222-2222-222222222222' })
  @ApiResponse({ status: 200, description: 'Zona eliminada' })
  removeZone(@Param('companyId') companyId: string, @Param('zoneId') zoneId: string) {
    return this.partnersService.removeZone(companyId, zoneId);
  }
}
