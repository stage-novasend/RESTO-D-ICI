import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3?: S3Client;
  private readonly bucket?: string;

  constructor(private readonly config: ConfigService) {
    const region = config.get<string>('AWS_REGION');
    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY');
    this.bucket = config.get<string>('AWS_S3_BUCKET');
    const endpoint = config.get<string>('AWS_S3_ENDPOINT');

    const isPlaceholder =
      !accessKeyId ||
      !secretAccessKey ||
      accessKeyId.includes('EXAMPLE') ||
      secretAccessKey.includes('EXAMPLE');

    if (region && !isPlaceholder && this.bucket) {
      this.s3 = new S3Client({
        region,
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
        },
        ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      });
      this.logger.log(`StorageService S3 initialisé (bucket: ${this.bucket})`);
    } else {
      this.logger.warn(
        'StorageService: S3 non configuré — PDFs générés à la volée uniquement',
      );
    }
  }

  get configured(): boolean {
    return !!this.s3 && !!this.bucket;
  }

  async uploadPdf(key: string, buffer: Buffer): Promise<string | null> {
    if (!this.s3 || !this.bucket) return null;
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: 'application/pdf',
        }),
      );
      const publicBase = this.config.get<string>('AWS_S3_PUBLIC_BASE');
      return publicBase
        ? `${publicBase}/${key}`
        : `https://${this.bucket}.s3.amazonaws.com/${key}`;
    } catch (err: any) {
      this.logger.error(`Upload S3 échoué [${key}]: ${err.message}`);
      return null;
    }
  }

  async downloadPdf(key: string): Promise<Buffer | null> {
    if (!this.s3 || !this.bucket) return null;
    try {
      const res = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const chunks: Buffer[] = [];
      for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch (err: any) {
      this.logger.error(`Download S3 échoué [${key}]: ${err.message}`);
      return null;
    }
  }
}
