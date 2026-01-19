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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiProperty } from '@nestjs/swagger';
import { FirebaseAuthService } from './firebase-auth.service';
import { PrismaService } from '../../common/prisma.service';
import { RequireAuth } from './decorators/require-auth.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { FirebaseUser } from './interfaces/firebase-user.interface';
import * as bcrypt from 'bcrypt';

class LinkFirebaseDto {
  @ApiProperty({ description: 'ID del usuario local a vincular', example: '11111111-1111-1111-1111-111111111111' })
  userId: string;
}

class UnlinkFirebaseDto {
  @ApiProperty({ description: 'ID del usuario local a desvincular', example: '11111111-1111-1111-1111-111111111111' })
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
  @ApiOperation({
    summary: 'Estado de Firebase Auth',
    description: 'Indica si Firebase Admin SDK está activo y configurado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de Firebase',
    schema: {
      example: { enabled: true, message: 'Firebase Auth está activo' },
    },
  })
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
  @ApiOperation({
    summary: 'Asocia Firebase UID con usuario existente',
    description: 'Requiere token de Firebase. Vincula el UID al usuario local indicado.',
  })
  @ApiBody({ type: LinkFirebaseDto })
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
  @ApiOperation({
    summary: 'Desasocia Firebase UID de un usuario',
    description: 'Requiere token de Firebase. Remueve el UID del usuario local.',
  })
  @ApiBody({ type: UnlinkFirebaseDto })
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
   * Asegura que existe un usuario local asociado al Firebase UID
   * - Si existe por firebase_uid, retorna ese usuario
   * - Si existe por email, vincula firebase_uid
   * - Si no existe, crea usuario local con rol GUEST
   */
  @Post('/ensure-user')
  @RequireAuth()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Crea o vincula usuario local usando Firebase Auth',
    description:
      'Si existe por firebase_uid retorna el usuario. Si existe por email, vincula el UID. Si no existe, crea un usuario con rol GUEST.',
  })
  @ApiResponse({ status: 200, description: 'Usuario local asegurado' })
  async ensureUser(@CurrentUser() firebaseUser: FirebaseUser) {
    if (!this.firebaseAuthService.isEnabled()) {
      throw new BadRequestException('Firebase Auth no está habilitado');
    }

    if (!firebaseUser.email) {
      throw new BadRequestException('Email requerido para vincular usuario');
    }

    const existingByUid = await this.prisma.user.findUnique({
      where: { firebaseUid: firebaseUser.uid },
    });
    if (existingByUid) {
      return { linked: true, user: existingByUid };
    }

    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: firebaseUser.email },
    });

    if (existingByEmail) {
      const updated = await this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: { firebaseUid: firebaseUser.uid },
      });
      return { linked: true, user: updated };
    }

    const randomHash = await bcrypt.hash(
      `${firebaseUser.uid}-${Date.now()}`,
      10,
    );
    const created = await this.prisma.user.create({
      data: {
        email: firebaseUser.email,
        fullName: firebaseUser.displayName,
        firebaseUid: firebaseUser.uid,
        role: 'GUEST',
        active: true,
        passwordHash: randomHash,
      },
    });

    return { linked: true, user: created };
  }

  /**
   * Endpoint de prueba para verificar autenticación
   */
  @Get('/me')
  @RequireAuth()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtiene información del usuario autenticado',
    description: 'Devuelve datos de Firebase + perfil local si existe.',
  })
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
