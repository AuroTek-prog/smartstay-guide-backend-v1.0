import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, Method } from 'axios';
import { IoTProviderInterface } from '../interfaces/iot-provider.interface';

/**
 * CHANGE: GenericHttpProvider - Proveedor genérico HTTP para cualquier API
 * 
 * Configuración flexible:
 * - URL base configurable
 * - Método HTTP configurable (GET, POST, PUT, DELETE)
 * - Headers personalizables
 * - Auth: Bearer, Basic, API Key
 * 
 * Siempre habilitado (no requiere feature flag)
 */
@Injectable()
export class GenericHttpProvider implements IoTProviderInterface {
  readonly name = 'Generic';
  private readonly logger = new Logger(GenericHttpProvider.name);
  private readonly timeout: number = 5000;

  constructor() {
    this.logger.log('✅ Generic HTTP Provider HABILITADO');
  }

  /**
   * CHANGE: Ejecutar acción HTTP genérica
   * @param deviceId URL del endpoint o ID del dispositivo
   * @param config { 
   *   baseUrl?: string,
   *   method?: 'GET'|'POST'|'PUT'|'DELETE',
   *   headers?: object,
   *   auth?: { type: 'bearer'|'basic'|'apikey', token/username/password/key },
   *   body?: object
   * }
   */
  async openDoor(deviceId: string, config?: any): Promise<boolean> {
    this.logger.log(`[GENERIC HTTP] Ejecutando acción en ${deviceId}`);

    try {
      const client = this.createClient(config);
      const method = (config?.method || 'POST').toLowerCase() as Method;
      const endpoint = config?.endpoint || `/device/${deviceId}/action`;

      const response = await client.request({
        method,
        url: endpoint,
        data: config?.body || { action: 'unlock' },
      });

      if (response.status >= 200 && response.status < 300) {
        this.logger.log(`✅ [GENERIC HTTP] Acción ejecutada exitosamente (${response.status})`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`[GENERIC HTTP] Error: ${error.message}`);
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
      message: success ? 'Acción HTTP ejecutada exitosamente' : 'Fallo al ejecutar acción HTTP',
    };
  }

  /**
   * CHANGE: Obtener estado del dispositivo
   */
  async getDeviceStatus(deviceId: string, config?: any): Promise<any> {
    this.logger.log(`[GENERIC HTTP] Obteniendo estado de ${deviceId}`);

    try {
      const client = this.createClient(config);
      const endpoint = config?.statusEndpoint || `/device/${deviceId}/status`;

      const response = await client.get(endpoint);
      return response.data;
    } catch (error) {
      this.logger.error(`[GENERIC HTTP] Error obteniendo estado: ${error.message}`);
      throw error;
    }
  }

  /**
   * CHANGE: Crear cliente Axios con configuración dinámica
   */
  private createClient(config: any): AxiosInstance {
    const baseURL = config?.baseUrl || 'http://localhost:3000';
    const headers: any = {
      'Content-Type': 'application/json',
      ...(config?.headers || {}),
    };

    // CHANGE: Configurar autenticación
    if (config?.auth) {
      const { type, token, username, password, key } = config.auth;

      if (type === 'bearer' && token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (type === 'apikey' && key) {
        headers['X-API-Key'] = key;
      }
    }

    return axios.create({
      baseURL,
      timeout: config?.timeout || this.timeout,
      headers,
      ...(config?.auth?.type === 'basic' && {
        auth: {
          username: config.auth.username,
          password: config.auth.password,
        },
      }),
    });
  }

  /**
   * CHANGE: Siempre habilitado
   */
  isEnabled(): boolean {
    return true;
  }
}
