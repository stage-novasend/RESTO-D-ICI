import { IsString, IsOptional, MinLength } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  @MinLength(8)
  password!: string; // Min. 8 caractères, aligné avec RegisterDto (audit §3.9)

  @IsString()
  @MinLength(2)
  @IsOptional()
  prenom?: string;
}
