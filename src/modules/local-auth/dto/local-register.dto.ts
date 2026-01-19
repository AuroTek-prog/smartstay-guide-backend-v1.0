import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LocalRegisterDto {
  @ApiProperty({ description: 'Email del usuario', example: 'huesped@demo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password (min 8 chars)', example: 'MiClaveSegura123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ description: 'Nombre completo', example: 'Ana Perez' })
  @IsOptional()
  @IsString()
  fullName?: string;
}
