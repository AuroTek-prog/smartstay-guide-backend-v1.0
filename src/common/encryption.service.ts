import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * CHANGE: EncryptionService - Servicio de encriptación AES-256-CBC
 * 
 * Encripta datos sensibles como:
 * - Contraseñas WiFi
 * - Códigos de acceso (cajas, cerraduras)
 * - Device IDs (Raixer, Shelly, Sonoff, HA)
 * - Credenciales de APIs
 * 
 * Feature Flag: ENCRYPTION_ENABLED (default: false)
 * Variables requeridas: ENCRYPTION_KEY (32 chars), ENCRYPTION_IV (16 chars)
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly enabled: boolean;
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;
  private readonly iv: Buffer;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<string>('ENCRYPTION_ENABLED') === 'true';

    if (!this.enabled) {
      this.logger.warn('🔓 Encryption DESHABILITADO (ENCRYPTION_ENABLED != true)');
      this.logger.warn('📝 Datos sensibles se almacenarán en texto plano');
      // CHANGE: Usar claves dummy cuando está deshabilitado
      this.key = Buffer.alloc(32);
      this.iv = Buffer.alloc(16);
      return;
    }

    // CHANGE: Validar claves de encriptación
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    const encryptionIv = this.configService.get<string>('ENCRYPTION_IV');

    if (!encryptionKey || encryptionKey.length !== 32) {
      throw new Error('ENCRYPTION_KEY debe ser exactamente 32 caracteres');
    }

    if (!encryptionIv || encryptionIv.length !== 16) {
      throw new Error('ENCRYPTION_IV debe ser exactamente 16 caracteres');
    }

    this.key = Buffer.from(encryptionKey, 'utf8');
    this.iv = Buffer.from(encryptionIv, 'utf8');

    this.logger.log('✅ Encryption Service HABILITADO (AES-256-CBC)');
  }

  /**
   * CHANGE: Encripta un string usando AES-256-CBC
   * @param text Texto a encriptar
   * @returns Texto encriptado en formato hexadecimal
   */
  encrypt(text: string): string {
    if (!this.enabled) {
      // CHANGE: Si está deshabilitado, retornar texto plano
      return text;
    }

    try {
      const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      this.logger.error(`Error encriptando: ${error.message}`);
      throw new Error('Error al encriptar datos sensibles');
    }
  }

  /**
   * CHANGE: Desencripta un string usando AES-256-CBC
   * @param encryptedText Texto encriptado en formato hexadecimal
   * @returns Texto desencriptado
   */
  decrypt(encryptedText: string): string {
    if (!this.enabled) {
      // CHANGE: Si está deshabilitado, retornar tal cual
      return encryptedText;
    }

    try {
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logger.error(`Error desencriptando: ${error.message}`);
      throw new Error('Error al desencriptar datos sensibles');
    }
  }

  /**
   * CHANGE: Encripta un objeto JSON completo
   * @param data Objeto a encriptar
   * @returns String encriptado
   */
  encryptJson(data: any): string {
    const jsonString = JSON.stringify(data);
    return this.encrypt(jsonString);
  }

  /**
   * CHANGE: Desencripta un string y parsea a JSON
   * @param encryptedText String encriptado
   * @returns Objeto parseado
   */
  decryptJson(encryptedText: string): any {
    const decrypted = this.decrypt(encryptedText);
    return JSON.parse(decrypted);
  }

  /**
   * CHANGE: Verifica si el servicio está habilitado
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
