import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateCheckoutSessionDto {
  @ApiProperty({ example: 'price_123' })
  @IsString()
  priceId: string;

  @ApiProperty({ example: 'https://app.example.com/billing/success' })
  @IsString()
  successUrl: string;

  @ApiProperty({ example: 'https://app.example.com/billing/cancel' })
  @IsString()
  cancelUrl: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional({ example: 'cus_123' })
  @IsOptional()
  @IsString()
  customerId?: string;
}
