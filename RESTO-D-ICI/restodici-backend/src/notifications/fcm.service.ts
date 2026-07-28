import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { EXTERNAL_URLS } from '../config/app-config';

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private serverKey: string | null = null;

  constructor(private config: ConfigService) {
    const key = config.get('FIREBASE_SERVER_KEY');
    if (key && key !== 'your-firebase-key') {
      this.serverKey = key;
      this.logger.log('Firebase FCM configuré');
    } else {
      this.logger.warn(
        'FIREBASE_SERVER_KEY absent — push notifications désactivées',
      );
    }
  }

  async sendToToken(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.serverKey) {
      this.logger.log(
        `[FCM-LOG] Token: ${token.slice(0, 20)}… | ${title}: ${body}`,
      );
      return;
    }
    try {
      await axios.post(
        EXTERNAL_URLS.fcmSend,
        {
          to: token,
          notification: { title, body, sound: 'default' },
          data: data ?? {},
          priority: 'high',
        },
        {
          headers: {
            Authorization: `key=${this.serverKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        },
      );
    } catch (err: any) {
      this.logger.error(`FCM push failed: ${err.message}`);
    }
  }

  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.serverKey) {
      this.logger.log(`[FCM-LOG] Topic: ${topic} | ${title}: ${body}`);
      return;
    }
    try {
      await axios.post(
        EXTERNAL_URLS.fcmSend,
        {
          to: `/topics/${topic}`,
          notification: { title, body, sound: 'default' },
          data: data ?? {},
          priority: 'high',
        },
        {
          headers: {
            Authorization: `key=${this.serverKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        },
      );
    } catch (err: any) {
      this.logger.error(`FCM topic push failed: ${err.message}`);
    }
  }

  async notifyNewOrder(
    restaurantId: string,
    numero: string,
    montant: number,
  ): Promise<void> {
    await this.sendToTopic(
      `restaurant_${restaurantId}`,
      '🛎️ Nouvelle commande',
      `Commande #${numero} — ${montant.toLocaleString('fr-FR')} FCFA`,
      { type: 'nouvelle_commande', numero },
    );
  }

  async notifyStockAlert(
    restaurantId: string,
    articleNom: string,
  ): Promise<void> {
    await this.sendToTopic(
      `restaurant_${restaurantId}`,
      '⚠️ Alerte stock',
      `Stock faible : ${articleNom}`,
      { type: 'stock_alert' },
    );
  }
}
