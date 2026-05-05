import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateCategorieDto {
  @IsString()
  nom!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icone?: string;

  @IsBoolean()
  @IsOptional()
  actif?: boolean;
}