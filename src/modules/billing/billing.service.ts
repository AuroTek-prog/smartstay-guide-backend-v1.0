import { Injectable, ServiceUnavailableException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { StripeService } from './stripe.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { CreateCustomerPortalSessionDto } from './dto/create-customer-portal-session.dto';

/**
 * Servicio principal de Billing
 * Orquesta operaciones de pago y registra en BillingHistory
 * 
 * CHANGE: Servicio orquestador de billing (FASE 4)
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) {}

  /**
   * Verifica si Stripe está habilitado
   * CHANGE: Feature flag check
   */
  private ensureStripeEnabled(): void {
    if (!this.stripeService.isEnabled()) {
      throw new ServiceUnavailableException(
        'Stripe billing is currently disabled. Enable with STRIPE_ENABLED=true',
      );
    }
  }

  /**
   * Crea un Payment Intent de Stripe
   * Registra el intento en BillingHistory
   */
  async createPaymentIntent(dto: CreatePaymentIntentDto) {
    this.ensureStripeEnabled();

    try {
      // CHANGE: Crear Payment Intent en Stripe
      const paymentIntent = await this.stripeService.createPaymentIntent(
        dto.amount,
        dto.currency || 'usd',
        dto.userId || dto.companyId || dto.unitId
          ? {
              ...(dto.userId && { userId: dto.userId }),
              ...(dto.companyId && { companyId: dto.companyId }),
              ...(dto.unitId && { unitId: dto.unitId }),
              ...dto.metadata,
            }
          : dto.metadata,
      );

      // CHANGE: Registrar en BillingHistory
      await this.prisma.billingHistory.create({
        data: {
          userId: dto.userId || null,
          companyId: dto.companyId || null,
          unitId: dto.unitId || null,
          stripePaymentId: paymentIntent.id,
          stripeCustomerId: paymentIntent.customer as string | null,
          eventType: 'payment_intent.created',
          amount: dto.amount,
          currency: dto.currency || 'usd',
          status: 'pending',
          metadata: dto.metadata as any,
        },
      });

      this.logger.log(`✅ Payment Intent creado: ${paymentIntent.id}`);

      // CHANGE: Retornar solo lo necesario para el frontend
      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      };
    } catch (error) {
      this.logger.error(`❌ Error creando Payment Intent: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene el historial de billing
   * Filtrado opcional por userId, companyId, unitId
   */
  async getBillingHistory(filters?: {
    userId?: string;
    companyId?: string;
    unitId?: string;
    status?: string;
    limit?: number;
  }) {
    this.ensureStripeEnabled();

    const where: any = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.companyId) where.companyId = filters.companyId;
    if (filters?.unitId) where.unitId = filters.unitId;
    if (filters?.status) where.status = filters.status;

    const history = await this.prisma.billingHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      select: {
        id: true,
        eventType: true,
        amount: true,
        currency: true,
        status: true,
        stripePaymentId: true,
        stripeCustomerId: true,
        createdAt: true,
        metadata: true,
      },
    });

    return history;
  }

  /**
   * Obtiene detalles de un Payment Intent específico
   */
  async getPaymentIntentDetails(paymentIntentId: string) {
    this.ensureStripeEnabled();

    try {
      const paymentIntent = await this.stripeService.getPaymentIntent(paymentIntentId);
      
      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        created: new Date(paymentIntent.created * 1000),
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      this.logger.error(`❌ Error obteniendo Payment Intent: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de billing
   */
  async getBillingStats(filters?: { companyId?: string; userId?: string }) {
    this.ensureStripeEnabled();

    const where: any = {};
    if (filters?.companyId) where.companyId = filters.companyId;
    if (filters?.userId) where.userId = filters.userId;

    const [total, completed, failed, refunded] = await Promise.all([
      this.prisma.billingHistory.count({ where }),
      this.prisma.billingHistory.count({ where: { ...where, status: 'completed' } }),
      this.prisma.billingHistory.count({ where: { ...where, status: 'failed' } }),
      this.prisma.billingHistory.count({ where: { ...where, status: 'refunded' } }),
    ]);

    const totalAmount = await this.prisma.billingHistory.aggregate({
      where: { ...where, status: 'completed' },
      _sum: { amount: true },
    });

    return {
      totalTransactions: total,
      completedTransactions: completed,
      failedTransactions: failed,
      refundedTransactions: refunded,
      totalRevenue: totalAmount._sum.amount || 0,
    };
  }

  async createCheckoutSession(dto: CreateCheckoutSessionDto) {
    this.ensureStripeEnabled();

    const session = await this.stripeService.createCheckoutSession({
      priceId: dto.priceId,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
      quantity: dto.quantity,
      customerEmail: dto.customerEmail,
      customerId: dto.customerId,
    });

    await this.prisma.billingHistory.create({
      data: {
        stripePaymentId: session.id,
        stripeCustomerId: (session.customer as string) || null,
        eventType: 'checkout.session.created',
        status: 'pending',
        metadata: {
          priceId: dto.priceId,
          quantity: dto.quantity || 1,
          customerEmail: dto.customerEmail,
        },
      },
    });

    return {
      id: session.id,
      url: session.url,
      customerId: session.customer,
    };
  }

  async createCustomerPortalSession(dto: CreateCustomerPortalSessionDto) {
    this.ensureStripeEnabled();
    const session = await this.stripeService.createCustomerPortalSession({
      customerId: dto.customerId,
      returnUrl: dto.returnUrl,
    });

    return {
      id: session.id,
      url: session.url,
    };
  }

  async getSubscriptionStatus(subscriptionId: string) {
    this.ensureStripeEnabled();
    const subscription = await this.stripeService.getSubscription(subscriptionId);

    const currentPeriodStart = (subscription as any).current_period_start;
    const currentPeriodEnd = (subscription as any).current_period_end;

    return {
      id: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart * 1000) : null,
      currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
      customerId: subscription.customer,
      plan: subscription.items.data.map((item) => ({
        priceId: item.price.id,
        quantity: item.quantity,
      })),
    };
  }
}
