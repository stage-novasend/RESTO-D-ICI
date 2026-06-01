import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Commande } from '../commandes/entities/commande.entity';
import { CommandesGateway } from '../commandes/commandes.gateway';
import { SmsService } from '../notifications/sms.service';
import { FcmService } from '../notifications/fcm.service';
import { EmailService } from '../email/email.service';
import { TresorerieService } from '../tresorerie/tresorerie.service';

@Injectable()
export class PaiementsService {
  private readonly logger = new Logger(PaiementsService.name);

  constructor(
    @InjectRepository(Commande) private commandeRepo: Repository<Commande>,
    private commandesGateway: CommandesGateway,
    private smsService: SmsService,
    private fcmService: FcmService,
    private emailService: EmailService,
    private tresorerieService: TresorerieService,
  ) {}

  async handleNovasendWebhook(body: any): Promise<void> {
    const { reference, status, metadata } = body;
    if (status !== 'SUCCESSFUL' && status !== 'success') return;

    const commandeId = metadata?.commandeId || reference;
    if (!commandeId) return;

    const commande = await this.commandeRepo.findOne({
      where: { id: commandeId },
      relations: ['client', 'restaurant', 'lignes', 'lignes.article'],
    });
    if (!commande) { this.logger.warn(`Commande ${commandeId} introuvable`); return; }
    if (commande.estPaye) { this.logger.log(`Commande ${commandeId} déjà payée`); return; }

    const payeAt = new Date();
    await this.commandeRepo.update(commandeId, { estPaye: true, payeAt });

    this.commandesGateway.emitToManagers('commande.paiement', { id: commandeId, numero: commande.numero, estPaye: true });
    this.commandesGateway.emitToClient(commande.client.id, 'commande.paiement', { id: commandeId, estPaye: true });

    // SMS confirmation (non-blocking)
    if (commande.client?.telephone) {
      void this.smsService.sendOrderConfirmation(commande.client.telephone, commande.numero, Number(commande.montantTotal));
    }

    // FCM push vers les managers du restaurant (non-blocking)
    void this.fcmService.notifyNewOrder(commande.restaurant.id, commande.numero, Number(commande.montantTotal));

    // Email reçu avec PDF en pièce jointe (RG-16 — < 10s)
    if (commande.client?.email) {
      const lignes = (commande.lignes ?? []).map((l) => ({
        nom: l.article?.nom ?? 'Article',
        quantite: l.quantite,
        prixUnitaire: Number(l.prixUnitaire),
      }));
      try {
        const pdfBuffer = await this.tresorerieService.generateReceiptPdf({
          commandeId: commande.id,
          numero: commande.numero,
          restaurantNom: commande.restaurant.nom,
          restaurantAdresse: commande.restaurant.adresse,
          restaurantTelephone: commande.restaurant.telephone,
          restaurantEmail: commande.restaurant.email,
          restaurantNif: (commande.restaurant as any).nif,
          restaurantRccm: (commande.restaurant as any).rccm,
          clientNom: [commande.client.prenom, commande.client.nom].filter(Boolean).join(' ') || 'Client',
          lignes,
          montantTotal: Number(commande.montantTotal),
          modePaiement: commande.modePaiement,
          modeLivraison: commande.modeLivraison,
          payeAt,
        });
        await this.emailService.sendReceiptEmail({
          to: commande.client.email,
          clientNom: [commande.client.prenom, commande.client.nom].filter(Boolean).join(' ') || 'Client',
          numero: commande.numero,
          montantTotal: Number(commande.montantTotal),
          modePaiement: commande.modePaiement,
          lignes,
          payeAt,
          restaurantNom: commande.restaurant.nom,
          pdfBuffer,
        });
      } catch (err: any) {
        this.logger.error(`Erreur envoi reçu email commande ${commande.numero}: ${err.message}`);
      }
    }

    this.logger.log(`Paiement Novasend confirmé: commande ${commande.numero}`);
  }

  async handleCinetpayWebhook(body: any): Promise<void> {
    const { cpm_trans_id, cpm_result } = body;
    if (cpm_result !== '00') return;
    await this.handleNovasendWebhook({ reference: cpm_trans_id, status: 'SUCCESSFUL', metadata: body.metadata });
  }
}
