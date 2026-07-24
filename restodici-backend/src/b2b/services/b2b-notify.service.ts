import { Injectable } from '@nestjs/common';
import { NotificationsService } from '../../notifications/notifications.service';
import { CommandesGateway } from '../../commandes/commandes.gateway';

/**
 * Notifications B2B — service transverse partagé.
 *
 * Extrait de B2BService : `notifyUser` était dupliqué (B2BService + service des
 * plans repas). Le centraliser évite la divergence et sert tous les domaines
 * (plans, commandes groupées, rappels de livraison).
 */
@Injectable()
export class B2bNotifyService {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly commandesGateway: CommandesGateway,
  ) {}

  /**
   * Crée une notification persistée pour un utilisateur ET la pousse en temps
   * réel. Non bloquant : une notification ne doit jamais interrompre un flux
   * (CRON, paiement…).
   */
  async notifyUser(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    try {
      const notif = await this.notificationsService.create({
        userId,
        type,
        title,
        body,
        data: data ?? null,
      });
      this.commandesGateway.emitToClient(userId, 'notification.new', notif);
    } catch {
      // silencieux — la notification est best-effort
    }
  }
}
