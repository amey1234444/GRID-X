import { BadRequestException, Injectable } from '@nestjs/common';
import { FileCategory, StoredFile } from '@gridx/db';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '../common/request-user';
import { StorageService } from './storage.service';

const MAX_BYTES = 25 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'model/step',
  'application/octet-stream',
]);

export interface UploadedFileInput {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(
    actor: RequestUser,
    file: UploadedFileInput,
    category: FileCategory,
  ): Promise<{ file: StoredFile; url: string; previewUrl: string | null }> {
    if (!file?.buffer) throw new BadRequestException('No file received');
    if (file.size > MAX_BYTES) throw new BadRequestException('File exceeds the 25 MB limit');
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }

    const key = this.storage.buildKey(category, file.originalname);
    const stored = await this.storage.put(key, file.buffer, file.mimetype);
    const preview = await this.storage.putPreview(key, file.buffer, file.mimetype);

    const record = await this.prisma.storedFile.create({
      data: {
        key: stored.key,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: stored.sizeBytes,
        checksum: stored.checksum,
        category,
        uploadedById: actor.id,
      },
    });

    return {
      file: record,
      url: await this.storage.signedUrl(record.key),
      previewUrl: preview ? await this.storage.signedUrl(preview.key) : null,
    };
  }

  async signedUrlForFile(fileId: string): Promise<string> {
    const file = await this.prisma.storedFile.findUniqueOrThrow({ where: { id: fileId } });
    return this.storage.signedUrl(file.key);
  }

  /** Attaches uploaded photographs to any entity (milestones, inspections, material, delivery). */
  async attachPhotographs(
    fileIds: string[],
    entityType: string,
    entityId: string,
    caption?: string,
    /**
     * Where the photograph was taken, when the device offered it.
     *
     * `Photograph.latitude`/`longitude` were columns nothing ever wrote. They matter for the
     * evidence photographs Module 6 and Module 7 ask for: a dispatch or first-piece photograph
     * carries much more weight when it can be shown to have been taken at the partner's workshop
     * rather than anywhere at all.
     */
    location?: { latitude?: number | null; longitude?: number | null },
  ): Promise<void> {
    if (fileIds.length === 0) return;
    const files = await this.prisma.storedFile.findMany({ where: { id: { in: fileIds } } });
    if (files.length !== fileIds.length) throw new BadRequestException('Unknown photograph file');
    await this.prisma.photograph.createMany({
      data: files.map((file) => ({
        fileId: file.id,
        entityType,
        entityId,
        caption,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
      })),
    });
  }

  async photographsFor(
    entityType: string,
    entityId: string,
  ): Promise<Array<{ id: string; url: string; caption: string | null; takenAt: Date }>> {
    const photos = await this.prisma.photograph.findMany({
      where: { entityType, entityId },
      include: { file: true },
      orderBy: { takenAt: 'desc' },
    });
    return Promise.all(
      photos.map(async (photo) => ({
        id: photo.id,
        url: await this.storage.signedUrl(photo.file.key),
        caption: photo.caption,
        takenAt: photo.takenAt,
      })),
    );
  }
}
