import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { In, Repository } from 'typeorm';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../email/email.service';
import { CompteB2B } from '../entities/compte-b2b.entity';
import { CommandeGroupeeB2B } from '../entities/commande-groupee-b2b.entity';
import { BulkOrder } from '../entities/bulk-order.entity';
import { FactureMensuelleB2B } from '../entities/facture-mensuelle-b2b.entity';
import { EXTERNAL_URLS } from '../../config/app-config';
import { B2bAuditService } from './b2b-audit.service';

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

/**
 * Facturation mensuelle B2B (FactureMensuelleB2B) — domaine extrait de
 * B2BService. Autonome : lookup du compte inliné (findCompteByUser) pour éviter
 * toute dépendance circulaire avec B2BService.
 *
 * Les helpers d'état de facture (getOverdueInvoiceCount, getPendingInvoiceEcheance,
 * ensureNoBlockedInvoices) sont publics : B2BService les appelle depuis les
 * domaines Compte (statut) et Commandes (blocage si impayé).
 */
@Injectable()
export class B2bFacturationService {
  private readonly logger = new Logger(B2bFacturationService.name);

  constructor(
    @InjectRepository(FactureMensuelleB2B)
    private factureRepository: Repository<FactureMensuelleB2B>,
    @InjectRepository(CompteB2B)
    private compteB2BRepository: Repository<CompteB2B>,
    @InjectRepository(CommandeGroupeeB2B)
    private commandeGroupeeRepository: Repository<CommandeGroupeeB2B>,
    @InjectRepository(BulkOrder)
    private bulkOrderRepository: Repository<BulkOrder>,
    private emailService: EmailService,
    private configService: ConfigService,
    private auditService: B2bAuditService,
  ) {}

  private async findCompteByUser(userId: string): Promise<CompteB2B | null> {
    return this.compteB2BRepository.findOne({
      where: { responsable: { id: userId } },
    });
  }

  // ── Helpers d'état de facture (partagés avec Compte & Commandes) ────────────

  async getOverdueInvoiceCount(compteId: string): Promise<number> {
    return this.factureRepository.count({
      where: { compteB2B: { id: compteId }, statut: 'RETARDEE' },
    });
  }

  async getPendingInvoiceEcheance(compteId: string): Promise<string | null> {
    const facture = await this.factureRepository.findOne({
      where: {
        compteB2B: { id: compteId },
        statut: In(['EN_ATTENTE', 'RETARDEE']),
      },
      order: { createdAt: 'DESC' },
    });
    return facture?.echeance ?? null;
  }

  async ensureNoBlockedInvoices(compteId: string): Promise<void> {
    const overdueCount = await this.getOverdueInvoiceCount(compteId);
    if (overdueCount > 0) {
      throw new BadRequestException(
        'Commande impossible : une facture mensuelle impayée bloque votre compte. Merci de régulariser votre situation.',
      );
    }
  }

  // ── Factures ────────────────────────────────────────────────────────────────

  async getFacturesMensuelles(
    userId: string,
    pagination?: { page?: number; limit?: number },
  ): Promise<Record<string, any>[]> {
    const compte = await this.findCompteByUser(userId);
    if (!compte) return [];

    // Pagination DB optionnelle (endpoint) ; liste complète sans params (stats).
    const take =
      pagination?.limit != null
        ? Math.min(Math.max(pagination.limit, 1), 200)
        : undefined;
    const skip =
      take != null ? (Math.max(pagination?.page ?? 1, 1) - 1) * take : undefined;

    const factures = await this.factureRepository.find({
      where: { compteB2B: { id: compte.id } },
      order: { createdAt: 'DESC' },
      take,
      skip,
    });

    return factures.map((f) => this.formatFacture(f, compte));
  }

  async payFacture(
    factureId: string,
    userId: string,
  ): Promise<Record<string, any>> {
    const compte = await this.findCompteByUser(userId);
    if (!compte) throw new NotFoundException('Compte entreprise introuvable');

    const facture = await this.factureRepository.findOne({
      where: { id: factureId, compteB2B: { id: compte.id } },
    });
    if (!facture) throw new NotFoundException('Facture introuvable');
    if (facture.statut === 'PAYEE')
      throw new BadRequestException('Facture déjà payée');

    facture.statut = 'PAYEE';
    const saved = await this.factureRepository.save(facture);

    await this.auditService.logAudit('PAIEMENT_FACTURE', compte.id, userId, {
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
    const compte = await this.findCompteByUser(userId);
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

    await this.auditService.logAudit('PAIEMENT_FACTURE', compte.id, userId, {
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
    const compte = await this.findCompteByUser(userId);
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

    await this.auditService.logAudit('GENERATION_FACTURE', compte.id, userId, {
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
    await this.auditService.logAudit('GENERATION_FACTURE', compte.id, 'SYSTEM', {
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
          this.logger.error(
            `Erreur email facture ${numeroFacture} : ${(err as Error).message}`,
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

  async initierPaiementFacture(
    factureId: string,
    userId: string,
  ): Promise<{ paymentUrl: string; transactionId: string }> {
    const compte = await this.findCompteByUser(userId);
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

    const response = await axios.post(EXTERNAL_URLS.novasendPayments, payload, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const { payment_url, transaction_id } = response.data;
    return { paymentUrl: payment_url, transactionId: transaction_id };
  }

  // ── Dev/test helper ──────────────────────────────────────────────────────────
  async createFactureTest(userId: string): Promise<FactureMensuelleB2B> {
    const compte = await this.findCompteByUser(userId);
    if (!compte) throw new NotFoundException('Compte entreprise introuvable');

    const now = new Date();
    const mois = MOIS_FR[now.getMonth()];
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
}
