import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { CreateUnitDto, UpdateUnitDto } from './units.dto';

@ApiTags('units')
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar units' })
  @ApiResponse({ status: 200, description: 'Lista de units.' })
  list() {
    return this.unitsService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener unit por id' })
  @ApiParam({ name: 'id', description: 'UUID de la unit' })
  @ApiResponse({ status: 200, description: 'Unit encontrada.' })
  @ApiResponse({ status: 404, description: 'Unit no encontrada.' })
  getById(@Param('id') id: string) {
    return this.unitsService.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear unit' })
  @ApiBody({ type: CreateUnitDto })
  @ApiResponse({ status: 201, description: 'Unit creada.' })
  create(@Body() payload: CreateUnitDto) {
    return this.unitsService.create(payload);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar unit' })
  @ApiParam({ name: 'id', description: 'UUID de la unit' })
  @ApiBody({ type: UpdateUnitDto })
  @ApiResponse({ status: 200, description: 'Unit actualizada.' })
  @ApiResponse({ status: 404, description: 'Unit no encontrada.' })
  update(@Param('id') id: string, @Body() payload: UpdateUnitDto) {
    return this.unitsService.update(id, payload);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar unit' })
  @ApiParam({ name: 'id', description: 'UUID de la unit' })
  @ApiResponse({ status: 200, description: 'Unit eliminada.' })
  @ApiResponse({ status: 404, description: 'Unit no encontrada.' })
  remove(@Param('id') id: string) {
    return this.unitsService.remove(id);
  }
}
