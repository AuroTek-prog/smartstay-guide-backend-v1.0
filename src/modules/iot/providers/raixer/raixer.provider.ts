import { Injectable, Logger } from '@nestjs/common';
import { Device } from '@prisma/client';
import { IoTProviderInterface } from '../../interfaces/iot-provider.interface';
import { LockOperationResult } from '../../interfaces/lock-operation-result.interface';
import { LockOperation } from '../../enums/lock-operation.enum';
import {
  RaixerOpenLockResponse,
  RaixerErrorResponse,
  RaixerConfig,
} from './raixer-api.interface';

/**
 * Provider para dispositivos Raixer
 * Implementa retry automático y timeout
 */
@Injectable()
export class RaixerProvider implements IoTProviderInterface {
  readonly name = 'RAIXER';
  private readonly logger = new Logger(RaixerProvider.name);
  private config: RaixerConfig;
  private enabled = false;

  constructor() {
    this.initializeConfig();
  }

  /**
   * Inicializa configuración desde variables de entorno
   */
  private initializeConfig(): void {
    if (process.env.IOT_RAIXER_ENABLED !== 'true') {
      this.logger.warn('🔓 Raixer Provider DESHABILITADO');
      return;
    }

    const apiUrl = process.env.IOT_RAIXER_API_URL;
    const apiKey = process.env.IOT_RAIXER_API_KEY;

    if (!apiUrl || !apiKey) {
      this.logger.error(
        '❌ Raixer habilitado pero faltan credenciales (IOT_RAIXER_API_URL, IOT_RAIXER_API_KEY)',
      );
      return;
    }

    this.config = {
      apiUrl,
      apiKey,
      timeout: parseInt(process.env.IOT_RAIXER_TIMEOUT || '5000', 10),
      maxRetries: parseInt(process.env.IOT_RAIXER_MAX_RETRIES || '3', 10),
    };

    this.enabled = true;
    this.logger.log('✅ Raixer Provider habilitado');
  }

  /**
   * Verifica si el provider está habilitado
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Abre una cerradura Raixer
   * Implementa retry automático con backoff exponencial
   */
  async openLock(device: Device): Promise<LockOperationResult> {
    if (!this.isEnabled()) {
      return this.createErrorResult(
        LockOperation.OPEN,
        'Raixer provider no está habilitado',
      );
    }

    // Validar que el device tenga external_id
    if (!device.externalDeviceId) {
      return this.createErrorResult(
        LockOperation.OPEN,
        'Dispositivo no tiene externalDeviceId configurado',
      );
    }

    this.logger.log(
      `🔓 Intentando abrir cerradura Raixer: ${device.externalDeviceId}`,
    );

    // Ejecutar con retry
    let lastError: string = '';
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await this.executeOpenLock(device.externalDeviceId);

        this.logger.log(
          `✅ Cerradura abierta exitosamente (intento ${attempt}/${this.config.maxRetries})`,
        );

        return {
          success: true,
          operation: LockOperation.OPEN,
          message: 'Cerradura abierta exitosamente',
          timestamp: new Date(),
          metadata: {
            lockId: result.lockId,
            batteryLevel: result.batteryLevel,
            provider: this.name,
          },
          retries: attempt - 1,
        };
      } catch (error) {
        lastError = error.message;
        this.logger.warn(
          `⚠️ Intento ${attempt}/${this.config.maxRetries} falló: ${lastError}`,
        );

        // Esperar antes de reintentar (backoff exponencial)
        if (attempt < this.config.maxRetries) {
          const delay = Math.pow(2, attempt) * 500; // 1s, 2s, 4s
          await this.sleep(delay);
        }
      }
    }

    // Todos los intentos fallaron
    this.logger.error(
      `❌ Falló abrir cerradura después de ${this.config.maxRetries} intentos`,
    );

    return this.createErrorResult(
      LockOperation.OPEN,
      `Error después de ${this.config.maxRetries} intentos: ${lastError}`,
      this.config.maxRetries,
    );
  }

  /**
   * Ejecuta la llamada HTTP a la API de Raixer
   */
  private async executeOpenLock(
    lockId: string,
  ): Promise<RaixerOpenLockResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.apiUrl}/locks/${lockId}/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error: RaixerErrorResponse = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data: RaixerOpenLockResponse = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Timeout después de ${this.config.timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Consulta estado del dispositivo (opcional)
   */
  async getStatus(device: Device): Promise<LockOperationResult> {
    if (!this.isEnabled()) {
      return this.createErrorResult(
        LockOperation.STATUS,
        'Raixer provider no está habilitado',
      );
    }

    // TODO: Implementar cuando Raixer API tenga endpoint de status
    return {
      success: false,
      operation: LockOperation.STATUS,
      message: 'Operación no implementada',
      timestamp: new Date(),
    };
  }

  /**
   * Helper: crea resultado de error
   */
  private createErrorResult(
    operation: LockOperation,
    error: string,
    retries = 0,
  ): LockOperationResult {
    return {
      success: false,
      operation,
      message: 'Operación falló',
      timestamp: new Date(),
      error,
      retries,
    };
  }

  /**
   * Helper: sleep promise
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
