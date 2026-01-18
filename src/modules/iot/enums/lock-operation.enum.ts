/**
 * Operaciones soportadas sobre dispositivos IoT
 */
export enum LockOperation {
  /** Abrir cerradura */
  OPEN = 'OPEN',

  /** Cerrar cerradura */
  CLOSE = 'CLOSE',

  /** Consultar estado actual */
  STATUS = 'STATUS',

  /** Generar código de acceso temporal */
  GENERATE_CODE = 'GENERATE_CODE',

  /** Revocar código de acceso */
  REVOKE_CODE = 'REVOKE_CODE',
}
