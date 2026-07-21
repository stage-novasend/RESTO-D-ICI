import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  Commande,
  ModePaiementCommande,
} from '../commandes/entities/commande.entity';
import { FactureMensuelleB2B } from '../b2b/entities/facture-mensuelle-b2b.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { ensurePaymentMethodsSeeded } from './payment-methods.seed';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { CommandesGateway } from '../commandes/commandes.gateway';
import { SmsService } from '../notifications/sms.service';
import { FcmService } from '../notifications/fcm.service';
import { RECEIPT_QUEUE } from '../receipt-queue/receipt-queue.constants';
import {
  NovaSendService,
  NovaSendProvider,
  InitiatePaymentResult,
} from './novasend.service';
import { InitierPaiementDto } from './dto/initier-paiement.dto';
import { PaymentGatewayRegistry } from './gateways/payment-gateway.registry';

// Correspondance provider NovaSend → enum ModePaiementCommande
// CARTE sera actif dès que NovaSend supportera les paiements carte
const PROVIDER_TO_MODE: Record<NovaSendProvider, ModePaiementCommande> = {
  WAVE: ModePaiementCommande.WAVE,
  NOVASEND: ModePaiementCommande.NOVASEND,
  ORANGE: ModePaiementCommande.ORANGE_MONEY,
  MOMO: ModePaiementCommande.MTN_MONEY,
  MOOV: ModePaiementCommande.MOOV_MONEY,
  CARTE: ModePaiementCommande.CARTE_BANCAIRE,
};

@Injectable()
export class PaiementsService {
  private readonly logger = new Logger(PaiementsService.name);

  constructor(
    @InjectRepository(Commande)
    private commandeRepo: Repository<Commande>,
    @InjectRepository(FactureMensuelleB2B)
    private factureRepo: Repository<FactureMensuelleB2B>,
    @InjectRepository(PaymentMethod)
    private paymentMethodRepo: Repository<PaymentMethod>,
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    @InjectQueue(RECEIPT_QUEUE)
    private receiptQueue: Queue,
    private commandesGateway: CommandesGateway,
    private smsService: SmsService,
    private fcmService: FcmService,
    private novaSend: NovaSendService,
    private gatewayRegistry: PaymentGatewayRegistry,
  ) {}

  // ── Initier un paiement digital ────────────────────────────────────────────
  async initiatePayment(
    dto: InitierPaiementDto,
  ): Promise<InitiatePaymentResult> {
    const commande = await this.commandeRepo.findOne({
      where: { id: dto.commandeId },
      relations: ['client'],
    });
    if (!commande) throw new NotFoundException('Commande introuvable');
    if (commande.estPaye) throw new BadRequestException('Commande déjà payée');

    // [SÉCURITÉ] Le montant fait autorité côté serveur : on ne facture JAMAIS le
    // montant envoyé par le client. On charge le total réel de la commande.
    const montant = Number(commande.montantTotal);
    if (!(montant > 0)) {
      throw new BadRequestException('Montant de commande invalide');
    }
    if (dto.montant !== montant) {
      this.logger.warn(
        `Montant client (${dto.montant}) ≠ total commande ${commande.numero} (${montant}) — total serveur retenu`,
      );
    }

    let result: InitiatePaymentResult;

    // Si une intégration est spécifiée, passer par le registry (Strategy pattern)
    if (dto.integrationName) {
      const gateway = await this.gatewayRegistry.getGateway(dto.integrationName);
      const gwResult = await gateway.initiate({
        amount: montant,
        provider: dto.provider,
        phone: dto.telephone,
        metadata: {
          reference: dto.commandeId,
          commandeId: dto.commandeId,
          customerName: dto.customerName || commande.client?.nom || 'Client',
          otp: dto.otp,
        },
      });
      result = {
        sessionId: gwResult.transactionId,
        paymentUrl: gwResult.paymentUrl,
        simulated: gwResult.transactionId.startsWith('sim_'),
      };
    } else {
      // Comportement par défaut : NovaSendService direct (rétrocompatibilité)
      result = await this.novaSend.initiate({
        reference: dto.commandeId,
        amount: montant,
        customerName: dto.customerName || commande.client?.nom || 'Client',
        telephone: dto.telephone,
        provider: dto.provider,
        otp: dto.otp,
      });
    }

    // Trace transactionnelle (PENDING) — non bloquant.
    await this.recordPayment(dto, commande, montant, result);

    return result;
  }

  /** Historise un paiement initié (statut PENDING). Ne casse jamais le flux. */
  private async recordPayment(
    dto: InitierPaiementDto,
    commande: Commande,
    montant: number,
    result: InitiatePaymentResult,
  ): Promise<void> {
    try {
      const payment = this.paymentRepo.create({
        reference: dto.commandeId,
        provider: dto.provider,
        amount: montant,
        currency: 'XOF',
        status: PaymentStatus.PENDING,
        externalTransactionId: result.sessionId,
        paymentUrl: result.paymentUrl,
        customerName: dto.customerName || commande.client?.nom || 'Client',
        customerPhone: dto.telephone,
        customerEmail: commande.client?.email,
        metadata: { simulated: result.simulated, provider: dto.provider },
        commandeId: commande.id,
        userId: commande.client?.id,
      });
      await this.paymentRepo.save(payment);
    } catch (e) {
      this.logger.error(
        `Échec enregistrement Payment (CMD ${commande.numero}): ${(e as Error).message}`,
      );
    }
  }

  /** Met à jour la dernière trace de paiement d'une référence. Non bloquant. */
  private async updatePaymentStatus(
    reference: string,
    status: PaymentStatus,
    externalTransactionId?: string,
  ): Promise<void> {
    try {
      const payment = await this.paymentRepo.findOne({
        where: { reference },
        order: { createdAt: 'DESC' },
      });
      if (!payment) return; // ex: facture B2B ou simulation sans trace — on ignore
      payment.status = status;
      if (externalTransactionId)
        payment.externalTransactionId = externalTransactionId;
      await this.paymentRepo.save(payment);
    } catch (e) {
      this.logger.error(
        `Échec MAJ statut Payment (ref ${reference}): ${(e as Error).message}`,
      );
    }
  }

  // ── Simulation : déclenche le webhook en interne (dev uniquement) ──────────
  async confirmSimulation(
    commandeId: string,
    provider: NovaSendProvider,
  ): Promise<void> {
    await this.handleNovasendWebhook({
      reference: commandeId,
      status: 'success',
      _provider: provider, // champ interne uniquement
    });
  }

  // ── Dispatcher générique de webhook par intégration ───────────────────────
  async handleWebhook(
    integrationName: string,
    payload: any,
    signature?: string,
  ): Promise<void> {
    const gateway = await this.gatewayRegistry.getGateway(integrationName);

    if (!gateway.verifyWebhook(payload, signature)) {
      this.logger.warn(`Webhook ${integrationName}: signature invalide`);
      return;
    }

    const result = await gateway.handleWebhook(payload);

    // Enrichir le payload avec les infos normalisées et déléguer au handler interne.
    // Le provider vient du résultat normalisé — le contexte reste agnostique.
    const enriched: any = {
      reference: result.transactionId,
      status: result.status === 'SUCCESS' ? 'SUCCESSFUL' : result.status,
      metadata: result.metadata,
      ...(result.provider ? { _provider: result.provider } : {}),
    };

    await this.handleNovasendWebhook(enriched);
  }

  // ── Webhook NovaSend (et simulation) ─────────────────────────────────────
  async handleNovasendWebhook(body: any): Promise<void> {
    const { reference, status, metadata, _provider } = body;

    const FAILED_STATUSES  = ['FAILED', 'EXPIRED', 'CANCELLED', 'failed', 'expired', 'cancelled'];
    const SUCCESS_STATUSES = ['SUCCESSFUL', 'success'];

    // Paiement échoué / expiré → notifier via WebSocket sans valider la commande
    if (FAILED_STATUSES.includes(status)) {
      const commandeId = metadata?.commandeId || reference;
      if (!commandeId) return;
      const commande = await this.commandeRepo.findOne({
        where: { id: commandeId },
        relations: ['restaurant', 'client'],
      });
      if (!commande || commande.estPaye) return;
      const payload = { id: commandeId, reason: status };
      this.commandesGateway.emitToKitchen(commande.restaurant?.id, 'commande.paiement.echec', payload);
      this.commandesGateway.emitToManagers('commande.paiement.echec', payload);
      if (commande.client?.id) {
        this.commandesGateway.emitToClient(commande.client.id, 'commande.paiement.echec', payload);
      }
      this.logger.warn(`Paiement échoué: CMD ${commandeId} — statut ${status}`);
      await this.updatePaymentStatus(reference, PaymentStatus.FAILED);
      return;
    }

    if (!SUCCESS_STATUSES.includes(status)) return;

    // ── Facture mensuelle B2B ──────────────────────────────────────────────
    const isB2BFacture = String(reference).startsWith('b2b-facture-');
    if (isB2BFacture || metadata?.factureId) {
      const factureId: string =
        metadata?.factureId || String(reference).replace('b2b-facture-', '');
      const facture = await this.factureRepo.findOne({
        where: { id: factureId },
      });
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
    const modePaiement: ModePaiementCommande = provider
      ? PROVIDER_TO_MODE[provider]
      : ModePaiementCommande.ORANGE_MONEY;

    const payeAt = new Date();
    await this.commandeRepo.update(commandeId, {
      estPaye: true,
      payeAt,
      modePaiement,
    });
    await this.updatePaymentStatus(reference, PaymentStatus.SUCCESS);

    const paymentPayload = {
      id: commandeId,
      numero: commande.numero,
      estPaye: true,
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
        attempts: 5,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );

    this.logger.log(
      `Paiement confirmé: CMD-${commande.numero} — mode ${modePaiement}`,
    );
  }


  // l'admin ET dont la gateway est configurée sont proposés au client.
  async getPaymentMethods(): Promise<{ methods: { id: string; label: string; provider: string; gateway: string; needsPhone: boolean }[]; configured: boolean }> {
    await ensurePaymentMethodsSeeded(this.paymentMethodRepo);

    const gateways = await this.gatewayRegistry.getEnabledPaymentGateways();
    const enabledGatewayNames = new Set(gateways.map((gw) => gw.name));

    const rows = await this.paymentMethodRepo.find({
      where: { enabled: true },
      order: { ordre: 'ASC' },
    });

    const methods = rows
      .filter((m) => enabledGatewayNames.has(m.gateway))
      .map((m) => ({
        id: m.code,
        label: m.label,
        provider: m.provider,
        gateway: m.gateway,
        needsPhone: m.needsPhone,
      }));

    return { methods, configured: gateways.length > 0 };
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
