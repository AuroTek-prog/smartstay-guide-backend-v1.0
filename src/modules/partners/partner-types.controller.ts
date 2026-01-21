import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequireAuth } from '../firebase-auth/decorators/require-auth.decorator';
import { CreatePartnerTypeDto, UpdatePartnerTypeDto } from './partner-types.dto';
import { PartnerTypesService } from './partner-types.service';

@ApiTags('Partner Types')
@Controller('partner-types')
@RequireAuth()
@ApiBearerAuth()
export class PartnerTypesController {
  constructor(private readonly partnerTypesService: PartnerTypesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tipos de partner' })
  @ApiResponse({ status: 200, description: 'Lista de tipos' })
  list() {
    return this.partnerTypesService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener tipo de partner por id' })
  @ApiParam({ name: 'id', description: 'ID del tipo', example: 'RESTAURANT' })
  @ApiResponse({ status: 200, description: 'Tipo encontrado' })
  @ApiResponse({ status: 404, description: 'Tipo no encontrado' })
  getById(@Param('id') id: string) {
    return this.partnerTypesService.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear tipo de partner' })
  @ApiBody({ type: CreatePartnerTypeDto })
  @ApiResponse({ status: 201, description: 'Tipo creado' })
  create(@Body() payload: CreatePartnerTypeDto) {
    return this.partnerTypesService.create(payload);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar tipo de partner' })
  @ApiParam({ name: 'id', description: 'ID del tipo', example: 'RESTAURANT' })
  @ApiBody({ type: UpdatePartnerTypeDto })
  @ApiResponse({ status: 200, description: 'Tipo actualizado' })
  @ApiResponse({ status: 404, description: 'Tipo no encontrado' })
  update(@Param('id') id: string, @Body() payload: UpdatePartnerTypeDto) {
    return this.partnerTypesService.update(id, payload);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar tipo de partner' })
  @ApiParam({ name: 'id', description: 'ID del tipo', example: 'RESTAURANT' })
  @ApiResponse({ status: 200, description: 'Tipo eliminado' })
  @ApiResponse({ status: 404, description: 'Tipo no encontrado' })
  remove(@Param('id') id: string) {
    return this.partnerTypesService.remove(id);
  }
}
