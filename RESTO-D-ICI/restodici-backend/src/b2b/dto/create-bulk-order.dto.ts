import {
  IsArray,
  IsString,
  IsNumber,
  IsOptional,
  ValidateNested,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

class BulkOrderItemDto {
  @IsString()
  articleId!: string;

  @IsNumber()
  quantity!: number;

  @IsNumber()
  unitPrice!: number;

  @IsNumber()
  @IsOptional()
  total?: number;
}

export class CreateBulkOrderDto {
  @ValidateNested({ each: true })
  @Type(() => BulkOrderItemDto)
  @IsArray()
  items!: BulkOrderItemDto[];

  @IsNumber()
  subtotal!: number;

  @IsNumber()
  @IsOptional()
  deliveryFee?: number;

  @IsNumber()
  total!: number;

  @IsString()
  @IsOptional()
  deliveryAddress?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDateString()
  @IsOptional()
  deliveryDateTime?: string;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsString()
  @IsOptional()
  recurrencePattern?: string;
}
