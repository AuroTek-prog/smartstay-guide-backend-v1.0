import { IsString, IsOptional, IsBoolean, IsArray, IsNumber, IsObject, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * CHANGE: DTO para crear apartamento en ManagerModule
 * Todos los campos sensibles se encriptarán automáticamente en ManagerService
 */
export class CreateApartmentDto {
  @ApiProperty({ description: 'Slug único del apartamento', example: 'sol-101' })
  @IsString()
  slug: string;

  @ApiProperty({ description: 'Nombre del apartamento', example: 'Sol 101 - Centro Madrid' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Dirección completa' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'ID de la ciudad (UUID)' })
  @IsOptional()
  @IsString()
  cityId?: string;

  @ApiPropertyOptional({ description: 'ID de la zona (UUID)' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiPropertyOptional({ description: 'Latitud (temporal, migrar a PostGIS)', example: 40.4168 })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitud (temporal, migrar a PostGIS)', example: -3.7038 })
  @IsOptional()
  @IsNumber()
  lng?: number;

  // CHANGE: Imágenes
  @ApiPropertyOptional({ 
    description: 'URLs de imágenes', 
    example: { portada: 'assets/images/apartments/sol-101/portada.jpg', acceso: 'assets/images/apartments/sol-101/acceso.jpg', gallery: [] } 
  })
  @IsOptional()
  @IsObject()
  images?: {
    portada?: string;
    acceso?: string;
    gallery?: string[];
  };

  // CHANGE: Anfitrión
  @ApiPropertyOptional({ description: 'Nombre del anfitrión' })
  @IsOptional()
  @IsString()
  hostName?: string;

  @ApiPropertyOptional({ description: 'Teléfono del anfitrión' })
  @IsOptional()
  @IsString()
  hostPhone?: string;

  @ApiPropertyOptional({ description: 'URL foto del anfitrión' })
  @IsOptional()
  @IsString()
  hostPhoto?: string;

  // CHANGE: Acceso (sensible - se encriptará)
  @ApiPropertyOptional({ 
    description: 'Tipo de acceso', 
    enum: ['KEYBOX', 'KEYPAD', 'SMART', 'PHYSICAL'],
    example: 'KEYBOX'
  })
  @IsOptional()
  @IsEnum(['KEYBOX', 'KEYPAD', 'SMART', 'PHYSICAL'])
  accessType?: string;

  @ApiPropertyOptional({ 
    description: 'Código de acceso (se encriptará automáticamente)', 
    example: '1234'
  })
  @IsOptional()
  @IsString()
  accessCode?: string;

  @ApiPropertyOptional({ 
    description: 'Instrucciones de acceso paso a paso',
    example: [
      { step: 1, text: 'Busca la caja de llaves en la entrada', image: null },
      { step: 2, text: 'Introduce el código 1234', image: null }
    ]
  })
  @IsOptional()
  @IsArray()
  accessInstructions?: any[];

  // CHANGE: Configuración
  @ApiPropertyOptional({ 
    description: 'Idiomas disponibles', 
    example: ['es', 'en', 'fr'],
    default: ['es']
  })
  @IsOptional()
  @IsArray()
  languages?: string[];

  @ApiPropertyOptional({ 
    description: 'Apartamento publicado (visible para huéspedes)', 
    default: false 
  })
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  // CHANGE: Equipamiento
  @ApiPropertyOptional({ 
    description: 'Equipamiento del apartamento',
    example: {
      climatizacion: 'split',
      cocina: 'induccion',
      lavadora: 'frontal',
      cafetera: 'nespresso'
    }
  })
  @IsOptional()
  @IsObject()
  equipment?: any;

  // CHANGE: Normas
  @ApiPropertyOptional({ 
    description: 'Normas de la casa',
    example: {
      checkIn: '15:00',
      checkOut: '11:00',
      noSmoking: true,
      noPets: false,
      noParties: true,
      quietHours: { start: '22:00', end: '08:00' }
    }
  })
  @IsOptional()
  @IsObject()
  houseRules?: any;

  // CHANGE: Emergencias
  @ApiPropertyOptional({ 
    description: 'Contacto de emergencias 24/7',
    example: {
      name: 'Juan Pérez',
      phone: '+34600123456',
      email: 'emergencias@aurotek.com'
    }
  })
  @IsOptional()
  @IsObject()
  emergencyContact?: any;
}
