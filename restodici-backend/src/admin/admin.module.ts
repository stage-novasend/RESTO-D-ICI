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

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Restaurant, AuditLog, CompteB2B, SystemConfig, Integration]),
    AuthModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
