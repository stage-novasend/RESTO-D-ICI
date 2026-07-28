import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';

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

  @IsUUID()
  @IsOptional()
  restaurantId?: string;
}
