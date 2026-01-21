import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePartnerDto {
  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  @IsUUID()
  companyId: string;

  @ApiPropertyOptional({ example: 'RESTAURANT' })
  @IsOptional()
  @IsString()
  typeId?: string;

  @ApiPropertyOptional({ example: 'Descripcion del partner' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isTop?: boolean;

  @ApiPropertyOptional({ example: 'https://partner.example.com' })
  @IsOptional()
  @IsString()
  redirectUrl?: string;

  @ApiPropertyOptional({ example: '22222222-2222-2222-2222-222222222222' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class UpdatePartnerDto {
  @ApiPropertyOptional({ example: 'RESTAURANT' })
  @IsOptional()
  @IsString()
  typeId?: string;

  @ApiPropertyOptional({ example: 'Descripcion del partner' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isTop?: boolean;

  @ApiPropertyOptional({ example: 'https://partner.example.com' })
  @IsOptional()
  @IsString()
  redirectUrl?: string;

  @ApiPropertyOptional({ example: '22222222-2222-2222-2222-222222222222' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class AddPartnerZoneDto {
  @ApiProperty({ example: '33333333-3333-3333-3333-333333333333' })
  @IsUUID()
  zoneId: string;
}
