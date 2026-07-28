import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
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
import { PaymentLockService } from './payment-lock.service';
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
export class PaiementsService implements OnModuleInit {
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
    private paymentLock: PaymentLockService,
    @InjectQueue(RECEIPT_QUEUE)
    private receiptQueue: Queue,
    private commandesGateway: CommandesGateway,
    private smsService: SmsService,
    private fcmService: FcmService,
    private novaSend: NovaSendService,
    private gatewayRegistry: PaymentGatewayRegistry,
  ) {}

  // Sème le catalogue des moyens de paiement une seule fois, au démarrage
  // (idempotent, race-safe) — plus de seed par requête.
  async onModuleInit(): Promise<void> {
    await ensurePaymentMethodsSeeded(this.paymentMethodRepo).catch((e) =>
      this.logger.error(
        `Seed moyens de paiement échoué : ${(e as Error).message}`,
      ),
    );
  }

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

    // [SÉCURITÉ] Verrou distribué anti-double-paiement : bloque une seconde
    // initiation concurrente pour la même commande. Gardé en cas de succès
    // (fenêtre de paiement), libéré si l'initiation échoue ou au webhook.
    const locked = await this.paymentLock.acquire(dto.commandeId);
    if (!locked) {
      throw new BadRequestException(
        'Un paiement est déjà en cours pour cette commande.',
      );
    }

    try {
      // Chemin UNIQUE (Strategy pattern) : on passe toujours par le registry.
      // Provider par défaut « novasend » ; le registry construit sa config
      // depuis la base ou, à défaut, depuis l'environnement.
      const gateway = await this.gatewayRegistry.getGateway(
        dto.integrationName || 'novasend',
      );
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
      const result: InitiatePaymentResult = {
        sessionId: gwResult.transactionId,
        paymentUrl: gwResult.paymentUrl,
        simulated: gwResult.transactionId.startsWith('sim_'),
      };

      // Trace transactionnelle (PENDING) — non bloquant.
      await this.recordPayment(dto, commande, montant, result);
      await this.paymentLock.cacheStatus(dto.commandeId, PaymentStatus.PENDING);

      return result;
    } catch (e) {
      // Échec d'initiation → on libère le verrou pour permettre un retry immédiat.
      await this.paymentLock.release(dto.commandeId);
      throw e;
    }
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
      await this.paymentLock.cacheStatus(reference, PaymentStatus.FAILED);
      await this.paymentLock.release(reference); // retry possible
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

    // Résoudre le mode de paiement : provider du webhook, sinon la trace Payment
    // (persistante, fiable quel que soit le chemin d'initiation), sinon la map
    // en mémoire (legacy). Ferme la régression possible en unifiant les chemins.
    const paymentRow = await this.paymentRepo.findOne({
      where: { reference },
      order: { createdAt: 'DESC' },
    });
    const provider: NovaSendProvider | undefined =
      _provider ??
      (paymentRow?.provider as NovaSendProvider | undefined) ??
      this.novaSend.getProvider(reference);
    const modePaiement: ModePaiementCommande =
      (provider && PROVIDER_TO_MODE[provider]) ||
      ModePaiementCommande.ORANGE_MONEY;

    const payeAt = new Date();
    await this.commandeRepo.update(commandeId, {
      estPaye: true,
      payeAt,
      modePaiement,
    });
    await this.updatePaymentStatus(reference, PaymentStatus.SUCCESS);
    await this.paymentLock.cacheStatus(reference, PaymentStatus.SUCCESS);
    await this.paymentLock.release(reference);

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


  // Moyens ACTIVÉS par l'admin ET dont la gateway est configurée (lus en base).
  async getPaymentMethods(): Promise<{ methods: { id: string; label: string; provider: string; gateway: string; needsPhone: boolean }[]; configured: boolean }> {
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

  // ── Statut d'un paiement (pour le front : polling léger) ──────────────────
  // Priorité : cache Redis (frais, écrit au webhook) → table Payment → commande.
  async getPaymentStatus(
    commandeId: string,
    requester: { id: string; role: string; restaurant?: { id?: string } },
  ): Promise<{ commandeId: string; status: string; source: string }> {
    const commande = await this.commandeRepo.findOne({
      where: { id: commandeId },
      relations: ['client', 'restaurant'],
    });
    if (!commande) throw new NotFoundException('Commande introuvable');

    // [SÉCURITÉ] Ownership : ADMIN voit tout ; GERANT/STAFF bornés à leur
    // restaurant ; tout autre rôle doit être le client propriétaire.
    const isAdmin = requester.role === 'ADMIN';
    const isStaff =
      requester.role === 'GERANT' || requester.role === 'STAFF';
    if (!isAdmin) {
      const allowed = isStaff
        ? commande.restaurant?.id === requester.restaurant?.id
        : commande.client?.id === requester.id;
      if (!allowed) throw new ForbiddenException('Accès refusé à cette commande');
    }

    const cached = await this.paymentLock.getCachedStatus(commandeId);
    if (cached) return { commandeId, status: cached, source: 'cache' };

    const payment = await this.paymentRepo.findOne({
      where: { reference: commandeId },
      order: { createdAt: 'DESC' },
    });
    if (payment)
      return { commandeId, status: payment.status, source: 'db' };

    // Aucune trace → on se base sur l'état de la commande.
    return {
      commandeId,
      status: commande.estPaye ? PaymentStatus.SUCCESS : PaymentStatus.PENDING,
      source: 'commande',
    };
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
