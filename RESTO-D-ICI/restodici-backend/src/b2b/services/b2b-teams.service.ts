import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { User } from '../../auth/entities/user.entity';
import { CreateTeamDto } from '../dto/create-team.dto';
import { AddTeamMemberDto } from '../dto/add-team-member.dto';

/**
 * Équipes B2B (Team / TeamMember). Domaine extrait de B2BService : autonome,
 * n'utilise que ses propres repos (Team, TeamMember, User) et aucun helper
 * partagé.
 */
@Injectable()
export class B2bTeamsService {
  constructor(
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createTeam(userId: string, createTeamDto: CreateTeamDto): Promise<Team> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || user.role !== 'B2B') {
      throw new ForbiddenException('Only B2B users can create teams');
    }

    const team = this.teamRepository.create({
      ...createTeamDto,
      createdByUserId: userId,
    });

    const savedTeam = await this.teamRepository.save(team);

    const teamMember = this.teamMemberRepository.create({
      teamId: savedTeam.id,
      userId: userId,
      role: 'OWNER',
    });
    await this.teamMemberRepository.save(teamMember);

    return savedTeam;
  }

  async getTeamsByUser(userId: string): Promise<Team[]> {
    const teamMembers = await this.teamMemberRepository.find({
      where: { userId: userId, active: true },
      relations: ['team'],
    });
    return teamMembers.map((tm) => tm.team);
  }

  async addTeamMember(
    teamId: string,
    currentUserId: string,
    addTeamMemberDto: AddTeamMemberDto,
  ): Promise<TeamMember> {
    const currentUserMember = await this.teamMemberRepository.findOne({
      where: { teamId: teamId, userId: currentUserId, active: true },
    });
    if (
      !currentUserMember ||
      (currentUserMember.role !== 'ADMIN' && currentUserMember.role !== 'OWNER')
    ) {
      throw new ForbiddenException('Only team admins/owners can add members');
    }

    const targetUser = await this.userRepository.findOne({
      where: { id: addTeamMemberDto.userId },
    });
    if (!targetUser || targetUser.role !== 'B2B') {
      throw new BadRequestException('Target user must be a B2B user');
    }

    const existingMember = await this.teamMemberRepository.findOne({
      where: { teamId: teamId, userId: addTeamMemberDto.userId },
    });
    if (existingMember) {
      if (!existingMember.active) {
        existingMember.active = true;
        existingMember.role = addTeamMemberDto.role;
        return this.teamMemberRepository.save(existingMember);
      }
      throw new BadRequestException('User is already a member of this team');
    }

    const teamMember = this.teamMemberRepository.create({
      teamId: teamId,
      userId: addTeamMemberDto.userId,
      role: addTeamMemberDto.role,
    });

    return this.teamMemberRepository.save(teamMember);
  }

  async removeTeamMember(
    teamId: string,
    currentUserId: string,
    targetUserId: string,
  ): Promise<void> {
    const currentUserMember = await this.teamMemberRepository.findOne({
      where: { teamId: teamId, userId: currentUserId, active: true },
    });
    if (!currentUserMember) {
      throw new ForbiddenException('You are not a member of this team');
    }

    if (currentUserId !== targetUserId && currentUserMember.role !== 'OWNER') {
      throw new ForbiddenException('Only team owners can remove other members');
    }

    const targetMember = await this.teamMemberRepository.findOne({
      where: { teamId: teamId, userId: targetUserId, active: true },
    });
    if (!targetMember) {
      throw new NotFoundException('Team member not found');
    }

    targetMember.active = false;
    await this.teamMemberRepository.save(targetMember);
  }

  async getUserTeams(userId: string): Promise<Team[]> {
    const teamMembers = await this.teamMemberRepository.find({
      where: { userId: userId, active: true },
      relations: ['team'],
    });
    return teamMembers.map((tm) => tm.team);
  }

  async isUserB2B(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    return user?.role === 'B2B';
  }
}
