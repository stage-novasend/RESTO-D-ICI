import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execFileAsync = promisify(execFile);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;

  constructor(private readonly config: ConfigService) {
    this.backupDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  @Cron('0 2 * * *')
  async runDailyBackup() {
    await this.performBackup();
  }

  async performBackup(): Promise<{ file: string; sizeKb: number }> {
    const dbUrl = this.config.get<string>('DATABASE_URL');
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    const filename = `restodici-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);

    if (!dbUrl) {
      this.logger.warn('DATABASE_URL absent — backup ignoré');
      return { file: filename, sizeKb: 0 };
    }

    try {
      await execFileAsync('pg_dump', [
        '--no-owner',
        '--no-acl',
        '--clean',
        dbUrl,
        '-f',
        filepath,
      ]);
      const stat = fs.statSync(filepath);
      const sizeKb = Math.round(stat.size / 1024);
      this.logger.log(`Backup OK: ${filename} (${sizeKb} Ko)`);
      this.pruneOldBackups();
      return { file: filename, sizeKb };
    } catch (err: any) {
      this.logger.error(`Backup échoué: ${err.message}`);
      throw err;
    }
  }

  listBackups() {
    if (!fs.existsSync(this.backupDir)) return [];
    return fs
      .readdirSync(this.backupDir)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => {
        const stat = fs.statSync(path.join(this.backupDir, f));
        return {
          file: f,
          sizeKb: Math.round(stat.size / 1024),
          createdAt: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private pruneOldBackups(keepDays = 30) {
    const cutoff = Date.now() - keepDays * 24 * 3600 * 1000;
    fs.readdirSync(this.backupDir)
      .filter((f) => f.endsWith('.sql'))
      .forEach((f) => {
        const fp = path.join(this.backupDir, f);
        if (fs.statSync(fp).mtimeMs < cutoff) fs.unlinkSync(fp);
      });
  }
}
