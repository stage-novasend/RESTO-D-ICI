import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CommandesService } from './commandes.service';
import { Commande, StatutCommande } from './entities/commande.entity';
import { LigneCommande } from './entities/ligne-commande.entity';
import { AvisCommande } from './entities/avis-commande.entity';
import { CommandeStatusHistory } from './entities/commande-status-history.entity';
import { CommissionPlateforme } from './entities/commission-plateforme.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { CommandesGateway } from './commandes.gateway';
import { TresorerieService } from '../tresorerie/tresorerie.service';
import { PromosService } from '../promos/promos.service';
import { SmsService } from '../notifications/sms.service';
import { FcmService } from '../notifications/fcm.service';
import { NotificationsService } from '../notifications/notifications.service';

// Couvre les méthodes de lecture / avis / historique non testées par le spec principal.
describe('CommandesService — méthodes complémentaires', () => {
  let service: CommandesService;
  const cmdRepo: any = {};
  const avisRepo: any = {};
  const restoRepo: any = {};
  const historyRepo: any = {};

  beforeEach(async () => {
    Object.assign(cmdRepo, {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((c) => Promise.resolve(c)),
      create: jest.fn((c) => c),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    });
    Object.assign(avisRepo, {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn((a) => Promise.resolve({ id: 'avis-1', ...a })),
      create: jest.fn((a) => a),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ nb: '0', moyenne: null }),
      }),
    });
    Object.assign(restoRepo, { findOne: jest.fn(), update: jest.fn() });
    Object.assign(historyRepo, {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      create: jest.fn((v) => v),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommandesService,
        { provide: getRepositoryToken(Commande), useValue: cmdRepo },
        { provide: getRepositoryToken(LigneCommande), useValue: { save: jest.fn(), create: jest.fn() } },
        { provide: getRepositoryToken(AvisCommande), useValue: avisRepo },
        { provide: getRepositoryToken(CommandeStatusHistory), useValue: historyRepo },
        { provide: getRepositoryToken(Restaurant), useValue: restoRepo },
        { provide: getRepositoryToken(CommissionPlateforme), useValue: { save: jest.fn(), create: jest.fn() } },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
        { provide: CommandesGateway, useValue: { emitToManagers: jest.fn(), emitToKitchen: jest.fn(), emitToClient: jest.fn() } },
        { provide: TresorerieService, useValue: {} },
        { provide: PromosService, useValue: {} },
        { provide: SmsService, useValue: {} },
        { provide: FcmService, useValue: {} },
        { provide: NotificationsService, useValue: { create: jest.fn().mockResolvedValue({ id: 'n1' }) } },
      ],
    }).compile();
    service = module.get(CommandesService);
  });

  const cmd = (o: any = {}): any => ({
    id: 'cmd-1', numero: 'CMD-2026-X', statut: StatutCommande.RECUE,
    montantTotal: 5000, client: { id: 'client-1' }, restaurant: { id: 'resto-1' },
    createdAt: new Date(), updatedAt: new Date(), ...o,
  });

  describe('findAllByUser', () => {
    it('filtre par client, limite 20', async () => {
      cmdRepo.find.mockResolvedValue([cmd()]);
      const r = await service.findAllByUser('client-1');
      expect(cmdRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { client: { id: 'client-1' } }, take: 20 }),
      );
      expect(r).toHaveLength(1);
    });
  });

  describe('findAllForRestaurant', () => {
    it('applique limit/offset', async () => {
      cmdRepo.find.mockResolvedValue([]);
      await service.findAllForRestaurant('resto-1', 10, 5);
      expect(cmdRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 5 }),
      );
    });
  });

  describe('findOne', () => {
    it('404 si introuvable', async () => {
      cmdRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
    });
    it('403 si mauvais client', async () => {
      cmdRepo.findOne.mockResolvedValue(cmd());
      await expect(service.findOne('cmd-1', 'autre-client')).rejects.toThrow(ForbiddenException);
    });
    it('403 si mauvais restaurant', async () => {
      cmdRepo.findOne.mockResolvedValue(cmd());
      await expect(service.findOne('cmd-1', undefined, 'autre-resto')).rejects.toThrow(ForbiddenException);
    });
    it('renvoie la commande si accès valide', async () => {
      cmdRepo.findOne.mockResolvedValue(cmd());
      expect(await service.findOne('cmd-1', 'client-1', 'resto-1')).toMatchObject({ id: 'cmd-1' });
    });
  });

  describe('setDelai', () => {
    it('404 si introuvable', async () => {
      cmdRepo.findOne.mockResolvedValue(null);
      await expect(service.setDelai('x', 30)).rejects.toThrow(NotFoundException);
    });
    it('enregistre le délai', async () => {
      cmdRepo.findOne.mockResolvedValue(cmd());
      const r = await service.setDelai('cmd-1', 30);
      expect(r.delaiEstime).toBe(30);
    });
  });

  describe('updateS3Key', () => {
    it('met à jour la clé S3', async () => {
      await service.updateS3Key('cmd-1', 'key/recu.pdf');
      expect(cmdRepo.update).toHaveBeenCalledWith('cmd-1', { recuPdfS3Key: 'key/recu.pdf' });
    });
  });

  describe('annulerByClient', () => {
    it('404 si introuvable', async () => {
      cmdRepo.findOne.mockResolvedValue(null);
      await expect(service.annulerByClient('x', 'client-1')).rejects.toThrow(NotFoundException);
    });
    it('refuse si déjà en préparation/terminée', async () => {
      cmdRepo.findOne.mockResolvedValue(cmd({ statut: StatutCommande.EN_PREP }));
      await expect(service.annulerByClient('cmd-1', 'client-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitAvis', () => {
    it('rejette une note hors 1-5', async () => {
      await expect(service.submitAvis('cmd-1', 'client-1', 6)).rejects.toThrow(BadRequestException);
    });
    it('404 si commande introuvable', async () => {
      cmdRepo.findOne.mockResolvedValue(null);
      await expect(service.submitAvis('x', 'client-1', 5)).rejects.toThrow(NotFoundException);
    });
    it('403 si autre client', async () => {
      cmdRepo.findOne.mockResolvedValue(cmd({ statut: StatutCommande.LIVREE }));
      await expect(service.submitAvis('cmd-1', 'autre', 5)).rejects.toThrow(ForbiddenException);
    });
    it('refuse si commande non livrée', async () => {
      cmdRepo.findOne.mockResolvedValue(cmd({ statut: StatutCommande.RECUE }));
      await expect(service.submitAvis('cmd-1', 'client-1', 5)).rejects.toThrow(BadRequestException);
    });
    it('refuse un avis déjà soumis', async () => {
      cmdRepo.findOne.mockResolvedValue(cmd({ statut: StatutCommande.LIVREE }));
      avisRepo.findOne.mockResolvedValue({ id: 'existing' });
      await expect(service.submitAvis('cmd-1', 'client-1', 5)).rejects.toThrow(BadRequestException);
    });
    it('enregistre l\'avis et recalcule la moyenne (agrégation SQL)', async () => {
      cmdRepo.findOne.mockResolvedValue(cmd({ statut: StatutCommande.LIVREE }));
      avisRepo.findOne.mockResolvedValue(null);
      avisRepo
        .createQueryBuilder()
        .getRawOne.mockResolvedValue({ nb: '2', moyenne: '4.5' });
      const r = await service.submitAvis('cmd-1', 'client-1', 5, 'Super');
      expect(r.nbAvis).toBe(2);
      expect(r.noteMoyenne).toBe(4.5);
      expect(restoRepo.update).toHaveBeenCalled();
    });
  });

  describe('getAvisForOrder', () => {
    it('renvoie l\'avis du client', async () => {
      avisRepo.findOne.mockResolvedValue({ id: 'avis-1', note: 5 });
      expect(await service.getAvisForOrder('cmd-1', 'client-1')).toMatchObject({ note: 5 });
    });
  });

  describe('getCommandeHistory', () => {
    it('404 si commande introuvable', async () => {
      cmdRepo.findOne.mockResolvedValue(null);
      await expect(service.getCommandeHistory('x')).rejects.toThrow(NotFoundException);
    });
    it('403 si mauvais client', async () => {
      cmdRepo.findOne.mockResolvedValue(cmd());
      await expect(service.getCommandeHistory('cmd-1', 'autre')).rejects.toThrow(ForbiddenException);
    });
    it('renvoie l\'historique trié', async () => {
      cmdRepo.findOne.mockResolvedValue(cmd());
      historyRepo.find.mockResolvedValue([{ id: 'h1' }]);
      const r = await service.getCommandeHistory('cmd-1', 'client-1');
      expect(r).toHaveLength(1);
    });
  });
});
