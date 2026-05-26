import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import {
  Commande,
  StatutCommande,
  ModeLivraison,
  ModePaiementCommande,
} from './entities/commande.entity';
import { LigneCommande } from './entities/ligne-commande.entity';
import { AvisCommande } from './entities/avis-commande.entity';
import { Article } from '../menu/entities/article.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { CreateCommandeDto } from './dto/create-commande.dto';
import { CommandesGateway } from './commandes.gateway';
import { TresorerieService } from '../tresorerie/tresorerie.service';

const DIGITAL_MODES = [
  ModePaiementCommande.ORANGE_MONEY,
  ModePaiementCommande.MTN_MONEY,
  ModePaiementCommande.MOOV_MONEY,
  ModePaiementCommande.CARTE_BANCAIRE,
];

@Injectable()
export class CommandesService {
  constructor(
    @InjectRepository(Commande) private commandeRepo: Repository<Commande>,
    @InjectRepository(LigneCommande)
    private ligneRepo: Repository<LigneCommande>,
    @InjectRepository(AvisCommande)
    private avisRepo: Repository<AvisCommande>,
    @InjectRepository(Restaurant)
    private restaurantRepo: Repository<Restaurant>,
    private dataSource: DataSource,
    private commandesGateway: CommandesGateway,
    private tresorerieService: TresorerieService,
  ) {}

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

    const count = await this.commandeRepo.count({
      where: { restaurant: { id: restaurantId } },
    });
    const year = new Date().getFullYear();
    const numero = `CMD-${year}-${String(count + 1).padStart(3, '0')}`;

    const commande = await this.dataSource.transaction(async (manager) => {
      const ligneEntities: LigneCommande[] = [];
      let montantTotal = 0;

      for (const ligneDto of dto.lignes) {
        const article = await manager.findOne(Article, {
          where: { id: ligneDto.articleId },
        });
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
        // stock = 0 means made-to-order (unlimited); only enforce when restaurant tracks inventory
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

        montantTotal += Number(article.prix) * ligneDto.quantite;
        ligneEntities.push(
          this.ligneRepo.create({
            article: { id: article.id },
            quantite: ligneDto.quantite,
            prixUnitaire: article.prix,
            instructions: ligneDto.instructions || undefined,
          }),
        );
      }

      const created = manager.create(Commande, {
        numero,
        modeLivraison: dto.modeLivraison,
        adresseLivraison:
          dto.modeLivraison === ModeLivraison.LIVRAISON
            ? dto.adresseLivraison
            : undefined,
        montantTotal,
        statut: StatutCommande.RECUE,
        client: { id: clientId },
        restaurant: { id: restaurantId },
        lignes: ligneEntities,
      });

      return manager.save(Commande, created);
    });

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

    this.commandesGateway.emitToKitchen(restaurantId, 'commande.nouvelle', orderPayload);
    this.commandesGateway.emitToManagers('commande.nouvelle', orderPayload);

    this.commandesGateway.emitToClient(clientId, 'commande.creee', {
      id: commande.id,
      numero: commande.numero,
      statut: commande.statut,
    });

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

    if (clientId && commande.client.id !== clientId) {
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

  async updateStatut(
    id: string,
    newStatut: StatutCommande,
    restaurantId?: string,
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

      commande.statut = newStatut;
      const saved = await this.commandeRepo.save(commande);

      const cancelPayload = { id: saved.id, numero: saved.numero, statut: saved.statut };
      this.commandesGateway.emitToKitchen(commande.restaurant.id, 'commande.statut', cancelPayload);
      this.commandesGateway.emitToManagers('commande.statut', cancelPayload);
      this.commandesGateway.emitToClient(saved.client.id, 'commande.statut', {
        id: saved.id,
        statut: saved.statut,
      });

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

    commande.statut = newStatut;
    const saved = await this.commandeRepo.save(commande);

    const statusPayload = { id: saved.id, numero: saved.numero, statut: saved.statut };
    this.commandesGateway.emitToKitchen(commande.restaurant.id, 'commande.statut', statusPayload);
    this.commandesGateway.emitToManagers('commande.statut', statusPayload);
    this.commandesGateway.emitToClient(saved.client.id, 'commande.statut', {
      id: saved.id,
      statut: saved.statut,
    });

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
    this.commandesGateway.emitToKitchen(saved.restaurant.id, 'commande.paiement', paymentPayload);
    this.commandesGateway.emitToManagers('commande.paiement', paymentPayload);
    this.commandesGateway.emitToClient(saved.client.id, 'commande.paiement', {
      id: saved.id,
      estPaye: saved.estPaye,
    });

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
    if (commande.client.id !== clientId)
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

    const clientPayPayload = { id: saved.id, numero: saved.numero, estPaye: true, modePaiement: mode };
    this.commandesGateway.emitToKitchen(saved.restaurant.id, 'commande.paiement', clientPayPayload);
    this.commandesGateway.emitToManagers('commande.paiement', clientPayPayload);
    this.commandesGateway.emitToClient(saved.client.id, 'commande.paiement', {
      id: saved.id,
      estPaye: true,
    });

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
    if (commande.client.id !== clientId)
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

    const allAvis = await this.avisRepo.find({
      where: { restaurant: { id: commande.restaurant.id } },
    });
    const nbAvis = allAvis.length;
    const noteMoyenne =
      Math.round((allAvis.reduce((s, a) => s + a.note, 0) / nbAvis) * 10) / 10;

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
}
