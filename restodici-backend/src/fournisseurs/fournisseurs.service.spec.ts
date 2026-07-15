import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { FournisseursService } from './fournisseurs.service';
import { Fournisseur } from './entities/fournisseur.entity';

describe('FournisseursService', () => {
  let service: FournisseursService;
  const repo = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn((x) => Promise.resolve({ id: 'f1', ...x })),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FournisseursService,
        { provide: getRepositoryToken(Fournisseur), useValue: repo },
      ],
    }).compile();
    service = module.get(FournisseursService);
  });

  it('findAll : trie par nom', async () => {
    repo.find.mockResolvedValue([{ id: 'f1' }]);
    const r = await service.findAll();
    expect(repo.find).toHaveBeenCalledWith({ order: { nom: 'ASC' } });
    expect(r).toHaveLength(1);
  });

  it('findActifs : filtre actif=true', async () => {
    repo.find.mockResolvedValue([]);
    await service.findActifs();
    expect(repo.find).toHaveBeenCalledWith({
      where: { actif: true },
      order: { nom: 'ASC' },
    });
  });

  it('findOneOrFail : renvoie le fournisseur actif', async () => {
    repo.findOne.mockResolvedValue({ id: 'f1', actif: true });
    expect(await service.findOneOrFail('f1')).toEqual({ id: 'f1', actif: true });
  });

  it('findOneOrFail : 404 si introuvable/inactif', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOneOrFail('x')).rejects.toThrow(NotFoundException);
  });

  it('create : persiste le fournisseur', async () => {
    const r = await service.create({ nom: 'SYSCO' });
    expect(repo.create).toHaveBeenCalledWith({ nom: 'SYSCO' });
    expect(r.id).toBe('f1');
  });

  it('update : fusionne et sauvegarde', async () => {
    repo.findOneOrFail.mockResolvedValue({ id: 'f1', nom: 'Ancien' });
    const r = await service.update('f1', { nom: 'Nouveau' });
    expect(r.nom).toBe('Nouveau');
  });

  it('toggle : inverse le statut actif', async () => {
    repo.findOneOrFail.mockResolvedValue({ id: 'f1', actif: true });
    const r = await service.toggle('f1');
    expect(r.actif).toBe(false);
  });

  it('remove : supprime et renvoie success', async () => {
    repo.findOneOrFail.mockResolvedValue({ id: 'f1' });
    repo.remove.mockResolvedValue(undefined);
    expect(await service.remove('f1')).toEqual({ success: true });
    expect(repo.remove).toHaveBeenCalled();
  });
});
