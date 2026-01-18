import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';

/**
 * CHANGE: EmailModule - Notificaciones por email (FASE 9)
 * 
 * Feature Flag: EMAIL_ENABLED=false
 */
@Module({
  imports: [ConfigModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
