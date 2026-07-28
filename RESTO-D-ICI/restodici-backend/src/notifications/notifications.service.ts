import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any> | null;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  /** Persiste une notification et renvoie l'entité créée. */
  async create(input: CreateNotificationInput): Promise<Notification> {
    const notif = this.repo.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? null,
      read: false,
    });
    return this.repo.save(notif);
  }

  /** Liste paginée des notifications d'un utilisateur (plus récentes d'abord). */
  async findForUser(
    userId: string,
    { page = 1, limit = 30 }: { page?: number; limit?: number } = {},
  ): Promise<{ items: Notification[]; total: number; unread: number }> {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;

    const [items, total] = await this.repo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take,
      skip,
    });
    const unread = await this.unreadCount(userId);
    return { items, total, unread };
  }

  unreadCount(userId: string): Promise<number> {
    return this.repo.count({ where: { userId, read: false } });
  }

  /** Marque une notification comme lue (uniquement si elle appartient au user). */
  async markRead(id: string, userId: string): Promise<void> {
    await this.repo.update({ id, userId }, { read: true });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repo.update({ userId, read: false }, { read: true });
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.repo.delete({ id, userId });
  }
}
