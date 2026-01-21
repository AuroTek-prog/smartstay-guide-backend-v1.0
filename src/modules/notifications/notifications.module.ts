import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma.module';
import { FirebaseAuthModule } from '../firebase-auth/firebase-auth.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PrismaModule, FirebaseAuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
