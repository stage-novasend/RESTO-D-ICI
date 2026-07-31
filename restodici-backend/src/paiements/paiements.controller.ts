import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Logger,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  ForbiddenException,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { PaiementsService } from './paiements.service';
import { InitierPaiementDto } from './dto/initier-paiement.dto';
import { NovaSendProvider } from './novasend.service';
import { Public } from '../auth/decorators/public.decorator';
import {
  extractSignature,
  verifyNovaSendSignature,
} from './webhook-signature.util';
import * as crypto from 'crypto';

@SkipThrottle()
@Controller('paiements')
export class PaiementsController {
  private readonly logger = new Logger(PaiementsController.name);

  constructor(
    private readonly paiementsService: PaiementsService,
    private readonly config: ConfigService,
  ) {}

  // ── Méthodes de paiement actives (public — aucune clé exposée) ─────────────
  @Public()
  @Get('methodes')
  async getPaymentMethods() {
    return this.paiementsService.getPaymentMethods();
  }

  // ── Initier un paiement digital (NovaSend / Wave / Orange / MTN / Moov) ────
  @Post('initier')
  @UseGuards(AuthGuard('jwt'))
  async initierPaiement(@Body() dto: InitierPaiementDto) {
    return this.paiementsService.initiatePayment(dto);
  }

  // ── Simulation (dev only) : déclenche la confirmation sans appel API ────────
  // Accessible aux utilisateurs authentifiés en local/test pour éviter de bloquer le checkout.
  @Post('simuler')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async simulerConfirmation(
    @Body() body: { commandeId: string; provider: NovaSendProvider },
  ) {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new ForbiddenException('Simulation non disponible en production');
    }
    await this.paiementsService.confirmSimulation(
      body.commandeId,
      body.provider,
    );
    return { status: 'ok', simulated: true };
  }

  // ── Statut d'un paiement (polling front) ────────────────────────────────────
  @Get('statut/:commandeId')
  @UseGuards(AuthGuard('jwt'))
  async getStatut(@Param('commandeId') commandeId: string, @Req() req: any) {
    return this.paiementsService.getPaymentStatus(commandeId, req.user);
  }

  // ── Webhook NovaSend (appelé par NovaSend après paiement) ───────────────────
  @Public() // authentifié par signature HMAC, pas par JWT
  @Post('webhook/novasend')
  @HttpCode(HttpStatus.OK)
  async novasendWebhook(@Body() body: any, @Req() req: any) {
    // [SÉCURITÉ] Signature obligatoire — webhook rejeté sans secret ou signature (audit §3.2)
    const secret = this.config.get<string>('NOVASEND_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error(
        'NOVASEND_WEBHOOK_SECRET non configuré — webhook rejeté',
      );
      return { status: 'misconfigured' };
    }

    // NovaSend signe avec `X-Signature-Value` (cf. doc §Webhooks) ; on accepte
    // aussi l'ancien `X-Webhook-Signature` par tolérance.
    const signature = extractSignature(req.headers);
    if (!signature) {
      this.logger.warn('Novasend webhook: signature absente');
      return { status: 'invalid_signature' };
    }

    const raw = req.rawBody?.toString('utf8') ?? JSON.stringify(body);
    if (!verifyNovaSendSignature(raw, signature, secret)) {
      this.logger.warn('Novasend webhook: signature invalide');
      return { status: 'invalid_signature' };
    }

    this.logger.log(`Novasend webhook: ${JSON.stringify(body).slice(0, 200)}`);
    await this.paiementsService.handleNovasendWebhook(body);
    return { status: 'ok' };
  }

  // ── Webhook CinetPay (legacy) ────────────────────────────────────────────────
  @Public() // authentifié par signature HMAC, pas par JWT
  @Post('webhook/cinetpay')
  @HttpCode(HttpStatus.OK)
  async cinetpayWebhook(
    @Body() body: any,
    @Headers('x-token') tokenHeader: string,
    @Req() req: any,
  ) {
    // [SÉCURITÉ] Fail-closed : signature HMAC obligatoire. Sans elle, n'importe qui
    // pourrait POST {cpm_trans_id, cpm_result:'00'} et valider une commande sans payer.
    const secret = this.config.get<string>('CINETPAY_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error(
        'CINETPAY_WEBHOOK_SECRET non configuré — webhook rejeté',
      );
      return { status: 'misconfigured' };
    }
    if (!tokenHeader) {
      this.logger.warn('CinetPay webhook: signature (x-token) absente');
      return { status: 'invalid_signature' };
    }
    const raw = req.rawBody?.toString() ?? JSON.stringify(body);
    const expected = crypto
      .createHmac('sha256', secret)
      .update(raw)
      .digest('hex');
    // Comparaison à temps constant pour éviter les attaques temporelles.
    const a = Buffer.from(tokenHeader);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      this.logger.warn('CinetPay webhook: signature invalide');
      return { status: 'invalid_signature' };
    }
    this.logger.log(`CinetPay webhook: ${JSON.stringify(body).slice(0, 200)}`);
    await this.paiementsService.handleCinetpayWebhook(body);
    return { cpm_result: '00' };
  }

  // ── Webhook générique par intégration ────────────────────────────────────────
  @Public() // authentifié par signature (verifyWebhook du gateway), pas par JWT
  @Post('webhook/:integrationName')
  @HttpCode(HttpStatus.OK)
  async genericWebhook(
    @Param('integrationName') integrationName: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    this.logger.log(
      `Webhook [${integrationName}]: ${JSON.stringify(body).slice(0, 200)}`,
    );
    // Le corps BRUT est transmis à la stratégie : re-sérialiser le JSON parsé
    // changerait l'ordre des clés et invaliderait le HMAC.
    await this.paiementsService.handleWebhook(
      integrationName,
      body,
      extractSignature(req.headers),
      req.rawBody?.toString('utf8'),
    );
    return { status: 'ok' };
  }
}
