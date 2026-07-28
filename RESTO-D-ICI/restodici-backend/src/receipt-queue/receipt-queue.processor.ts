import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Commande } from '../commandes/entities/commande.entity';
import { TresorerieService } from '../tresorerie/tresorerie.service';
import { EmailService } from '../email/email.service';
import { StorageService } from '../storage/storage.service';
import { RECEIPT_QUEUE } from './receipt-queue.constants';

export interface ReceiptJobData {
  commandeId: string;
}

@Processor(RECEIPT_QUEUE)
@Injectable()
export class ReceiptQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(ReceiptQueueProcessor.name);

  constructor(
    @InjectRepository(Commande)
    private readonly commandeRepo: Repository<Commande>,
    private readonly tresorerieService: TresorerieService,
    private readonly emailService: EmailService,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<ReceiptJobData>): Promise<void> {
    const { commandeId } = job.data;
    this.logger.log(
      `[ReceiptQueue] Tentative ${job.attemptsMade + 1} — commande ${commandeId}`,
    );

    const commande = await this.commandeRepo.findOne({
      where: { id: commandeId },
      relations: ['client', 'restaurant', 'lignes', 'lignes.article'],
    });
    if (!commande) {
      this.logger.warn(
        `[ReceiptQueue] Commande ${commandeId} introuvable — abandon`,
      );
      return;
    }

    const lignes = (commande.lignes ?? []).map((l) => ({
      nom: l.article?.nom ?? 'Article',
      quantite: l.quantite,
      prixUnitaire: Number(l.prixUnitaire),
    }));

    const pdfBuffer = await this.tresorerieService.generateReceiptPdf({
      commandeId: commande.id,
      numero: commande.numero,
      restaurantNom: commande.restaurant.nom,
      restaurantAdresse: commande.restaurant.adresse,
      restaurantTelephone: commande.restaurant.telephone,
      restaurantEmail: commande.restaurant.email,
      restaurantNif: (commande.restaurant as any).nif,
      restaurantRccm: (commande.restaurant as any).rccm,
      clientNom:
        [commande.client?.prenom, commande.client?.nom]
          .filter(Boolean)
          .join(' ') || 'Client',
      lignes,
      montantTotal: Number(commande.montantTotal),
      modePaiement: commande.modePaiement,
      modeLivraison: commande.modeLivraison,
      payeAt: commande.payeAt,
    });

    // Persist PDF to S3
    if (!commande.recuPdfS3Key) {
      const s3Key = `receipts/${commande.id}/recu-${commande.numero}.pdf`;
      const uploaded = await this.storageService.uploadPdf(s3Key, pdfBuffer);
      if (uploaded) {
        await this.commandeRepo.update(commandeId, { recuPdfS3Key: s3Key });
        commande.recuPdfS3Key = s3Key;
      }
    }

    // Send email with PDF attachment
    if (commande.client?.email && !commande.recuEmailSent) {
      await this.emailService.sendReceiptEmail({
        to: commande.client.email,
        clientNom:
          [commande.client?.prenom, commande.client?.nom]
            .filter(Boolean)
            .join(' ') || 'Client',
        numero: commande.numero,
        montantTotal: Number(commande.montantTotal),
        modePaiement: commande.modePaiement,
        lignes,
        payeAt: commande.payeAt ?? new Date(),
        restaurantNom: commande.restaurant.nom,
        pdfBuffer,
      });
      await this.commandeRepo.update(commandeId, { recuEmailSent: true });
    }

    this.logger.log(
      `[ReceiptQueue] Reçu traité avec succès: ${commande.numero}`,
    );
  }
}
