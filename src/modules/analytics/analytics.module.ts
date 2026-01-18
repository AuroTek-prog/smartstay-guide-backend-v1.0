import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

/**
 * CHANGE: AnalyticsModule - Métricas y estadísticas (FASE 10)
 */
@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
