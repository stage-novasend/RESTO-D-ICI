import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { TresorerieService } from './tresorerie.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('tresorerie')
export class TresorerieController {
  constructor(private readonly tresorerieService: TresorerieService) {}

  // GET /tresorerie/stats — Dashboard KPIs financiers (US-26)
  @Get('stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  getStats(
    @Req() req,
    @Query('period') period: 'day' | 'week' | 'month' = 'day',
  ) {
    const restaurantId = req.user?.restaurant?.id;
    if (!restaurantId) {
      throw new BadRequestException('Restaurant ID required');
    }
    return this.tresorerieService.getRevenueStats(restaurantId, period);
  }

  // GET /tresorerie/export/syscohada?period=monthly
  @Get('export/syscohada')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  async exportSyscohada(
    @Req() req,
    @Res() res: any,
    @Query('period') period: 'monthly' | 'quarterly' | 'yearly' = 'monthly',
  ) {
    const restaurantId = req.user?.restaurant?.id;
    if (!restaurantId) {
      throw new BadRequestException('Restaurant ID required');
    }

    const csvBuffer = await this.tresorerieService.exportSyscohada(
      restaurantId,
      period,
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=syscohada-${restaurantId}-${period}.csv`,
    );
    res.send(csvBuffer);
  }

  // POST /tresorerie/expenses — Saisir dépenses opérationnelles (US-28, RG-27)
  @Post('expenses')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  recordExpense(@Body() expenseData: any, @Req() req) {
    const restaurantId = req.user?.restaurant?.id;
    if (!restaurantId) {
      throw new BadRequestException('Restaurant ID required');
    }
    return this.tresorerieService.recordExpense(expenseData, restaurantId);
  }

  // GET /tresorerie/reports — Générer rapports financiers/P&L (US-30)
  @Get('reports')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  generateReport(
    @Req() req,
    @Query('period') period: 'monthly' | 'quarterly' | 'yearly' = 'monthly',
  ) {
    const restaurantId = req.user?.restaurant?.id;
    if (!restaurantId) {
      throw new BadRequestException('Restaurant ID required');
    }
    return this.tresorerieService.generateFinancialReport(restaurantId, period);
  }

  // POST /tresorerie/budget-alerts — Configurer budgets & alertes (US-31, RG-30)
  @Post('budget-alerts')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  configureBudgetAlerts(@Body() config: any, @Req() req) {
    const restaurantId = req.user?.restaurant?.id;
    if (!restaurantId) {
      throw new BadRequestException('Restaurant ID required');
    }
    return this.tresorerieService.configureBudgetAlerts(restaurantId, config);
  }
}
