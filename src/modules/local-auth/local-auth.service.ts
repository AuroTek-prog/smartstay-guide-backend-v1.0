import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { createLocalToken } from '../../common/local-jwt';
import * as bcrypt from 'bcrypt';
import { LocalLoginDto } from './dto/local-login.dto';
import { LocalRegisterDto } from './dto/local-register.dto';

@Injectable()
export class LocalAuthService {
  private readonly logger = new Logger(LocalAuthService.name);
  private readonly expiresInSeconds = 60 * 60 * 12;

  constructor(private readonly prisma: PrismaService) {}

  private ensureEnabled() {
    if (process.env.LOCAL_AUTH_ENABLED === 'false') {
      throw new ServiceUnavailableException('Local auth is disabled');
    }
  }

  private async getPermissions(roleId?: string) {
    if (!roleId) {
      return [];
    }
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { permissions: true },
    });
    return role?.permissions ?? [];
  }

  async register(dto: LocalRegisterDto) {
    this.ensureEnabled();

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Email ya registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const role = 'GUEST';
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        role,
        active: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        active: true,
      },
    });

    const permissions = await this.getPermissions(user.role || undefined);
    const token = createLocalToken(
      {
        sub: user.id,
        email: user.email,
        role: user.role || undefined,
        permissions,
      },
      this.expiresInSeconds,
    );

    this.logger.log(`✅ Registro local: ${user.email}`);
    return {
      accessToken: token,
      tokenType: 'Local',
      expiresIn: this.expiresInSeconds,
      user: { ...user, permissions },
    };
  }

  async login(dto: LocalLoginDto) {
    this.ensureEnabled();

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        active: true,
        passwordHash: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!user.active) {
      throw new UnauthorizedException('Usuario desactivado');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const permissions = await this.getPermissions(user.role || undefined);
    const token = createLocalToken(
      {
        sub: user.id,
        email: user.email,
        role: user.role || undefined,
        permissions,
      },
      this.expiresInSeconds,
    );

    this.logger.log(`✅ Login local: ${user.email}`);
    return {
      accessToken: token,
      tokenType: 'Local',
      expiresIn: this.expiresInSeconds,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        active: user.active,
        permissions,
      },
    };
  }
}
