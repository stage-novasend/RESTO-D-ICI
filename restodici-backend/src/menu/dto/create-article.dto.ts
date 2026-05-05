import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, Min, IsUUID, IsUrl } from 'class-validator';

export class CreateArticleDto {
  @IsString() nom!: string;
  @IsString() @IsOptional() description?: string;
  @IsNumber() @Min(0.01) prix!: number;
  @IsUrl() @IsOptional() photoUrl?: string;
  @IsBoolean() @IsOptional() disponible?: boolean;
  @IsNumber() @Min(0) @IsOptional() stock?: number;
  @IsArray() @IsOptional() allergenes?: string[];
  @IsString() @IsOptional() cible?: string;
  @IsUUID() categorieId!: string;
}