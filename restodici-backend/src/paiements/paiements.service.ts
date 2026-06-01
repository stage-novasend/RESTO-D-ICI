import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Commande } from '../commandes/entities/commande.entity';
import { CommandesGateway } from '../commandes/commandes.gateway';
import { SmsService } from '../notifications/sms.service';
import { FcmService } from '../notifications/fcm.service';
import { RECEIPT_QUEUE } from '../receipt-queue/receipt-queue.constants';

@Injectable()
export class PaiementsService {
  private readonly logger = new Logger(PaiementsService.name);

  constructor(
    @InjectRepository(Commande) private commandeRepo: Repository<Commande>,
    @InjectQueue(RECEIPT_QUEUE) private receiptQueue: Queue,
    private commandesGateway: CommandesGateway,
    private smsService: SmsService,
    private fcmService: FcmService,
  ) {}

  async handleNovasendWebhook(body: any): Promise<void> {
    const { reference, status, metadata } = body;
    if (status !== 'SUCCESSFUL' && status !== 'success') return;

    const commandeId = metadata?.commandeId || reference;
    if (!commandeId) return;

    const commande = await this.commandeRepo.findOne({
      where: { id: commandeId },
      relations: ['client', 'restaurant'],
    });
    if (!commande) { this.logger.warn(`Commande ${commandeId} introuvable`); return; }
    if (commande.estPaye) { this.logger.log(`Commande ${commandeId} déjà payée`); return; }

    const payeAt = new Date();
    await this.commandeRepo.update(commandeId, { estPaye: true, payeAt });

    this.commandesGateway.emitToManagers('commande.paiement', {
      id: commandeId,
      numero: commande.numero,
      estPaye: true,
    });
    this.commandesGateway.emitToClient(commande.client.id, 'commande.paiement', {
      id: commandeId,
      estPaye: true,
    });

    // SMS confirmation (non-blocking)
    if (commande.client?.telephone) {
      void this.smsService.sendOrderConfirmation(
        commande.client.telephone,
        commande.numero,
        Number(commande.montantTotal),
      );
    }

    // FCM push → managers du restaurant (non-blocking)
    void this.fcmService.notifyNewOrder(
      commande.restaurant.id,
      commande.numero,
      Number(commande.montantTotal),
    );

    // Génération PDF + email reçu via queue avec retry automatique (5 tentatives, backoff exponentiel)
    await this.receiptQueue.add(
      'send-receipt',
      { commandeId },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );

    this.logger.log(`Paiement confirmé: commande ${commande.numero} — job reçu mis en queue`);
  }

  async handleCinetpayWebhook(body: any): Promise<void> {
    const { cpm_trans_id, cpm_result } = body;
    if (cpm_result !== '00') return;
    await this.handleNovasendWebhook({
      reference: cpm_trans_id,
      status: 'SUCCESSFUL',
      metadata: body.metadata,
    });
  }
}
