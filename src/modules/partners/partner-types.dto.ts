import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreatePartnerTypeDto {
  @ApiProperty({ example: 'RESTAURANT' })
  @IsString()
  id: string;

  @ApiPropertyOptional({ example: 'Restaurante' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class UpdatePartnerTypeDto {
  @ApiPropertyOptional({ example: 'Restaurante' })
  @IsOptional()
  @IsString()
  name?: string;
}
