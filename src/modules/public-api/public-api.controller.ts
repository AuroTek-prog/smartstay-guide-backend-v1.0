import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PublicApiService } from './public-api.service';
import { Request } from 'express';

@ApiTags('public')
@Controller('api/public')
export class PublicApiController {
  constructor(private readonly publicApiService: PublicApiService) {}

  @Get('guide/:slug')
  @ApiOperation({ summary: 'Get complete guide for apartment (public endpoint)' })
  @ApiQuery({ name: 'lang', required: false, description: 'Language code (es, en, fr, de). Default: es' })
  async getGuide(
    @Param('slug') slug: string,
    @Query('lang') lang: string = 'es',
  ) {
    return this.publicApiService.getGuide(slug, lang);
  }

  @Get('essentials/:slug')
  @ApiOperation({ summary: 'Get essentials section only' })
  @ApiQuery({ name: 'lang', required: false })
  async getEssentials(
    @Param('slug') slug: string,
    @Query('lang') lang: string = 'es',
  ) {
    return this.publicApiService.getEssentials(slug, lang);
  }

  @Get('recommendations/:slug')
  @ApiOperation({ summary: 'Get recommendations (partners) for apartment' })
  async getRecommendations(@Param('slug') slug: string) {
    return this.publicApiService.getRecommendations(slug);
  }

  @Post('actions/open-lock')
  @ApiOperation({ summary: 'Open lock device (requires valid one-time token)' })
  async openLock(
    @Body() body: { slug: string; deviceId: string; token: string },
    @Req() request: Request,
  ) {
    const ip = request.ip || request.headers['x-forwarded-for'] as string || 'unknown';
    return this.publicApiService.openLock(body.slug, body.deviceId, body.token, ip);
  }
}
