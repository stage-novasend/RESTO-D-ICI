import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PromosService } from './promos.service';
import { TypePromo, VisibilitePromo } from './entities/promo-code.entity';

type UserReq = {
  user: { id: string; restaurantId?: string; restaurant?: { id: string } };
};

function getRestaurantId(req: UserReq): string {
  return req.user.restaurantId ?? req.user.restaurant?.id ?? '';
}

@Controller('promos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PromosController {
  constructor(private readonly promosService: PromosService) {}

  @Get()
  @Roles('GERANT', 'ADMIN')
  findAll(@Req() req: UserReq) {
    return this.promosService.findByRestaurant(getRestaurantId(req));
  }

  @Post()
  @Roles('GERANT', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Req() req: UserReq,
    @Body()
    dto: {
      code: string;
      type: TypePromo;
      valeur: number;
      description?: string;
      minMontant?: number;
      maxUses?: number | null;
      expiresAt?: string | null;
      actif?: boolean;
      visibilite?: VisibilitePromo;
    },
  ) {
    return this.promosService.create(getRestaurantId(req), dto);
  }

  @Patch(':id')
  @Roles('GERANT', 'ADMIN')
  update(
    @Param('id') id: string,
    @Req() req: UserReq,
    @Body()
    dto: Partial<{
      code: string;
      type: TypePromo;
      valeur: number;
      description: string;
      minMontant: number;
      maxUses: number | null;
      expiresAt: string | null;
      actif: boolean;
      visibilite: VisibilitePromo;
    }>,
  ) {
    return this.promosService.update(id, getRestaurantId(req), dto);
  }

  @Patch(':id/toggle')
  @Roles('GERANT', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  toggle(@Param('id') id: string, @Req() req: UserReq) {
    return this.promosService.toggle(id, getRestaurantId(req));
  }

  @Delete(':id')
  @Roles('GERANT', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @Req() req: UserReq) {
    return this.promosService.remove(id, getRestaurantId(req));
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validate(
    @Body()
    body: {
      code: string;
      restaurantId: string;
      montantCommande: number;
    },
  ) {
    return this.promosService.validate(
      body.code,
      body.restaurantId,
      Number(body.montantCommande),
    );
  }
}
