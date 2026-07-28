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
import { StorageService } from '../storage/storage.service';
import { HorairesGuard } from './guards/horaires.guard';

@Controller('commandes')
export class CommandesController {
  constructor(
    private readonly commandesService: CommandesService,
    private readonly tresorerieService: TresorerieService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard, HorairesGuard)
  @Roles('CLIENT', 'B2B', 'STAFF', 'GERANT')
  async create(
    @Body() dto: CreateCommandeDto,
    @Req() req: any,
    @Query('restaurantId') restaurantId?: string,
  ) {
    const clientId = req.user.id;

    // STAFF/GERANT create commandes on behalf of the restaurant — use their attached restaurant
    const targetRestaurantId =
      req.user.restaurant?.id || restaurantId || dto.restaurantId;

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
    @Query('limit') limitStr: string,
    @Query('offset') offsetStr: string,
    @Req() req: any,
  ) {
    const limit = Math.min(
      Math.max(parseInt(limitStr ?? '50', 10) || 50, 1),
      200,
    );
    const offset = Math.max(parseInt(offsetStr ?? '0', 10) || 0, 0);
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const safeQueryId =
      restaurantId && UUID_RE.test(restaurantId) ? restaurantId : undefined;

    const targetRestaurantId =
      req.user.role === 'GERANT' || req.user.role === 'STAFF'
        ? req.user.restaurant?.id || safeQueryId
        : safeQueryId;

    if (!targetRestaurantId) return [];

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
    if (!restaurantId) return [];
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

    let pdfBuffer: Buffer | null = null;

    // Servir depuis S3 si le PDF a déjà été persisté
    if ((commande as any).recuPdfS3Key) {
      pdfBuffer = await this.storageService.downloadPdf(
        (commande as any).recuPdfS3Key,
      );
    }

    // Génération à la volée si absent de S3 (ou S3 non configuré)
    if (!pdfBuffer) {
      pdfBuffer = await this.tresorerieService.generateReceiptPdf({
        commandeId: commande.id,
        numero: commande.numero,
        restaurantNom: commande.restaurant.nom,
        restaurantAdresse: commande.restaurant.adresse,
        restaurantTelephone: commande.restaurant.telephone,
        restaurantEmail: commande.restaurant.email,
        restaurantNif: (commande.restaurant as any).nif,
        restaurantRccm: (commande.restaurant as any).rccm,
        restaurantLogo: (commande.restaurant as any).logo || undefined,
        clientNom:
          [commande.client?.prenom, commande.client?.nom]
            .filter(Boolean)
            .join(' ') || 'Client',
        lignes: (commande.lignes ?? []).map((l) => ({
          nom: l.article?.nom ?? 'Article',
          quantite: l.quantite,
          prixUnitaire: Number(l.prixUnitaire),
        })),
        montantTotal: Number(commande.montantTotal),
        modePaiement: commande.modePaiement,
        modeLivraison: commande.modeLivraison,
        payeAt: commande.payeAt,
      });

      // Persister en S3 pour les prochaines requêtes
      if (!(commande as any).recuPdfS3Key && this.storageService.configured) {
        const s3Key = `receipts/${commande.id}/recu-${commande.numero}.pdf`;
        const uploaded = await this.storageService.uploadPdf(s3Key, pdfBuffer);
        if (uploaded) {
          await this.commandesService.updateS3Key(commande.id, s3Key);
        }
      }
    }

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
    const isAdmin = userRole === 'ADMIN';
    const isRestaurantStaff = userRole === 'GERANT' || userRole === 'STAFF';

    // Default-deny : seul l'ADMIN voit toutes les commandes. Le staff/gérant est
    // borné à son restaurant ; TOUT autre rôle (CLIENT, B2B…) doit être le
    // client propriétaire de la commande.
    const restaurantId = isRestaurantStaff ? req.user.restaurant?.id : undefined;
    const clientId = isAdmin || isRestaurantStaff ? undefined : req.user.id;

    return this.commandesService.findOne(id, clientId, restaurantId);
  }

  // Client/B2B: cancel own order before preparation (no time limit)
  @Patch(':id/annuler')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENT', 'B2B')
  async annulerByClient(@Param('id') id: string, @Req() req: any) {
    return this.commandesService.annulerByClient(id, req.user.id);
  }

  @Patch(':id/delai')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'STAFF', 'ADMIN')
  setDelai(@Param('id') id: string, @Body('delaiEstime') delaiEstime: number) {
    return this.commandesService.setDelai(id, Number(delaiEstime));
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
    const actor = {
      id: req.user.id,
      role: req.user.role,
      nom:
        [req.user.prenom, req.user.nom].filter(Boolean).join(' ') ||
        req.user.email,
    };
    return this.commandesService.updateStatut(id, statut, restaurantId, actor);
  }

  @Get(':id/history')
  @UseGuards(AuthGuard('jwt'))
  async getCommandeHistory(@Param('id') id: string, @Req() req: any) {
    const userRole = req.user.role;
    const clientId =
      userRole === 'CLIENT' || userRole === 'B2B' ? req.user.id : undefined;
    const restaurantId =
      userRole === 'GERANT' || userRole === 'STAFF'
        ? req.user.restaurant?.id
        : undefined;
    return this.commandesService.getCommandeHistory(id, clientId, restaurantId);
  }

  @Get('activity/restaurant')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'STAFF', 'ADMIN')
  async getRestaurantActivity(
    @Req() req: any,
    @Query('limit') limitStr?: string,
  ) {
    const restaurantId = req.user.restaurant?.id;
    if (!restaurantId) return [];
    const limit = Math.min(parseInt(limitStr ?? '50', 10) || 50, 200);
    return this.commandesService.getRestaurantActivity(restaurantId, limit);
  }

  @Patch(':id/client-paiement')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENT', 'B2B')
  async clientRegisterPayment(
    @Param('id') id: string,
    @Body('modePaiement') modePaiement: string,
    @Req() req: any,
  ) {
    return this.commandesService.clientRegisterPayment(
      id,
      modePaiement,
      req.user.id,
    );
  }

  @Post(':id/avis')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENT', 'B2B')
  async submitAvis(
    @Param('id') id: string,
    @Body('note') note: number,
    @Body('commentaire') commentaire: string | undefined,
    @Req() req: any,
  ) {
    return this.commandesService.submitAvis(id, req.user.id, note, commentaire);
  }

  @Get(':id/avis')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENT', 'B2B')
  async getAvisForOrder(@Param('id') id: string, @Req() req: any) {
    return this.commandesService.getAvisForOrder(id, req.user.id);
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

  @Patch(':id/rembourser')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERANT', 'ADMIN')
  async rembourser(
    @Param('id') id: string,
    @Body('motif') motif: string,
    @Req() req: any,
  ) {
    const restaurantId =
      req.user.role === 'GERANT' ? req.user.restaurant?.id : undefined;
    return this.commandesService.rembourser(id, motif, restaurantId);
  }

  @Post(':id/confirmer-reception')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENT', 'B2B')
  async confirmerReception(@Param('id') id: string, @Req() req: any) {
    return this.commandesService.confirmerReception(id, req.user.id);
  }
}
