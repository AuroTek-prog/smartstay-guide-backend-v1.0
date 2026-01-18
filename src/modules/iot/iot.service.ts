import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Device } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { IoTProviderInterface } from './interfaces/iot-provider.interface';
import { LockOperationResult } from './interfaces/lock-operation-result.interface';
import { LockOperation } from './enums/lock-operation.enum';
import { IoTProviderType } from './enums/iot-provider-type.enum';
import { RaixerProvider } from './providers/raixer/raixer.provider';

/**
 * Servicio orquestador de IoT
 * Selecciona el provider correcto según el dispositivo
 * y registra todas las operaciones en AccessLog
 */
@Injectable()
export class IoTService {
  private readonly logger = new Logger(IoTService.name);

  constructor(
    private prisma: PrismaService,
    private raixerProvider: RaixerProvider,
    // Futuros providers se inyectan aquí:
    // private shellyProvider: ShellyProvider,
    // private sonoffProvider: SonoffProvider,
  ) {}

  /**
   * Abre una cerradura por ID de dispositivo
   * Selecciona automáticamente el provider correcto
   */
  async openLockByDeviceId(deviceId: string): Promise<LockOperationResult> {
    // 1. Buscar dispositivo en BD
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: { unit: true },
    });

    if (!device) {
      throw new NotFoundException(`Dispositivo ${deviceId} no encontrado`);
    }

    // 2. Ejecutar operación
    const result = await this.openLock(device);

    // 3. Registrar en AccessLog
    await this.logAccess(device, result);

    return result;
  }

  /**
   * Abre una cerradura (recibe Device completo)
   */
  async openLock(device: Device): Promise<LockOperationResult> {
    this.logger.log(`🔓 Abriendo cerradura: ${device.name} (${device.provider})`);

    // Seleccionar provider según el tipo
    const provider = this.getProvider(device.provider as IoTProviderType);

    if (!provider) {
      return {
        success: false,
        operation: LockOperation.OPEN,
        message: `Provider ${device.provider} no soportado`,
        timestamp: new Date(),
        error: 'PROVIDER_NOT_SUPPORTED',
      };
    }

    if (!provider.isEnabled()) {
      return {
        success: false,
        operation: LockOperation.OPEN,
        message: `Provider ${device.provider} no está habilitado`,
        timestamp: new Date(),
        error: 'PROVIDER_DISABLED',
      };
    }

    // Ejecutar operación en el provider
    try {
      const result = await provider.openLock(device);
      return result;
    } catch (error) {
      this.logger.error(`❌ Error abriendo cerradura: ${error.message}`);
      return {
        success: false,
        operation: LockOperation.OPEN,
        message: 'Error ejecutando operación',
        timestamp: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Consulta estado de un dispositivo
   */
  async getDeviceStatus(deviceId: string): Promise<LockOperationResult> {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException(`Dispositivo ${deviceId} no encontrado`);
    }

    const provider = this.getProvider(device.provider as IoTProviderType);

    if (!provider?.getStatus) {
      return {
        success: false,
        operation: LockOperation.STATUS,
        message: 'Operación no soportada por este provider',
        timestamp: new Date(),
      };
    }

    return provider.getStatus(device);
  }

  /**
   * Factory: selecciona provider según el tipo
   * Para añadir Shelly/Sonoff, solo agregar case aquí
   */
  private getProvider(type: IoTProviderType): IoTProviderInterface | null {
    switch (type) {
      case IoTProviderType.RAIXER:
        return this.raixerProvider;

      // Futuros providers:
      // case IoTProviderType.SHELLY:
      //   return this.shellyProvider;
      //
      // case IoTProviderType.SONOFF:
      //   return this.sonoffProvider;

      default:
        this.logger.warn(`⚠️ Provider desconocido: ${type}`);
        return null;
    }
  }

  /**
   * Registra operación en AccessLog
   */
  private async logAccess(
    device: Device,
    result: LockOperationResult,
  ): Promise<void> {
    try {
      // Validar que device tenga unitId
      if (!device.unitId) {
        this.logger.warn(`Device ${device.id} no tiene unitId, no se registra log`);
        return;
      }

      await this.prisma.accessLog.create({
        data: {
          unitId: device.unitId,
          deviceId: device.id,
          action: result.success ? 'unlock' : 'unlock_failed',
          success: result.success,
          ipAddress: null,
          userAgent: null,
        },
      });

      this.logger.debug(`📝 AccessLog registrado para dispositivo ${device.id}`);
    } catch (error) {
      // No fallar si el log falla
      this.logger.error(`⚠️ Error registrando AccessLog: ${error.message}`);
    }
  }
}
