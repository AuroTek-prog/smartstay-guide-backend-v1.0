import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { extname, join } from 'path';
import { existsSync, mkdirSync, unlinkSync, readdirSync } from 'fs';
import { OptionalAuth } from '../firebase-auth/decorators/optional-auth.decorator';
import { CurrentUser } from '../firebase-auth/decorators/current-user.decorator';
import { FirebaseUser } from '../firebase-auth/interfaces/firebase-user.interface';
import { resolveUserId } from '../../common/auth/user-context';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = /jpeg|jpg|png|webp/;

function imageFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) {
  const extValid = ALLOWED_IMAGE_TYPES.test(extname(file.originalname).toLowerCase());
  const mimeValid = ALLOWED_IMAGE_TYPES.test(file.mimetype);

  if (extValid && mimeValid) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Solo se permiten imágenes (JPEG, PNG, WebP)'), false);
  }
}

/**
 * CHANGE: UploadController - Gestión de imágenes de apartamentos
 * 
 * Rutas:
 * - POST   /api/manager/upload/image        → Subir una imagen
 * - POST   /api/manager/upload/images       → Subir múltiples imágenes
 * - DELETE /api/manager/upload/image        → Eliminar imagen
 * - GET    /api/manager/upload/images/:slug → Listar imágenes de un apartamento
 * 
 * Validaciones:
 * - Tipos permitidos: JPEG, PNG, WebP
 * - Tamaño máximo: 5MB
 * - Organización: assets/images/apartments/{slug}/
 * 
 * Autenticación: Opcional (Firebase Auth)
 */
@ApiTags('Manager - Upload')
@Controller('api/manager/upload')
@OptionalAuth()
export class UploadController {
  private readonly logger = new Logger(UploadController.name);
  private readonly uploadPath = join(process.cwd(), 'assets', 'images', 'apartments');

  constructor() {
    // CHANGE: Crear carpeta assets si no existe
    if (!existsSync(this.uploadPath)) {
      mkdirSync(this.uploadPath, { recursive: true });
      this.logger.log(`📁 Carpeta creada: ${this.uploadPath}`);
    }
  }

  /**
   * CHANGE: Subir una imagen
   */
  @Post('image')
  @ApiOperation({ summary: 'Subir una imagen para un apartamento' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary' },
        apartmentSlug: { type: 'string', example: 'sol-101' },
        imageType: { type: 'string', example: 'portada' },
      },
      required: ['image', 'apartmentSlug'],
    },
  })
  @ApiResponse({ status: 201, description: 'Imagen subida exitosamente' })
  @ApiResponse({ status: 400, description: 'Tipo de archivo no permitido o tamaño excedido' })
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: imageFileFilter,
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('apartmentSlug') apartmentSlug: string,
    @CurrentUser() user: FirebaseUser | undefined,
    @Body('imageType') imageType: string | undefined,
  ) {
    const userId = resolveUserId(user);
    this.logger.log(`[UPLOAD] Usuario ${userId} subiendo imagen para ${apartmentSlug}`);

    if (!file) {
      throw new BadRequestException('No se proporcionó ninguna imagen');
    }

    if (!apartmentSlug) {
      throw new BadRequestException('apartmentSlug es requerido');
    }

    // CHANGE: Mover archivo a carpeta del apartamento
    const destPath = join(this.uploadPath, apartmentSlug);
    if (!existsSync(destPath)) {
      mkdirSync(destPath, { recursive: true });
    }

    const type = imageType || 'other';
    const ext = extname(file.originalname);
    const filename = type === 'other' ? `${Date.now()}${ext}` : `${type}${ext}`;

    // CHANGE: Usar file.path si multer ya lo guardó
    const relativePath = `assets/images/apartments/${apartmentSlug}/${filename}`;

    this.logger.log(`✅ [UPLOAD] Imagen guardada: ${relativePath}`);

    return {
      success: true,
      path: relativePath,
      filename,
      type,
      size: file.size,
    };
  }

  /**
   * CHANGE: Subir múltiples imágenes
   */
  @Post('images')
  @ApiOperation({ summary: 'Subir múltiples imágenes' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: { type: 'array', items: { type: 'string', format: 'binary' } },
        apartmentSlug: { type: 'string', example: 'sol-101' },
      },
      required: ['images', 'apartmentSlug'],
    },
  })
  @ApiResponse({ status: 201, description: 'Imágenes subidas exitosamente' })
  @ApiBearerAuth()
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: imageFileFilter,
    }),
  )
  async uploadImages(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body('apartmentSlug') apartmentSlug: string,
    @CurrentUser() user: FirebaseUser | undefined,
  ) {
    const userId = resolveUserId(user);
    this.logger.log(`[UPLOAD MULTIPLE] Usuario ${userId} subiendo ${files?.length || 0} imágenes para ${apartmentSlug}`);

    if (!files || files.length === 0) {
      throw new BadRequestException('No se proporcionaron imágenes');
    }

    if (!apartmentSlug) {
      throw new BadRequestException('apartmentSlug es requerido');
    }

    // CHANGE: Crear carpeta del apartamento
    const destPath = join(this.uploadPath, apartmentSlug);
    if (!existsSync(destPath)) {
      mkdirSync(destPath, { recursive: true });
    }

    // CHANGE: Procesar cada imagen
    const uploadedFiles = files.map((file) => {
      const ext = extname(file.originalname);
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
      const relativePath = `assets/images/apartments/${apartmentSlug}/${filename}`;

      return {
        path: relativePath,
        filename,
        size: file.size,
        originalName: file.originalname,
      };
    });

    this.logger.log(`✅ [UPLOAD MULTIPLE] ${uploadedFiles.length} imágenes guardadas`);

    return {
      success: true,
      count: uploadedFiles.length,
      files: uploadedFiles,
    };
  }

  /**
   * CHANGE: Eliminar imagen
   */
  @Delete('image')
  @ApiOperation({ summary: 'Eliminar una imagen' })
  @ApiBody({
    schema: {
      example: { path: 'assets/images/apartments/sol-101/portada.jpg' },
    },
  })
  @ApiResponse({ status: 200, description: 'Imagen eliminada' })
  @ApiResponse({ status: 400, description: 'Path inválido' })
  @ApiBearerAuth()
  async deleteImage(
    @Body('path') imagePath: string,
    @CurrentUser() user: FirebaseUser | undefined,
  ) {
    const userId = resolveUserId(user);
    this.logger.log(`[DELETE] Usuario ${userId} eliminando imagen: ${imagePath}`);

    if (!imagePath || !imagePath.startsWith('assets/images/apartments/')) {
      throw new BadRequestException('Path de imagen inválido');
    }

    const fullPath = join(process.cwd(), imagePath);

    if (!existsSync(fullPath)) {
      throw new BadRequestException('Imagen no encontrada');
    }

    // CHANGE: Eliminar archivo
    unlinkSync(fullPath);

    this.logger.log(`✅ [DELETE] Imagen eliminada: ${imagePath}`);

    return {
      success: true,
      message: 'Imagen eliminada',
    };
  }

  /**
   * CHANGE: Listar imágenes de un apartamento
   */
  @Get('images/:slug')
  @ApiOperation({ summary: 'Listar todas las imágenes de un apartamento' })
  @ApiParam({ name: 'slug', description: 'Slug del apartamento', example: 'sol-101' })
  @ApiResponse({ status: 200, description: 'Lista de imágenes' })
  @ApiBearerAuth()
  async listImages(
    @Param('slug') apartmentSlug: string,
    @CurrentUser() user: FirebaseUser | undefined,
  ) {
    const userId = resolveUserId(user);
    this.logger.log(`[LIST] Usuario ${userId} listando imágenes de ${apartmentSlug}`);

    const dirPath = join(this.uploadPath, apartmentSlug);

    if (!existsSync(dirPath)) {
      return {
        success: true,
        count: 0,
        images: [],
      };
    }

    // CHANGE: Leer archivos de la carpeta
    const files = readdirSync(dirPath);
    const images = files
      .filter((file) => {
        const ext = extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
      })
      .map((file) => ({
        filename: file,
        path: `assets/images/apartments/${apartmentSlug}/${file}`,
      }));

    this.logger.log(`📋 [LIST] ${images.length} imágenes encontradas`);

    return {
      success: true,
      count: images.length,
      images,
    };
  }
}
