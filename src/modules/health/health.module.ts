import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma.module';
import { FirebaseAuthModule } from '../firebase-auth/firebase-auth.module';
import { BillingModule } from '../billing/billing.module';
import { HealthController } from './health.controller';

@Module({
  imports: [PrismaModule, FirebaseAuthModule, BillingModule],
  controllers: [HealthController],
})
export class HealthModule {}
