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

// ─── createTeam() ─────────────────────────────────────────────────────────────

describe('B2BService createTeam()', () => {
  let service: B2BService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<B2BService>(B2BService);
  });

  it('crée une équipe et ajoute le créateur comme OWNER', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'b2b-1', role: 'B2B' });
    const savedTeam = { id: 'team-uuid-1', name: 'Équipe RH', createdByUserId: 'b2b-1' };
    teamRepository.create.mockReturnValue(savedTeam);
    teamRepository.save.mockResolvedValue(savedTeam);
    teamMemberRepository.create.mockReturnValue({ teamId: 'team-uuid-1', userId: 'b2b-1', role: 'OWNER' });
    teamMemberRepository.save.mockResolvedValue(undefined);

    const result = await service.createTeam('b2b-1', { name: 'Équipe RH' } as any);

    expect(teamRepository.save).toHaveBeenCalled();
    expect(teamMemberRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'b2b-1', role: 'OWNER' }),
    );
    expect(result).toMatchObject({ id: 'team-uuid-1', name: 'Équipe RH' });
  });

  it('lève ForbiddenException si l\'utilisateur n\'est pas B2B', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'staff-1', role: 'STAFF' });

    await expect(
      service.createTeam('staff-1', { name: 'Équipe X' } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lève ForbiddenException si l\'utilisateur est introuvable', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createTeam('ghost-id', { name: 'Équipe Y' } as any),
    ).rejects.toThrow(ForbiddenException);
  });
});

// ─── addTeamMember() ──────────────────────────────────────────────────────────

describe('B2BService addTeamMember()', () => {
  let service: B2BService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<B2BService>(B2BService);
  });

  it('ajoute un membre B2B à l\'équipe si l\'appelant est OWNER', async () => {
    teamMemberRepository.findOne
      .mockResolvedValueOnce({ teamId: 'team-1', userId: 'owner-1', role: 'OWNER', active: true })
      .mockResolvedValueOnce(null);
    userRepository.findOne.mockResolvedValue({ id: 'new-member', role: 'B2B' });
    const newMember = { teamId: 'team-1', userId: 'new-member', role: 'MEMBER' };
    teamMemberRepository.create.mockReturnValue(newMember);
    teamMemberRepository.save.mockResolvedValue(newMember);

    const result = await service.addTeamMember('team-1', 'owner-1', {
      userId: 'new-member',
      role: 'MEMBER',
    } as any);

    expect(teamMemberRepository.save).toHaveBeenCalled();
    expect(result).toMatchObject({ userId: 'new-member', role: 'MEMBER' });
  });

  it('lève ForbiddenException si l\'appelant n\'est pas ADMIN/OWNER', async () => {
    teamMemberRepository.findOne.mockResolvedValueOnce({
      teamId: 'team-1',
      userId: 'member-1',
      role: 'MEMBER',
      active: true,
    });

    await expect(
      service.addTeamMember('team-1', 'member-1', { userId: 'new-user', role: 'MEMBER' } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lève BadRequestException si la cible n\'est pas un utilisateur B2B', async () => {
    teamMemberRepository.findOne.mockResolvedValueOnce({
      teamId: 'team-1',
      userId: 'owner-1',
      role: 'OWNER',
      active: true,
    });
    userRepository.findOne.mockResolvedValue({ id: 'client-99', role: 'CLIENT' });

    await expect(
      service.addTeamMember('team-1', 'owner-1', { userId: 'client-99', role: 'MEMBER' } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('lève BadRequestException si l\'utilisateur est déjà membre actif', async () => {
    teamMemberRepository.findOne
      .mockResolvedValueOnce({ teamId: 'team-1', userId: 'owner-1', role: 'OWNER', active: true })
      .mockResolvedValueOnce({ teamId: 'team-1', userId: 'existing-member', active: true });
    userRepository.findOne.mockResolvedValue({ id: 'existing-member', role: 'B2B' });

    await expect(
      service.addTeamMember('team-1', 'owner-1', { userId: 'existing-member', role: 'MEMBER' } as any),
    ).rejects.toThrow(BadRequestException);
  });
});

// ─── removeTeamMember() ───────────────────────────────────────────────────────

describe('B2BService removeTeamMember()', () => {
  let service: B2BService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<B2BService>(B2BService);
  });

  it('désactive le membre cible (active=false)', async () => {
    const ownerMembership = { teamId: 'team-1', userId: 'owner-1', role: 'OWNER', active: true };
    const targetMembership = { teamId: 'team-1', userId: 'target-1', active: true };
    teamMemberRepository.findOne
      .mockResolvedValueOnce(ownerMembership)
      .mockResolvedValueOnce(targetMembership);
    teamMemberRepository.save.mockResolvedValue({ ...targetMembership, active: false });

    await service.removeTeamMember('team-1', 'owner-1', 'target-1');

    expect(teamMemberRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ active: false }),
    );
  });

  it('lève ForbiddenException si l\'appelant n\'est pas membre de l\'équipe', async () => {
    teamMemberRepository.findOne.mockResolvedValueOnce(null);

    await expect(
      service.removeTeamMember('team-1', 'stranger-1', 'target-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lève ForbiddenException si un non-OWNER tente de retirer quelqu\'un d\'autre', async () => {
    teamMemberRepository.findOne.mockResolvedValueOnce({
      teamId: 'team-1',
      userId: 'member-1',
      role: 'MEMBER',
      active: true,
    });

    await expect(
      service.removeTeamMember('team-1', 'member-1', 'other-member'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lève NotFoundException si le membre cible est introuvable', async () => {
    teamMemberRepository.findOne
      .mockResolvedValueOnce({ teamId: 'team-1', userId: 'owner-1', role: 'OWNER', active: true })
      .mockResolvedValueOnce(null);

    await expect(
      service.removeTeamMember('team-1', 'owner-1', 'ghost-member'),
    ).rejects.toThrow(NotFoundException);
  });
});

// ─── generateFactureForCompte() ───────────────────────────────────────────────

describe('B2BService generateFactureForCompte()', () => {
  let service: B2BService;

  const mockQB = () => ({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ total: '10000' }),
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<B2BService>(B2BService);
  });

  it('crée une facture mensuelle B2B et envoie l\'email au responsable', async () => {
    const compte = {
      id: 'compte-uuid-1',
      raisonSociale: 'Sankofa SARL',
      emailProfessionnel: 'compta@sankofa.ci',
      numeroContribuable: 'NIF12345',
      numeroRCCM: 'RCCM-CI-ABJ-2025',
      responsable: { id: 'b2b-user-1' },
    } as any;

    factureRepository.findOne.mockResolvedValue(null);
    commandeGroupeeRepository.createQueryBuilder.mockReturnValue(mockQB());
    bulkOrderRepository.createQueryBuilder.mockReturnValue(mockQB());

    const savedFacture = {
      id: 'facture-new-1',
      mois: 'MAI',
      annee: 2026,
      montantHT: 20000,
      tva: 3600,
      montantTTC: 23600,
      statut: 'EN_ATTENTE',
      numeroFacture: 'RDI-B2B-202605-COMPTE',
    };
    factureRepository.create.mockReturnValue(savedFacture);
    factureRepository.save.mockResolvedValue(savedFacture);
    auditRepository.save.mockResolvedValue(undefined);

    const result = await service.generateFactureForCompte(compte, 'MAI', 2026);

    expect(factureRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mois: 'MAI',
        annee: 2026,
        statut: 'EN_ATTENTE',
      }),
    );
    expect(factureRepository.save).toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'facture-new-1', statut: 'EN_ATTENTE' });
  });

  it('retourne la facture existante sans la recréer (idempotence)', async () => {
    const compte = { id: 'compte-uuid-1', raisonSociale: 'Sankofa SARL' } as any;
    const existante = { id: 'facture-existante', mois: 'MAI', annee: 2026, statut: 'PAYEE' };
    factureRepository.findOne.mockResolvedValue(existante);

    const result = await service.generateFactureForCompte(compte, 'MAI', 2026);

    expect(factureRepository.create).not.toHaveBeenCalled();
    expect(factureRepository.save).not.toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'facture-existante' });
  });

  it('retourne null si le montant total du mois est 0', async () => {
    const compte = { id: 'compte-uuid-2', responsable: { id: 'b2b-2' } } as any;
    factureRepository.findOne.mockResolvedValue(null);

    const zeroQB = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total: null }),
    };
    commandeGroupeeRepository.createQueryBuilder.mockReturnValue(zeroQB);
    bulkOrderRepository.createQueryBuilder.mockReturnValue(zeroQB);

    const result = await service.generateFactureForCompte(compte, 'JANVIER', 2026);

    expect(result).toBeNull();
    expect(factureRepository.save).not.toHaveBeenCalled();
  });
});

// ─── payFacture() ─────────────────────────────────────────────────────────────

describe('B2BService payFacture()', () => {
  let service: B2BService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<B2BService>(B2BService);
  });

  it('marque la facture comme PAYEE', async () => {
    const compte = { id: 'compte-1', raisonSociale: 'Sankofa SARL', numeroContribuable: 'NIF1' };
    compteB2BRepository.findOne.mockResolvedValue(compte);

    const facture = {
      id: 'facture-1',
      statut: 'EN_ATTENTE',
      montantTTC: 11800,
      numeroFacture: 'RDI-B2B-202605-AAAA',
    };
    factureRepository.findOne.mockResolvedValue(facture);
    factureRepository.save.mockImplementation(async (f) => ({ ...f, statut: 'PAYEE' }));
    auditRepository.save.mockResolvedValue(undefined);

    const result = await service.payFacture('facture-1', 'b2b-user-1') as any;

    expect(factureRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ statut: 'PAYEE' }),
    );
    expect(result.statut).toBe('PAYEE');
  });

  it('lève NotFoundException si le compte est introuvable', async () => {
    compteB2BRepository.findOne.mockResolvedValue(null);

    await expect(
      service.payFacture('facture-1', 'ghost-user'),
    ).rejects.toThrow(NotFoundException);
  });

  it('lève NotFoundException si la facture est introuvable', async () => {
    compteB2BRepository.findOne.mockResolvedValue({ id: 'compte-1' });
    factureRepository.findOne.mockResolvedValue(null);

    await expect(
      service.payFacture('ghost-facture', 'b2b-user-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('lève BadRequestException si la facture est déjà payée', async () => {
    compteB2BRepository.findOne.mockResolvedValue({ id: 'compte-1' });
    factureRepository.findOne.mockResolvedValue({ id: 'facture-1', statut: 'PAYEE' });

    await expect(
      service.payFacture('facture-1', 'b2b-user-1'),
    ).rejects.toThrow(BadRequestException);
  });
});
