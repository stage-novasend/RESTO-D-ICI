import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import { User } from '../auth/entities/user.entity';
import { getCorsOrigins } from '../config/app-config';

// [SÉCURITÉ] CORS WebSocket restreint aux mêmes origines que HTTP (config centralisée).
@WebSocketGateway({
  cors: { origin: getCorsOrigins(), credentials: true },
  namespace: 'commandes',
})
export class CommandesGateway {
  @WebSocketServer() server!: Server;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  emitToClient(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToKitchen(restaurantId: string, event: string, data: any) {
    this.server.to(`restaurant:${restaurantId}:staff`).emit(event, data);
  }

  emitToManagers(event: string, data: any) {
    this.server.to('role:GERANT').emit(event, data);
    this.server.to('role:ADMIN').emit(event, data);
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake?.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.trim();
    }

    const authorizationHeader = client.handshake?.headers?.authorization;
    if (
      typeof authorizationHeader === 'string' &&
      authorizationHeader.startsWith('Bearer ')
    ) {
      return authorizationHeader.slice(7).trim();
    }

    return null;
  }

  private async resolveSocketUser(client: Socket): Promise<User | null> {
    const token = this.extractToken(client);
    if (!token) {
      return null;
    }

    let payload: { sub?: string } | null = null;
    try {
      // [SÉCURITÉ] Pas de fallback : JWT_SECRET validé au démarrage (main.ts).
      payload = jwt.verify(token, process.env.JWT_SECRET as string) as {
        sub?: string;
      };
    } catch {
      return null;
    }

    if (!payload?.sub) {
      return null;
    }

    return this.userRepository.findOne({
      where: { id: payload.sub, actif: true },
      relations: ['restaurant'],
    });
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(@ConnectedSocket() client: Socket) {
    const user = await this.resolveSocketUser(client);

    if (!user) {
      client.emit('subscribe.error', { message: 'Unauthorized' });
      client.disconnect();
      return { success: false };
    }

    void client.join(`user:${user.id}`);
    void client.join(`role:${user.role}`);

    if (
      user.restaurant?.id &&
      (user.role === 'STAFF' || user.role === 'GERANT' || user.role === 'ADMIN')
    ) {
      void client.join(`restaurant:${user.restaurant.id}:staff`);
    }

    return {
      success: true,
      userId: user.id,
      role: user.role,
      restaurantId: user.restaurant?.id,
    };
  }
}
