import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  Commande,
  ModePaiementCommande,
} from '../commandes/entities/commande.entity';
import { FactureMensuelleB2B } from '../b2b/entities/facture-mensuelle-b2b.entity';
import { CommandesGateway } from '../commandes/commandes.gateway';
import { SmsService } from '../notifications/sms.service';
import { FcmService } from '../notifications/fcm.service';
import { RECEIPT_QUEUE } from '../receipt-queue/receipt-queue.constants';
import { NovaSendService, NovaSendProvider, InitiatePaymentResult } from './novasend.service';
import { InitierPaiementDto } from './dto/initier-paiement.dto';

// Correspondance provider NovaSend → enum ModePaiementCommande
// CARTE sera actif dès que NovaSend supportera les paiements carte
const PROVIDER_TO_MODE: Record<NovaSendProvider, ModePaiementCommande> = {
  WAVE:     ModePaiementCommande.WAVE,
  NOVASEND: ModePaiementCommande.NOVASEND,
  ORANGE:   ModePaiementCommande.ORANGE_MONEY,
  MOMO:     ModePaiementCommande.MTN_MONEY,
  MOOV:     ModePaiementCommande.MOOV_MONEY,
  CARTE:    ModePaiementCommande.CARTE_BANCAIRE,
};

@Injectable()
export class PaiementsService {
  private readonly logger = new Logger(PaiementsService.name);

  constructor(
    @InjectRepository(Commande)
    private commandeRepo: Repository<Commande>,
    @InjectRepository(FactureMensuelleB2B)
    private factureRepo: Repository<FactureMensuelleB2B>,
    @InjectQueue(RECEIPT_QUEUE)
    private receiptQueue: Queue,
    private commandesGateway: CommandesGateway,
    private smsService: SmsService,
    private fcmService: FcmService,
    private novaSend: NovaSendService,
  ) {}

  // ── Initier un paiement digital ────────────────────────────────────────────
  async initiatePayment(dto: InitierPaiementDto): Promise<InitiatePaymentResult> {
    const commande = await this.commandeRepo.findOne({
      where: { id: dto.commandeId },
      relations: ['client'],
    });
    if (!commande) throw new NotFoundException('Commande introuvable');
    if (commande.estPaye) throw new BadRequestException('Commande déjà payée');

    return this.novaSend.initiate({
      reference:    dto.commandeId,
      amount:       dto.montant,
      customerName: dto.customerName || commande.client?.nom || 'Client',
      telephone:    dto.telephone,
      provider:     dto.provider,
    });
  }

  // ── Simulation : déclenche le webhook en interne (dev uniquement) ──────────
  async confirmSimulation(commandeId: string, provider: NovaSendProvider): Promise<void> {
    await this.handleNovasendWebhook({
      reference: commandeId,
      status:    'success',
      _provider: provider, // champ interne uniquement
    });
  }

  // ── Webhook NovaSend (et simulation) ─────────────────────────────────────
  async handleNovasendWebhook(body: any): Promise<void> {
    const { reference, status, metadata, _provider } = body;

    if (status !== 'SUCCESSFUL' && status !== 'success') return;

    // ── Facture mensuelle B2B ──────────────────────────────────────────────
    const isB2BFacture = String(reference).startsWith('b2b-facture-');
    if (isB2BFacture || metadata?.factureId) {
      const factureId: string =
        metadata?.factureId || String(reference).replace('b2b-facture-', '');
      const facture = await this.factureRepo.findOne({ where: { id: factureId } });
      if (!facture) {
        this.logger.warn(`FactureMensuelleB2B ${factureId} introuvable`);
        return;
      }
      if (facture.statut === 'PAYEE') {
        this.logger.log(`Facture B2B ${factureId} déjà payée`);
        return;
      }
      facture.statut = 'PAYEE';
      await this.factureRepo.save(facture);
      this.logger.log(`Facture B2B ${factureId} → PAYEE via webhook`);
      return;
    }

    // ── Commande standard ─────────────────────────────────────────────────
    const commandeId = metadata?.commandeId || reference;
    if (!commandeId) return;

    const commande = await this.commandeRepo.findOne({
      where: { id: commandeId },
      relations: ['client', 'restaurant'],
    });
    if (!commande) {
      this.logger.warn(`Commande ${commandeId} introuvable`);
      return;
    }
    if (commande.estPaye) {
      this.logger.log(`Commande ${commandeId} déjà payée`);
      return;
    }

    // Résoudre le mode de paiement (simulation → _provider, réel → Map pendingMap)
    const provider: NovaSendProvider | undefined =
      _provider ?? this.novaSend.getProvider(reference);
    const modePaiement: ModePaiementCommande =
      provider ? PROVIDER_TO_MODE[provider] : ModePaiementCommande.ORANGE_MONEY;

    const payeAt = new Date();
    await this.commandeRepo.update(commandeId, { estPaye: true, payeAt, modePaiement });

    const paymentPayload = {
      id:           commandeId,
      numero:       commande.numero,
      estPaye:      true,
      modePaiement,
    };

    // Notifier tous les rôles : staff cuisine, gérants, admin, client
    this.commandesGateway.emitToKitchen(
      commande.restaurant.id,
      'commande.paiement',
      paymentPayload,
    );
    this.commandesGateway.emitToManagers('commande.paiement', paymentPayload);
    this.commandesGateway.emitToClient(
      commande.client.id,
      'commande.paiement',
      paymentPayload,
    );

    // SMS confirmation client (non-bloquant)
    if (commande.client?.telephone) {
      void this.smsService.sendOrderConfirmation(
        commande.client.telephone,
        commande.numero,
        Number(commande.montantTotal),
      );
    }

    // FCM push gérant restaurant (non-bloquant)
    void this.fcmService.notifyNewOrder(
      commande.restaurant.id,
      commande.numero,
      Number(commande.montantTotal),
    );

    // PDF reçu + email via queue BullMQ (5 tentatives, backoff exponentiel)
    await this.receiptQueue.add(
      'send-receipt',
      { commandeId },
      {
        attempts:         5,
        backoff:          { type: 'exponential', delay: 30_000 },
        removeOnComplete: 100,
        removeOnFail:     200,
      },
    );

    this.logger.log(
      `Paiement confirmé: CMD-${commande.numero} — mode ${modePaiement}`,
    );
  }

  async handleCinetpayWebhook(body: any): Promise<void> {
    const { cpm_trans_id, cpm_result } = body;
    if (cpm_result !== '00') return;
    await this.handleNovasendWebhook({
      reference: cpm_trans_id,
      status:    'SUCCESSFUL',
      metadata:  body.metadata,
    });
  }
}
