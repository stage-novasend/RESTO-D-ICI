// src/b2b/b2b.services.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompteB2B } from './entities/compte-b2b.entity';

@Injectable()
export class B2BService {
  constructor(
    @InjectRepository(CompteB2B)
    private compteB2BRepo: Repository<CompteB2B>,
  ) {}

  async creerCompteB2B(dto: any): Promise<CompteB2B> {
    // 1. Validation format RCCM (CI-ABJ-2026-B-XXXX)
    const rccmRegex = /^CI-[A-Z]{3}-\d{4}-[A-Z]-\d{4}$/;
    if (!rccmRegex.test(dto.numeroRCCM)) {
      throw new BadRequestException(
        'Format RCCM invalide. Ex: CI-ABJ-2026-B-1234',
      );
    }

    // 2. Vérification email professionnel (pas Gmail/Yahoo)
    const domaineInterdits = [
      'gmail.com',
      'yahoo.fr',
      'outlook.com',
      'hotmail.com',
    ];
    const domaine = dto.emailProfessionnel.split('@')[1].toLowerCase();
    if (domaineInterdits.includes(domaine)) {
      throw new BadRequestException(
        'Veuillez utiliser un email professionnel (nom@entreprise.com)',
      );
    }

    // 3. Vérification téléphone format E.164
    const telRegex = /^\+225\d{8}$/;
    if (!telRegex.test(dto.telephoneProfessionnel)) {
      throw new BadRequestException(
        'Format téléphone invalide. Ex: +22507070707',
      );
    }

    // 4. Création compte avec statut EN_ATTENTE
    const compte = this.compteB2BRepo.create({
      ...dto,
      statutValidation: 'EN_ATTENTE',
      actif: false,
    });

    //  FIX: Cast via unknown pour satisfaire TypeORM strict
    return this.compteB2BRepo.save(compte) as unknown as CompteB2B;
  }

  async validerCompteB2B(
    compteId: string,
    adminId: string,
  ): Promise<CompteB2B> {
    const compte = await this.compteB2BRepo.findOne({
      where: { id: compteId },
    });

    if (!compte) {
      throw new NotFoundException('Compte B2B non trouvé');
    }

    compte['statutValidation'] = 'VALIDE';
    compte['dateValidation'] = new Date();
    compte['validePar'] = adminId;
    compte.actif = true;


    //  FIX: Cast via unknown
    return this.compteB2BRepo.save(compte);
  }
}
