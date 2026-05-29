import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Article } from '../menu/entities/article.entity';
import { CollaborateurB2B } from './entities/collaborateur-b2b.entity';
import { CompteB2B } from './entities/compte-b2b.entity';
import { CommandeGroupeeB2B } from './entities/commande-groupee-b2b.entity';
import { LigneCommandeGroupeeB2B } from './entities/ligne-commande-groupee-b2b.entity';
import { AuditLogB2B } from './entities/audit-log-b2b.entity';
import { FactureMensuelleB2B } from './entities/facture-mensuelle-b2b.entity';

@Injectable()
export class B2BService {
  constructor(
    @InjectRepository(CompteB2B)
    private readonly compteB2BRepo: Repository<CompteB2B>,
    @InjectRepository(CollaborateurB2B)
    private readonly collabRepo: Repository<CollaborateurB2B>,
    @InjectRepository(CommandeGroupeeB2B)
    private readonly commandeRepo: Repository<CommandeGroupeeB2B>,
    @InjectRepository(LigneCommandeGroupeeB2B)
    private readonly ligneRepo: Repository<LigneCommandeGroupeeB2B>,
    @InjectRepository(AuditLogB2B)
    private readonly auditRepo: Repository<AuditLogB2B>,
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(FactureMensuelleB2B)
    private readonly factureRepo: Repository<FactureMensuelleB2B>,
  ) {}

  // ====== Controller API ======
  getDashboard(_reqUser: any) {
    return this.getDashboardMock(); // on garde mock pour le reporting pour l’instant
  }

  async getCollaborators(reqUser: any) {
    const compteB2BId: string | undefined = reqUser?.compteB2BId;
    if (!compteB2BId) return [];
    const collabs = await this.collabRepo.find({
      where: { compteB2B: { id: compteB2BId } },
      order: { createdAt: 'DESC' },
      select: ['id', 'nom', 'email', 'limiteBudget'],
    });
    return collabs.map((c) => ({
      id: c.id,
      nom: c.nom,
      email: c.email,
      limiteBudget: Number(c.limiteBudget),
    }));
  }

  async createCollaborator(
    reqUser: any,
    dto: {
      nom: string;
      email: string;
      limiteBudget: number;
      compteB2BId?: string;
    },
  ) {
    const compteB2BId: string | undefined =
      reqUser?.compteB2BId ?? dto?.compteB2BId;
    if (!compteB2BId)
      throw new BadRequestException('compteB2BId manquant (reqUser ou dto)');
    if (!dto?.nom || !dto?.email || dto?.limiteBudget === undefined) {
      throw new BadRequestException('nom, email et limiteBudget sont requis');
    }

    const compteB2B = await this.compteB2BRepo.findOne({
      where: { id: compteB2BId, actif: true },
      select: ['id'],
    });
    if (!compteB2B) throw new NotFoundException('Compte B2B introuvable');

    const entity = this.collabRepo.create({
      nom: dto.nom,
      email: dto.email,
      limiteBudget: dto.limiteBudget,
      compteB2B: { id: compteB2B.id } as CompteB2B,
    });

    await this.collabRepo.save(entity);

    await this.auditRepo.save(
      this.auditRepo.create({
        compteB2B: { id: compteB2B.id } as CompteB2B,
        type: 'CREATION_COLLABORATEUR',
        actorUserId: reqUser?.id ?? 'unknown',
        actorEmail: reqUser?.email,
        meta: { collaborateurId: entity.id },
      }),
    );

    return {
      id: entity.id,
      nom: entity.nom,
      email: entity.email,
      limiteBudget: Number(entity.limiteBudget),
    };
  }

  async bulkOrder(reqUser: any, dto: any) {
    // Bulk order legacy: strict auth required.
    // Le DTO ne peut plus fournir compteB2BId (prévention accès/contournement).
    // dto attendu (front) :
    // {
    //   restaurantId,
    //   items: [{ articleId, quantite, collaborateurId }],
    //   livraison: { date, heure, adresse }
    // }
    const compteB2BId: string | undefined = reqUser?.compteB2BId;
    if (!compteB2BId) {
      throw new BadRequestException('compteB2BId manquant (reqUser)');
    }

    const compteB2B = await this.compteB2BRepo.findOne({
      where: { id: compteB2BId, actif: true },
    });
    if (!compteB2B) throw new NotFoundException('Compte B2B introuvable');

    if (!dto?.items?.length) throw new BadRequestException('items requis');
    const livraison = dto?.livraison;
    if (!livraison?.date || !livraison?.heure)
      throw new BadRequestException('date/heure livraison requis');
    if (!dto?.restaurantId)
      throw new BadRequestException('restaurantId requis');

    const compteCollaborateurs = await this.collabRepo.find({
      where: { compteB2B: { id: compteB2BId } },
      select: ['id', 'limiteBudget'],
    });
    const limiteByCollaborateur = new Map<string, number>(
      compteCollaborateurs.map((c) => [c.id, Number(c.limiteBudget)]),
    );

    // Chargement articles + calc total
    const articleIds = Array.from(
      new Set(dto.items.map((i: any) => i.articleId)),
    );
    const articles = await this.articleRepo.findByIds(articleIds);
    const articleById = new Map(articles.map((a) => [a.id, a]));

    // total par collaborateur (RG-33)
    const totalByCollaborateur = new Map<string, number>();

    for (const item of dto.items) {
      const article = articleById.get(item.articleId);
      if (!article)
        throw new NotFoundException(`Article introuvable: ${item.articleId}`);
      if (!article.disponible)
        throw new BadRequestException(`Article indisponible: ${article.nom}`);
      if (Number(article.stock) < Number(item.quantite)) {
        // (on ne modélise pas encore le stock décrément dans B2B)
      }
      const collabId: string = item.collaborateurId;
      if (!limiteByCollaborateur.has(collabId)) {
        throw new BadRequestException(
          'collaborateurId invalide pour ce compte',
        );
      }
      const lineTotal = Number(article.prix) * Number(item.quantite);
      totalByCollaborateur.set(
        collabId,
        (totalByCollaborateur.get(collabId) ?? 0) + lineTotal,
      );
    }

    const dépasse = Array.from(totalByCollaborateur.entries()).some(
      ([collabId, total]) => {
        const limit = limiteByCollaborateur.get(collabId) ?? 0;
        return total > limit;
      },
    );

    const count = await this.commandeRepo.count({
      where: { compteB2B: { id: compteB2BId } },
    });
    const year = new Date().getFullYear();
    const numero = `GB2B-${year}-${String(count + 1).padStart(4, '0')}`;

    const commande = this.commandeRepo.create({
      compteB2B: { id: compteB2BId } as CompteB2B,
      numero,
      dateLivraison: new Date(livraison.date),
      heureLivraison: livraison.heure,
      lieuLivraison: livraison?.lieu ?? 'siège',
      adresseLivraison: livraison?.adresse,
      totalEstime: dto.items.reduce((sum: number, item: any) => {
        const a = articleById.get(item.articleId);
        return sum + Number(a?.prix ?? 0) * Number(item.quantite);
      }, 0),
      statut: dépasse ? 'EN_VALIDATION' : 'EN_ATTENTE',
      deadlineAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
    });

    await this.commandeRepo.save(commande);

    const lignes: LigneCommandeGroupeeB2B[] = dto.items.map((item: any) => {
      const article = articleById.get(item.articleId);
      return this.ligneRepo.create({
        commandeGroupee: { id: commande.id } as CommandeGroupeeB2B,
        articleId: item.articleId,
        quantite: Number(item.quantite),
        prixUnitaire: Number(article?.prix ?? 0),
        collaborateur: { id: item.collaborateurId } as CollaborateurB2B,
        instructions: item.instructions,
      });
    });

    await this.ligneRepo.save(lignes);

    await this.auditRepo.save(
      this.auditRepo.create({
        compteB2B: { id: compteB2BId } as CompteB2B,
        type: 'CREATION_COMMANDE_GROUPEE',
        actorUserId: reqUser?.id ?? 'unknown',
        actorEmail: reqUser?.email,
        meta: { commandeGroupeeId: commande.id, depasseBudget: dépasse },
      }),
    );

    if (dépasse) {
      await this.auditRepo.save(
        this.auditRepo.create({
          compteB2B: { id: compteB2BId } as CompteB2B,
          type: 'VALIDATION_BUDGET',
          actorUserId: reqUser?.id ?? 'unknown',
          actorEmail: reqUser?.email,
          meta: { commandeGroupeeId: commande.id },
        }),
      );
    }

    return {
      id: commande.id,
      numero: commande.numero,
      statut: commande.statut,
    };
  }

  async getOrders(reqUser: any, compteB2BId?: string) {
    const idFromUser: string | undefined = reqUser?.compteB2BId;
    const compteId = idFromUser ?? compteB2BId;
    if (!compteId) return [];
    const commandes = await this.commandeRepo.find({
      where: { compteB2B: { id: compteId } },
      relations: ['lignes'],
      order: { createdAt: 'DESC' },
      take: 50,
    });

    // Adapter shape attendue par front B2BOrders.jsx
    return commandes.map((c) => ({
      id: c.id,
      numero: c.numero,
      restaurantNom: '—',
      dateLivraison: new Date(c.dateLivraison).toISOString().slice(0, 10),
      heureLivraison: c.heureLivraison,
      status: c.statut === 'EN_VALIDATION' ? 'EN_VALIDATION' : 'LIVREE',
      statut: c.statut,
      total: Number(c.totalEstime),
      deliveryAddress: c.adresseLivraison ?? c.lieuLivraison,
      createdAt: c.createdAt,
      deadlineAt: c.deadlineAt,
      items: (c.lignes ?? []).slice(0, 10).map((l) => ({
        quantity: Number(l.quantite),
        nom: l.articleId,
      })),
    }));
  }

  async getOrdersForManagement(reqUser: any) {
    const commandes = await this.commandeRepo.find({
      relations: ['lignes', 'compteB2B'],
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return commandes.map((c) => ({
      id: c.id,
      numero: c.numero,
      statut: c.statut,
      createdAt: c.createdAt,
      deadlineAt: c.deadlineAt,
      total: Number(c.totalEstime),
      type: 'B2B',
      source: c.compteB2B?.raisonSociale ?? 'Entreprise',
      livraison: c.adresseLivraison ?? c.lieuLivraison,
      items: (c.lignes ?? []).map((l) => ({
        nom: l.articleId,
        quantite: Number(l.quantite),
      })),
    }));
  }

  async getInvoices(reqUser: any) {
    const compteId = reqUser?.compteB2BId;
    if (!compteId) return [];

    const now = new Date();
    const annee = now.getUTCFullYear();
    const moisIndex = now.getUTCMonth(); // 0-11
    const moisNames = [
      'JAN',
      'FÈV',
      'MAR',
      'AVR',
      'MAI',
      'JUN',
      'JUI',
      'AOU',
      'SEP',
      'OCT',
      'NOV',
      'DÉC',
    ];
    const mois = moisNames[moisIndex] ?? String(moisIndex);

    // Récupérer commandes groupées du mois pour ce compte
    const start = new Date(Date.UTC(annee, moisIndex, 1));
    const end = new Date(Date.UTC(annee, moisIndex + 1, 1));

    const commandes = await this.commandeRepo.find({
      where: {
        compteB2B: { id: compteId },
        createdAt: Between(start, end),
      },
      select: ['id', 'totalEstime'],
    });

    const montantHT = commandes.reduce(
      (sum, c) => sum + Number(c.totalEstime ?? 0),
      0,
    );
    const tva = Number((montantHT * 0.18).toFixed(2));
    const montantTTC = Number((montantHT + tva).toFixed(2));

    // Créer ou récupérer facture
    const existing = await this.factureRepo.findOne({
      where: { compteB2B: { id: compteId }, annee, mois },
    });

    if (!existing) {
      const compte = await this.compteB2BRepo.findOne({
        where: { id: compteId },
        select: ['numeroRCCM', 'numeroContribuable'],
      });
      const facture = this.factureRepo.create({
        compteB2B: { id: compteId } as CompteB2B,
        annee,
        mois,
        statut: 'EN_ATTENTE',
        montantHT,
        tva,
        montantTTC,
        nifClient: compte?.numeroContribuable,
        rccmClient: compte?.numeroRCCM,
        numeroFacture: undefined,
        pdfUrl: undefined,
        echeance: `${String(new Date(Date.UTC(annee, moisIndex + 1, 0)).getUTCDate()).padStart(2, '0')}/${String(moisIndex + 1).padStart(2, '0')}/${annee}`,
      });

      await this.factureRepo.save(facture);

      await this.auditRepo.save(
        this.auditRepo.create({
          compteB2B: { id: compteId } as CompteB2B,
          type: 'GENERATION_FACTURE',
          actorUserId: reqUser?.id ?? 'unknown',
          actorEmail: reqUser?.email,
          meta: { annee, mois, montantHT, tva, montantTTC },
        }),
      );

      return [facture];
    }

    // Adapter shape front
    return [
      {
        ...existing,
        montant: Number(existing.montantTTC ?? existing.montantHT ?? 0),
        nifEntreprise: existing.nifRestaurant ?? existing.nifClient,
        rccmEntreprise: existing.rccmRestaurant ?? existing.rccmClient,
      },
    ];
  }

  getReports(_reqUser: any) {
    return this.getReportsMock();
  }

  // ===== US-34 (RG-33) - Création compte B2B =====
  async creerCompteB2B(dto: any) {
    const rccmRegex = /^CI-[A-Z]{3}-\d{4}-[A-Z]-\d{4}$/;
    if (!dto?.numeroRCCM || !rccmRegex.test(dto.numeroRCCM)) {
      throw new BadRequestException(
        'Format RCCM invalide. Ex: CI-ABJ-2026-B-1234',
      );
    }

    const domaineInterdits = [
      'gmail.com',
      'yahoo.fr',
      'outlook.com',
      'hotmail.com',
    ];
    const domaine = String(dto?.emailProfessionnel ?? '')
      .split('@')[1]
      ?.toLowerCase();
    if (!domaine || domaineInterdits.includes(domaine)) {
      throw new BadRequestException(
        'Veuillez utiliser un email professionnel (nom@entreprise.com)',
      );
    }

    const telRegex = /^\+225\d{8}$/;
    if (
      !dto?.telephoneProfessionnel ||
      !telRegex.test(dto.telephoneProfessionnel)
    ) {
      throw new BadRequestException(
        'Format téléphone invalide. Ex: +22507070707',
      );
    }

    const compte = this.compteB2BRepo.create({
      ...dto,
      statutValidation: 'EN_ATTENTE',
      actif: false,
    });

    return this.compteB2BRepo.save(compte);
  }

  async validerCompteB2B(compteId: string, adminId: string) {
    const compte = await this.compteB2BRepo.findOne({
      where: { id: compteId },
    });
    if (!compte) throw new NotFoundException('Compte B2B non trouvé');

    compte.statutValidation = 'VALIDE';
    compte.dateValidation = new Date();
    compte.validePar = adminId;
    compte.actif = true;

    return this.compteB2BRepo.save(compte);
  }

  // ====== Mock implementations (à remplacer plus tard) ======
  getDashboardMock() {
    return {
      totalSpent: 1250000,
      pendingOrders: 3,
      activeCollaborators: 15,
      monthlyBudget: 2000000,
      monthlyExpenses: 1250000,
      monthlyOrders: 3,
      unpaidInvoices: 1,
      recentOrders: [
        {
          id: 'ORD-001',
          numero: 'ORD-001',
          dateCommande: '2026-05-10',
          total: 45000,
          status: 'livrée',
          restaurantNom: 'Restaurant Demo',
        },
        {
          id: 'ORD-002',
          numero: 'ORD-002',
          dateCommande: '2026-05-09',
          total: 78000,
          status: 'en cours',
          restaurantNom: 'Restaurant Demo',
        },
        {
          id: 'ORD-003',
          numero: 'ORD-003',
          dateCommande: '2026-05-08',
          total: 32000,
          status: 'confirmée',
          restaurantNom: 'Restaurant Demo',
        },
      ],
      upcomingDeliveries: [
        {
          id: 'DEL-1',
          dateLivraison: '2026-05-12',
          heureLivraison: '12:30',
          nbRepas: 50,
          adresseLivraison: 'Siège Abidjan',
        },
      ],
    };
  }

  getInvoicesMock() {
    return [
      {
        id: 'INV-05-2026',
        mois: 'MAI',
        annee: 2026,
        status: 'en_attente',
        montant: 4500000,
        echeance: '31/05/2026',
        nifEntreprise: 'NIF-RESTAURANT-DEMO',
        rccmEntreprise: 'RCCM-DEMO',
        pdfUrl: undefined,
      },
    ];
  }

  getReportsMock() {
    return {
      totalAmount: 1250000,
      orderCount: 3,
      activeCollaborators: 15,
      byCollaborator: [
        {
          id: 'emp1',
          nom: 'Jean Kouassi',
          email: 'jean@entreprise.com',
          montant: 620000,
        },
        {
          id: 'emp2',
          nom: 'Marie Koné',
          email: 'marie@entreprise.com',
          montant: 580000,
        },
      ],
    };
  }
}
