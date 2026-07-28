import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as jwt from 'jsonwebtoken';
import { CommandesGateway } from './commandes.gateway';
import { User } from '../auth/entities/user.entity';

describe('CommandesGateway', () => {
  let gateway: CommandesGateway;
  const userRepository = {
    findOne: jest.fn(),
  };

  // JWT_SECRET déterministe pour les tests (plus de fallback dans le code).
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommandesGateway,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
      ],
    }).compile();

    gateway = module.get<CommandesGateway>(CommandesGateway);
  });

  it('joins user, role and restaurant rooms from validated token payload', async () => {
    const token = jwt.sign(
      { sub: 'user-1', email: 'gerant@example.com', role: 'GERANT' },
      process.env.JWT_SECRET as string,
    );

    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      role: 'GERANT',
      restaurant: { id: 'resto-1' },
      actif: true,
    });

    const client = {
      handshake: { auth: { token }, headers: {} },
      join: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    const result = await gateway.handleSubscribe(client);

    expect(result).toEqual({
      success: true,
      userId: 'user-1',
      role: 'GERANT',
      restaurantId: 'resto-1',
    });
    expect(client.join).toHaveBeenCalledWith('user:user-1');
    expect(client.join).toHaveBeenCalledWith('role:GERANT');
    expect(client.join).toHaveBeenCalledWith('restaurant:resto-1:staff');
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('disconnects socket when token cannot be validated', async () => {
    const client = {
      handshake: { auth: { token: 'bad-token' }, headers: {} },
      join: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    const result = await gateway.handleSubscribe(client);

    expect(result).toEqual({ success: false });
    expect(client.emit).toHaveBeenCalledWith('subscribe.error', {
      message: 'Unauthorized',
    });
    expect(client.disconnect).toHaveBeenCalled();
    expect(client.join).not.toHaveBeenCalled();
  });
});
