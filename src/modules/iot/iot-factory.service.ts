import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RaixerProvider } from './providers/raixer/raixer.provider';
import { ShellyProvider } from './providers/shelly.provider';
import { SonoffProvider } from './providers/sonoff.provider';
import { HomeAssistantProvider } from './providers/homeassistant.provider';
import { NukiSmartLockProvider } from './providers/nuki.provider';
import { GenericHttpProvider } from './providers/generic.provider';
import { IoTProviderInterface } from './interfaces/iot-provider.interface';

/**
 * CHANGE: IoTFactoryService - Factory Pattern para multi-provider IoT
 * 
 * Proveedores soportados:
 * - RAIXER
 * - SHELLY
 * - SONOFF
 * - HOME_ASSISTANT
 * - NUKI
 * - GENERIC (HTTP genérico)
 * 
 * Uso:
 * const provider = iotFactory.getProvider('RAIXER');
 * await provider.openDoor(deviceId, config);
 */
@Injectable()
export class IoTFactoryService {
  private readonly logger = new Logger(IoTFactoryService.name);
  private readonly providers: Map<string, IoTProviderInterface>;

  constructor(
    private readonly configService: ConfigService,
    private readonly raixerProvider: RaixerProvider,
    private readonly shellyProvider: ShellyProvider,
    private readonly sonoffProvider: SonoffProvider,
    private readonly homeAssistantProvider: HomeAssistantProvider,
    private readonly nukiProvider: NukiSmartLockProvider,
    private readonly genericProvider: GenericHttpProvider,
  ) {
    // CHANGE: Registrar todos los providers
    this.providers = new Map<string, IoTProviderInterface>();
    this.providers.set('RAIXER', raixerProvider);
    this.providers.set('SHELLY', shellyProvider);
    this.providers.set('SONOFF', sonoffProvider);
    this.providers.set('HOME_ASSISTANT', homeAssistantProvider);
    this.providers.set('NUKI', nukiProvider);
    this.providers.set('GENERIC', genericProvider);

    this.logger.log(`✅ IoT Factory inicializada con ${this.providers.size} providers`);
  }

  /**
   * CHANGE: Obtener provider por nombre
   * @param providerName RAIXER, SHELLY, SONOFF, HOME_ASSISTANT, NUKI, GENERIC
   * @returns Provider instance
   */
  getProvider(providerName: string): IoTProviderInterface {
    const normalizedName = providerName.toUpperCase();
    const provider = this.providers.get(normalizedName);

    if (!provider) {
      this.logger.warn(`⚠️ Provider ${providerName} no encontrado, usando GENERIC`);
      return this.genericProvider;
    }

    if (!provider.isEnabled()) {
      throw new Error(`Provider ${providerName} está deshabilitado`);
    }

    return provider;
  }

  /**
   * CHANGE: Listar providers habilitados
   */
  getEnabledProviders(): string[] {
    const enabled: string[] = [];

    this.providers.forEach((provider, name) => {
      if (provider.isEnabled()) {
        enabled.push(name);
      }
    });

    return enabled;
  }

  /**
   * CHANGE: Verificar si un provider está habilitado
   */
  isProviderEnabled(providerName: string): boolean {
    const provider = this.providers.get(providerName.toUpperCase());
    return provider ? provider.isEnabled() : false;
  }
}
