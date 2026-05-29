import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, Role } from '../auth/entities/user.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { AuditLog } from '../common/entities/audit-log.entity';
import { CompteB2B } from '../b2b/entities/compte-b2b.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Restaurant) private restaurantRepo: Repository<Restaurant>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    @InjectRepository(CompteB2B) private b2bRepo: Repository<CompteB2B>,
  ) {}

  async getStats() {
    const [
      totalUsers,
      gerants,
      staff,
      clients,
      b2bUsers,
      admins,
      totalRestaurants,
      activeRestaurants,
      pendingB2B,
      totalAuditLogs,
    ] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { role: Role.GERANT } }),
      this.userRepo.count({ where: { role: Role.STAFF } }),
      this.userRepo.count({ where: { role: Role.CLIENT } }),
      this.userRepo.count({ where: { role: Role.B2B } }),
      this.userRepo.count({ where: { role: Role.ADMIN } }),
      this.restaurantRepo.count(),
      this.restaurantRepo.count({ where: { actif: true } }),
      this.b2bRepo.count({ where: { statutValidation: 'EN_ATTENTE' } }),
      this.auditRepo.count(),
    ]);

    return {
      users: { total: totalUsers, gerants, staff, clients, b2b: b2bUsers, admins },
      restaurants: { total: totalRestaurants, active: activeRestaurants },
      b2b: { pending: pendingB2B },
      audit: { total: totalAuditLogs },
    };
  }

  async getUsers(query: { role?: string; search?: string; actif?: string }) {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.restaurant', 'r')
      .orderBy('u.createdAt', 'DESC')
      .select([
        'u.id', 'u.nom', 'u.prenom', 'u.email', 'u.role',
        'u.actif', 'u.telephone', 'u.createdAt', 'r.id', 'r.nom',
      ]);

    if (query.role) qb.andWhere('u.role = :role', { role: query.role });
    if (query.search) {
      qb.andWhere(
        '(u.nom ILIKE :s OR u.prenom ILIKE :s OR u.email ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }
    if (query.actif !== undefined) {
      qb.andWhere('u.actif = :actif', { actif: query.actif === 'true' });
    }

    return qb.getMany();
  }

  async createUser(dto: {
    nom: string;
    prenom?: string;
    email: string;
    password: string;
    role: Role;
    restaurantId?: string;
    telephone?: string;
  }) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email déjà utilisé');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      nom: dto.nom,
      prenom: dto.prenom,
      email: dto.email,
      password: hashed,
      role: dto.role,
      telephone: dto.telephone,
      emailVerified: true,
      actif: true,
    });

    if (dto.restaurantId) {
      const restaurant = await this.restaurantRepo.findOne({ where: { id: dto.restaurantId } });
      if (restaurant) user.restaurant = restaurant;
    }

    const saved = await this.userRepo.save(user);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _p, ...result } = saved as any;
    return result;
  }

  async updateUser(
    id: string,
    dto: Partial<{
      nom: string;
      prenom: string;
      email: string;
      role: Role;
      telephone: string;
      restaurantId: string;
      actif: boolean;
    }>,
  ) {
    const user = await this.userRepo.findOne({ where: { id }, relations: ['restaurant'] });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const { restaurantId, ...rest } = dto;
    Object.assign(user, rest);

    if (restaurantId !== undefined) {
      if (restaurantId) {
        const restaurant = await this.restaurantRepo.findOne({ where: { id: restaurantId } });
        user.restaurant = restaurant ?? undefined;
      } else {
        user.restaurant = undefined;
      }
    }

    const saved = await this.userRepo.save(user);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _p, ...result } = saved as any;
    return result;
  }

  async toggleUser(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    user.actif = !user.actif;
    await this.userRepo.save(user);
    return { id: user.id, actif: user.actif };
  }

  async getRestaurants() {
    return this.restaurantRepo.find({
      relations: ['users'],
      order: { createdAt: 'DESC' },
    });
  }

  async createRestaurant(dto: {
    nom: string;
    telephone: string;
    adresse: string;
    email?: string;
    description?: string;
  }) {
    const r = this.restaurantRepo.create({ ...dto, actif: true });
    return this.restaurantRepo.save(r);
  }

  async updateRestaurant(
    id: string,
    dto: Partial<{ nom: string; telephone: string; adresse: string; email: string; actif: boolean }>,
  ) {
    const r = await this.restaurantRepo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Restaurant introuvable');
    Object.assign(r, dto);
    return this.restaurantRepo.save(r);
  }

  async toggleRestaurant(id: string) {
    const r = await this.restaurantRepo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Restaurant introuvable');
    r.actif = !r.actif;
    await this.restaurantRepo.save(r);
    return { id: r.id, actif: r.actif };
  }

  async getAuditLogs(query: {
    userId?: string;
    action?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) {
    const qb = this.auditRepo
      .createQueryBuilder('al')
      .orderBy('al.createdAt', 'DESC')
      .take(Math.min(query.limit || 100, 500));

    if (query.userId) qb.andWhere('al.userId = :uid', { uid: query.userId });
    if (query.action) qb.andWhere('al.action ILIKE :act', { act: `%${query.action}%` });
    if (query.from) qb.andWhere('al.createdAt >= :from', { from: new Date(query.from) });
    if (query.to) qb.andWhere('al.createdAt <= :to', { to: new Date(query.to) });

    return qb.getMany();
  }

  async getPendingB2B() {
    return this.b2bRepo.find({
      where: { statutValidation: 'EN_ATTENTE' },
      relations: ['responsable'],
      order: { createdAt: 'DESC' },
    });
  }

  async validateB2B(id: string, adminId: string, approved: boolean) {
    const compte = await this.b2bRepo.findOne({ where: { id }, relations: ['responsable'] });
    if (!compte) throw new NotFoundException('Compte B2B introuvable');

    compte.statutValidation = approved ? 'VALIDE' : 'REJETE';
    compte.actif = approved;
    compte.validePar = adminId;
    compte.dateValidation = new Date();

    return this.b2bRepo.save(compte);
  }

  async exportSyscohadaCsv(): Promise<string> {
    const rows = [
      'Date,Libellé,Débit,Crédit,N° Compte,Pièce',
    ];

    // Pull from audit logs anything payment-related as a stub
    const logs = await this.auditRepo
      .createQueryBuilder('al')
      .where("al.action ILIKE '%PAIEMENT%'")
      .orderBy('al.createdAt', 'ASC')
      .take(200)
      .getMany();

    for (const log of logs) {
      const date = log.createdAt.toISOString().slice(0, 10);
      const montant = (log.payload as any)?.montant ?? 0;
      rows.push(`${date},"${log.action}",${montant},0,7011,${log.id.slice(0, 8)}`);
    }

    return rows.join('\n');
  }
}
