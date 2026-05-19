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
import { Article } from '../menu/entities/article.entity';
import { CreateCommandeDto } from './dto/create-commande.dto';
import { CommandesGateway } from './commandes.gateway';
import { TresorerieService } from '../tresorerie/tresorerie.service';

@Injectable()
export class CommandesService {
  constructor(
    @InjectRepository(Commande) private commandeRepo: Repository<Commande>,
    @InjectRepository(LigneCommande)
    private ligneRepo: Repository<LigneCommande>,
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
        if (article.stock < ligneDto.quantite) {
          throw new BadRequestException(
            `Stock insuffisant pour ${article.nom}`,
          );
        }

        const stockRestant = article.stock - ligneDto.quantite;
        await manager.update(
          Article,
          { id: article.id },
          { stock: stockRestant, disponible: stockRestant > 0 },
        );

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

    this.commandesGateway.emitToKitchen(restaurantId, 'commande.nouvelle', {
      id: commande.id,
      numero: commande.numero,
      modeLivraison: commande.modeLivraison,
      statut: commande.statut,
      montantTotal: commande.montantTotal,
      createdAt: commande.createdAt,
      notification: 'sound+visual',
    });

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

      this.commandesGateway.emitToKitchen(
        commande.restaurant.id,
        'commande.statut',
        {
          id: saved.id,
          numero: saved.numero,
          statut: saved.statut,
        },
      );
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

    this.commandesGateway.emitToKitchen(
      commande.restaurant.id,
      'commande.statut',
      {
        id: saved.id,
        numero: saved.numero,
        statut: saved.statut,
      },
    );
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

    if (montantRemis !== montantTotal) {
      throw new BadRequestException(
        `Le montant remis doit être exactement ${montantTotal}`,
      );
    }

    commande.estPaye = true;
    commande.modePaiement = payload.modePaiement;
    commande.montantRemis = montantRemis;
    commande.renduMonnaie = 0;
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

    this.commandesGateway.emitToKitchen(
      saved.restaurant.id,
      'commande.paiement',
      {
        id: saved.id,
        numero: saved.numero,
        estPaye: saved.estPaye,
        modePaiement: saved.modePaiement,
      },
    );
    this.commandesGateway.emitToClient(saved.client.id, 'commande.paiement', {
      id: saved.id,
      estPaye: saved.estPaye,
    });

    return {
      commande: saved,
      transaction,
    };
  }
}
