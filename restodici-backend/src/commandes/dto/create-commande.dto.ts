// src/commandes/dto/create-commande.dto.ts
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ModeLivraison } from '../entities/commande.entity';

export class CreateLigneDto {
  @IsNotEmpty()
  @IsString()
  articleId!: string;

  @ValidateIf((o) => o.quantity === undefined)
  @IsNumber()
  @Min(1)
  quantite!: number;

  @ValidateIf((o) => o.quantite === undefined)
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  variantLabel?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  variantSupplement?: number;
}

export class CreateCommandeDto {
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateLigneDto)
  lignes!: CreateLigneDto[];

  @IsEnum(ModeLivraison)
  modeLivraison!: ModeLivraison;

  @ValidateIf((o) => o.modeLivraison === 'LIVRAISON')
  @IsNotEmpty()
  @IsString()
  adresseLivraison?: string;

  @Transform(({ value }) => {
    // Accept any UUID-format string; strip everything else.
    // Frontend enforces strict UUID v4 — this is a safety net for the transport layer.
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return typeof value === 'string' && UUID_RE.test(value.trim())
      ? value.trim()
      : undefined;
  })
  @IsOptional()
  @IsString()
  restaurantId?: string;

  @IsOptional()
  @IsString()
  codePromo?: string;

  @IsOptional()
  @IsString()
  tableNumber?: string;

  /** Frais de livraison externe (ajoutés au montant total payé par le client) */
  @IsOptional()
  @IsNumber()
  @Min(0)
  fraisLivraison?: number;

  /** ID du fournisseur de livraison choisi */
  @IsOptional()
  @IsString()
  fournisseurLivraisonId?: string;
}
