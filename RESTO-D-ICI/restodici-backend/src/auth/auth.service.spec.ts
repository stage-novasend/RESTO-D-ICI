import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, Role } from './entities/user.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockUserRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};
const mockRestaurantRepo = { save: jest.fn(), create: jest.fn() };
const mockPasswordResetRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};
const mockJwtService = { sign: jest.fn().mockReturnValue('mock-access-token') };
const mockConfigService = {
  get: jest.fn().mockReturnValue('http://localhost:5173'),
};
const mockEmailService = {
  sendEmailVerification: jest.fn().mockResolvedValue(undefined),
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
};

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-uuid-1',
    email: 'test@example.com',
    password: 'hashed-password',
    nom: 'Doe',
    prenom: 'Jane',
    telephone: '0101010101',
    role: Role.CLIENT,
    actif: true,
    emailVerified: true,
    twoFactorEnabled: false,
    favorites: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

async function buildModule(): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      AuthService,
      { provide: getRepositoryToken(User), useValue: mockUserRepo },
      { provide: getRepositoryToken(Restaurant), useValue: mockRestaurantRepo },
      {
        provide: getRepositoryToken(PasswordReset),
        useValue: mockPasswordResetRepo,
      },
      { provide: JwtService, useValue: mockJwtService },
      { provide: ConfigService, useValue: mockConfigService },
      { provide: EmailService, useValue: mockEmailService },
    ],
  }).compile();
}

// ─── login() ──────────────────────────────────────────────────────────────────

describe('AuthService login()', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<AuthService>(AuthService);
  });

  it('throws UnauthorizedException when user is not found', async () => {
    mockUserRepo.findOne.mockResolvedValue(null);

    await expect(
      service.login({ email: 'nobody@example.com', password: 'anyPass1!' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when password is wrong', async () => {
    const user = makeUser({ password: await bcrypt.hash('correctPass', 10) });
    mockUserRepo.findOne.mockResolvedValue(user);

    await expect(
      service.login({ email: 'test@example.com', password: 'wrongPass' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('returns tokens and user on successful login', async () => {
    const plainPassword = 'correctPass1!';
    const hashed = await bcrypt.hash(plainPassword, 10);
    const user = makeUser({ password: hashed });
    mockUserRepo.findOne.mockResolvedValue(user);

    const result = await service.login({
      email: 'test@example.com',
      password: plainPassword,
    });

    expect(result).toHaveProperty('access_token');
    expect(result).toHaveProperty('accessToken');
    expect((result as any).user).toMatchObject({ id: 'user-uuid-1' });
    expect(mockJwtService.sign).toHaveBeenCalled();
  });
});

// ─── validateUser() (via login logic) ────────────────────────────────────────

describe('AuthService validateUser (login logic)', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    service = module.get<AuthService>(AuthService);
  });

  it('returns null (UnauthorizedException) when user does not exist', async () => {
    mockUserRepo.findOne.mockResolvedValue(null);

    await expect(
      service.login({ email: 'ghost@example.com', password: 'pass' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('returns null (UnauthorizedException) when password is incorrect', async () => {
    const user = makeUser({ password: await bcrypt.hash('realPass', 10) });
    mockUserRepo.findOne.mockResolvedValue(user);

    await expect(
      service.login({ email: 'test@example.com', password: 'wrongPass' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('returns the user (resolves) when credentials are valid', async () => {
    const plainPassword = 'validPass1!';
    const hashed = await bcrypt.hash(plainPassword, 10);
    const user = makeUser({ password: hashed });
    mockUserRepo.findOne.mockResolvedValue(user);

    const result = await service.login({
      email: 'test@example.com',
      password: plainPassword,
    });

    expect((result as any).user).toBeDefined();
    expect((result as any).user.id).toBe('user-uuid-1');
  });
});

// ─── should be defined (smoke test, kept for compatibility) ───────────────────

describe('AuthService bootstrap', () => {
  it('should be defined', async () => {
    const module = await buildModule();
    const svc = module.get<AuthService>(AuthService);
    expect(svc).toBeDefined();
  });
});
