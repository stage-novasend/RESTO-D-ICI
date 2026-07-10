import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SlaService } from './sla.service';
import { SystemConfig } from '../common/entities/system-config.entity';
import { SlaIncident } from './entities/sla-incident.entity';

describe('SlaService', () => {
  let service: SlaService;
  const configRepo = { findOne: jest.fn(), save: jest.fn(), create: jest.fn((x) => x) };
  const incidentRepo = { find: jest.fn(), save: jest.fn(), create: jest.fn((x) => x) };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlaService,
        { provide: getRepositoryToken(SystemConfig), useValue: configRepo },
        { provide: getRepositoryToken(SlaIncident), useValue: incidentRepo },
      ],
    }).compile();
    service = module.get(SlaService);
  });

  it('renvoie 100% quand aucun incident', async () => {
    // service démarré il y a 10 jours, aucun incident
    const start = new Date(Date.now() - 10 * 86400 * 1000).toISOString();
    configRepo.findOne.mockResolvedValue({ key: 'sla_service_started_at', value: start });
    incidentRepo.find.mockResolvedValue([]);

    const sla = await service.getSla(30);
    expect(sla.uptimePct).toBe(100);
    expect(sla.downtimeSeconds).toBe(0);
  });

  it('déduit la disponibilité des incidents dans la fenêtre', async () => {
    // fenêtre ≈ 10 jours ; un incident de 1h → dispo ≈ 99.58%
    const now = Date.now();
    const start = new Date(now - 10 * 86400 * 1000).toISOString();
    configRepo.findOne.mockResolvedValue({ key: 'sla_service_started_at', value: start });
    incidentRepo.find.mockResolvedValue([
      {
        startedAt: new Date(now - 2 * 86400 * 1000),
        endedAt: new Date(now - 2 * 86400 * 1000 + 3600 * 1000), // +1h
        durationSeconds: 3600,
        reason: 'heartbeat-gap',
      },
    ]);

    const sla = await service.getSla(30);
    expect(sla.downtimeSeconds).toBe(3600);
    expect(sla.uptimePct).toBeLessThan(100);
    expect(sla.uptimePct).toBeGreaterThan(99);
  });
});
