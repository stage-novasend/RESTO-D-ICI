// src/stocks/stocks.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../menu/entities/article.entity';
import { FournisseursService } from '../fournisseurs/fournisseurs.service';

@Injectable()
export class StocksService {
  constructor(
    @InjectRepository(Article) private articleRepo: Repository<Article>,
    private readonly fournisseursService: FournisseursService,
  ) {}

  // GET /stocks — Inventaire complet
  async getAll(restaurantId?: string) {
    const query = this.articleRepo
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.categorie', 'categorie')
      .leftJoinAndSelect('article.restaurant', 'restaurant');

    if (restaurantId) {
      query.where('article.restaurantId = :restaurantId', { restaurantId });
    }

    const articles = await query.orderBy('article.nom', 'ASC').getMany();

    return articles.map((article) => ({
      id: article.id,
      nom: article.nom,
      stock: article.stock || 0,
      seuil: article.seuilMin ?? 5,
      disponible: article.disponible,
      categorie: article.categorie?.nom,
      restaurantId: article.restaurantId,
      restaurantNom: article.restaurant?.nom,
    }));
  }

  // GET /stocks/alerts — Articles en rupture ou sous seuil
  async getAlerts(restaurantId?: string) {
    const query = this.articleRepo
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.categorie', 'categorie')
      .where('article.disponible = true')
      .andWhere(
        '(article.stock IS NULL OR article.stock <= COALESCE(article.seuilMin, 5))',
      );

    if (restaurantId) {
      query.andWhere('article.restaurantId = :restaurantId', { restaurantId });
    }

    const alerts = await query.orderBy('article.stock', 'ASC').getMany();

    return alerts.map((article) => ({
      id: article.id,
      nom: article.nom,
      stock: article.stock || 0,
      seuil: article.seuilMin ?? 5,
      categorie: article.categorie?.nom,
    }));
  }

  // GET /stocks/rapport-ecarts — Stock théorique par article (pour saisie inventaire physique)
  async getRapportEcarts(restaurantId?: string) {
    const query = this.articleRepo
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.categorie', 'categorie')
      .orderBy('article.nom', 'ASC');

    if (restaurantId) {
      query.where('article.restaurantId = :restaurantId', { restaurantId });
    }

    const articles = await query.getMany();
    return articles.map((a) => ({
      id: a.id,
      nom: a.nom,
      categorie: a.categorie?.nom || 'Sans catégorie',
      stockTheorique: a.stock || 0,
      seuil: a.seuilMin ?? 5,
      disponible: a.disponible,
    }));
  }

  // PATCH /stocks/:id/adjust — Ajustement manuel du stock
  async adjustStock(
    id: string,
    quantity: number,
    restaurantId?: string,
    motif?: string,
  ) {
    if (!Number.isFinite(Number(quantity))) {
      throw new BadRequestException('quantity doit être un nombre');
    }

    const article = await this.articleRepo.findOne({
      where: { id },
      relations: ['restaurant'],
    });

    if (!article) {
      throw new NotFoundException('Article introuvable');
    }

    if (restaurantId && article.restaurant?.id !== restaurantId) {
      throw new ForbiddenException("Accès refusé à l'article");
    }

    const newStock = Math.max(0, (article.stock || 0) + Number(quantity));
    const disponible = newStock > 0;
    await this.articleRepo.update(id, { stock: newStock, disponible });

    return {
      id,
      nom: article.nom,
      stock: newStock,
      disponible,
      motif: motif || 'Ajustement manuel',
    };
  }

  // POST /stocks/:id/entree — Réception marchandise (RG-24: fournisseurId obligatoire)
  async entreeStock(
    articleId: string,
    quantity: number,
    fournisseurId: string,
    restaurantId?: string,
    motif?: string,
  ) {
    if (!fournisseurId) {
      throw new BadRequestException(
        'fournisseurId obligatoire pour une entrée de stock (RG-24)',
      );
    }
    if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
      throw new BadRequestException('La quantité doit être un entier positif');
    }

    // Valide que le fournisseur est référencé et actif (RG-24)
    const fournisseur =
      await this.fournisseursService.findOneOrFail(fournisseurId);

    const article = await this.articleRepo.findOne({
      where: { id: articleId },
      relations: ['restaurant'],
    });
    if (!article) throw new NotFoundException('Article introuvable');
    if (restaurantId && article.restaurant?.id !== restaurantId) {
      throw new ForbiddenException("Accès refusé à l'article");
    }

    const newStock = (article.stock || 0) + Number(quantity);
    await this.articleRepo.update(articleId, {
      stock: newStock,
      disponible: true,
    });

    return {
      id: articleId,
      nom: article.nom,
      stock: newStock,
      disponible: true,
      fournisseur: { id: fournisseur.id, nom: fournisseur.nom },
      quantiteRecue: Number(quantity),
      motif: motif || `Réception — ${fournisseur.nom}`,
    };
  }
}
