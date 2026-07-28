import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCollaborateurB2BDto {
  @IsNotEmpty()
  @IsString()
  nom!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  limiteBudget?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  budgetMensuel?: number;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  poste?: string;
}
