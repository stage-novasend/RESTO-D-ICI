import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { PaiementsService } from './paiements.service';
import { NovaSendService } from './novasend.service';
import { Commande, ModePaiementCommande } from '../commandes/entities/commande.entity';
import { FactureMensuelleB2B } from '../b2b/entities/facture-mensuelle-b2b.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { Payment } from './entities/payment.entity';
import { CommandesGateway } from '../commandes/commandes.gateway';
import { SmsService } from '../notifications/sms.service';
import { FcmService } from '../notifications/fcm.service';
import { RECEIPT_QUEUE } from '../receipt-queue/receipt-queue.constants';
import { PaymentGatewayRegistry } from './gateways/payment-gateway.registry';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockCommandeRepo = {
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockFactureRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
};

const mockPaymentRepo = {
  create: jest.fn((x) => x),
  save: jest.fn().mockResolvedValue({}),
  findOne: jest.fn().mockResolvedValue(null),
};

const mockReceiptQueue = {
  add: jest.fn().mockResolvedValue(undefined),
};

const mockCommandesGateway = {
  emitToKitchen: jest.fn(),
  emitToManagers: jest.fn(),
  emitToClient: jest.fn(),
};

const mockSmsService = {
  sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
};

const mockFcmService = {
  notifyNewOrder: jest.fn().mockResolvedValue(undefined),
};

const mockNovaSend = {
  initiate: jest.fn(),
  getProvider: jest.fn(),
};

const mockGatewayRegistry = {
  getGateway: jest.fn().mockResolvedValue({
    initiate: jest.fn(),
    verifyWebhook: jest.fn().mockReturnValue(true),
    handleWebhook: jest.fn().mockResolvedValue({ transactionId: 'txn-1', status: 'SUCCESS' }),
  }),
  getEnabledPaymentGateways: jest.fn().mockResolvedValue([]),
};

function makeCommande(overrides: Partial<Commande> = {}): Commande {
  return {
    id: 'cmd-uuid-1',
    numero: 'CMD-2026-TEST001',
    estPaye: false,
    montantTotal: 5000,
    client: { id: 'client-1', nom: 'Koné', telephone: '0707070707' } as any,
    restaurant: { id: 'resto-1' } as any,
    ...overrides,
  } as Commande;
}

function makeFacture(overrides: Partial<FactureMensuelleB2B> = {}): FactureMensuelleB2B {
  return {
    id: 'facture-uuid-1',
    statut: 'EN_ATTENTE',
    montantHT: 10000,
    tva: 1800,
    montantTTC: 11800,
    ...overrides,
  } as FactureMensuelleB2B;
}

async function buildModule(): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      PaiementsService,
      { provide: getRepositoryToken(Commande), useValue: mockCommandeRepo },
      { provide: getRepositoryToken(FactureMensuelleB2B), useValue: mockFactureRepo },
      {
        provide: getRepositoryToken(PaymentMethod),
        useValue: {
          find: jest.fn().mockResolvedValue([]),
          save: jest.fn(),
          create: jest.fn((x) => x),
        },
      },
      { provide: getRepositoryToken(Payment), useValue: mockPaymentRepo },
      { provide: getQueueToken(RECEIPT_QUEUE), useValue: mockReceiptQueue },
      { provide: CommandesGateway, useValue: mockCommandesGateway },
      { provide: SmsService, useValue: mockSmsService },
      { provide: FcmService, useValue: mockFcmService },
      { provide: NovaSendService, useValue: mockNovaSend },
      { provide: PaymentGatewayRegistry, useValue: mockGatewayRegistry },
    ],
  }).compile();
}

// ─── initiatePayment() ────────────────────────────────────────────────────────

describe('PaiementsService initiatePayment()', () => {
  let service: PaiementsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<PaiementsService>(PaiementsService);
  });

  it('retourne le résultat NovaSend quand la commande existe et n\'est pas payée', async () => {
    const commande = makeCommande();
    mockCommandeRepo.findOne.mockResolvedValue(commande);
    mockNovaSend.initiate.mockResolvedValue({
      sessionId: 'sim_abc12345',
      paymentUrl: 'http://localhost:5173/paiement/preview?ref=cmd-uuid-1',
      simulated: true,
    });

    const dto = {
      commandeId: 'cmd-uuid-1',
      montant: 5000,
      telephone: '0707070707',
      provider: 'WAVE' as const,
      customerName: 'Koné',
    };

    const result = await service.initiatePayment(dto);

    expect(mockCommandeRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'cmd-uuid-1' },
      relations: ['client'],
    });
    expect(mockNovaSend.initiate).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: 'cmd-uuid-1',
        amount: 5000,
        provider: 'WAVE',
      }),
    );
    expect(result).toHaveProperty('sessionId');
    expect(result).toHaveProperty('paymentUrl');
    // Trace transactionnelle Payment enregistrée (PENDING) à l'initiation
    expect(mockPaymentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: 'cmd-uuid-1',
        provider: 'WAVE',
        amount: 5000,
        status: 'PENDING',
      }),
    );
  });

  it('utilise le nom du client comme customerName quand non fourni dans le DTO', async () => {
    const commande = makeCommande({ client: { id: 'c-1', nom: 'Traoré' } as any });
    mockCommandeRepo.findOne.mockResolvedValue(commande);
    mockNovaSend.initiate.mockResolvedValue({ sessionId: 'sim_xyz', simulated: true });

    await service.initiatePayment({
      commandeId: 'cmd-uuid-1',
      montant: 3000,
      telephone: '0606060606',
      provider: 'ORANGE' as const,
    } as any);

    expect(mockNovaSend.initiate).toHaveBeenCalledWith(
      expect.objectContaining({ customerName: 'Traoré' }),
    );
  });

  it('lève NotFoundException quand la commande est introuvable', async () => {
    mockCommandeRepo.findOne.mockResolvedValue(null);

    await expect(
      service.initiatePayment({
        commandeId: 'unknown-id',
        montant: 5000,
        telephone: '0707070707',
        provider: 'WAVE' as const,
      } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('lève BadRequestException quand la commande est déjà payée', async () => {
    mockCommandeRepo.findOne.mockResolvedValue(makeCommande({ estPaye: true }));

    await expect(
      service.initiatePayment({
        commandeId: 'cmd-uuid-1',
        montant: 5000,
        telephone: '0707070707',
        provider: 'WAVE' as const,
      } as any),
    ).rejects.toThrow(BadRequestException);
  });
});

// ─── handleNovasendWebhook() — succès commande standard ───────────────────────

describe('PaiementsService handleNovasendWebhook() — succès commande', () => {
  let service: PaiementsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<PaiementsService>(PaiementsService);
  });

  it('marque la commande comme payée et notifie tous les rôles', async () => {
    const commande = makeCommande();
    mockCommandeRepo.findOne.mockResolvedValue(commande);
    mockCommandeRepo.update.mockResolvedValue(undefined);
    mockNovaSend.getProvider.mockReturnValue('WAVE');

    await service.handleNovasendWebhook({
      reference: 'cmd-uuid-1',
      status: 'SUCCESSFUL',
    });

    expect(mockCommandeRepo.update).toHaveBeenCalledWith(
      'cmd-uuid-1',
      expect.objectContaining({
        estPaye: true,
        modePaiement: ModePaiementCommande.WAVE,
      }),
    );

    expect(mockCommandesGateway.emitToKitchen).toHaveBeenCalledWith(
      'resto-1',
      'commande.paiement',
      expect.objectContaining({ id: 'cmd-uuid-1', estPaye: true }),
    );
    expect(mockCommandesGateway.emitToManagers).toHaveBeenCalledWith(
      'commande.paiement',
      expect.objectContaining({ id: 'cmd-uuid-1' }),
    );
    expect(mockCommandesGateway.emitToClient).toHaveBeenCalledWith(
      'client-1',
      'commande.paiement',
      expect.objectContaining({ id: 'cmd-uuid-1' }),
    );
  });

  it('utilise metadata.commandeId si présent pour résoudre la commande', async () => {
    const commande = makeCommande({ id: 'cmd-via-meta' });
    mockCommandeRepo.findOne.mockResolvedValue(commande);
    mockCommandeRepo.update.mockResolvedValue(undefined);
    mockNovaSend.getProvider.mockReturnValue(undefined);

    await service.handleNovasendWebhook({
      reference: 'session-ref',
      status: 'success',
      metadata: { commandeId: 'cmd-via-meta' },
    });

    expect(mockCommandeRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'cmd-via-meta' } }),
    );
  });

  it('envoie le SMS de confirmation au client', async () => {
    const commande = makeCommande();
    mockCommandeRepo.findOne.mockResolvedValue(commande);
    mockCommandeRepo.update.mockResolvedValue(undefined);
    mockNovaSend.getProvider.mockReturnValue('WAVE');

    await service.handleNovasendWebhook({
      reference: 'cmd-uuid-1',
      status: 'SUCCESSFUL',
    });

    expect(mockSmsService.sendOrderConfirmation).toHaveBeenCalledWith(
      '0707070707',
      'CMD-2026-TEST001',
      5000,
    );
  });

  it('enqueue le reçu PDF dans BullMQ après confirmation', async () => {
    const commande = makeCommande();
    mockCommandeRepo.findOne.mockResolvedValue(commande);
    mockCommandeRepo.update.mockResolvedValue(undefined);
    mockNovaSend.getProvider.mockReturnValue('WAVE');

    await service.handleNovasendWebhook({
      reference: 'cmd-uuid-1',
      status: 'SUCCESSFUL',
    });

    expect(mockReceiptQueue.add).toHaveBeenCalledWith(
      'send-receipt',
      { commandeId: 'cmd-uuid-1' },
      expect.objectContaining({ attempts: 5 }),
    );
  });

  it('ne fait rien si la commande est introuvable (success)', async () => {
    mockCommandeRepo.findOne.mockResolvedValue(null);

    await service.handleNovasendWebhook({
      reference: 'unknown-cmd',
      status: 'SUCCESSFUL',
    });

    expect(mockCommandeRepo.update).not.toHaveBeenCalled();
    expect(mockCommandesGateway.emitToManagers).not.toHaveBeenCalled();
  });

  it('ne fait rien si la commande est déjà payée', async () => {
    mockCommandeRepo.findOne.mockResolvedValue(makeCommande({ estPaye: true }));

    await service.handleNovasendWebhook({
      reference: 'cmd-uuid-1',
      status: 'SUCCESSFUL',
    });

    expect(mockCommandeRepo.update).not.toHaveBeenCalled();
  });

  it('ignore les statuts inconnus sans lever d\'erreur', async () => {
    await service.handleNovasendWebhook({
      reference: 'cmd-uuid-1',
      status: 'PENDING',
    });

    expect(mockCommandeRepo.findOne).not.toHaveBeenCalled();
    expect(mockCommandeRepo.update).not.toHaveBeenCalled();
  });
});

// ─── handleNovasendWebhook() — paiement échoué ────────────────────────────────

describe('PaiementsService handleNovasendWebhook() — paiement échoué', () => {
  let service: PaiementsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<PaiementsService>(PaiementsService);
  });

  it('émet commande.paiement.echec sur statut FAILED sans toucher à estPaye', async () => {
    const commande = makeCommande();
    mockCommandeRepo.findOne.mockResolvedValue(commande);

    await service.handleNovasendWebhook({
      reference: 'cmd-uuid-1',
      status: 'FAILED',
    });

    expect(mockCommandesGateway.emitToKitchen).toHaveBeenCalledWith(
      'resto-1',
      'commande.paiement.echec',
      expect.objectContaining({ id: 'cmd-uuid-1', reason: 'FAILED' }),
    );
    expect(mockCommandesGateway.emitToManagers).toHaveBeenCalledWith(
      'commande.paiement.echec',
      expect.objectContaining({ id: 'cmd-uuid-1' }),
    );
    expect(mockCommandeRepo.update).not.toHaveBeenCalled();
  });

  it('notifie aussi le client sur EXPIRED', async () => {
    const commande = makeCommande();
    mockCommandeRepo.findOne.mockResolvedValue(commande);

    await service.handleNovasendWebhook({
      reference: 'cmd-uuid-1',
      status: 'EXPIRED',
    });

    expect(mockCommandesGateway.emitToClient).toHaveBeenCalledWith(
      'client-1',
      'commande.paiement.echec',
      expect.objectContaining({ reason: 'EXPIRED' }),
    );
  });

  it('ne plante pas si la commande est introuvable sur un statut d\'échec', async () => {
    mockCommandeRepo.findOne.mockResolvedValue(null);

    await expect(
      service.handleNovasendWebhook({ reference: 'ghost-id', status: 'CANCELLED' }),
    ).resolves.toBeUndefined();
  });
});

// ─── handleNovasendWebhook() — facture B2B ────────────────────────────────────

describe('PaiementsService handleNovasendWebhook() — facture B2B', () => {
  let service: PaiementsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<PaiementsService>(PaiementsService);
  });

  it('marque la facture B2B comme PAYEE sur référence b2b-facture-*', async () => {
    const facture = makeFacture();
    mockFactureRepo.findOne.mockResolvedValue(facture);
    mockFactureRepo.save.mockImplementation(async (f) => f);

    await service.handleNovasendWebhook({
      reference: 'b2b-facture-facture-uuid-1',
      status: 'SUCCESSFUL',
    });

    expect(mockFactureRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ statut: 'PAYEE' }),
    );
    expect(mockCommandeRepo.update).not.toHaveBeenCalled();
  });

  it('marque la facture B2B comme PAYEE via metadata.factureId', async () => {
    const facture = makeFacture();
    mockFactureRepo.findOne.mockResolvedValue(facture);
    mockFactureRepo.save.mockImplementation(async (f) => f);

    await service.handleNovasendWebhook({
      reference: 'session-xyz',
      status: 'success',
      metadata: { factureId: 'facture-uuid-1' },
    });

    expect(mockFactureRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'facture-uuid-1' },
    });
    expect(mockFactureRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ statut: 'PAYEE' }),
    );
  });

  it('ne ré-enregistre pas une facture déjà PAYEE', async () => {
    mockFactureRepo.findOne.mockResolvedValue(makeFacture({ statut: 'PAYEE' }));

    await service.handleNovasendWebhook({
      reference: 'b2b-facture-facture-uuid-1',
      status: 'SUCCESSFUL',
    });

    expect(mockFactureRepo.save).not.toHaveBeenCalled();
  });

  it('ne plante pas si la facture B2B est introuvable', async () => {
    mockFactureRepo.findOne.mockResolvedValue(null);

    await expect(
      service.handleNovasendWebhook({
        reference: 'b2b-facture-ghost-id',
        status: 'SUCCESSFUL',
      }),
    ).resolves.toBeUndefined();
  });
});

// ─── handleCinetpayWebhook() ─────────────────────────────────────────────────

describe('PaiementsService handleCinetpayWebhook()', () => {
  let service: PaiementsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<PaiementsService>(PaiementsService);
  });

  it('délègue au webhook NovaSend avec statut SUCCESSFUL quand cpm_result=00', async () => {
    const commande = makeCommande();
    mockCommandeRepo.findOne.mockResolvedValue(commande);
    mockCommandeRepo.update.mockResolvedValue(undefined);
    mockNovaSend.getProvider.mockReturnValue(undefined);

    await service.handleCinetpayWebhook({
      cpm_trans_id: 'cmd-uuid-1',
      cpm_result: '00',
    });

    expect(mockCommandeRepo.update).toHaveBeenCalledWith(
      'cmd-uuid-1',
      expect.objectContaining({ estPaye: true }),
    );
  });

  it('ne fait rien si cpm_result !== 00', async () => {
    await service.handleCinetpayWebhook({
      cpm_trans_id: 'cmd-uuid-1',
      cpm_result: '01',
    });

    expect(mockCommandeRepo.findOne).not.toHaveBeenCalled();
    expect(mockCommandeRepo.update).not.toHaveBeenCalled();
  });
});

// ─── smoke test ───────────────────────────────────────────────────────────────

describe('PaiementsService bootstrap', () => {
  it('doit être défini', async () => {
    const module = await buildModule();
    const svc = module.get<PaiementsService>(PaiementsService);
    expect(svc).toBeDefined();
  });
});
