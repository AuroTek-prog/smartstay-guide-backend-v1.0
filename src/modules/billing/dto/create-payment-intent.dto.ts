import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

/**
 * DTO para crear un Payment Intent de Stripe
 */
export class CreatePaymentIntentDto {
  @ApiProperty({
    description: 'Monto en centavos (minimo 50). Ej: 5000 = $50.00',
    example: 5000,
  })
  @IsNumber()
  @Min(50) // Mínimo $0.50 USD
  amount: number;

  @ApiPropertyOptional({
    description: 'Moneda ISO 4217',
    example: 'usd',
    default: 'usd',
  })
  @IsString()
  @IsOptional()
  currency?: string = 'usd';

  @ApiPropertyOptional({ description: 'ID del usuario (UUID)', example: '11111111-1111-1111-1111-111111111111' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'ID de la empresa (UUID)', example: '22222222-2222-2222-2222-222222222222' })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({ description: 'ID de la unidad (UUID)', example: '33333333-3333-3333-3333-333333333333' })
  @IsString()
  @IsOptional()
  unitId?: string;

  @ApiPropertyOptional({
    description: 'Metadata adicional para Stripe',
    example: { source: 'web', campaign: 'promo-2025' },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
