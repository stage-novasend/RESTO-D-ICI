import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateCategorieDto {
  @IsString() nom!: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() icone?: string;
  @IsString() @IsOptional() couleur?: string;
  @IsBoolean() @IsOptional() actif?: boolean;
}