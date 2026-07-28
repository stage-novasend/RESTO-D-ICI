import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;
  const repo = {
    create: jest.fn((x) => x),
    save: jest.fn((x) => Promise.resolve({ id: 'n1', ...x })),
    findAndCount: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: repo },
      ],
    }).compile();
    service = module.get(NotificationsService);
  });

  it('crée une notification non lue', async () => {
    const notif = await service.create({
      userId: 'u1',
      type: 'commande.statut',
      title: 'Titre',
      body: 'Corps',
      data: { commandeId: 'c1' },
    });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', read: false, type: 'commande.statut' }),
    );
    expect(notif.id).toBe('n1');
  });

  it('liste paginée avec compteur de non-lues', async () => {
    repo.findAndCount.mockResolvedValue([[{ id: 'n1' }], 1]);
    repo.count.mockResolvedValue(3);
    const res = await service.findForUser('u1', { page: 1, limit: 30 });
    expect(res.total).toBe(1);
    expect(res.unread).toBe(3);
    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' }, take: 30, skip: 0 }),
    );
  });

  it('markRead ne cible que la notif du user', async () => {
    await service.markRead('n1', 'u1');
    expect(repo.update).toHaveBeenCalledWith({ id: 'n1', userId: 'u1' }, { read: true });
  });

  it('markAllRead ne cible que les non-lues du user', async () => {
    await service.markAllRead('u1');
    expect(repo.update).toHaveBeenCalledWith({ userId: 'u1', read: false }, { read: true });
  });

  it('borne la pagination (limit max 100)', async () => {
    repo.findAndCount.mockResolvedValue([[], 0]);
    repo.count.mockResolvedValue(0);
    await service.findForUser('u1', { page: 1, limit: 9999 });
    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });
});
