import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { IoTProviderInterface } from '../interfaces/iot-provider.interface';

/**
 * CHANGE: HomeAssistantProvider - Control de dispositivos vía Home Assistant
 * 
 * Funciona con:
 * - Home Assistant REST API
 * - Entidades: lock.*, switch.*, cover.*
 * 
 * Feature Flag: IOT_HA_ENABLED=false (deshabilitado por defecto)
 */
@Injectable()
export class HomeAssistantProvider implements IoTProviderInterface {
  readonly name = 'HomeAssistant';
  private readonly logger = new Logger(HomeAssistantProvider.name);
  private readonly enabled: boolean;
  private readonly client: AxiosInstance;
  private readonly timeout: number;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<string>('IOT_HA_ENABLED') === 'true';
    this.timeout = parseInt(this.configService.get<string>('IOT_HA_TIMEOUT') || '5000', 10);

    if (!this.enabled) {
      this.logger.warn('🔓 Home Assistant Provider DESHABILITADO (IOT_HA_ENABLED != true)');
      return;
    }

    // CHANGE: Cliente Home Assistant REST API
    const haUrl = this.configService.get<string>('IOT_HA_URL') || 'http://homeassistant.local:8123';
    const accessToken = this.configService.get<string>('IOT_HA_ACCESS_TOKEN');

    if (!accessToken) {
      this.logger.error('⚠️ IOT_HA_ACCESS_TOKEN no configurado');
    }

    this.client = axios.create({
      baseURL: `${haUrl}/api`,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    this.logger.log(`✅ Home Assistant Provider HABILITADO (${haUrl})`);
  }

  /**
   * CHANGE: Abrir puerta/lock vía Home Assistant
   * @param deviceId Entity ID (ej: lock.front_door, switch.garage_relay)
   * @param config { action?: 'unlock'|'turn_on'|'open' }
   */
  async openDoor(deviceId: string, config?: any): Promise<boolean> {
    if (!this.enabled) {
      throw new Error('Home Assistant Provider está deshabilitado');
    }

    this.logger.log(`[HOME ASSISTANT] Abriendo ${deviceId}`);

    try {
      // CHANGE: Detectar tipo de entidad
      const domain = deviceId.split('.')[0];
      let service: string;

      switch (domain) {
        case 'lock':
          service = 'unlock';
          break;
        case 'switch':
          service = 'turn_on';
          break;
        case 'cover':
          service = 'open_cover';
          break;
        default:
          service = config?.action || 'turn_on';
      }

      const response = await this.client.post(`/services/${domain}/${service}`, {
        entity_id: deviceId,
      });

      if (response.status === 200) {
        this.logger.log(`✅ [HOME ASSISTANT] ${deviceId} → ${service} ejecutado`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`[HOME ASSISTANT] Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * CHANGE: Implementación de IoTProviderInterface.openLock
   */
  async openLock(device: any): Promise<any> {
    const config = typeof device.config === 'string' ? JSON.parse(device.config) : device.config;
    const deviceId = config?.entityId || config?.deviceId || device.externalDeviceId;
    
    const success = await this.openDoor(deviceId, config);
    
    return {
      success,
      timestamp: new Date(),
      message: success ? 'Dispositivo activado exitosamente' : 'Fallo al activar dispositivo',
    };
  }

  /**
   * CHANGE: Obtener estado del dispositivo
   */
  async getDeviceStatus(deviceId: string, config?: any): Promise<any> {
    if (!this.enabled) {
      throw new Error('Home Assistant Provider está deshabilitado');
    }

    try {
      const response = await this.client.get(`/states/${deviceId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`[HOME ASSISTANT] Error obteniendo estado: ${error.message}`);
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
