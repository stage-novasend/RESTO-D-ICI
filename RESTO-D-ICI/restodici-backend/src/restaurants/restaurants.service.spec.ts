import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RestaurantsService } from './restaurants.service';
import { Restaurant } from './entities/restaurant.entity';
import { User } from '../auth/entities/user.entity';
import { CommandesGateway } from '../commandes/commandes.gateway';

describe('RestaurantsService realtime events', () => {
  let service: RestaurantsService;

  const restaurantRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const userRepo = {};
  const commandesGateway = {
    emitToKitchen: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantsService,
        { provide: getRepositoryToken(Restaurant), useValue: restaurantRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: CommandesGateway, useValue: commandesGateway },
      ],
    }).compile();

    service = module.get<RestaurantsService>(RestaurantsService);
  });

  it('emits restaurant.profile.updated after restaurant update', async () => {
    const initialRestaurant = {
      id: 'resto-1',
      nom: 'Resto',
      logo: null,
      telephone: '01020304',
      adresse: 'Abidjan',
      description: 'Initial',
      email: 'resto@example.com',
      openingTime: '08:00',
      closingTime: '22:00',
      deliveryZones: [],
      latitude: null,
      longitude: null,
    };

    const hydratedRestaurant = {
      ...initialRestaurant,
      description: 'Mise à jour',
    };

    restaurantRepo.findOne
      .mockResolvedValueOnce(initialRestaurant)
      .mockResolvedValueOnce(hydratedRestaurant);
    restaurantRepo.save.mockImplementation(async (payload) => payload);

    await service.updateRestaurant(
      'resto-1',
      { description: 'Mise à jour' },
      { role: 'GERANT', restaurant: { id: 'resto-1' } },
    );

    expect(commandesGateway.emitToKitchen).toHaveBeenCalledWith(
      'resto-1',
      'restaurant.profile.updated',
      expect.objectContaining({ id: 'resto-1', description: 'Mise à jour' }),
    );
  });
});
