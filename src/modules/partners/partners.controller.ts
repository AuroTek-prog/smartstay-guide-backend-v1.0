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
  @ApiResponse({
    status: 200,
    description: 'Lista de partners',
    schema: {
      example: [
        {
          companyId: '11111111-1111-1111-1111-111111111111',
          typeId: 'RESTAURANT',
          description: 'Restaurante demo',
          image: 'https://cdn.example.com/logo.png',
          active: true,
          isTop: false,
          redirectUrl: 'https://partner.example.com',
          userId: '22222222-2222-2222-2222-222222222222',
          createdAt: '2026-01-20T10:00:00.000Z',
          updatedAt: '2026-01-20T10:00:00.000Z',
          type: { id: 'RESTAURANT', name: 'Restaurante' },
        },
      ],
    },
  })
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
  @ApiResponse({
    status: 200,
    description: 'Partner encontrado',
    schema: {
      example: {
        companyId: '11111111-1111-1111-1111-111111111111',
        typeId: 'RESTAURANT',
        description: 'Restaurante demo',
        active: true,
        isTop: false,
        redirectUrl: 'https://partner.example.com',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Partner no encontrado' })
  getByCompanyId(@Param('companyId') companyId: string) {
    return this.partnersService.getByCompanyId(companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear partner' })
  @ApiBody({ type: CreatePartnerDto })
  @ApiResponse({
    status: 201,
    description: 'Partner creado',
    schema: {
      example: {
        companyId: '11111111-1111-1111-1111-111111111111',
        typeId: 'RESTAURANT',
        description: 'Restaurante demo',
        active: true,
        isTop: false,
        redirectUrl: 'https://partner.example.com',
      },
    },
  })
  create(@Body() payload: CreatePartnerDto) {
    return this.partnersService.create(payload);
  }

  @Patch(':companyId')
  @ApiOperation({ summary: 'Actualizar partner' })
  @ApiParam({ name: 'companyId', description: 'UUID de la company', example: '11111111-1111-1111-1111-111111111111' })
  @ApiBody({ type: UpdatePartnerDto })
  @ApiResponse({
    status: 200,
    description: 'Partner actualizado',
    schema: {
      example: {
        companyId: '11111111-1111-1111-1111-111111111111',
        typeId: 'RESTAURANT',
        description: 'Restaurante actualizado',
        active: true,
        isTop: true,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Partner no encontrado' })
  update(@Param('companyId') companyId: string, @Body() payload: UpdatePartnerDto) {
    return this.partnersService.update(companyId, payload);
  }

  @Delete(':companyId')
  @ApiOperation({ summary: 'Eliminar partner' })
  @ApiParam({ name: 'companyId', description: 'UUID de la company', example: '11111111-1111-1111-1111-111111111111' })
  @ApiResponse({
    status: 200,
    description: 'Partner eliminado',
    schema: { example: { companyId: '11111111-1111-1111-1111-111111111111' } },
  })
  @ApiResponse({ status: 404, description: 'Partner no encontrado' })
  remove(@Param('companyId') companyId: string) {
    return this.partnersService.remove(companyId);
  }

  @Get(':companyId/zones')
  @ApiOperation({ summary: 'Listar zonas de partner' })
  @ApiParam({ name: 'companyId', description: 'UUID de la company', example: '11111111-1111-1111-1111-111111111111' })
  @ApiResponse({
    status: 200,
    description: 'Zonas del partner',
    schema: {
      example: [
        {
          companyId: '11111111-1111-1111-1111-111111111111',
          zoneId: '22222222-2222-2222-2222-222222222222',
          zone: { id: '22222222-2222-2222-2222-222222222222', name: 'Sol' },
        },
      ],
    },
  })
  listZones(@Param('companyId') companyId: string) {
    return this.partnersService.listZones(companyId);
  }

  @Post(':companyId/zones')
  @ApiOperation({ summary: 'Agregar zona a partner' })
  @ApiParam({ name: 'companyId', description: 'UUID de la company', example: '11111111-1111-1111-1111-111111111111' })
  @ApiBody({ type: AddPartnerZoneDto })
  @ApiResponse({
    status: 201,
    description: 'Zona agregada',
    schema: {
      example: {
        companyId: '11111111-1111-1111-1111-111111111111',
        zoneId: '22222222-2222-2222-2222-222222222222',
      },
    },
  })
  addZone(@Param('companyId') companyId: string, @Body() payload: AddPartnerZoneDto) {
    return this.partnersService.addZone(companyId, payload);
  }

  @Delete(':companyId/zones/:zoneId')
  @ApiOperation({ summary: 'Eliminar zona de partner' })
  @ApiParam({ name: 'companyId', description: 'UUID de la company', example: '11111111-1111-1111-1111-111111111111' })
  @ApiParam({ name: 'zoneId', description: 'UUID de la zona', example: '22222222-2222-2222-2222-222222222222' })
  @ApiResponse({
    status: 200,
    description: 'Zona eliminada',
    schema: {
      example: {
        companyId: '11111111-1111-1111-1111-111111111111',
        zoneId: '22222222-2222-2222-2222-222222222222',
      },
    },
  })
  removeZone(@Param('companyId') companyId: string, @Param('zoneId') zoneId: string) {
    return this.partnersService.removeZone(companyId, zoneId);
  }
}
