import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { LivraisonsExternesService } from './livraisons-externes.service';

@Controller('livraisons-externes')
export class LivraisonsExternesController {
  constructor(private readonly service: LivraisonsExternesService) {}

  // ── Admin : gestion des fournisseurs ──────────────────────────

  @Get('fournisseurs')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GERANT')
  getFournisseurs(@Query('restaurantId') restaurantId?: string) {
    return this.service.findAllFournisseurs(restaurantId);
  }

  @Get('fournisseurs/admin')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  getAllFournisseursAdmin() {
    return this.service.findAllFournisseursAdmin();
  }

  @Post('fournisseurs')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  createFournisseur(@Body() body: any) {
    return this.service.createFournisseur(body);
  }

  @Patch('fournisseurs/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  updateFournisseur(@Param('id') id: string, @Body() body: any) {
    return this.service.updateFournisseur(id, body);
  }

  @Delete('fournisseurs/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  deleteFournisseur(@Param('id') id: string) {
    return this.service.deleteFournisseur(id);
  }

  // ── Dispatch d'une commande ────────────────────────────────────

  @Post('dispatch')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GERANT', 'STAFF')
  @HttpCode(HttpStatus.OK)
  dispatch(@Body() body: {
    commandeId: string;
    fournisseurId: string;
    adresseLivraison: string;
    adresseRetrait?: string;
    clientNom?: string;
    clientTelephone?: string;
    montantTotal?: number;
  }) {
    return this.service.dispatch(body);
  }

  // ── Livraisons d'une commande ──────────────────────────────────

  @Get('commande/:commandeId')
  @UseGuards(AuthGuard('jwt'))
  getLivraisonsCommande(@Param('commandeId') commandeId: string) {
    return this.service.getLivraisonsCommande(commandeId);
  }

  // ── Suivi temps réel d'une livraison ─────────────────────────

  @Get(':id/suivi')
  @UseGuards(AuthGuard('jwt'))
  getSuivi(@Param('id') id: string) {
    return this.service.getSuivi(id);
  }

  // ── Estimation de frais ───────────────────────────────────────

  @Post('fournisseurs/:id/estimer')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GERANT', 'STAFF', 'CLIENT')
  @HttpCode(HttpStatus.OK)
  estimer(@Param('id') id: string, @Body() body: any) {
    return this.service.estimer(id, body);
  }

  // ── Recherche de livreurs disponibles ─────────────────────────

  @Post('fournisseurs/:id/recherche-livreurs')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GERANT', 'STAFF')
  @HttpCode(HttpStatus.OK)
  rechercheLivreurs(
    @Param('id') id: string,
    @Body() body: { adresse: string; date?: string },
  ) {
    return this.service.rechercheLivreurs(id, body);
  }

  // ── Webhook : statuts entrants depuis les fournisseurs ─────────
  // Pas de guard JWT : le fournisseur externe envoie directement ici

  @Public()
  @Post('webhook/:fournisseurId')
  @HttpCode(HttpStatus.OK)
  webhook(@Param('fournisseurId') fournisseurId: string, @Body() body: any) {
    return this.service.handleWebhook(fournisseurId, body);
  }
}
