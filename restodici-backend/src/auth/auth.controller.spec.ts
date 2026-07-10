import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Role } from './entities/user.entity';

// ─── Mock AuthService ─────────────────────────────────────────────────────────

const mockAuthService = {
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  refreshAccessToken: jest.fn(),
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
  verifyEmail: jest.fn(),
  resendVerificationEmail: jest.fn(),
  changePassword: jest.fn(),
  setup2FA: jest.fn(),
  enable2FA: jest.fn(),
  disable2FA: jest.fn(),
  verifyTwoFactorLogin: jest.fn(),
};

async function buildModule(): Promise<TestingModule> {
  return Test.createTestingModule({
    controllers: [AuthController],
    providers: [{ provide: AuthService, useValue: mockAuthService }],
  }).compile();
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const tokenResponse = {
  accessToken: 'mock-access-token',
  access_token: 'mock-access-token',
  token: 'mock-access-token',
  user: {
    id: 'user-uuid-1',
    email: 'client@example.com',
    role: Role.CLIENT,
    nom: 'Koné',
    prenom: 'Aminata',
    telephone: '0707070707',
    twoFactorEnabled: false,
    emailVerified: true,
  },
};

// Mocks Express pour les handlers qui posent/lisent des cookies.
const mockRes = () => ({ cookie: jest.fn(), clearCookie: jest.fn() }) as any;
const mockReq = (cookies: Record<string, string> = {}) => ({ cookies }) as any;

// ─── login() ──────────────────────────────────────────────────────────────────

describe('AuthController login()', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    controller = module.get<AuthController>(AuthController);
  });

  it('retourne les tokens et l\'utilisateur quand les credentials sont valides', async () => {
    mockAuthService.login.mockResolvedValue(tokenResponse);

    const result = await controller.login({
      email: 'client@example.com',
      password: 'CorrectPass1!',
    }, mockRes());

    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: 'client@example.com',
      password: 'CorrectPass1!',
    });
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('access_token');
    expect((result as any).user).toMatchObject({ id: 'user-uuid-1' });
  });

  it('propage UnauthorizedException quand les credentials sont invalides', async () => {
    mockAuthService.login.mockRejectedValue(
      new UnauthorizedException('Identifiants incorrects'),
    );

    await expect(
      controller.login({ email: 'client@example.com', password: 'wrongPass' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('retourne requiresTwoFactor=true si la 2FA est activée', async () => {
    mockAuthService.login.mockResolvedValue({
      requiresTwoFactor: true,
      tempToken: 'temp-jwt-token',
    });

    const result = await controller.login({
      email: 'admin@example.com',
      password: 'SecurePass1!',
    }) as any;

    expect(result.requiresTwoFactor).toBe(true);
    expect(result.tempToken).toBeDefined();
  });
});

// ─── register() ───────────────────────────────────────────────────────────────

describe('AuthController register()', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    controller = module.get<AuthController>(AuthController);
  });

  it('crée un utilisateur CLIENT et retourne les tokens', async () => {
    const registerResponse = {
      ...tokenResponse,
      message: 'Compte créé avec succès. Vérifiez votre email pour activer votre compte.',
    };
    mockAuthService.register.mockResolvedValue(registerResponse);

    const result = await controller.register({
      email: 'client@example.com',
      password: 'ClientPass1!',
      nom: 'Koné',
      prenom: 'Aminata',
      telephone: '0707070707',
    } as any);

    expect(mockAuthService.register).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'client@example.com' }),
    );
    expect(result).toHaveProperty('accessToken');
    expect((result as any).message).toContain('Compte créé');
  });

  it('crée un gérant avec restaurant (type=RESTAURANT)', async () => {
    const gerantResponse = {
      accessToken: 'mock-access-token',
      access_token: 'mock-access-token',
      token: 'mock-access-token',
      user: {
        id: 'gerant-uuid-1',
        email: 'gerant@restaurant.ci',
        role: Role.GERANT,
        nom: 'Touré',
        prenom: 'Mamadou',
        telephone: '0505050505',
        twoFactorEnabled: false,
        emailVerified: false,
        restaurant: {
          id: 'resto-uuid-1',
          nom: 'Le Bon Coin',
          adresse: 'Plateau, Abidjan',
        },
      },
      message: 'Compte créé avec succès. Vérifiez votre email pour activer votre compte.',
    };
    mockAuthService.register.mockResolvedValue(gerantResponse);

    const result = await controller.register({
      email: 'gerant@restaurant.ci',
      password: 'GerantPass1!',
      nom: 'Touré',
      telephone: '0505050505',
      type: 'RESTAURANT',
      restaurantNom: 'Le Bon Coin',
      adresse: 'Plateau, Abidjan',
    } as any) as any;

    expect(mockAuthService.register).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'RESTAURANT', restaurantNom: 'Le Bon Coin' }),
    );
    expect(result.user.role).toBe(Role.GERANT);
    expect(result.user.restaurant).toMatchObject({ nom: 'Le Bon Coin' });
  });
});

// ─── me() ─────────────────────────────────────────────────────────────────────

describe('AuthController me()', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    controller = module.get<AuthController>(AuthController);
  });

  it('retourne le profil de l\'utilisateur connecté', async () => {
    const profile = { ...tokenResponse.user };
    mockAuthService.getProfile.mockResolvedValue(profile);

    const result = await controller.me({ user: { id: 'user-uuid-1' } } as any);

    expect(mockAuthService.getProfile).toHaveBeenCalledWith('user-uuid-1');
    expect(result).toMatchObject({
      id: 'user-uuid-1',
      email: 'client@example.com',
      role: Role.CLIENT,
    });
  });

  it('propage NotFoundException si l\'utilisateur n\'existe plus', async () => {
    mockAuthService.getProfile.mockRejectedValue(
      new NotFoundException('Utilisateur introuvable'),
    );

    await expect(
      controller.me({ user: { id: 'ghost-id' } } as any),
    ).rejects.toThrow(NotFoundException);
  });
});

// ─── logout() ─────────────────────────────────────────────────────────────────

describe('AuthController logout()', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await buildModule();
    controller = module.get<AuthController>(AuthController);
  });

  it('retourne un message de déconnexion', async () => {
    const result = await controller.logout(mockReq(), mockRes());
    expect(result).toMatchObject({ message: 'Déconnexion réussie' });
  });
});

// ─── smoke test ───────────────────────────────────────────────────────────────

describe('AuthController bootstrap', () => {
  it('should be defined', async () => {
    const module = await buildModule();
    const ctrl = module.get<AuthController>(AuthController);
    expect(ctrl).toBeDefined();
  });
});
