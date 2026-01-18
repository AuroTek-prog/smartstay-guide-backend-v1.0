import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

/**
 * CHANGE: DTO para actualizar usuario
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {}
