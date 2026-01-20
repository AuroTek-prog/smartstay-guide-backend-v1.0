import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, UpdateCompanyDto } from './companies.dto';
import { RequireAuth } from '../firebase-auth/decorators/require-auth.decorator';

@ApiTags('companies')
@Controller('companies')
@RequireAuth()
@ApiBearerAuth()
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar companies', description: 'Devuelve todas las empresas.' })
  @ApiResponse({ status: 200, description: 'Lista de companies.' })
  list() {
    return this.companiesService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener company por id', description: 'Busca una empresa por UUID.' })
  @ApiParam({ name: 'id', description: 'UUID de la company', example: '11111111-1111-1111-1111-111111111111' })
  @ApiResponse({ status: 200, description: 'Company encontrada.' })
  @ApiResponse({ status: 404, description: 'Company no encontrada.' })
  getById(@Param('id') id: string) {
    return this.companiesService.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear company', description: 'Crea una nueva empresa.' })
  @ApiBody({ type: CreateCompanyDto })
  @ApiResponse({ status: 201, description: 'Company creada.' })
  create(@Body() payload: CreateCompanyDto) {
    return this.companiesService.create(payload);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar company', description: 'Actualiza datos de una empresa.' })
  @ApiParam({ name: 'id', description: 'UUID de la company', example: '11111111-1111-1111-1111-111111111111' })
  @ApiBody({ type: UpdateCompanyDto })
  @ApiResponse({ status: 200, description: 'Company actualizada.' })
  @ApiResponse({ status: 404, description: 'Company no encontrada.' })
  update(@Param('id') id: string, @Body() payload: UpdateCompanyDto) {
    return this.companiesService.update(id, payload);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar company', description: 'Elimina una empresa por UUID.' })
  @ApiParam({ name: 'id', description: 'UUID de la company', example: '11111111-1111-1111-1111-111111111111' })
  @ApiResponse({ status: 200, description: 'Company eliminada.' })
  @ApiResponse({ status: 404, description: 'Company no encontrada.' })
  remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }
}
