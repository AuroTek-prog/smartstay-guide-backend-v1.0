import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery, ApiParam, ApiResponse, ApiBody } from '@nestjs/swagger';
import { PublicApiService } from './public-api.service';
import { Request } from 'express';
import { RequireAuth } from '../firebase-auth/decorators/require-auth.decorator';

@ApiTags('public')
@Controller('api/public')
export class PublicApiController {
  constructor(private readonly publicApiService: PublicApiService) {}

  @Get('guide/:slug')
  @RequireAuth()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Guia completa por apartamento',
    description: 'Devuelve la guia completa para el slug y el idioma indicado.',
  })
  @ApiParam({ name: 'slug', description: 'Slug del apartamento', example: 'sol-101' })
  @ApiQuery({ name: 'lang', required: false, description: 'Idioma (es, en, fr, de). Default: es' })
  @ApiResponse({ status: 200, description: 'Guia completa' })
  async getGuide(
    @Param('slug') slug: string,
    @Query('lang') lang: string = 'es',
  ) {
    return this.publicApiService.getGuide(slug, lang);
  }

  @Get('essentials/:slug')
  @RequireAuth()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Seccion essentials',
    description: 'Devuelve solo la seccion de esenciales.',
  })
  @ApiParam({ name: 'slug', description: 'Slug del apartamento', example: 'sol-101' })
  @ApiQuery({ name: 'lang', required: false, description: 'Idioma (es, en, fr, de)' })
  @ApiResponse({ status: 200, description: 'Seccion essentials' })
  async getEssentials(
    @Param('slug') slug: string,
    @Query('lang') lang: string = 'es',
  ) {
    return this.publicApiService.getEssentials(slug, lang);
  }

  @Get('recommendations/:slug')
  @RequireAuth()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Recomendaciones de partners',
    description: 'Lista partners recomendados para el apartamento.',
  })
  @ApiParam({ name: 'slug', description: 'Slug del apartamento', example: 'sol-101' })
  @ApiResponse({ status: 200, description: 'Recomendaciones' })
  async getRecommendations(@Param('slug') slug: string) {
    return this.publicApiService.getRecommendations(slug);
  }

  @Post('actions/open-lock')
  @ApiOperation({
    summary: 'Abrir cerradura (token one-time)',
    description: 'Requiere token de un solo uso generado por la plataforma.',
  })
  @ApiBody({
    schema: {
      example: { slug: 'sol-101', deviceId: 'device-123', token: 'otp-token' },
    },
  })
  @ApiResponse({ status: 200, description: 'Operacion ejecutada' })
  @ApiResponse({ status: 401, description: 'Token invalido o expirado' })
  async openLock(
    @Body() body: { slug: string; deviceId: string; token: string },
    @Req() request: Request,
  ) {
    const ip = request.ip || request.headers['x-forwarded-for'] as string || 'unknown';
    return this.publicApiService.openLock(body.slug, body.deviceId, body.token, ip);
  }

  @Get('firebase-config')
  @ApiOperation({
    summary: 'Configuración pública de Firebase',
    description: 'Devuelve la configuración pública para inicializar Firebase en el frontend.',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración pública de Firebase',
  })
  getFirebaseConfig() {
    return {
      apiKey: process.env.FIREBASE_API_KEY || null,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || null,
      projectId: process.env.FIREBASE_PROJECT_ID || null,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || null,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || null,
      appId: process.env.FIREBASE_APP_ID || null,
      measurementId: process.env.FIREBASE_MEASUREMENT_ID || null,
    };
  }
}
