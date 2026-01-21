import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateCustomerPortalSessionDto {
  @ApiProperty({ example: 'cus_123' })
  @IsString()
  customerId: string;

  @ApiPropertyOptional({ example: 'https://app.example.com/billing' })
  @IsOptional()
  @IsString()
  returnUrl?: string;
}
