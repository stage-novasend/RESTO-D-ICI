import {
  IsUUID,
  IsIn,
  IsNumber,
  Min,
  IsOptional,
  IsString,
} from 'class-validator';
import type { NovaSendProvider } from '../novasend.service';

// Providers acceptés (aligné sur le type NovaSendProvider).
export const NOVASEND_PROVIDERS: NovaSendProvider[] = [
  'WAVE',
  'NOVASEND',
  'ORANGE',
  'MOMO',
  'MOOV',
  'CARTE',
];

export class InitierPaiementDto {
  @IsUUID()
  commandeId!: string;

  @IsIn(NOVASEND_PROVIDERS)
  provider!: NovaSendProvider;

  // Montant indicatif ; le serveur recalcule et fait autorité (cf. service).
  @IsNumber()
  @Min(1)
  montant!: number;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  otp?: string;

  /** Nom de l'intégration de paiement à utiliser (ex: 'novasend'). */
  @IsOptional()
  @IsString()
  integrationName?: string;
}
