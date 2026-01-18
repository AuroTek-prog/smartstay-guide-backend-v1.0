import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { IoTProviderInterface } from '../interfaces/iot-provider.interface';

/**
 * CHANGE: ShellyProvider - Control de dispositivos Shelly (IP local + Cloud API)
 * 
 * Modos:
 * - LOCAL: Control directo por IP local
 * - CLOUD: Control vía Shelly Cloud API
 * 
 * Feature Flag: IOT_SHELLY_ENABLED=false (deshabilitado por defecto)
 */
@Injectable()
export class ShellyProvider implements IoTProviderInterface {
  readonly name = 'Shelly';
  private readonly logger = new Logger(ShellyProvider.name);
  private readonly enabled: boolean;
  private readonly cloudClient: AxiosInstance;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<string>('IOT_SHELLY_ENABLED') === 'true';
    this.timeout = parseInt(this.configService.get<string>('IOT_SHELLY_TIMEOUT') || '5000', 10);
    this.maxRetries = parseInt(this.configService.get<string>('IOT_SHELLY_MAX_RETRIES') || '3', 10);

    if (!this.enabled) {
      this.logger.warn('🔓 Shelly Provider DESHABILITADO (IOT_SHELLY_ENABLED != true)');
      return;
    }

    // CHANGE: Cliente Cloud API
    const cloudApiUrl = this.configService.get<string>('IOT_SHELLY_CLOUD_URL') || 'https://shelly-api-cloud.shelly.cloud';
    const apiKey = this.configService.get<string>('IOT_SHELLY_API_KEY');

    this.cloudClient = axios.create({
      baseURL: cloudApiUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` }),
      },
    });

    this.logger.log('✅ Shelly Provider HABILITADO');
  }

  /**
   * CHANGE: Abrir puerta/relay Shelly
   * @param deviceId IP local o ID del dispositivo en Cloud
   * @param config { mode: 'local'|'cloud', username?, password?, channel? }
   */
  async openDoor(deviceId: string, config?: any): Promise<boolean> {
    if (!this.enabled) {
      throw new Error('Shelly Provider está deshabilitado');
    }

    const mode = config?.mode || 'local';
    const channel = config?.channel || 0;

    this.logger.log(`[SHELLY] Abriendo relay ${deviceId} (modo: ${mode}, canal: ${channel})`);

    try {
      if (mode === 'local') {
        return await this.openDoorLocal(deviceId, config);
      } else {
        return await this.openDoorCloud(deviceId, channel);
      }
    } catch (error) {
      this.logger.error(`[SHELLY] Error abriendo relay: ${error.message}`);
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
   * CHANGE: Abrir relay por IP local
   */
  private async openDoorLocal(ip: string, config: any): Promise<boolean> {
    const username = config?.username;
    const password = config?.password;
    const channel = config?.channel || 0;

    // CHANGE: URL para Shelly 1/1PM/2.5: /relay/{channel}?turn=on
    const url = `http://${ip}/relay/${channel}?turn=on`;

    const localClient = axios.create({
      timeout: this.timeout,
      ...(username && password && {
        auth: { username, password },
      }),
    });

    const response = await localClient.get(url);

    if (response.data?.ison === true || response.status === 200) {
      this.logger.log(`✅ [SHELLY LOCAL] Relay ${ip} canal ${channel} activado`);
      return true;
    }

    return false;
  }

  /**
   * CHANGE: Abrir relay vía Cloud API
   */
  private async openDoorCloud(deviceId: string, channel: number): Promise<boolean> {
    const response = await this.cloudClient.post('/device/relay/control', {
      id: deviceId,
      channel,
      turn: 'on',
    });

    if (response.data?.isok || response.status === 200) {
      this.logger.log(`✅ [SHELLY CLOUD] Relay ${deviceId} canal ${channel} activado`);
      return true;
    }

    return false;
  }

  /**
   * CHANGE: Obtener estado del dispositivo
   */
  async getDeviceStatus(deviceId: string, config?: any): Promise<any> {
    if (!this.enabled) {
      throw new Error('Shelly Provider está deshabilitado');
    }

    const mode = config?.mode || 'local';

    try {
      if (mode === 'local') {
        const url = `http://${deviceId}/status`;
        const response = await axios.get(url, { timeout: this.timeout });
        return response.data;
      } else {
        const response = await this.cloudClient.get(`/device/status?id=${deviceId}`);
        return response.data;
      }
    } catch (error) {
      this.logger.error(`[SHELLY] Error obteniendo estado: ${error.message}`);
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
