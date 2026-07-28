import { IsString, IsIn } from 'class-validator';

export class UpdateBulkOrderStatusDto {
  @IsString()
  @IsIn(['PENDING', 'CONFIRMED', 'PROCESSING', 'DELIVERED', 'CANCELLED'])
  status?: string;
}
