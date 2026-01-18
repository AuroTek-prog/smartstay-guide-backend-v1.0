/**
 * Interfaces para la API de Raixer
 * Documentación: https://raixer.com/api-docs
 */

/**
 * Respuesta de la API de Raixer al abrir cerradura
 */
export interface RaixerOpenLockResponse {
  success: boolean;
  message: string;
  lockId: string;
  timestamp: string;
  batteryLevel?: number;
}

/**
 * Respuesta de error de Raixer
 */
export interface RaixerErrorResponse {
  error: string;
  code: string;
  details?: string;
}

/**
 * Configuración de credenciales Raixer
 */
export interface RaixerConfig {
  apiUrl: string;
  apiKey: string;
  timeout: number;
  maxRetries: number;
}
