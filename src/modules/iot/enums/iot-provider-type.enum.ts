/**
 * Tipos de providers IoT soportados
 * Cada provider maneja cerraduras/dispositivos de un fabricante específico
 */
export enum IoTProviderType {
  /** Raixer - Smart locks */
  RAIXER = 'RAIXER',

  /** Shelly - Relays and smart switches (futuro) */
  SHELLY = 'SHELLY',

  /** Sonoff - WiFi switches (futuro) */
  SONOFF = 'SONOFF',

  /** TTLock - Smart locks (futuro) */
  TTLOCK = 'TTLOCK',

  /** Mock provider para testing */
  MOCK = 'MOCK',
}
