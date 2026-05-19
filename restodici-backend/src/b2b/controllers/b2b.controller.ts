import {
  Controller,
  Post,
  Get,
  Put,
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

interface RequestWithUser extends Request {
  user: { id: string; role: string };
}

@Controller('b2b')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.B2B)
export class B2BController {
  constructor(private b2bService: B2BService) {}

  // === TEAM ENDPOINTS ===
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

  // === BULK ORDER ENDPOINTS ===
  @Post('bulk-orders')
  async createBulkOrder(
    @Req() req: RequestWithUser,
    @Body() createBulkOrderDto: CreateBulkOrderDto,
  ) {
    return this.b2bService.createBulkOrder(req.user.id, createBulkOrderDto);
  }

  @Post('orders/bulk')
  async createBulkOrderAlias(
    @Req() req: RequestWithUser,
    @Body() createBulkOrderDto: CreateBulkOrderDto,
  ) {
    return this.b2bService.createBulkOrder(req.user.id, createBulkOrderDto);
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

  // === INVOICE ENDPOINTS ===
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

  @Get('dashboard')
  async getDashboard(@Req() req: RequestWithUser) {
    return this.b2bService.getDashboard(req.user.id);
  }

  @Get('collaborators')
  async getCollaborators(@Req() req: RequestWithUser) {
    return this.b2bService.getCollaboratorsByUser(req.user.id);
  }

  @Post('collaborators')
  async createCollaborator(@Req() req: RequestWithUser, @Body() dto: any) {
    return this.b2bService.createCollaborator(req.user.id, dto);
  }

  @Get('orders/management')
  @Roles(Role.GERANT, Role.ADMIN)
  async getOrdersForManagement(@Req() req: RequestWithUser) {
    return this.b2bService.getOrdersForManagement(req.user.id);
  }

  @Get('reports')
  async getReports(@Req() req: RequestWithUser) {
    return this.b2bService.getReportsByUser(req.user.id);
  }
}
