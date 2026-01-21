import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { FirebaseUser } from '../firebase-auth/interfaces/firebase-user.interface';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveLocalUser(firebaseUser: FirebaseUser) {
    if (firebaseUser.localUserId) {
      return this.prisma.user.findUnique({
        where: { id: firebaseUser.localUserId },
      });
    }

    return this.prisma.user.findUnique({
      where: { firebaseUid: firebaseUser.uid },
    });
  }

  async getMe(firebaseUser: FirebaseUser) {
    const localUser = await this.resolveLocalUser(firebaseUser);

    if (!localUser) {
      throw new NotFoundException('Usuario local no encontrado');
    }

    return {
      firebase: {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        phoneNumber: firebaseUser.phoneNumber,
        permissions: firebaseUser.permissions,
        role: firebaseUser.role,
      },
      localUser: {
        id: localUser.id,
        email: localUser.email,
        fullName: localUser.fullName,
        displayName: localUser.displayName,
        role: localUser.role,
        active: localUser.active,
        createdAt: localUser.createdAt,
        updatedAt: localUser.updatedAt,
      },
    };
  }

  async listMyCompanies(firebaseUser: FirebaseUser) {
    const localUser = await this.resolveLocalUser(firebaseUser);
    if (!localUser) {
      throw new NotFoundException('Usuario local no encontrado');
    }

    return this.prisma.userCompany.findMany({
      where: { userId: localUser.id },
      include: {
        company: true,
        role: true,
      },
      orderBy: {
        company: { createdAt: 'desc' },
      },
    });
  }
}
