import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../common/prisma.module';
import { IoTService } from './iot.service';
import { IoTController } from './iot.controller';
import { RaixerProvider } from './providers/raixer/raixer.provider';
// CHANGE: FASE 7 - Multi-Provider IoT
import { ShellyProvider } from './providers/shelly.provider';
import { SonoffProvider } from './providers/sonoff.provider';
import { HomeAssistantProvider } from './providers/homeassistant.provider';
import { NukiSmartLockProvider } from './providers/nuki.provider';
import { GenericHttpProvider } from './providers/generic.provider';
import { IoTFactoryService } from './iot-factory.service';

/**
 * Módulo IoT - Gestión de dispositivos inteligentes multi-provider
 * 
 * Providers soportados (FASE 7):
 * - Raixer (smart locks) - IOT_RAIXER_ENABLED
 * - Shelly (relays, switches) - IOT_SHELLY_ENABLED
 * - Sonoff/eWeLink (smart switches) - IOT_SONOFF_ENABLED
 * - Home Assistant (hub) - IOT_HA_ENABLED
 * - Nuki (smart locks) - IOT_NUKI_ENABLED
 * - Generic HTTP (cualquier API) - Siempre habilitado
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
  ],
  providers: [
    IoTService,
    // CHANGE: Todos los providers
    RaixerProvider,
    ShellyProvider,
    SonoffProvider,
    HomeAssistantProvider,
    NukiSmartLockProvider,
    GenericHttpProvider,
    // CHANGE: Factory Service
    IoTFactoryService,
  ],
  controllers: [IoTController],
  exports: [
    IoTService,
    IoTFactoryService, // CHANGE: Exportar factory para uso externo
  ],
})
export class IoTModule {}
