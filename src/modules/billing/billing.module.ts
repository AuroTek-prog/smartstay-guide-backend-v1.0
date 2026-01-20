import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { WebhookService } from './webhook.service';
import { FirebaseAuthModule } from '../firebase-auth/firebase-auth.module';

/**
 * Módulo de Billing - Integración con Stripe
 * 
 * CHANGE: Módulo totalmente AISLADO para Stripe Billing (FASE 4)
 * 
 * Características:
 * - Feature flag: STRIPE_ENABLED (deshabilitado por defecto)
 * - Test mode: STRIPE_TEST_MODE (habilitado por defecto)
 * - Webhook validation con signature
 * - Registro completo en BillingHistory
 * - NO afecta endpoints existentes
 * 
 * Endpoints nuevos:
 * - POST /billing/create-payment-intent
 * - POST /billing/webhook
 * - GET  /billing/history
 * - GET  /billing/payment-intent/:id
 * - GET  /billing/stats
 */
@Module({
  imports: [PrismaModule, FirebaseAuthModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    StripeService,
    WebhookService,
  ],
  exports: [BillingService, StripeService],
})
export class BillingModule {}
