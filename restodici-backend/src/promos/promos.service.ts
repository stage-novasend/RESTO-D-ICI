import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromoCode, TypePromo } from './entities/promo-code.entity';

export interface CreatePromoDto {
  code: string;
  type: TypePromo;
  valeur: number;
  description?: string;
  minMontant?: number;
  maxUses?: number | null;
  expiresAt?: string | null;
  actif?: boolean;
}

@Injectable()
export class PromosService {
  constructor(
    @InjectRepository(PromoCode) private promoRepo: Repository<PromoCode>,
  ) {}

  findByRestaurant(restaurantId: string): Promise<PromoCode[]> {
    return this.promoRepo.find({
      where: { restaurantId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(restaurantId: string, dto: CreatePromoDto): Promise<PromoCode> {
    const code = (dto.code || '').toUpperCase().replace(/\s+/g, '').slice(0, 40);
    if (!code) throw new BadRequestException('Code obligatoire');
    const exists = await this.promoRepo.findOne({ where: { code, restaurantId } });
    if (exists) throw new BadRequestException('Ce code existe déjà pour votre restaurant');

    const promo = this.promoRepo.create({
      code,
      type: dto.type || TypePromo.PERCENT,
      valeur: dto.valeur,
      description: dto.description,
      minMontant: dto.minMontant ?? 0,
      maxUses: dto.maxUses ?? undefined,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      actif: dto.actif !== false,
      restaurantId,
    });
    return this.promoRepo.save(promo);
  }

  async update(id: string, restaurantId: string, dto: Partial<CreatePromoDto>): Promise<PromoCode> {
    const promo = await this.getOwned(id, restaurantId);
    if (dto.code !== undefined) promo.code = dto.code.toUpperCase().replace(/\s+/g, '').slice(0, 40);
    if (dto.type !== undefined) promo.type = dto.type;
    if (dto.valeur !== undefined) promo.valeur = dto.valeur;
    if (dto.description !== undefined) promo.description = dto.description;
    if (dto.minMontant !== undefined) promo.minMontant = dto.minMontant;
    if ('maxUses' in dto) promo.maxUses = dto.maxUses ?? undefined;
    if ('expiresAt' in dto) promo.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : undefined;
    if (dto.actif !== undefined) promo.actif = dto.actif;
    return this.promoRepo.save(promo);
  }

  async toggle(id: string, restaurantId: string): Promise<PromoCode> {
    const promo = await this.getOwned(id, restaurantId);
    promo.actif = !promo.actif;
    return this.promoRepo.save(promo);
  }

  async remove(id: string, restaurantId: string): Promise<{ success: true }> {
    const promo = await this.getOwned(id, restaurantId);
    await this.promoRepo.remove(promo);
    return { success: true };
  }

  async validate(
    code: string,
    restaurantId: string,
    montantCommande: number,
  ): Promise<{ valid: true; promo: PromoCode; remise: number }> {
    const promo = await this.promoRepo.findOne({
      where: { code: code.toUpperCase(), restaurantId },
    });

    if (!promo || !promo.actif)
      throw new BadRequestException('Code promo invalide ou inactif');

    if (promo.expiresAt && new Date() > new Date(promo.expiresAt))
      throw new BadRequestException('Code promo expiré');

    if (promo.maxUses != null && promo.usedCount >= promo.maxUses)
      throw new BadRequestException('Code promo épuisé');

    if (montantCommande < Number(promo.minMontant))
      throw new BadRequestException(
        `Montant minimum requis : ${Number(promo.minMontant).toLocaleString('fr-FR')} FCFA`,
      );

    const remise = this.calcRemise(promo, montantCommande);
    return { valid: true, promo, remise };
  }

  calcRemise(promo: PromoCode, montant: number): number {
    switch (promo.type) {
      case TypePromo.PERCENT:
        return Math.round(montant * Number(promo.valeur) / 100);
      case TypePromo.FIXED:
        return Math.min(Number(promo.valeur), montant);
      default:
        return 0;
    }
  }

  async apply(promoId: string): Promise<void> {
    await this.promoRepo.increment({ id: promoId }, 'usedCount', 1);
  }

  private async getOwned(id: string, restaurantId: string): Promise<PromoCode> {
    const promo = await this.promoRepo.findOne({ where: { id } });
    if (!promo) throw new NotFoundException('Code promo introuvable');
    if (promo.restaurantId !== restaurantId) throw new ForbiddenException('Accès refusé');
    return promo;
  }
}
