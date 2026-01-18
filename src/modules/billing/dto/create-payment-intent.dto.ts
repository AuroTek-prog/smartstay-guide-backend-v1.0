import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

/**
 * DTO para crear un Payment Intent de Stripe
 */
export class CreatePaymentIntentDto {
  @IsNumber()
  @Min(50) // Mínimo $0.50 USD
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string = 'usd';

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  unitId?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
