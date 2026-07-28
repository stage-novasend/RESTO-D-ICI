import { IsString, IsIn } from 'class-validator';

export class AddTeamMemberDto {
  @IsString()
  userId: string;

  @IsString()
  @IsIn(['MEMBER', 'ADMIN', 'OWNER'])
  role: string;
}
