import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gridx/shared';
import { z } from 'zod';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { RequestUser } from '../common/request-user';
import { zodBody } from '../common/zod-validation.pipe';
import { IMPORT_ENTITIES, ImportEntity, ImportsService } from './imports.service';

const entitySchema = z.enum(IMPORT_ENTITIES);

/** Pasting the CSV is easier than uploading it from a scripted client, so both are accepted. */
const importBodySchema = z.object({
  csv: z.string().min(1),
  commit: z.boolean().default(false),
});

interface UploadedCsv {
  buffer: Buffer;
  originalname: string;
  size: number;
}

/**
 * §25 step 4 — bulk loading of the component, rate and approved-partner masters, so a pilot can be
 * set up in an afternoon rather than a week of forms.
 */
@ApiTags('Imports')
@Controller('imports')
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  @Get('entities')
  @RequirePermissions(PERMISSIONS.COMPONENT_READ)
  entities() {
    return { entities: IMPORT_ENTITIES };
  }

  /** The empty CSV to fill in, so nobody has to guess the column names. */
  @Get(':entity/template')
  @RequirePermissions(PERMISSIONS.COMPONENT_READ)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  template(@Param('entity') entity: string): string {
    return this.imports.template(this.parseEntity(entity));
  }

  /** Validate and, when `commit` is true and nothing failed, apply. */
  @Post(':entity')
  @RequirePermissions(PERMISSIONS.COMPONENT_MANAGE)
  run(
    @CurrentUser() user: RequestUser,
    @Param('entity') entity: string,
    @Body(zodBody(importBodySchema)) body: z.infer<typeof importBodySchema>,
  ) {
    return this.imports.run(user, this.parseEntity(entity), body.csv, body.commit);
  }

  /** The same import, from an uploaded file. */
  @Post(':entity/upload')
  @RequirePermissions(PERMISSIONS.COMPONENT_MANAGE)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser() user: RequestUser,
    @Param('entity') entity: string,
    @UploadedFile() file: UploadedCsv | undefined,
    @Query('commit') commit?: string,
  ) {
    if (!file) throw new BadRequestException('Attach a CSV file');
    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException('Import files are limited to 2 MB');
    }
    return this.imports.run(
      user,
      this.parseEntity(entity),
      file.buffer.toString('utf8'),
      commit === 'true',
    );
  }

  private parseEntity(entity: string): ImportEntity {
    const parsed = entitySchema.safeParse(entity);
    if (!parsed.success) {
      throw new BadRequestException(
        `Unknown import "${entity}". Available: ${IMPORT_ENTITIES.join(', ')}`,
      );
    }
    return parsed.data;
  }
}
