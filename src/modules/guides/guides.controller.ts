import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { GuidesService } from './guides.service';

@ApiTags('guides')
@Controller('guides')
export class GuidesController {
  constructor(private readonly guidesService: GuidesService) {}

  @Get(':slug/:language')
  @ApiOperation({
    summary: 'Obtener guia por slug e idioma',
    description: 'Devuelve la guia generada para una unidad y lenguaje.',
  })
  @ApiParam({ name: 'slug', description: 'Slug de la unidad', example: 'sol-101' })
  @ApiParam({ name: 'language', description: 'Idioma (es, en, fr, de)', example: 'es' })
  @ApiResponse({ status: 200, description: 'Guia encontrada' })
  async getGuide(
    @Param('slug') slug: string,
    @Param('language') language: string,
  ) {
    return this.guidesService.getGuide(slug, language);
  }

  @Get('generate/:unitId/:language')
  @ApiOperation({
    summary: 'Generar guia para una unidad',
    description: 'Genera o regenera la guia para el idioma indicado.',
  })
  @ApiParam({ name: 'unitId', description: 'ID de la unidad', example: '11111111-1111-1111-1111-111111111111' })
  @ApiParam({ name: 'language', description: 'Idioma', example: 'es' })
  @ApiResponse({ status: 200, description: 'Guia generada' })
  async generateGuide(
    @Param('unitId') unitId: string,
    @Param('language') language: string,
  ) {
    return this.guidesService.generateGuide(unitId, language);
  }
}
