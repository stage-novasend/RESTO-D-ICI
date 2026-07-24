import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import {
  PlanRepasB2B,
  FrequencePlan,
} from '../entities/plan-repas-b2b.entity';
import { CompteB2B } from '../entities/compte-b2b.entity';
import { B2bNotifyService } from './b2b-notify.service';

/**
 * Plans repas récurrents B2B (abonnements). Domaine extrait de B2BService
 * (God service) : entièrement autonome — repos PlanRepasB2B + CompteB2B.
 */
@Injectable()
export class B2bPlansRepasService {
  constructor(
    @InjectRepository(PlanRepasB2B)
    private planRepasRepository: Repository<PlanRepasB2B>,
    @InjectRepository(CompteB2B)
    private compteB2BRepository: Repository<CompteB2B>,
    private notifyService: B2bNotifyService,
  ) {}

  // Calcule la prochaine échéance selon la fréquence du plan.
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
    dto: {
      nom: string;
      frequence: string;
      nbRepas: number;
      budgetRepas: number;
      notes?: string;
    },
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
      prochaineLivraison: this.computeNextDelivery(
        (dto.frequence as FrequencePlan) || 'HEBDO',
      ),
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

  // CRON quotidien 7h : notifie les responsables dont un plan est dû, puis
  // avance l'échéance au cycle suivant (déclenchement régulier automatique).
  @Cron('0 7 * * *')
  async rollerPlansRepas(): Promise<void> {
    const now = new Date();
    const plans = await this.planRepasRepository.find({
      where: { actif: true },
      relations: ['compte', 'compte.responsable'],
    });
    for (const plan of plans) {
      if (plan.prochaineLivraison && plan.prochaineLivraison <= now) {
        const respId = plan.compte?.responsable?.id;
        if (respId) {
          await this.notifyService.notifyUser(
            respId,
            'plan.repas.du',
            'Plan repas récurrent',
            `Votre plan « ${plan.nom} » est prévu aujourd'hui (${plan.nbRepas} repas). Créez la commande groupée pour votre équipe.`,
            { planId: plan.id, nom: plan.nom, nbRepas: plan.nbRepas },
          );
        }
        plan.prochaineLivraison = this.computeNextDelivery(plan.frequence);
        await this.planRepasRepository.save(plan);
      }
    }
  }
}
