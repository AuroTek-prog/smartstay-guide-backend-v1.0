import { Controller, Get, Post, Put, Delete, Body, Param, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminGuard } from './guards/admin.guard';
import { CurrentUser } from '../firebase-auth/decorators/current-user.decorator';
import { RequireAuth } from '../firebase-auth/decorators/require-auth.decorator';
import { FirebaseUser } from '../firebase-auth/interfaces/firebase-user.interface';
import { resolveUserId } from '../../common/auth/user-context';

/**
 * CHANGE: AdminController - Endpoints de administración
 * 
 * Requiere rol ADMIN para todos los endpoints
 * 
 * Rutas:
 * - GET    /api/admin/users         → Listar usuarios
 * - POST   /api/admin/users         → Crear usuario
 * - PUT    /api/admin/users/:id     → Actualizar usuario
 * - DELETE /api/admin/users/:id     → Eliminar (soft delete)
 * - GET    /api/admin/companies     → Listar empresas
 * - GET    /api/admin/stats         → Estadísticas globales
 */
@ApiTags('Admin')
@Controller('api/admin')
@RequireAuth()
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  /**
   * CHANGE: Listar usuarios
   */
  @Get('users')
  @ApiOperation({
    summary: 'Listar todos los usuarios',
    description: 'Devuelve usuarios con campos no sensibles (sin passwordHash).',
  })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  @ApiBearerAuth()
  async listUsers(@CurrentUser() user?: FirebaseUser) {
    const adminId = resolveUserId(user, 'demo-admin');
    this.logger.log(`[GET /admin/users] Admin ${adminId}`);
    return this.adminService.listUsers();
  }

  /**
   * CHANGE: Crear usuario
   */
  @Post('users')
  @ApiOperation({
    summary: 'Crear usuario',
    description: 'Crea un usuario local con rol asignado.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'Usuario creado' })
  @ApiBearerAuth()
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() user: FirebaseUser | undefined,
  ) {
    const adminId = resolveUserId(user, 'demo-admin');
    this.logger.log(`[POST /admin/users] Admin ${adminId}`);
    return this.adminService.createUser(adminId, createUserDto);
  }

  /**
   * CHANGE: Actualizar usuario
   */
  @Put('users/:id')
  @ApiOperation({
    summary: 'Actualizar usuario',
    description: 'Actualiza datos de usuario y/o rol.',
  })
  @ApiParam({ name: 'id', description: 'ID del usuario', example: '11111111-1111-1111-1111-111111111111' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  @ApiBearerAuth()
  async updateUser(
    @Param('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: FirebaseUser | undefined,
  ) {
    const adminId = resolveUserId(user, 'demo-admin');
    this.logger.log(`[PUT /admin/users/${userId}] Admin ${adminId}`);
    return this.adminService.updateUser(adminId, userId, updateUserDto);
  }

  /**
   * CHANGE: Eliminar usuario
   */
  @Delete('users/:id')
  @ApiOperation({
    summary: 'Eliminar usuario (soft delete)',
    description: 'Marca el usuario como inactivo.',
  })
  @ApiParam({ name: 'id', description: 'ID del usuario', example: '11111111-1111-1111-1111-111111111111' })
  @ApiResponse({ status: 200, description: 'Usuario eliminado' })
  @ApiBearerAuth()
  async deleteUser(
    @Param('id') userId: string,
    @CurrentUser() user: FirebaseUser | undefined,
  ) {
    const adminId = resolveUserId(user, 'demo-admin');
    this.logger.log(`[DELETE /admin/users/${userId}] Admin ${adminId}`);
    return this.adminService.deleteUser(adminId, userId);
  }

  /**
   * CHANGE: Listar empresas
   */
  @Get('companies')
  @ApiOperation({
    summary: 'Listar todas las empresas',
    description: 'Incluye conteos de usuarios, unidades y partners.',
  })
  @ApiResponse({ status: 200, description: 'Lista de empresas' })
  @ApiBearerAuth()
  async listCompanies(@CurrentUser() user?: FirebaseUser) {
    const adminId = resolveUserId(user, 'demo-admin');
    this.logger.log(`[GET /admin/companies] Admin ${adminId}`);
    return this.adminService.listCompanies();
  }

  /**
   * CHANGE: Estadísticas globales
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Estadísticas globales del sistema',
    description: 'Métricas agregadas para panel admin.',
  })
  @ApiResponse({ status: 200, description: 'Estadísticas' })
  @ApiBearerAuth()
  async getStats(@CurrentUser() user?: FirebaseUser) {
    const adminId = resolveUserId(user, 'demo-admin');
    this.logger.log(`[GET /admin/stats] Admin ${adminId}`);
    return this.adminService.getStats();
  }
}
