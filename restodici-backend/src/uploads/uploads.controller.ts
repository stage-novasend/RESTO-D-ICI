import {
  Controller,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { S3Service } from './s3.service';
import type { Express } from 'express';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// Dossiers S3 autorisés — évite qu'un client écrive n'importe où dans le bucket.
const ALLOWED_FOLDERS = ['articles', 'logos', 'restaurants'] as const;
const DEFAULT_FOLDER = 'articles';

@Controller('uploads')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'GERANT', 'STAFF')
export class UploadsController {
  constructor(private readonly s3: S3Service) {}

  /** POST /uploads/image?folder=logos — multipart/form-data, field: "file" */
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_SIZE },
      fileFilter: (_, file, cb) => {
        if (!ALLOWED_MIME.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Format non supporté. Utilisez JPG, PNG, WebP ou GIF.',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier reçu.');
    const target = ALLOWED_FOLDERS.includes(folder as never)
      ? (folder as string)
      : DEFAULT_FOLDER;
    return this.s3.uploadFile(file.buffer, file.mimetype, target);
  }

  /** GET /uploads/status — indique si S3 est configuré */
  @Get('status')
  getStatus() {
    return {
      configured: this.s3.isConfigured,
      message: this.s3.isConfigured
        ? 'S3 configuré et opérationnel.'
        : 'S3 non configuré. Renseignez les variables AWS_* dans le .env.',
    };
  }
}
