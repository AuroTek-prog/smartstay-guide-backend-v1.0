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
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { WebhookService } from './webhook.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';

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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Crea un Payment Intent de Stripe' })
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
  @ApiOperation({ summary: 'Webhook de Stripe (solo para Stripe)' })
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
  @ApiOperation({ summary: 'Obtiene historial de billing' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false })
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
  @ApiOperation({ summary: 'Obtiene detalles de un Payment Intent' })
  @ApiResponse({ status: 200, description: 'Detalles del Payment Intent' })
  async getPaymentIntentDetails(@Param('id') id: string) {
    return this.billingService.getPaymentIntentDetails(id);
  }

  /**
   * Obtiene estadísticas de billing
   * CHANGE: Endpoint para dashboard/analytics
   */
  @Get('/stats')
  @ApiOperation({ summary: 'Obtiene estadísticas de billing' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiResponse({ status: 200, description: 'Estadísticas de billing' })
  async getBillingStats(
    @Query('companyId') companyId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.billingService.getBillingStats({ companyId, userId });
  }
}
