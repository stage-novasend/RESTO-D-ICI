import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandesService } from './commandes.service';
import { Commande, StatutCommande } from './entities/commande.entity';
import { LigneCommande } from './entities/ligne-commande.entity';
import { AvisCommande } from './entities/avis-commande.entity';
import { CommandeStatusHistory } from './entities/commande-status-history.entity';
import { CommissionPlateforme } from './entities/commission-plateforme.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { CommandesGateway } from './commandes.gateway';
import { TresorerieService } from '../tresorerie/tresorerie.service';
import { PromosService } from '../promos/promos.service';
import { SmsService } from '../notifications/sms.service';
import { FcmService } from '../notifications/fcm.service';
import { NotificationsService } from '../notifications/notifications.service';

// ─── Shared mock objects ──────────────────────────────────────────────────────

const mockCommandeRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};

const mockLigneRepo = { save: jest.fn(), create: jest.fn() };
const mockAvisRepo = { save: jest.fn(), create: jest.fn() };
const mockHistoryRepo = {
  save: jest.fn(),
  create: jest.fn((v: any) => v),
};
const mockRestaurantRepo = { findOne: jest.fn() };
const mockDataSource = { transaction: jest.fn() };
const mockCommandesGateway = {
  emitToManagers: jest.fn(),
  emitToKitchen: jest.fn(),
  emitToClient: jest.fn(),
};
const mockTresorerieService = {};
const mockPromosService = {};
const mockSmsService = {};
const mockFcmService = {};
const mockNotificationsService = { create: jest.fn().mockResolvedValue({ id: 'notif-1' }) };

function buildModule() {
  return Test.createTestingModule({
    providers: [
      CommandesService,
      { provide: getRepositoryToken(Commande), useValue: mockCommandeRepo },
      { provide: getRepositoryToken(LigneCommande), useValue: mockLigneRepo },
      { provide: getRepositoryToken(AvisCommande), useValue: mockAvisRepo },
      {
        provide: getRepositoryToken(CommandeStatusHistory),
        useValue: mockHistoryRepo,
      },
      {
        provide: getRepositoryToken(Restaurant),
        useValue: mockRestaurantRepo,
      },
      {
        provide: getRepositoryToken(CommissionPlateforme),
        useValue: { save: jest.fn(), create: jest.fn() },
      },
      { provide: DataSource, useValue: mockDataSource },
      { provide: CommandesGateway, useValue: mockCommandesGateway },
      { provide: TresorerieService, useValue: mockTresorerieService },
      { provide: PromosService, useValue: mockPromosService },
      { provide: SmsService, useValue: mockSmsService },
      { provide: FcmService, useValue: mockFcmService },
      { provide: NotificationsService, useValue: mockNotificationsService },
    ],
  }).compile();
}

function makeCommande(overrides: Partial<Commande> = {}): Commande {
  return {
    id: 'cmd-uuid-1',
    numero: 'CMD-2026-ABCDE001',
    statut: StatutCommande.RECUE,
    modeLivraison: undefined as any,
    adresseLivraison: undefined as any,
    montantTotal: 5000,
    rembourse: false,
    rembourseLe: undefined,
    motifRemboursement: undefined,
    restaurant: { id: 'resto-1' } as Restaurant,
    client: { id: 'client-1' } as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Commande;
}

// ─── getKDS ───────────────────────────────────────────────────────────────────

describe('CommandesService getKDS', () => {
  let service: CommandesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<CommandesService>(CommandesService);
  });

  it('returns KDS orders with a sanitized client profile', async () => {
    mockCommandeRepo.find.mockResolvedValue([
      {
        id: 'cmd-1',
        statut: StatutCommande.RECUE,
        client: {
          id: 'client-1',
          nom: 'Doe',
          prenom: 'Jane',
          telephone: '01020304',
          email: 'jane@example.com',
          password: 'secret',
          role: 'CLIENT',
          actif: true,
        },
      },
    ]);

    const result = await service.getKDS('resto-1');

    expect(mockCommandeRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: ['lignes', 'lignes.article', 'client'],
        order: { createdAt: 'ASC' },
        where: expect.objectContaining({
          restaurant: { id: 'resto-1' },
        }),
      }),
    );

    expect(result[0].client).toEqual({
      id: 'client-1',
      nom: 'Doe',
      prenom: 'Jane',
      telephone: '01020304',
      email: 'jane@example.com',
    });
    expect((result[0].client as any).password).toBeUndefined();
  });
});

// ─── rembourser() ─────────────────────────────────────────────────────────────

describe('CommandesService rembourser()', () => {
  let service: CommandesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<CommandesService>(CommandesService);
  });

  it('throws NotFoundException when commande is not found', async () => {
    mockCommandeRepo.findOne.mockResolvedValue(null);

    await expect(service.rembourser('unknown-id', 'motif')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws BadRequestException when commande is already rembourse', async () => {
    mockCommandeRepo.findOne.mockResolvedValue(
      makeCommande({ rembourse: true }),
    );

    await expect(
      service.rembourser('cmd-uuid-1', 'double remboursement'),
    ).rejects.toThrow(BadRequestException);
  });

  it('sets rembourse=true, statut=ANNULEE, rembourseLe, saves and emits event', async () => {
    const commande = makeCommande({ rembourse: false, payeAt: new Date() });
    mockCommandeRepo.findOne.mockResolvedValue(commande);
    mockCommandeRepo.save.mockImplementation((c: Commande) =>
      Promise.resolve(c),
    );

    const result = await service.rembourser('cmd-uuid-1', 'test motif');

    expect(commande.rembourse).toBe(true);
    expect(commande.statut).toBe(StatutCommande.ANNULEE);
    expect(commande.rembourseLe).toBeInstanceOf(Date);
    expect(commande.motifRemboursement).toBe('test motif');
    expect(mockCommandeRepo.save).toHaveBeenCalledWith(commande);
    expect(mockCommandesGateway.emitToManagers).toHaveBeenCalledWith(
      'commande:remboursee',
      expect.objectContaining({ commandeId: 'cmd-uuid-1' }),
    );
    expect(result).toBe(commande);
  });
});

// ─── updateStatut() ───────────────────────────────────────────────────────────

describe('CommandesService updateStatut()', () => {
  let service: CommandesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<CommandesService>(CommandesService);
  });

  it('throws NotFoundException when commande is not found', async () => {
    mockCommandeRepo.findOne.mockResolvedValue(null);

    await expect(
      service.updateStatut('unknown-id', StatutCommande.CONFIRMEE, 'resto-1', {
        id: 'actor-1',
        role: 'GERANT',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
