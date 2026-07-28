import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AdminService } from './admin.service';
import { User, Role } from '../auth/entities/user.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { AuditLog } from '../common/entities/audit-log.entity';
import { CompteB2B } from '../b2b/entities/compte-b2b.entity';
import { SystemConfig } from '../common/entities/system-config.entity';
import { Integration } from '../common/entities/integration.entity';
import { CommissionPlateforme } from '../commandes/entities/commission-plateforme.entity';
import { FactureMensuelleB2B } from '../b2b/entities/facture-mensuelle-b2b.entity';
import { PaymentMethod } from '../paiements/entities/payment-method.entity';

describe('AdminService', () => {
  let service: AdminService;
  const userRepo: any = {};
  const restoRepo: any = {};
  const auditRepo: any = {};
  const b2bRepo: any = {};
  const configRepo: any = {};
  const integRepo: any = {};
  const factureRepo: any = {};
  const paymentRepo: any = {};

  beforeEach(async () => {
    Object.assign(userRepo, {
      findOne: jest.fn(),
      create: jest.fn((u) => u),
      save: jest.fn((u) => Promise.resolve({ id: 'u1', ...u })),
    });
    Object.assign(restoRepo, {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((r) => r),
      save: jest.fn((r) => Promise.resolve({ id: 'r1', ...r })),
    });
    Object.assign(auditRepo, { create: jest.fn((a) => a), save: jest.fn() });
    Object.assign(b2bRepo, {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn((c) => Promise.resolve(c)),
    });
    Object.assign(configRepo, {
      findOne: jest.fn(),
      create: jest.fn((c) => c),
      save: jest.fn((c) => Promise.resolve({ ...c, updatedAt: new Date() })),
    });
    Object.assign(integRepo, {
      findOne: jest.fn(),
      create: jest.fn((i) => i),
      save: jest.fn((i) => Promise.resolve({ id: 'i1', ...i })),
      remove: jest.fn(),
    });
    Object.assign(factureRepo, {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn((f) => Promise.resolve(f)),
    });
    Object.assign(paymentRepo, {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((m) => m),
      save: jest.fn((m) => Promise.resolve(m)),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Restaurant), useValue: restoRepo },
        { provide: getRepositoryToken(AuditLog), useValue: auditRepo },
        { provide: getRepositoryToken(CompteB2B), useValue: b2bRepo },
        { provide: getRepositoryToken(SystemConfig), useValue: configRepo },
        { provide: getRepositoryToken(Integration), useValue: integRepo },
        { provide: getRepositoryToken(CommissionPlateforme), useValue: {} },
        { provide: getRepositoryToken(FactureMensuelleB2B), useValue: factureRepo },
        { provide: getRepositoryToken(PaymentMethod), useValue: paymentRepo },
      ],
    }).compile();
    service = module.get(AdminService);
  });

  // ── Utilisateurs ──
  describe('createUser', () => {
    it('conflit si email existe', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'x' });
      await expect(service.createUser({ nom: 'D', email: 'a@b.com', password: 'p', role: Role.CLIENT } as any))
        .rejects.toThrow(ConflictException);
    });
    it('crée et ne renvoie pas le mot de passe', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const r: any = await service.createUser({ nom: 'D', email: 'a@b.com', password: 'ValidPass1', role: Role.CLIENT } as any);
      expect(r.password).toBeUndefined();
      expect(r.email).toBe('a@b.com');
    });
  });

  describe('updateUser', () => {
    it('404 si introuvable', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.updateUser('x', { nom: 'Z' })).rejects.toThrow(NotFoundException);
    });
    it('met à jour', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u1', nom: 'A', password: 'h' });
      const r: any = await service.updateUser('u1', { nom: 'B' });
      expect(r.nom).toBe('B');
      expect(r.password).toBeUndefined();
    });
  });

  describe('toggleUser', () => {
    it('404 si introuvable', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.toggleUser('x')).rejects.toThrow(NotFoundException);
    });
    it('inverse actif', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u1', actif: true });
      expect(await service.toggleUser('u1')).toEqual({ id: 'u1', actif: false });
    });
  });

  // ── Restaurants ──
  describe('restaurants', () => {
    it('getRestaurants liste (plafond 500)', async () => {
      await service.getRestaurants();
      expect(restoRepo.find).toHaveBeenCalledWith(expect.objectContaining({ take: 500 }));
    });
    it('createRestaurant crée actif', async () => {
      const r: any = await service.createRestaurant({ nom: 'R', telephone: '07', adresse: 'A' });
      expect(r.actif).toBe(true);
    });
    it('updateRestaurant 404 si introuvable', async () => {
      restoRepo.findOne.mockResolvedValue(null);
      await expect(service.updateRestaurant('x', { nom: 'Z' })).rejects.toThrow(NotFoundException);
    });
    it('toggleRestaurant inverse actif', async () => {
      restoRepo.findOne.mockResolvedValue({ id: 'r1', actif: false });
      expect(await service.toggleRestaurant('r1')).toEqual({ id: 'r1', actif: true });
    });
    it('updateTauxCommission rejette un taux invalide', async () => {
      restoRepo.findOne.mockResolvedValue({ id: 'r1' });
      await expect(service.updateTauxCommission('r1', 80)).rejects.toThrow(BadRequestException);
    });
    it('updateTauxCommission applique un taux valide', async () => {
      restoRepo.findOne.mockResolvedValue({ id: 'r1' });
      expect(await service.updateTauxCommission('r1', 8)).toEqual({ restaurantId: 'r1', tauxCommission: 8 });
    });
  });

  // ── B2B ──
  describe('B2B', () => {
    it('getPendingB2B filtre EN_ATTENTE', async () => {
      await service.getPendingB2B();
      expect(b2bRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: { statutValidation: 'EN_ATTENTE' } }));
    });
    it('validateB2B 404 si introuvable', async () => {
      b2bRepo.findOne.mockResolvedValue(null);
      await expect(service.validateB2B('x', 'admin', true)).rejects.toThrow(NotFoundException);
    });
    it('validateB2B approuve', async () => {
      b2bRepo.findOne.mockResolvedValue({ id: 'c1' });
      const r: any = await service.validateB2B('c1', 'admin', true);
      expect(r.statutValidation).toBe('VALIDE');
      expect(r.actif).toBe(true);
    });
    it('resolveContestation 404 si facture absente', async () => {
      factureRepo.findOne.mockResolvedValue(null);
      await expect(service.resolveContestation('x', 'admin', true, 'note')).rejects.toThrow(NotFoundException);
    });
    it('resolveContestation trace un audit', async () => {
      factureRepo.findOne.mockResolvedValue({ id: 'f1', numeroFacture: 'F1' });
      await service.resolveContestation('f1', 'admin', false, 'ok');
      expect(auditRepo.save).toHaveBeenCalled();
    });
  });

  // ── Config ──
  describe('setConfig', () => {
    it('rejette une clé inconnue', async () => {
      configRepo.findOne.mockResolvedValue(null);
      await expect(service.setConfig('cle_totalement_inconnue', 'v', 'admin')).rejects.toThrow(BadRequestException);
    });
    it('met à jour une clé existante', async () => {
      configRepo.findOne.mockResolvedValue({ key: 'delivery_enabled', value: 'false' });
      const r = await service.setConfig('delivery_enabled', 'true', 'admin');
      expect(r.key).toBe('delivery_enabled');
    });
  });

  describe('changeAdminPassword', () => {
    it('404 si introuvable', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.changeAdminPassword('x', 'old', 'NewPass12')).rejects.toThrow(NotFoundException);
    });
    it('rejette un mot de passe actuel incorrect', async () => {
      const hash = await bcrypt.hash('realpass', 8);
      userRepo.findOne.mockResolvedValue({ id: 'a1', password: hash });
      await expect(service.changeAdminPassword('a1', 'wrong', 'NewPass12')).rejects.toThrow(BadRequestException);
    });
    it('change le mot de passe', async () => {
      const hash = await bcrypt.hash('realpass', 8);
      userRepo.findOne.mockResolvedValue({ id: 'a1', password: hash });
      expect(await service.changeAdminPassword('a1', 'realpass', 'NewPass12')).toEqual({ success: true });
    });
  });

  // ── Intégrations ──
  describe('intégrations', () => {
    it('createIntegration crée (clé masquée)', async () => {
      const r: any = await service.createIntegration(
        { name: 'NovaSend', type: 'PAYMENT' as any, apiKey: 'secret' }, 'admin',
      );
      expect(r.name).toBe('NovaSend');
    });
    it('updateIntegration 404 si introuvable', async () => {
      integRepo.findOne.mockResolvedValue(null);
      await expect(service.updateIntegration('x', { name: 'Z' })).rejects.toThrow(NotFoundException);
    });
    it('deleteIntegration 404 si introuvable', async () => {
      integRepo.findOne.mockResolvedValue(null);
      await expect(service.deleteIntegration('x')).rejects.toThrow(NotFoundException);
    });
    it('deleteIntegration supprime', async () => {
      integRepo.findOne.mockResolvedValue({ id: 'i1' });
      expect(await service.deleteIntegration('i1')).toEqual({ deleted: 'i1' });
    });
  });

  describe('moyens de paiement', () => {
    it('getPaymentMethods retourne les moyens triés (sans re-seed)', async () => {
      paymentRepo.find.mockResolvedValue([
        {
          id: 'pm1',
          code: 'wave',
          label: 'Wave',
          provider: 'WAVE',
          gateway: 'novasend',
          needsPhone: false,
          enabled: true,
          ordre: 4,
        },
      ]);

      const result = await service.getPaymentMethods();

      // Le seed est fait au boot par PaiementsService — pas ici.
      expect(paymentRepo.save).not.toHaveBeenCalled();
      expect(result).toEqual([
        expect.objectContaining({ code: 'wave', enabled: true }),
      ]);
    });

    it('togglePaymentMethod inverse enabled', async () => {
      paymentRepo.find.mockResolvedValue([{ code: 'wave' }]); // seed no-op
      paymentRepo.findOne.mockResolvedValue({ id: 'pm1', enabled: true });

      const result = await service.togglePaymentMethod('pm1');

      expect(result).toEqual({ id: 'pm1', enabled: false });
      expect(paymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      );
    });

    it('togglePaymentMethod 404 si introuvable', async () => {
      paymentRepo.find.mockResolvedValue([{ code: 'wave' }]);
      paymentRepo.findOne.mockResolvedValue(null);
      await expect(service.togglePaymentMethod('ghost')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
