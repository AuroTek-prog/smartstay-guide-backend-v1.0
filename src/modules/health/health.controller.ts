import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma.service';
import { FirebaseAuthService } from '../firebase-auth/firebase-auth.service';
import { StripeService } from '../billing/stripe.service';

type HealthStatus = 'ok' | 'degraded' | 'down' | 'disabled';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseAuthService: FirebaseAuthService,
    private readonly stripeService: StripeService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Healthcheck básico (DB/Firebase/Stripe)' })
  @ApiResponse({ status: 200, description: 'Estado de salud del servicio' })
  async getHealth() {
    const dbCheck = await this.checkDatabase();
    const firebaseCheck = this.checkFirebase();
    const stripeCheck = this.checkStripe();

    const overall: HealthStatus =
      dbCheck.status === 'ok' &&
      (firebaseCheck.status === 'ok' || firebaseCheck.status === 'disabled') &&
      (stripeCheck.status === 'ok' || stripeCheck.status === 'disabled')
        ? 'ok'
        : dbCheck.status === 'down'
          ? 'down'
          : 'degraded';

    return {
      status: overall,
      timestamp: new Date().toISOString(),
      checks: {
        db: dbCheck,
        firebase: firebaseCheck,
        stripe: stripeCheck,
      },
    };
  }

  private async checkDatabase() {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok' as HealthStatus,
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'down' as HealthStatus,
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'DB check failed',
      };
    }
  }

  private checkFirebase() {
    const enabled = this.firebaseAuthService.isEnabled();
    return {
      status: enabled ? ('ok' as HealthStatus) : ('disabled' as HealthStatus),
    };
  }

  private checkStripe() {
    const enabled = this.stripeService.isEnabled();
    return {
      status: enabled ? ('ok' as HealthStatus) : ('disabled' as HealthStatus),
      mode: this.stripeService.isTestMode() ? 'test' : 'live',
    };
  }
}
