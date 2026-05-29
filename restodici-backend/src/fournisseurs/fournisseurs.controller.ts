import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { FournisseursService } from './fournisseurs.service';

@Controller('fournisseurs')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class FournisseursController {
  constructor(private readonly svc: FournisseursService) {}

  // Lecture accessible aux opérationnels pour le sélecteur d'entrée de stock (US-19)
  @Get()
  @Roles('ADMIN', 'GERANT', 'STAFF')
  findAll() {
    return this.svc.findAll();
  }

  // Ci-dessous : écriture réservée ADMIN uniquement (US-24 / §4.2 Dossier)

  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: any) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.svc.update(id, dto);
  }

  @Patch(':id/toggle')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  toggle(@Param('id') id: string) {
    return this.svc.toggle(id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
