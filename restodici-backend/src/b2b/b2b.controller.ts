import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { B2BService } from './b2b.service';

@Controller('b2b')
@UseGuards(AuthGuard('jwt'), RolesGuard)
// Legacy B2B controller (historique).
// NOTE: on l’autorise aussi pour GERANT/STAFF/ADMIN pour éviter les blocages du parcours staff/KDS.
@Roles('B2B', 'GERANT', 'STAFF', 'ADMIN')
export class B2BController {
  constructor(private readonly b2bService: B2BService) {}

  // POST /b2b/accounts — création CompteB2B (dev / démo)
  @Post('accounts')
  createAccount(@Body() dto: any) {
    return this.b2bService.creerCompteB2B(dto);
  }

  // GET /b2b/dashboard
  @Get('dashboard')
  getDashboard(@Req() req: any) {
    return this.b2bService.getDashboard(req?.user);
  }

  // GET /b2b/collaborators
  @Get('collaborators')
  getCollaborators(@Req() req: any) {
    return this.b2bService.getCollaborators(req?.user);
  }

  // POST /b2b/collaborators
  @Post('collaborators')
  createCollaborator(@Req() req: any, @Body() dto: any) {
    return this.b2bService.createCollaborator(req?.user, dto);
  }

  // POST /b2b/orders/bulk
  @Post('orders/bulk')
  bulkOrder(@Req() req: any, @Body() dto: any) {
    return this.b2bService.bulkOrder(req?.user, dto);
  }

  // GET /b2b/orders
  @Get('orders')
  getOrders(@Req() req: any, @Query('compteB2BId') compteB2BId?: string) {
    return this.b2bService.getOrders(req?.user, compteB2BId);
  }

  // GET /b2b/orders/management
  @Get('orders/management')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  getOrdersForManagement(@Req() req: any) {
    return this.b2bService.getOrdersForManagement(req.user);
  }

  // GET /b2b/invoices
  @Get('invoices')
  getInvoices(@Req() req: any) {
    return this.b2bService.getInvoices(req?.user);
  }

  // GET /b2b/reports
  @Get('reports')
  getReports(@Req() req: any) {
    return this.b2bService.getReports(req?.user);
  }
}
