import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Integration, IntegrationType } from '../common/entities/integration.entity';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private twilioClient: any = null;

  constructor(
    private config: ConfigService,
    @InjectRepository(Integration)
    private integrationRepo: Repository<Integration>,
  ) {
    const sid   = config.get('TWILIO_ACCOUNT_SID');
    const token = config.get('TWILIO_AUTH_TOKEN');
    if (sid && token && sid !== 'your-twilio-sid') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const twilio = require('twilio');
        this.twilioClient = twilio(sid, token);
        this.logger.log('Twilio SMS configuré (fallback)');
      } catch {
        this.logger.warn('Package twilio non installé');
      }
    }
  }

  // ── Résolution de l'intégration SMS active en base ────────────

  private async resolveSmsIntegration(): Promise<Integration | null> {
    return this.integrationRepo.findOne({
      where: { type: IntegrationType.SMS, enabled: true },
      order: { updatedAt: 'DESC' },
    });
  }

  // ── Envoi via NovaSMS / fournisseur DB ────────────────────────

  private async sendViaDynamicProvider(integration: Integration, to: string, body: string): Promise<boolean> {
    if (!integration.baseUrl || !integration.apiKey) return false;
    try {
      await axios.post(
        `${integration.baseUrl.replace(/\/$/, '')}/send`,
        { to, message: body, from: 'RestoDici' },
        {
          headers: {
            Authorization: `Bearer ${integration.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        },
      );
      this.logger.log(`[${integration.name}] SMS envoyé à ${to}`);
      return true;
    } catch (err: any) {
      this.logger.error(`[${integration.name}] Échec SMS à ${to}: ${err.message}`);
      return false;
    }
  }

  // ── Point d'entrée principal ──────────────────────────────────

  async sendSms(to: string, body: string): Promise<void> {
    // 1. Intégration DB (NovaSMS ou autre) en priorité
    try {
      const integration = await this.resolveSmsIntegration();
      if (integration) {
        const ok = await this.sendViaDynamicProvider(integration, to, body);
        if (ok) return;
      }
    } catch {
      // continue to fallback
    }

    // 2. Fallback Twilio
    const from = this.config.get('TWILIO_FROM_NUMBER');
    if (this.twilioClient && from) {
      try {
        await this.twilioClient.messages.create({ to, from, body });
        this.logger.log(`[Twilio] SMS envoyé à ${to}`);
        return;
      } catch (err: any) {
        this.logger.error(`[Twilio] Échec SMS à ${to}: ${err.message}`);
      }
    }

    // 3. Log-only (dev / aucun provider configuré)
    this.logger.log(`[SMS-LOG] À: ${to} | ${body}`);
  }

  // ── Messages métier ───────────────────────────────────────────

  async sendOrderConfirmation(telephone: string, numero: string, montant: number): Promise<void> {
    const fcfa = Math.round(montant).toLocaleString('fr-FR');
    await this.sendSms(telephone, `RestoDici ✓ Commande #${numero} confirmée. Montant: ${fcfa} FCFA. Suivez votre commande sur l'app.`);
  }

  async sendStatusUpdate(telephone: string, numero: string, statut: string): Promise<void> {
    const labels: Record<string, string> = {
      EN_PREP:      'En préparation 🍳',
      PRETE:        'Prête ! Récupérez votre commande 🎉',
      EN_LIVRAISON: 'En cours de livraison 🛵',
      LIVREE:       'Livrée avec succès ✅',
      ANNULEE:      'Annulée. Contactez-nous pour toute question.',
    };
    const label = labels[statut];
    if (!label) return;
    await this.sendSms(telephone, `RestoDici — Commande #${numero} : ${label}`);
  }

  async sendOtp(telephone: string, code: string): Promise<void> {
    await this.sendSms(telephone, `RestoDici — Votre code de vérification : ${code}. Valable 10 minutes.`);
  }
}
