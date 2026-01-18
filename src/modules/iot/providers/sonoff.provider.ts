import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { IoTProviderInterface } from '../interfaces/iot-provider.interface';

/**
 * CHANGE: SonoffProvider - Control de dispositivos Sonoff/eWeLink
 * 
 * Modos:
 * - LAN: Control directo en red local
 * - CLOUD: Control vía eWeLink Cloud API
 * - IHOST: Control vía iHost (hub local Sonoff)
 * 
 * Feature Flag: IOT_SONOFF_ENABLED=false (deshabilitado por defecto)
 */
@Injectable()
export class SonoffProvider implements IoTProviderInterface {
  readonly name = 'Sonoff';
  private readonly logger = new Logger(SonoffProvider.name);
  private readonly enabled: boolean;
  private readonly cloudClient: AxiosInstance;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<string>('IOT_SONOFF_ENABLED') === 'true';
    this.timeout = parseInt(this.configService.get<string>('IOT_SONOFF_TIMEOUT') || '5000', 10);
    this.maxRetries = parseInt(this.configService.get<string>('IOT_SONOFF_MAX_RETRIES') || '3', 10);

    if (!this.enabled) {
      this.logger.warn('🔓 Sonoff Provider DESHABILITADO (IOT_SONOFF_ENABLED != true)');
      return;
    }

    // CHANGE: Cliente eWeLink Cloud API
    const cloudApiUrl = this.configService.get<string>('IOT_SONOFF_CLOUD_URL') || 'https://eu-apia.coolkit.cc';
    const region = this.configService.get<string>('IOT_SONOFF_REGION') || 'eu';

    this.cloudClient = axios.create({
      baseURL: cloudApiUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`✅ Sonoff Provider HABILITADO (región: ${region})`);
  }

  /**
   * CHANGE: Abrir puerta/relay Sonoff
   * @param deviceId ID del dispositivo Sonoff
   * @param config { mode: 'lan'|'cloud'|'ihost', authToken?, channel? }
   */
  async openDoor(deviceId: string, config?: any): Promise<boolean> {
    if (!this.enabled) {
      throw new Error('Sonoff Provider está deshabilitado');
    }

    const mode = config?.mode || 'cloud';
    const channel = config?.channel || 0;

    this.logger.log(`[SONOFF] Abriendo relay ${deviceId} (modo: ${mode}, canal: ${channel})`);

    try {
      if (mode === 'cloud') {
        return await this.openDoorCloud(deviceId, config);
      } else if (mode === 'ihost') {
        return await this.openDooriHost(deviceId, config);
      } else {
        return await this.openDoorLAN(deviceId, config);
      }
    } catch (error) {
      this.logger.error(`[SONOFF] Error abriendo relay: ${error.message}`);
      throw error;
    }
  }

  /**
   * CHANGE: Implementación de IoTProviderInterface.openLock
   */
  async openLock(device: any): Promise<any> {
    const config = typeof device.config === 'string' ? JSON.parse(device.config) : device.config;
    const deviceId = config?.deviceId || device.externalDeviceId;
    
    const success = await this.openDoor(deviceId, config);
    
    return {
      success,
      timestamp: new Date(),
      message: success ? 'Relay activado exitosamente' : 'Fallo al activar relay',
    };
  }

  /**
   * CHANGE: Abrir relay vía eWeLink Cloud API
   */
  private async openDoorCloud(deviceId: string, config: any): Promise<boolean> {
    const authToken = config?.authToken || this.configService.get<string>('IOT_SONOFF_AUTH_TOKEN');

    if (!authToken) {
      throw new Error('Sonoff Auth Token no configurado');
    }

    // CHANGE: API eWeLink v2 - Activar switch
    const response = await this.cloudClient.post(
      '/v2/device/thing/status',
      {
        type: 1,
        id: deviceId,
        params: {
          switch: 'on',
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      },
    );

    if (response.data?.error === 0 || response.status === 200) {
      this.logger.log(`✅ [SONOFF CLOUD] Relay ${deviceId} activado`);
      return true;
    }

    return false;
  }

  /**
   * CHANGE: Abrir relay vía iHost (hub local)
   */
  private async openDooriHost(deviceId: string, config: any): Promise<boolean> {
    const ihostIp = config?.ihostIp || this.configService.get<string>('IOT_SONOFF_IHOST_IP');
    const authToken = config?.authToken || this.configService.get<string>('IOT_SONOFF_IHOST_TOKEN');

    if (!ihostIp) {
      throw new Error('iHost IP no configurado');
    }

    const url = `http://${ihostIp}/api/v1/devices/${deviceId}/action`;

    const response = await axios.post(
      url,
      {
        action: 'switch',
        params: { switch: 'on' },
      },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        timeout: this.timeout,
      },
    );

    if (response.status === 200) {
      this.logger.log(`✅ [SONOFF IHOST] Relay ${deviceId} activado`);
      return true;
    }

    return false;
  }

  /**
   * CHANGE: Abrir relay vía LAN (modo local)
   */
  private async openDoorLAN(deviceId: string, config: any): Promise<boolean> {
    // CHANGE: Requiere descubrimiento de dispositivo en red local (mDNS)
    // Por simplicidad, lanzar error indicando que requiere implementación
    throw new Error('Sonoff LAN mode requiere implementación de mDNS discovery');
  }

  /**
   * CHANGE: Obtener estado del dispositivo
   */
  async getDeviceStatus(deviceId: string, config?: any): Promise<any> {
    if (!this.enabled) {
      throw new Error('Sonoff Provider está deshabilitado');
    }

    const authToken = config?.authToken || this.configService.get<string>('IOT_SONOFF_AUTH_TOKEN');

    try {
      const response = await this.cloudClient.get(`/v2/device/thing?id=${deviceId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      return response.data?.data || response.data;
    } catch (error) {
      this.logger.error(`[SONOFF] Error obteniendo estado: ${error.message}`);
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
