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
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

@Controller('tresorerie')
export class TresorerieController {
  constructor(private readonly tresorerieService: TresorerieService) {}

  // GET /tresorerie/stats — Dashboard KPIs financiers (US-26)
  @Get('stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  getStats(
    @Req() req: AuthenticatedRequest,
    @Query('period') period: 'day' | 'week' | 'month' = 'day',
  ) {
    const restaurantId = req.user?.restaurant?.id;
    if (!restaurantId) {
      throw new BadRequestException('Restaurant ID required');
    }
    return this.tresorerieService.getRevenueStats(restaurantId, period);
  }

  // GET /tresorerie/commissions — dette espèces / versements en ligne du restaurant
  @Get('commissions')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  getCommissionsResume(@Req() req: AuthenticatedRequest) {
    const restaurantId = req.user?.restaurant?.id;
    if (!restaurantId) {
      throw new BadRequestException('Restaurant ID required');
    }
    return this.tresorerieService.getCommissionsResume(restaurantId);
  }

  // GET /tresorerie/export/syscohada?period=monthly
  @Get('export/syscohada')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  async exportSyscohada(
    @Req() req: AuthenticatedRequest,
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
  recordExpense(
    @Body()
    expenseData: {
      categorie: string;
      montant: number;
      description?: string;
      date?: string;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    const restaurantId = req.user?.restaurant?.id;
    if (!restaurantId) {
      throw new BadRequestException('Restaurant ID required');
    }
    if (!expenseData?.categorie) {
      throw new BadRequestException('Catégorie requise');
    }
    const montant = Number(expenseData?.montant);
    if (!montant || montant <= 0) {
      throw new BadRequestException('Montant strictement positif requis');
    }
    return this.tresorerieService.recordExpense(
      { ...expenseData, montant },
      restaurantId,
    );
  }

  // GET /tresorerie/expenses — Dépenses opérationnelles persistées (période en cours)
  @Get('expenses')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  listExpenses(
    @Req() req: AuthenticatedRequest,
    @Query('period') period: 'day' | 'week' | 'month' = 'month',
  ) {
    const restaurantId = req.user?.restaurant?.id;
    if (!restaurantId) {
      throw new BadRequestException('Restaurant ID required');
    }
    return this.tresorerieService.listExpenses(restaurantId, period);
  }

  // GET /tresorerie/budget-alerts — Config budget persistée
  @Get('budget-alerts')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  getBudgetAlerts(@Req() req: AuthenticatedRequest) {
    const restaurantId = req.user?.restaurant?.id;
    if (!restaurantId) {
      throw new BadRequestException('Restaurant ID required');
    }
    return this.tresorerieService.getBudgetAlerts(restaurantId);
  }

  // GET /tresorerie/reports — Générer rapports financiers/P&L (US-30)
  @Get('reports')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  generateReport(
    @Req() req: AuthenticatedRequest,
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
  configureBudgetAlerts(
    @Body()
    config: {
      plafondMensuel?: number;
      alerte80?: boolean;
      alerte100?: boolean;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    const restaurantId = req.user?.restaurant?.id;
    if (!restaurantId) {
      throw new BadRequestException('Restaurant ID required');
    }
    return this.tresorerieService.configureBudgetAlerts(restaurantId, config);
  }
}
