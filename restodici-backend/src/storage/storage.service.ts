import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

// [COMPATIBILITÉ] Unifie l'ancien duo StorageService (reçus PDF, sauvegardes
// DB) / S3Service (photos article/logo/restaurant) — deux clients S3
// indépendants, chacun réimplémentant sa propre détection de placeholder et
// son propre calcul d'URL publique (audit ISO 25010). Un seul client S3
// désormais, avec deux méthodes d'upload : uploadFile() pour une clé fournie
// par l'appelant (reçus, dumps), uploadImage() pour une clé générée (UUID) +
// contrôle de type MIME, reprenant le contrat exact de l'ex-S3Service.
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3?: S3Client;
  private readonly bucket?: string;
  private readonly region?: string;
  private readonly endpoint?: string;
  private readonly publicBase?: string;

  constructor(private readonly config: ConfigService) {
    this.region = config.get<string>('AWS_REGION');
    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY');
    this.bucket = config.get<string>('AWS_S3_BUCKET');
    this.endpoint = config.get<string>('AWS_S3_ENDPOINT');
    this.publicBase = config.get<string>('AWS_S3_PUBLIC_BASE');

    const isPlaceholder =
      !accessKeyId ||
      !secretAccessKey ||
      accessKeyId.includes('EXAMPLE') ||
      secretAccessKey.includes('EXAMPLE');

    if (this.region && !isPlaceholder && this.bucket) {
      this.s3 = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
        },
        ...(this.endpoint
          ? { endpoint: this.endpoint, forcePathStyle: true }
          : {}),
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

  /** Alias historique (ex-S3Service.isConfigured). */
  get isConfigured(): boolean {
    return this.configured;
  }

  /** Construit l'URL publique d'une clé : base publique > endpoint S3-compatible > AWS par défaut. */
  private buildPublicUrl(key: string): string {
    if (this.publicBase) return `${this.publicBase.replace(/\/$/, '')}/${key}`;
    if (this.endpoint) {
      return `${this.endpoint.replace(/\/$/, '')}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Upload d'image avec clé générée (UUID) — reprend le contrat exact de
   * l'ex-S3Service.uploadFile (utilisé par UploadsController pour les
   * photos article/logo/restaurant) : lève en cas de non-configuration
   * plutôt que d'échouer silencieusement, car un upload manuel côté
   * gérant/admin doit être visible immédiatement.
   */
  async uploadImage(
    buffer: Buffer,
    mimetype: string,
    folder = 'articles',
  ): Promise<{ url: string; key: string }> {
    if (!this.s3 || !this.bucket) {
      throw new BadRequestException(
        'S3 non configuré. Renseignez AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY et AWS_S3_BUCKET dans le .env',
      );
    }

    const ext = mimetype.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    const key = `${folder}/${randomUUID()}.${ext}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimetype,
        }),
      );
    } catch (err: any) {
      throw new InternalServerErrorException(`Erreur S3 : ${err.message}`);
    }

    return { url: this.buildPublicUrl(key), key };
  }

  async uploadPdf(key: string, buffer: Buffer): Promise<string | null> {
    return this.uploadFile(key, buffer, 'application/pdf');
  }

  /** Upload générique — sert aussi aux dumps de sauvegarde (BackupService). */
  async uploadFile(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string | null> {
    if (!this.s3 || !this.bucket) return null;
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
      return this.buildPublicUrl(key);
    } catch (err: any) {
      this.logger.error(`Upload S3 échoué [${key}]: ${err.message}`);
      return null;
    }
  }

  /** Liste les clés sous un préfixe (ex: "backups/") — plus récentes en premier. */
  async listFiles(
    prefix: string,
  ): Promise<{ key: string; sizeKb: number; lastModified: string }[]> {
    if (!this.s3 || !this.bucket) return [];
    try {
      const res = await this.s3.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix }),
      );
      return (res.Contents || [])
        .filter((o) => o.Key && o.Size !== undefined)
        .map((o) => ({
          key: o.Key!,
          sizeKb: Math.round((o.Size ?? 0) / 1024),
          lastModified: (o.LastModified ?? new Date()).toISOString(),
        }))
        .sort((a, b) => b.lastModified.localeCompare(a.lastModified));
    } catch (err: any) {
      this.logger.error(`Listage S3 échoué [${prefix}]: ${err.message}`);
      return [];
    }
  }

  async deleteFile(key: string): Promise<void> {
    if (!this.s3 || !this.bucket) return;
    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (err: any) {
      this.logger.error(`Suppression S3 échouée [${key}]: ${err.message}`);
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
