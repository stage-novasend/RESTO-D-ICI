import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { B2BService } from '../services/b2b.service';
import { Public } from '../../auth/decorators/public.decorator';

// L'invité n'a pas encore de compte : l'accès se fait par token d'invitation.
@Public()
@Controller('b2b/invitations')
export class B2BInvitationsController {
  constructor(private readonly b2bService: B2BService) {}

  @Get(':token')
  async getInvitation(@Param('token') token: string) {
    return this.b2bService.getInvitationByToken(token);
  }

  @Post(':token/accept')
  async acceptInvitation(
    @Param('token') token: string,
    @Body() body: { password: string; prenom?: string },
  ) {
    return this.b2bService.acceptInvitation(token, body.password, body.prenom);
  }
}
