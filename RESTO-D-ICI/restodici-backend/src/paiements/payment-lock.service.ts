import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Verrous distribués + cache de statut pour les paiements (Redis).
 *
 * - `acquire`/`release` : verrou anti-double-paiement (SET NX PX). Empêche deux
 *   initiations concurrentes pour la même commande.
 * - `cacheStatus`/`getCachedStatus` : cache court du dernier statut connu, pour
 *   répondre au frontend sans retaper la base.
 *
 * Fail-open : si Redis est indisponible, on ne bloque pas le paiement (la garde
 * `estPaye` en base reste le filet de sécurité contre le double encaissement).
 */
@Injectable()
export class PaymentLockService implements OnModuleDestroy {
  private readonly logger = new Logger(PaymentLockService.name);
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 2,
    });
    this.redis.on('error', (e) =>
      this.logger.warn(`Redis (payment-lock) indisponible : ${e.message}`),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }

  private lockKey(ref: string): string {
    return `payment:lock:${ref}`;
  }

  private statusKey(ref: string): string {
    return `payment:status:${ref}`;
  }

  /** Acquiert le verrou. `true` si acquis (ou si Redis KO → fail-open). */
  async acquire(reference: string, ttlMs = 5 * 60_000): Promise<boolean> {
    try {
      const res = await this.redis.set(
        this.lockKey(reference),
        '1',
        'PX',
        ttlMs,
        'NX',
      );
      return res === 'OK';
    } catch (e) {
      this.logger.warn(
        `Acquisition verrou KO (${reference}) — fail-open : ${(e as Error).message}`,
      );
      return true;
    }
  }

  async release(reference: string): Promise<void> {
    try {
      await this.redis.del(this.lockKey(reference));
    } catch {
      // non bloquant
    }
  }

  async cacheStatus(
    reference: string,
    status: string,
    ttlSec = 300,
  ): Promise<void> {
    try {
      await this.redis.set(this.statusKey(reference), status, 'EX', ttlSec);
    } catch {
      // non bloquant
    }
  }

  async getCachedStatus(reference: string): Promise<string | null> {
    try {
      return await this.redis.get(this.statusKey(reference));
    } catch {
      return null;
    }
  }
}
