import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  // GET /notifications?page=1&limit=30 — historique de l'utilisateur courant
  @Get()
  list(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findForUser(req.user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 30,
    });
  }

  // GET /notifications/unread-count — badge « non lues »
  @Get('unread-count')
  async unreadCount(@Req() req: any) {
    return { count: await this.service.unreadCount(req.user.id) };
  }

  // PATCH /notifications/read-all — tout marquer lu
  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@Req() req: any) {
    await this.service.markAllRead(req.user.id);
    return { status: 'ok' };
  }

  // PATCH /notifications/:id/read — marquer une notif lue
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markRead(@Req() req: any, @Param('id') id: string) {
    await this.service.markRead(id, req.user.id);
    return { status: 'ok' };
  }

  // DELETE /notifications/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.service.remove(id, req.user.id);
    return { status: 'ok' };
  }
}
