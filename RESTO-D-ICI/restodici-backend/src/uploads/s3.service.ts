import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extname } from 'path';

@Injectable()
export class S3Service {
  private client: S3Client | null = null;
  private bucket: string | null = null;
  private endpoint: string | null = null;
  private publicBase: string | null = null;

  constructor() {
    this.init();
  }

  private init() {
    const region = process.env.AWS_REGION;
    const accessKey = process.env.AWS_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const bucket = process.env.AWS_S3_BUCKET;
    const endpoint = process.env.AWS_S3_ENDPOINT; // MinIO / Cloudflare R2 / etc.
    const publicBase = process.env.AWS_S3_PUBLIC_BASE; // URL publique (CDN ou direct)

    if (!region || !accessKey || !secretKey || !bucket) return; // not configured

    this.bucket = bucket;
    this.endpoint = endpoint ?? null;
    this.publicBase = publicBase ?? null;

    this.client = new S3Client({
      region,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });
  }

  get isConfigured(): boolean {
    return this.client !== null && this.bucket !== null;
  }

  async uploadFile(
    buffer: Buffer,
    mimetype: string,
    folder = 'articles',
  ): Promise<{ url: string; key: string }> {
    if (!this.client || !this.bucket) {
      throw new BadRequestException(
        'S3 non configuré. Renseignez AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY et AWS_S3_BUCKET dans le .env',
      );
    }

    const ext = mimetype.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    const key = `${folder}/${randomUUID()}.${ext}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimetype,
          // ACL: 'public-read', // uncomment if bucket allows ACLs
        }),
      );
    } catch (err: any) {
      throw new InternalServerErrorException(`Erreur S3 : ${err.message}`);
    }

    const url = this.publicBase
      ? `${this.publicBase.replace(/\/$/, '')}/${key}`
      : this.endpoint
        ? `${this.endpoint.replace(/\/$/, '')}/${this.bucket}/${key}`
        : `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return { url, key };
  }

  async deleteFile(key: string): Promise<void> {
    if (!this.client || !this.bucket) return;
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch {
      // best-effort delete
    }
  }
}
