import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FirebaseAuthService } from './firebase-auth.service';
import { PrismaService } from '../../common/prisma.service';
import { RequireAuth } from './decorators/require-auth.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { FirebaseUser } from './interfaces/firebase-user.interface';

class LinkFirebaseDto {
  userId: string;
}

class UnlinkFirebaseDto {
  userId: string;
}

@ApiTags('Firebase Auth')
@Controller('auth/firebase')
export class FirebaseAuthController {
  constructor(
    private firebaseAuthService: FirebaseAuthService,
    private prisma: PrismaService,
  ) {}

  /**
   * Endpoint para verificar si Firebase está habilitado
   */
  @Get('/status')
  @ApiOperation({ summary: 'Verifica si Firebase Auth está habilitado' })
  @ApiResponse({ status: 200, description: 'Estado de Firebase' })
  getStatus() {
    return {
      enabled: this.firebaseAuthService.isEnabled(),
      message: this.firebaseAuthService.isEnabled()
        ? 'Firebase Auth está activo'
        : 'Firebase Auth está deshabilitado',
    };
  }

  /**
   * Asocia el Firebase UID del usuario autenticado con un usuario existente
   * Requiere que el usuario esté autenticado con Firebase
   */
  @Post('/link')
  @RequireAuth()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Asocia Firebase UID con usuario existente' })
  @ApiResponse({ status: 200, description: 'Usuario asociado correctamente' })
  @ApiResponse({ status: 400, description: 'Firebase no habilitado o datos inválidos' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async linkFirebase(
    @CurrentUser() firebaseUser: FirebaseUser,
    @Body() dto: LinkFirebaseDto,
  ) {
    if (!this.firebaseAuthService.isEnabled()) {
      throw new BadRequestException('Firebase Auth no está habilitado');
    }

    // Verificar que el usuario existe
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar que el firebase_uid no esté ya en uso
    const existingUser = await this.prisma.user.findUnique({
      where: { firebaseUid: firebaseUser.uid },
    });

    if (existingUser && existingUser.id !== dto.userId) {
      throw new BadRequestException(
        'Este Firebase UID ya está asociado con otro usuario',
      );
    }

    // Asociar
    await this.firebaseAuthService.linkFirebaseToUser(dto.userId, firebaseUser.uid);

    return {
      success: true,
      message: 'Firebase UID asociado correctamente',
      userId: dto.userId,
      firebaseUid: firebaseUser.uid,
    };
  }

  /**
   * Desasocia Firebase UID de un usuario
   */
  @Post('/unlink')
  @RequireAuth()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desasocia Firebase UID de un usuario' })
  @ApiResponse({ status: 200, description: 'Firebase UID removido' })
  async unlinkFirebase(@Body() dto: UnlinkFirebaseDto) {
    if (!this.firebaseAuthService.isEnabled()) {
      throw new BadRequestException('Firebase Auth no está habilitado');
    }

    await this.firebaseAuthService.unlinkFirebaseFromUser(dto.userId);

    return {
      success: true,
      message: 'Firebase UID desasociado correctamente',
    };
  }

  /**
   * Endpoint de prueba para verificar autenticación
   */
  @Get('/me')
  @RequireAuth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtiene información del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Información del usuario' })
  async getCurrentUser(@CurrentUser() firebaseUser: FirebaseUser) {
    return {
      firebase: {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      },
      localUser: firebaseUser.localUserId
        ? await this.prisma.user.findUnique({
            where: { id: firebaseUser.localUserId },
            select: {
              id: true,
              email: true,
              fullName: true,
              displayName: true,
              role: true,
            },
          })
        : null,
    };
  }
}
