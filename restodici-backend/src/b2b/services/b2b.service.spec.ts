import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { B2BService } from './b2b.service';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { BulkOrder } from '../entities/bulk-order.entity';
import { Invoice } from '../entities/invoice.entity';
import { User } from '../../auth/entities/user.entity';
import { CompteB2B } from '../entities/compte-b2b.entity';
import { CollaborateurB2B } from '../entities/collaborateur-b2b.entity';
import { CommandeGroupeeB2B } from '../entities/commande-groupee-b2b.entity';
import { LigneCommandeGroupeeB2B } from '../entities/ligne-commande-groupee-b2b.entity';
import { AuditLogB2B } from '../entities/audit-log-b2b.entity';
import { FactureMensuelleB2B } from '../entities/facture-mensuelle-b2b.entity';
import { PlanRepasB2B } from '../entities/plan-repas-b2b.entity';
import { Article } from '../../menu/entities/article.entity';
import { CommandesGateway } from '../../commandes/commandes.gateway';
import { EmailService } from '../../email/email.service';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../../notifications/notifications.service';
import { B2bAuditService } from './b2b-audit.service';
import { B2bFacturationService } from './b2b-facturation.service';
import { SystemConfig } from '../../common/entities/system-config.entity';

// ─── Shared mock objects ──────────────────────────────────────────────────────

const teamRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
};

const teamMemberRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
};

const bulkOrderRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const invoiceRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
};

const userRepository = {
  findOne: jest.fn(),
};

const compteB2BRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  count: jest.fn().mockResolvedValue(0),
};

const collaborateurRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const commandeGroupeeRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const ligneCommandeRepository = {
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const auditRepository = {
  create: jest.fn((v) => v),
  save: jest.fn().mockResolvedValue(undefined),
};

const factureRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn().mockResolvedValue(0),
  createQueryBuilder: jest.fn(),
};

const articleRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
};

const planRepasRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const commandesGateway = {
  emitToManagers: jest.fn(),
  emitToKitchen: jest.fn(),
};

const emailService = {
  sendB2BOrderConfirmation: jest.fn().mockResolvedValue(undefined),
  sendCollaborateurInvitation: jest.fn().mockResolvedValue(undefined),
  sendFactureMensuelleEmail: jest.fn().mockResolvedValue(undefined),
  sendMail: jest.fn().mockResolvedValue(undefined),
};

const configService = {
  get: jest.fn().mockReturnValue('http://localhost:5173'),
};

async function buildModule(): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      B2BService,
      { provide: getRepositoryToken(Team), useValue: teamRepository },
      { provide: getRepositoryToken(TeamMember), useValue: teamMemberRepository },
      { provide: getRepositoryToken(BulkOrder), useValue: bulkOrderRepository },
      { provide: getRepositoryToken(Invoice), useValue: invoiceRepository },
      { provide: getRepositoryToken(User), useValue: userRepository },
      { provide: getRepositoryToken(CompteB2B), useValue: compteB2BRepository },
      { provide: getRepositoryToken(CollaborateurB2B), useValue: collaborateurRepository },
      { provide: getRepositoryToken(CommandeGroupeeB2B), useValue: commandeGroupeeRepository },
      { provide: getRepositoryToken(LigneCommandeGroupeeB2B), useValue: ligneCommandeRepository },
      { provide: getRepositoryToken(AuditLogB2B), useValue: auditRepository },
      { provide: getRepositoryToken(FactureMensuelleB2B), useValue: factureRepository },
      { provide: getRepositoryToken(PlanRepasB2B), useValue: planRepasRepository },
      { provide: getRepositoryToken(Article), useValue: articleRepository },
      { provide: getRepositoryToken(SystemConfig), useValue: { findOne: jest.fn(), find: jest.fn() } },
      { provide: CommandesGateway, useValue: commandesGateway },
      { provide: EmailService, useValue: emailService },
      { provide: ConfigService, useValue: configService },
      {
        provide: NotificationsService,
        useValue: { create: jest.fn().mockResolvedValue({}) },
      },
      {
        provide: B2bAuditService,
        useValue: {
          logAudit: jest.fn().mockResolvedValue(undefined),
          getAuditLogs: jest.fn().mockResolvedValue([]),
        },
      },
      {
        provide: B2bFacturationService,
        useValue: {
          getFacturesMensuelles: jest.fn().mockResolvedValue([]),
          getOverdueInvoiceCount: jest.fn().mockResolvedValue(0),
          getPendingInvoiceEcheance: jest.fn().mockResolvedValue(null),
          ensureNoBlockedInvoices: jest.fn().mockResolvedValue(undefined),
        },
      },
    ],
  }).compile();
}

// ─── createBulkOrder() — événements temps réel ───────────────────────────────

describe('B2BService realtime events', () => {
  let service: B2BService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<B2BService>(B2BService);
  });

  it('emits commande.nouvelle when a B2B order is created', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'b2b-1', role: 'B2B' });
    bulkOrderRepository.create.mockImplementation((payload) => payload);
    bulkOrderRepository.save.mockResolvedValue({
      id: 'bulk-12345678-aaaa-bbbb-cccc-ddddeeeeffff',
      status: 'PENDING',
      total: 12000,
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
    });

    await service.createBulkOrder('b2b-1', {
      items: [{ articleId: 'art-1', quantity: 2, unitPrice: 6000 }],
      deliveryAddress: 'Plateau',
    } as any);

    expect(commandesGateway.emitToManagers).toHaveBeenCalledWith(
      'commande.nouvelle',
      expect.objectContaining({
        id: 'bulk-12345678-aaaa-bbbb-cccc-ddddeeeeffff',
        statut: 'PENDING',
        source: 'B2B',
      }),
    );
  });

  it('emits commande.statut when a B2B order status is updated', async () => {
    bulkOrderRepository.findOne.mockResolvedValue({
      id: 'bulk-22223333-aaaa-bbbb-cccc-ddddeeeeffff',
      status: 'PENDING',
      total: 8000,
      updatedAt: new Date('2026-01-01T11:00:00.000Z'),
    });
    bulkOrderRepository.save.mockImplementation(async (order) => ({
      ...order,
      updatedAt: new Date('2026-01-01T11:05:00.000Z'),
    }));

    await service.updateBulkOrderStatus(
      'bulk-22223333-aaaa-bbbb-cccc-ddddeeeeffff',
      'b2b-1',
      { status: 'CONFIRMED' },
    );

    expect(commandesGateway.emitToManagers).toHaveBeenCalledWith(
      'commande.statut',
      expect.objectContaining({
        id: 'bulk-22223333-aaaa-bbbb-cccc-ddddeeeeffff',
        statut: 'CONFIRMED',
        source: 'B2B',
      }),
    );
  });
});

// ─── createBulkOrder() — cas d'erreur ────────────────────────────────────────

describe('B2BService createBulkOrder() — validations', () => {
  let service: B2BService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<B2BService>(B2BService);
  });

  it('lève ForbiddenException si l\'utilisateur n\'a pas le rôle B2B', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'client-1', role: 'CLIENT' });

    await expect(
      service.createBulkOrder('client-1', {
        items: [{ articleId: 'art-1', quantity: 1, unitPrice: 2000 }],
        deliveryAddress: 'Cocody',
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lève ForbiddenException si l\'utilisateur est introuvable', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createBulkOrder('ghost-id', {
        items: [{ articleId: 'art-1', quantity: 1, unitPrice: 2000 }],
        deliveryAddress: 'Cocody',
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('calcule le total depuis les items si non fourni dans le DTO', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'b2b-1', role: 'B2B' });
    bulkOrderRepository.create.mockImplementation((payload) => payload);
    const saved = {
      id: 'bulk-calc-total',
      status: 'PENDING',
      total: 9000,
      createdAt: new Date(),
    };
    bulkOrderRepository.save.mockResolvedValue(saved);

    const result = await service.createBulkOrder('b2b-1', {
      items: [
        { articleId: 'art-1', quantity: 3, unitPrice: 3000 },
      ],
      deliveryAddress: 'Marcory',
    } as any);

    expect(bulkOrderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PENDING' }),
    );
    expect(result).toMatchObject({ id: 'bulk-calc-total' });
  });
});

// ─── updateBulkOrderStatus() — transitions invalides ─────────────────────────

describe('B2BService updateBulkOrderStatus() — validations', () => {
  let service: B2BService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<B2BService>(B2BService);
  });

  it('lève NotFoundException si la commande est introuvable', async () => {
    bulkOrderRepository.findOne.mockResolvedValue(null);

    await expect(
      service.updateBulkOrderStatus('unknown-id', 'b2b-1', { status: 'CONFIRMED' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('lève BadRequestException pour une transition invalide (DELIVERED → PENDING)', async () => {
    bulkOrderRepository.findOne.mockResolvedValue({
      id: 'bulk-1',
      status: 'DELIVERED',
      total: 5000,
    });

    await expect(
      service.updateBulkOrderStatus('bulk-1', 'b2b-1', { status: 'PENDING' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('lève BadRequestException si status est absent du DTO', async () => {
    bulkOrderRepository.findOne.mockResolvedValue({
      id: 'bulk-1',
      status: 'PENDING',
      total: 5000,
    });

    await expect(
      service.updateBulkOrderStatus('bulk-1', 'b2b-1', {} as any),
    ).rejects.toThrow(BadRequestException);
  });
});
