import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { B2bFacturationService } from './b2b-facturation.service';
import { CompteB2B } from '../entities/compte-b2b.entity';
import { CommandeGroupeeB2B } from '../entities/commande-groupee-b2b.entity';
import { BulkOrder } from '../entities/bulk-order.entity';
import { FactureMensuelleB2B } from '../entities/facture-mensuelle-b2b.entity';
import { EmailService } from '../../email/email.service';
import { ConfigService } from '@nestjs/config';
import { B2bAuditService } from './b2b-audit.service';

// ─── Mocks partagés ───────────────────────────────────────────────────────────
const factureRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  count: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
};
const compteRepo = { findOne: jest.fn(), find: jest.fn(), save: jest.fn() };
const commandeGroupeeRepo = { createQueryBuilder: jest.fn() };
const bulkOrderRepo = { createQueryBuilder: jest.fn() };
const emailService = {
  sendMail: jest.fn().mockResolvedValue(undefined),
  sendFactureMensuelleEmail: jest.fn().mockResolvedValue(undefined),
  sendB2BOrderConfirmation: jest.fn(),
};
const configService = {
  get: jest.fn().mockReturnValue('admin@restodici.ci'),
};
const auditService = {
  logAudit: jest.fn().mockResolvedValue(undefined),
  getAuditLogs: jest.fn().mockResolvedValue([]),
};

// Chainable QueryBuilder mock
function makeQB(rows: any[]) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(rows),
  };
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

async function buildService(): Promise<B2bFacturationService> {
  jest.clearAllMocks();
  configService.get.mockReturnValue('admin@restodici.ci');
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      B2bFacturationService,
      { provide: getRepositoryToken(FactureMensuelleB2B), useValue: factureRepo },
      { provide: getRepositoryToken(CompteB2B), useValue: compteRepo },
      {
        provide: getRepositoryToken(CommandeGroupeeB2B),
        useValue: commandeGroupeeRepo,
      },
      { provide: getRepositoryToken(BulkOrder), useValue: bulkOrderRepo },
      { provide: EmailService, useValue: emailService },
      { provide: ConfigService, useValue: configService },
      { provide: B2bAuditService, useValue: auditService },
    ],
  }).compile();
  return module.get<B2bFacturationService>(B2bFacturationService);
}

// ─── generateFactureForCompte() ─────────────────────────────────────────────
describe('B2bFacturationService generateFactureForCompte()', () => {
  let service: B2bFacturationService;

  const mockQB = () => ({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ total: '10000' }),
  });

  beforeEach(async () => {
    service = await buildService();
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

    factureRepo.findOne.mockResolvedValue(null);
    commandeGroupeeRepo.createQueryBuilder.mockReturnValue(mockQB());
    bulkOrderRepo.createQueryBuilder.mockReturnValue(mockQB());

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
    factureRepo.create.mockReturnValue(savedFacture);
    factureRepo.save.mockResolvedValue(savedFacture);

    const result = await service.generateFactureForCompte(compte, 'MAI', 2026);

    expect(factureRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mois: 'MAI',
        annee: 2026,
        statut: 'EN_ATTENTE',
      }),
    );
    expect(factureRepo.save).toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'facture-new-1', statut: 'EN_ATTENTE' });
  });

  it('retourne la facture existante sans la recréer (idempotence)', async () => {
    const compte = { id: 'compte-uuid-1', raisonSociale: 'Sankofa SARL' } as any;
    const existante = { id: 'facture-existante', mois: 'MAI', annee: 2026, statut: 'PAYEE' };
    factureRepo.findOne.mockResolvedValue(existante);

    const result = await service.generateFactureForCompte(compte, 'MAI', 2026);

    expect(factureRepo.create).not.toHaveBeenCalled();
    expect(factureRepo.save).not.toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'facture-existante' });
  });

  it('retourne null si le montant total du mois est 0', async () => {
    const compte = { id: 'compte-uuid-2', responsable: { id: 'b2b-2' } } as any;
    factureRepo.findOne.mockResolvedValue(null);

    const zeroQB = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total: null }),
    };
    commandeGroupeeRepo.createQueryBuilder.mockReturnValue(zeroQB);
    bulkOrderRepo.createQueryBuilder.mockReturnValue(zeroQB);

    const result = await service.generateFactureForCompte(compte, 'JANVIER', 2026);

    expect(result).toBeNull();
    expect(factureRepo.save).not.toHaveBeenCalled();
  });
});

// ─── payFacture() ─────────────────────────────────────────────────────────────
describe('B2bFacturationService payFacture()', () => {
  let service: B2bFacturationService;

  beforeEach(async () => {
    service = await buildService();
  });

  it('marque la facture comme PAYEE', async () => {
    const compte = { id: 'compte-1', raisonSociale: 'Sankofa SARL', numeroContribuable: 'NIF1' };
    compteRepo.findOne.mockResolvedValue(compte);

    const facture = {
      id: 'facture-1',
      statut: 'EN_ATTENTE',
      montantTTC: 11800,
      numeroFacture: 'RDI-B2B-202605-AAAA',
    };
    factureRepo.findOne.mockResolvedValue(facture);
    factureRepo.save.mockImplementation(async (f: any) => ({ ...f, statut: 'PAYEE' }));

    const result = (await service.payFacture('facture-1', 'b2b-user-1')) as any;

    expect(factureRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ statut: 'PAYEE' }),
    );
    expect(result.statut).toBe('PAYEE');
  });

  it('lève NotFoundException si le compte est introuvable', async () => {
    compteRepo.findOne.mockResolvedValue(null);

    await expect(
      service.payFacture('facture-1', 'ghost-user'),
    ).rejects.toThrow(NotFoundException);
  });

  it('lève NotFoundException si la facture est introuvable', async () => {
    compteRepo.findOne.mockResolvedValue({ id: 'compte-1' });
    factureRepo.findOne.mockResolvedValue(null);

    await expect(
      service.payFacture('ghost-facture', 'b2b-user-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('lève BadRequestException si la facture est déjà payée', async () => {
    compteRepo.findOne.mockResolvedValue({ id: 'compte-1' });
    factureRepo.findOne.mockResolvedValue({ id: 'facture-1', statut: 'PAYEE' });

    await expect(
      service.payFacture('facture-1', 'b2b-user-1'),
    ).rejects.toThrow(BadRequestException);
  });
});

// ─── contestFacture() ─────────────────────────────────────────────────────────
describe('B2bFacturationService contestFacture()', () => {
  let service: B2bFacturationService;

  beforeEach(async () => {
    service = await buildService();
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
    factureRepo.findOne.mockResolvedValue({ ...FACTURE_EN_ATTENTE, statut: 'PAYEE' });
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

    const result = await service.contestFacture(
      'facture-1',
      'user-1',
      'Montant incorrect',
    );

    expect(factureRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ statut: 'EN_CONTESTATION' }),
    );
    expect(result).toMatchObject({ statut: 'EN_CONTESTATION' });
    await Promise.resolve();
    expect(emailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@restodici.ci',
        subject: expect.stringContaining('Contestation facture'),
      }),
    );
  });
});

// ─── exportSyscohadaCsv() ─────────────────────────────────────────────────────
describe('B2bFacturationService exportSyscohadaCsv()', () => {
  let service: B2bFacturationService;

  beforeEach(async () => {
    service = await buildService();
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

    const result = await service.exportSyscohadaCsv('facture-1', 'user-1');

    expect(result).toHaveProperty('csv');
    expect(result).toHaveProperty('filename');

    const lines = result.csv.split('\n');
    expect(lines).toHaveLength(3); // header + 2 rows

    expect(lines[0]).toBe(
      'Date;Libelle;Compte_Debit;Montant_Debit;Compte_Credit;Montant_Credit;NIF;Reference',
    );

    expect(lines[1]).toContain('411100');
    expect(lines[1]).toContain('701100');
    expect(lines[1]).toContain('FACT-2026-001');

    expect(lines[2]).toContain('443100');
    expect(lines[2]).toContain('15254'); // rounded TVA amount

    expect(result.filename).toContain('FACT-2026-001');
    expect(result.filename).toContain('MAI-2026');
    expect(result.filename).toMatch(/\.csv$/);
  });

  it('uses factureId prefix when numeroFacture is missing', async () => {
    const factureWithoutNum = { ...FACTURE_EN_ATTENTE, numeroFacture: undefined };
    compteRepo.findOne.mockResolvedValue(COMPTE);
    factureRepo.findOne.mockResolvedValue(factureWithoutNum);

    const result = await service.exportSyscohadaCsv('facture-abc12345', 'user-1');
    expect(result.filename).toContain('facture-'); // first 8 chars of id
  });
});

// ─── checkOverdueInvoices() relances ──────────────────────────────────────────
describe('B2bFacturationService checkOverdueInvoices()', () => {
  let service: B2bFacturationService;

  beforeEach(async () => {
    service = await buildService();
  });

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

    await service.checkOverdueInvoices();
    await Promise.resolve();

    expect(emailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@restodici.ci',
        subject: expect.stringContaining('Impayé J+15'),
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

    await service.checkOverdueInvoices();
    await Promise.resolve();

    expect(emailService.sendMail).not.toHaveBeenCalled();
  });
});
