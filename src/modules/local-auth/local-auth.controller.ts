import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LocalAuthService } from './local-auth.service';
import { LocalLoginDto } from './dto/local-login.dto';
import { LocalRegisterDto } from './dto/local-register.dto';

@ApiTags('Local Auth')
@Controller('auth/local')
export class LocalAuthController {
  constructor(private readonly localAuthService: LocalAuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registro local con email/password',
    description: 'Crea usuario local y emite un token Local.',
  })
  @ApiBody({ type: LocalRegisterDto })
  @ApiResponse({ status: 201, description: 'Usuario local creado' })
  @ApiResponse({ status: 400, description: 'Email ya registrado o datos inválidos' })
  async register(@Body() dto: LocalRegisterDto) {
    return this.localAuthService.register(dto);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Login local con email/password',
    description: 'Valida credenciales y emite un token Local.',
  })
  @ApiBody({ type: LocalLoginDto })
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() dto: LocalLoginDto) {
    return this.localAuthService.login(dto);
  }
}
