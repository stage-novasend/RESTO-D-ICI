import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../auth/entities/user.entity';
import { B2BService } from '../services/b2b.service';
import { CreateTeamDto } from '../dto/create-team.dto';
import { AddTeamMemberDto } from '../dto/add-team-member.dto';
import { CreateBulkOrderDto } from '../dto/create-bulk-order.dto';
import { UpdateBulkOrderStatusDto } from '../dto/update-bulk-order-status.dto';
import { CreateCompteB2BDto } from '../dto/create-compte-b2b.dto';
import { CreateCollaborateurB2BDto } from '../dto/create-collaborateur-b2b.dto';
import { CreateCommandeGroupeeDto } from '../dto/create-commande-groupee.dto';

interface RequestWithUser extends Request {
  user: { id: string; role: string };
}

@Controller('b2b')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.B2B)
export class B2BController {
  constructor(private b2bService: B2BService) {}

  // ============================================================
  // === COMPTE B2B =============================================
  // ============================================================

  @Post('compte')
  async createCompte(
    @Req() req: RequestWithUser,
    @Body() dto: CreateCompteB2BDto,
  ) {
    return this.b2bService.createCompteB2B(req.user.id, dto);
  }

  @Get('compte')
  async getCompte(@Req() req: RequestWithUser) {
    return this.b2bService.getCompteWithStatus(req.user.id);
  }

  @Patch('compte')
  async updateCompte(
    @Req() req: RequestWithUser,
    @Body() dto: Partial<CreateCompteB2BDto>,
  ) {
    return this.b2bService.updateCompteB2B(req.user.id, dto);
  }

  // Admin endpoint to validate a B2B account
  @Put('compte/:compteId/valider')
  @Roles(Role.ADMIN, Role.GERANT)
  async validerCompte(
    @Req() req: RequestWithUser,
    @Param('compteId') compteId: string,
    @Body() body: { approved: boolean },
  ) {
    return this.b2bService.validateCompteB2B(
      req.user.id,
      compteId,
      body.approved,
    );
  }

  // ============================================================
  // === COLLABORATEURS B2B (with budget) =======================
  // ============================================================

  @Get('collaborateurs')
  async getCollaborateurs(@Req() req: RequestWithUser) {
    return this.b2bService.getCollaborateursB2B(req.user.id);
  }

  @Post('collaborateurs')
  async createCollaborateur(
    @Req() req: RequestWithUser,
    @Body() dto: CreateCollaborateurB2BDto,
  ) {
    return this.b2bService.createCollaborateurB2B(req.user.id, dto);
  }

  @Get('collaborateurs/:id/solde')
  async getCollaborateurSolde(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    return this.b2bService.getCollaborateurSolde(id, req.user.id);
  }

  @Patch('collaborateurs/:id')
  async updateCollaborateur(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: Partial<CreateCollaborateurB2BDto>,
  ) {
    return this.b2bService.updateCollaborateurB2B(id, req.user.id, dto);
  }

  @Delete('collaborateurs/:id')
  async deactivateCollaborateur(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    await this.b2bService.deactivateCollaborateur(id, req.user.id);
    return { message: 'Collaborateur désactivé' };
  }

  // ============================================================
  // === COMMANDES GROUPÉES =====================================
  // ============================================================

  @Post('commandes-groupees')
  async createCommandeGroupee(
    @Req() req: RequestWithUser,
    @Body() dto: CreateCommandeGroupeeDto,
  ) {
    return this.b2bService.createCommandeGroupee(req.user.id, dto);
  }

  @Get('commandes-groupees')
  async getCommandesGroupees(@Req() req: RequestWithUser) {
    return this.b2bService.getCommandesGroupees(req.user.id);
  }

  // ============================================================
  // === FACTURES MENSUELLES ====================================
  // ============================================================

  @Get('factures-mensuelles')
  async getFacturesMensuelles(@Req() req: RequestWithUser) {
    return this.b2bService.getFacturesMensuelles(req.user.id);
  }

  @Post('factures-mensuelles/:id/payer')
  async payerFacture(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.b2bService.payFacture(id, req.user.id);
  }

  @Post('factures-mensuelles/:id/initier-paiement')
  async initierPaiementFacture(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    return this.b2bService.initierPaiementFacture(id, req.user.id);
  }

  @Post('factures-mensuelles/:id/contester')
  async contesterFacture(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: { motif: string },
  ) {
    return this.b2bService.contestFacture(
      id,
      req.user.id,
      body.motif || 'Motif non précisé',
    );
  }

  @Get('factures-mensuelles/:id/export-syscohada')
  async exportSyscohadaCsv(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    return this.b2bService.exportSyscohadaCsv(id, req.user.id);
  }

  @Post('factures-mensuelles/test-seed')
  async seedFactureTest(@Req() req: RequestWithUser) {
    return this.b2bService.createFactureTest(req.user.id);
  }

  // ============================================================
  // === AUDIT LOGS =============================================
  // ============================================================

  @Get('audit-logs')
  async getAuditLogs(@Req() req: RequestWithUser) {
    return this.b2bService.getAuditLogs(req.user.id);
  }

  // ============================================================
  // === DASHBOARD & REPORTS ====================================
  // ============================================================

  @Get('dashboard')
  async getDashboard(@Req() req: RequestWithUser) {
    return this.b2bService.getDashboard(req.user.id);
  }

  @Get('reports')
  async getReports(@Req() req: RequestWithUser) {
    return this.b2bService.getReportsB2B(req.user.id);
  }

  // ============================================================
  // === LEGACY COLLABORATORS (backward compat) =================
  // ============================================================

  @Get('collaborators')
  async getCollaborators(@Req() req: RequestWithUser) {
    return this.b2bService.getCollaboratorsByUser(req.user.id);
  }

  @Post('collaborators')
  async createCollaborator(@Req() req: RequestWithUser, @Body() dto: any) {
    return this.b2bService.createCollaborator(req.user.id, dto);
  }

  // ============================================================
  // === LEGACY TEAM ENDPOINTS ==================================
  // ============================================================

  @Post('teams')
  async createTeam(
    @Req() req: RequestWithUser,
    @Body() createTeamDto: CreateTeamDto,
  ) {
    return this.b2bService.createTeam(req.user.id, createTeamDto);
  }

  @Get('teams')
  async getTeams(@Req() req: RequestWithUser) {
    return this.b2bService.getTeamsByUser(req.user.id);
  }

  @Post('teams/:teamId/members')
  async addTeamMember(
    @Req() req: RequestWithUser,
    @Param('teamId') teamId: string,
    @Body() addTeamMemberDto: AddTeamMemberDto,
  ) {
    return this.b2bService.addTeamMember(teamId, req.user.id, addTeamMemberDto);
  }

  @Delete('teams/:teamId/members/:userId')
  async removeTeamMember(
    @Req() req: RequestWithUser,
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
  ) {
    await this.b2bService.removeTeamMember(teamId, req.user.id, userId);
    return { message: 'Team member removed successfully' };
  }

  // ============================================================
  // === LEGACY BULK ORDERS =====================================
  // ============================================================

  @Post('bulk-orders')
  async createBulkOrder(
    @Req() req: RequestWithUser,
    @Body() dto: CreateBulkOrderDto,
  ) {
    return this.b2bService.createBulkOrder(req.user.id, dto);
  }

  @Post('orders/bulk')
  async createBulkOrderAlias(
    @Req() req: RequestWithUser,
    @Body() dto: CreateBulkOrderDto,
  ) {
    return this.b2bService.createBulkOrder(req.user.id, dto);
  }

  @Get('bulk-orders')
  async getBulkOrders(@Req() req: RequestWithUser) {
    return this.b2bService.getBulkOrdersByUser(req.user.id);
  }

  @Get('orders')
  async getOrders(@Req() req: RequestWithUser) {
    return this.b2bService.getOrdersByUser(req.user.id);
  }

  @Put('bulk-orders/:orderId/status')
  async updateBulkOrderStatus(
    @Req() req: RequestWithUser,
    @Param('orderId') orderId: string,
    @Body() updateDto: UpdateBulkOrderStatusDto,
  ) {
    return this.b2bService.updateBulkOrderStatus(
      orderId,
      req.user.id,
      updateDto,
    );
  }

  // ============================================================
  // === LEGACY INVOICES ========================================
  // ============================================================

  @Get('invoices')
  async getInvoices(@Req() req: RequestWithUser) {
    return this.b2bService.getInvoicesByUser(req.user.id);
  }

  @Get('invoices/:invoiceId')
  async getInvoice(
    @Req() req: RequestWithUser,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.b2bService.getInvoiceById(invoiceId, req.user.id);
  }

  // Gerant/Admin management endpoint
  @Get('orders/management')
  @Roles(Role.GERANT, Role.ADMIN)
  async getOrdersForManagement(@Req() req: RequestWithUser) {
    return this.b2bService.getOrdersForManagement(req.user.id);
  }

  // Staff/Gerant: active B2B orders for their restaurant (KDS view)
  @Get('restaurant-kds')
  @Roles(Role.GERANT, Role.STAFF, Role.ADMIN)
  async getRestaurantB2BKDS(@Req() req: any) {
    const restaurantId = req.user.restaurant?.id;
    if (!restaurantId) {
      return [];
    }
    return this.b2bService.getB2BKDSForRestaurant(restaurantId);
  }

  // Staff/Gerant: confirm payment at caisse before preparation
  @Patch('commandes-groupees/:id/paiement')
  @Roles(Role.GERANT, Role.STAFF, Role.ADMIN)
  async confirmerPaiement(@Req() req: any, @Param('id') id: string) {
    const restaurantId = req.user.restaurant?.id ?? '';
    return this.b2bService.confirmerPaiementB2B(id, restaurantId);
  }

  // B2B client: cancel order before preparation
  @Patch('commandes-groupees/:id/annuler')
  async annulerCommande(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.b2bService.annulerCommandeGroupeeByClient(id, req.user.id);
  }

  // Staff/Gerant: update B2B order status
  @Patch('commandes-groupees/:id/statut')
  @Roles(Role.GERANT, Role.STAFF, Role.ADMIN)
  async updateB2BOrderStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { statut: string },
  ) {
    const restaurantId = req.user.restaurant?.id ?? '';
    return this.b2bService.updateB2BOrderStatus(id, body.statut, restaurantId);
  }

  // ============================================================
  // === DÉTAIL COMMANDE GROUPÉE + AVIS =========================
  // ============================================================

  @Get('commandes-groupees/:id')
  async getCommandeGroupeeDetail(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    return this.b2bService.getCommandeGroupeeDetail(id, req.user.id);
  }

  @Post('commandes-groupees/:id/avis')
  async submitAvis(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: { note: number; commentaire?: string },
  ) {
    return this.b2bService.submitAvis(
      id,
      req.user.id,
      body.note,
      body.commentaire,
    );
  }

  // ============================================================
  // === PLANS REPAS RÉCURRENTS =================================
  // ============================================================

  @Get('plans-repas')
  async getPlansRepas(@Req() req: RequestWithUser) {
    return this.b2bService.getPlansRepas(req.user.id);
  }

  @Post('plans-repas')
  async createPlanRepas(
    @Req() req: RequestWithUser,
    @Body() body: { nom: string; frequence: string; nbRepas: number; budgetRepas: number; notes?: string },
  ) {
    return this.b2bService.createPlanRepas(req.user.id, body);
  }

  @Patch('plans-repas/:id/toggle')
  async togglePlanRepas(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.b2bService.togglePlanRepas(id, req.user.id);
  }

  @Delete('plans-repas/:id')
  async deletePlanRepas(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.b2bService.deletePlanRepas(id, req.user.id);
  }
}
