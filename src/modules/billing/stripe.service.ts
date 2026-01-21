import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

/**
 * Servicio encapsulado para interactuar con la API de Stripe
 * Maneja la inicialización y configuración del cliente
 * 
 * CHANGE: Servicio aislado de Stripe (FASE 4)
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe | null = null;
  private enabled = false;
  private testMode = true;

  constructor() {
    this.initializeStripe();
  }

  /**
   * Inicializa el cliente de Stripe desde variables de entorno
   */
  private initializeStripe(): void {
    // CHANGE: Feature flag principal
    if (process.env.STRIPE_ENABLED !== 'true') {
      this.logger.warn('💳 Stripe Billing DESHABILITADO (STRIPE_ENABLED != true)');
      this.logger.warn('📝 Endpoints de billing retornarán 503');
      return;
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      this.logger.error('❌ Stripe habilitado pero falta STRIPE_SECRET_KEY');
      return;
    }

    // CHANGE: Determinar modo test/producción
    this.testMode = process.env.STRIPE_TEST_MODE !== 'false';
    
    if (this.testMode && !secretKey.startsWith('sk_test_')) {
      this.logger.error('❌ STRIPE_TEST_MODE=true pero la key NO es de test (sk_test_)');
      return;
    }

    if (!this.testMode && !secretKey.startsWith('sk_live_')) {
      this.logger.error('❌ STRIPE_TEST_MODE=false pero la key NO es de producción (sk_live_)');
      return;
    }

    try {
      // CHANGE: Inicializar cliente Stripe
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-12-15.clover',
        typescript: true,
      });

      this.enabled = true;
      const mode = this.testMode ? 'TEST MODE (sandbox)' : 'PRODUCTION MODE';
      this.logger.log(`✅ Stripe Client inicializado - ${mode}`);
    } catch (error) {
      this.logger.error(`❌ Error inicializando Stripe: ${error.message}`);
      this.enabled = false;
    }
  }

  /**
   * Verifica si Stripe está habilitado y configurado
   */
  isEnabled(): boolean {
    return this.enabled && this.stripe !== null;
  }

  /**
   * Indica si está en modo test
   */
  isTestMode(): boolean {
    return this.testMode;
  }

  /**
   * Obtiene el cliente de Stripe
   * @throws Error si Stripe no está habilitado
   */
  getClient(): Stripe {
    if (!this.isEnabled() || !this.stripe) {
      throw new Error('Stripe client is not initialized or disabled');
    }
    return this.stripe;
  }

  /**
   * Crea un Payment Intent
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.PaymentIntent> {
    const client = this.getClient();
    
    this.logger.log(`💳 Creando Payment Intent: ${amount / 100} ${currency.toUpperCase()}`);
    
    return client.paymentIntents.create({
      amount,
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });
  }

  /**
   * Crea o recupera un Customer de Stripe
   */
  async createCustomer(
    email: string,
    name?: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.Customer> {
    const client = this.getClient();
    
    this.logger.log(`👤 Creando Stripe Customer: ${email}`);
    
    return client.customers.create({
      email,
      name,
      metadata,
    });
  }

  /**
   * Recupera un Payment Intent por ID
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    const client = this.getClient();
    return client.paymentIntents.retrieve(paymentIntentId);
  }

  /**
   * Crea una sesión de checkout (suscripción)
   */
  async createCheckoutSession(params: {
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    quantity?: number;
    customerEmail?: string;
    customerId?: string;
  }): Promise<Stripe.Checkout.Session> {
    const client = this.getClient();

    return client.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: params.priceId,
          quantity: params.quantity || 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      customer: params.customerId,
      customer_email: params.customerEmail,
    });
  }

  /**
   * Crea una sesión del portal de cliente
   */
  async createCustomerPortalSession(params: {
    customerId: string;
    returnUrl?: string;
  }): Promise<Stripe.BillingPortal.Session> {
    const client = this.getClient();
    return client.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });
  }

  /**
   * Obtiene una suscripción por ID
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    const client = this.getClient();
    return client.subscriptions.retrieve(subscriptionId);
  }

  /**
   * Construye evento de webhook validando signature
   * CRÍTICO: Esta validación previene ataques
   */
  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    webhookSecret: string,
  ): Stripe.Event {
    const client = this.getClient();
    
    try {
      return client.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      this.logger.error(`❌ Webhook signature inválida: ${error.message}`);
      throw new Error('Invalid webhook signature');
    }
  }
}
