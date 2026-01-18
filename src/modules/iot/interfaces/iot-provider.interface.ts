import { Device } from '@prisma/client';
import { LockOperationResult } from './lock-operation-result.interface';

/**
 * Interfaz común para todos los providers IoT
 * Cualquier nuevo provider (Shelly, Sonoff, etc.) debe implementar esta interfaz
 */
export interface IoTProviderInterface {
  /**
   * Nombre identificador del provider
   */
  readonly name: string;

  /**
   * Verifica si el provider está habilitado y configurado
   */
  isEnabled(): boolean;

  /**
   * Abre una cerradura/dispositivo
   * @param device Dispositivo de la base de datos
   * @returns Resultado de la operación
   */
  openLock(device: Device): Promise<LockOperationResult>;

  /**
   * Cierra una cerradura/dispositivo (si es soportado)
   * @param device Dispositivo de la base de datos
   * @returns Resultado de la operación
   */
  closeLock?(device: Device): Promise<LockOperationResult>;

  /**
   * Consulta el estado actual del dispositivo
   * @param device Dispositivo de la base de datos
   * @returns Resultado con estado en metadata
   */
  getStatus?(device: Device): Promise<LockOperationResult>;

  /**
   * Genera código de acceso temporal
   * @param device Dispositivo de la base de datos
   * @param validFrom Fecha inicio de validez
   * @param validUntil Fecha fin de validez
   * @returns Resultado con código en metadata
   */
  generateAccessCode?(
    device: Device,
    validFrom: Date,
    validUntil: Date,
  ): Promise<LockOperationResult>;
}
