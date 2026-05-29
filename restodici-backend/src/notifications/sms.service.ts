import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: any = null;

  constructor(private config: ConfigService) {
    const sid = config.get('TWILIO_ACCOUNT_SID');
    const token = config.get('TWILIO_AUTH_TOKEN');
    if (sid && token && sid !== 'your-twilio-sid') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const twilio = require('twilio');
        this.client = twilio(sid, token);
        this.logger.log('Twilio SMS configuré');
      } catch {
        this.logger.warn('Package twilio non installé — SMS désactivés');
      }
    } else {
      this.logger.warn('TWILIO_ACCOUNT_SID/AUTH_TOKEN absents — SMS désactivés');
    }
  }

  async sendSms(to: string, body: string): Promise<void> {
    const from = this.config.get('TWILIO_FROM_NUMBER');
    if (!this.client || !from) {
      this.logger.log(`[SMS-LOG] À: ${to} | ${body}`);
      return;
    }
    try {
      await this.client.messages.create({ to, from, body });
      this.logger.log(`SMS envoyé à ${to}`);
    } catch (err: any) {
      this.logger.error(`Échec SMS à ${to}: ${err.message}`);
    }
  }

  async sendOrderConfirmation(telephone: string, numero: string, montant: number): Promise<void> {
    const fcfa = montant.toLocaleString('fr-FR');
    await this.sendSms(telephone, `RestoDici ✓ Commande #${numero} confirmée. Montant: ${fcfa} FCFA. Suivez votre commande sur l'app.`);
  }

  async sendStatusUpdate(telephone: string, numero: string, statut: string): Promise<void> {
    const labels: Record<string, string> = {
      EN_PREP: 'En préparation 🍳',
      PRETE: 'Prête ! Venez récupérer votre commande 🎉',
      EN_LIVRAISON: 'En cours de livraison 🛵',
      LIVREE: 'Livrée avec succès ✅',
    };
    const label = labels[statut];
    if (!label) return;
    await this.sendSms(telephone, `RestoDici — Commande #${numero}: ${label}`);
  }
}
