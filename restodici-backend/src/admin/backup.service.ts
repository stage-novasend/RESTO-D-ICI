import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { StorageService } from '../storage/storage.service';

const execFileAsync = promisify(execFile);

const S3_PREFIX = 'backups/';

/**
 * Sauvegarde quotidienne de la base PostgreSQL.
 *
 * Écrit d'abord un dump local (nécessaire : pg_dump ne sait produire qu'un
 * fichier), puis le pousse vers S3 avant de le supprimer localement. Un
 * conteneur CapRover est éphémère et redéployé à chaque mise en production —
 * un fichier resté uniquement sur le disque du conteneur est perdu au
 * redéploiement suivant. S3 est donc la seule source de vérité durable ;
 * le fichier local n'est qu'un intermédiaire temporaire.
 *
 * Si S3 n'est pas configuré (dev local, ou avant configuration), le dump
 * reste sur disque local à titre de dépannage, mais ce n'est PAS un stockage
 * fiable en production — un avertissement explicite est loggé à chaque
 * sauvegarde tant que ce n'est pas résolu.
 */
@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly localBackupDir: string;

  constructor(
    private readonly config: ConfigService,
    private readonly storage: StorageService,
  ) {
    // /tmp (pas process.cwd()) : répertoire de travail temporaire standard,
    // garanti disponible et inscriptible dans le conteneur runtime.
    this.localBackupDir = path.join(os.tmpdir(), 'restodici-backups');
    if (!fs.existsSync(this.localBackupDir)) {
      fs.mkdirSync(this.localBackupDir, { recursive: true });
    }
  }

  @Cron('0 2 * * *')
  async runDailyBackup() {
    await this.performBackup();
  }

  async performBackup(): Promise<{ file: string; sizeKb: number }> {
    const host = this.config.get<string>('DB_HOST') || 'localhost';
    const port = this.config.get<string>('DB_PORT') || '5432';
    const user =
      this.config.get<string>('DB_USERNAME') ||
      this.config.get<string>('DB_USER') ||
      'postgres';
    const password = this.config.get<string>('DB_PASSWORD') || '';
    const database =
      this.config.get<string>('DB_DATABASE') ||
      this.config.get<string>('DB_NAME') ||
      'restodici_db';

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    const filename = `restodici-${timestamp}.sql`;
    const filepath = path.join(this.localBackupDir, filename);

    try {
      // Identifiants passés via l'environnement de pg_dump (PGPASSWORD…),
      // jamais en argument de ligne de commande — évite qu'un mot de passe
      // contenant des caractères spéciaux casse une URL de connexion
      // construite à la main, et évite de l'exposer dans la liste des
      // process (`ps aux`).
      await execFileAsync(
        'pg_dump',
        [
          '--no-owner',
          '--no-acl',
          '--clean',
          '-h',
          host,
          '-p',
          port,
          '-U',
          user,
          '-d',
          database,
          '-f',
          filepath,
        ],
        { env: { ...process.env, PGPASSWORD: password } },
      );
      const stat = fs.statSync(filepath);
      const sizeKb = Math.round(stat.size / 1024);
      this.logger.log(`Dump local OK: ${filename} (${sizeKb} Ko)`);

      if (this.storage.configured) {
        const buffer = fs.readFileSync(filepath);
        const uploaded = await this.storage.uploadFile(
          `${S3_PREFIX}${filename}`,
          buffer,
          'application/sql',
        );
        fs.unlinkSync(filepath); // le disque local n'est qu'un relais
        if (uploaded) {
          this.logger.log(`Backup envoyée sur S3 : ${filename}`);
        } else {
          this.logger.error(
            `Échec de l'envoi S3 de ${filename} — la sauvegarde n'est PAS durable (perdue au prochain redéploiement).`,
          );
        }
        await this.pruneOldS3Backups();
      } else {
        this.logger.warn(
          `S3 non configuré : ${filename} reste uniquement sur le disque local du conteneur — ` +
            `PAS DURABLE, sera perdue au prochain redéploiement. Configurez AWS_S3_BUCKET pour corriger.`,
        );
        this.pruneOldLocalBackups();
      }

      return { file: filename, sizeKb };
    } catch (err: any) {
      this.logger.error(`Backup échoué: ${err.message}`);
      throw err;
    }
  }

  async listBackups(): Promise<
    { file: string; sizeKb: number; createdAt: string; durable: boolean }[]
  > {
    if (this.storage.configured) {
      const files = await this.storage.listFiles(S3_PREFIX);
      return files.map((f) => ({
        file: f.key.slice(S3_PREFIX.length),
        sizeKb: f.sizeKb,
        createdAt: f.lastModified,
        durable: true,
      }));
    }

    // Repli local — dev sans S3 configuré, ou avant configuration en prod.
    if (!fs.existsSync(this.localBackupDir)) return [];
    return fs
      .readdirSync(this.localBackupDir)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => {
        const stat = fs.statSync(path.join(this.localBackupDir, f));
        return {
          file: f,
          sizeKb: Math.round(stat.size / 1024),
          createdAt: stat.mtime.toISOString(),
          durable: false,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private async pruneOldS3Backups(keepDays = 30) {
    const cutoff = Date.now() - keepDays * 24 * 3600 * 1000;
    const files = await this.storage.listFiles(S3_PREFIX);
    for (const f of files) {
      if (new Date(f.lastModified).getTime() < cutoff) {
        await this.storage.deleteFile(f.key);
      }
    }
  }

  private pruneOldLocalBackups(keepDays = 30) {
    const cutoff = Date.now() - keepDays * 24 * 3600 * 1000;
    fs.readdirSync(this.localBackupDir)
      .filter((f) => f.endsWith('.sql'))
      .forEach((f) => {
        const fp = path.join(this.localBackupDir, f);
        if (fs.statSync(fp).mtimeMs < cutoff) fs.unlinkSync(fp);
      });
  }
}
