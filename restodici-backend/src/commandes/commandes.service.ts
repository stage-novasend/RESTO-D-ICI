import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, LessThan } from 'typeorm';
import {
  Commande,
  StatutCommande,
  ModeLivraison,
  ModePaiementCommande,
} from './entities/commande.entity';
import { LigneCommande } from './entities/ligne-commande.entity';
import { AvisCommande } from './entities/avis-commande.entity';
import { CommandeStatusHistory } from './entities/commande-status-history.entity';
import { CommissionPlateforme } from './entities/commission-plateforme.entity';
import { Article } from '../menu/entities/article.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { CreateCommandeDto } from './dto/create-commande.dto';
import { CommandesGateway } from './commandes.gateway';
import { TresorerieService } from '../tresorerie/tresorerie.service';
import { PromosService } from '../promos/promos.service';
import { SmsService } from '../notifications/sms.service';
import { FcmService } from '../notifications/fcm.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentGatewayRegistry } from '../paiements/gateways/payment-gateway.registry';

// Modes de paiement dont le versement au restaurant peut être automatisé via
// l'API payout NovaSend (mobile money uniquement — pas de virement bancaire
// classique ni de wallet NovaSend interne côté API).
const AUTO_PAYOUT_OPERATORS = new Set(['WAVE', 'ORANGE', 'MTN', 'MOOV']);
const COMMISSION_DEBT_DEADLINE_DAYS = 7;

const DIGITAL_MODES = [
  ModePaiementCommande.ORANGE_MONEY,
  ModePaiementCommande.MTN_MONEY,
  ModePaiementCommande.MOOV_MONEY,
  ModePaiementCommande.CARTE_BANCAIRE,
];

// Libellés lisibles des statuts pour le corps des notifications.
const STATUT_LABELS: Record<string, string> = {
  RECUE: 'reçue',
  CONFIRMEE: 'confirmée',
  EN_PREP: 'en préparation',
  PRETE: 'prête',
  EN_LIVRAISON: 'en livraison',
  LIVREE: 'livrée',
  ANNULEE: 'annulée',
};

@Injectable()
export class CommandesService {
  private readonly logger = new Logger(CommandesService.name);
  constructor(
    @InjectRepository(Commande) private commandeRepo: Repository<Commande>,
    @InjectRepository(LigneCommande)
    private ligneRepo: Repository<LigneCommande>,
    @InjectRepository(AvisCommande)
    private avisRepo: Repository<AvisCommande>,
    @InjectRepository(CommandeStatusHistory)
    private historyRepo: Repository<CommandeStatusHistory>,
    @InjectRepository(Restaurant)
    private restaurantRepo: Repository<Restaurant>,
    @InjectRepository(CommissionPlateforme)
    private commissionRepo: Repository<CommissionPlateforme>,
    private dataSource: DataSource,
    private commandesGateway: CommandesGateway,
    private tresorerieService: TresorerieService,
    private promosService: PromosService,
    private smsService: SmsService,
    private fcmService: FcmService,
    private notificationsService: NotificationsService,
    private paymentGatewayRegistry: PaymentGatewayRegistry,
  ) {}

  /**
   * Crée une notification persistée pour le client ET la pousse en temps réel.
   * (source unique : évite de dupliquer la logique dans chaque étape du cycle)
   */
  private async notifyClient(
    clientId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    try {
      const notif = await this.notificationsService.create({
        userId: clientId,
        type,
        title,
        body,
        data: data ?? null,
      });
      this.commandesGateway.emitToClient(clientId, 'notification.new', notif);
    } catch (err) {
      this.logger.warn(
        `Failed to notify client ${clientId}: ${(err as Error)?.message || err}`,
      );
      // La notification ne doit jamais casser le flux métier.
    }
  }

  /**
   * Calcule et enregistre le cycle commission/versement d'une commande livrée :
   * - paiement encaissé en ligne par la plateforme → la plateforme doit verser
   *   le net au restaurant (payout NovaSend automatique si possible) ;
   * - paiement encaissé en espèces par le restaurant → le restaurant doit sa
   *   commission à la plateforme (dette, échéance 7 jours).
   * Utilise montantNetRestaurant/montantCommissionPlateforme déjà calculés à
   * la création de la commande (taux figé au moment de l'achat), plutôt que
   * de recalculer depuis montantTotal qui inclut les frais de livraison.
   */
  private async processDeliveryCommission(commande: Commande): Promise<void> {
    const taux = Number(
      commande.tauxCommission ?? commande.restaurant.tauxCommission ?? 8,
    );
    const montantCommande = Number(commande.montantTotal);
    const montantCommission = Number(
      commande.montantCommissionPlateforme ??
        parseFloat(((montantCommande * taux) / 100).toFixed(2)),
    );
    const montantNet = Number(
      commande.montantNetRestaurant ?? montantCommande - montantCommission,
    );
    const isOnline = commande.paiementCollectePlateforme === true;

    const row = this.commissionRepo.create({
      commandeId: commande.id,
      restaurantId: commande.restaurant.id,
      montantCommande,
      tauxCommission: taux,
      montantCommission,
      montantNet,
      modePaiement: commande.modePaiement ?? null,
      statut: isOnline ? 'A_VERSER' : 'DU',
      dateEcheance: isOnline
        ? null
        : new Date(
            Date.now() + COMMISSION_DEBT_DEADLINE_DAYS * 24 * 60 * 60 * 1000,
          ),
    });
    const saved = await this.commissionRepo.save(row);

    if (isOnline) {
      await this.attemptRestaurantPayout(saved, commande.restaurant);
    }
  }

  /** Tente un payout NovaSend automatique vers le restaurant ; laisse la ligne
   * en A_VERSER (versement manuel par l'admin) si le mode de réception n'est
   * pas automatisable (NovaSend interne / bancaire) ou si l'appel échoue. */
  private async attemptRestaurantPayout(
    commission: CommissionPlateforme,
    restaurant: Restaurant,
  ): Promise<void> {
    const details = restaurant.modeReceptionDetails;
    const operator = (details?.operator || '').toUpperCase();
    const phone = details?.telephone;

    if (
      restaurant.modeReceptionPaiement !== 'MOBILE_MONEY' ||
      !AUTO_PAYOUT_OPERATORS.has(operator) ||
      !phone
    ) {
      // Pas automatisable via l'API NovaSend (NOVASEND interne, BANCAIRE, ou
      // config incomplète) — reste "A_VERSER" pour versement manuel par l'admin.
      return;
    }

    try {
      const gateway = await this.paymentGatewayRegistry.getGateway('novasend');
      if (!gateway.payout) return;

      await this.commissionRepo.update(commission.id, {
        statut: 'EN_COURS',
        payoutProvider: operator,
        payoutMsisdn: phone,
      });

      const result = await gateway.payout({
        amount: Number(commission.montantNet),
        provider: operator,
        phone,
        reference: `payout-commission-${commission.id}`,
        recipientName: restaurant.nom,
      });

      await this.commissionRepo.update(commission.id, {
        statut:
          result.status === 'PROCESSED'
            ? 'VERSE'
            : result.status === 'FAILED' || result.status === 'EXPIRED'
              ? 'ECHEC'
              : 'EN_COURS',
        payoutReference: result.payoutId,
        dateReglement: result.status === 'PROCESSED' ? new Date() : null,
        payoutErreur:
          result.status === 'FAILED'
            ? JSON.stringify(result.raw).slice(0, 2000)
            : null,
      });
    } catch (err) {
      this.logger.error(
        `Payout NovaSend échoué pour commission ${commission.id}: ${(err as Error)?.message || err}`,
      );
      await this.commissionRepo.update(commission.id, {
        statut: 'ECHEC',
        payoutErreur: String((err as Error)?.message || err).slice(0, 2000),
      });
    }
  }

  /** Un restaurant est bloqué pour de nouvelles commandes s'il a au moins une
   * dette de commission espèces (statut DU) dont l'échéance est dépassée. */
  async hasOverdueCommissionDebt(restaurantId: string): Promise<boolean> {
    const count = await this.commissionRepo.count({
      where: {
        restaurantId,
        statut: 'DU',
        dateEcheance: LessThan(new Date()),
      },
    });
    return count > 0;
  }

  private generateOrderNumber(): string {
    const year = new Date().getFullYear();
    const ts = Date.now().toString(36).toUpperCase().slice(-5);
    const rand = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `CMD-${year}-${ts}${rand}`;
  }

  async createCommande(
    dto: CreateCommandeDto,
    clientId: string,
    restaurantId: string,
  ): Promise<Commande> {
    if (!dto.lignes || dto.lignes.length === 0) {
      throw new BadRequestException(
        'La commande doit contenir au moins un article',
      );
    }

    if (
      dto.modeLivraison === ModeLivraison.LIVRAISON &&
      !dto.adresseLivraison
    ) {
      throw new BadRequestException('Adresse obligatoire en mode livraison');
    }

    if (await this.hasOverdueCommissionDebt(restaurantId)) {
      throw new BadRequestException(
        'Ce restaurant a une commission impayée depuis plus de 7 jours — nouvelles commandes temporairement indisponibles.',
      );
    }

    const numero = this.generateOrderNumber();

    const commande = await this.dataSource.transaction(async (manager) => {
      const ligneEntities: LigneCommande[] = [];
      let montantTotal = 0;
      let montantBaseTotal = 0;

      const restaurant = await manager.findOne(Restaurant, {
        where: { id: restaurantId },
        select: ['id', 'tauxCommission'],
      });
      const tauxPct = Math.min(
        50,
        Math.max(0, Number(restaurant?.tauxCommission ?? 8)),
      );
      const tauxFraction = tauxPct / 100;

      // [PERF] Chargement de tous les articles en une seule requête (audit §4.1)
      const articleIds = dto.lignes.map((l) => l.articleId);
      const articles = await manager.find(Article, {
        where: { id: In(articleIds) },
      });
      const articleMap = new Map(articles.map((a) => [a.id, a]));

      for (const ligneDto of dto.lignes) {
        const article = articleMap.get(ligneDto.articleId);
        if (!article) {
          throw new NotFoundException(
            `Article ${ligneDto.articleId} introuvable`,
          );
        }
        if (article.restaurantId !== restaurantId) {
          throw new BadRequestException(
            `Article ${article.nom} n'appartient pas au restaurant demandé`,
          );
        }
        if (!article.disponible) {
          throw new BadRequestException(`Article ${article.nom} indisponible`);
        }
        if (article.stock > 0 && article.stock < ligneDto.quantite) {
          throw new BadRequestException(
            `Stock insuffisant pour ${article.nom}`,
          );
        }

        if (article.stock > 0) {
          const stockRestant = article.stock - ligneDto.quantite;
          await manager.update(
            Article,
            { id: article.id },
            { stock: stockRestant, disponible: stockRestant > 0 },
          );
        }

        const prixArticleBase =
          article.promoActif &&
          article.prixPromo != null &&
          Number(article.prixPromo) > 0
            ? Number(article.prixPromo)
            : Number(article.prix);
        const supplement = Number(ligneDto.variantSupplement || 0);
        // Commission appliquée sur le prix de l'article uniquement (pas sur le supplément)
        const prixAvecCommission = Math.ceil(
          prixArticleBase * (1 + tauxFraction),
        );
        const prixUnitaireClient = prixAvecCommission + supplement;
        const prixBaseUnitaire = prixArticleBase + supplement;

        montantTotal += prixUnitaireClient * ligneDto.quantite;
        montantBaseTotal += prixBaseUnitaire * ligneDto.quantite;

        ligneEntities.push(
          this.ligneRepo.create({
            article: { id: article.id },
            quantite: ligneDto.quantite,
            prixUnitaire: prixUnitaireClient,
            prixBase: prixBaseUnitaire,
            instructions: ligneDto.instructions || undefined,
            variantLabel: ligneDto.variantLabel || undefined,
            variantSupplement: supplement > 0 ? supplement : undefined,
          }),
        );
      }

      let montantRemise = 0;
      let codePromoId: string | undefined;
      if (dto.codePromo && restaurantId) {
        try {
          const res = await this.promosService.validate(
            dto.codePromo,
            restaurantId,
            montantTotal,
          );
          montantRemise = res.remise;
          codePromoId = res.promo.id;
          montantTotal = Math.max(0, montantTotal - montantRemise);
        } catch {
          // Code invalide : on ignore silencieusement pour ne pas bloquer la commande
        }
      }

      const montantCommissionPlateforme = Math.max(
        0,
        montantTotal - montantBaseTotal,
      );

      // Frais de livraison externe ajoutés au total client (séquestrés jusqu'à confirmation réception)
      const fraisLivraison =
        dto.modeLivraison === ModeLivraison.LIVRAISON
          ? Math.max(0, Number(dto.fraisLivraison || 0))
          : 0;
      if (fraisLivraison > 0) montantTotal += fraisLivraison;

      const created = manager.create(Commande, {
        numero,
        modeLivraison: dto.modeLivraison,
        adresseLivraison:
          dto.modeLivraison === ModeLivraison.LIVRAISON
            ? dto.adresseLivraison
            : undefined,
        tableNumber:
          dto.modeLivraison === ModeLivraison.SUR_PLACE
            ? dto.tableNumber
            : undefined,
        montantTotal,
        fraisLivraison: fraisLivraison > 0 ? fraisLivraison : undefined,
        montantNetRestaurant: montantBaseTotal,
        tauxCommission: tauxPct,
        montantCommissionPlateforme,
        montantRemise: montantRemise > 0 ? montantRemise : undefined,
        codePromoId,
        statut: StatutCommande.RECUE,
        client: { id: clientId },
        restaurant: { id: restaurantId },
        lignes: ligneEntities,
      });

      return manager.save(Commande, created);
    });

    if (commande.codePromoId) {
      await this.promosService
        .apply(commande.codePromoId)
        .catch(() => undefined);
    }

    await this.historyRepo.save(
      this.historyRepo.create({
        commandeId: commande.id,
        actorId: clientId,
        actorRole: 'CLIENT',
        statutPrecedent: undefined,
        statutNouvel: StatutCommande.RECUE,
      }),
    );

    const orderPayload = {
      id: commande.id,
      numero: commande.numero,
      modeLivraison: commande.modeLivraison,
      statut: commande.statut,
      montantTotal: commande.montantTotal,
      restaurantId,
      createdAt: commande.createdAt,
      notification: 'sound+visual',
    };

    this.commandesGateway.emitToKitchen(
      restaurantId,
      'commande.nouvelle',
      orderPayload,
    );
    this.commandesGateway.emitToManagers('commande.nouvelle', orderPayload);

    this.commandesGateway.emitToClient(clientId, 'commande.creee', {
      id: commande.id,
      numero: commande.numero,
      statut: commande.statut,
    });
    await this.notifyClient(
      clientId,
      'commande.creee',
      'Commande enregistrée',
      `Votre commande n°${commande.numero} a bien été enregistrée.`,
      { commandeId: commande.id, numero: commande.numero },
    );

    await this.fcmService.notifyNewOrder(
      restaurantId,
      commande.numero,
      Number(commande.montantTotal),
    );

    return commande;
  }

  async findAllByUser(clientId: string): Promise<Commande[]> {
    return this.commandeRepo.find({
      where: { client: { id: clientId } },
      relations: ['lignes', 'lignes.article', 'restaurant'],
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  async findAllForRestaurant(
    restaurantId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<Commande[]> {
    return this.commandeRepo.find({
      where: { restaurant: { id: restaurantId } },
      relations: ['lignes', 'lignes.article', 'client'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getKDS(restaurantId: string): Promise<Commande[]> {
    const orders = await this.commandeRepo.find({
      where: {
        restaurant: { id: restaurantId },
        statut: In([
          StatutCommande.RECUE,
          StatutCommande.CONFIRMEE,
          StatutCommande.EN_PREP,
          StatutCommande.PRETE,
          StatutCommande.EN_LIVRAISON,
        ]),
      },
      relations: ['lignes', 'lignes.article', 'client'],
      order: { createdAt: 'ASC' },
      take: 300, // plafond de sécurité (commandes actives d'un restaurant)
    });

    for (const order of orders) {
      if (order.client) {
        const { id, nom, prenom, telephone, email } = order.client;
        (order as any).client = { id, nom, prenom, telephone, email };
      }
    }

    return orders;
  }

  async findOne(
    id: string,
    clientId?: string,
    restaurantId?: string,
  ): Promise<Commande> {
    const commande = await this.commandeRepo.findOne({
      where: { id },
      relations: ['lignes', 'lignes.article', 'client', 'restaurant'],
    });

    if (!commande) {
      throw new NotFoundException('Commande introuvable');
    }

    if (clientId && commande.client?.id !== clientId) {
      throw new ForbiddenException('Accès refusé à cette commande');
    }

    if (
      restaurantId &&
      commande.restaurant &&
      commande.restaurant.id !== restaurantId
    ) {
      throw new ForbiddenException('Accès refusé à cette commande');
    }

    return commande;
  }

  async updateS3Key(id: string, s3Key: string): Promise<void> {
    await this.commandeRepo.update(id, { recuPdfS3Key: s3Key });
  }

  async setDelai(id: string, delaiEstime: number): Promise<Commande> {
    const commande = await this.commandeRepo.findOne({ where: { id } });
    if (!commande) throw new NotFoundException('Commande introuvable');
    commande.delaiEstime = delaiEstime > 0 ? delaiEstime : undefined;
    return this.commandeRepo.save(commande);
  }

  async annulerByClient(id: string, clientId: string): Promise<Commande> {
    const commande = await this.commandeRepo.findOne({
      where: { id, client: { id: clientId } },
      relations: ['restaurant', 'client'],
    });
    if (!commande) throw new NotFoundException('Commande introuvable');

    if (!['RECUE', 'CONFIRMEE'].includes(commande.statut)) {
      throw new BadRequestException(
        'Annulation impossible : la commande est déjà en préparation ou terminée',
      );
    }

    const prevStatut = commande.statut;
    commande.statut = StatutCommande.ANNULEE;
    const saved = await this.commandeRepo.save(commande);

    if (this.historyRepo) {
      await this.historyRepo.save(
        this.historyRepo.create({
          commandeId: saved.id,
          actorId: clientId,
          actorRole: 'CLIENT',
          statutPrecedent: prevStatut,
          statutNouvel: StatutCommande.ANNULEE,
        }),
      );
    }

    const payload = {
      id: saved.id,
      numero: saved.numero,
      statut: saved.statut,
    };
    this.commandesGateway.emitToKitchen(
      commande.restaurant.id,
      'commande.statut',
      payload,
    );
    this.commandesGateway.emitToManagers('commande.statut', payload);
    this.commandesGateway.emitToClient(clientId, 'commande.statut', {
      id: saved.id,
      statut: saved.statut,
    });
    await this.notifyClient(
      clientId,
      'commande.statut',
      'Commande mise à jour',
      `Votre commande n°${saved.numero} est ${STATUT_LABELS[saved.statut] ?? saved.statut}.`,
      { commandeId: saved.id, statut: saved.statut },
    );

    return saved;
  }

  async updateStatut(
    id: string,
    newStatut: StatutCommande,
    restaurantId?: string,
    actor?: { id: string; role: string; nom?: string },
  ): Promise<Commande> {
    const commande = await this.commandeRepo.findOne({
      where: { id },
      relations: ['restaurant', 'client'],
    });

    if (!commande) {
      throw new NotFoundException('Commande introuvable');
    }

    if (restaurantId && commande.restaurant.id !== restaurantId) {
      throw new ForbiddenException('Accès refusé à cette commande');
    }

    if (newStatut === StatutCommande.ANNULEE) {
      const ageMinutes =
        (Date.now() - new Date(commande.createdAt).getTime()) / 60000;
      if (
        ![StatutCommande.RECUE, StatutCommande.CONFIRMEE].includes(
          commande.statut,
        ) ||
        ageMinutes > 5
      ) {
        throw new BadRequestException(
          `Annulation impossible pour une commande ${commande.statut}`,
        );
      }

      const prevStatut = commande.statut;
      commande.statut = newStatut;
      const saved = await this.commandeRepo.save(commande);

      await this.historyRepo.save(
        this.historyRepo.create({
          commandeId: saved.id,
          actorId: actor?.id,
          actorRole: actor?.role,
          actorNom: actor?.nom,
          statutPrecedent: prevStatut,
          statutNouvel: newStatut,
        }),
      );

      const cancelPayload = {
        id: saved.id,
        numero: saved.numero,
        statut: saved.statut,
      };
      this.commandesGateway.emitToKitchen(
        commande.restaurant.id,
        'commande.statut',
        cancelPayload,
      );
      this.commandesGateway.emitToManagers('commande.statut', cancelPayload);
      if (saved.client) {
        this.commandesGateway.emitToClient(saved.client.id, 'commande.statut', {
          id: saved.id,
          statut: saved.statut,
        });
        await this.notifyClient(
          saved.client.id,
          'commande.statut',
          'Commande annulée',
          `Votre commande n°${saved.numero} a été annulée.`,
          { commandeId: saved.id, statut: saved.statut },
        );
      }

      return saved;
    }

    const transitions: Record<StatutCommande, StatutCommande[]> = {
      [StatutCommande.RECUE]: [StatutCommande.CONFIRMEE],
      [StatutCommande.CONFIRMEE]: [StatutCommande.EN_PREP],
      [StatutCommande.EN_PREP]: [StatutCommande.PRETE],
      [StatutCommande.PRETE]: [
        StatutCommande.EN_LIVRAISON,
        StatutCommande.LIVREE,
      ],
      [StatutCommande.EN_LIVRAISON]: [StatutCommande.LIVREE],
      [StatutCommande.LIVREE]: [],
      [StatutCommande.ANNULEE]: [],
    };

    if (!transitions[commande.statut]?.includes(newStatut)) {
      throw new BadRequestException(
        `Transition invalide: ${commande.statut} → ${newStatut}`,
      );
    }

    const prevStatut = commande.statut;
    commande.statut = newStatut;
    const saved = await this.commandeRepo.save(commande);

    await this.historyRepo.save(
      this.historyRepo.create({
        commandeId: saved.id,
        actorId: actor?.id,
        actorRole: actor?.role,
        actorNom: actor?.nom,
        statutPrecedent: prevStatut,
        statutNouvel: newStatut,
      }),
    );

    const statusPayload = {
      id: saved.id,
      numero: saved.numero,
      statut: saved.statut,
    };
    this.commandesGateway.emitToKitchen(
      commande.restaurant.id,
      'commande.statut',
      statusPayload,
    );
    this.commandesGateway.emitToManagers('commande.statut', statusPayload);
    if (saved.client) {
      this.commandesGateway.emitToClient(saved.client.id, 'commande.statut', {
        id: saved.id,
        statut: saved.statut,
      });
      await this.notifyClient(
        saved.client.id,
        'commande.statut',
        'Commande mise à jour',
        `Votre commande n°${saved.numero} est ${STATUT_LABELS[saved.statut] ?? saved.statut}.`,
        { commandeId: saved.id, statut: saved.statut },
      );
    }

    if (newStatut === StatutCommande.LIVREE) {
      if (commande.client?.telephone) {
        await this.smsService.sendStatusUpdate(
          commande.client.telephone,
          commande.numero,
          'LIVREE',
        );
      }
      await this.processDeliveryCommission(saved);
    }

    return saved;
  }

  async registerPayment(
    id: string,
    payload: { montantRemis: number; modePaiement: ModePaiementCommande },
    restaurantId?: string,
  ) {
    const commande = await this.commandeRepo.findOne({
      where: { id },
      relations: ['restaurant', 'client'],
    });

    if (!commande) {
      throw new NotFoundException('Commande introuvable');
    }

    if (restaurantId && commande.restaurant.id !== restaurantId) {
      throw new ForbiddenException('Accès refusé à cette commande');
    }

    if (commande.estPaye) {
      throw new BadRequestException('Commande déjà payée');
    }

    const montantTotal = Number(commande.montantTotal);
    const montantRemis = Number(payload.montantRemis);

    if (!Number.isFinite(montantRemis)) {
      throw new BadRequestException('montantRemis invalide');
    }

    if (montantRemis < montantTotal) {
      throw new BadRequestException(
        `Montant insuffisant : remis ${montantRemis}, total ${montantTotal}`,
      );
    }

    commande.estPaye = true;
    commande.modePaiement = payload.modePaiement;
    commande.montantRemis = montantRemis;
    commande.renduMonnaie = montantRemis - montantTotal;
    commande.payeAt = new Date();

    const saved = await this.commandeRepo.save(commande);

    const transaction = await this.tresorerieService.recordOrderPayment({
      commandeId: saved.id,
      numeroCommande: saved.numero,
      montantTotal,
      modePaiement: saved.modePaiement,
      montantRemis,
      restaurantId: saved.restaurant.id,
      payeAt: saved.payeAt,
    });

    const paymentPayload = {
      id: saved.id,
      numero: saved.numero,
      estPaye: saved.estPaye,
      modePaiement: saved.modePaiement,
    };
    this.commandesGateway.emitToKitchen(
      saved.restaurant.id,
      'commande.paiement',
      paymentPayload,
    );
    this.commandesGateway.emitToManagers('commande.paiement', paymentPayload);
    if (saved.client) {
      this.commandesGateway.emitToClient(saved.client.id, 'commande.paiement', {
        id: saved.id,
        estPaye: saved.estPaye,
      });
      if (saved.estPaye) {
        await this.notifyClient(
          saved.client.id,
          'commande.paiement',
          'Paiement confirmé',
          `Le paiement de votre commande n°${saved.numero} est confirmé.`,
          { commandeId: saved.id },
        );
      }
    }

    return {
      commande: saved,
      transaction,
    };
  }

  async clientRegisterPayment(
    id: string,
    modePaiement: string,
    clientId: string,
  ): Promise<Commande> {
    const commande = await this.commandeRepo.findOne({
      where: { id },
      relations: ['restaurant', 'client'],
    });

    if (!commande) throw new NotFoundException('Commande introuvable');
    if (commande.client?.id !== clientId)
      throw new ForbiddenException('Accès refusé');
    if (commande.estPaye) throw new BadRequestException('Commande déjà payée');

    const mode = modePaiement as ModePaiementCommande;
    if (!DIGITAL_MODES.includes(mode)) {
      throw new BadRequestException(
        'Mode de paiement invalide pour une validation automatique',
      );
    }

    commande.estPaye = true;
    commande.modePaiement = mode;
    commande.montantRemis = Number(commande.montantTotal);
    commande.renduMonnaie = 0;
    commande.payeAt = new Date();

    const saved = await this.commandeRepo.save(commande);

    await this.tresorerieService.recordOrderPayment({
      commandeId: saved.id,
      numeroCommande: saved.numero,
      montantTotal: Number(saved.montantTotal),
      modePaiement: saved.modePaiement,
      montantRemis: Number(saved.montantTotal),
      restaurantId: saved.restaurant.id,
      payeAt: saved.payeAt,
    });

    const clientPayPayload = {
      id: saved.id,
      numero: saved.numero,
      estPaye: true,
      modePaiement: mode,
    };
    this.commandesGateway.emitToKitchen(
      saved.restaurant.id,
      'commande.paiement',
      clientPayPayload,
    );
    this.commandesGateway.emitToManagers('commande.paiement', clientPayPayload);
    this.commandesGateway.emitToClient(saved.client.id, 'commande.paiement', {
      id: saved.id,
      estPaye: true,
    });
    await this.notifyClient(
      saved.client.id,
      'commande.paiement',
      'Paiement confirmé',
      `Le paiement de votre commande n°${saved.numero} est confirmé.`,
      { commandeId: saved.id },
    );

    return saved;
  }

  async submitAvis(
    commandeId: string,
    clientId: string,
    note: number,
    commentaire?: string,
  ): Promise<{ avis: AvisCommande; noteMoyenne: number; nbAvis: number }> {
    if (note < 1 || note > 5)
      throw new BadRequestException('Note entre 1 et 5');

    const commande = await this.commandeRepo.findOne({
      where: { id: commandeId },
      relations: ['client', 'restaurant'],
    });
    if (!commande) throw new NotFoundException('Commande introuvable');
    if (commande.client?.id !== clientId)
      throw new ForbiddenException('Accès refusé');
    if (commande.statut !== StatutCommande.LIVREE)
      throw new BadRequestException(
        'Seules les commandes livrées peuvent être notées',
      );

    const existing = await this.avisRepo.findOne({
      where: {
        commande: { id: commandeId },
        client: { id: clientId },
      },
    });
    if (existing) throw new BadRequestException('Avis déjà soumis');

    const avis = this.avisRepo.create({
      commande: { id: commandeId },
      restaurant: { id: commande.restaurant.id },
      client: { id: clientId },
      note,
      commentaire,
    });
    const saved = await this.avisRepo.save(avis);

    // Agrégation en base (COUNT/AVG) — ne charge pas toute la table des avis.
    const agg = await this.avisRepo
      .createQueryBuilder('a')
      .select('COUNT(*)', 'nb')
      .addSelect('AVG(a.note)', 'moyenne')
      .where('a.restaurantId = :rid', { rid: commande.restaurant.id })
      .getRawOne<{ nb: string; moyenne: string }>();

    const nbAvis = Number(agg?.nb ?? 0);
    const noteMoyenne = Math.round(Number(agg?.moyenne ?? 0) * 10) / 10;

    await this.restaurantRepo.update(
      { id: commande.restaurant.id },
      { noteMoyenne, nbAvis },
    );

    return { avis: saved, noteMoyenne, nbAvis };
  }

  async getAvisForOrder(
    commandeId: string,
    clientId: string,
  ): Promise<AvisCommande | null> {
    return this.avisRepo.findOne({
      where: { commande: { id: commandeId }, client: { id: clientId } },
    });
  }

  async getCommandeHistory(
    commandeId: string,
    clientId?: string,
    restaurantId?: string,
  ): Promise<CommandeStatusHistory[]> {
    const commande = await this.commandeRepo.findOne({
      where: { id: commandeId },
      relations: ['client', 'restaurant'],
    });
    if (!commande) throw new NotFoundException('Commande introuvable');
    if (clientId && commande.client?.id !== clientId)
      throw new ForbiddenException('Accès refusé');
    if (restaurantId && commande.restaurant.id !== restaurantId)
      throw new ForbiddenException('Accès refusé');

    return this.historyRepo.find({
      where: { commandeId },
      order: { createdAt: 'ASC' },
    });
  }

  async getRestaurantActivity(
    restaurantId: string,
    limit: number = 50,
  ): Promise<CommandeStatusHistory[]> {
    return this.historyRepo
      .createQueryBuilder('h')
      .innerJoin('h.commande', 'c')
      .where('c.restaurantId = :restaurantId', { restaurantId })
      .orderBy('h.createdAt', 'DESC')
      .take(limit)
      .select([
        'h.id',
        'h.commandeId',
        'h.actorId',
        'h.actorRole',
        'h.actorNom',
        'h.statutPrecedent',
        'h.statutNouvel',
        'h.createdAt',
        'c.numero',
      ])
      .getRawAndEntities()
      .then(({ entities, raw }) =>
        entities.map((e, i) => ({
          ...e,
          commandeNumero: raw[i]?.c_numero,
        })),
      );
  }

  async rembourser(id: string, motif: string, restaurantId?: string) {
    const commande = await this.commandeRepo.findOne({
      where: { id },
      relations: ['client', 'restaurant'],
    });
    if (!commande) throw new NotFoundException('Commande introuvable');
    if (restaurantId && commande.restaurant?.id !== restaurantId)
      throw new ForbiddenException();
    if (commande.rembourse) throw new BadRequestException('Déjà remboursée');

    // RG-18 : remboursement uniquement dans les 5 minutes suivant le paiement
    if (!commande.payeAt) {
      throw new BadRequestException("La commande n'a pas encore été payée");
    }
    const delaiMs = Date.now() - new Date(commande.payeAt).getTime();
    if (delaiMs > 5 * 60 * 1000) {
      throw new BadRequestException(
        'Délai de remboursement dépassé — le remboursement doit intervenir dans les 5 minutes suivant le paiement (RG-18)',
      );
    }

    commande.rembourse = true;
    commande.rembourseLe = new Date();
    commande.motifRemboursement = motif ?? null;
    commande.statut = StatutCommande.ANNULEE;
    await this.commandeRepo.save(commande);

    this.commandesGateway.emitToManagers('commande:remboursee', {
      commandeId: id,
      numero: commande.numero,
    });

    if (commande.client?.id) {
      this.commandesGateway.emitToClient(
        commande.client.id,
        'commande.remboursee',
        {
          commandeId: id,
          numero: commande.numero,
          motif: motif ?? null,
        },
      );
      await this.notifyClient(
        commande.client.id,
        'commande.remboursee',
        'Commande remboursée',
        `Votre commande n°${commande.numero} a été remboursée.`,
        { commandeId: id, numero: commande.numero },
      );
    }

    return commande;
  }

  async confirmerReception(
    commandeId: string,
    clientId: string,
  ): Promise<Commande> {
    const commande = await this.commandeRepo.findOne({
      where: { id: commandeId },
      relations: ['client', 'restaurant'],
    });

    if (!commande) throw new NotFoundException('Commande introuvable');
    if (commande.client?.id !== clientId)
      throw new ForbiddenException('Accès refusé');
    if (commande.receptionConfirmeeAt)
      throw new BadRequestException('Réception déjà confirmée');
    if (commande.statut !== StatutCommande.EN_LIVRAISON) {
      throw new BadRequestException(
        "La commande n'est pas en cours de livraison",
      );
    }

    commande.statut = StatutCommande.LIVREE;
    commande.receptionConfirmeeAt = new Date();
    /* escrow libéré : le livreur peut maintenant recevoir sa part */
    commande.livreurPaiementBloque = false;
    commande.livreurPaye = true;

    const saved = await this.commandeRepo.save(commande);

    const payload = {
      id: saved.id,
      numero: saved.numero,
      statut: StatutCommande.LIVREE,
      fraisLivraison: Number(saved.fraisLivraison ?? 0),
    };

    this.commandesGateway.emitToKitchen(
      saved.restaurant.id,
      'commande.statut',
      payload,
    );
    this.commandesGateway.emitToManagers('commande.statut', payload);
    this.commandesGateway.emitToClient(clientId, 'commande.statut', {
      id: saved.id,
      numero: saved.numero,
      statut: StatutCommande.LIVREE,
    });
    await this.notifyClient(
      clientId,
      'commande.statut',
      'Commande livrée',
      `Votre commande n°${saved.numero} a été livrée. Bon appétit !`,
      { commandeId: saved.id, statut: StatutCommande.LIVREE },
    );

    return saved;
  }
}
