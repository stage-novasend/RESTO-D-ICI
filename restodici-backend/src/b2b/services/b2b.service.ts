import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { In, Repository, Between } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../email/email.service';
import { Role, User } from '../../auth/entities/user.entity';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { BulkOrder } from '../entities/bulk-order.entity';
import { Invoice } from '../entities/invoice.entity';
import { CompteB2B } from '../entities/compte-b2b.entity';
import { CollaborateurB2B } from '../entities/collaborateur-b2b.entity';
import { CommandeGroupeeB2B } from '../entities/commande-groupee-b2b.entity';
import { LigneCommandeGroupeeB2B } from '../entities/ligne-commande-groupee-b2b.entity';
import { AuditLogB2B, TypeAuditB2B } from '../entities/audit-log-b2b.entity';
import { FactureMensuelleB2B } from '../entities/facture-mensuelle-b2b.entity';
import { PlanRepasB2B, FrequencePlan } from '../entities/plan-repas-b2b.entity';
import { Article } from '../../menu/entities/article.entity';
import { CreateTeamDto } from '../dto/create-team.dto';
import { AddTeamMemberDto } from '../dto/add-team-member.dto';
import { CreateBulkOrderDto } from '../dto/create-bulk-order.dto';
import { UpdateBulkOrderStatusDto } from '../dto/update-bulk-order-status.dto';
import { CreateCompteB2BDto } from '../dto/create-compte-b2b.dto';
import { CreateCollaborateurB2BDto } from '../dto/create-collaborateur-b2b.dto';
import { CreateCommandeGroupeeDto } from '../dto/create-commande-groupee.dto';
import * as bcrypt from 'bcrypt';
import axios from 'axios';
import { CommandesGateway } from '../../commandes/commandes.gateway';

const MOIS_FR = [
  'JANVIER',
  'FEVRIER',
  'MARS',
  'AVRIL',
  'MAI',
  'JUIN',
  'JUILLET',
  'AOUT',
  'SEPTEMBRE',
  'OCTOBRE',
  'NOVEMBRE',
  'DECEMBRE',
];

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
    @InjectRepository(CompteB2B)
    private compteB2BRepository: Repository<CompteB2B>,
    @InjectRepository(CollaborateurB2B)
    private collaborateurRepository: Repository<CollaborateurB2B>,
    @InjectRepository(CommandeGroupeeB2B)
    private commandeGroupeeRepository: Repository<CommandeGroupeeB2B>,
    @InjectRepository(LigneCommandeGroupeeB2B)
    private ligneCommandeRepository: Repository<LigneCommandeGroupeeB2B>,
    @InjectRepository(AuditLogB2B)
    private auditRepository: Repository<AuditLogB2B>,
    @InjectRepository(FactureMensuelleB2B)
    private factureRepository: Repository<FactureMensuelleB2B>,
    @InjectRepository(PlanRepasB2B)
    private planRepasRepository: Repository<PlanRepasB2B>,
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    private commandesGateway: CommandesGateway,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  // ============================================================
  // === COMPTE B2B (Company account) ===========================
  // ============================================================

  async createCompteB2B(
    userId: string,
    dto: CreateCompteB2BDto,
  ): Promise<CompteB2B> {
    const existing = await this.compteB2BRepository.findOne({
      where: { responsable: { id: userId } },
    });
    if (existing) {
      throw new BadRequestException(
        'Un compte entreprise existe déjà pour cet utilisateur',
      );
    }

    // Validate RCCM format (basic: non-empty, min 5 chars)
    if (!dto.numeroRCCM || dto.numeroRCCM.trim().length < 5) {
      throw new BadRequestException('Numéro RCCM invalide');
    }
    if (!dto.numeroContribuable || dto.numeroContribuable.trim().length < 5) {
      throw new BadRequestException('Numéro de contribuable (NIF) invalide');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const compte = this.compteB2BRepository.create({
      responsable: user,
      raisonSociale: dto.raisonSociale.trim(),
      numeroRCCM: dto.numeroRCCM.trim().toUpperCase(),
      numeroContribuable: dto.numeroContribuable.trim().toUpperCase(),
      emailProfessionnel: dto.emailProfessionnel.trim().toLowerCase(),
      telephoneProfessionnel: dto.telephoneProfessionnel.trim(),
      adresseSiege: dto.adresseSiege?.trim() || undefined,
      statutValidation: 'EN_ATTENTE',
      actif: false,
    });

    const saved = await this.compteB2BRepository.save(compte);
    await this.logAudit('CONNEXION', saved.id, userId, {
      action: 'Création compte B2B',
      raisonSociale: dto.raisonSociale,
    });
    // Strip sensitive user fields before returning
    const { responsable: _, ...safeCompte } = saved as any;
    return safeCompte as CompteB2B;
  }

  async getCompteB2B(userId: string): Promise<CompteB2B | null> {
    return this.compteB2BRepository.findOne({
      where: { responsable: { id: userId } },
    });
  }

  async updateCompteB2B(
    userId: string,
    dto: Partial<CreateCompteB2BDto>,
  ): Promise<CompteB2B> {
    const compte = await this.compteB2BRepository.findOne({
      where: { responsable: { id: userId } },
    });
    if (!compte) throw new NotFoundException('Compte entreprise introuvable');

    Object.assign(compte, {
      ...(dto.raisonSociale && { raisonSociale: dto.raisonSociale.trim() }),
      ...(dto.telephoneProfessionnel && {
        telephoneProfessionnel: dto.telephoneProfessionnel.trim(),
      }),
      ...(dto.emailProfessionnel && {
        emailProfessionnel: dto.emailProfessionnel.trim().toLowerCase(),
      }),
      ...(dto.adresseSiege !== undefined && {
        adresseSiege: dto.adresseSiege?.trim() || null,
      }),
    });

    return this.compteB2BRepository.save(compte);
  }

  // Admin validates a B2B account
  async validateCompteB2B(
    adminId: string,
    compteId: string,
    approved: boolean,
  ): Promise<CompteB2B> {
    const compte = await this.compteB2BRepository.findOne({
      where: { id: compteId },
    });
    if (!compte) throw new NotFoundException('Compte B2B introuvable');

    compte.statutValidation = approved ? 'VALIDE' : 'REJETE';
    compte.actif = approved;
    compte.validePar = adminId;
    compte.dateValidation = new Date();

    return this.compteB2BRepository.save(compte);
  }

  // ============================================================
  // === COLLABORATEURS B2B (with budget limits) ================
  // ============================================================

  async createCollaborateurB2B(
    userId: string,
    dto: CreateCollaborateurB2BDto,
  ): Promise<Record<string, any>> {
    const compte = await this.getCompteB2B(userId);
    if (!compte) {
      throw new BadRequestException("Créez d'abord votre compte entreprise");
    }

    // Accept budgetMensuel as alias for limiteBudget.
    const limiteBudget = dto.limiteBudget ?? dto.budgetMensuel ?? 50000;

    const email = dto.email.trim().toLowerCase();

    // Check email uniqueness in this company
    const existing = await this.collaborateurRepository.findOne({
      where: { email, compteB2BId: compte.id },
    });
    if (existing) {
      if (!existing.actif) {
        // Re-invite: generate new token
        const token = uuidv4();
        const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        existing.actif = true;
        existing.limiteBudget = limiteBudget;
        existing.invitationToken = token;
        existing.invitationExpiry = expiry;
        existing.invitationAccepted = false;
        await this.collaborateurRepository.save(existing);
        await this.sendInvitationEmail(existing, compte, userId);
        return {
          ...this.formatCollaborateurResponse(existing, 0),
          invitationEnvoyee: true,
        };
      }
      throw new BadRequestException(
        'Ce collaborateur existe déjà dans votre entreprise',
      );
    }

    // Create collaborateur with invitation token (user account created on acceptance)
    const token = uuidv4();
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const collaborateur = this.collaborateurRepository.create({
      nom: dto.nom.trim(),
      email,
      limiteBudget,
      actif: true,
      invitationToken: token,
      invitationExpiry: expiry,
      invitationAccepted: false,
      compteB2BId: compte.id,
      compteB2B: compte,
    });

    const saved = await this.collaborateurRepository.save(collaborateur);

    await this.logAudit('CREATION_COLLABORATEUR', compte.id, userId, {
      collaborateurEmail: email,
      limiteBudget,
    });

    await this.sendInvitationEmail(saved, compte, userId);

    return {
      ...this.formatCollaborateurResponse(saved, 0),
      invitationEnvoyee: true,
    };
  }

  async getCollaborateursB2B(userId: string): Promise<Record<string, any>[]> {
    const compte = await this.getCompteB2B(userId);
    if (!compte) return [];

    const collaborateurs = await this.collaborateurRepository.find({
      where: { compteB2BId: compte.id },
      order: { createdAt: 'DESC' },
    });

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfNext = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const results = await Promise.all(
      collaborateurs.map(async (collab) => {
        const depenseActuelle = await this.getDepenseMensuelleCollaborateur(
          collab.id,
          firstOfMonth,
          firstOfNext,
        );
        return this.formatCollaborateurResponse(collab, depenseActuelle);
      }),
    );

    return results;
  }

  async getCollaborateurSolde(
    collaborateurId: string,
    userId: string,
  ): Promise<Record<string, any>> {
    const compte = await this.getCompteB2B(userId);
    if (!compte) throw new NotFoundException('Compte entreprise introuvable');

    const collab = await this.collaborateurRepository.findOne({
      where: { id: collaborateurId, compteB2BId: compte.id },
    });
    if (!collab) throw new NotFoundException('Collaborateur introuvable');

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfNext = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const depense = await this.getDepenseMensuelleCollaborateur(
      collaborateurId,
      firstOfMonth,
      firstOfNext,
    );
    const solde = Math.max(0, Number(collab.limiteBudget) - depense);

    return {
      collaborateurId,
      nom: collab.nom,
      limiteBudget: Number(collab.limiteBudget),
      depenseActuelle: depense,
      soldeDisponible: solde,
      pourcentageUtilise:
        collab.limiteBudget > 0
          ? Math.round((depense / Number(collab.limiteBudget)) * 100)
          : 0,
    };
  }

  async deactivateCollaborateur(
    collaborateurId: string,
    userId: string,
  ): Promise<void> {
    const compte = await this.getCompteB2B(userId);
    if (!compte) throw new NotFoundException('Compte entreprise introuvable');
    const collab = await this.collaborateurRepository.findOne({
      where: { id: collaborateurId, compteB2BId: compte.id },
    });
    if (!collab) throw new NotFoundException('Collaborateur introuvable');
    await this.collaborateurRepository.remove(collab);
  }

  async updateCollaborateurB2B(
    collaborateurId: string,
    userId: string,
    dto: Partial<CreateCollaborateurB2BDto>,
  ): Promise<Record<string, any>> {
    const compte = await this.getCompteB2B(userId);
    if (!compte) throw new NotFoundException('Compte entreprise introuvable');
    const collab = await this.collaborateurRepository.findOne({
      where: { id: collaborateurId, compteB2BId: compte.id },
    });
    if (!collab) throw new NotFoundException('Collaborateur introuvable');

    const budget = dto.limiteBudget ?? dto.budgetMensuel;
    if (budget !== undefined) {
      if (budget < 0)
        throw new BadRequestException('Le budget doit être positif');
      collab.limiteBudget = budget;
    }
    if (dto.nom) collab.nom = dto.nom.trim();

    const saved = await this.collaborateurRepository.save(collab);
    await this.logAudit(
      'MODIFICATION_COLLABORATEUR' as any,
      compte.id,
      userId,
      {
        action: 'Mise à jour limite de dépense',
        collaborateurId,
        nom: collab.nom,
        limiteBudget: collab.limiteBudget,
      },
    );
    return {
      id: saved.id,
      nom: saved.nom,
      email: saved.email,
      limiteBudget: Number(saved.limiteBudget),
    };
  }

  private async sendInvitationEmail(
    collab: CollaborateurB2B,
    compte: CompteB2B,
    inviteurId: string,
  ): Promise<void> {
    const inviteur = await this.userRepository.findOne({
      where: { id: inviteurId },
    });
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    try {
      await this.emailService.sendCollaborateurInvitation(
        collab.email,
        collab.nom,
        inviteur?.nom || compte.raisonSociale,
        compte.raisonSociale,
        collab.invitationToken!,
        frontendUrl,
      );
    } catch {
      // Non-blocking — invitation is created even if email fails
    }
  }

  async getInvitationByToken(token: string): Promise<Record<string, any>> {
    const collab = await this.collaborateurRepository.findOne({
      where: { invitationToken: token },
      relations: ['compteB2B'],
    });
    if (!collab)
      throw new NotFoundException('Invitation introuvable ou expirée');
    if (collab.invitationAccepted)
      throw new BadRequestException('Invitation déjà acceptée');
    if (collab.invitationExpiry && collab.invitationExpiry < new Date()) {
      throw new BadRequestException(
        "L'invitation a expiré. Demandez une nouvelle invitation.",
      );
    }
    return {
      nom: collab.nom,
      email: collab.email,
      entreprise: collab.compteB2B?.raisonSociale ?? '',
      limiteBudget: Number(collab.limiteBudget),
      valid: true,
    };
  }

  async acceptInvitation(
    token: string,
    password: string,
    prenom?: string,
  ): Promise<Record<string, any>> {
    const collab = await this.collaborateurRepository.findOne({
      where: { invitationToken: token },
      relations: ['compteB2B'],
    });
    if (!collab) throw new NotFoundException('Invitation introuvable');
    if (collab.invitationAccepted)
      throw new BadRequestException('Invitation déjà acceptée');
    if (collab.invitationExpiry && collab.invitationExpiry < new Date()) {
      throw new BadRequestException("L'invitation a expiré");
    }
    if (!password || password.length < 8) {
      throw new BadRequestException(
        'Mot de passe requis (8 caractères minimum)',
      );
    }

    // Create or reuse user account
    let user = await this.userRepository.findOne({
      where: { email: collab.email },
    });
    if (!user) {
      user = this.userRepository.create({
        nom: collab.nom,
        prenom: prenom?.trim() || undefined,
        email: collab.email,
        role: Role.B2B,
        actif: true,
        password: await bcrypt.hash(password, 12),
      });
      user = await this.userRepository.save(user);
    } else {
      // Update password for existing inactive account
      user.password = await bcrypt.hash(password, 12);
      user.actif = true;
      if (prenom) user.prenom = prenom.trim();
      user = await this.userRepository.save(user);
    }

    collab.userId = user.id;
    collab.invitationAccepted = true;
    collab.invitationToken = undefined;
    await this.collaborateurRepository.save(collab);

    await this.logAudit('CONNEXION', collab.compteB2BId, user.id, {
      action: 'Invitation acceptée',
      email: collab.email,
    });

    return {
      message: 'Invitation acceptée. Vous pouvez maintenant vous connecter.',
      email: collab.email,
    };
  }

  async submitAvis(
    commandeId: string,
    userId: string,
    note: number,
    commentaire?: string,
  ): Promise<Record<string, any>> {
    const compte = await this.getCompteB2B(userId);
    if (!compte) throw new NotFoundException('Compte entreprise introuvable');

    const commande = await this.commandeGroupeeRepository.findOne({
      where: { id: commandeId, compteB2B: { id: compte.id } },
    });
    if (!commande) throw new NotFoundException('Commande introuvable');
    if (commande.statut !== 'LIVREE') {
      throw new BadRequestException(
        'Seules les commandes livrées peuvent être évaluées',
      );
    }
    if (commande.avisNote)
      throw new BadRequestException('Un avis a déjà été soumis');
    if (note < 1 || note > 5)
      throw new BadRequestException('Note invalide (1–5)');

    commande.avisNote = note;
    commande.avisCommentaire = commentaire?.trim() || undefined;
    commande.avisAt = new Date();
    await this.commandeGroupeeRepository.save(commande);

    return {
      id: commande.id,
      avisNote: note,
      avisCommentaire: commande.avisCommentaire,
    };
  }

  async getCommandeGroupeeDetail(
    commandeId: string,
    userId: string,
  ): Promise<Record<string, any>> {
    const compte = await this.getCompteB2B(userId);
    if (!compte) throw new NotFoundException('Compte entreprise introuvable');

    const commande = await this.commandeGroupeeRepository.findOne({
      where: { id: commandeId, compteB2B: { id: compte.id } },
      relations: ['lignes', 'lignes.collaborateur'],
    });
    if (!commande) throw new NotFoundException('Commande introuvable');

    // Enrich lines with article names
    const articleIds = [...new Set(commande.lignes.map((l) => l.articleId))];
    const articles = articleIds.length
      ? await this.articleRepository.find({ where: { id: In(articleIds) } })
      : [];
    const articleMap = new Map(articles.map((a) => [a.id, a.nom]));

    return {
      id: commande.id,
      numero: commande.numero,
      statut: commande.statut,
      dateLivraison: commande.dateLivraison?.toISOString().slice(0, 10),
      heureLivraison: commande.heureLivraison,
      lieuLivraison: commande.lieuLivraison,
      adresseLivraison: commande.adresseLivraison,
      totalEstime: Number(commande.totalEstime),
      avisNote: commande.avisNote ?? null,
      avisCommentaire: commande.avisCommentaire ?? null,
      avisAt: commande.avisAt ?? null,
      createdAt: commande.createdAt,
      entreprise: compte.raisonSociale,
      lignes: commande.lignes.map((l) => ({
        id: l.id,
        articleId: l.articleId,
        nomArticle: articleMap.get(l.articleId) ?? l.articleId,
        quantite: l.quantite,
        prixUnitaire: Number(l.prixUnitaire),
        instructions: l.instructions,
        collaborateurNom: l.collaborateur?.nom ?? null,
      })),
    };
  }

  private async getDepenseMensuelleCollaborateur(
    collaborateurId: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    const result = await this.ligneCommandeRepository
      .createQueryBuilder('ligne')
      .innerJoin('ligne.commandeGroupee', 'cmd')
      .select('SUM(ligne.quantite * ligne.prixUnitaire)', 'total')
      .where('ligne.collaborateurB2BId = :id', { id: collaborateurId })
      .andWhere('cmd.createdAt >= :from', { from })
      .andWhere('cmd.createdAt < :to', { to })
      .andWhere('cmd.statut != :annulee', { annulee: 'ANNULEE' })
      .getRawOne();

    return parseFloat(result?.total ?? '0');
  }

  private formatCollaborateurResponse(
    collab: CollaborateurB2B,
    depenseActuelle: number,
  ): Record<string, any> {
    const limite = Number(collab.limiteBudget);
    return {
      id: collab.id,
      nom: collab.nom,
      email: collab.email,
      limiteBudget: limite,
      depenseActuelle,
      soldeDisponible: Math.max(0, limite - depenseActuelle),
      pourcentageUtilise:
        limite > 0 ? Math.round((depenseActuelle / limite) * 100) : 0,
      actif: collab.actif,
      userId: collab.userId,
    };
  }

  private async getOverdueInvoiceCount(compteId: string): Promise<number> {
    return this.factureRepository.count({
      where: { compteB2B: { id: compteId }, statut: 'RETARDEE' },
    });
  }

  private async getPendingInvoiceEcheance(
    compteId: string,
  ): Promise<string | null> {
    const facture = await this.factureRepository.findOne({
      where: {
        compteB2B: { id: compteId },
        statut: In(['EN_ATTENTE', 'RETARDEE']),
      },
      order: { createdAt: 'DESC' },
    });
    return facture?.echeance ?? null;
  }

  private async ensureNoBlockedInvoices(compteId: string): Promise<void> {
    const overdueCount = await this.getOverdueInvoiceCount(compteId);
    if (overdueCount > 0) {
      throw new BadRequestException(
        'Commande impossible : une facture mensuelle impayée bloque votre compte. Merci de régulariser votre situation.',
      );
    }
  }

  private async setDatePrelevementIfMissing(compte: CompteB2B): Promise<void> {
    if (compte.datePrelevement) return;
    const now = new Date();
    compte.datePrelevement = now.toISOString().slice(0, 10);
    compte.jourPrelevement = now.getDate();
    await this.compteB2BRepository.save(compte);
  }

  private formatCompteForResponse(
    compte: CompteB2B,
    nextPrelevementDate?: string,
    blocked = false,
    prochainFacture?: string,
  ): Record<string, any> {
    return {
      exists: true,
      id: compte.id,
      raisonSociale: compte.raisonSociale,
      numeroRCCM: compte.numeroRCCM,
      numeroContribuable: compte.numeroContribuable,
      emailProfessionnel: compte.emailProfessionnel,
      telephoneProfessionnel: compte.telephoneProfessionnel,
      adresseSiege: compte.adresseSiege,
      statutValidation: compte.statutValidation,
      actif: compte.actif,
      datePrelevement: compte.datePrelevement,
      jourPrelevement: compte.jourPrelevement,
      nextPrelevementDate,
      prochainFacture,
      blocked,
    };
  }

  async getCompteWithStatus(userId: string): Promise<Record<string, any>> {
    const compte = await this.getCompteB2B(userId);
    if (!compte) {
      return { exists: false };
    }

    const nextPrelevementDate =
      (await this.getPendingInvoiceEcheance(compte.id)) ||
      compte.datePrelevement ||
      undefined;
    const blocked = (await this.getOverdueInvoiceCount(compte.id)) > 0;

    // Last day of current month — date at which next invoice will be generated
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const prochainFacture = lastDay.toISOString().slice(0, 10);

    return this.formatCompteForResponse(
      compte,
      nextPrelevementDate,
      blocked,
      prochainFacture,
    );
  }

  // ============================================================
  // === COMMANDES GROUPÉES (Grouped orders) ====================
  // ============================================================

  async createCommandeGroupee(
    userId: string,
    dto: CreateCommandeGroupeeDto,
  ): Promise<Record<string, any>> {
    const compte = await this.getCompteB2B(userId);
    if (!compte) {
      throw new BadRequestException(
        'Compte entreprise requis pour passer une commande groupée',
      );
    }

    await this.ensureNoBlockedInvoices(compte.id);
    await this.setDatePrelevementIfMissing(compte);

    // Validate minimum 4h advance notice
    const deliveryDateTime = new Date(
      `${dto.dateLivraison}T${dto.heureLivraison}`,
    );
    const minDelivery = new Date(Date.now() + 4 * 60 * 60 * 1000);
    if (deliveryDateTime < minDelivery) {
      throw new BadRequestException(
        'Délai minimum de 4 heures requis pour une commande groupée',
      );
    }

    const totalCouverts = dto.lignes.reduce((sum, l) => sum + l.quantite, 0);
    if (totalCouverts < 1) {
      throw new BadRequestException('Au moins 1 article requis');
    }

    // Budget validation per collaborator
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfNext = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const totalEstime = dto.lignes.reduce(
      (sum, l) => sum + l.quantite * l.prixUnitaire,
      0,
    );

    for (const ligne of dto.lignes) {
      if (ligne.collaborateurId) {
        const collab = await this.collaborateurRepository.findOne({
          where: { id: ligne.collaborateurId, compteB2BId: compte.id },
        });
        if (collab) {
          const depense = await this.getDepenseMensuelleCollaborateur(
            collab.id,
            firstOfMonth,
            firstOfNext,
          );
          const ligneTotal = ligne.quantite * ligne.prixUnitaire;
          if (depense + ligneTotal > Number(collab.limiteBudget)) {
            throw new BadRequestException(
              `Budget dépassé pour ${collab.nom}: ${Math.round(depense + ligneTotal).toLocaleString()} FCFA > limite de ${Number(collab.limiteBudget).toLocaleString()} FCFA`,
            );
          }
        }
      }
    }

    const numero = `GRP-${Date.now().toString(36).toUpperCase()}`;

    // Infer restaurantId from first article so staff of that restaurant can track this order
    const firstArticle = dto.lignes[0]?.articleId
      ? await this.articleRepository.findOne({
          where: { id: dto.lignes[0].articleId },
        })
      : null;
    const restaurantId = firstArticle?.restaurantId ?? undefined;

    const commande = this.commandeGroupeeRepository.create({
      numero,
      compteB2B: compte,
      dateLivraison: deliveryDateTime,
      heureLivraison: dto.heureLivraison,
      lieuLivraison: dto.lieuLivraison,
      adresseLivraison: dto.adresseLivraison,
      totalEstime,
      statut: 'EN_ATTENTE',
      restaurantId,
      deadlineAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
    });

    const savedCommande = await this.commandeGroupeeRepository.save(commande);

    // Save lines
    const lignes = await Promise.all(
      dto.lignes.map(async (l) => {
        const ligne = this.ligneCommandeRepository.create({
          commandeGroupee: savedCommande,
          articleId: l.articleId,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
          instructions: l.instructions,
          ...(l.collaborateurId
            ? { collaborateur: { id: l.collaborateurId } as CollaborateurB2B }
            : {}),
        });
        return this.ligneCommandeRepository.save(ligne);
      }),
    );

    // Budget alerts: notify collaborateurs who reach 80% or 100% of monthly limit
    for (const ligne of dto.lignes) {
      if (!ligne.collaborateurId) continue;
      const collab = await this.collaborateurRepository.findOne({
        where: { id: ligne.collaborateurId, compteB2BId: compte.id },
      });
      if (!collab?.email || !collab.limiteBudget) continue;
      const depenseApres = await this.getDepenseMensuelleCollaborateur(
        collab.id,
        firstOfMonth,
        firstOfNext,
      );
      const limite = Number(collab.limiteBudget);
      if (limite <= 0) continue;
      const pct = (depenseApres / limite) * 100;
      try {
        if (pct >= 100) {
          await this.emailService.sendMail({
            to: collab.email,
            subject: 'RESTODICI — Budget mensuel atteint',
            html: `<p>Bonjour ${collab.nom},</p><p>Votre budget mensuel de <strong>${limite.toLocaleString('fr-FR')} FCFA</strong> est entièrement consommé (${Math.round(depenseApres).toLocaleString('fr-FR')} FCFA dépensés ce mois).</p><p>Contactez votre gestionnaire de compte pour ajuster votre limite.</p>`,
          });
        } else if (pct >= 80) {
          await this.emailService.sendMail({
            to: collab.email,
            subject: 'RESTODICI — 80 % de votre budget mensuel utilisé',
            html: `<p>Bonjour ${collab.nom},</p><p>Vous avez consommé <strong>${Math.round(pct)} %</strong> de votre budget mensuel (${Math.round(depenseApres).toLocaleString('fr-FR')} / ${limite.toLocaleString('fr-FR')} FCFA).</p><p>Il vous reste <strong>${Math.round(limite - depenseApres).toLocaleString('fr-FR')} FCFA</strong> pour ce mois.</p>`,
          });
        }
      } catch {
        // Ne pas bloquer la commande si l'email échoue
      }
    }

    await this.logAudit('CREATION_COMMANDE_GROUPEE', compte.id, userId, {
      numero,
      totalEstime,
      nbLignes: lignes.length,
      couverts: totalCouverts,
    });

    const notifPayload = {
      id: savedCommande.id,
      numero,
      statut: savedCommande.statut,
      source: 'B2B_GROUPE',
      montantTotal: totalEstime,
      nbCouverts: totalCouverts,
      entreprise: compte.raisonSociale,
      createdAt: savedCommande.createdAt,
    };

    // Notify restaurant staff (kitchen) and managers
    if (restaurantId) {
      this.commandesGateway.emitToKitchen(
        restaurantId,
        'commande.b2b.nouvelle',
        notifPayload,
      );
    }
    this.commandesGateway.emitToManagers('commande.b2b.nouvelle', notifPayload);

    return {
      id: savedCommande.id,
      numero,
      statut: savedCommande.statut,
      dateLivraison: dto.dateLivraison,
      heureLivraison: dto.heureLivraison,
      lieuLivraison: dto.lieuLivraison,
      totalEstime,
      nbCouverts: totalCouverts,
      lignes: dto.lignes,
    };
  }

  async getB2BKDSForRestaurant(
    restaurantId: string,
  ): Promise<Record<string, any>[]> {
    const commandes = await this.commandeGroupeeRepository.find({
      where: {
        restaurantId,
        statut: In(['EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION']),
      },
      relations: ['lignes', 'compteB2B'],
      order: { createdAt: 'ASC' },
    });

    // Collect all unique articleIds across all orders to batch-load names
    const allArticleIds = [
      ...new Set(
        commandes.flatMap((cmd) => cmd.lignes.map((l) => l.articleId)),
      ),
    ];
    const articles = allArticleIds.length
      ? await this.articleRepository.find({ where: { id: In(allArticleIds) } })
      : [];
    const articleMap = new Map(articles.map((a) => [a.id, a.nom]));

    return commandes.map((cmd) => ({
      id: cmd.id,
      numero: cmd.numero,
      source: 'B2B_GROUPE',
      entreprise: cmd.compteB2B?.raisonSociale ?? 'Entreprise',
      dateLivraison: cmd.dateLivraison,
      heureLivraison: cmd.heureLivraison,
      lieuLivraison: cmd.lieuLivraison,
      statut: cmd.statut,
      estPaye: cmd.estPaye,
      totalEstime: Number(cmd.totalEstime),
      createdAt: cmd.createdAt,
      deadlineAt: cmd.deadlineAt,
      lignes: cmd.lignes.map((l) => ({
        id: l.id,
        articleId: l.articleId,
        nomArticle: articleMap.get(l.articleId) ?? l.articleId,
        quantite: l.quantite,
        prixUnitaire: Number(l.prixUnitaire),
      })),
    }));
  }

  async confirmerPaiementB2B(
    id: string,
    restaurantId: string,
  ): Promise<Record<string, any>> {
    const commande = await this.commandeGroupeeRepository.findOne({
      where: { id },
      relations: ['compteB2B'],
    });
    if (!commande) throw new NotFoundException('Commande B2B introuvable');
    if (commande.restaurantId && commande.restaurantId !== restaurantId) {
      throw new ForbiddenException('Accès refusé à cette commande');
    }

    commande.estPaye = true;
    const saved = await this.commandeGroupeeRepository.save(commande);

    const payload = {
      id: saved.id,
      numero: saved.numero,
      statut: saved.statut,
      estPaye: true,
    };
    if (commande.restaurantId) {
      this.commandesGateway.emitToKitchen(
        commande.restaurantId,
        'commande.b2b.statut',
        payload,
      );
    }
    this.commandesGateway.emitToManagers('commande.b2b.statut', payload);
    return payload;
  }

  async annulerCommandeGroupeeByClient(
    id: string,
    userId: string,
  ): Promise<Record<string, any>> {
    const compte = await this.getCompteB2B(userId);
    if (!compte) throw new NotFoundException('Compte entreprise introuvable');

    const commande = await this.commandeGroupeeRepository.findOne({
      where: { id, compteB2B: { id: compte.id } },
    });
    if (!commande) throw new NotFoundException('Commande introuvable');
    if (['EN_PREPARATION', 'LIVREE', 'ANNULEE'].includes(commande.statut)) {
      throw new BadRequestException(
        'Annulation impossible : la commande est déjà en préparation ou terminée',
      );
    }

    commande.statut = 'ANNULEE';
    const saved = await this.commandeGroupeeRepository.save(commande);

    const payload = { id: saved.id, numero: saved.numero, statut: 'ANNULEE' };
    if (commande.restaurantId) {
      this.commandesGateway.emitToKitchen(
        commande.restaurantId,
        'commande.b2b.statut',
        payload,
      );
    }
    this.commandesGateway.emitToManagers('commande.b2b.statut', payload);
    return payload;
  }

  @Cron('*/5 * * * *')
  async checkDeliveryReminders(): Promise<void> {
    const now = new Date();
    const windows = [
      {
        label: '30min',
        from: new Date(now.getTime() + 25 * 60_000),
        to: new Date(now.getTime() + 35 * 60_000),
      },
      {
        label: '2h',
        from: new Date(now.getTime() + 115 * 60_000),
        to: new Date(now.getTime() + 125 * 60_000),
      },
    ];
    for (const { label, from, to } of windows) {
      const commandes = await this.commandeGroupeeRepository.find({
        where: {
          dateLivraison: Between(from, to),
          statut: In(['EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION']),
        },
        relations: ['compteB2B'],
      });
      for (const cmd of commandes) {
        const payload = {
          id: cmd.id,
          numero: cmd.numero,
          statut: cmd.statut,
          estPaye: cmd.estPaye,
          entreprise: cmd.compteB2B?.raisonSociale ?? 'Entreprise',
          dateLivraison: cmd.dateLivraison,
          heureLivraison: cmd.heureLivraison,
          lieuLivraison: cmd.lieuLivraison,
          urgence: label,
        };
        if (cmd.restaurantId) {
          this.commandesGateway.emitToKitchen(
            cmd.restaurantId,
            'commande.b2b.rappel',
            payload,
          );
        }
        this.commandesGateway.emitToManagers('commande.b2b.rappel', payload);
      }
    }
  }

  async updateB2BOrderStatus(
    id: string,
    statut: string,
    restaurantId: string,
  ): Promise<Record<string, any>> {
    const commande = await this.commandeGroupeeRepository.findOne({
      where: { id },
      relations: ['compteB2B'],
    });

    if (!commande) throw new NotFoundException('Commande B2B introuvable');
    if (commande.restaurantId && commande.restaurantId !== restaurantId) {
      throw new ForbiddenException('Accès refusé à cette commande');
    }

    const valid = [
      'EN_ATTENTE',
      'CONFIRMEE',
      'EN_PREPARATION',
      'LIVREE',
      'ANNULEE',
    ];
    if (!valid.includes(statut)) {
      throw new BadRequestException(`Statut invalide: ${statut}`);
    }

    commande.statut = statut;
    const saved = await this.commandeGroupeeRepository.save(commande);

    if (commande.restaurantId) {
      this.commandesGateway.emitToKitchen(
        commande.restaurantId,
        'commande.b2b.statut',
        {
          id: saved.id,
          numero: saved.numero,
          statut: saved.statut,
        },
      );
    }
    this.commandesGateway.emitToManagers('commande.b2b.statut', {
      id: saved.id,
      statut: saved.statut,
    });

    return { id: saved.id, numero: saved.numero, statut: saved.statut };
  }

  async getCommandesGroupees(userId: string): Promise<Record<string, any>[]> {
    const compte = await this.getCompteB2B(userId);
    if (!compte) return [];

    const commandes = await this.commandeGroupeeRepository.find({
      where: { compteB2B: { id: compte.id } },
      relations: ['lignes'],
      order: { createdAt: 'DESC' },
    });

    return commandes.map((cmd) => ({
      id: cmd.id,
      numero: cmd.numero,
      dateLivraison: cmd.dateLivraison?.toISOString().slice(0, 10),
      heureLivraison: cmd.heureLivraison,
      lieuLivraison: cmd.lieuLivraison,
      adresseLivraison: cmd.adresseLivraison,
      statut: cmd.statut,
      totalEstime: Number(cmd.totalEstime),
      nbLignes: cmd.lignes?.length ?? 0,
      createdAt: cmd.createdAt,
      deadlineAt: cmd.deadlineAt,
    }));
  }

  // ============================================================
  // === FACTURES MENSUELLES (Monthly invoices) =================
  // ============================================================

  async getFacturesMensuelles(userId: string): Promise<Record<string, any>[]> {
    const compte = await this.getCompteB2B(userId);
    if (!compte) return [];

    const factures = await this.factureRepository.find({
      where: { compteB2B: { id: compte.id } },
      order: { createdAt: 'DESC' },
    });

    return factures.map((f) => this.formatFacture(f, compte));
  }

  async payFacture(
    factureId: string,
    userId: string,
  ): Promise<Record<string, any>> {
    const compte = await this.getCompteB2B(userId);
    if (!compte) throw new NotFoundException('Compte entreprise introuvable');

    const facture = await this.factureRepository.findOne({
      where: { id: factureId, compteB2B: { id: compte.id } },
    });
    if (!facture) throw new NotFoundException('Facture introuvable');
    if (facture.statut === 'PAYEE')
      throw new BadRequestException('Facture déjà payée');

    facture.statut = 'PAYEE';
    const saved = await this.factureRepository.save(facture);

    await this.logAudit('PAIEMENT_FACTURE', compte.id, userId, {
      factureId,
      montantTTC: Number(facture.montantTTC),
      numeroFacture: facture.numeroFacture,
    });

    return this.formatFacture(saved, compte);
  }

  async contestFacture(
    factureId: string,
    userId: string,
    motif: string,
  ): Promise<Record<string, any>> {
    const compte = await this.getCompteB2B(userId);
    if (!compte) throw new NotFoundException('Compte entreprise introuvable');

    const facture = await this.factureRepository.findOne({
      where: { id: factureId, compteB2B: { id: compte.id } },
    });
    if (!facture) throw new NotFoundException('Facture introuvable');
    if (facture.statut === 'PAYEE')
      throw new BadRequestException(
        'Impossible de contester une facture déjà payée',
      );
    if (facture.statut === 'EN_CONTESTATION')
      throw new BadRequestException('Facture déjà en contestation');

    facture.statut = 'EN_CONTESTATION';
    const saved = await this.factureRepository.save(facture);

    await this.logAudit('PAIEMENT_FACTURE', compte.id, userId, {
      action: 'CONTESTATION',
      factureId,
      motif,
      numeroFacture: facture.numeroFacture,
    });

    const adminEmail =
      this.configService.get<string>('ADMIN_EMAIL') || 'admin@restodici.ci';
    void this.emailService
      .sendMail({
        to: adminEmail,
        subject: `RESTODICI — Contestation facture ${facture.numeroFacture} — ${compte.raisonSociale}`,
        html: `<p>La facture <strong>${facture.numeroFacture}</strong> (${compte.raisonSociale}) est contestée.</p><p><strong>Motif :</strong> ${motif}</p><p>Montant TTC : ${Math.round(Number(facture.montantTTC)).toLocaleString('fr-FR')} FCFA</p>`,
      })
      .catch(() => undefined);

    return this.formatFacture(saved, compte);
  }

  async exportSyscohadaCsv(
    factureId: string,
    userId: string,
  ): Promise<Record<string, any>> {
    const compte = await this.getCompteB2B(userId);
    if (!compte) throw new NotFoundException('Compte entreprise introuvable');

    const facture = await this.factureRepository.findOne({
      where: { id: factureId, compteB2B: { id: compte.id } },
    });
    if (!facture) throw new NotFoundException('Facture introuvable');

    const montantHT = Number(facture.montantHT);
    const tva = Number(facture.tva);
    const montantTTC = Number(facture.montantTTC);
    const ref = facture.numeroFacture || factureId.slice(0, 8);
    const nif = facture.nifClient || compte.numeroContribuable || '';
    const periode = `${facture.mois} ${facture.annee}`;

    // SYSCOHADA format: Date;Libellé;Compte_Débit;Montant_Débit;Compte_Crédit;Montant_Crédit;NIF;Référence
    const rows = [
      {
        Date: facture.echeance || new Date().toISOString().slice(0, 10),
        Libelle: `Ventes repas - ${compte.raisonSociale} - ${periode}`,
        Compte_Debit: '411100',
        Montant_Debit: Math.round(montantTTC),
        Compte_Credit: '701100',
        Montant_Credit: Math.round(montantHT),
        NIF: nif,
        Reference: ref,
      },
      {
        Date: facture.echeance || new Date().toISOString().slice(0, 10),
        Libelle: `TVA collectée 18% - ${compte.raisonSociale} - ${periode}`,
        Compte_Debit: '411100',
        Montant_Debit: 0,
        Compte_Credit: '443100',
        Montant_Credit: Math.round(tva),
        NIF: nif,
        Reference: ref,
      },
    ];

    const headers = Object.keys(rows[0]).join(';');
    const csvRows = rows.map((r) => Object.values(r).join(';'));
    const csv = [headers, ...csvRows].join('\n');

    await this.logAudit('GENERATION_FACTURE', compte.id, userId, {
      action: 'EXPORT_SYSCOHADA',
      factureId,
      numeroFacture: facture.numeroFacture,
    });

    return {
      csv,
      filename: `syscohada-${ref}-${periode.replace(' ', '-')}.csv`,
    };
  }

  // CRON: Last day of every month at 23:00 — generate invoices for all B2B accounts
  @Cron('0 23 28-31 * *')
  async generateMonthlyInvoices(): Promise<void> {
    const now = new Date();
    // Only run on the actual last day of the month
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (tomorrow.getMonth() === now.getMonth()) return;

    const mois = MOIS_FR[now.getMonth()];
    const annee = now.getFullYear();

    const comptes = await this.compteB2BRepository.find({
      where: { actif: true },
    });

    for (const compte of comptes) {
      await this.generateFactureForCompte(compte, mois, annee);
    }
  }

  async generateFactureForCompte(
    compte: CompteB2B,
    mois: string,
    annee: number,
  ): Promise<FactureMensuelleB2B | null> {
    // Avoid duplicate
    const existing = await this.factureRepository.findOne({
      where: { compteB2B: { id: compte.id }, mois, annee },
    });
    if (existing) return existing;

    // Calculate total from commandes groupées for the month
    const monthIndex = MOIS_FR.indexOf(mois);
    const from = new Date(annee, monthIndex, 1);
    const to = new Date(annee, monthIndex + 1, 1);

    const result = await this.commandeGroupeeRepository
      .createQueryBuilder('cmd')
      .select('SUM(cmd.totalEstime)', 'total')
      .where('cmd.compteB2BId = :compteId', { compteId: compte.id })
      .andWhere('cmd.createdAt >= :from', { from })
      .andWhere('cmd.createdAt < :to', { to })
      .andWhere('cmd.statut != :annulee', { annulee: 'ANNULEE' })
      .getRawOne();

    // Also include bulk orders total
    const bulkResult = await this.bulkOrderRepository
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'total')
      .where('order.createdByUserId = :userId', {
        userId: compte.responsable?.id ?? '',
      })
      .andWhere('order.createdAt >= :from', { from })
      .andWhere('order.createdAt < :to', { to })
      .andWhere('order.status != :cancelled', { cancelled: 'CANCELLED' })
      .getRawOne();

    const montantHT =
      parseFloat(result?.total ?? '0') + parseFloat(bulkResult?.total ?? '0');

    if (montantHT === 0) return null;

    const taux = 0.18;
    const tva = montantHT * taux;
    const montantTTC = montantHT + tva;

    const numeroFacture = `RDI-B2B-${annee}${String(monthIndex + 1).padStart(2, '0')}-${compte.id.slice(0, 6).toUpperCase()}`;

    const echeanceDate = new Date(annee, monthIndex + 1, 15);

    const facture = this.factureRepository.create({
      compteB2B: compte,
      annee,
      mois,
      statut: 'EN_ATTENTE',
      montantHT,
      tva,
      montantTTC,
      numeroFacture,
      nifClient: compte.numeroContribuable,
      rccmClient: compte.numeroRCCM,
      echeance: echeanceDate.toISOString().slice(0, 10),
    });

    const saved = await this.factureRepository.save(facture);
    await this.logAudit('GENERATION_FACTURE', compte.id, 'SYSTEM', {
      numeroFacture,
      montantTTC,
      mois,
      annee,
    });

    // Notifie le responsable B2B par email (RG-20)
    const emailDest = compte.emailProfessionnel;
    if (emailDest) {
      void this.emailService
        .sendFactureMensuelleEmail({
          to: emailDest,
          raisonSociale: compte.raisonSociale,
          numeroFacture,
          mois,
          annee,
          montantHT,
          tva,
          montantTTC,
          echeance: echeanceDate.toISOString().slice(0, 10),
        })
        .catch((err) =>
          console.error(
            `[B2BService] Erreur email facture ${numeroFacture}: ${(err as Error).message}`,
          ),
        );
    }

    return saved;
  }

  // CRON: Check overdue invoices daily at 8:00
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkOverdueInvoices(): Promise<void> {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // Step 1: Mark expired invoices as RETARDEE
    const overdue = await this.factureRepository
      .createQueryBuilder('f')
      .where('f.statut = :statut', { statut: 'EN_ATTENTE' })
      .andWhere('f.echeance < :today', { today: todayStr })
      .getMany();

    for (const facture of overdue) {
      facture.statut = 'RETARDEE';
      await this.factureRepository.save(facture);
    }

    // Step 2: Relance J-7 (7 days before due)
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().slice(0, 10);

    const dueSoon = await this.factureRepository
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.compteB2B', 'compte')
      .where('f.statut = :statut', { statut: 'EN_ATTENTE' })
      .andWhere('f.echeance = :echeance', { echeance: in7DaysStr })
      .getMany();

    for (const facture of dueSoon) {
      const compte = facture.compteB2B;
      if (!compte?.emailProfessionnel) continue;
      void this.emailService
        .sendMail({
          to: compte.emailProfessionnel,
          subject: `RESTODICI — Rappel : facture ${facture.numeroFacture} échéance dans 7 jours`,
          html: `<p>Bonjour,</p><p>La facture <strong>${facture.numeroFacture}</strong> (${Math.round(Number(facture.montantTTC)).toLocaleString('fr-FR')} FCFA TTC) est due le <strong>${facture.echeance}</strong>, dans 7 jours.</p><p>Connectez-vous à votre espace B2B pour régler cette facture.</p>`,
        })
        .catch(() => undefined);
    }

    // Step 3: Block account at J+3 after due date (range: exactly 3 days overdue today)
    const dueJ3 = new Date(today);
    dueJ3.setDate(dueJ3.getDate() - 3);
    const dueJ3Str = dueJ3.toISOString().slice(0, 10);
    const dueJ3PrevStr = new Date(dueJ3.getTime() - 86_400_000)
      .toISOString()
      .slice(0, 10);

    const overdueJ3 = await this.factureRepository
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.compteB2B', 'compte')
      .where('f.statut = :statut', { statut: 'RETARDEE' })
      .andWhere('f.echeance <= :echeance', { echeance: dueJ3Str })
      .andWhere('f.echeance > :prev', { prev: dueJ3PrevStr })
      .getMany();

    for (const facture of overdueJ3) {
      const compte = facture.compteB2B;
      if (!compte) continue;
      if (compte.emailProfessionnel) {
        void this.emailService
          .sendMail({
            to: compte.emailProfessionnel,
            subject: `RESTODICI — URGENT : facture impayée ${facture.numeroFacture} — compte suspendu`,
            html: `<p>Bonjour,</p><p>Votre facture <strong>${facture.numeroFacture}</strong> (${Math.round(Number(facture.montantTTC)).toLocaleString('fr-FR')} FCFA TTC) est impayée depuis 3 jours.</p><p><strong>Vos nouvelles commandes sont désactivées jusqu'au règlement.</strong></p><p>Réglez cette facture immédiatement via votre espace B2B.</p>`,
          })
          .catch(() => undefined);
      }
    }

    // Step 4: Escalate to admin at J+15 (range: exactly 15 days overdue today)
    const dueJ15 = new Date(today);
    dueJ15.setDate(dueJ15.getDate() - 15);
    const dueJ15Str = dueJ15.toISOString().slice(0, 10);
    const dueJ15PrevStr = new Date(dueJ15.getTime() - 86_400_000)
      .toISOString()
      .slice(0, 10);

    const overdueJ15 = await this.factureRepository
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.compteB2B', 'compte')
      .where('f.statut = :statut', { statut: 'RETARDEE' })
      .andWhere('f.echeance <= :echeance', { echeance: dueJ15Str })
      .andWhere('f.echeance > :prev', { prev: dueJ15PrevStr })
      .getMany();

    for (const facture of overdueJ15) {
      const compte = facture.compteB2B;
      if (!compte) continue;
      const adminEmail =
        this.configService.get<string>('ADMIN_EMAIL') || 'admin@restodici.ci';
      void this.emailService
        .sendMail({
          to: adminEmail,
          subject: `RESTODICI ADMIN — Impayé J+15 : ${compte.raisonSociale} — ${facture.numeroFacture}`,
          html: `<p>La facture <strong>${facture.numeroFacture}</strong> de l'entreprise <strong>${compte.raisonSociale}</strong> est impayée depuis 15 jours (${Math.round(Number(facture.montantTTC)).toLocaleString('fr-FR')} FCFA TTC). Intervention manuelle requise.</p>`,
        })
        .catch(() => undefined);
    }
  }

  private formatFacture(
    f: FactureMensuelleB2B,
    compte: CompteB2B,
  ): Record<string, any> {
    return {
      id: f.id,
      numeroFacture: f.numeroFacture,
      mois: f.mois,
      annee: f.annee,
      periode: `${f.mois} ${f.annee}`,
      statut: f.statut,
      montantHT: Number(f.montantHT),
      tva: Number(f.tva),
      montantTTC: Number(f.montantTTC),
      echeance: f.echeance,
      raisonSociale: compte.raisonSociale,
      nifClient: f.nifClient ?? compte.numeroContribuable,
      rccmClient: f.rccmClient ?? compte.numeroRCCM,
      createdAt: f.createdAt,
    };
  }

  // ============================================================
  // === AUDIT LOG ===============================================
  // ============================================================

  async getAuditLogs(userId: string): Promise<Record<string, any>[]> {
    const compte = await this.getCompteB2B(userId);
    if (!compte) return [];

    const logs = await this.auditRepository.find({
      where: { compteB2B: { id: compte.id } },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return logs.map((log) => ({
      id: log.id,
      type: log.type,
      actorEmail: log.actorEmail,
      meta: log.meta,
      createdAt: log.createdAt,
    }));
  }

  private async logAudit(
    type: TypeAuditB2B,
    compteB2BId: string,
    actorUserId: string,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    try {
      let actorEmail: string | undefined;
      if (actorUserId !== 'SYSTEM') {
        const actor = await this.userRepository.findOne({
          where: { id: actorUserId },
        });
        actorEmail = actor?.email;
      } else {
        actorEmail = 'system@restodici.ci';
      }

      const log = this.auditRepository.create({
        compteB2B: { id: compteB2BId } as CompteB2B,
        type,
        actorUserId,
        actorEmail,
        meta,
      });
      await this.auditRepository.save(log);
    } catch {
      // Non-blocking: audit failure should not break business logic
    }
  }

  // ============================================================
  // === RAPPORTS ================================================
  // ============================================================

  async getReportsB2B(userId: string): Promise<Record<string, any>> {
    const compte = await this.getCompteB2B(userId);
    const collaborateurs = compte
      ? await this.getCollaborateursB2B(userId)
      : [];
    const commandes = compte ? await this.getCommandesGroupees(userId) : [];

    const now = new Date();
    const currentMois = MOIS_FR[now.getMonth()];
    const currentAnnee = now.getFullYear();

    const factures = compte ? await this.getFacturesMensuelles(userId) : [];

    // Aggregate spending by collaborator
    const expenses = collaborateurs.map((c) => ({
      collaborateur: c.nom,
      email: c.email,
      totalDepense: c.depenseActuelle,
      limite: c.limiteBudget,
      soldeRestant: c.soldeDisponible,
      pourcentage: c.pourcentageUtilise,
    }));

    // Monthly totals from commandes groupees
    const monthlyTotals = commandes.reduce(
      (acc, cmd) => {
        if (cmd.statut !== 'ANNULEE') {
          acc.totalCommandes += 1;
          acc.totalMontant += cmd.totalEstime;
        }
        return acc;
      },
      { totalCommandes: 0, totalMontant: 0 },
    );

    const auditLogs = await this.getAuditLogs(userId);

    return {
      compte: compte
        ? {
            raisonSociale: compte.raisonSociale,
            statut: compte.statutValidation,
            actif: compte.actif,
          }
        : null,
      collaborateurs: expenses,
      moisEnCours: currentMois,
      anneeEnCours: currentAnnee,
      totalCommandesMois: monthlyTotals.totalCommandes,
      totalMontantMois: monthlyTotals.totalMontant,
      factures,
      auditLogs,
    };
  }

  // Legacy reports method (backward compat)
  async getReportsByUser(userId: string): Promise<any> {
    return this.getReportsB2B(userId);
  }

  // ============================================================
  // === LEGACY — TEAM MANAGEMENT (kept for backward compat) ====
  // ============================================================

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

  // ============================================================
  // === LEGACY — BULK ORDERS ===================================
  // ============================================================

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
    const [bulkOrders, groupedOrders] = await Promise.all([
      this.getBulkOrdersByUser(userId),
      this.getCommandesGroupees(userId),
    ]);

    const fromBulk = bulkOrders.map((order) => this.toOrderResponse(order));
    const fromGrouped = groupedOrders.map((cmd) => ({
      id: cmd.id,
      numero: cmd.numero,
      restaurantNom: 'Restaurant partenaire',
      dateLivraison: cmd.dateLivraison,
      heureLivraison: cmd.heureLivraison,
      status: cmd.statut,
      total: cmd.totalEstime,
      type: 'GROUPEE',
      nbLignes: cmd.nbLignes,
    }));

    return [...fromGrouped, ...fromBulk].sort(
      (a, b) =>
        new Date(b.dateLivraison ?? 0).getTime() -
        new Date(a.dateLivraison ?? 0).getTime(),
    );
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
    if (!order) throw new NotFoundException('Bulk order not found');

    const validTransitions: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['DELIVERED', 'CANCELLED'],
      DELIVERED: [],
      CANCELLED: [],
    };

    if (!updateDto.status) throw new BadRequestException('status is required');
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

  // ============================================================
  // === LEGACY — INVOICES ======================================
  // ============================================================

  async getInvoicesByUser(userId: string): Promise<Record<string, any>[]> {
    // Prefer FactureMensuelleB2B, fall back to legacy Invoice
    const facturesMensuelles = await this.getFacturesMensuelles(userId);
    if (facturesMensuelles.length > 0) return facturesMensuelles;

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
      status: invoice.status === 'PAID' ? 'PAYEE' : 'EN_ATTENTE',
      dueDate: invoice.dueDate.toISOString().slice(0, 10),
      pdfUrl: '#',
    }));
  }

  async getInvoiceById(invoiceId: string, userId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, b2bClientId: userId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  // ============================================================
  // === DASHBOARD ==============================================
  // ============================================================

  async getDashboard(userId: string): Promise<Record<string, any>> {
    const compte = await this.getCompteB2B(userId);
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfNext = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [bulkOrders, groupedOrders, collaborateurs, factures] =
      await Promise.all([
        this.bulkOrderRepository.find({
          where: { createdByUserId: userId },
          order: { createdAt: 'DESC' },
        }),
        compte ? this.getCommandesGroupees(userId) : Promise.resolve([]),
        compte ? this.getCollaborateursB2B(userId) : Promise.resolve([]),
        compte ? this.getFacturesMensuelles(userId) : Promise.resolve([]),
      ]);

    const totalBulk = bulkOrders.reduce((s, o) => s + Number(o.total), 0);
    const totalGrouped = groupedOrders
      .filter((o) => o.statut !== 'ANNULEE')
      .reduce((s, o) => s + o.totalEstime, 0);

    const monthlyExpenses = totalBulk + totalGrouped;
    const unpaidInvoices = factures.filter(
      (f) => f.statut === 'EN_ATTENTE' || f.statut === 'RETARDEE',
    ).length;

    const recentOrders = await this.getOrdersByUser(userId);

    return {
      compte: compte
        ? {
            id: compte.id,
            raisonSociale: compte.raisonSociale,
            statut: compte.statutValidation,
            actif: compte.actif,
          }
        : null,
      monthlyExpenses,
      monthlyOrders: bulkOrders.length + groupedOrders.length,
      activeCollaborators: collaborateurs.filter((c) => c.actif).length,
      unpaidInvoices,
      recentOrders: recentOrders.slice(0, 5),
      upcomingDeliveries: groupedOrders
        .filter((o) => o.statut === 'EN_ATTENTE' || o.statut === 'CONFIRMEE')
        .slice(0, 3)
        .map((o) => ({
          id: o.id,
          dateLivraison: o.dateLivraison,
          heureLivraison: o.heureLivraison,
          adresseLivraison: o.adresseLivraison ?? o.lieuLivraison,
          nbRepas: o.nbLignes,
        })),
    };
  }

  // ============================================================
  // === COLLABORATORS (legacy endpoint, now uses CollaborateurB2B)
  // ============================================================

  async getCollaboratorsByUser(userId: string): Promise<any[]> {
    // First try new B2B collaborator system
    const compte = await this.getCompteB2B(userId);
    if (compte) {
      return this.getCollaborateursB2B(userId);
    }

    // Fallback to legacy TeamMember
    const teamMembers = await this.teamMemberRepository.find({
      where: { active: true },
      relations: ['user', 'team'],
    });

    return teamMembers
      .filter((member) => member.team?.createdByUserId === userId)
      .map((member) => ({
        id: member.user?.id ?? member.userId,
        nom: member.user?.nom,
        email: member.user?.email,
        role: member.role,
        actif: member.active,
        limiteBudget: 0,
        depenseActuelle: 0,
      }));
  }

  async createCollaborator(
    currentUserId: string,
    dto: { nom?: string; email?: string; limiteBudget?: number; role?: string },
  ): Promise<Record<string, any>> {
    if (!dto?.nom || !dto?.email) {
      throw new BadRequestException('nom et email sont requis');
    }

    // Try new system first
    const compte = await this.getCompteB2B(currentUserId);
    if (compte) {
      return this.createCollaborateurB2B(currentUserId, {
        nom: dto.nom,
        email: dto.email,
        limiteBudget: dto.limiteBudget ?? 50000,
        role: dto.role,
      });
    }

    // Legacy: create user + team member
    let targetUser = await this.userRepository.findOne({
      where: { email: dto.email.trim().toLowerCase() },
    });

    if (targetUser && targetUser.role !== Role.B2B) {
      throw new BadRequestException(
        'Le collaborateur doit être un utilisateur B2B',
      );
    }

    let tempPassword: string | undefined;
    if (!targetUser) {
      tempPassword = Math.random().toString(36).slice(-10);
      targetUser = this.userRepository.create({
        nom: dto.nom,
        email: dto.email.trim().toLowerCase(),
        role: Role.B2B,
        actif: true,
        password: await bcrypt.hash(tempPassword, 12),
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
      limiteBudget: dto.limiteBudget ?? 0,
      depenseActuelle: 0,
      tempPassword,
    };
  }

  // ============================================================
  // === UTILITY ================================================
  // ============================================================

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
      type: 'BULK',
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

  async initierPaiementFacture(
    factureId: string,
    userId: string,
  ): Promise<{ paymentUrl: string; transactionId: string }> {
    const compte = await this.getCompteB2B(userId);
    if (!compte) throw new NotFoundException('Compte entreprise introuvable');

    const facture = await this.factureRepository.findOne({
      where: { id: factureId, compteB2B: { id: compte.id } },
    });
    if (!facture) throw new NotFoundException('Facture introuvable');
    if (facture.statut === 'PAYEE')
      throw new BadRequestException('Facture déjà payée');

    const apiKey = this.configService.get<string>('NOVASEND_API_KEY');
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const backendUrl =
      this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';

    if (!apiKey) {
      // Fallback simulation: mark as paid directly if no API key configured
      facture.statut = 'PAYEE';
      await this.factureRepository.save(facture);
      return {
        paymentUrl: `${frontendUrl}/b2b?payment=success&factureId=${factureId}`,
        transactionId: `SIM-${factureId.slice(0, 8)}`,
      };
    }

    const payload = {
      amount: Math.round(Number(facture.montantTTC || 0)),
      currency: 'XOF',
      description: `Facture ${facture.numeroFacture || factureId.slice(0, 8)} — RESTODICI B2B`,
      reference: `b2b-facture-${factureId}`,
      metadata: { factureId, compteId: compte.id, userId },
      callback_url: `${backendUrl}/paiements/webhook/novasend`,
      return_url: `${frontendUrl}/b2b?payment=success&factureId=${factureId}`,
      cancel_url: `${frontendUrl}/b2b?payment=cancelled&factureId=${factureId}`,
    };

    const response = await axios.post(
      'https://api.novasend.ci/v1/payments',
      payload,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      },
    );

    const { payment_url, transaction_id } = response.data;
    return { paymentUrl: payment_url, transactionId: transaction_id };
  }

  // ── Dev/test helper ──────────────────────────────────────────────────────────
  async createFactureTest(userId: string): Promise<FactureMensuelleB2B> {
    const compte = await this.getCompteB2B(userId);
    if (!compte) throw new NotFoundException('Compte entreprise introuvable');

    const now = new Date();
    const moisNoms = [
      'JANVIER',
      'FEVRIER',
      'MARS',
      'AVRIL',
      'MAI',
      'JUIN',
      'JUILLET',
      'AOUT',
      'SEPTEMBRE',
      'OCTOBRE',
      'NOVEMBRE',
      'DECEMBRE',
    ];
    const mois = moisNoms[now.getMonth()];
    const annee = now.getFullYear();

    // Remove any existing test facture for this month so it can be recreated
    const existing = await this.factureRepository.findOne({
      where: { compteB2B: { id: compte.id }, mois, annee },
    });
    if (existing) await this.factureRepository.remove(existing);

    const montantHT = 42_373; // ~50 000 FCFA TTC
    const tva = Math.round(montantHT * 0.18);
    const montantTTC = montantHT + tva;
    const seq = String(Math.floor(Math.random() * 9000) + 1000);
    const numeroFacture = `RDI-B2B-${annee}${String(now.getMonth() + 1).padStart(2, '0')}-TEST${seq}`;
    const echeance = new Date(annee, now.getMonth() + 1, 15)
      .toISOString()
      .slice(0, 10);

    const facture = this.factureRepository.create({
      compteB2B: compte,
      annee,
      mois,
      statut: 'EN_ATTENTE',
      montantHT,
      tva,
      montantTTC,
      numeroFacture,
      nifClient: compte.numeroContribuable,
      rccmClient: compte.numeroRCCM,
      echeance,
    });

    return this.factureRepository.save(facture);
  }

  // ============================================================
  // === PLANS REPAS RÉCURRENTS =================================
  // ============================================================

  private computeNextDelivery(frequence: FrequencePlan): Date {
    const now = new Date();
    if (frequence === 'HEBDO') {
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      const next = new Date(now);
      next.setDate(now.getDate() + daysUntilMonday);
      next.setHours(12, 0, 0, 0);
      return next;
    } else {
      const next = new Date(now);
      next.setMonth(now.getMonth() + 1, 1);
      next.setHours(12, 0, 0, 0);
      return next;
    }
  }

  async getPlansRepas(userId: string): Promise<PlanRepasB2B[]> {
    const compte = await this.compteB2BRepository.findOne({
      where: { responsable: { id: userId } },
    });
    if (!compte) return [];
    return this.planRepasRepository.find({
      where: { compteId: compte.id },
      order: { createdAt: 'ASC' },
    });
  }

  async createPlanRepas(
    userId: string,
    dto: { nom: string; frequence: string; nbRepas: number; budgetRepas: number; notes?: string },
  ): Promise<PlanRepasB2B> {
    const compte = await this.compteB2BRepository.findOne({
      where: { responsable: { id: userId } },
    });
    if (!compte) throw new BadRequestException('Compte entreprise introuvable');

    const plan = this.planRepasRepository.create({
      compteId: compte.id,
      nom: dto.nom,
      frequence: (dto.frequence as FrequencePlan) || 'HEBDO',
      nbRepas: dto.nbRepas || 1,
      budgetRepas: dto.budgetRepas,
      notes: dto.notes,
      actif: true,
      prochaineLivraison: this.computeNextDelivery((dto.frequence as FrequencePlan) || 'HEBDO'),
    });
    return this.planRepasRepository.save(plan);
  }

  async togglePlanRepas(id: string, userId: string): Promise<PlanRepasB2B> {
    const compte = await this.compteB2BRepository.findOne({
      where: { responsable: { id: userId } },
    });
    if (!compte) throw new NotFoundException('Compte introuvable');

    const plan = await this.planRepasRepository.findOne({
      where: { id, compteId: compte.id },
    });
    if (!plan) throw new NotFoundException('Plan repas introuvable');

    plan.actif = !plan.actif;
    if (plan.actif) {
      plan.prochaineLivraison = this.computeNextDelivery(plan.frequence);
    }
    return this.planRepasRepository.save(plan);
  }

  async deletePlanRepas(id: string, userId: string): Promise<void> {
    const compte = await this.compteB2BRepository.findOne({
      where: { responsable: { id: userId } },
    });
    if (!compte) throw new NotFoundException('Compte introuvable');

    const plan = await this.planRepasRepository.findOne({
      where: { id, compteId: compte.id },
    });
    if (!plan) throw new NotFoundException('Plan repas introuvable');

    await this.planRepasRepository.delete(id);
  }

  @Cron('0 7 * * *')
  async rollerPlansRepas(): Promise<void> {
    const now = new Date();
    const plans = await this.planRepasRepository.find({ where: { actif: true } });
    for (const plan of plans) {
      if (plan.prochaineLivraison && plan.prochaineLivraison <= now) {
        plan.prochaineLivraison = this.computeNextDelivery(plan.frequence);
        await this.planRepasRepository.save(plan);
      }
    }
  }
}
