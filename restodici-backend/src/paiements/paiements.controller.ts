import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { PaiementsService } from './paiements.service';
import { InitierPaiementDto } from './dto/initier-paiement.dto';
import { NovaSendProvider } from './novasend.service';
import * as crypto from 'crypto';

@SkipThrottle()
@Controller('paiements')
export class PaiementsController {
  private readonly logger = new Logger(PaiementsController.name);

  constructor(
    private readonly paiementsService: PaiementsService,
    private readonly config: ConfigService,
  ) {}

  // ── Initier un paiement digital (NovaSend / Wave / Orange / MTN / Moov) ────
  @Post('initier')
  @UseGuards(AuthGuard('jwt'))
  async initierPaiement(@Body() dto: InitierPaiementDto) {
    return this.paiementsService.initiatePayment(dto);
  }

  // ── Simulation (dev only) : déclenche la confirmation sans appel API ────────
  @Post('simuler')
  @HttpCode(HttpStatus.OK)
  async simulerConfirmation(
    @Body() body: { commandeId: string; provider: NovaSendProvider },
  ) {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new ForbiddenException('Simulation non disponible en production');
    }
    await this.paiementsService.confirmSimulation(body.commandeId, body.provider);
    return { status: 'ok', simulated: true };
  }

  // ── Webhook NovaSend (appelé par NovaSend après paiement) ───────────────────
  @Post('webhook/novasend')
  @HttpCode(HttpStatus.OK)
  async novasendWebhook(
    @Body() body: any,
    @Headers('x-signature-value') sigHeader: string,
    @Req() req: any,
  ) {
    const secret = this.config.get<string>('NOVASEND_WEBHOOK_SECRET');
    if (secret && sigHeader) {
      const raw      = req.rawBody?.toString() ?? JSON.stringify(body);
      const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
      if (sigHeader !== expected) {
        this.logger.warn('Novasend webhook: signature invalide');
        return { status: 'invalid_signature' };
      }
    }
    this.logger.log(`Novasend webhook: ${JSON.stringify(body).slice(0, 200)}`);
    await this.paiementsService.handleNovasendWebhook(body);
    return { status: 'ok' };
  }

  // ── Webhook CinetPay (legacy) ────────────────────────────────────────────────
  @Post('webhook/cinetpay')
  @HttpCode(HttpStatus.OK)
  async cinetpayWebhook(@Body() body: any) {
    this.logger.log(`CinetPay webhook: ${JSON.stringify(body).slice(0, 200)}`);
    await this.paiementsService.handleCinetpayWebhook(body);
    return { cpm_result: '00' };
  }
}
