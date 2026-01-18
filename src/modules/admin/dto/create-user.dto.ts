import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * CHANGE: DTO para crear usuario desde panel Admin
 */
export class CreateUserDto {
  @ApiProperty({ description: 'Email del usuario' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Contraseña (hash se genera automáticamente)' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: 'Nombre completo' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Firebase UID (si usa Firebase Auth)' })
  @IsOptional()
  @IsString()
  firebaseUid?: string;

  @ApiPropertyOptional({ description: 'Rol del usuario', enum: ['ADMIN', 'MANAGER', 'PARTNER', 'SUPPORT'] })
  @IsOptional()
  @IsEnum(['ADMIN', 'MANAGER', 'PARTNER', 'SUPPORT'])
  role?: string;
}
