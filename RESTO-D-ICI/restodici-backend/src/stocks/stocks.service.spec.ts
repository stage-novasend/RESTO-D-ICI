import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StocksService } from './stocks.service';
import { Article, CibleEnum } from '../menu/entities/article.entity';
import { FournisseursService } from '../fournisseurs/fournisseurs.service';
import { Restaurant } from '../restaurants/entities/restaurant.entity';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockArticleRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockFournisseursService = {
  findOneOrFail: jest.fn(),
};

// ─── QueryBuilder mock helper ─────────────────────────────────────────────────

function makeQueryBuilder(returnValue: any[]) {
  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(returnValue),
  };
  return qb;
}

// ─── Factories ────────────────────────────────────────────────────────────────

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: 'article-uuid-1',
    nom: 'Attiéké Poisson',
    description: 'Plat ivoirien',
    prix: 2500,
    prixPromo: null,
    promoActif: false,
    activationDate: undefined,
    expirationDate: undefined,
    estMenuDuJour: false,
    photoUrl: null,
    disponible: true,
    cible: CibleEnum.CLIENT,
    allergenes: [],
    variants: [],
    stock: 10,
    seuilMin: 5,
    categorieId: 'cat-uuid-1',
    restaurantId: 'resto-uuid-1',
    categorie: { id: 'cat-uuid-1', nom: 'Plats' } as any,
    restaurant: { id: 'resto-uuid-1', nom: 'Resto Test' } as Restaurant,
    lignesCommandes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Article;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

function buildModule() {
  return Test.createTestingModule({
    providers: [
      StocksService,
      { provide: getRepositoryToken(Article), useValue: mockArticleRepo },
      { provide: FournisseursService, useValue: mockFournisseursService },
    ],
  }).compile();
}

// ─── getAll() ─────────────────────────────────────────────────────────────────

describe('StocksService getAll()', () => {
  let service: StocksService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<StocksService>(StocksService);
  });

  it('returns mapped stock items for a restaurantId', async () => {
    const article = makeArticle();
    const qb = makeQueryBuilder([article]);
    mockArticleRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.getAll('resto-uuid-1');

    expect(qb.where).toHaveBeenCalledWith(
      'article.restaurantId = :restaurantId',
      { restaurantId: 'resto-uuid-1' },
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'article-uuid-1',
      nom: 'Attiéké Poisson',
      stock: 10,
      seuil: 5,
      disponible: true,
      categorie: 'Plats',
      restaurantId: 'resto-uuid-1',
    });
  });

  it('returns all stocks when no restaurantId is provided', async () => {
    const articles = [makeArticle(), makeArticle({ id: 'article-uuid-2', nom: 'Riz Sauce' })];
    const qb = makeQueryBuilder(articles);
    mockArticleRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.getAll();

    expect(qb.where).not.toHaveBeenCalled();
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no articles found', async () => {
    const qb = makeQueryBuilder([]);
    mockArticleRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.getAll('resto-uuid-1');

    expect(result).toEqual([]);
  });

  it('defaults stock to 0 when article.stock is null', async () => {
    const article = makeArticle({ stock: undefined as any });
    const qb = makeQueryBuilder([article]);
    mockArticleRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.getAll('resto-uuid-1');

    expect(result[0].stock).toBe(0);
  });

  it('defaults seuil to 5 when article.seuilMin is null', async () => {
    const article = makeArticle({ seuilMin: undefined as any });
    const qb = makeQueryBuilder([article]);
    mockArticleRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.getAll('resto-uuid-1');

    expect(result[0].seuil).toBe(5);
  });
});

// ─── adjustStock() ────────────────────────────────────────────────────────────

describe('StocksService adjustStock()', () => {
  let service: StocksService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<StocksService>(StocksService);
  });

  it('adjusts stock positively and returns updated values', async () => {
    const article = makeArticle({ stock: 10 });
    mockArticleRepo.findOne.mockResolvedValue(article);
    mockArticleRepo.update.mockResolvedValue(undefined);

    const result = await service.adjustStock('article-uuid-1', 5, 'resto-uuid-1', 'Réception');

    expect(mockArticleRepo.update).toHaveBeenCalledWith('article-uuid-1', {
      stock: 15,
      disponible: true,
    });
    expect(result.stock).toBe(15);
    expect(result.disponible).toBe(true);
    expect(result.motif).toBe('Réception');
  });

  it('adjusts stock negatively without going below 0', async () => {
    const article = makeArticle({ stock: 3 });
    mockArticleRepo.findOne.mockResolvedValue(article);
    mockArticleRepo.update.mockResolvedValue(undefined);

    const result = await service.adjustStock('article-uuid-1', -10, 'resto-uuid-1');

    expect(result.stock).toBe(0);
    expect(result.disponible).toBe(false);
  });

  it('throws NotFoundException when article does not exist', async () => {
    mockArticleRepo.findOne.mockResolvedValue(null);

    await expect(
      service.adjustStock('article-inexistant', 5, 'resto-uuid-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when quantity is not a finite number', async () => {
    await expect(
      service.adjustStock('article-uuid-1', NaN, 'resto-uuid-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws ForbiddenException when restaurantId does not match article restaurant', async () => {
    const article = makeArticle({ restaurant: { id: 'autre-resto' } as Restaurant });
    mockArticleRepo.findOne.mockResolvedValue(article);

    await expect(
      service.adjustStock('article-uuid-1', 5, 'resto-uuid-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('uses default motif when none is provided', async () => {
    const article = makeArticle({ stock: 5 });
    mockArticleRepo.findOne.mockResolvedValue(article);
    mockArticleRepo.update.mockResolvedValue(undefined);

    const result = await service.adjustStock('article-uuid-1', 3);

    expect(result.motif).toBe('Ajustement manuel');
  });

  it('sets disponible=false when resulting stock reaches 0', async () => {
    const article = makeArticle({ stock: 5 });
    mockArticleRepo.findOne.mockResolvedValue(article);
    mockArticleRepo.update.mockResolvedValue(undefined);

    const result = await service.adjustStock('article-uuid-1', -5);

    expect(result.stock).toBe(0);
    expect(result.disponible).toBe(false);
  });
});

// ─── getRapportEcarts() ───────────────────────────────────────────────────────

describe('StocksService getRapportEcarts()', () => {
  let service: StocksService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<StocksService>(StocksService);
  });

  it('returns a report with stockTheorique for each article', async () => {
    const article = makeArticle({ stock: 8 });
    const qb = makeQueryBuilder([article]);
    mockArticleRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.getRapportEcarts('resto-uuid-1');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'article-uuid-1',
      nom: 'Attiéké Poisson',
      stockTheorique: 8,
      seuil: 5,
      disponible: true,
      categorie: 'Plats',
    });
  });

  it('filters by restaurantId when provided', async () => {
    const qb = makeQueryBuilder([]);
    mockArticleRepo.createQueryBuilder.mockReturnValue(qb);

    await service.getRapportEcarts('resto-uuid-1');

    expect(qb.where).toHaveBeenCalledWith(
      'article.restaurantId = :restaurantId',
      { restaurantId: 'resto-uuid-1' },
    );
  });

  it('does not apply where clause when no restaurantId is provided', async () => {
    const qb = makeQueryBuilder([]);
    mockArticleRepo.createQueryBuilder.mockReturnValue(qb);

    await service.getRapportEcarts();

    expect(qb.where).not.toHaveBeenCalled();
  });

  it('defaults categorie to "Sans catégorie" when article has no categorie', async () => {
    const article = makeArticle({ categorie: null as any });
    const qb = makeQueryBuilder([article]);
    mockArticleRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.getRapportEcarts('resto-uuid-1');

    expect(result[0].categorie).toBe('Sans catégorie');
  });

  it('returns stockTheorique=0 when article.stock is null', async () => {
    const article = makeArticle({ stock: undefined as any });
    const qb = makeQueryBuilder([article]);
    mockArticleRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.getRapportEcarts('resto-uuid-1');

    expect(result[0].stockTheorique).toBe(0);
  });

  it('returns an empty array when no articles exist', async () => {
    const qb = makeQueryBuilder([]);
    mockArticleRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.getRapportEcarts('resto-uuid-1');

    expect(result).toEqual([]);
  });
});

// ─── Bootstrap smoke test ─────────────────────────────────────────────────────

describe('StocksService bootstrap', () => {
  it('should be defined', async () => {
    const module = await buildModule();
    const svc = module.get<StocksService>(StocksService);
    expect(svc).toBeDefined();
  });
});
