import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role, User } from '../../auth/entities/user.entity';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { BulkOrder } from '../entities/bulk-order.entity';
import { Invoice } from '../entities/invoice.entity';
import { CreateTeamDto } from '../dto/create-team.dto';
import { AddTeamMemberDto } from '../dto/add-team-member.dto';
import { CreateBulkOrderDto } from '../dto/create-bulk-order.dto';
import { UpdateBulkOrderStatusDto } from '../dto/update-bulk-order-status.dto';
import * as bcrypt from 'bcrypt';
import { CommandesGateway } from '../../commandes/commandes.gateway';

@Injectable()
export class B2BService {
  constructor(
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(BulkOrder)
    private bulkOrderRepository: Repository<BulkOrder>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private commandesGateway: CommandesGateway,
  ) {}

  // === TEAM MANAGEMENT ===
  async createTeam(
    userId: string,
    createTeamDto: CreateTeamDto,
  ): Promise<Team> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || user.role !== 'B2B') {
      throw new ForbiddenException('Only B2B users can create teams');
    }

    const team = this.teamRepository.create({
      ...createTeamDto,
      createdByUserId: userId,
    });

    const savedTeam = await this.teamRepository.save(team);

    // Add creator as team owner
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
    // Verify current user is team admin/owner
    const currentUserMember = await this.teamMemberRepository.findOne({
      where: { teamId: teamId, userId: currentUserId, active: true },
    });
    if (
      !currentUserMember ||
      (currentUserMember.role !== 'ADMIN' && currentUserMember.role !== 'OWNER')
    ) {
      throw new ForbiddenException('Only team admins/owners can add members');
    }

    // Verify target user exists and is B2B
    const targetUser = await this.userRepository.findOne({
      where: { id: addTeamMemberDto.userId },
    });
    if (!targetUser || targetUser.role !== 'B2B') {
      throw new BadRequestException('Target user must be a B2B user');
    }

    // Check if user is already in team
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
    // Verify current user is team owner or removing themselves
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

  // === BULK ORDER MANAGEMENT ===
  async createBulkOrder(
    userId: string,
    createBulkOrderDto: CreateBulkOrderDto,
  ): Promise<BulkOrder> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || user.role !== 'B2B') {
      throw new ForbiddenException('Only B2B users can create bulk orders');
    }

    const items = createBulkOrderDto.items.map((item) => ({
      articleId: item.articleId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total ?? item.quantity * item.unitPrice,
    }));

    const subtotal =
      createBulkOrderDto.subtotal ??
      items.reduce((sum, item) => sum + Number(item.total), 0);
    const deliveryFee = createBulkOrderDto.deliveryFee ?? 0;
    const total = createBulkOrderDto.total ?? subtotal + deliveryFee;

    const bulkOrder = this.bulkOrderRepository.create({
      items,
      subtotal,
      deliveryFee,
      total,
      deliveryAddress: createBulkOrderDto.deliveryAddress,
      notes: createBulkOrderDto.notes,
      deliveryDateTime: createBulkOrderDto.deliveryDateTime
        ? new Date(createBulkOrderDto.deliveryDateTime)
        : undefined,
      isRecurring: createBulkOrderDto.isRecurring ?? false,
      recurrencePattern: createBulkOrderDto.recurrencePattern,
      createdByUserId: userId,
      status: 'PENDING',
    });

    const savedOrder = await this.bulkOrderRepository.save(bulkOrder);

    this.commandesGateway.emitToManagers('commande.nouvelle', {
      id: savedOrder.id,
      numero: `B2B-${savedOrder.id.slice(0, 8)}`,
      statut: savedOrder.status,
      source: 'B2B',
      montantTotal: Number(savedOrder.total),
      createdAt: savedOrder.createdAt,
    });

    return savedOrder;
  }

  async getBulkOrdersByUser(userId: string): Promise<BulkOrder[]> {
    return this.bulkOrderRepository.find({
      where: { createdByUserId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getOrdersByUser(userId: string): Promise<Record<string, any>[]> {
    const orders = await this.getBulkOrdersByUser(userId);
    return orders.map((order) => this.toOrderResponse(order));
  }

  async getOrdersForManagement(userId: string): Promise<Record<string, any>[]> {
    const orders = await this.bulkOrderRepository.find({
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return orders.map((order) => ({
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      total: Number(order.total),
      type: 'B2B',
      source: order.createdBy?.email ?? order.createdByUserId ?? 'Entreprise',
      livraison: order.deliveryAddress ?? 'Non spécifiée',
      items: (order.items ?? []).map((item) => ({
        nom: item.articleId,
        quantite: Number(item.quantity),
      })),
    }));
  }

  async updateBulkOrderStatus(
    orderId: string,
    currentUserId: string,
    updateDto: UpdateBulkOrderStatusDto,
  ): Promise<BulkOrder> {
    const order = await this.bulkOrderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Bulk order not found');
    }

    // Only allow status updates that make sense
    const validTransitions = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['DELIVERED', 'CANCELLED'],
      DELIVERED: [],
      CANCELLED: [],
    };

    if (!updateDto.status) {
      throw new BadRequestException('status is required');
    }

    if (!validTransitions[order.status]?.includes(updateDto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${updateDto.status}`,
      );
    }

    order.status = updateDto.status;
    const savedOrder = await this.bulkOrderRepository.save(order);

    this.commandesGateway.emitToManagers('commande.statut', {
      id: savedOrder.id,
      numero: `B2B-${savedOrder.id.slice(0, 8)}`,
      statut: savedOrder.status,
      source: 'B2B',
      montantTotal: Number(savedOrder.total),
      updatedAt: savedOrder.updatedAt,
    });

    return savedOrder;
  }

  // === INVOICE MANAGEMENT ===
  async getInvoicesByUser(userId: string): Promise<Record<string, any>[]> {
    const invoices = await this.invoiceRepository.find({
      where: { b2bClientId: userId },
      order: { issueDate: 'DESC' },
    });

    return invoices.map((invoice) => ({
      id: invoice.id,
      month: invoice.issueDate.toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric',
      }),
      amount: Number(invoice.totalAmount),
      status: invoice.status === 'PAID' ? 'paid' : 'pending',
      dueDate: invoice.dueDate.toISOString().slice(0, 10),
      pdfUrl: '#',
      nifRestaurant: 'N/A',
      nifClient: invoice.b2bClientId,
      tva: Number(invoice.taxAmount),
      includesTVA: Number(invoice.taxAmount) > 0,
    }));
  }

  async getInvoiceById(invoiceId: string, userId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, b2bClientId: userId },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  async getDashboard(userId: string): Promise<Record<string, any>> {
    const teamCount = await this.teamRepository.count({
      where: { createdByUserId: userId, active: true },
    });

    const orderCount = await this.bulkOrderRepository.count({
      where: { createdByUserId: userId },
    });

    const invoiceCount = await this.invoiceRepository.count({
      where: { b2bClientId: userId },
    });

    const activeCollaborators = await this.teamMemberRepository
      .createQueryBuilder('member')
      .innerJoin('member.team', 'team')
      .where('member.active = :active', { active: true })
      .andWhere('team.createdByUserId = :userId', { userId })
      .getCount();

    const totalOrderValueResult = await this.bulkOrderRepository
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'sum')
      .where('order.createdByUserId = :userId', { userId })
      .getRawOne();

    const totalOrderValue = parseFloat(totalOrderValueResult?.sum ?? '0');
    const unpaidInvoices = await this.invoiceRepository.count({
      where: { b2bClientId: userId, status: In(['PENDING', 'OVERDUE']) },
    });
    const recentOrders = await this.getOrdersByUser(userId);
    const monthlyBudget = 2000000;

    return {
      totalTeams: teamCount,
      totalOrders: orderCount,
      totalInvoices: invoiceCount,
      activeCollaborators,
      totalOrderValue,
      monthlyExpenses: totalOrderValue,
      monthlyOrders: orderCount,
      unpaidInvoices,
      monthlyBudget,
      budgetUsage:
        monthlyBudget > 0 ? (totalOrderValue / monthlyBudget) * 100 : 0,
      recentOrders: recentOrders.slice(0, 5).map((order) => ({
        id: order.id,
        date: order.dateLivraison,
        amount: order.total,
        status: order.status.toLowerCase(),
      })),
    };
  }

  async getCollaboratorsByUser(userId: string): Promise<any[]> {
    const teamMembers = await this.teamMemberRepository.find({
      where: { active: true },
      relations: ['user', 'team'],
    });

    return teamMembers
      .filter((member) => member.team.createdByUserId === userId)
      .map((member) => ({
        id: member.user.id,
        nom: member.user.nom,
        email: member.user.email,
        role: member.role,
        actif: member.active,
      }));
  }

  async createCollaborator(
    currentUserId: string,
    dto: { nom?: string; email?: string; role?: string },
  ): Promise<Record<string, any>> {
    if (!dto?.nom || !dto?.email) {
      throw new BadRequestException('nom et email sont requis');
    }

    let targetUser = await this.userRepository.findOne({
      where: { email: dto.email.trim().toLowerCase() },
    });

    if (targetUser && targetUser.role !== Role.B2B) {
      throw new BadRequestException(
        'Le collaborateur doit être un utilisateur B2B',
      );
    }

    if (!targetUser) {
      targetUser = this.userRepository.create({
        nom: dto.nom,
        email: dto.email.trim().toLowerCase(),
        role: Role.B2B,
        actif: true,
        password: await bcrypt.hash(Math.random().toString(36).slice(-10), 12),
      });
      targetUser = await this.userRepository.save(targetUser);
    }

    let team = await this.teamRepository.findOne({
      where: { createdByUserId: currentUserId, active: true },
      order: { createdAt: 'ASC' },
    });

    if (!team) {
      team = await this.teamRepository.save(
        this.teamRepository.create({
          name: 'Collaborateurs',
          description: 'Equipe principale B2B',
          createdByUserId: currentUserId,
        }),
      );
      await this.teamMemberRepository.save(
        this.teamMemberRepository.create({
          teamId: team.id,
          userId: currentUserId,
          role: 'OWNER',
        }),
      );
    }

    let member = await this.teamMemberRepository.findOne({
      where: { teamId: team.id, userId: targetUser.id },
    });

    if (member) {
      member.active = true;
      member.role = dto.role || member.role || 'MEMBER';
    } else {
      member = this.teamMemberRepository.create({
        teamId: team.id,
        userId: targetUser.id,
        role: dto.role || 'MEMBER',
      });
    }

    await this.teamMemberRepository.save(member);

    return {
      id: targetUser.id,
      nom: targetUser.nom,
      email: targetUser.email,
      role: member.role,
      actif: member.active,
    };
  }

  async getReportsByUser(userId: string): Promise<any> {
    const bulkOrders = await this.bulkOrderRepository.find({
      where: { createdByUserId: userId },
      order: { createdAt: 'DESC' },
    });

    const invoices = await this.invoiceRepository.find({
      where: { b2bClientId: userId },
      order: { issueDate: 'DESC' },
    });

    const expenses = bulkOrders.map((order) => ({
      collaborator: 'Responsable B2B',
      email: 'contact@entreprise.ci',
      totalSpent: Number(order.total),
      ordersCount: 1,
      averageOrder: Number(order.total),
      lastOrder: order.createdAt.toISOString().split('T')[0],
    }));

    const auditLogs = [
      ...bulkOrders.slice(0, 3).map((order) => ({
        date: order.createdAt.toISOString(),
        user: 'Responsable B2B',
        action: 'Commande groupée créée',
        details: `Commande #${order.id} (${order.items.length} articles)`,
        amount: Number(order.total),
      })),
      ...invoices.slice(0, 3).map((invoice) => ({
        date: invoice.issueDate.toISOString(),
        user: 'Système de facturation',
        action: 'Facture émise',
        details: `Facture ${invoice.invoiceNumber}`,
        amount: Number(invoice.totalAmount),
      })),
    ];

    return {
      expenses: expenses.length
        ? expenses
        : [
            {
              collaborator: 'Responsable B2B',
              email: 'contact@entreprise.ci',
              totalSpent: 0,
              ordersCount: 0,
              averageOrder: 0,
              lastOrder: new Date().toISOString().split('T')[0],
            },
          ],
      auditLogs: auditLogs.length
        ? auditLogs
        : [
            {
              date: new Date().toISOString(),
              user: 'Système',
              action: 'Aucun historique disponible',
              details:
                'Vos actions seront affichées ici dès que des données seront générées.',
              amount: 0,
            },
          ],
    };
  }

  // === UTILITY METHODS ===
  async isUserB2B(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    return user?.role === 'B2B';
  }

  async getUserTeams(userId: string): Promise<Team[]> {
    const teamMembers = await this.teamMemberRepository.find({
      where: { userId: userId, active: true },
      relations: ['team'],
    });
    return teamMembers.map((tm) => tm.team);
  }

  private toOrderResponse(order: BulkOrder): Record<string, any> {
    const deliveryDate = order.deliveryDateTime ?? order.createdAt;
    return {
      id: order.id,
      restaurantNom: 'Restaurant partenaire',
      dateLivraison: deliveryDate?.toISOString().slice(0, 10),
      heureLivraison: deliveryDate
        ? deliveryDate.toISOString().slice(11, 16)
        : undefined,
      status: this.toFrontendOrderStatus(order.status),
      total: Number(order.total),
      deliveryAddress: order.deliveryAddress ?? 'Adresse non renseignée',
      items: (order.items ?? []).map((item) => ({
        articleId: item.articleId,
        quantity: Number(item.quantity),
        nom: item.articleId,
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
      })),
    };
  }

  private toFrontendOrderStatus(status: string): string {
    const statusMap: Record<string, string> = {
      PENDING: 'EN_VALIDATION',
      CONFIRMED: 'CONFIRMEE',
      PROCESSING: 'EN_PREP',
      DELIVERED: 'LIVREE',
      CANCELLED: 'ANNULEE',
    };
    return statusMap[status] ?? status;
  }
}
