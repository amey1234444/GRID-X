import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { FileCategory } from '@gridx/db';
import { FILE_CATEGORIES } from '@gridx/shared';
import { CurrentUser, Public } from '../common/decorators';
import { RequestUser } from '../common/request-user';
import { FilesService, UploadedFileInput } from './files.service';
import { StorageService } from './storage.service';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(
    private readonly files: FilesService,
    private readonly storage: StorageService,
  ) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: UploadedFileInput,
    @Query('category') category?: string,
  ) {
    const resolved: FileCategory = (FILE_CATEGORIES as readonly string[]).includes(category ?? '')
      ? (category as FileCategory)
      : 'OTHER';
    const result = await this.files.upload(user, file, resolved);
    return {
      id: result.file.id,
      originalName: result.file.originalName,
      mimeType: result.file.mimeType,
      sizeBytes: result.file.sizeBytes,
      category: result.file.category,
      url: result.url,
      previewUrl: result.previewUrl,
    };
  }

  @Get(':id/url')
  async url(@Param('id') id: string) {
    return { url: await this.files.signedUrlForFile(id) };
  }

  /** Local development file delivery; production uses signed object-storage URLs. */
  @Public()
  @Get('raw/:key')
  async raw(@Param('key') key: string, @Res() res: Response) {
    const buffer = await this.storage.read(decodeURIComponent(key));
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.end(buffer);
  }
}
