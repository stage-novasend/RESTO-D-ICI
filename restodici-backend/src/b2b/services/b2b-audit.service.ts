import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogB2B, TypeAuditB2B } from '../entities/audit-log-b2b.entity';
import { CompteB2B } from '../entities/compte-b2b.entity';
import { User } from '../../auth/entities/user.entity';

/**
 * Journal d'audit B2B — service transverse partagé.
 *
 * Extrait de B2BService (God service) : `logAudit` était appelé par 5 domaines
 * (compte, collaborateurs, invitations, commandes, factures). Le centraliser
 * ici casse ce couplage et prépare l'extraction des autres domaines.
 */
@Injectable()
export class B2bAuditService {
  constructor(
    @InjectRepository(AuditLogB2B)
    private auditRepository: Repository<AuditLogB2B>,
    @InjectRepository(CompteB2B)
    private compteB2BRepository: Repository<CompteB2B>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Enregistre une entrée d'audit. Non-bloquant : un échec d'audit ne doit
   * jamais interrompre la logique métier appelante.
   */
  async logAudit(
    type: TypeAuditB2B,
    compteB2BId: string,
    actorUserId: string,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    try {
      let actorEmail: string | undefined;
      if (actorUserId !== 'SYSTEM') {
        const actor = await this.userRepository.findOne({
          where: { id: actorUserId },
        });
        actorEmail = actor?.email;
      } else {
        actorEmail = 'system@restodici.ci';
      }

      const log = this.auditRepository.create({
        compteB2B: { id: compteB2BId } as CompteB2B,
        type,
        actorUserId,
        actorEmail,
        meta,
      });
      await this.auditRepository.save(log);
    } catch {
      // Non-bloquant : l'échec de l'audit ne casse pas le flux métier.
    }
  }

  /** Derniers événements d'audit du compte du responsable. */
  async getAuditLogs(userId: string): Promise<Record<string, any>[]> {
    const compte = await this.compteB2BRepository.findOne({
      where: { responsable: { id: userId } },
    });
    if (!compte) return [];

    const logs = await this.auditRepository.find({
      where: { compteB2B: { id: compte.id } },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return logs.map((log) => ({
      id: log.id,
      type: log.type,
      actorEmail: log.actorEmail,
      meta: log.meta,
      createdAt: log.createdAt,
    }));
  }
}
