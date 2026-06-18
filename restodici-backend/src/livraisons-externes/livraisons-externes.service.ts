import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { FournisseurLivraison, TypeFournisseurLivraison } from './entities/fournisseur-livraison.entity';
import { LivraisonExterne, StatutLivraisonExterne } from './entities/livraison-externe.entity';

@Injectable()
export class LivraisonsExternesService {
  constructor(
    @InjectRepository(FournisseurLivraison)
    private fournisseurRepo: Repository<FournisseurLivraison>,
    @InjectRepository(LivraisonExterne)
    private livraisonRepo: Repository<LivraisonExterne>,
  ) {}

  // ── Fournisseurs ────────────────────────────────────────────────

  findAllFournisseurs(restaurantId?: string): Promise<FournisseurLivraison[]> {
    const where: any = { actif: true };
    if (restaurantId) where.restaurantId = restaurantId;
    return this.fournisseurRepo.find({ where, order: { nom: 'ASC' } });
  }

  findAllFournisseursAdmin(): Promise<FournisseurLivraison[]> {
    return this.fournisseurRepo.find({ order: { nom: 'ASC' } });
  }

  async createFournisseur(dto: Partial<FournisseurLivraison>): Promise<FournisseurLivraison> {
    return this.fournisseurRepo.save(this.fournisseurRepo.create(dto));
  }

  async updateFournisseur(id: string, dto: Partial<FournisseurLivraison>): Promise<FournisseurLivraison> {
    const f = await this.fournisseurRepo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Fournisseur de livraison introuvable');
    Object.assign(f, dto);
    return this.fournisseurRepo.save(f);
  }

  async deleteFournisseur(id: string): Promise<void> {
    await this.fournisseurRepo.delete(id);
  }

  // ── Dispatch d'une commande vers un fournisseur ─────────────────

  async dispatch(payload: {
    commandeId: string;
    fournisseurId: string;
    adresseLivraison: string;
    adresseRetrait?: string;
    clientNom?: string;
    clientTelephone?: string;
    montantTotal?: number;
  }): Promise<LivraisonExterne> {
    const fournisseur = await this.fournisseurRepo.findOne({
      where: { id: payload.fournisseurId },
      select: ['id', 'nom', 'type', 'apiUrl', 'apiKey', 'fraisLivraisonDefaut'],
    });
    if (!fournisseur) throw new NotFoundException('Fournisseur de livraison introuvable');

    const livraison = this.livraisonRepo.create({
      commandeId: payload.commandeId,
      fournisseurId: payload.fournisseurId,
      adresseLivraison: payload.adresseLivraison,
      fraisLivraison: fournisseur.fraisLivraisonDefaut || 0,
      statut: StatutLivraisonExterne.EN_ATTENTE,
    });

    const saved = await this.livraisonRepo.save(livraison);

    // Appel API fournisseur si configuré
    if (fournisseur.apiUrl && fournisseur.apiKey) {
      try {
        const body = this.buildRequestBody(fournisseur.type, { ...payload, livraisonId: saved.id });
        const response = await axios.post<Record<string, any>>(
          fournisseur.apiUrl + '/orders',
          body,
          {
            headers: {
              Authorization: `Bearer ${fournisseur.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          },
        );
        const d = response.data;
        saved.referenceExterne = d?.id || d?.orderId || d?.reference;
        saved.statut = StatutLivraisonExterne.AFFECTEE;
        if (d?.trackingUrl) saved.trackingUrl = d.trackingUrl;
        saved.metadonnees = d;
        await this.livraisonRepo.save(saved);
      } catch {
        saved.statut = StatutLivraisonExterne.ECHEC;
        await this.livraisonRepo.save(saved);
      }
    }

    return saved;
  }

  // ── Réception d'un webhook de statut ───────────────────────────

  async handleWebhook(fournisseurId: string, body: any): Promise<void> {
    const referenceExterne: string | undefined =
      body?.id || body?.orderId || body?.reference || body?.delivery_id;
    const statutBrut: string | undefined =
      body?.status || body?.state || body?.delivery_status;

    if (!referenceExterne) return;

    const livraison = await this.livraisonRepo.findOne({
      where: { referenceExterne, fournisseurId },
    });
    if (!livraison) return;

    const mapping: Record<string, StatutLivraisonExterne> = {
      accepted: StatutLivraisonExterne.AFFECTEE,
      assigned: StatutLivraisonExterne.AFFECTEE,
      picked_up: StatutLivraisonExterne.EN_COURS,
      in_progress: StatutLivraisonExterne.EN_COURS,
      en_route: StatutLivraisonExterne.EN_COURS,
      delivered: StatutLivraisonExterne.LIVREE,
      completed: StatutLivraisonExterne.LIVREE,
      failed: StatutLivraisonExterne.ECHEC,
      cancelled: StatutLivraisonExterne.ANNULEE,
    };

    const nouveauStatut = statutBrut ? mapping[statutBrut.toLowerCase()] : undefined;
    if (nouveauStatut) {
      livraison.statut = nouveauStatut;
      if (body?.driver_name) livraison.nomLivreur = body.driver_name;
      if (body?.driver_phone) livraison.telephoneLivreur = body.driver_phone;
      await this.livraisonRepo.save(livraison);
    }
  }

  async getLivraisonsCommande(commandeId: string): Promise<LivraisonExterne[]> {
    return this.livraisonRepo.find({
      where: { commandeId },
      relations: ['fournisseur'],
      order: { createdAt: 'DESC' },
    });
  }

  // ── Construction du body selon le type de fournisseur ──────────

  private buildRequestBody(type: TypeFournisseurLivraison, data: any): object {
    switch (type) {
      case TypeFournisseurLivraison.YANGO:
        return {
          external_id: data.livraisonId,
          pickup_address: data.adresseRetrait || 'Restaurant',
          dropoff_address: data.adresseLivraison,
          customer_name: data.clientNom,
          customer_phone: data.clientTelephone,
          order_value: data.montantTotal,
        };
      case TypeFournisseurLivraison.GOZEM:
        return {
          order_id: data.livraisonId,
          delivery_address: data.adresseLivraison,
          pickup_address: data.adresseRetrait,
          customer: { name: data.clientNom, phone: data.clientTelephone },
          amount: data.montantTotal,
        };
      default:
        return {
          id: data.livraisonId,
          commandeId: data.commandeId,
          deliveryAddress: data.adresseLivraison,
          pickupAddress: data.adresseRetrait,
          customer: { name: data.clientNom, phone: data.clientTelephone },
          amount: data.montantTotal,
        };
    }
  }
}
