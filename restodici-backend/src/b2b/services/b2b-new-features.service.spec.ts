import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
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

const notificationsServiceMock = {
  create: jest.fn().mockResolvedValue({}),
};
import { SystemConfig } from '../../common/entities/system-config.entity';

// Helper: builds a chainable QueryBuilder mock
function makeQB(rows: any[]) {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(rows),
  };
  return qb;
}

const COMPTE: CompteB2B = {
  id: 'compte-1',
  raisonSociale: 'Sankofa Lab',
  emailProfessionnel: 'rh@sankofa.ci',
  numeroContribuable: 'NIF123',
  actif: true,
} as unknown as CompteB2B;

const FACTURE_EN_ATTENTE = {
  id: 'facture-1',
  numeroFacture: 'FACT-2026-001',
  statut: 'EN_ATTENTE',
  montantHT: 84745.76,
  tva: 15254.24,
  montantTTC: 100000,
  mois: 'MAI',
  annee: 2026,
  echeance: '2026-05-31',
  nifClient: 'NIF123',
  compteB2B: COMPTE,
} as unknown as FactureMensuelleB2B;

describe('B2BService — contestFacture', () => {
  let service: B2BService;
  const compteRepo = { findOne: jest.fn() };
  const factureRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const auditRepo = { create: jest.fn(), save: jest.fn() };
  const userRepo = { findOne: jest.fn() };
  const emailService = {
    sendMail: jest.fn().mockResolvedValue(undefined),
    sendB2BOrderConfirmation: jest.fn(),
  };
  const configService = {
    get: jest.fn().mockReturnValue('admin@restodici.ci'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        B2BService,
        { provide: getRepositoryToken(Team), useValue: {} },
        { provide: getRepositoryToken(TeamMember), useValue: {} },
        { provide: getRepositoryToken(BulkOrder), useValue: {} },
        { provide: getRepositoryToken(Invoice), useValue: {} },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(CompteB2B), useValue: compteRepo },
        { provide: getRepositoryToken(CollaborateurB2B), useValue: {} },
        { provide: getRepositoryToken(CommandeGroupeeB2B), useValue: {} },
        { provide: getRepositoryToken(LigneCommandeGroupeeB2B), useValue: {} },
        { provide: getRepositoryToken(AuditLogB2B), useValue: auditRepo },
        {
          provide: getRepositoryToken(FactureMensuelleB2B),
          useValue: factureRepo,
        },
        { provide: getRepositoryToken(Article), useValue: {} },
        { provide: getRepositoryToken(PlanRepasB2B), useValue: {} },
        { provide: getRepositoryToken(SystemConfig), useValue: {} },
        { provide: CommandesGateway, useValue: { emitToManagers: jest.fn() } },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: configService },
        { provide: NotificationsService, useValue: notificationsServiceMock },
      ],
    }).compile();
    service = module.get<B2BService>(B2BService);
  });

  it('throws NotFoundException when compte not found', async () => {
    compteRepo.findOne.mockResolvedValue(null);
    await expect(
      service.contestFacture('f-1', 'user-1', 'Erreur de montant'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when facture not found', async () => {
    compteRepo.findOne.mockResolvedValue(COMPTE);
    factureRepo.findOne.mockResolvedValue(null);
    await expect(
      service.contestFacture('f-1', 'user-1', 'Erreur de montant'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when facture already PAYEE', async () => {
    compteRepo.findOne.mockResolvedValue(COMPTE);
    factureRepo.findOne.mockResolvedValue({
      ...FACTURE_EN_ATTENTE,
      statut: 'PAYEE',
    });
    await expect(
      service.contestFacture('facture-1', 'user-1', 'Motif'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when facture already EN_CONTESTATION', async () => {
    compteRepo.findOne.mockResolvedValue(COMPTE);
    factureRepo.findOne.mockResolvedValue({
      ...FACTURE_EN_ATTENTE,
      statut: 'EN_CONTESTATION',
    });
    await expect(
      service.contestFacture('facture-1', 'user-1', 'Motif'),
    ).rejects.toThrow(BadRequestException);
  });

  it('sets statut to EN_CONTESTATION and emails admin', async () => {
    compteRepo.findOne.mockResolvedValue(COMPTE);
    factureRepo.findOne.mockResolvedValue({ ...FACTURE_EN_ATTENTE });
    const saved = { ...FACTURE_EN_ATTENTE, statut: 'EN_CONTESTATION' };
    factureRepo.save.mockResolvedValue(saved);
    auditRepo.create.mockImplementation((x: any) => x);
    auditRepo.save.mockResolvedValue({});
    userRepo.findOne.mockResolvedValue({ email: 'user@test.ci' });

    const result = await service.contestFacture(
      'facture-1',
      'user-1',
      'Montant incorrect',
    );

    expect(factureRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ statut: 'EN_CONTESTATION' }),
    );
    expect(result).toMatchObject({ statut: 'EN_CONTESTATION' });
    // Email send is fire-and-forget (void) — give it a tick to resolve
    await Promise.resolve();
    expect(emailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@restodici.ci',
        subject: expect.stringContaining('Contestation facture'),
      }),
    );
  });
});

describe('B2BService — exportSyscohadaCsv', () => {
  let service: B2BService;
  const compteRepo = { findOne: jest.fn() };
  const factureRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const auditRepo = { create: jest.fn(), save: jest.fn() };
  const userRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        B2BService,
        { provide: getRepositoryToken(Team), useValue: {} },
        { provide: getRepositoryToken(TeamMember), useValue: {} },
        { provide: getRepositoryToken(BulkOrder), useValue: {} },
        { provide: getRepositoryToken(Invoice), useValue: {} },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(CompteB2B), useValue: compteRepo },
        { provide: getRepositoryToken(CollaborateurB2B), useValue: {} },
        { provide: getRepositoryToken(CommandeGroupeeB2B), useValue: {} },
        { provide: getRepositoryToken(LigneCommandeGroupeeB2B), useValue: {} },
        { provide: getRepositoryToken(AuditLogB2B), useValue: auditRepo },
        {
          provide: getRepositoryToken(FactureMensuelleB2B),
          useValue: factureRepo,
        },
        { provide: getRepositoryToken(Article), useValue: {} },
        { provide: getRepositoryToken(PlanRepasB2B), useValue: {} },
        { provide: getRepositoryToken(SystemConfig), useValue: {} },
        { provide: CommandesGateway, useValue: { emitToManagers: jest.fn() } },
        {
          provide: EmailService,
          useValue: {
            sendMail: jest.fn(),
            sendB2BOrderConfirmation: jest.fn(),
          },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: NotificationsService, useValue: notificationsServiceMock },
      ],
    }).compile();
    service = module.get<B2BService>(B2BService);
  });

  it('throws NotFoundException when compte not found', async () => {
    compteRepo.findOne.mockResolvedValue(null);
    await expect(service.exportSyscohadaCsv('f-1', 'user-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws NotFoundException when facture not found', async () => {
    compteRepo.findOne.mockResolvedValue(COMPTE);
    factureRepo.findOne.mockResolvedValue(null);
    await expect(service.exportSyscohadaCsv('f-1', 'user-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns CSV with SYSCOHADA headers and 2 accounting rows', async () => {
    compteRepo.findOne.mockResolvedValue(COMPTE);
    factureRepo.findOne.mockResolvedValue({ ...FACTURE_EN_ATTENTE });
    auditRepo.create.mockImplementation((x: any) => x);
    auditRepo.save.mockResolvedValue({});
    userRepo.findOne.mockResolvedValue({ email: 'user@test.ci' });

    const result = await service.exportSyscohadaCsv('facture-1', 'user-1');

    expect(result).toHaveProperty('csv');
    expect(result).toHaveProperty('filename');

    const lines = result.csv.split('\n');
    expect(lines).toHaveLength(3); // header + 2 rows

    // Header contains expected SYSCOHADA columns
    expect(lines[0]).toBe(
      'Date;Libelle;Compte_Debit;Montant_Debit;Compte_Credit;Montant_Credit;NIF;Reference',
    );

    // Row 1: client receivable (411100) → revenue (701100)
    expect(lines[1]).toContain('411100');
    expect(lines[1]).toContain('701100');
    expect(lines[1]).toContain('FACT-2026-001');

    // Row 2: TVA entry (443100)
    expect(lines[2]).toContain('443100');
    expect(lines[2]).toContain('15254'); // rounded TVA amount

    // Filename includes the facture ref
    expect(result.filename).toContain('FACT-2026-001');
    expect(result.filename).toContain('MAI-2026');
    expect(result.filename).toMatch(/\.csv$/);
  });

  it('uses factureId prefix when numeroFacture is missing', async () => {
    const factureWithoutNum = {
      ...FACTURE_EN_ATTENTE,
      numeroFacture: undefined,
    };
    compteRepo.findOne.mockResolvedValue(COMPTE);
    factureRepo.findOne.mockResolvedValue(factureWithoutNum);
    auditRepo.create.mockImplementation((x: any) => x);
    auditRepo.save.mockResolvedValue({});
    userRepo.findOne.mockResolvedValue(null);

    const result = await service.exportSyscohadaCsv(
      'facture-abc12345',
      'user-1',
    );
    expect(result.filename).toContain('facture-'); // first 8 chars of id
  });
});

describe('B2BService — checkOverdueInvoices relances', () => {
  let service: B2BService;
  const factureRepo = { save: jest.fn(), createQueryBuilder: jest.fn() };
  const emailService = {
    sendMail: jest.fn().mockResolvedValue(undefined),
    sendB2BOrderConfirmation: jest.fn(),
  };
  const configService = {
    get: jest.fn().mockReturnValue('admin@restodici.ci'),
  };

  async function buildService() {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        B2BService,
        { provide: getRepositoryToken(Team), useValue: {} },
        { provide: getRepositoryToken(TeamMember), useValue: {} },
        { provide: getRepositoryToken(BulkOrder), useValue: {} },
        { provide: getRepositoryToken(Invoice), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(CompteB2B), useValue: {} },
        { provide: getRepositoryToken(CollaborateurB2B), useValue: {} },
        { provide: getRepositoryToken(CommandeGroupeeB2B), useValue: {} },
        { provide: getRepositoryToken(LigneCommandeGroupeeB2B), useValue: {} },
        { provide: getRepositoryToken(AuditLogB2B), useValue: {} },
        {
          provide: getRepositoryToken(FactureMensuelleB2B),
          useValue: factureRepo,
        },
        { provide: getRepositoryToken(Article), useValue: {} },
        { provide: getRepositoryToken(PlanRepasB2B), useValue: {} },
        { provide: getRepositoryToken(SystemConfig), useValue: {} },
        { provide: CommandesGateway, useValue: { emitToManagers: jest.fn() } },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: configService },
        { provide: NotificationsService, useValue: notificationsServiceMock },
      ],
    }).compile();
    return module.get<B2BService>(B2BService);
  }

  it('sends J-7 reminder email for invoices due in 7 days', async () => {
    const factureJ7 = {
      ...FACTURE_EN_ATTENTE,
      montantTTC: 50000,
      compteB2B: { emailProfessionnel: 'rh@sankofa.ci' },
    };
    factureRepo.createQueryBuilder
      .mockReturnValueOnce(makeQB([])) // Step 1: overdue (empty)
      .mockReturnValueOnce(makeQB([factureJ7])) // Step 2: J-7 match
      .mockReturnValueOnce(makeQB([])) // Step 3: J+3 (empty)
      .mockReturnValueOnce(makeQB([])); // Step 4: J+15 (empty)

    service = await buildService();
    await service.checkOverdueInvoices();
    await Promise.resolve();

    expect(emailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'rh@sankofa.ci',
        subject: expect.stringContaining('échéance dans 7 jours'),
      }),
    );
  });

  it('sends J+3 urgent email for invoices 3 days overdue', async () => {
    const factureJ3 = {
      ...FACTURE_EN_ATTENTE,
      statut: 'RETARDEE',
      montantTTC: 75000,
      compteB2B: { emailProfessionnel: 'finance@corp.ci' },
    };
    factureRepo.createQueryBuilder
      .mockReturnValueOnce(makeQB([]))
      .mockReturnValueOnce(makeQB([]))
      .mockReturnValueOnce(makeQB([factureJ3]))
      .mockReturnValueOnce(makeQB([]));

    service = await buildService();
    await service.checkOverdueInvoices();
    await Promise.resolve();

    expect(emailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'finance@corp.ci',
        subject: expect.stringContaining('URGENT'),
      }),
    );
  });

  it('sends J+15 escalation email to admin', async () => {
    const factureJ15 = {
      ...FACTURE_EN_ATTENTE,
      statut: 'RETARDEE',
      compteB2B: {
        raisonSociale: 'Mega Corp',
        emailProfessionnel: 'rh@mega.ci',
      },
    };
    factureRepo.createQueryBuilder
      .mockReturnValueOnce(makeQB([]))
      .mockReturnValueOnce(makeQB([]))
      .mockReturnValueOnce(makeQB([]))
      .mockReturnValueOnce(makeQB([factureJ15]));

    service = await buildService();
    await service.checkOverdueInvoices();
    await Promise.resolve();

    expect(emailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@restodici.ci',
        subject: expect.stringContaining('Impayé J+15'),
        html: expect.stringContaining('Mega Corp'),
      }),
    );
  });

  it('marks overdue EN_ATTENTE invoices as RETARDEE', async () => {
    const overdueFacture = { ...FACTURE_EN_ATTENTE, statut: 'EN_ATTENTE' };
    factureRepo.save.mockResolvedValue({
      ...overdueFacture,
      statut: 'RETARDEE',
    });
    factureRepo.createQueryBuilder
      .mockReturnValueOnce(makeQB([overdueFacture]))
      .mockReturnValueOnce(makeQB([]))
      .mockReturnValueOnce(makeQB([]))
      .mockReturnValueOnce(makeQB([]));

    service = await buildService();
    await service.checkOverdueInvoices();

    expect(factureRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ statut: 'RETARDEE' }),
    );
  });

  it('skips J-7 email when compteB2B has no emailProfessionnel', async () => {
    const factureNoEmail = {
      ...FACTURE_EN_ATTENTE,
      compteB2B: { emailProfessionnel: null },
    };
    factureRepo.createQueryBuilder
      .mockReturnValueOnce(makeQB([]))
      .mockReturnValueOnce(makeQB([factureNoEmail]))
      .mockReturnValueOnce(makeQB([]))
      .mockReturnValueOnce(makeQB([]));

    service = await buildService();
    await service.checkOverdueInvoices();
    await Promise.resolve();

    expect(emailService.sendMail).not.toHaveBeenCalled();
  });
});
