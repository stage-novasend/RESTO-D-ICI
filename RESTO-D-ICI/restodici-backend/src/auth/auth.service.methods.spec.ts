import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, Role } from './entities/user.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { EmailService } from '../email/email.service';

// Couvre les méthodes non testées par auth.service.spec.ts (login déjà couvert).
describe('AuthService — méthodes complémentaires', () => {
  let service: AuthService;

  const userRepo: any = {};
  const resetRepo: any = {};
  const jwt: any = {};
  const email: any = {};

  beforeAll(() => {
    process.env.TOTP_ENCRYPTION_KEY =
      process.env.TOTP_ENCRYPTION_KEY || 'test-key';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  });

  beforeEach(async () => {
    Object.assign(userRepo, {
      findOne: jest.fn(),
      save: jest.fn((u) => Promise.resolve({ id: 'u1', ...u })),
      create: jest.fn((u) => u),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    });
    Object.assign(resetRepo, {
      findOne: jest.fn(),
      save: jest.fn((r) => Promise.resolve(r)),
      create: jest.fn((r) => r),
    });
    Object.assign(jwt, {
      sign: jest.fn().mockReturnValue('access-token'),
      verify: jest.fn(),
    });
    Object.assign(email, {
      sendEmailVerification: jest.fn().mockResolvedValue(undefined),
      sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Restaurant), useValue: { save: jest.fn(), create: jest.fn() } },
        { provide: getRepositoryToken(PasswordReset), useValue: resetRepo },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost:5173') } },
        { provide: EmailService, useValue: email },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  const user = (o: Partial<User> = {}): any => ({
    id: 'u1', email: 'a@b.com', password: 'hash', nom: 'D', prenom: 'J',
    role: Role.CLIENT, actif: true, emailVerified: true, twoFactorEnabled: false,
    createdAt: new Date(), updatedAt: new Date(), ...o,
  });

  // ── refreshAccessToken ──
  describe('refreshAccessToken', () => {
    it('rejette un token manquant', async () => {
      await expect(service.refreshAccessToken('')).rejects.toThrow(UnauthorizedException);
    });
    it('rejette un format invalide (sans point)', async () => {
      await expect(service.refreshAccessToken('abc')).rejects.toThrow(UnauthorizedException);
    });
    it('rejette si la session est introuvable', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.refreshAccessToken('sid.secret')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── logout ──
  describe('logout', () => {
    it('ne fait rien sans token', async () => {
      await service.logout(undefined);
      expect(userRepo.update).not.toHaveBeenCalled();
    });
    it('révoque la session pour un token valide', async () => {
      await service.logout('session-1.secret');
      expect(userRepo.update).toHaveBeenCalledWith(
        { refreshTokenId: 'session-1' },
        expect.objectContaining({ refreshToken: undefined }),
      );
    });
  });

  // ── getProfile ──
  describe('getProfile', () => {
    it('404 si introuvable', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.getProfile('x')).rejects.toThrow(NotFoundException);
    });
    it('renvoie le profil', async () => {
      userRepo.findOne.mockResolvedValue(user());
      const r = await service.getProfile('u1');
      expect(r).toMatchObject({ id: 'u1', email: 'a@b.com' });
    });
  });

  // ── updateProfile ──
  describe('updateProfile', () => {
    it('404 si introuvable', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.updateProfile('x', { nom: 'X' })).rejects.toThrow(NotFoundException);
    });
    it('conflit si email déjà pris par un autre', async () => {
      userRepo.findOne
        .mockResolvedValueOnce(user())
        .mockResolvedValueOnce(user({ id: 'other', email: 'new@b.com' }));
      await expect(service.updateProfile('u1', { email: 'new@b.com' })).rejects.toThrow(ConflictException);
    });
    it('met à jour les champs', async () => {
      userRepo.findOne.mockResolvedValue(user());
      const r = await service.updateProfile('u1', { nom: 'Nouveau', telephone: '07' });
      expect(r.nom).toBe('Nouveau');
    });
  });

  // ── register (validations) ──
  describe('register', () => {
    it('conflit si email déjà utilisé', async () => {
      userRepo.findOne.mockResolvedValue(user());
      await expect(service.register({ email: 'a@b.com', password: 'ValidPass1', nom: 'D' } as any))
        .rejects.toThrow(ConflictException);
    });
    it('rejette un mot de passe trop court', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.register({ email: 'x@b.com', password: '123', nom: 'D' } as any))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ── requestPasswordReset ──
  describe('requestPasswordReset', () => {
    it('message neutre si email inconnu', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const r = await service.requestPasswordReset('nobody@b.com');
      expect(r.message).toMatch(/Si l'email existe/);
      expect(resetRepo.save).not.toHaveBeenCalled();
    });
    it('crée un token et envoie l\'email si l\'utilisateur existe', async () => {
      userRepo.findOne.mockResolvedValue(user());
      await service.requestPasswordReset('a@b.com');
      expect(resetRepo.save).toHaveBeenCalled();
      expect(email.sendPasswordReset).toHaveBeenCalled();
    });
  });

  // ── resetPassword ──
  describe('resetPassword', () => {
    it('rejette un mot de passe trop court', async () => {
      await expect(service.resetPassword('tok', '123')).rejects.toThrow(BadRequestException);
    });
    it('rejette un token invalide/expiré', async () => {
      resetRepo.findOne.mockResolvedValue(null);
      await expect(service.resetPassword('tok', 'ValidPass1')).rejects.toThrow(BadRequestException);
    });
    it('réinitialise avec un token valide', async () => {
      resetRepo.findOne.mockResolvedValue({
        token: 'tok', used: false, expiresAt: new Date(Date.now() + 3600000), user: user(),
      });
      const r = await service.resetPassword('tok', 'ValidPass1');
      expect(r.message).toMatch(/réinitialisé/);
    });
  });

  // ── verifyEmail ──
  describe('verifyEmail', () => {
    it('rejette un lien invalide/expiré', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.verifyEmail('tok')).rejects.toThrow(BadRequestException);
    });
    it('vérifie avec un token valide', async () => {
      userRepo.findOne.mockResolvedValue(user({
        emailVerified: false,
        emailVerificationExpires: new Date(Date.now() + 3600000),
      }));
      const r = await service.verifyEmail('tok');
      expect(r.emailVerified).toBe(true);
    });
  });

  // ── resendVerificationEmail ──
  describe('resendVerificationEmail', () => {
    it('message neutre toujours', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const r = await service.resendVerificationEmail('x@b.com');
      expect(r.message).toMatch(/Email de vérification/);
    });
    it('renvoie l\'email si compte non vérifié', async () => {
      userRepo.findOne.mockResolvedValue(user({ emailVerified: false }));
      await service.resendVerificationEmail('a@b.com');
      expect(email.sendEmailVerification).toHaveBeenCalled();
    });
  });

  // ── changePassword ──
  describe('changePassword', () => {
    it('404 si introuvable', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.changePassword('x', 'old', 'NewPass12')).rejects.toThrow(NotFoundException);
    });
    it('rejette si mot de passe actuel incorrect', async () => {
      const hash = await bcrypt.hash('realpass', 8);
      userRepo.findOne.mockResolvedValue(user({ password: hash }));
      await expect(service.changePassword('u1', 'wrong', 'NewPass12')).rejects.toThrow(BadRequestException);
    });
    it('rejette un nouveau mot de passe trop court', async () => {
      const hash = await bcrypt.hash('realpass', 8);
      userRepo.findOne.mockResolvedValue(user({ password: hash }));
      await expect(service.changePassword('u1', 'realpass', '123')).rejects.toThrow(BadRequestException);
    });
  });

  // ── 2FA ──
  describe('2FA', () => {
    it('setup2FA renvoie un secret + QR', async () => {
      userRepo.findOne.mockResolvedValue(user());
      const r = await service.setup2FA('u1');
      expect(typeof r.secret).toBe('string');
      expect(r.qrCodeDataUrl).toMatch(/^data:image/);
    });
    it('enable2FA rejette si non configurée', async () => {
      userRepo.findOne.mockResolvedValue(user({ twoFactorSecret: undefined }));
      await expect(service.enable2FA('u1', '000000')).rejects.toThrow(BadRequestException);
    });
    it('disable2FA désactive', async () => {
      userRepo.findOne.mockResolvedValue(user({ twoFactorEnabled: true }));
      const r = await service.disable2FA('u1');
      expect(r.twoFactorEnabled).toBe(false);
    });
    it('verifyTwoFactorLogin rejette un token expiré', async () => {
      jwt.verify.mockImplementation(() => { throw new Error('expired'); });
      await expect(service.verifyTwoFactorLogin('bad', '123456')).rejects.toThrow(UnauthorizedException);
    });
    it('verifyTwoFactorLogin rejette un mauvais type de token', async () => {
      jwt.verify.mockReturnValue({ type: 'autre', sub: 'u1' });
      await expect(service.verifyTwoFactorLogin('tok', '123456')).rejects.toThrow(UnauthorizedException);
    });
  });
});
