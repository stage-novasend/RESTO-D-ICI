import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { BackupService } from './backup.service';
import { SlaService } from './sla.service';
import { Role } from '../auth/entities/user.entity';
import { IntegrationType } from '../common/entities/integration.entity';
import type { Response } from 'express';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly backupService: BackupService,
    private readonly slaService: SlaService,
  ) {}

  /* ── Statistiques plateforme ── */
  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  /* ── Données graphiques ── */
  @Get('stats/charts')
  getChartData() {
    return this.adminService.getChartData();
  }

  /* ── Gestion utilisateurs ── */
  @Get('users')
  getUsers(
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('actif') actif?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getUsers({
      role,
      search,
      actif,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  createUser(
    @Body()
    dto: {
      nom: string;
      prenom?: string;
      email: string;
      password: string;
      role: Role;
      restaurantId?: string;
      telephone?: string;
    },
  ) {
    return this.adminService.createUser(dto);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body()
    dto: Partial<{
      nom: string;
      prenom: string;
      email: string;
      role: Role;
      telephone: string;
      restaurantId: string;
      actif: boolean;
    }>,
  ) {
    return this.adminService.updateUser(id, dto);
  }

  @Patch('users/:id/toggle')
  @HttpCode(HttpStatus.OK)
  toggleUser(@Param('id') id: string) {
    return this.adminService.toggleUser(id);
  }

  @Post('users/activer-tous')
  @HttpCode(HttpStatus.OK)
  activerTousUtilisateurs() {
    return this.adminService.activerTousUtilisateurs();
  }

  /* ── Gestion restaurants ── */
  @Get('restaurants')
  getRestaurants() {
    return this.adminService.getRestaurants();
  }

  @Post('restaurants')
  @HttpCode(HttpStatus.CREATED)
  createRestaurant(
    @Body()
    dto: {
      nom: string;
      telephone: string;
      adresse: string;
      email?: string;
      description?: string;
    },
  ) {
    return this.adminService.createRestaurant(dto);
  }

  @Patch('restaurants/:id')
  updateRestaurant(
    @Param('id') id: string,
    @Body()
    dto: Partial<{
      nom: string;
      telephone: string;
      adresse: string;
      email: string;
      actif: boolean;
    }>,
  ) {
    return this.adminService.updateRestaurant(id, dto);
  }

  @Patch('restaurants/:id/toggle')
  @HttpCode(HttpStatus.OK)
  toggleRestaurant(@Param('id') id: string) {
    return this.adminService.toggleRestaurant(id);
  }

  /* ── Logs d'audit ── */
  @Get('audit-logs')
  getAuditLogs(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAuditLogs({
      userId,
      action,
      from,
      to,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /* ── Exports ── */
  @Get('exports/syscohada')
  async exportSyscohada(@Res() res: Response) {
    const csv = await this.adminService.exportSyscohadaCsv();
    const date = new Date().toISOString().slice(0, 10);
    res
      .set('Content-Type', 'text/csv; charset=utf-8')
      .set(
        'Content-Disposition',
        `attachment; filename="syscohada-${date}.csv"`,
      )
      .send('﻿' + csv);
  }

  @Get('exports/audit')
  async exportAudit(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('action') action?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.adminService.exportAuditCsv({ from, to, action });
    const date = new Date().toISOString().slice(0, 10);
    res!
      .set('Content-Type', 'text/csv; charset=utf-8')
      .set('Content-Disposition', `attachment; filename="audit-${date}.csv"`)
      .send('﻿' + csv);
  }

  /* ── Comptes B2B en attente ── */
  @Get('b2b/pending')
  getPendingB2B() {
    return this.adminService.getPendingB2B();
  }

  @Get('b2b/contestations')
  getContestations() {
    return this.adminService.getContestations();
  }

  @Patch('b2b/contestations/:id/resoudre')
  @HttpCode(HttpStatus.OK)
  resolveContestation(
    @Param('id') id: string,
    @Body('accepted') accepted: boolean,
    @Body('note') note: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.adminService.resolveContestation(id, req.user.id, accepted, note || '');
  }

  @Patch('b2b/:id/valider')
  @HttpCode(HttpStatus.OK)
  validateB2B(
    @Param('id') id: string,
    @Body('approved') approved: boolean,
    @Req() req: { user: { id: string } },
  ) {
    return this.adminService.validateB2B(id, req.user.id, approved);
  }

  /* ── Configuration système ── */

  @Get('config')
  getConfig() {
    return this.adminService.getConfig();
  }

  @Patch('config/:key')
  @HttpCode(HttpStatus.OK)
  setConfig(
    @Param('key') key: string,
    @Body('value') value: string | null,
    @Req() req: { user: { id: string } },
  ) {
    return this.adminService.setConfig(key, value, req.user.id);
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @Body() body: { currentPassword: string; newPassword: string },
    @Req() req: { user: { id: string } },
  ) {
    return this.adminService.changeAdminPassword(
      req.user.id,
      body.currentPassword,
      body.newPassword,
    );
  }

  /* ── Intégrations tierces génériques ── */

  @Get('integrations')
  getIntegrations() {
    return this.adminService.getIntegrations();
  }

  @Post('integrations')
  @HttpCode(HttpStatus.CREATED)
  createIntegration(
    @Body()
    dto: {
      name: string;
      description?: string;
      type: IntegrationType;
      baseUrl?: string;
      apiKey?: string;
      webhookSecret?: string;
      customHeaders?: Record<string, string>;
      enabled?: boolean;
    },
    @Req() req: { user: { id: string } },
  ) {
    return this.adminService.createIntegration(dto, req.user.id);
  }

  @Patch('integrations/:id')
  @HttpCode(HttpStatus.OK)
  updateIntegration(
    @Param('id') id: string,
    @Body()
    dto: Partial<{
      name: string;
      description: string;
      type: IntegrationType;
      baseUrl: string;
      apiKey: string;
      webhookSecret: string;
      customHeaders: Record<string, string>;
      enabled: boolean;
    }>,
  ) {
    return this.adminService.updateIntegration(id, dto);
  }

  @Delete('integrations/:id')
  @HttpCode(HttpStatus.OK)
  deleteIntegration(@Param('id') id: string) {
    return this.adminService.deleteIntegration(id);
  }

  @Post('integrations/:id/test')
  @HttpCode(HttpStatus.OK)
  testIntegration(@Param('id') id: string) {
    return this.adminService.testIntegration(id);
  }

  @Get('backup/list')
  listBackups() {
    return this.backupService.listBackups();
  }

  @Post('backup/run')
  @HttpCode(HttpStatus.OK)
  async runBackup() {
    return this.backupService.performBackup();
  }

  @Get('system-metrics')
  async getSystemMetrics() {
    const mem = process.memoryUsage();
    const uptimeSec = process.uptime();
    const h = Math.floor(uptimeSec / 3600);
    const m = Math.floor((uptimeSec % 3600) / 60);
    // SLA réel (disponibilité mesurée sur 30 j, survit aux redémarrages).
    const sla = await this.slaService.getSla(30);
    return {
      // uptime = durée depuis le DERNIER démarrage du process (info brute).
      uptime: { seconds: Math.round(uptimeSec), label: `${h}h ${m}m` },
      // sla = vraie disponibilité sur la fenêtre glissante.
      sla,
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      },
      node: process.version,
      env: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('commissions')
  getCommissions() {
    return this.adminService.getCommissions();
  }

  @Patch('restaurants/:id/commission')
  updateTauxCommission(@Param('id') id: string, @Body('taux') taux: number) {
    return this.adminService.updateTauxCommission(id, Number(taux));
  }

  @Post('maintenance/purge')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  purgeHistorique(
    @Body() body: { target: 'audit' | 'commandes' | 'livraisons' | 'notifications' | 'all'; before?: string },
  ) {
    return this.adminService.purgeHistorique(body.target, body.before);
  }
}
