import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  DefaultValuePipe,
  ParseIntPipe,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { CommandesService } from './commandes.service';
import {
  StatutCommande,
  ModePaiementCommande,
} from './entities/commande.entity';
import { CreateCommandeDto } from './dto/create-commande.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TresorerieService } from '../tresorerie/tresorerie.service';

@Controller('commandes')
export class CommandesController {
  constructor(
    private readonly commandesService: CommandesService,
    private readonly tresorerieService: TresorerieService,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENT', 'B2B')
  async create(
    @Body() dto: CreateCommandeDto,
    @Req() req: any,
    @Query('restaurantId') restaurantId?: string,
  ) {
    const clientId = req.user.id;

    const targetRestaurantId =
      restaurantId || req.user.restaurant?.id || dto.restaurantId;

    if (!targetRestaurantId) {
      throw new BadRequestException(
        'restaurantId requis pour créer une commande',
      );
    }

    const normalizedDto: CreateCommandeDto = {
      ...dto,
      lignes: dto.lignes.map((ligne) => ({
        ...ligne,
        quantite: ligne.quantite ?? ligne.quantity,
      })),
    };

    return this.commandesService.createCommande(
      normalizedDto,
      clientId,
      targetRestaurantId,
    );
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENT', 'B2B')
  async findMyOrders(@Req() req: any) {
    return this.commandesService.findAllByUser(req.user.id);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'STAFF', 'ADMIN')
  async findAll(
    @Query('restaurantId') restaurantId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Req() req: any,
  ) {
    const targetRestaurantId =
      req.user.role === 'GERANT' || req.user.role === 'STAFF'
        ? req.user.restaurant?.id
        : restaurantId;

    if (!targetRestaurantId) {
      throw new BadRequestException('restaurantId requis pour ce rôle');
    }

    return this.commandesService.findAllForRestaurant(
      targetRestaurantId,
      limit,
      offset,
    );
  }

  @Get('kds')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'STAFF')
  async getKDS(@Req() req: any) {
    const restaurantId = req.user.restaurant?.id;
    if (!restaurantId) {
      throw new BadRequestException('Compte sans restaurant associé');
    }
    return this.commandesService.getKDS(restaurantId);
  }

  @Get(':id/receipt/pdf')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENT', 'B2B', 'GERANT', 'STAFF', 'ADMIN')
  async getReceiptPdf(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const userRole = req.user.role;
    const clientId =
      userRole === 'CLIENT' || userRole === 'B2B' ? req.user.id : undefined;
    const restaurantId =
      userRole === 'GERANT' || userRole === 'STAFF'
        ? req.user.restaurant?.id
        : undefined;

    const commande = await this.commandesService.findOne(
      id,
      clientId,
      restaurantId,
    );

    if (!commande.estPaye) {
      throw new BadRequestException(
        'Le reçu est disponible après enregistrement du paiement',
      );
    }

    const pdfBuffer = await this.tresorerieService.generateReceiptPdf({
      commandeId: commande.id,
      restaurantId: commande.restaurant.id,
      numeroCommande: commande.numero,
      montantTotal: Number(commande.montantTotal),
      modePaiement: commande.modePaiement,
      payeAt: commande.payeAt,
      clientNom: [commande.client?.prenom, commande.client?.nom]
        .filter(Boolean)
        .join(' '),
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=recu-commande-${commande.numero}.pdf`,
    );
    res.send(pdfBuffer);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findOne(@Param('id') id: string, @Req() req: any) {
    const userRole = req.user.role;
    const clientId = userRole === 'CLIENT' ? req.user.id : undefined;
    const restaurantId =
      userRole === 'GERANT' || userRole === 'STAFF'
        ? req.user.restaurant?.id
        : undefined;

    return this.commandesService.findOne(id, clientId, restaurantId);
  }

  @Patch(':id/statut')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'STAFF', 'ADMIN')
  async updateStatut(
    @Param('id') id: string,
    @Body('statut') statut: StatutCommande,
    @Req() req: any,
  ) {
    const restaurantId =
      req.user.role === 'GERANT' || req.user.role === 'STAFF'
        ? req.user.restaurant?.id
        : undefined;
    return this.commandesService.updateStatut(id, statut, restaurantId);
  }

  @Patch(':id/paiement')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'STAFF', 'ADMIN')
  async registerPayment(
    @Param('id') id: string,
    @Body('montantRemis') montantRemis: number,
    @Body('modePaiement') modePaiement: ModePaiementCommande,
    @Req() req: any,
  ) {
    const restaurantId =
      req.user.role === 'GERANT' || req.user.role === 'STAFF'
        ? req.user.restaurant?.id
        : undefined;

    if (!modePaiement) {
      throw new BadRequestException('modePaiement requis');
    }

    return this.commandesService.registerPayment(
      id,
      { montantRemis, modePaiement },
      restaurantId,
    );
  }
}
