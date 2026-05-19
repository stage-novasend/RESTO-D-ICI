import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CommandesService } from './commandes.service';
import { Commande, StatutCommande } from './entities/commande.entity';
import { LigneCommande } from './entities/ligne-commande.entity';
import { CommandesGateway } from './commandes.gateway';
import { TresorerieService } from '../tresorerie/tresorerie.service';

describe('CommandesService getKDS', () => {
  let service: CommandesService;

  const commandeRepo = {
    find: jest.fn(),
  };

  const ligneRepo = {};
  const dataSource = {};
  const commandesGateway = {};
  const tresorerieService = {};

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommandesService,
        { provide: getRepositoryToken(Commande), useValue: commandeRepo },
        { provide: getRepositoryToken(LigneCommande), useValue: ligneRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: CommandesGateway, useValue: commandesGateway },
        { provide: TresorerieService, useValue: tresorerieService },
      ],
    }).compile();

    service = module.get<CommandesService>(CommandesService);
  });

  it('returns KDS orders with a sanitized client profile', async () => {
    commandeRepo.find.mockResolvedValue([
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

    expect(commandeRepo.find).toHaveBeenCalledWith(
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
