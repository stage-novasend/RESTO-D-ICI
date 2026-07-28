import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsletterSubscriber } from './newsletter.entity';

@Injectable()
export class NewsletterService {
  constructor(
    @InjectRepository(NewsletterSubscriber)
    private repo: Repository<NewsletterSubscriber>,
  ) {}

  async subscribe(email: string): Promise<{ success: true; message: string }> {
    const normalized = (email || '').toLowerCase().trim();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new ConflictException('Adresse email invalide');
    }
    const exists = await this.repo.findOne({ where: { email: normalized } });
    if (exists) {
      return { success: true, message: 'Vous êtes déjà inscrit à la newsletter.' };
    }
    await this.repo.save(this.repo.create({ email: normalized }));
    return { success: true, message: 'Inscription confirmée ! Merci de nous rejoindre.' };
  }

  findAll(): Promise<NewsletterSubscriber[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async remove(id: string): Promise<{ success: true }> {
    await this.repo.delete(id);
    return { success: true };
  }
}
