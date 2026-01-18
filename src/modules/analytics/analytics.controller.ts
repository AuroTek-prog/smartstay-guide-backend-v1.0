import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

/**
 * CHANGE: AnalyticsController - Endpoints de métricas (FASE 10)
 * 
 * Rutas:
 * - GET /api/analytics/apartments → Métricas apartamentos
 * - GET /api/analytics/access → Logs de acceso
 * - GET /api/analytics/access-stats → Estadísticas accesos
 */
@ApiTags('Analytics')
@Controller('api/analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('apartments')
  @ApiOperation({ summary: 'Métricas de apartamentos' })
  @ApiResponse({ status: 200, description: 'Métricas' })
  async getApartmentMetrics(@Query('companyId') companyId?: string) {
    this.logger.log(`[GET /analytics/apartments] companyId=${companyId}`);
    return this.analyticsService.getApartmentMetrics(companyId);
  }

  @Get('access')
  @ApiOperation({ summary: 'Logs de acceso recientes' })
  @ApiResponse({ status: 200, description: 'Logs' })
  async getAccessLogs(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    this.logger.log(`[GET /analytics/access] limit=${limitNum}`);
    return this.analyticsService.getAccessLogs(limitNum);
  }

  @Get('access-stats')
  @ApiOperation({ summary: 'Estadísticas de accesos' })
  @ApiResponse({ status: 200, description: 'Estadísticas' })
  async getAccessStats(@Query('unitId') unitId?: string) {
    this.logger.log(`[GET /analytics/access-stats] unitId=${unitId}`);
    return this.analyticsService.getAccessStats(unitId);
  }
}
