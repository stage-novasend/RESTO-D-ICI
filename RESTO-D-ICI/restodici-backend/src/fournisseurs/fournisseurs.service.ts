import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fournisseur } from './entities/fournisseur.entity';

@Injectable()
export class FournisseursService {
  constructor(
    @InjectRepository(Fournisseur) private repo: Repository<Fournisseur>,
  ) {}

  findAll(): Promise<Fournisseur[]> {
    return this.repo.find({ order: { nom: 'ASC' } });
  }

  findActifs(): Promise<Fournisseur[]> {
    return this.repo.find({ where: { actif: true }, order: { nom: 'ASC' } });
  }

  async findOneOrFail(id: string): Promise<Fournisseur> {
    const f = await this.repo.findOne({ where: { id, actif: true } });
    if (!f)
      throw new NotFoundException(`Fournisseur introuvable ou inactif: ${id}`);
    return f;
  }

  create(dto: Partial<Fournisseur>): Promise<Fournisseur> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: Partial<Fournisseur>): Promise<Fournisseur> {
    const f = await this.repo.findOneOrFail({ where: { id } });
    Object.assign(f, dto);
    return this.repo.save(f);
  }

  async toggle(id: string): Promise<Fournisseur> {
    const f = await this.repo.findOneOrFail({ where: { id } });
    f.actif = !f.actif;
    return this.repo.save(f);
  }

  async remove(id: string): Promise<{ success: true }> {
    const f = await this.repo.findOneOrFail({ where: { id } });
    await this.repo.remove(f);
    return { success: true };
  }
}
