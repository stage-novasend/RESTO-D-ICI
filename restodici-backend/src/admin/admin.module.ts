import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../auth/entities/user.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { AuditLog } from '../common/entities/audit-log.entity';
import { CompteB2B } from '../b2b/entities/compte-b2b.entity';
import { SystemConfig } from '../common/entities/system-config.entity';
import { Integration } from '../common/entities/integration.entity';
import { AuthModule } from '../auth/auth.module';
import { BackupService } from './backup.service';
import { SlaService } from './sla.service';
import { SlaIncident } from './entities/sla-incident.entity';
import { CommissionPlateforme } from '../commandes/entities/commission-plateforme.entity';
import { FactureMensuelleB2B } from '../b2b/entities/facture-mensuelle-b2b.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Restaurant,
      AuditLog,
      CompteB2B,
      SystemConfig,
      Integration,
      CommissionPlateforme,
      FactureMensuelleB2B,
      SlaIncident,
    ]),
    AuthModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, BackupService, SlaService],
})
export class AdminModule {}
