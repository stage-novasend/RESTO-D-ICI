import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MenuService } from './menu.service';
import { Article, CibleEnum } from './entities/article.entity';
import { Categorie } from './entities/categorie.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockArticleRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
  manager: {
    transaction: jest.fn(),
  },
};

const mockCategorieRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};

const mockRestaurantRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
};

const mockCacheManager = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
};

// ─── Factories ────────────────────────────────────────────────────────────────

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: 'article-uuid-1',
    nom: 'Attiéké Poisson',
    description: 'Plat traditionnel ivoirien',
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
    categorie: makeCategorie(),
    restaurant: { id: 'resto-uuid-1', nom: 'Resto Test' } as Restaurant,
    lignesCommandes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Article;
}

function makeCategorie(overrides: Partial<Categorie> = {}): Categorie {
  return {
    id: 'cat-uuid-1',
    nom: 'Plats',
    description: 'Plats principaux',
    icone: '🍽️',
    actif: true,
    restaurant: { id: 'resto-uuid-1' } as Restaurant,
    articles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Categorie;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

function buildModule() {
  return Test.createTestingModule({
    providers: [
      MenuService,
      { provide: getRepositoryToken(Article), useValue: mockArticleRepo },
      { provide: getRepositoryToken(Categorie), useValue: mockCategorieRepo },
      { provide: getRepositoryToken(Restaurant), useValue: mockRestaurantRepo },
      { provide: CACHE_MANAGER, useValue: mockCacheManager },
    ],
  }).compile();
}

// ─── getCategories() ──────────────────────────────────────────────────────────

describe('MenuService getCategories()', () => {
  let service: MenuService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<MenuService>(MenuService);
  });

  it('returns active categories for a given restaurantId', async () => {
    const cat = makeCategorie();
    mockCategorieRepo.find.mockResolvedValue([cat]);

    const result = await service.getCategories('resto-uuid-1');

    expect(mockCategorieRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { actif: true, restaurant: { id: 'resto-uuid-1' } },
        order: { nom: 'ASC' },
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].nom).toBe('Plats');
  });

  it('returns all active categories when no restaurantId is provided', async () => {
    mockCategorieRepo.find.mockResolvedValue([makeCategorie()]);

    await service.getCategories();

    expect(mockCategorieRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { actif: true },
      }),
    );
  });

  it('returns an empty array when no categories exist', async () => {
    mockCategorieRepo.find.mockResolvedValue([]);

    const result = await service.getCategories('resto-uuid-1');

    expect(result).toEqual([]);
  });
});

// ─── createArticle() ──────────────────────────────────────────────────────────

describe('MenuService createArticle()', () => {
  let service: MenuService;

  const gerantUser = {
    id: 'user-uuid-1',
    role: 'GERANT',
    restaurant: { id: 'resto-uuid-1' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<MenuService>(MenuService);
  });

  it('creates and returns an article with valid data', async () => {
    const categorie = makeCategorie();
    const article = makeArticle();

    mockCategorieRepo.findOne.mockResolvedValue(categorie);
    mockArticleRepo.save.mockResolvedValue(article);

    const dto = {
      nom: 'Attiéké Poisson',
      prix: 2500,
      categorieId: 'cat-uuid-1',
      stock: 10,
    };

    const result = await service.createArticle(dto as any, gerantUser);

    expect(mockCategorieRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cat-uuid-1', actif: true },
      }),
    );
    expect(mockArticleRepo.save).toHaveBeenCalled();
    expect(result.nom).toBe('Attiéké Poisson');
  });

  it('throws BadRequestException when no restaurantId is available', async () => {
    const userWithoutResto = { id: 'user-uuid-1', role: 'GERANT' };

    await expect(
      service.createArticle(
        { nom: 'Test', prix: 1000, categorieId: 'cat-1' } as any,
        userWithoutResto as any,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when categorie is not found', async () => {
    mockCategorieRepo.findOne.mockResolvedValue(null);

    await expect(
      service.createArticle(
        { nom: 'Test', prix: 1000, categorieId: 'cat-inexistant' } as any,
        gerantUser,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when prix is 0', async () => {
    const categorie = makeCategorie();
    mockCategorieRepo.findOne.mockResolvedValue(categorie);

    await expect(
      service.createArticle(
        { nom: 'Test', prix: 0, categorieId: 'cat-uuid-1' } as any,
        gerantUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when prix is negative', async () => {
    const categorie = makeCategorie();
    mockCategorieRepo.findOne.mockResolvedValue(categorie);

    await expect(
      service.createArticle(
        { nom: 'Test', prix: -500, categorieId: 'cat-uuid-1' } as any,
        gerantUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when categorie belongs to another restaurant', async () => {
    const categorieAutreResto = makeCategorie({
      restaurant: { id: 'autre-resto-id' } as Restaurant,
    });
    mockCategorieRepo.findOne.mockResolvedValue(categorieAutreResto);

    await expect(
      service.createArticle(
        { nom: 'Test', prix: 1000, categorieId: 'cat-uuid-1' } as any,
        gerantUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('sets disponible=true when stock > 0', async () => {
    const categorie = makeCategorie();
    mockCategorieRepo.findOne.mockResolvedValue(categorie);
    mockArticleRepo.save.mockImplementation((a: Article) =>
      Promise.resolve({ ...a, id: 'new-uuid' }),
    );

    await service.createArticle(
      { nom: 'Test', prix: 1000, categorieId: 'cat-uuid-1', stock: 5 } as any,
      gerantUser,
    );

    const savedArticle = mockArticleRepo.save.mock.calls[0][0] as Article;
    expect(savedArticle.disponible).toBe(true);
    expect(savedArticle.stock).toBe(5);
  });

  it('sets disponible=false when stock is 0', async () => {
    const categorie = makeCategorie();
    mockCategorieRepo.findOne.mockResolvedValue(categorie);
    mockArticleRepo.save.mockImplementation((a: Article) =>
      Promise.resolve({ ...a, id: 'new-uuid' }),
    );

    await service.createArticle(
      { nom: 'Test', prix: 1000, categorieId: 'cat-uuid-1', stock: 0 } as any,
      gerantUser,
    );

    const savedArticle = mockArticleRepo.save.mock.calls[0][0] as Article;
    expect(savedArticle.disponible).toBe(false);
  });
});

// ─── updateArticle() ──────────────────────────────────────────────────────────

describe('MenuService updateArticle()', () => {
  let service: MenuService;

  const gerantUser = {
    id: 'user-uuid-1',
    role: 'GERANT',
    restaurant: { id: 'resto-uuid-1' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<MenuService>(MenuService);
  });

  it('updates and returns the modified article', async () => {
    const article = makeArticle();
    const updated = makeArticle({ nom: 'Nouveau Nom', prix: 3000 });

    mockArticleRepo.findOne.mockResolvedValue(article);
    mockArticleRepo.save.mockResolvedValue(updated);

    const result = await service.updateArticle(
      'article-uuid-1',
      { nom: 'Nouveau Nom', prix: 3000 } as any,
      gerantUser,
    );

    expect(mockArticleRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'article-uuid-1' } }),
    );
    expect(mockArticleRepo.save).toHaveBeenCalled();
    expect(result.nom).toBe('Nouveau Nom');
  });

  it('throws NotFoundException when article does not exist', async () => {
    mockArticleRepo.findOne.mockResolvedValue(null);

    await expect(
      service.updateArticle(
        'article-inexistant',
        { nom: 'Test' } as any,
        gerantUser,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when GERANT tries to update article from another restaurant', async () => {
    const articleAutreResto = makeArticle({
      restaurant: { id: 'autre-resto' } as Restaurant,
    });
    mockArticleRepo.findOne.mockResolvedValue(articleAutreResto);

    await expect(
      service.updateArticle(
        'article-uuid-1',
        { nom: 'Test' } as any,
        gerantUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('forces disponible=false when stock is set to 0', async () => {
    const article = makeArticle({ disponible: true, stock: 10 });
    mockArticleRepo.findOne.mockResolvedValue(article);
    mockArticleRepo.save.mockImplementation((a: Article) =>
      Promise.resolve(a),
    );

    await service.updateArticle(
      'article-uuid-1',
      { stock: 0 } as any,
      gerantUser,
    );

    expect(article.disponible).toBe(false);
    expect(article.stock).toBe(0);
  });

  it('validates new categorie when categorieId changes', async () => {
    const article = makeArticle();
    const newCategorie = makeCategorie({ id: 'cat-uuid-2', nom: 'Boissons' });

    mockArticleRepo.findOne.mockResolvedValue(article);
    mockCategorieRepo.findOne.mockResolvedValue(newCategorie);
    mockArticleRepo.save.mockResolvedValue({
      ...article,
      categorie: newCategorie,
    });

    await service.updateArticle(
      'article-uuid-1',
      { categorieId: 'cat-uuid-2' } as any,
      gerantUser,
    );

    expect(mockCategorieRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cat-uuid-2', actif: true },
      }),
    );
  });

  it('throws NotFoundException when new categorie does not exist', async () => {
    const article = makeArticle();
    mockArticleRepo.findOne.mockResolvedValue(article);
    mockCategorieRepo.findOne.mockResolvedValue(null);

    await expect(
      service.updateArticle(
        'article-uuid-1',
        { categorieId: 'cat-inexistante' } as any,
        gerantUser,
      ),
    ).rejects.toThrow(NotFoundException);
  });
});

// ─── softDeleteArticle() ──────────────────────────────────────────────────────

describe('MenuService softDeleteArticle()', () => {
  let service: MenuService;

  const gerantUser = {
    role: 'GERANT',
    restaurant: { id: 'resto-uuid-1' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<MenuService>(MenuService);
  });

  it('disables article and returns a confirmation message', async () => {
    const article = makeArticle();
    mockArticleRepo.findOne.mockResolvedValue(article);
    mockArticleRepo.update.mockResolvedValue(undefined);

    const result = await service.softDeleteArticle('article-uuid-1', gerantUser);

    expect(mockArticleRepo.update).toHaveBeenCalledWith('article-uuid-1', {
      disponible: false,
      stock: 0,
    });
    expect(result.message).toContain('Attiéké Poisson');
  });

  it('throws NotFoundException when article does not exist', async () => {
    mockArticleRepo.findOne.mockResolvedValue(null);

    await expect(
      service.softDeleteArticle('article-inexistant', gerantUser),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when GERANT tries to delete article from another restaurant', async () => {
    const articleAutreResto = makeArticle({
      restaurant: { id: 'autre-resto' } as Restaurant,
    });
    mockArticleRepo.findOne.mockResolvedValue(articleAutreResto);

    await expect(
      service.softDeleteArticle('article-uuid-1', gerantUser),
    ).rejects.toThrow(BadRequestException);
  });
});

// ─── toggleDisponibilite() ────────────────────────────────────────────────────

describe('MenuService toggleDisponibilite()', () => {
  let service: MenuService;

  const gerantUser = {
    id: 'user-uuid-1',
    role: 'GERANT',
    restaurant: { id: 'resto-uuid-1' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<MenuService>(MenuService);
  });

  it('toggles disponible to true and returns correct structure', async () => {
    const article = makeArticle({ disponible: false });
    mockArticleRepo.findOne.mockResolvedValue(article);
    mockArticleRepo.manager.transaction.mockImplementation(
      async (cb: (manager: any) => Promise<void>) => {
        const fakeManager = {
          update: jest.fn().mockResolvedValue(undefined),
          getRepository: jest.fn().mockReturnValue({
            save: jest.fn().mockResolvedValue(undefined),
          }),
        };
        return cb(fakeManager);
      },
    );

    const result = await service.toggleDisponibilite(
      'article-uuid-1',
      true,
      gerantUser,
    );

    expect(result.article.disponible).toBe(true);
    expect(result.article.id).toBe('article-uuid-1');
    expect(result.message).toContain('activé');
  });

  it('toggles disponible to false and message says masqué', async () => {
    const article = makeArticle({ disponible: true });
    mockArticleRepo.findOne.mockResolvedValue(article);
    mockArticleRepo.manager.transaction.mockImplementation(
      async (cb: (manager: any) => Promise<void>) => {
        const fakeManager = {
          update: jest.fn().mockResolvedValue(undefined),
          getRepository: jest.fn().mockReturnValue({
            save: jest.fn().mockResolvedValue(undefined),
          }),
        };
        return cb(fakeManager);
      },
    );

    const result = await service.toggleDisponibilite(
      'article-uuid-1',
      false,
      gerantUser,
    );

    expect(result.article.disponible).toBe(false);
    expect(result.message).toContain('masqué');
  });

  it('throws NotFoundException when article does not exist', async () => {
    mockArticleRepo.findOne.mockResolvedValue(null);

    await expect(
      service.toggleDisponibilite('article-inexistant', true, gerantUser),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when GERANT accesses article from another restaurant', async () => {
    const articleAutreResto = makeArticle({
      restaurant: { id: 'autre-resto' } as Restaurant,
    });
    mockArticleRepo.findOne.mockResolvedValue(articleAutreResto);

    await expect(
      service.toggleDisponibilite('article-uuid-1', true, gerantUser),
    ).rejects.toThrow(BadRequestException);
  });
});

// ─── Bootstrap smoke test ─────────────────────────────────────────────────────

describe('MenuService bootstrap', () => {
  it('should be defined', async () => {
    const module = await buildModule();
    const svc = module.get<MenuService>(MenuService);
    expect(svc).toBeDefined();
  });
});
