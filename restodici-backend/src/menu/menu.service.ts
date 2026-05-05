// src/menu/menu.service.ts
import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './entities/article.entity';
import { Categorie } from './entities/categorie.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(
    @InjectRepository(Article) private articleRepo: Repository<Article>,
    @InjectRepository(Categorie) private categorieRepo: Repository<Categorie>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  //  GET /menu — Affichage client avec filtres (US-01, US-03, RG-02)
  async getMenu(categorieId?: string, cible: string = 'CLIENT'): Promise<Article[]> {
    const cacheKey = `menu:${cible}:${categorieId || 'all'}`;

    //  Tentative lecture cache (désactivable en dev via env)
    if (process.env.NODE_ENV !== 'development') {
      const cached = await this.cacheManager.get<Article[]>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit: ${cacheKey}`);
        return cached;
      }
    }

    // 🗄️ Requête TypeORM optimisée
    const query = this.articleRepo.createQueryBuilder('article')
      .leftJoinAndSelect('article.categorie', 'categorie')
      .andWhere('categorie.actif = :actif', { actif: true });

    //  RG-02 : Masquer les articles indisponibles SAUF pour cible=TOUS (admin/gerant)
    if (cible !== 'TOUS') {
      query.andWhere('article.disponible = :dispo', { dispo: true });
    }

    // Filtre catégorie
    if (categorieId) {
      query.andWhere('categorie.id = :cid', { cid: categorieId });
    }

    // Filtre cible (RG-04: CLIENT/B2B/TOUS)
    if (cible && cible !== 'TOUS') {
      query.andWhere('article.cible IN (:cibles)', { cibles: [cible, 'TOUS'] });
    }

    const articles = await query
      .orderBy('categorie.nom', 'ASC')
      .addOrderBy('article.nom', 'ASC')
      .getMany();

    //  Mise en cache (5 min — RG Performance)
    if (process.env.NODE_ENV !== 'development') {
      await this.cacheManager.set(cacheKey, articles, 300000);
      this.logger.debug(`Cache set: ${cacheKey} (${articles.length} articles)`);
    }

    return articles;
  }

  //  GET /menu/categories — Liste catégories actives (US-01)
  async getCategories(): Promise<Categorie[]> {
    return this.categorieRepo.find({
      where: { actif: true },
      order: { nom: 'ASC' },
      select: ['id', 'nom', 'description', 'icone', 'actif'],
    });
  }

  //  POST /menu/categories — Création (RBAC: GERANT/ADMIN)
  async createCategorie(dto: CreateCategorieDto): Promise<Categorie> {
    const categorie = this.categorieRepo.create(dto);
    const saved = await this.categorieRepo.save(categorie);

    //  Invalidation cache pour synchro < 30s (RG-02)
    await this.invalidateMenuCache();

    this.logger.log(`Catégorie créée: ${saved.nom} (ID: ${saved.id})`);
    return saved;
  }

  //  GET /menu/search — Recherche par nom/ingrédient (US-02)
  async searchArticles(query: string, cible: string = 'CLIENT'): Promise<Article[]> {
    if (!query || query.trim().length < 2) return [];

    const term = `%${query.toLowerCase().trim()}%`;

    return this.articleRepo.createQueryBuilder('article')
      .leftJoinAndSelect('article.categorie', 'categorie')
      .where('LOWER(article.nom) LIKE :term OR LOWER(article.description) LIKE :term', { term })
      .andWhere('categorie.actif = true')
      //  Appliquer filtre disponible seulement si ce n'est pas une vue admin
      .andWhere(cible !== 'TOUS' ? 'article.disponible = true' : '1=1')
      .andWhere('article.cible IN (:cibles)', { cibles: [cible, 'TOUS'] })
      .orderBy('article.nom', 'ASC')
      .getMany();
  }

  //  POST /menu/articles — Création article (RG-01, RG-03, RG-05)
  async createArticle(dto: CreateArticleDto): Promise<Article> {
    // 1. Vérifier catégorie
    const categorie = await this.categorieRepo.findOne({
      where: { id: dto.categorieId, actif: true },
      select: ['id', 'nom', 'actif'],
    });
    if (!categorie) {
      throw new NotFoundException(`Catégorie "${dto.categorieId}" introuvable`);
    }

    // 2. RG-03: Stock=0 → disponible=false automatiquement
    const isDisponible = dto.stock !== undefined && dto.stock !== null ? dto.stock > 0 : true;

    // 3. Création entité
    const article = this.articleRepo.create({
      ...dto,
      categorie,
      disponible: isDisponible,
      stock: dto.stock ?? 0,
    });

    const saved = await this.articleRepo.save(article);

    // 4.  Invalidation cache (RG-02: synchro < 30s)
    await this.invalidateMenuCache();

    this.logger.log(`Article créé: ${saved.nom} (ID: ${saved.id})`);
    return saved;
  }

  //  PATCH /menu/articles/:id/disponible — Toggle 1 clic (US-09, RG-02)
  async toggleDisponibilite(id: string, disponible: boolean): Promise<{
    message: string;
    article: { id: string; nom: string; disponible: boolean };
  }> {
    const article = await this.articleRepo.findOne({ where: { id } });
    if (!article) {
      throw new NotFoundException(`Article "${id}" introuvable`);
    }

    await this.articleRepo.update(id, { disponible });

    //  Invalidation cache immédiate (RG-02)
    await this.invalidateMenuCache();

    this.logger.log(`Article ${id} ${disponible ? 'activé' : 'masqué'}`);
    return {
      message: `Article "${article.nom}" ${disponible ? 'activé' : 'masqué'}`,
      article: { id, nom: article.nom, disponible },
    };
  }

  // PUT /menu/articles/:id — Mise à jour complète (RBAC)
  async updateArticle(id: string, dto: UpdateArticleDto): Promise<Article> {
    const article = await this.articleRepo.findOne({ where: { id } });
    if (!article) {
      throw new NotFoundException(`Article "${id}" introuvable`);
    }

    // Si catégorie change, vérifier qu'elle existe
    if (dto.categorieId && dto.categorieId !== article.categorie?.id) {
      const categorie = await this.categorieRepo.findOne({
        where: { id: dto.categorieId, actif: true },
      });
      if (!categorie) {
        throw new NotFoundException(`Catégorie "${dto.categorieId}" introuvable`);
      }
      article.categorie = categorie;
    }

    // RG-03: Stock=0 → désactiver automatiquement
    if (dto.stock !== undefined && dto.stock === 0) {
      dto.disponible = false;
    }

    Object.assign(article, dto);
    const updated = await this.articleRepo.save(article);

    await this.invalidateMenuCache();
    this.logger.log(`Article mis à jour: ${updated.nom} (ID: ${id})`);
    return updated;
  }

  // DELETE logique — Désactivation + stock 0 (RBAC: ADMIN)
  async softDeleteArticle(id: string): Promise<{ message: string }> {
    const article = await this.articleRepo.findOne({ where: { id } });
    if (!article) {
      throw new NotFoundException(`Article "${id}" introuvable`);
    }

    await this.articleRepo.update(id, { disponible: false, stock: 0 });
    await this.invalidateMenuCache();

    this.logger.log(`Article supprimé (logique): ${id}`);
    return { message: `Article "${article.nom}" désactivé` };
  }

  // 🔐 Méthode privée: Invalider TOUTES les clés cache "menu:*"
  private async invalidateMenuCache(): Promise<void> {
    const cacheKeys = [
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

    await Promise.all(
      cacheKeys.map(key =>
        this.cacheManager.del(key).catch(err => {
          this.logger.warn(`Erreur suppression cache ${key}: ${err.message}`);
        })
      )
    );
    this.logger.debug('Cache menu invalidé');
  }
}