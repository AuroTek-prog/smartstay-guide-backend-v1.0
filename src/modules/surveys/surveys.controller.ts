import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { SurveysService } from './surveys.service';
import { CreateSurveyResponseDto } from './surveys.dto';

@ApiTags('surveys')
@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Get()
  @ApiOperation({ summary: 'Listar encuestas', description: 'Devuelve todas las encuestas activas.' })
  @ApiResponse({ status: 200, description: 'Lista de encuestas' })
  async list() {
    return this.surveysService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener encuesta por ID', description: 'Devuelve una encuesta por UUID.' })
  @ApiParam({ name: 'id', description: 'ID de la encuesta', example: '11111111-1111-1111-1111-111111111111' })
  @ApiResponse({ status: 200, description: 'Encuesta encontrada' })
  async getById(@Param('id') id: string) {
    return this.surveysService.getById(id);
  }

  @Post('response')
  @ApiOperation({ summary: 'Enviar respuesta de encuesta', description: 'Guarda respuestas para una unidad.' })
  @ApiBody({ type: CreateSurveyResponseDto })
  @ApiResponse({ status: 201, description: 'Respuesta registrada' })
  async createResponse(@Body() dto: CreateSurveyResponseDto) {
    return this.surveysService.createResponse(dto);
  }

  @Get('unit/:unitId')
  @ApiOperation({ summary: 'Respuestas por unidad', description: 'Lista respuestas de encuestas por unidad.' })
  @ApiParam({ name: 'unitId', description: 'ID de la unidad', example: '22222222-2222-2222-2222-222222222222' })
  @ApiResponse({ status: 200, description: 'Respuestas de la unidad' })
  async getUnitResponses(@Param('unitId') unitId: string) {
    return this.surveysService.getUnitResponses(unitId);
  }
}
