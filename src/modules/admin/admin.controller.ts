import { Controller, Get, Post, Put, Delete, Body, Param, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminGuard } from './guards/admin.guard';
import { CurrentUser } from '../firebase-auth/decorators/current-user.decorator';
import { OptionalAuth } from '../firebase-auth/decorators/optional-auth.decorator';

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
@OptionalAuth()
@UseGuards(AdminGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  /**
   * CHANGE: Listar usuarios
   */
  @Get('users')
  @ApiOperation({ summary: 'Listar todos los usuarios' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  @ApiBearerAuth()
  async listUsers(@CurrentUser() user: any) {
    const adminId = user?.uid || 'demo-admin';
    this.logger.log(`[GET /admin/users] Admin ${adminId}`);
    return this.adminService.listUsers();
  }

  /**
   * CHANGE: Crear usuario
   */
  @Post('users')
  @ApiOperation({ summary: 'Crear usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado' })
  @ApiBearerAuth()
  async createUser(
    @CurrentUser() user: any,
    @Body() createUserDto: CreateUserDto,
  ) {
    const adminId = user?.uid || 'demo-admin';
    this.logger.log(`[POST /admin/users] Admin ${adminId}`);
    return this.adminService.createUser(adminId, createUserDto);
  }

  /**
   * CHANGE: Actualizar usuario
   */
  @Put('users/:id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  @ApiBearerAuth()
  async updateUser(
    @CurrentUser() user: any,
    @Param('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const adminId = user?.uid || 'demo-admin';
    this.logger.log(`[PUT /admin/users/${userId}] Admin ${adminId}`);
    return this.adminService.updateUser(adminId, userId, updateUserDto);
  }

  /**
   * CHANGE: Eliminar usuario
   */
  @Delete('users/:id')
  @ApiOperation({ summary: 'Eliminar usuario (soft delete)' })
  @ApiResponse({ status: 200, description: 'Usuario eliminado' })
  @ApiBearerAuth()
  async deleteUser(
    @CurrentUser() user: any,
    @Param('id') userId: string,
  ) {
    const adminId = user?.uid || 'demo-admin';
    this.logger.log(`[DELETE /admin/users/${userId}] Admin ${adminId}`);
    return this.adminService.deleteUser(adminId, userId);
  }

  /**
   * CHANGE: Listar empresas
   */
  @Get('companies')
  @ApiOperation({ summary: 'Listar todas las empresas' })
  @ApiResponse({ status: 200, description: 'Lista de empresas' })
  @ApiBearerAuth()
  async listCompanies(@CurrentUser() user: any) {
    const adminId = user?.uid || 'demo-admin';
    this.logger.log(`[GET /admin/companies] Admin ${adminId}`);
    return this.adminService.listCompanies();
  }

  /**
   * CHANGE: Estadísticas globales
   */
  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas globales del sistema' })
  @ApiResponse({ status: 200, description: 'Estadísticas' })
  @ApiBearerAuth()
  async getStats(@CurrentUser() user: any) {
    const adminId = user?.uid || 'demo-admin';
    this.logger.log(`[GET /admin/stats] Admin ${adminId}`);
    return this.adminService.getStats();
  }
}
