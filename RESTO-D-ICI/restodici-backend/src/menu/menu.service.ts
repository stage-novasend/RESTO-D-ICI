// src/menu/menu.service.ts
import {
  Injectable,
  NotFoundException,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article, CibleEnum } from './entities/article.entity';
import { Categorie } from './entities/categorie.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(
    @InjectRepository(Article) private articleRepo: Repository<Article>,
    @InjectRepository(Categorie) private categorieRepo: Repository<Categorie>,
    @InjectRepository(Restaurant)
    private restaurantRepo: Repository<Restaurant>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  //  GET /menu — Affichage client avec filtres (US-01, US-03, RG-02)
  async getMenu(
    categorieId?: string,
    cible: string = 'CLIENT',
    user?: { id: string; role: string; restaurant?: { id: string } },
    restaurantId?: string,
  ): Promise<Article[]> {
    const scopedRestaurantId =
      user?.role === 'GERANT'
        ? user.restaurant?.id
        : restaurantId || user?.restaurant?.id;
    const cacheKey = `menu:${cible}:${categorieId || 'all'}:${scopedRestaurantId || 'global'}`;

    //  Lecture cache (désactivable en dev)
    if (process.env.NODE_ENV !== 'development') {
      const cached = await this.cacheManager.get<Article[]>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit: ${cacheKey}`);
        return cached;
      }
    }

    // Requête TypeORM optimisée
    const query = this.articleRepo
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.categorie', 'categorie')
      .leftJoinAndSelect('article.restaurant', 'restaurant')
      .where('categorie.actif = :actif', { actif: true });

    //  ISOLATION MULTI-TENANT (RG-31)
    if (scopedRestaurantId) {
      query.andWhere('article.restaurantId = :restId', {
        restId: scopedRestaurantId,
      });
    }

    //  RG-02: Masquer articles indisponibles (sauf cible=TOUS)
    if (cible !== 'TOUS') {
      query.andWhere('article.disponible = :dispo', { dispo: true });
    }

    //  Filtre catégorie
    if (categorieId) {
      query.andWhere('categorie.id = :cid', { cid: categorieId });
    }

    //  Filtre cible (RG-04)
    if (cible && cible !== 'TOUS') {
      query.andWhere('article.cible IN (:...cibles)', {
        cibles: [cible, CibleEnum.TOUS],
      });
    }

    const articles = await query
      .orderBy('categorie.nom', 'ASC')
      .addOrderBy('article.nom', 'ASC')
      .getMany();

    // Pour les clients : afficher le prix avec commission incluse
    if (cible === 'CLIENT') {
      articles.forEach((a: any) => {
        const taux = Math.min(5, Math.max(1, Number(a.restaurant?.tauxCommission ?? 2))) / 100;
        const prixHT = Number(a.promoActif && a.prixPromo ? a.prixPromo : a.prix);
        a.prixClient = Math.ceil(prixHT * (1 + taux));
      });
    }

    //  Mise en cache (5 min)
    if (process.env.NODE_ENV !== 'development') {
      await this.cacheManager.set(cacheKey, articles, 300000);
      this.logger.debug(`Cache set: ${cacheKey} (${articles.length} articles)`);
    }

    return articles;
  }

  //  GET /menu/categories — Liste catégories actives (US-01)
  async getCategories(restaurantId?: string): Promise<Categorie[]> {
    const where: any = { actif: true };
    if (restaurantId) {
      where.restaurant = { id: restaurantId };
    }

    return this.categorieRepo.find({
      where,
      order: { nom: 'ASC' },
      select: ['id', 'nom', 'description', 'icone', 'actif'],
      relations: ['restaurant'],
    });
  }

  // ➕ POST /menu/categories — Création (RBAC: GERANT/ADMIN)
  async createCategorie(
    dto: CreateCategorieDto,
    user?: { role: string; restaurant?: { id: string } },
  ): Promise<Categorie> {
    const restaurantId = user?.restaurant?.id || dto.restaurantId;

    if (user?.role === 'GERANT' && !restaurantId) {
      throw new BadRequestException('Gérant sans restaurant associé');
    }

    const categorie = this.categorieRepo.create({
      ...dto,
      restaurant: restaurantId ? { id: restaurantId } : undefined,
    });

    const saved = await this.categorieRepo.save(categorie);
    await this.invalidateMenuCache(restaurantId);

    this.logger.log(`Catégorie créée: ${saved.nom} (ID: ${saved.id})`);
    return saved;
  }

  //  GET /menu/search — Recherche par nom/ingrédient (US-02)
  async searchArticles(
    query: string,
    cible: string = 'CLIENT',
    user?: { id: string; role: string; restaurant?: { id: string } },
    restaurantId?: string,
  ): Promise<Article[]> {
    if (!query || query.trim().length < 2) return [];

    const term = `%${query.toLowerCase().trim()}%`;

    const qb = this.articleRepo
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.categorie', 'categorie')
      .leftJoinAndSelect('article.restaurant', 'restaurant')
      .where(
        'LOWER(article.nom) LIKE :term OR LOWER(article.description) LIKE :term',
        { term },
      )
      .andWhere('categorie.actif = true');

    const scopedRestaurantId =
      user?.role === 'GERANT'
        ? user.restaurant?.id
        : restaurantId || user?.restaurant?.id;
    if (scopedRestaurantId) {
      qb.andWhere('article.restaurantId = :restId', {
        restId: scopedRestaurantId,
      });
    }

    if (cible !== 'TOUS') {
      qb.andWhere('article.disponible = true');
    }

    qb.andWhere('article.cible IN (:...cibles)', {
      cibles: [cible, CibleEnum.TOUS],
    }).orderBy('article.nom', 'ASC');

    return qb.getMany();
  }

  // ➕ POST /menu/articles — Création article (RG-01, RG-05, RG-31)

  // src/menu/menu.service.ts — Méthode createArticle corrigée

  async createArticle(
    dto: CreateArticleDto,
    user: { id: string; role: string; restaurant?: { id: string } },
  ): Promise<Article> {
    // 1. Vérifier catégorie (RG-01)
    const restaurantId = user?.restaurant?.id || dto.restaurantId;

    if (!restaurantId) {
      throw new BadRequestException(
        'Impossible de créer un article : aucun restaurant associé à ce compte.',
      );
    }

    const categorie = await this.categorieRepo.findOne({
      where: { id: dto.categorieId, actif: true },
      relations: ['restaurant'],
    });
    if (!categorie) {
      throw new NotFoundException(`Catégorie "${dto.categorieId}" introuvable`);
    }

    if (categorie.restaurant?.id && categorie.restaurant.id !== restaurantId) {
      throw new BadRequestException(
        "La catégorie n'appartient pas au restaurant ciblé",
      );
    }

    // 2. Validation RG-05 (Prix > 0)
    if (dto.prix === undefined || dto.prix === null || dto.prix <= 0) {
      throw new BadRequestException('Le prix doit être supérieur à 0 (RG-05)');
    }

    // 3. Stock et disponibilité (RG-03)
    const stock = dto.stock ?? 0;
    // src/menu/menu.service.ts — Dans createArticle()
    const article = new Article();
    article.nom = dto.nom!; //  DTO @IsNotEmpty garantit la présence
    article.description = dto.description ?? null;
    article.prix = dto.prix;
    article.photoUrl = dto.photoUrl ?? null;
    article.disponible = stock > 0;
    article.stock = stock;
    article.cible = dto.cible ?? CibleEnum.CLIENT;
    article.allergenes = dto.allergenes ?? [];
    article.seuilMin = dto.seuilMin ?? 5;
    article.categorieId = dto.categorieId!; //  DTO @IsNotEmpty + @IsUUID
    article.restaurantId = restaurantId;
    // Sauvegarde explicite
    const saved = await this.articleRepo.save(article);

    // 7. Invalidation cache (RG-02: sync <30s)
    await this.invalidateMenuCache(restaurantId);

    this.logger.log(`Article créé: ${saved.nom} (Restaurant: ${restaurantId})`);
    return saved;
  }

  // src/menu/menu.service.ts — À ajouter après createArticle()
  async toggleDisponibilite(
    id: string,
    disponible: boolean,
    user?: any,
  ): Promise<{
    message: string;
    article: { id: string; nom: string; disponible: boolean };
  }> {
    const article = await this.articleRepo.findOne({
      where: { id },
      relations: ['restaurant'],
    });

    if (!article) {
      throw new NotFoundException(`Article "${id}" introuvable`);
    }

    // 🔐 RG-31 : Isolation multi-tenant
    if (
      user?.role === 'GERANT' &&
      user?.restaurant?.id &&
      article.restaurant?.id !== user.restaurant.id
    ) {
      throw new BadRequestException(
        'Accès refusé : cet article ne vous appartient pas',
      );
    }

    // Transaction: update article + write audit
    await this.articleRepo.manager.transaction(async (manager) => {
      await manager.update(Article, id, { disponible });

      // Write audit log (if AuditService available via repo)
      try {
        const auditRepo = manager.getRepository('audit_logs');
        await auditRepo.save({
          userId: user?.id || 'system',
          restaurantId: article.restaurant?.id,
          action: disponible ? 'ACTIVER_ARTICLE' : 'DESACTIVER_ARTICLE',
          payload: {
            articleId: id,
            before: { disponible: article.disponible },
            after: { disponible },
          },
        });
      } catch (err) {
        this.logger.warn(
          `Impossible d'écrire audit pendant transaction: ${err.message}`,
        );
        throw err;
      }
    });

    // Invalidate cache after successful transaction
    await this.invalidateMenuCache(article.restaurant?.id);

    this.logger.log(`Article ${id} ${disponible ? 'activé' : 'masqué'}`);
    return {
      message: `Article "${article.nom}" ${disponible ? 'activé' : 'masqué'}`,
      article: { id, nom: article.nom, disponible },
    };
  }
  // src/menu/menu.service.ts — Méthode updateArticle corrigée (extrait)

  async updateArticle(
    id: string,
    dto: UpdateArticleDto,
    user: { id: string; role: string; restaurant?: { id: string } },
  ): Promise<Article> {
    const article = await this.articleRepo.findOne({
      where: { id },
      relations: ['categorie', 'restaurant'],
    });

    if (!article) {
      throw new NotFoundException(`Article "${id}" introuvable`);
    }

    //  Isolation multi-tenant
    if (
      user.role === 'GERANT' &&
      user.restaurant?.id &&
      article.restaurant?.id !== user.restaurant.id
    ) {
      throw new BadRequestException(
        'Accès refusé : cet article ne vous appartient pas',
      );
    }

    // Si catégorie change, vérifier qu'elle existe
    if (dto.categorieId && dto.categorieId !== article.categorie?.id) {
      const categorie = await this.categorieRepo.findOne({
        where: { id: dto.categorieId, actif: true },
      });
      if (!categorie) {
        throw new NotFoundException(
          `Catégorie "${dto.categorieId}" introuvable`,
        );
      }
      article.categorie = categorie;
      article.categorieId = dto.categorieId;
    }

    // RG-03: Stock=0 → désactiver automatiquement
    if (dto.stock !== undefined && dto.stock === 0) {
      dto.disponible = false;
    }

    //  Mise à jour sécurisée des champs — avec vérification de type
    if (dto.nom !== undefined) article.nom = dto.nom;
    if (dto.description !== undefined) article.description = dto.description;
    if (dto.prix !== undefined) article.prix = dto.prix;
    if (dto.photoUrl !== undefined) article.photoUrl = dto.photoUrl;
    if (dto.disponible !== undefined) article.disponible = dto.disponible;
    if (dto.stock !== undefined) article.stock = dto.stock;

    // Champs ajoutés — avec vérification d'existence dans le DTO
    if ('cible' in dto && dto.cible !== undefined) article.cible = dto.cible;
    if ('seuilMin' in dto && dto.seuilMin !== undefined)
      article.seuilMin = dto.seuilMin;

    // allergenes: string[] attendu par l'entité
    if ('allergenes' in dto && dto.allergenes !== undefined) {
      article.allergenes = Array.isArray(dto.allergenes)
        ? dto.allergenes
        : [dto.allergenes];
    }

    // Champs menu du jour
    if ('activationDate' in dto && dto.activationDate !== undefined)
      article.activationDate = new Date(dto.activationDate);
    if ('expirationDate' in dto && dto.expirationDate !== undefined)
      article.expirationDate = new Date(dto.expirationDate);
    if ('estMenuDuJour' in dto && dto.estMenuDuJour !== undefined)
      article.estMenuDuJour = dto.estMenuDuJour;

    const updated = await this.articleRepo.save(article);
    await this.invalidateMenuCache(article.restaurant?.id);

    this.logger.log(`Article mis à jour: ${updated.nom} (ID: ${id})`);
    return updated;
  }

  // 🗑️ DELETE logique — Désactivation + stock 0 (RBAC: ADMIN)
  async softDeleteArticle(
    id: string,
    user?: { role: string; restaurant?: { id: string } },
  ): Promise<{ message: string }> {
    const article = await this.articleRepo.findOne({
      where: { id },
      relations: ['restaurant'],
    });

    if (!article) {
      throw new NotFoundException(`Article "${id}" introuvable`);
    }

    //  Isolation multi-tenant
    if (
      user?.role === 'GERANT' &&
      user?.restaurant?.id &&
      article.restaurant?.id !== user.restaurant.id
    ) {
      throw new BadRequestException(
        'Accès refusé : cet article ne vous appartient pas',
      );
    }

    await this.articleRepo.update(id, { disponible: false, stock: 0 });
    await this.invalidateMenuCache(article.restaurant?.id);

    this.logger.log(`Article supprimé (logique): ${id}`);
    return { message: `Article "${article.nom}" désactivé` };
  }

  //  GET /menu/restaurants — Liste des restaurants actifs (pour le client B2C)
  async getRestaurants(): Promise<Restaurant[]> {
    return this.restaurantRepo.find({
      where: { actif: true },
      select: ['id', 'nom', 'logo', 'adresse', 'telephone', 'noteMoyenne', 'nbAvis'],
      order: { nom: 'ASC' },
    });
  }

  //  GET /menu/restaurant/:id — Menu d'un restaurant spécifique (pour client B2C)
  async getMenuByRestaurant(
    restaurantId: string,
    categorieId?: string,
    cible: string = 'CLIENT',
  ): Promise<Article[]> {
    const restaurant = await this.restaurantRepo.findOne({
      where: { id: restaurantId, actif: true },
    });
    if (!restaurant) {
      throw new NotFoundException(
        `Restaurant "${restaurantId}" introuvable ou inactif`,
      );
    }

    return this.getMenu(categorieId, cible, undefined, restaurantId);
  }

  // CRON: Désactiver les articles dont la date d'expiration est passée
  @Cron(CronExpression.EVERY_MINUTE)
  async desactiverArticlesExpires(): Promise<void> {
    const now = new Date();
    await this.articleRepo
      .createQueryBuilder()
      .update()
      .set({ disponible: false, estMenuDuJour: false })
      .where(
        'expirationDate IS NOT NULL AND expirationDate < :now AND disponible = true',
        { now },
      )
      .execute();
  }

  // CRON: Activer les menus du jour dont la date d'activation est atteinte
  @Cron(CronExpression.EVERY_MINUTE)
  async activerMenusDuJour(): Promise<void> {
    const now = new Date();
    await this.articleRepo
      .createQueryBuilder()
      .update()
      .set({ disponible: true })
      .where(
        'activationDate IS NOT NULL AND activationDate <= :now AND expirationDate > :now AND disponible = false AND estMenuDuJour = true',
        { now },
      )
      .execute();
  }

  //  Méthode privée: Invalider le cache menu
  private async invalidateMenuCache(restaurantId?: string): Promise<void> {
    const baseKeys = [
      'menu:CLIENT:all',
      'menu:CLIENT:entrees',
      'menu:CLIENT:plats',
      'menu:CLIENT:boissons',
      'menu:CLIENT:desserts',
      'menu:B2B:all',
      'menu:B2B:entrees',
      'menu:B2B:plats',
      'menu:B2B:boissons',
      'menu:TOUS:all',
    ];

    const keysToDelete = restaurantId
      ? baseKeys.map((k) => `${k}:${restaurantId}`)
      : baseKeys.flatMap((k) => [k, `${k}:global`]);

    await Promise.all(
      keysToDelete.map((key) =>
        this.cacheManager.del(key).catch((err) => {
          this.logger.warn(`Erreur suppression cache ${key}: ${err.message}`);
        }),
      ),
    );
    this.logger.debug(
      `Cache menu invalidé${restaurantId ? ` pour restaurant ${restaurantId}` : ' global'}`,
    );
  }
}
