import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { StripeService } from './stripe.service';
import { StripeWebhookEvent } from './interfaces/stripe-webhook-event.interface';

/**
 * Servicio para procesar webhooks de Stripe
 * Valida signatures y registra eventos en BillingHistory
 * 
 * CHANGE: Procesamiento seguro de webhooks (FASE 4)
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) {}

  /**
   * Procesa un evento de webhook de Stripe
   * Valida signature y registra en BillingHistory
   */
  async processWebhookEvent(
    rawBody: string | Buffer,
    signature: string,
  ): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    // CHANGE: Validación de signature (CRÍTICO para seguridad)
    const event = this.stripeService.constructWebhookEvent(
      rawBody,
      signature,
      webhookSecret,
    );

    this.logger.log(`📨 Webhook recibido: ${event.type} (ID: ${event.id})`);

    // CHANGE: Procesar según tipo de evento
    await this.handleEvent(event as any);
  }

  /**
   * Maneja diferentes tipos de eventos de Stripe
   */
  private async handleEvent(event: StripeWebhookEvent): Promise<void> {
    try {
      switch (event.type) {
        // CHANGE: Payment Intents
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event);
          break;
        
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event);
          break;
        
        case 'payment_intent.canceled':
          await this.handlePaymentIntentCanceled(event);
          break;

        // CHANGE: Charges
        case 'charge.succeeded':
          await this.handleChargeSucceeded(event);
          break;
        
        case 'charge.refunded':
          await this.handleChargeRefunded(event);
          break;

        // CHANGE: Subscriptions
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.handleSubscriptionEvent(event);
          break;

        // CHANGE: Invoices
        case 'invoice.paid':
          await this.handleInvoicePaid(event);
          break;
        
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event);
          break;

        default:
          // CHANGE: Registrar eventos desconocidos para debugging
          this.logger.debug(`ℹ️ Evento no manejado: ${event.type}`);
          await this.logGenericEvent(event);
      }
    } catch (error) {
      this.logger.error(`❌ Error procesando evento ${event.type}: ${error.message}`);
      // CHANGE: No lanzar error para que Stripe reciba 200 OK
      // El evento quedará registrado en logs
    }
  }

  /**
   * Maneja payment_intent.succeeded
   */
  private async handlePaymentIntentSucceeded(event: StripeWebhookEvent): Promise<void> {
    const paymentIntent = event.data.object;
    
    await this.prisma.billingHistory.create({
      data: {
        stripeEventId: event.id,
        stripePaymentId: paymentIntent.id,
        stripeCustomerId: paymentIntent.customer as string | null,
        eventType: event.type,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: 'completed',
        metadata: paymentIntent.metadata as any,
      },
    });

    this.logger.log(`✅ Payment Intent exitoso: ${paymentIntent.id} - ${paymentIntent.amount / 100} ${paymentIntent.currency.toUpperCase()}`);
  }

  /**
   * Maneja payment_intent.payment_failed
   */
  private async handlePaymentIntentFailed(event: StripeWebhookEvent): Promise<void> {
    const paymentIntent = event.data.object;
    
    await this.prisma.billingHistory.create({
      data: {
        stripeEventId: event.id,
        stripePaymentId: paymentIntent.id,
        stripeCustomerId: paymentIntent.customer as string | null,
        eventType: event.type,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: 'failed',
        errorMessage: paymentIntent.last_payment_error?.message || 'Payment failed',
        metadata: paymentIntent.metadata as any,
      },
    });

    this.logger.warn(`⚠️ Payment Intent falló: ${paymentIntent.id}`);
  }

  /**
   * Maneja payment_intent.canceled
   */
  private async handlePaymentIntentCanceled(event: StripeWebhookEvent): Promise<void> {
    const paymentIntent = event.data.object;
    
    await this.prisma.billingHistory.create({
      data: {
        stripeEventId: event.id,
        stripePaymentId: paymentIntent.id,
        stripeCustomerId: paymentIntent.customer as string | null,
        eventType: event.type,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: 'canceled',
        metadata: paymentIntent.metadata as any,
      },
    });

    this.logger.log(`🚫 Payment Intent cancelado: ${paymentIntent.id}`);
  }

  /**
   * Maneja charge.succeeded
   */
  private async handleChargeSucceeded(event: StripeWebhookEvent): Promise<void> {
    const charge = event.data.object;
    
    await this.prisma.billingHistory.create({
      data: {
        stripeEventId: event.id,
        stripePaymentId: charge.id,
        stripeCustomerId: charge.customer as string | null,
        eventType: event.type,
        amount: charge.amount,
        currency: charge.currency,
        status: 'completed',
        metadata: charge.metadata as any,
      },
    });

    this.logger.log(`✅ Charge exitoso: ${charge.id}`);
  }

  /**
   * Maneja charge.refunded
   */
  private async handleChargeRefunded(event: StripeWebhookEvent): Promise<void> {
    const charge = event.data.object;
    
    await this.prisma.billingHistory.create({
      data: {
        stripeEventId: event.id,
        stripePaymentId: charge.id,
        stripeCustomerId: charge.customer as string | null,
        eventType: event.type,
        amount: charge.amount_refunded,
        currency: charge.currency,
        status: 'refunded',
        metadata: charge.metadata as any,
      },
    });

    this.logger.log(`💸 Charge reembolsado: ${charge.id} - ${charge.amount_refunded / 100} ${charge.currency.toUpperCase()}`);
  }

  /**
   * Maneja eventos de subscriptions
   */
  private async handleSubscriptionEvent(event: StripeWebhookEvent): Promise<void> {
    const subscription = event.data.object;
    
    await this.prisma.billingHistory.create({
      data: {
        stripeEventId: event.id,
        stripeCustomerId: subscription.customer as string,
        eventType: event.type,
        amount: subscription.items?.data[0]?.price?.unit_amount || null,
        currency: subscription.currency || 'usd',
        status: event.type === 'customer.subscription.deleted' ? 'canceled' : 'completed',
        metadata: subscription.metadata as any,
      },
    });

    this.logger.log(`📋 Subscription evento: ${event.type}`);
  }

  /**
   * Maneja invoice.paid
   */
  private async handleInvoicePaid(event: StripeWebhookEvent): Promise<void> {
    const invoice = event.data.object;
    
    await this.prisma.billingHistory.create({
      data: {
        stripeEventId: event.id,
        stripeInvoiceId: invoice.id,
        stripeCustomerId: invoice.customer as string,
        eventType: event.type,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: 'completed',
        metadata: invoice.metadata as any,
      },
    });

    this.logger.log(`✅ Invoice pagado: ${invoice.id}`);
  }

  /**
   * Maneja invoice.payment_failed
   */
  private async handleInvoicePaymentFailed(event: StripeWebhookEvent): Promise<void> {
    const invoice = event.data.object;
    
    await this.prisma.billingHistory.create({
      data: {
        stripeEventId: event.id,
        stripeInvoiceId: invoice.id,
        stripeCustomerId: invoice.customer as string,
        eventType: event.type,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: 'failed',
        metadata: invoice.metadata as any,
      },
    });

    this.logger.warn(`⚠️ Invoice pago falló: ${invoice.id}`);
  }

  /**
   * Registra eventos genéricos (no manejados específicamente)
   */
  private async logGenericEvent(event: StripeWebhookEvent): Promise<void> {
    try {
      await this.prisma.billingHistory.create({
        data: {
          stripeEventId: event.id,
          eventType: event.type,
          status: 'completed',
          metadata: event.data.object as any,
        },
      });
    } catch (error) {
      // CHANGE: No fallar si el log falla
      this.logger.error(`Error logging generic event: ${error.message}`);
    }
  }
}
