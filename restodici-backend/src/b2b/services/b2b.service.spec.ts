import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
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
import { Article } from '../../menu/entities/article.entity';
import { CommandesGateway } from '../../commandes/commandes.gateway';
import { EmailService } from '../../email/email.service';
import { ConfigService } from '@nestjs/config';

describe('B2BService realtime events', () => {
  let service: B2BService;

  const teamRepository = {};
  const teamMemberRepository = {};
  const invoiceRepository = {};
  const bulkOrderRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };
  const userRepository = {
    findOne: jest.fn(),
  };
  const commandesGateway = {
    emitToManagers: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        B2BService,
        { provide: getRepositoryToken(Team), useValue: teamRepository },
        { provide: getRepositoryToken(TeamMember), useValue: teamMemberRepository },
        { provide: getRepositoryToken(BulkOrder), useValue: bulkOrderRepository },
        { provide: getRepositoryToken(Invoice), useValue: invoiceRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(CompteB2B), useValue: {} },
        { provide: getRepositoryToken(CollaborateurB2B), useValue: {} },
        { provide: getRepositoryToken(CommandeGroupeeB2B), useValue: {} },
        { provide: getRepositoryToken(LigneCommandeGroupeeB2B), useValue: {} },
        { provide: getRepositoryToken(AuditLogB2B), useValue: {} },
        { provide: getRepositoryToken(FactureMensuelleB2B), useValue: {} },
        { provide: getRepositoryToken(Article), useValue: {} },
        { provide: CommandesGateway, useValue: commandesGateway },
        { provide: EmailService, useValue: { sendB2BOrderConfirmation: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

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
