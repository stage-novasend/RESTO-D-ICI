// src/menu/dto/create-article.dto.ts
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsUUID,
  Min,
  IsNotEmpty,
  IsArray,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { CibleEnum } from '../entities/article.entity';

export class CreateArticleDto {
  @IsNotEmpty()
  @IsString()
  nom?: string; //  Requis

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0.01) // RG-05: prix > 0
  prix?: number; // Requis

  @IsUUID()
  @IsNotEmpty()
  categorieId?: string; //  Requis

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsBoolean()
  disponible?: boolean;

  @IsNumber()
  @Min(0)
  stock!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  seuilMin?: number; //  Optionnel

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergenes?: string[]; // string[]

  @IsOptional()
  @IsEnum(CibleEnum)
  cible?: CibleEnum; //  Optionnel

  @IsOptional()
  @IsUUID()
  restaurantId?: string;

  @IsOptional()
  @IsDateString()
  activationDate?: string;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @IsOptional()
  @IsBoolean()
  estMenuDuJour?: boolean;

  @IsOptional()
  @IsArray()
  variants?: Array<{ label: string; prixSupplement: number }>;
}
