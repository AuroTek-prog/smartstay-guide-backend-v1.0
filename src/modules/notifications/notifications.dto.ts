import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SubscribeNotificationsDto {
  @ApiProperty({ example: 'fcm-token-or-webpush-token' })
  @IsString()
  token: string;

  @ApiPropertyOptional({ example: 'web' })
  @IsOptional()
  @IsString()
  platform?: string;
}
