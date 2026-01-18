import { LockOperation } from '../enums/lock-operation.enum';

/**
 * Resultado de una operación IoT
 * Retornado por todos los providers
 */
export interface LockOperationResult {
  /** Indica si la operación fue exitosa */
  success: boolean;

  /** Operación ejecutada */
  operation: LockOperation;

  /** Mensaje descriptivo del resultado */
  message: string;

  /** Timestamp de la operación */
  timestamp: Date;

  /** Datos adicionales específicos del provider */
  metadata?: Record<string, any>;

  /** Error si la operación falló */
  error?: string;

  /** Número de reintentos realizados */
  retries?: number;
}
