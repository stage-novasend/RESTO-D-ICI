import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, Role } from '../auth/entities/user.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { AuditLog } from '../common/entities/audit-log.entity';
import { CompteB2B } from '../b2b/entities/compte-b2b.entity';
import { SystemConfig } from '../common/entities/system-config.entity';
import { Integration, IntegrationType } from '../common/entities/integration.entity';

/* ── Clés de config avec leurs métadonnées ── */
const CONFIG_DEFAULTS: Array<{
  key: string;
  value: string | null;
  description: string;
  category: string;
}> = [
  // Sécurité
  { key: 'jwt_ttl_hours',       value: '24',  description: 'Durée de vie du token JWT (heures)', category: 'security' },
  { key: 'rate_limit_auth',     value: '10',  description: 'Requêtes max /auth par minute par IP', category: 'security' },
  { key: 'rate_limit_global',   value: '100', description: 'Requêtes max globales par minute par IP', category: 'security' },
  { key: 'bcrypt_cost',         value: '12',  description: 'Coût bcrypt pour le hachage des mots de passe', category: 'security' },
  // Intégrations
  { key: 'novasend_api_key',    value: null,  description: 'Clé API Novasend (paiement Mobile Money)', category: 'integration' },
  { key: 'novasend_enabled',    value: 'false', description: 'Activer l\'intégration Novasend', category: 'integration' },
  { key: 'firebase_fcm_key',    value: null,  description: 'Server Key Firebase FCM (notifications push)', category: 'integration' },
  { key: 'firebase_enabled',    value: 'true', description: 'Activer les notifications Firebase FCM', category: 'integration' },
  { key: 'twilio_account_sid',  value: null,  description: 'Account SID Twilio (SMS)', category: 'integration' },
  { key: 'twilio_auth_token',   value: null,  description: 'Auth Token Twilio (SMS)', category: 'integration' },
  { key: 'twilio_enabled',      value: 'false', description: 'Activer l\'intégration Twilio SMS', category: 'integration' },
  // Système
  { key: 'timezone',            value: 'Africa/Abidjan', description: 'Fuseau horaire de la plateforme', category: 'system' },
  { key: 'currency',            value: 'FCFA', description: 'Devise utilisée', category: 'system' },
  { key: 'backup_retention_days', value: '90', description: 'Rétention des sauvegardes en jours', category: 'system' },
];

/* Clés masquées dans les réponses API (remplacées par ****) */
const SENSITIVE_KEYS = new Set(['novasend_api_key', 'firebase_fcm_key', 'twilio_auth_token']);

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Restaurant) private restaurantRepo: Repository<Restaurant>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    @InjectRepository(CompteB2B) private b2bRepo: Repository<CompteB2B>,
    @InjectRepository(SystemConfig) private configRepo: Repository<SystemConfig>,
    @InjectRepository(Integration) private integrationRepo: Repository<Integration>,
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

  async getChartData() {
    const now   = new Date();
    const ago30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ago7  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);

    // Inscriptions par jour — 7 derniers jours
    const usersByDayRaw = await this.userRepo
      .createQueryBuilder('u')
      .select("TO_CHAR(u.\"createdAt\", 'YYYY-MM-DD')", 'day')
      .addSelect('COUNT(*)', 'count')
      .where('u."createdAt" >= :ago7', { ago7 })
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany();

    // Activité audit par jour — 7 derniers jours
    const auditByDayRaw = await this.auditRepo
      .createQueryBuilder('al')
      .select("TO_CHAR(al.\"createdAt\", 'YYYY-MM-DD')", 'day')
      .addSelect('COUNT(*)', 'count')
      .where('al."createdAt" >= :ago7', { ago7 })
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany();

    // Heatmap activité — 30 derniers jours (heure × jour semaine)
    const heatmapRaw = await this.auditRepo
      .createQueryBuilder('al')
      .select("EXTRACT(DOW FROM al.\"createdAt\")", 'dow')
      .addSelect("EXTRACT(HOUR FROM al.\"createdAt\")", 'hour')
      .addSelect('COUNT(*)', 'count')
      .where('al."createdAt" >= :ago30', { ago30 })
      .groupBy('dow, hour')
      .getRawMany();

    // Répartition rôles utilisateurs
    const roleDistRaw = await this.userRepo
      .createQueryBuilder('u')
      .select('u.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('u.role')
      .getRawMany();

    // 10 dernières actions d'audit
    const recentLogs = await this.auditRepo
      .createQueryBuilder('al')
      .orderBy('al."createdAt"', 'DESC')
      .take(10)
      .getMany();

    // Normalise jours manquants sur 7 jours
    const days7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ago7.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
      return d.toISOString().slice(0, 10);
    });

    const toMap = (raw: any[]) =>
      Object.fromEntries(raw.map(r => [r.day, parseInt(r.count, 10)]));

    const usersMap = toMap(usersByDayRaw);
    const auditMap = toMap(auditByDayRaw);

    return {
      usersByDay:  days7.map(d => ({ day: d, count: usersMap[d] || 0 })),
      auditByDay:  days7.map(d => ({ day: d, count: auditMap[d] || 0 })),
      heatmap:     heatmapRaw.map(r => ({
        dow:   parseInt(r.dow,   10),
        hour:  parseInt(r.hour,  10),
        count: parseInt(r.count, 10),
      })),
      roleDist:    roleDistRaw.map(r => ({ role: r.role, count: parseInt(r.count, 10) })),
      recentLogs,
    };
  }

  async exportAuditCsv(query: { from?: string; to?: string; action?: string }): Promise<string> {
    const qb = this.auditRepo
      .createQueryBuilder('al')
      .orderBy('al.createdAt', 'DESC')
      .take(5000);
    if (query.action) qb.andWhere('al.action ILIKE :act', { act: `%${query.action}%` });
    if (query.from)   qb.andWhere('al.createdAt >= :from', { from: new Date(query.from) });
    if (query.to)     qb.andWhere('al.createdAt <= :to',   { to: new Date(query.to) });

    const logs = await qb.getMany();
    const rows = ['Date,Heure,Utilisateur,Action,Restaurant,Payload'];
    for (const log of logs) {
      const d   = log.createdAt.toISOString();
      const pay = log.payload ? JSON.stringify(log.payload).replace(/"/g, '""') : '';
      rows.push(`${d.slice(0, 10)},${d.slice(11, 19)},${log.userId},${log.action},${log.restaurantId ?? ''},"${pay}"`);
    }
    return rows.join('\n');
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

  /* ── Configuration système ── */

  async getConfig(): Promise<Array<{
    key: string; value: string | null; description: string; category: string; updatedAt: Date; updatedBy?: string;
  }>> {
    // Seed defaults for any missing keys
    const existing = await this.configRepo.find();
    const existingKeys = new Set(existing.map(c => c.key));

    const toInsert = CONFIG_DEFAULTS.filter(d => !existingKeys.has(d.key));
    if (toInsert.length > 0) {
      await this.configRepo.save(toInsert.map(d => this.configRepo.create(d)));
    }

    const all = await this.configRepo.find({ order: { category: 'ASC', key: 'ASC' } });

    return all.map(c => ({
      key: c.key,
      value: SENSITIVE_KEYS.has(c.key) && c.value ? '••••••••' : c.value,
      description: c.description ?? '',
      category: c.category,
      updatedAt: c.updatedAt,
      updatedBy: c.updatedBy,
    }));
  }

  async setConfig(key: string, value: string | null, adminId: string): Promise<{ key: string; updatedAt: Date }> {
    let entry = await this.configRepo.findOne({ where: { key } });

    if (!entry) {
      const def = CONFIG_DEFAULTS.find(d => d.key === key);
      if (!def) throw new BadRequestException(`Clé de configuration inconnue : ${key}`);
      entry = this.configRepo.create({ ...def });
    }

    entry.value = value;
    entry.updatedBy = adminId;
    const saved = await this.configRepo.save(entry);
    return { key: saved.key, updatedAt: saved.updatedAt };
  }

  async changeAdminPassword(
    adminId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    const user = await this.userRepo.findOne({ where: { id: adminId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) throw new BadRequestException('Mot de passe actuel incorrect');

    user.password = await bcrypt.hash(newPassword, 12);
    await this.userRepo.save(user);
    return { success: true };
  }

  /* ── Intégrations tierces génériques ── */

  private maskIntegration(i: Integration) {
    return {
      ...i,
      apiKey:        i.apiKey        ? '••••••••' : null,
      webhookSecret: i.webhookSecret ? '••••••••' : null,
    };
  }

  private readonly CDC_INTEGRATIONS = [
    {
      name: 'Novasend',
      description: 'Paiement Mobile Money — Orange Money, MTN Mobile Money, Wave (US-11, US-12, RG-16)',
      type: IntegrationType.PAYMENT,
      baseUrl: 'https://api.novasend.ci',
      enabled: false,
    },
    {
      name: 'Firebase FCM',
      description: 'Notifications push temps réel vers les apps clientes et staff (US-07, RG-02)',
      type: IntegrationType.PUSH_NOTIFICATION,
      baseUrl: 'https://fcm.googleapis.com',
      enabled: false,
    },
    {
      name: 'Twilio SMS',
      description: 'Envoi SMS — reçus de paiement, alertes statut commande (US-13, RG-16)',
      type: IntegrationType.SMS,
      baseUrl: 'https://api.twilio.com',
      enabled: false,
    },
    {
      name: 'Resend (Email)',
      description: 'Emails transactionnels — vérification, reset MDP, reçus (RG-16)',
      type: IntegrationType.EMAIL,
      baseUrl: 'https://api.resend.com',
      enabled: false,
    },
  ];

  async getIntegrations() {
    const existing = await this.integrationRepo.find({ order: { createdAt: 'ASC' } });
    const existingNames = new Set(existing.map(i => i.name));

    // Seed CDC integrations if missing
    const toSeed = this.CDC_INTEGRATIONS.filter(c => !existingNames.has(c.name));
    if (toSeed.length > 0) {
      const seeded = await this.integrationRepo.save(toSeed.map(d => this.integrationRepo.create(d)));
      existing.push(...seeded);
    }

    return existing.map(i => this.maskIntegration(i));
  }

  async createIntegration(dto: {
    name: string;
    description?: string;
    type: IntegrationType;
    baseUrl?: string;
    apiKey?: string;
    webhookSecret?: string;
    customHeaders?: Record<string, string>;
    enabled?: boolean;
  }, adminId: string) {
    const entity = this.integrationRepo.create({ ...dto, enabled: dto.enabled ?? false, createdBy: adminId });
    const saved = await this.integrationRepo.save(entity);
    return this.maskIntegration(saved);
  }

  async updateIntegration(id: string, dto: Partial<{
    name: string;
    description: string;
    type: IntegrationType;
    baseUrl: string;
    apiKey: string;
    webhookSecret: string;
    customHeaders: Record<string, string>;
    enabled: boolean;
  }>) {
    const entity = await this.integrationRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Intégration introuvable');

    // Don't overwrite actual key if placeholder was sent back
    if (dto.apiKey === '••••••••') delete dto.apiKey;
    if (dto.webhookSecret === '••••••••') delete dto.webhookSecret;

    Object.assign(entity, dto);
    const saved = await this.integrationRepo.save(entity);
    return this.maskIntegration(saved);
  }

  async deleteIntegration(id: string) {
    const entity = await this.integrationRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Intégration introuvable');
    await this.integrationRepo.remove(entity);
    return { deleted: id };
  }

  async testIntegration(id: string): Promise<{ ok: boolean; statusCode?: number; message: string }> {
    const entity = await this.integrationRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Intégration introuvable');
    if (!entity.baseUrl) return { ok: false, message: 'Aucune URL de base configurée.' };

    try {
      const headers: Record<string, string> = { 'User-Agent': 'RESTODICI-Admin/1.0', ...entity.customHeaders };
      if (entity.apiKey) headers['Authorization'] = `Bearer ${entity.apiKey}`;

      const response = await fetch(entity.baseUrl, { method: 'HEAD', headers, signal: AbortSignal.timeout(5000) });
      const ok = response.status < 500;
      return { ok, statusCode: response.status, message: ok ? `Connexion réussie (HTTP ${response.status})` : `Erreur HTTP ${response.status}` };
    } catch (err: any) {
      return { ok: false, message: `Connexion échouée : ${err.message}` };
    }
  }
}
