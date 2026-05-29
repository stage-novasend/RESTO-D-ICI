import {
  Controller,
  Get,
  Post,
  Patch,
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
import { Role } from '../auth/entities/user.entity';
import type { Response } from 'express';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /* ── Statistiques plateforme ── */
  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  /* ── Gestion utilisateurs ── */
  @Get('users')
  getUsers(
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('actif') actif?: string,
  ) {
    return this.adminService.getUsers({ role, search, actif });
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
    dto: Partial<{ nom: string; telephone: string; adresse: string; email: string; actif: boolean }>,
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

  /* ── Exports SYSCOHADA ── */
  @Get('exports/syscohada')
  async exportSyscohada(@Res() res: Response) {
    const csv = await this.adminService.exportSyscohadaCsv();
    const date = new Date().toISOString().slice(0, 10);
    res
      .set('Content-Type', 'text/csv; charset=utf-8')
      .set('Content-Disposition', `attachment; filename="syscohada-${date}.csv"`)
      .send('﻿' + csv); // BOM for Excel UTF-8
  }

  /* ── Comptes B2B en attente ── */
  @Get('b2b/pending')
  getPendingB2B() {
    return this.adminService.getPendingB2B();
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
}
