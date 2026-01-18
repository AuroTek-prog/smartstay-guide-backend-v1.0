import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * CHANGE: EmailService - Servicio de notificaciones por email (FASE 9)
 * 
 * Integraciones: SendGrid, Mailgun (implementación simplificada)
 * Feature Flag: EMAIL_ENABLED=false (deshabilitado por defecto)
 * 
 * Funcionalidades:
 * - Confirmación alta apartamento
 * - Alertas acceso fallido
 * - Recordatorios de facturación
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<string>('EMAIL_ENABLED') === 'true';

    if (!this.enabled) {
      this.logger.warn('🔓 Email Service DESHABILITADO (EMAIL_ENABLED != true)');
      this.logger.warn('📝 Notificaciones por email no se enviarán');
      return;
    }

    this.logger.log('✅ Email Service HABILITADO');
  }

  /**
   * CHANGE: Enviar email de confirmación de apartamento
   */
  async sendApartmentConfirmation(email: string, apartmentName: string): Promise<boolean> {
    if (!this.enabled) {
      this.logger.log(`[EMAIL] Skipping (deshabilitado): Confirmación apartamento ${apartmentName} a ${email}`);
      return false;
    }

    this.logger.log(`📧 [EMAIL] Enviando confirmación apartamento ${apartmentName} a ${email}`);

    // CHANGE: Implementación simplificada (stub)
    // TODO: Integrar con SendGrid/Mailgun

    return true;
  }

  /**
   * CHANGE: Enviar alerta de acceso fallido
   */
  async sendAccessFailedAlert(email: string, deviceName: string): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    this.logger.log(`⚠️ [EMAIL] Enviando alerta acceso fallido ${deviceName} a ${email}`);

    // CHANGE: Stub

    return true;
  }

  /**
   * CHANGE: Enviar recordatorio de facturación
   */
  async sendBillingReminder(email: string, amount: number): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    this.logger.log(`💰 [EMAIL] Enviando recordatorio facturación $${amount} a ${email}`);

    // CHANGE: Stub

    return true;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
