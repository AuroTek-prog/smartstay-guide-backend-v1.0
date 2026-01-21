import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { FirebaseUser } from '../firebase-auth/interfaces/firebase-user.interface';
import { SubscribeNotificationsDto } from './notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(firebaseUser: FirebaseUser, payload: SubscribeNotificationsDto) {
    const userId = firebaseUser.localUserId || null;

    return this.prisma.notificationSubscription.upsert({
      where: { token: payload.token },
      create: {
        token: payload.token,
        platform: payload.platform,
        userId,
      },
      update: {
        platform: payload.platform,
        userId,
      },
    });
  }
}
