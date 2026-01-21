import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { WebhookService } from './webhook.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { RequireAuth } from '../firebase-auth/decorators/require-auth.decorator';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { CreateCustomerPortalSessionDto } from './dto/create-customer-portal-session.dto';

/**
 * Controlador de Billing
 * Endpoints para operaciones de pago y webhooks de Stripe
 * 
 * CHANGE: Controlador de billing aislado (FASE 4)
 */
@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(
    private billingService: BillingService,
    private webhookService: WebhookService,
  ) {}

  /**
   * Crea un Payment Intent de Stripe
   * CHANGE: Endpoint nuevo para iniciar pagos
   */
  @Post('/create-payment-intent')
  @RequireAuth()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Crea un Payment Intent de Stripe',
    description: 'Devuelve el PaymentIntent listo para confirmar en el frontend.',
  })
  @ApiBody({ type: CreatePaymentIntentDto })
  @ApiResponse({ status: 200, description: 'Payment Intent creado' })
  @ApiResponse({ status: 503, description: 'Stripe deshabilitado' })
  async createPaymentIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.billingService.createPaymentIntent(dto);
  }

  /**
   * Webhook de Stripe
   * CRÍTICO: Valida signature para seguridad
   * CHANGE: Endpoint para recibir eventos de Stripe
   */
  @Post('/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook de Stripe',
    description: 'Recibe eventos de Stripe y valida la signature.',
  })
  @ApiResponse({ status: 200, description: 'Evento procesado' })
  @ApiResponse({ status: 401, description: 'Signature inválida' })
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    // CHANGE: Obtener raw body para validación de signature
    const rawBody = request.rawBody;
    
    if (!rawBody) {
      throw new Error('Raw body is required for webhook validation');
    }

    if (!signature) {
      throw new Error('Stripe signature header is missing');
    }

    // CHANGE: Procesar webhook con validación
    await this.webhookService.processWebhookEvent(rawBody, signature);

    // CHANGE: Stripe requiere 200 OK para confirmar recepción
    return { received: true };
  }

  /**
   * Obtiene historial de billing
   * CHANGE: Endpoint para consultar historial
   */
  @Get('/history')
  @RequireAuth()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtiene historial de billing',
    description: 'Permite filtrar por usuario, empresa, unidad o estado.',
  })
  @ApiQuery({ name: 'userId', required: false, description: 'Filtra por usuario (UUID)' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filtra por empresa (UUID)' })
  @ApiQuery({ name: 'unitId', required: false, description: 'Filtra por unidad (UUID)' })
  @ApiQuery({ name: 'status', required: false, description: 'Estado del evento' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limite de resultados' })
  @ApiResponse({ status: 200, description: 'Historial de billing' })
  async getBillingHistory(
    @Query('userId') userId?: string,
    @Query('companyId') companyId?: string,
    @Query('unitId') unitId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.billingService.getBillingHistory({
      userId,
      companyId,
      unitId,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Obtiene detalles de un Payment Intent
   * CHANGE: Endpoint para consultar estado de pago
   */
  @Get('/payment-intent/:id')
  @RequireAuth()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtiene detalles de un Payment Intent',
    description: 'Consulta el estado actual del PaymentIntent en Stripe.',
  })
  @ApiResponse({ status: 200, description: 'Detalles del Payment Intent' })
  async getPaymentIntentDetails(@Param('id') id: string) {
    return this.billingService.getPaymentIntentDetails(id);
  }

  /**
   * Crea una sesión de checkout (suscripción)
   */
  @Post('/checkout-session')
  @RequireAuth()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crea sesión de checkout',
    description: 'Genera una sesión de Stripe Checkout para suscripciones.',
  })
  @ApiBody({ type: CreateCheckoutSessionDto })
  @ApiResponse({
    status: 200,
    description: 'Checkout session creada',
    schema: {
      example: {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/c/pay/cs_test_123',
        customerId: 'cus_123',
      },
    },
  })
  async createCheckoutSession(@Body() dto: CreateCheckoutSessionDto) {
    return this.billingService.createCheckoutSession(dto);
  }

  /**
   * Crea una sesión de portal de cliente
   */
  @Post('/customer-portal-session')
  @RequireAuth()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crea sesión de portal de cliente',
    description: 'Genera enlace para gestionar suscripción en Stripe.',
  })
  @ApiBody({ type: CreateCustomerPortalSessionDto })
  @ApiResponse({
    status: 200,
    description: 'Portal session creada',
    schema: {
      example: {
        id: 'bps_123',
        url: 'https://billing.stripe.com/p/session/bps_123',
      },
    },
  })
  async createCustomerPortalSession(@Body() dto: CreateCustomerPortalSessionDto) {
    return this.billingService.createCustomerPortalSession(dto);
  }

  /**
   * Obtiene estadísticas de billing
   * CHANGE: Endpoint para dashboard/analytics
   */
  @Get('/stats')
  @RequireAuth()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtiene estadísticas de billing',
    description: 'Agrega datos de eventos de pago por empresa o usuario.',
  })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filtra por empresa (UUID)' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filtra por usuario (UUID)' })
  @ApiResponse({ status: 200, description: 'Estadísticas de billing' })
  async getBillingStats(
    @Query('companyId') companyId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.billingService.getBillingStats({ companyId, userId });
  }

  /**
   * Obtiene estado de una suscripción
   */
  @Get('/subscription/status')
  @RequireAuth()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Estado de suscripción',
    description: 'Devuelve estado y periodo actual de la suscripción.',
  })
  @ApiQuery({ name: 'subscriptionId', required: true, description: 'ID de suscripción en Stripe' })
  @ApiResponse({
    status: 200,
    description: 'Estado de suscripción',
    schema: {
      example: {
        id: 'sub_123',
        status: 'active',
        cancelAtPeriodEnd: false,
        currentPeriodStart: '2026-01-01T00:00:00.000Z',
        currentPeriodEnd: '2026-02-01T00:00:00.000Z',
        customerId: 'cus_123',
        plan: [{ priceId: 'price_123', quantity: 1 }],
      },
    },
  })
  async getSubscriptionStatus(@Query('subscriptionId') subscriptionId: string) {
    return this.billingService.getSubscriptionStatus(subscriptionId);
  }
}
