import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  async log(
    userId: string,
    action: string,
    payload?: any,
    restaurantId?: string,
  ): Promise<AuditLog> {
    try {
      const entry = this.auditRepo.create({
        userId,
        action,
        payload,
        restaurantId,
      });
      return await this.auditRepo.save(entry);
    } catch (err) {
      this.logger.warn(`Impossible d'enregistrer l'audit: ${err.message}`);
      throw err;
    }
  }
}
