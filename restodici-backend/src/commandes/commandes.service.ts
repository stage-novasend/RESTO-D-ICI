// src/commandes/commandes.service.ts
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
} from './entities/commande.entity';
import { LigneCommande } from './entities/ligne-commande.entity';
import { Article } from '../menu/entities/article.entity';
import { User } from '../auth/entities/user.entity';
import { CreateCommandeDto } from './dto/create-commande.dto';

@Injectable()
export class CommandesService {
  constructor(
    @InjectRepository(Commande) private commandeRepo: Repository<Commande>,
    @InjectRepository(LigneCommande)
    private ligneRepo: Repository<LigneCommande>,
    @InjectRepository(Article) private articleRepo: Repository<Article>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private dataSource: DataSource,
  ) {}

  // ✅ EN-1919 : Création commande avec transaction atomique (RG-21)
  async createCommande(
    dto: CreateCommandeDto,
    clientId: string,
    restaurantId: string,
  ): Promise<Commande> {
    // RG-07: Vérifier panier non vide
    if (!dto.lignes || dto.lignes.length === 0) {
      throw new BadRequestException(
        'La commande doit contenir au moins un article',
      );
    }

    // RG-08 & RG-09: Validation mode livraison & adresse
    if (
      dto.modeLivraison === ModeLivraison.LIVRAISON &&
      !dto.adresseLivraison
    ) {
      throw new BadRequestException('Adresse obligatoire en mode livraison');
    }

    // Génération numéro unique CMD-YYYY-XXX
    const count = await this.commandeRepo.count({
      where: { restaurant: { id: restaurantId } },
    });
    const year = new Date().getFullYear();
    const numero = `CMD-${year}-${String(count + 1).padStart(3, '0')}`;

    // 🔒 TRANSACTION ATOMIQUE (RG-21: Déduction stock + création commande)
    return this.dataSource.transaction(async (manager) => {
      const ligneEntities: LigneCommande[] = [];
      let montantTotal = 0;

      for (const ligneDto of dto.lignes) {
        const article = await manager.findOne(Article, {
          where: { id: ligneDto.articleId },
        });
        if (!article)
          throw new NotFoundException(
            `Article ${ligneDto.articleId} introuvable`,
          );
        if (article.restaurantId !== restaurantId)
          throw new BadRequestException(
            `Article ${article.nom} n'appartient pas au restaurant demandé`,
          );
        if (!article.disponible)
          throw new BadRequestException(`Article ${article.nom} indisponible`);
        if (article.stock < ligneDto.quantite)
          throw new BadRequestException(
            `Stock insuffisant pour ${article.nom}`,
          );

        // Déduction stock immédiate
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
            instructions: ligneDto.instructions || undefined, // ✅ Fix: null → undefined
          }),
        );
      }

      const commande = manager.create(Commande, {
        numero,
        modeLivraison: dto.modeLivraison,
        adresseLivraison:
          dto.modeLivraison === ModeLivraison.LIVRAISON
            ? dto.adresseLivraison
            : undefined, // ✅ Fix: null → undefined
        montantTotal,
        statut: StatutCommande.RECUE,
        client: { id: clientId },
        restaurant: { id: restaurantId },
        lignes: ligneEntities,
      });

      return manager.save(Commande, commande);
    });
  }

  // ✅ US-07 : Historique commandes client
  async findAllByUser(clientId: string): Promise<Commande[]> {
    return this.commandeRepo.find({
      where: { client: { id: clientId } },
      relations: ['lignes', 'lignes.article', 'restaurant'],
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  // ✅ US-08 : Commandes pour un restaurant (filtrage multi-tenant)
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

  // ✅ US-08 : Interface KDS — commandes actives seulement
  async getKDS(restaurantId: string): Promise<Commande[]> {
    return this.commandeRepo.find({
      where: {
        restaurant: { id: restaurantId },
        statut: In([
          StatutCommande.RECUE,
          StatutCommande.CONFIRMEE,
          StatutCommande.EN_PREP,
        ]),
      },
      relations: ['lignes', 'lignes.article'],
      order: { createdAt: 'ASC' },
    });
  }

  // ✅ US-07 : Détail d'une commande (avec vérification d'accès)
  async findOne(id: string, clientId?: string): Promise<Commande> {
    const commande = await this.commandeRepo.findOne({
      where: { id },
      relations: ['lignes', 'lignes.article', 'client', 'restaurant'],
    });

    if (!commande) throw new NotFoundException('Commande introuvable');

    // RG-31: Un client ne voit que SES commandes
    if (clientId && commande.client.id !== clientId) {
      throw new ForbiddenException('Accès refusé à cette commande');
    }

    return commande;
  }

  // ✅ RG-10 : Mise à jour statut séquentiel irréversible
  async updateStatut(
    id: string,
    newStatut: StatutCommande,
    restaurantId?: string,
  ): Promise<Commande> {
    const commande = await this.commandeRepo.findOne({
      where: { id },
      relations: ['restaurant'],
    });

    if (!commande) throw new NotFoundException('Commande introuvable');

    // RG-31: Un gérant ne modifie que SES commandes
    if (restaurantId && commande.restaurant.id !== restaurantId) {
      throw new ForbiddenException('Accès refusé à cette commande');
    }

    const order = [
      StatutCommande.RECUE,
      StatutCommande.CONFIRMEE,
      StatutCommande.EN_PREP,
      StatutCommande.PRETE,
      StatutCommande.LIVREE,
    ];
    const currentIndex = order.indexOf(commande.statut);
    const newIndex = order.indexOf(newStatut);

    if (newStatut === StatutCommande.ANNULEE) {
      const ageMinutes =
        (Date.now() - new Date(commande.createdAt).getTime()) / 60000;
      if (commande.statut !== StatutCommande.RECUE || ageMinutes > 5) {
        throw new BadRequestException(
          `Annulation impossible pour une commande ${commande.statut}`,
        );
      }
      commande.statut = newStatut;
      return this.commandeRepo.save(commande);
    }

    const transitions: Record<StatutCommande, StatutCommande[]> = {
      [StatutCommande.RECUE]: [StatutCommande.CONFIRMEE],
      [StatutCommande.CONFIRMEE]: [StatutCommande.EN_PREP],
      [StatutCommande.EN_PREP]: [StatutCommande.PRETE],
      [StatutCommande.PRETE]: [StatutCommande.LIVREE],
      [StatutCommande.LIVREE]: [],
      [StatutCommande.ANNULEE]: [],
    };

    if (!transitions[commande.statut]?.includes(newStatut)) {
      throw new BadRequestException(
        `Transition invalide: ${commande.statut} → ${newStatut}`,
      );
    }

    commande.statut = newStatut;
    return this.commandeRepo.save(commande);
  }
}
