// src/auth/dto/register.dto.ts
import { IsString, IsEmail, IsOptional, IsIn, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email invalide' })
  email!: string;

  @IsString()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  nom!: string;

  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre',
  })
  password!: string;

  @IsString()
  @IsOptional()
  telephone?: string;

  //  RG-31 : Rôle optionnel à l'inscription (défaut: CLIENT)
  @IsOptional()
  @IsIn(['ADMIN', 'GERANT', 'STAFF', 'CLIENT', 'B2B'], {
    message: 'Rôle invalide. Valeurs acceptées: ADMIN, GERANT, STAFF, CLIENT, B2B',
  })
  role?: 'ADMIN' | 'GERANT' | 'STAFF' | 'CLIENT' | 'B2B';
}