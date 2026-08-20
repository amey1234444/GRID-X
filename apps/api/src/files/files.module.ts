import { Global, Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { StorageService } from './storage.service';
import { WatermarkService } from './watermark.service';

@Global()
@Module({
  controllers: [FilesController],
  providers: [FilesService, StorageService, WatermarkService],
  exports: [FilesService, StorageService, WatermarkService],
})
export class FilesModule {}
