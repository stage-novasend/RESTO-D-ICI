import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './auth/entities/user.entity';
import { Restaurant } from './restaurants/entities/restaurant.entity';
import { Commande } from './commandes/entities/commande.entity';
import { SystemConfig } from './common/entities/system-config.entity';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: getRepositoryToken(User), useValue: { count: jest.fn() } },
        { provide: getRepositoryToken(Restaurant), useValue: { count: jest.fn() } },
        { provide: getRepositoryToken(Commande), useValue: { count: jest.fn() } },
        {
          provide: getRepositoryToken(SystemConfig),
          useValue: { findOne: jest.fn(), find: jest.fn() },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
