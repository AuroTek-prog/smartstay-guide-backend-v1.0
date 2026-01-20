import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { CreateUnitDto, UpdateUnitDto } from './units.dto';
import { RequireAuth } from '../firebase-auth/decorators/require-auth.decorator';

@ApiTags('units')
@Controller('units')
@RequireAuth()
@ApiBearerAuth()
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar units', description: 'Devuelve todas las unidades registradas.' })
  @ApiResponse({ status: 200, description: 'Lista de units.' })
  list() {
    return this.unitsService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener unit por id', description: 'Busca una unidad por su UUID.' })
  @ApiParam({ name: 'id', description: 'UUID de la unit', example: '11111111-1111-1111-1111-111111111111' })
  @ApiResponse({ status: 200, description: 'Unit encontrada.' })
  @ApiResponse({ status: 404, description: 'Unit no encontrada.' })
  getById(@Param('id') id: string) {
    return this.unitsService.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear unit', description: 'Crea una nueva unidad.' })
  @ApiBody({ type: CreateUnitDto })
  @ApiResponse({ status: 201, description: 'Unit creada.' })
  create(@Body() payload: CreateUnitDto) {
    return this.unitsService.create(payload);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar unit', description: 'Actualiza datos de una unidad.' })
  @ApiParam({ name: 'id', description: 'UUID de la unit', example: '11111111-1111-1111-1111-111111111111' })
  @ApiBody({ type: UpdateUnitDto })
  @ApiResponse({ status: 200, description: 'Unit actualizada.' })
  @ApiResponse({ status: 404, description: 'Unit no encontrada.' })
  update(@Param('id') id: string, @Body() payload: UpdateUnitDto) {
    return this.unitsService.update(id, payload);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar unit', description: 'Elimina una unidad por UUID.' })
  @ApiParam({ name: 'id', description: 'UUID de la unit', example: '11111111-1111-1111-1111-111111111111' })
  @ApiResponse({ status: 200, description: 'Unit eliminada.' })
  @ApiResponse({ status: 404, description: 'Unit no encontrada.' })
  remove(@Param('id') id: string) {
    return this.unitsService.remove(id);
  }
}
