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

  @Transform(({ value }) => value || undefined)
  @IsOptional()
  @IsUUID()
  restaurantId?: string;
}
