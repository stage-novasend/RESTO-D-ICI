import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { B2BController } from './controllers/b2b.controller';
import { B2BService } from './services/b2b.service';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { BulkOrder } from './entities/bulk-order.entity';
import { Invoice } from './entities/invoice.entity';
import { User } from '../auth/entities/user.entity';
import { CompteB2B } from './entities/compte-b2b.entity';
import { CollaborateurB2B } from './entities/collaborateur-b2b.entity';
import { CommandeGroupeeB2B } from './entities/commande-groupee-b2b.entity';
import { LigneCommandeGroupeeB2B } from './entities/ligne-commande-groupee-b2b.entity';
import { AuditLogB2B } from './entities/audit-log-b2b.entity';
import { FactureMensuelleB2B } from './entities/facture-mensuelle-b2b.entity';
import { Article } from '../menu/entities/article.entity';
import { CommandesModule } from '../commandes/commandes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Team,
      TeamMember,
      BulkOrder,
      Invoice,
      User,
      CompteB2B,
      CollaborateurB2B,
      CommandeGroupeeB2B,
      LigneCommandeGroupeeB2B,
      AuditLogB2B,
      FactureMensuelleB2B,
      Article,
    ]),
    AuthModule,
    CommandesModule,
  ],
  controllers: [B2BController],
  providers: [B2BService],
  exports: [B2BService],
})
export class B2BModule {}
