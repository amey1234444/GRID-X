import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { AppConfig } from '../config/configuration';

export interface StoredObject {
  key: string;
  sizeBytes: number;
  checksum: string;
}

/**
 * Object storage abstraction. Local disk in development, S3-compatible object storage
 * (S3 / R2 / Supabase) in production, always accessed through short-lived signed URLs
 * as required by the security section of the blueprint.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly settings: AppConfig['storage'];
  private readonly s3: S3Client | null;

  constructor(private readonly config: ConfigService) {
    const storage = this.config.get<AppConfig['storage']>('storage');
    if (!storage) throw new Error('Storage configuration missing');
    this.settings = storage;
    this.s3 =
      storage.driver === 's3'
        ? new S3Client({
            region: storage.s3.region,
            endpoint: storage.s3.endpoint,
            forcePathStyle: storage.s3.forcePathStyle,
            credentials:
              storage.s3.accessKeyId && storage.s3.secretAccessKey
                ? {
                    accessKeyId: storage.s3.accessKeyId,
                    secretAccessKey: storage.s3.secretAccessKey,
                  }
                : undefined,
          })
        : null;
  }

  buildKey(category: string, originalName: string): string {
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const now = new Date();
    return `${category.toLowerCase()}/${now.getUTCFullYear()}/${String(
      now.getUTCMonth() + 1,
    ).padStart(2, '0')}/${randomUUID()}-${safeName}`;
  }

  async put(key: string, body: Buffer, mimeType: string): Promise<StoredObject> {
    const checksum = createHash('sha256').update(body).digest('hex');
    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.settings.s3.bucket,
          Key: key,
          Body: body,
          ContentType: mimeType,
        }),
      );
    } else {
      const target = this.localPath(key);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, body);
    }
    return { key, sizeBytes: body.byteLength, checksum };
  }

  /** Compressed preview used for low-bandwidth partner drawing and photo viewing (Section 20). */
  async putPreview(key: string, body: Buffer, mimeType: string): Promise<StoredObject | null> {
    if (!mimeType.startsWith('image/')) return null;
    const preview = await sharp(body)
      .rotate()
      .resize({ width: 1280, withoutEnlargement: true })
      .jpeg({ quality: 70, mozjpeg: true })
      .toBuffer();
    return this.put(`${key}.preview.jpg`, preview, 'image/jpeg');
  }

  /**
   * Whether an object is already stored. Used to reuse derived files — watermarked drawing copies,
   * previews — instead of regenerating them on every view.
   */
  async exists(key: string): Promise<boolean> {
    if (this.s3) {
      try {
        await this.s3.send(
          new HeadObjectCommand({ Bucket: this.settings.s3.bucket, Key: key }),
        );
        return true;
      } catch {
        return false;
      }
    }
    return existsSync(this.localPath(key));
  }

  async signedUrl(key: string): Promise<string> {
    if (this.s3) {
      return getSignedUrl(
        this.s3,
        new GetObjectCommand({ Bucket: this.settings.s3.bucket, Key: key }),
        { expiresIn: this.settings.signedUrlTtlSeconds },
      );
    }
    return `/api/files/raw/${encodeURIComponent(key)}`;
  }

  async read(key: string): Promise<Buffer> {
    if (this.s3) {
      const result = await this.s3.send(
        new GetObjectCommand({ Bucket: this.settings.s3.bucket, Key: key }),
      );
      const stream = result.Body as Readable | undefined;
      if (!stream) throw new NotFoundException('File not found');
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(Buffer.from(chunk));
      return Buffer.concat(chunks);
    }
    const target = this.localPath(key);
    if (!existsSync(target)) throw new NotFoundException('File not found');
    return readFile(target);
  }

  stream(key: string): Readable {
    if (this.s3) throw new Error('Streaming is only available for the local driver');
    const target = this.localPath(key);
    if (!existsSync(target)) throw new NotFoundException('File not found');
    return createReadStream(target);
  }

  private localPath(key: string): string {
    const base = resolve(this.settings.localDir);
    const target = resolve(join(base, key));
    if (!target.startsWith(base)) throw new NotFoundException('File not found');
    return target;
  }
}
