import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiProperty } from '@nestjs/swagger';
import { IoTService } from './iot.service';
import { FirebaseAuthGuard } from '../firebase-auth/firebase-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';

class OpenDoorDto {
  @ApiProperty({ description: 'ID del dispositivo', example: 'device-123' })
  deviceId: string;
}

/**
 * Controlador de prueba para operaciones IoT
 * SECURITY: Endpoints protegidos con FirebaseAuthGuard y AdminGuard
 */
@ApiTags('IoT')
@Controller('iot')
@UseGuards(FirebaseAuthGuard, AdminGuard)
@ApiBearerAuth()
export class IoTController {
  constructor(private iotService: IoTService) {}

  /**
   * Endpoint de prueba: abrir cerradura por ID
   * SECURITY: Requiere autenticación + rol ADMIN
   */
  @Post('/open-door')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Abre una cerradura por ID de dispositivo (ADMIN only)',
    description: 'Ejecuta comando de apertura en el proveedor IoT configurado.',
  })
  @ApiBody({ type: OpenDoorDto })
  @ApiResponse({ status: 200, description: 'Operación ejecutada' })
  @ApiResponse({ status: 404, description: 'Dispositivo no encontrado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Requiere rol ADMIN' })
  async openDoor(@Body() dto: OpenDoorDto) {
    const result = await this.iotService.openLockByDeviceId(dto.deviceId);
    return {
      ...result,
      timestamp: result.timestamp.toISOString(),
    };
  }

  /**
   * Consulta estado de un dispositivo
   * SECURITY: Requiere autenticación + rol ADMIN
   */
  @Get('/device/:deviceId/status')
  @ApiOperation({
    summary: 'Consulta el estado de un dispositivo IoT (ADMIN only)',
    description: 'Consulta el estado actual del dispositivo en el proveedor.',
  })
  @ApiParam({ name: 'deviceId', description: 'ID del dispositivo', example: 'device-123' })
  @ApiResponse({ status: 200, description: 'Estado del dispositivo' })
  @ApiResponse({ status: 404, description: 'Dispositivo no encontrado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Requiere rol ADMIN' })
  async getDeviceStatus(@Param('deviceId') deviceId: string) {
    const result = await this.iotService.getDeviceStatus(deviceId);
    return {
      ...result,
      timestamp: result.timestamp.toISOString(),
    };
  }
}
