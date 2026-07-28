import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { B2bTeamsService } from './b2b-teams.service';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { User } from '../../auth/entities/user.entity';

const teamRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
};
const teamMemberRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
};
const userRepository = { findOne: jest.fn() };

async function buildService(): Promise<B2bTeamsService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      B2bTeamsService,
      { provide: getRepositoryToken(Team), useValue: teamRepository },
      { provide: getRepositoryToken(TeamMember), useValue: teamMemberRepository },
      { provide: getRepositoryToken(User), useValue: userRepository },
    ],
  }).compile();
  return module.get<B2bTeamsService>(B2bTeamsService);
}

// ─── createTeam() ─────────────────────────────────────────────────────────────

describe('B2bTeamsService createTeam()', () => {
  let service: B2bTeamsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    service = await buildService();
  });

  it('crée une équipe et ajoute le créateur comme OWNER', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'b2b-1', role: 'B2B' });
    const savedTeam = { id: 'team-uuid-1', name: 'Équipe RH', createdByUserId: 'b2b-1' };
    teamRepository.create.mockReturnValue(savedTeam);
    teamRepository.save.mockResolvedValue(savedTeam);
    teamMemberRepository.create.mockReturnValue({ teamId: 'team-uuid-1', userId: 'b2b-1', role: 'OWNER' });
    teamMemberRepository.save.mockResolvedValue(undefined);

    const result = await service.createTeam('b2b-1', { name: 'Équipe RH' } as any);

    expect(teamRepository.save).toHaveBeenCalled();
    expect(teamMemberRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'b2b-1', role: 'OWNER' }),
    );
    expect(result).toMatchObject({ id: 'team-uuid-1', name: 'Équipe RH' });
  });

  it('lève ForbiddenException si l\'utilisateur n\'est pas B2B', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'staff-1', role: 'STAFF' });

    await expect(
      service.createTeam('staff-1', { name: 'Équipe X' } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lève ForbiddenException si l\'utilisateur est introuvable', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createTeam('ghost-id', { name: 'Équipe Y' } as any),
    ).rejects.toThrow(ForbiddenException);
  });
});

// ─── addTeamMember() ──────────────────────────────────────────────────────────

describe('B2bTeamsService addTeamMember()', () => {
  let service: B2bTeamsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    service = await buildService();
  });

  it('ajoute un membre B2B à l\'équipe si l\'appelant est OWNER', async () => {
    teamMemberRepository.findOne
      .mockResolvedValueOnce({ teamId: 'team-1', userId: 'owner-1', role: 'OWNER', active: true })
      .mockResolvedValueOnce(null);
    userRepository.findOne.mockResolvedValue({ id: 'new-member', role: 'B2B' });
    const newMember = { teamId: 'team-1', userId: 'new-member', role: 'MEMBER' };
    teamMemberRepository.create.mockReturnValue(newMember);
    teamMemberRepository.save.mockResolvedValue(newMember);

    const result = await service.addTeamMember('team-1', 'owner-1', {
      userId: 'new-member',
      role: 'MEMBER',
    } as any);

    expect(teamMemberRepository.save).toHaveBeenCalled();
    expect(result).toMatchObject({ userId: 'new-member', role: 'MEMBER' });
  });

  it('lève ForbiddenException si l\'appelant n\'est pas ADMIN/OWNER', async () => {
    teamMemberRepository.findOne.mockResolvedValueOnce({
      teamId: 'team-1',
      userId: 'member-1',
      role: 'MEMBER',
      active: true,
    });

    await expect(
      service.addTeamMember('team-1', 'member-1', { userId: 'new-user', role: 'MEMBER' } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lève BadRequestException si la cible n\'est pas un utilisateur B2B', async () => {
    teamMemberRepository.findOne.mockResolvedValueOnce({
      teamId: 'team-1',
      userId: 'owner-1',
      role: 'OWNER',
      active: true,
    });
    userRepository.findOne.mockResolvedValue({ id: 'client-99', role: 'CLIENT' });

    await expect(
      service.addTeamMember('team-1', 'owner-1', { userId: 'client-99', role: 'MEMBER' } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('lève BadRequestException si l\'utilisateur est déjà membre actif', async () => {
    teamMemberRepository.findOne
      .mockResolvedValueOnce({ teamId: 'team-1', userId: 'owner-1', role: 'OWNER', active: true })
      .mockResolvedValueOnce({ teamId: 'team-1', userId: 'existing-member', active: true });
    userRepository.findOne.mockResolvedValue({ id: 'existing-member', role: 'B2B' });

    await expect(
      service.addTeamMember('team-1', 'owner-1', { userId: 'existing-member', role: 'MEMBER' } as any),
    ).rejects.toThrow(BadRequestException);
  });
});

// ─── removeTeamMember() ───────────────────────────────────────────────────────

describe('B2bTeamsService removeTeamMember()', () => {
  let service: B2bTeamsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    service = await buildService();
  });

  it('désactive le membre cible (active=false)', async () => {
    const ownerMembership = { teamId: 'team-1', userId: 'owner-1', role: 'OWNER', active: true };
    const targetMembership = { teamId: 'team-1', userId: 'target-1', active: true };
    teamMemberRepository.findOne
      .mockResolvedValueOnce(ownerMembership)
      .mockResolvedValueOnce(targetMembership);
    teamMemberRepository.save.mockResolvedValue({ ...targetMembership, active: false });

    await service.removeTeamMember('team-1', 'owner-1', 'target-1');

    expect(teamMemberRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ active: false }),
    );
  });

  it('lève ForbiddenException si l\'appelant n\'est pas membre de l\'équipe', async () => {
    teamMemberRepository.findOne.mockResolvedValueOnce(null);

    await expect(
      service.removeTeamMember('team-1', 'stranger-1', 'target-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lève ForbiddenException si un non-OWNER tente de retirer quelqu\'un d\'autre', async () => {
    teamMemberRepository.findOne.mockResolvedValueOnce({
      teamId: 'team-1',
      userId: 'member-1',
      role: 'MEMBER',
      active: true,
    });

    await expect(
      service.removeTeamMember('team-1', 'member-1', 'other-member'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lève NotFoundException si le membre cible est introuvable', async () => {
    teamMemberRepository.findOne
      .mockResolvedValueOnce({ teamId: 'team-1', userId: 'owner-1', role: 'OWNER', active: true })
      .mockResolvedValueOnce(null);

    await expect(
      service.removeTeamMember('team-1', 'owner-1', 'ghost-member'),
    ).rejects.toThrow(NotFoundException);
  });
});
