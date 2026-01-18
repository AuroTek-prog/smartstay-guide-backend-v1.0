import { PartialType } from '@nestjs/swagger';
import { CreateApartmentDto } from './create-apartment.dto';

/**
 * CHANGE: DTO para actualizar apartamento
 * Todos los campos son opcionales (PartialType)
 * Los campos sensibles se re-encriptarán si cambian
 */
export class UpdateApartmentDto extends PartialType(CreateApartmentDto) {}
