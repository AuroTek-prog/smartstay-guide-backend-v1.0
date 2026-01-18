import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { IoTProviderInterface } from '../interfaces/iot-provider.interface';

/**
 * CHANGE: NukiSmartLockProvider - Control de cerraduras Nuki
 * 
 * Funciona con:
 * - Nuki Web API
 * - Nuki Bridge HTTP API (local)
 * 
 * Feature Flag: IOT_NUKI_ENABLED=false (deshabilitado por defecto)
 */
@Injectable()
export class NukiSmartLockProvider implements IoTProviderInterface {
  readonly name = 'Nuki';
  private readonly logger = new Logger(NukiSmartLockProvider.name);
  private readonly enabled: boolean;
  private readonly client: AxiosInstance;
  private readonly timeout: number;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<string>('IOT_NUKI_ENABLED') === 'true';
    this.timeout = parseInt(this.configService.get<string>('IOT_NUKI_TIMEOUT') || '5000', 10);

    if (!this.enabled) {
      this.logger.warn('🔓 Nuki Provider DESHABILITADO (IOT_NUKI_ENABLED != true)');
      return;
    }

    // CHANGE: Cliente Nuki Web API
    const apiUrl = this.configService.get<string>('IOT_NUKI_API_URL') || 'https://api.nuki.io';
    const apiToken = this.configService.get<string>('IOT_NUKI_API_TOKEN');

    this.client = axios.create({
      baseURL: apiUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
    });

    this.logger.log('✅ Nuki Provider HABILITADO');
  }

  /**
   * CHANGE: Abrir puerta Nuki (unlock)
   * @param deviceId Smart Lock ID
   * @param config { action?: 1|2|3|4 } (1=unlock, 2=lock, 3=unlatch, 4=lock'n'go)
   */
  async openDoor(deviceId: string, config?: any): Promise<boolean> {
    if (!this.enabled) {
      throw new Error('Nuki Provider está deshabilitado');
    }

    const action = config?.action || 1; // 1 = unlock

    this.logger.log(`[NUKI] Abriendo cerradura ${deviceId} (acción: ${action})`);

    try {
      // CHANGE: POST /smartlock/{smartlockId}/action
      const response = await this.client.post(`/smartlock/${deviceId}/action`, {
        action,
      });

      if (response.data?.success || response.status === 200) {
        this.logger.log(`✅ [NUKI] Cerradura ${deviceId} desbloqueada`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`[NUKI] Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * CHANGE: Implementación de IoTProviderInterface.openLock
   */
  async openLock(device: any): Promise<any> {
    const config = typeof device.config === 'string' ? JSON.parse(device.config) : device.config;
    const deviceId = config?.smartlockId || config?.deviceId || device.externalDeviceId;
    
    const success = await this.openDoor(deviceId, config);
    
    return {
      success,
      timestamp: new Date(),
      message: success ? 'Cerradura desbloqueada exitosamente' : 'Fallo al desbloquear cerradura',
    };
  }

  /**
   * CHANGE: Obtener estado del dispositivo
   */
  async getDeviceStatus(deviceId: string, config?: any): Promise<any> {
    if (!this.enabled) {
      throw new Error('Nuki Provider está deshabilitado');
    }

    try {
      const response = await this.client.get(`/smartlock/${deviceId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`[NUKI] Error obteniendo estado: ${error.message}`);
      throw error;
    }
  }

  /**
   * CHANGE: Verificar si está habilitado
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
