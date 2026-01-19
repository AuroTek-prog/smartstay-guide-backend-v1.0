import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LocalLoginDto {
  @ApiProperty({ description: 'Email del usuario', example: 'huesped@demo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password', example: 'MiClaveSegura123' })
  @IsString()
  @MinLength(8)
  password: string;
}
