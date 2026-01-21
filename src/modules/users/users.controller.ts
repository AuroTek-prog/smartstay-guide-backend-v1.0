import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequireAuth } from '../firebase-auth/decorators/require-auth.decorator';
import { CurrentUser } from '../firebase-auth/decorators/current-user.decorator';
import { FirebaseUser } from '../firebase-auth/interfaces/firebase-user.interface';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
@RequireAuth()
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Perfil del usuario actual',
    description: 'Devuelve perfil local + datos básicos de Firebase del usuario autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil del usuario',
    schema: {
      example: {
        firebase: {
          uid: 'firebase-uid',
          email: 'user@example.com',
          emailVerified: true,
          displayName: 'User Example',
          photoURL: 'https://cdn.example.com/avatar.png',
          permissions: ['admin:access'],
          role: 'ADMIN',
        },
        localUser: {
          id: '11111111-1111-1111-1111-111111111111',
          email: 'user@example.com',
          fullName: 'User Example',
          displayName: 'User Example',
          role: 'ADMIN',
          active: true,
          createdAt: '2026-01-20T10:00:00.000Z',
          updatedAt: '2026-01-20T10:00:00.000Z',
        },
      },
    },
  })
  async getMe(@CurrentUser() user: FirebaseUser) {
    return this.usersService.getMe(user);
  }

  @Get('me/companies')
  @ApiOperation({
    summary: 'Empresas del usuario actual',
    description: 'Lista las empresas asociadas al usuario autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de empresas del usuario',
    schema: {
      example: [
        {
          userId: '11111111-1111-1111-1111-111111111111',
          companyId: '22222222-2222-2222-2222-222222222222',
          roleId: 'OWNER',
          company: {
            id: '22222222-2222-2222-2222-222222222222',
            name: 'SmartStay Demo',
            slug: 'smartstay-demo',
            active: true,
            createdAt: '2026-01-20T10:00:00.000Z',
          },
          role: {
            id: 'OWNER',
            description: 'Owner role',
          },
        },
      ],
    },
  })
  async listMyCompanies(@CurrentUser() user: FirebaseUser) {
    return this.usersService.listMyCompanies(user);
  }
}
