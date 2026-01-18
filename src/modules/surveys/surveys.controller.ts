import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SurveysService } from './surveys.service';
import { CreateSurveyResponseDto } from './surveys.dto';

@ApiTags('surveys')
@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Get()
  @ApiOperation({ summary: 'Get all surveys' })
  async list() {
    return this.surveysService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get survey by ID' })
  async getById(@Param('id') id: string) {
    return this.surveysService.getById(id);
  }

  @Post('response')
  @ApiOperation({ summary: 'Submit survey response' })
  async createResponse(@Body() dto: CreateSurveyResponseDto) {
    return this.surveysService.createResponse(dto);
  }

  @Get('unit/:unitId')
  @ApiOperation({ summary: 'Get survey responses for a unit' })
  async getUnitResponses(@Param('unitId') unitId: string) {
    return this.surveysService.getUnitResponses(unitId);
  }
}
