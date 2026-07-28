import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SystemConfig } from '../common/entities/system-config.entity';
import { SlaIncident } from './entities/sla-incident.entity';

const KEY_STARTED_AT = 'sla_service_started_at';
const KEY_LAST_HEARTBEAT = 'sla_last_heartbeat';

// Au-delà de ce trou entre deux heartbeats, on considère une indisponibilité.
// (le heartbeat tourne chaque minute ; 150 s tolère un redémarrage rapide en dev)
const DOWN_THRESHOLD_SEC = 150;

export interface SlaResult {
  uptimePct: number;
  windowDays: number;
  windowSeconds: number;
  downtimeSeconds: number;
  serviceStartedAt: string | null;
  incidents: {
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
    reason: string;
  }[];
}

/**
 * Mesure de disponibilité réelle (SLA) :
 * - un heartbeat persiste l'horodatage courant chaque minute ;
 * - à chaque démarrage, si un trou > seuil est constaté depuis le dernier
 *   heartbeat, il est enregistré comme incident d'indisponibilité ;
 * - le SLA = (fenêtre − somme des indisponibilités) / fenêtre, sur 30 jours.
 * Contrairement à `process.uptime()`, cette mesure survit aux redémarrages
 * et ne compte pas un simple redéploiement comme une panne.
 */
@Injectable()
export class SlaService implements OnModuleInit {
  private readonly logger = new Logger(SlaService.name);

  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
    @InjectRepository(SlaIncident)
    private readonly incidentRepo: Repository<SlaIncident>,
  ) {}

  async onModuleInit(): Promise<void> {
    const now = new Date();

    // Première mise en service : point de départ de la mesure.
    const startedAt = await this.getConfig(KEY_STARTED_AT);
    if (!startedAt) {
      await this.setConfig(KEY_STARTED_AT, now.toISOString());
    }

    // Détection d'une indisponibilité depuis le dernier heartbeat connu.
    const lastRaw = await this.getConfig(KEY_LAST_HEARTBEAT);
    if (lastRaw) {
      const last = new Date(lastRaw);
      const gapSec = Math.round((now.getTime() - last.getTime()) / 1000);
      if (gapSec > DOWN_THRESHOLD_SEC) {
        await this.incidentRepo.save(
          this.incidentRepo.create({
            startedAt: last,
            endedAt: now,
            durationSeconds: gapSec,
            reason: 'heartbeat-gap',
          }),
        );
        this.logger.warn(
          `Indisponibilité détectée : ${gapSec}s entre ${last.toISOString()} et ${now.toISOString()}`,
        );
      }
    }

    await this.setConfig(KEY_LAST_HEARTBEAT, now.toISOString());
  }

  // Heartbeat : preuve de vie persistée chaque minute.
  @Cron(CronExpression.EVERY_MINUTE)
  async heartbeat(): Promise<void> {
    await this.setConfig(KEY_LAST_HEARTBEAT, new Date().toISOString());
  }

  /** Calcule le SLA sur les `windowDays` derniers jours (30 par défaut). */
  async getSla(windowDays = 30): Promise<SlaResult> {
    const now = Date.now();
    const startedRaw = await this.getConfig(KEY_STARTED_AT);
    const serviceStart = startedRaw ? new Date(startedRaw).getTime() : now;

    const windowStart = Math.max(serviceStart, now - windowDays * 86400 * 1000);
    const windowSeconds = Math.max(1, Math.round((now - windowStart) / 1000));

    const incidents = await this.incidentRepo.find({
      where: { endedAt: MoreThanOrEqual(new Date(windowStart)) },
      order: { startedAt: 'DESC' },
      take: 50,
    });

    // Somme des indisponibilités qui chevauchent la fenêtre.
    let downtimeSeconds = 0;
    for (const inc of incidents) {
      const s = Math.max(inc.startedAt.getTime(), windowStart);
      const e = Math.min(inc.endedAt.getTime(), now);
      if (e > s) downtimeSeconds += Math.round((e - s) / 1000);
    }

    const uptimePct = Math.max(
      0,
      Math.min(100, ((windowSeconds - downtimeSeconds) / windowSeconds) * 100),
    );

    return {
      uptimePct: Math.round(uptimePct * 100) / 100,
      windowDays,
      windowSeconds,
      downtimeSeconds,
      serviceStartedAt: startedRaw ?? null,
      incidents: incidents.slice(0, 10).map((i) => ({
        startedAt: i.startedAt.toISOString(),
        endedAt: i.endedAt.toISOString(),
        durationSeconds: i.durationSeconds,
        reason: i.reason,
      })),
    };
  }

  private async getConfig(key: string): Promise<string | null> {
    const row = await this.configRepo.findOne({ where: { key } });
    return row?.value ?? null;
  }

  private async setConfig(key: string, value: string): Promise<void> {
    const existing = await this.configRepo.findOne({ where: { key } });
    if (existing) {
      existing.value = value;
      await this.configRepo.save(existing);
    } else {
      await this.configRepo.save(
        this.configRepo.create({ key, value, category: 'system' }),
      );
    }
  }
}
