import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TresorerieService } from './tresorerie.service';
import { Commande } from '../commandes/entities/commande.entity';
import { CommissionPlateforme } from '../commandes/entities/commission-plateforme.entity';
import { DepenseOperationnelle } from './entities/depense-operationnelle.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';

const mockCommandeRepo = {
  find: jest.fn(),
};

const mockDepenseRepo = {
  find: jest.fn().mockResolvedValue([]),
  create: jest.fn((data) => data),
  save: jest.fn((data) => Promise.resolve({ id: 'depense-1', ...data })),
};

const mockRestaurantRepo = {
  findOne: jest.fn().mockResolvedValue(null),
  update: jest.fn(),
};

// ─── Builder ──────────────────────────────────────────────────────────────────

function seedCommandeData() {
  mockCommandeRepo.find.mockResolvedValue([
    {
      id: 'cmd-1',
      montantTotal: 100000,
      montantRemise: 10000,
      createdAt: new Date('2026-07-08T10:00:00.000Z'),
    },
  ]);
}

function buildModule() {
  return Test.createTestingModule({
    providers: [
      TresorerieService,
      {
        provide: getRepositoryToken(Commande),
        useValue: mockCommandeRepo,
      },
      {
        provide: getRepositoryToken(CommissionPlateforme),
        useValue: {
          find: jest.fn().mockResolvedValue([]),
        },
      },
      {
        provide: getRepositoryToken(DepenseOperationnelle),
        useValue: mockDepenseRepo,
      },
      {
        provide: getRepositoryToken(Restaurant),
        useValue: mockRestaurantRepo,
      },
    ],
  }).compile();
}

// ─── getRevenueStats() ────────────────────────────────────────────────────────

describe('TresorerieService getRevenueStats()', () => {
  let service: TresorerieService;

  beforeEach(async () => {
    jest.clearAllMocks();
    seedCommandeData();
    const module = await buildModule();
    service = module.get<TresorerieService>(TresorerieService);
  });

  it('returns caJour and nbCommandes for period=day', async () => {
    const result = await service.getRevenueStats('resto-uuid-1', 'day');

    expect(result).toHaveProperty('caJour');
    expect(result).toHaveProperty('nbCommandes');
    expect(result).toHaveProperty('ticketMoyen');
    expect(result).toHaveProperty('margesBrutes');
    expect(result.caJour).toBeGreaterThan(0);
    expect(result.caSemaine).toBe(0);
    expect(result.caMois).toBe(0);
  });

  it('returns caSemaine and nbCommandes for period=week', async () => {
    const result = await service.getRevenueStats('resto-uuid-1', 'week');

    expect(result.caSemaine).toBeGreaterThan(0);
    expect(result.caJour).toBe(0);
    expect(result.caMois).toBe(0);
    expect(result.nbCommandes).toBeGreaterThan(0);
  });

  it('returns caMois and nbCommandes for period=month', async () => {
    const result = await service.getRevenueStats('resto-uuid-1', 'month');

    expect(result.caMois).toBeGreaterThan(0);
    expect(result.caJour).toBe(0);
    expect(result.caSemaine).toBe(0);
    expect(result.nbCommandes).toBeGreaterThan(0);
  });

  it('returns default stats (day) when no period is specified', async () => {
    const result = await service.getRevenueStats('resto-uuid-1');

    expect(result).toHaveProperty('caJour');
    expect(result).toHaveProperty('nbCommandes');
    expect(result).toHaveProperty('ticketMoyen');
  });

  it('margesBrutes reflète le net réel conservé par le restaurant (montantNetRestaurant/montantTotal)', async () => {
    mockCommandeRepo.find.mockResolvedValue([
      {
        id: 'cmd-1',
        montantTotal: 100000,
        montantNetRestaurant: 85000, // 15% de commission plateforme sur cette commande
        createdAt: new Date('2026-07-08T10:00:00.000Z'),
      },
    ]);

    const result = await service.getRevenueStats('resto-uuid-1', 'day');

    expect(result.margesBrutes).toBe(85);
  });

  it('retombe sur 100% si montantNetRestaurant est absent (commande créée avant la fonctionnalité commission)', async () => {
    const result = await service.getRevenueStats('resto-uuid-1', 'day');

    expect(result.margesBrutes).toBe(100);
  });

  it('calcule la répartition réelle des paiements par mode', async () => {
    mockCommandeRepo.find.mockResolvedValue([
      {
        id: 'c1',
        montantTotal: 1000,
        modePaiement: 'ESPECES',
        createdAt: new Date(),
      },
      {
        id: 'c2',
        montantTotal: 2000,
        modePaiement: 'WAVE',
        createdAt: new Date(),
      },
      {
        id: 'c3',
        montantTotal: 500,
        modePaiement: 'ESPECES',
        createdAt: new Date(),
      },
    ]);

    const result = await service.getRevenueStats('resto-uuid-1', 'day');

    expect(result.repartitionPaiements).toEqual({ ESPECES: 1500, WAVE: 2000 });
  });
});

// ─── recordExpense() ──────────────────────────────────────────────────────────

describe('TresorerieService recordExpense()', () => {
  let service: TresorerieService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<TresorerieService>(TresorerieService);
  });

  it('persiste la dépense via le repository et renvoie la ligne enregistrée', async () => {
    const data = {
      categorie: 'matieres_premieres',
      montant: 50000,
      description: 'Achat viande',
    };

    const result = await service.recordExpense(data, 'resto-uuid-1');

    expect(mockDepenseRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: 'resto-uuid-1',
        categorie: 'matieres_premieres',
        montant: 50000,
        description: 'Achat viande',
      }),
    );
    expect(mockDepenseRepo.save).toHaveBeenCalled();
    expect(result).toMatchObject({
      restaurantId: 'resto-uuid-1',
      montant: 50000,
    });
  });

  it('records an expense for a different restaurantId', async () => {
    const data = { categorie: 'energie', montant: 20000 };

    const result = await service.recordExpense(data, 'resto-uuid-2');

    expect(result.restaurantId).toBe('resto-uuid-2');
  });

  it("utilise la date du jour si aucune date n'est fournie", async () => {
    const before = Date.now();
    const data = { categorie: 'autre', montant: 10000 };

    await service.recordExpense(data, 'resto-1');

    const savedArg = mockDepenseRepo.create.mock.calls[0][0];
    expect(savedArg.date.getTime()).toBeGreaterThanOrEqual(before);
  });
});

// ─── generateFinancialReport() ────────────────────────────────────────────────

describe('TresorerieService generateFinancialReport()', () => {
  let service: TresorerieService;

  beforeEach(async () => {
    jest.clearAllMocks();
    seedCommandeData();
    const module = await buildModule();
    service = module.get<TresorerieService>(TresorerieService);
  });

  it('returns a report with summary containing totalRevenue, totalExpenses, netProfit', async () => {
    const result = await service.generateFinancialReport(
      'resto-uuid-1',
      'monthly',
    );

    expect(result.period).toBe('monthly');
    expect(result.restaurantId).toBe('resto-uuid-1');
    expect(result.summary).toHaveProperty('totalRevenue');
    expect(result.summary).toHaveProperty('totalRemises');
    expect(result.summary).toHaveProperty('netProfit');
    expect(result.summary).toHaveProperty('profitMargin');
    expect(result.summary.totalRevenue).toBeGreaterThan(0);
  });

  it('returns quarterly report with generatedAt and restaurantId', async () => {
    const result = await service.generateFinancialReport(
      'resto-uuid-1',
      'quarterly',
    );

    expect(result.restaurantId).toBe('resto-uuid-1');
    expect(result.period).toBe('quarterly');
    expect(result.generatedAt).toBeInstanceOf(Date);
  });

  it('returns yearly report with correct period', async () => {
    const result = await service.generateFinancialReport(
      'resto-uuid-1',
      'yearly',
    );

    expect(result.period).toBe('yearly');
  });

  it('returns monthly report by default', async () => {
    const result = await service.generateFinancialReport('resto-uuid-1');

    expect(result.period).toBe('monthly');
  });
});

// ─── exportSyscohada() ────────────────────────────────────────────────────────

describe('TresorerieService exportSyscohada()', () => {
  let service: TresorerieService;

  beforeEach(async () => {
    jest.clearAllMocks();
    seedCommandeData();
    const module = await buildModule();
    service = module.get<TresorerieService>(TresorerieService);
  });

  it('returns a Buffer', async () => {
    const result = await service.exportSyscohada('resto-uuid-1', 'monthly');

    expect(result).toBeInstanceOf(Buffer);
  });

  it('CSV content contains SYSCOHADA header', async () => {
    const result = await service.exportSyscohada('resto-uuid-1', 'monthly');
    const csvText = result.toString('utf8');

    expect(csvText).toContain('SYSCOHADA Export');
    expect(csvText).toContain('MONTHLY');
  });

  it('CSV content contains required accounting accounts', async () => {
    const result = await service.exportSyscohada('resto-uuid-1', 'monthly');
    const csvText = result.toString('utf8');

    expect(csvText).toContain('701');
    expect(csvText).toContain('4457');
    expect(csvText).toContain('607');
  });

  it('CSV content contains the restaurantId', async () => {
    const result = await service.exportSyscohada('resto-uuid-1', 'monthly');
    const csvText = result.toString('utf8');

    expect(csvText).toContain('resto-uuid-1');
  });

  it('CSV content is properly formatted with double-quoted fields', async () => {
    const result = await service.exportSyscohada('resto-uuid-1', 'monthly');
    const csvText = result.toString('utf8');

    expect(csvText).toMatch(/"[^"]*"/);
  });

  it('returns a quarterly export with QUARTERLY label', async () => {
    const result = await service.exportSyscohada('resto-uuid-1', 'quarterly');
    const csvText = result.toString('utf8');

    expect(csvText).toContain('QUARTERLY');
  });
});

// ─── Bootstrap smoke test ─────────────────────────────────────────────────────

describe('TresorerieService bootstrap', () => {
  it('should be defined', async () => {
    const module = await buildModule();
    const svc = module.get<TresorerieService>(TresorerieService);
    expect(svc).toBeDefined();
  });
});
