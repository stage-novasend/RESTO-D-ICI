import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PromosService } from './promos.service';
import { PromoCode, TypePromo, VisibilitePromo } from './entities/promo-code.entity';
import { Commande } from '../commandes/entities/commande.entity';

const mockCommandeRepo = { find: jest.fn(), findOne: jest.fn() };

const mockUpdateQb = {
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({ affected: 1 }),
};

const mockPromoRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  increment: jest.fn(),
  createQueryBuilder: jest.fn(() => mockUpdateQb),
};

function makePromo(overrides: Partial<PromoCode> = {}): PromoCode {
  return {
    id: 'promo-uuid-1',
    code: 'TEST10',
    type: TypePromo.PERCENT,
    valeur: 20,
    description: undefined,
    minMontant: 0,
    maxUses: undefined,
    usedCount: 0,
    expiresAt: undefined,
    actif: true,
    visibilite: VisibilitePromo.TOUS,
    restaurantId: 'resto-1',
    restaurant: undefined as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('PromosService', () => {
  let service: PromosService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromosService,
        {
          provide: getRepositoryToken(PromoCode),
          useValue: mockPromoRepo,
        },
        {
          provide: getRepositoryToken(Commande),
          useValue: mockCommandeRepo,
        },
      ],
    }).compile();

    service = module.get<PromosService>(PromosService);
  });

  // ─── validate() ────────────────────────────────────────────────────────────

  describe('validate()', () => {
    it('throws BadRequestException when code is not found', async () => {
      mockPromoRepo.findOne.mockResolvedValue(null);

      await expect(
        service.validate('MISSING', 'resto-1', 5000),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when code is inactive', async () => {
      mockPromoRepo.findOne.mockResolvedValue(makePromo({ actif: false }));

      await expect(service.validate('TEST10', 'resto-1', 5000)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when code is expired', async () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      mockPromoRepo.findOne.mockResolvedValue(
        makePromo({ expiresAt: pastDate }),
      );

      await expect(service.validate('TEST10', 'resto-1', 5000)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when code is exhausted (maxUses reached)', async () => {
      mockPromoRepo.findOne.mockResolvedValue(
        makePromo({ maxUses: 10, usedCount: 10 }),
      );

      await expect(service.validate('TEST10', 'resto-1', 5000)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when montantCommande is below minMontant', async () => {
      mockPromoRepo.findOne.mockResolvedValue(makePromo({ minMontant: 10000 }));

      await expect(service.validate('TEST10', 'resto-1', 5000)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('returns { valid: true, promo, remise } for a valid code', async () => {
      const promo = makePromo({ type: TypePromo.PERCENT, valeur: 20 });
      mockPromoRepo.findOne.mockResolvedValue(promo);

      const result = await service.validate('TEST10', 'resto-1', 10000);

      expect(result.valid).toBe(true);
      expect(result.promo).toBe(promo);
      expect(result.remise).toBe(2000); // 20% of 10000
    });
  });

  // ─── calcRemise() ──────────────────────────────────────────────────────────

  describe('calcRemise()', () => {
    it('calculates PERCENT discount: 20% of 10000 = 2000', () => {
      const promo = makePromo({ type: TypePromo.PERCENT, valeur: 20 });
      expect(service.calcRemise(promo, 10000)).toBe(2000);
    });

    it('calculates FIXED discount: 500 fixed on 10000', () => {
      const promo = makePromo({ type: TypePromo.FIXED, valeur: 500 });
      expect(service.calcRemise(promo, 10000)).toBe(500);
    });

    it('caps FIXED discount at montant when valeur > montant', () => {
      const promo = makePromo({ type: TypePromo.FIXED, valeur: 1000 });
      expect(service.calcRemise(promo, 500)).toBe(500); // capped at 500
    });
  });

  // ─── apply() ───────────────────────────────────────────────────────────────

  describe('apply()', () => {
    it('incrémente usedCount de façon atomique et bornée (anti double-usage)', async () => {
      await service.apply('promo-uuid-1');

      // Incrément conditionnel : SET usedCount+1 WHERE id ET usedCount < maxUses
      expect(mockUpdateQb.where).toHaveBeenCalledWith('id = :id', {
        id: 'promo-uuid-1',
      });
      expect(mockUpdateQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('maxUses'),
      );
      expect(mockUpdateQb.execute).toHaveBeenCalled();
    });
  });
});
