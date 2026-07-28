import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LigneCommandeGroupeeDto {
  @IsString()
  articleId!: string;

  @IsOptional()
  @IsString()
  nomArticle?: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantite!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  prixUnitaire!: number;

  @IsOptional()
  @IsString()
  collaborateurId?: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}

export class CreateCommandeGroupeeDto {
  @IsString()
  dateLivraison!: string;

  @IsString()
  heureLivraison!: string;

  @IsString()
  lieuLivraison!: string;

  @IsOptional()
  @IsString()
  adresseLivraison?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneCommandeGroupeeDto)
  lignes!: LigneCommandeGroupeeDto[];
}
