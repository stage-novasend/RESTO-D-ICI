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
} from 'class-validator';
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
  instructions?: string; // EN-1917
}

export class CreateCommandeDto {
  @IsArray()
  @IsNotEmpty()
  lignes!: CreateLigneDto[];

  @IsEnum(ModeLivraison)
  modeLivraison!: ModeLivraison;

  @ValidateIf((o) => o.modeLivraison === 'LIVRAISON')
  @IsNotEmpty()
  @IsString()
  adresseLivraison?: string;

  @IsOptional()
  @IsUUID()
  restaurantId?: string;
}
