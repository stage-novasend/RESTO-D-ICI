import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  it('should be defined', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Restaurant),
          useValue: {},
        },
        {
          provide: getRepositoryToken(PasswordReset),
          useValue: {},
        },
        {
          provide: JwtService,
          useValue: { sign: () => 'mock-token' },
        },
        {
          provide: ConfigService,
          useValue: { get: () => 'http://localhost:5173' },
        },
      ],
    }).compile();

    const service = module.get<AuthService>(AuthService);
    expect(service).toBeDefined();
  });
});
