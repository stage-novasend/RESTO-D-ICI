import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCompteB2BDto {
  @IsString()
  raisonSociale!: string;

  @IsString()
  @MinLength(5)
  numeroRCCM!: string;

  @IsString()
  @MinLength(5)
  numeroContribuable!: string;

  @IsEmail()
  emailProfessionnel!: string;

  @IsString()
  telephoneProfessionnel!: string;

  @IsOptional()
  @IsString()
  adresseSiege?: string;
}
