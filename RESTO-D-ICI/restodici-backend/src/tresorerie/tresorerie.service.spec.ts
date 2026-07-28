import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TresorerieService } from './tresorerie.service';
import { Commande } from '../commandes/entities/commande.entity';

const mockCommandeRepo = {
  find: jest.fn(),
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

  it('returns margesBrutes between 60 and 90', async () => {
    const result = await service.getRevenueStats('resto-uuid-1', 'day');

    expect(result.margesBrutes).toBeGreaterThanOrEqual(60);
    expect(result.margesBrutes).toBeLessThanOrEqual(90);
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

  it('records an expense and returns the saved object with restaurantId', async () => {
    const data = { montant: 50000, libelle: 'Achat matières premières' };

    const result = await service.recordExpense(data, 'resto-uuid-1');

    expect(result).toMatchObject({
      montant: 50000,
      libelle: 'Achat matières premières',
      restaurantId: 'resto-uuid-1',
      status: 'recorded',
    });
    expect(result.id).toMatch(/^expense_/);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('records an expense for a different restaurantId', async () => {
    const data = { montant: 20000, libelle: 'Électricité' };

    const result = await service.recordExpense(data, 'resto-uuid-2');

    expect(result.restaurantId).toBe('resto-uuid-2');
    expect(result.status).toBe('recorded');
  });

  it('generates an id prefixed with "expense_"', async () => {
    const data = { montant: 10000, libelle: 'Test' };

    const result = await service.recordExpense(data, 'resto-1');

    expect(result.id).toMatch(/^expense_\d+$/);
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
    const result = await service.generateFinancialReport('resto-uuid-1', 'monthly');

    expect(result.period).toBe('monthly');
    expect(result.restaurantId).toBe('resto-uuid-1');
    expect(result.summary).toHaveProperty('totalRevenue');
    expect(result.summary).toHaveProperty('totalRemises');
    expect(result.summary).toHaveProperty('netProfit');
    expect(result.summary).toHaveProperty('profitMargin');
    expect(result.summary.totalRevenue).toBeGreaterThan(0);
  });

  it('returns quarterly report with generatedAt and restaurantId', async () => {
    const result = await service.generateFinancialReport('resto-uuid-1', 'quarterly');

    expect(result.restaurantId).toBe('resto-uuid-1');
    expect(result.period).toBe('quarterly');
    expect(result.generatedAt).toBeInstanceOf(Date);
  });

  it('returns yearly report with correct period', async () => {
    const result = await service.generateFinancialReport('resto-uuid-1', 'yearly');

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

// ─── recordOrderPayment() ─────────────────────────────────────────────────────

describe('TresorerieService recordOrderPayment()', () => {
  let service: TresorerieService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<TresorerieService>(TresorerieService);
  });

  it('records a payment and returns type ORDER_PAYMENT', async () => {
    const paymentData = {
      commandeId: 'cmd-uuid-1',
      numeroCommande: 'CMD-2026-001',
      montantTotal: 5000,
      montantRemis: 5000,
      modePaiement: 'WAVE',
      restaurantId: 'resto-uuid-1',
    };

    const result = await service.recordOrderPayment(paymentData);

    expect(result.type).toBe('ORDER_PAYMENT');
    expect(result.status).toBe('synced');
    expect(result.id).toMatch(/^tx_/);
    expect(result.syncedAt).toBeInstanceOf(Date);
    expect(result.commandeId).toBe('cmd-uuid-1');
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
