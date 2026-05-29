import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Commande } from '../commandes/entities/commande.entity';
import { CommandesGateway } from '../commandes/commandes.gateway';
import { SmsService } from '../notifications/sms.service';
import { FcmService } from '../notifications/fcm.service';

@Injectable()
export class PaiementsService {
  private readonly logger = new Logger(PaiementsService.name);

  constructor(
    @InjectRepository(Commande) private commandeRepo: Repository<Commande>,
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

    await this.commandeRepo.update(commandeId, { estPaye: true, payeAt: new Date() });

    this.commandesGateway.emitToManagers('commande.paiement', { id: commandeId, numero: commande.numero, estPaye: true });
    this.commandesGateway.emitToClient(commande.client.id, 'commande.paiement', { id: commandeId, estPaye: true });

    if (commande.client?.telephone) {
      await this.smsService.sendOrderConfirmation(commande.client.telephone, commande.numero, Number(commande.montantTotal));
    }
    await this.fcmService.notifyNewOrder(commande.restaurant.id, commande.numero, Number(commande.montantTotal));

    this.logger.log(`Paiement Novasend confirmé: commande ${commande.numero}`);
  }

  async handleCinetpayWebhook(body: any): Promise<void> {
    const { cpm_trans_id, cpm_result } = body;
    if (cpm_result !== '00') return;
    await this.handleNovasendWebhook({ reference: cpm_trans_id, status: 'SUCCESSFUL', metadata: body.metadata });
  }
}
