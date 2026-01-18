import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { GuidesService } from './guides.service';

@ApiTags('guides')
@Controller('guides')
export class GuidesController {
  constructor(private readonly guidesService: GuidesService) {}

  @Get(':slug/:language')
  @ApiOperation({ summary: 'Get guide by unit slug and language' })
  @ApiParam({ name: 'slug', description: 'Unit slug' })
  @ApiParam({ name: 'language', description: 'Language code (es, en, fr, de)' })
  async getGuide(
    @Param('slug') slug: string,
    @Param('language') language: string,
  ) {
    return this.guidesService.getGuide(slug, language);
  }

  @Get('generate/:unitId/:language')
  @ApiOperation({ summary: 'Generate guide for a unit' })
  @ApiParam({ name: 'unitId', description: 'Unit ID' })
  @ApiParam({ name: 'language', description: 'Language code' })
  async generateGuide(
    @Param('unitId') unitId: string,
    @Param('language') language: string,
  ) {
    return this.guidesService.generateGuide(unitId, language);
  }
}
