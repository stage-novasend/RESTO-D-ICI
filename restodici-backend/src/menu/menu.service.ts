import { Injectable, NotFoundException, Inject } from '@nestjs/common'; // ← Ajout de Inject
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './entities/article.entity';
import { Categorie } from './entities/categorie.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import type { Cache } from 'cache-manager'; // ← Import en tant que type
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Article) private articleRepo: Repository<Article>,
    @InjectRepository(Categorie) private categorieRepo: Repository<Categorie>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // GET /menu — avec cache Redis (TTL 5 min)
  async getMenu(categorieId?: string, cible: string = 'CLIENT') {
    const cacheKey = `menu:${cible}:${categorieId || 'all'}`;
    
    // 1. Essayer de récupérer depuis le cache
    const cached = await this.cacheManager.get<Article[]>(cacheKey);
    if (cached) return cached;

    // 2. Sinon, requête DB
    const query = this.articleRepo.createQueryBuilder('article')
      .leftJoinAndSelect('article.categorie', 'categorie')
      .where('article.disponible = :dispo', { dispo: true })
      .andWhere('categorie.actif = :actif', { actif: true });

    if (categorieId) {
      query.andWhere('article.categorieId = :cid', { cid: categorieId });
    }

    if (cible !== 'TOUS') {
      query.andWhere('article.cible IN (:cibles)', { cibles: [cible, 'TOUS'] });
    }

    const articles = await query.orderBy('categorie.nom', 'ASC').addOrderBy('article.nom', 'ASC').getMany();

    // 3. Mettre en cache pour 5 minutes (RG performance)
    await this.cacheManager.set(cacheKey, articles, 300000);

    return articles;
  }

  // GET /menu/categories — liste des catégories actives
  async getCategories() {
    return this.categorieRepo.find({ where: { actif: true }, order: { nom: 'ASC' } });
  }

  // POST /menu/articles — créer un article (gérant uniquement)
  async createArticle(dto: CreateArticleDto) {
    const categorie = await this.categorieRepo.findOne({ where: { id: dto.categorieId, actif: true } });
    if (!categorie) throw new NotFoundException('Catégorie introuvable ou inactive');

    const article = this.articleRepo.create({ ...dto, categorie });
    const saved = await this.articleRepo.save(article);

    // Invalider le cache du menu après création
    await this.cacheManager.del('menu:*');
    
    return saved;
  }

  // PATCH /menu/articles/:id/disponible — RG-09: toggle disponibilité en < 30s
  async toggleDisponibilite(id: string, disponible: boolean) {
    await this.articleRepo.update(id, { disponible });
    
    // Invalider le cache immédiatement pour synchronisation temps réel
    await this.cacheManager.del('menu:*');
    
    return { message: `Article ${disponible ? 'activé' : 'désactivé'}` };
  }

  // Recherche par nom ou ingrédient (US-02)
  async searchArticles(query: string, cible: string = 'CLIENT') {
    const terms = query.toLowerCase().split(' ');
    
    const articles = await this.articleRepo.createQueryBuilder('article')
      .leftJoinAndSelect('article.categorie', 'categorie')
      .where('article.disponible = :dispo', { dispo: true })
      .andWhere('(LOWER(article.nom) LIKE :q OR LOWER(article.description) LIKE :q)', { q: `%${query.toLowerCase()}%` })
      .orderBy('article.nom', 'ASC')
      .getMany();

    return articles.filter(a => 
      cible === 'TOUS' || a.cible === cible || a.cible === 'TOUS'
    );
  }
}