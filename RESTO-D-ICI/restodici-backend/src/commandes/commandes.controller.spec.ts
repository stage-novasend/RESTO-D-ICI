import { Test, TestingModule } from '@nestjs/testing';
import { CommandesController } from './commandes.controller';
import { CommandesService } from './commandes.service';
import { TresorerieService } from '../tresorerie/tresorerie.service';
import { StorageService } from '../storage/storage.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Restaurant } from '../restaurants/entities/restaurant.entity';

describe('CommandesController create', () => {
  let controller: CommandesController;

  const commandesService = {
    createCommande: jest.fn(),
  };

  const tresorerieService = {
    generateReceiptPdf: jest.fn(),
  };

  const storageService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommandesController],
      providers: [
        { provide: CommandesService, useValue: commandesService },
        { provide: TresorerieService, useValue: tresorerieService },
        { provide: StorageService, useValue: storageService },
        {
          provide: getRepositoryToken(Restaurant),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<CommandesController>(CommandesController);
  });

  it('normalizes quantity to quantite before forwarding to service', async () => {
    commandesService.createCommande.mockResolvedValue({ id: 'cmd-1' });

    const dto: any = {
      lignes: [
        {
          articleId: 'article-1',
          quantity: 2,
          instructions: 'sans sel',
        },
      ],
      modeLivraison: 'SUR_PLACE',
      restaurantId: '7f7deaf5-7572-468a-a1bc-88e93b2f8d79',
    };

    const req: any = {
      user: {
        id: 'client-1',
      },
    };

    await controller.create(dto, req);

    expect(commandesService.createCommande).toHaveBeenCalledWith(
      {
        ...dto,
        lignes: [
          {
            articleId: 'article-1',
            quantity: 2,
            quantite: 2,
            instructions: 'sans sel',
          },
        ],
      },
      'client-1',
      '7f7deaf5-7572-468a-a1bc-88e93b2f8d79',
    );
  });

  it('keeps quantite unchanged when already provided', async () => {
    commandesService.createCommande.mockResolvedValue({ id: 'cmd-2' });

    const dto: any = {
      lignes: [
        {
          articleId: 'article-1',
          quantite: 3,
        },
      ],
      modeLivraison: 'SUR_PLACE',
      restaurantId: '7f7deaf5-7572-468a-a1bc-88e93b2f8d79',
    };

    const req: any = {
      user: {
        id: 'client-1',
      },
    };

    await controller.create(dto, req);

    expect(commandesService.createCommande).toHaveBeenCalledWith(
      {
        ...dto,
        lignes: [
          {
            articleId: 'article-1',
            quantite: 3,
          },
        ],
      },
      'client-1',
      '7f7deaf5-7572-468a-a1bc-88e93b2f8d79',
    );
  });
});
