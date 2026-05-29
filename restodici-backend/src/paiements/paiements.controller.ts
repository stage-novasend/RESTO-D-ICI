import { Controller, Post, Body, Headers, Logger, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaiementsService } from './paiements.service';
import * as crypto from 'crypto';

@Controller('paiements')
export class PaiementsController {
  private readonly logger = new Logger(PaiementsController.name);

  constructor(
    private readonly paiementsService: PaiementsService,
    private readonly config: ConfigService,
  ) {}

  @Post('webhook/novasend')
  @HttpCode(HttpStatus.OK)
  async novasendWebhook(
    @Body() body: any,
    @Headers('x-novasend-signature') signature: string,
    @Req() req: any,
  ) {
    const secret = this.config.get<string>('NOVASEND_WEBHOOK_SECRET');
    if (secret && signature) {
      const raw = req.rawBody?.toString() ?? JSON.stringify(body);
      const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
      if (signature !== expected) {
        this.logger.warn('Novasend webhook signature invalide');
        return { status: 'invalid_signature' };
      }
    }
    this.logger.log(`Novasend webhook reçu: ${JSON.stringify(body).slice(0, 200)}`);
    await this.paiementsService.handleNovasendWebhook(body);
    return { status: 'ok' };
  }

  @Post('webhook/cinetpay')
  @HttpCode(HttpStatus.OK)
  async cinetpayWebhook(@Body() body: any) {
    this.logger.log(`CinetPay webhook: ${JSON.stringify(body).slice(0, 200)}`);
    await this.paiementsService.handleCinetpayWebhook(body);
    return { cpm_result: '00' };
  }
}
