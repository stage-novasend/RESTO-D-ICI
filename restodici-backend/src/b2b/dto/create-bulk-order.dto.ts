import {
  IsArray,
  IsString,
  IsNumber,
  IsOptional,
  ValidateNested,
  IsBoolean,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

class BulkOrderItemDto {
  @IsString()
  articleId!: string;

  @IsNumber()
  quantity!: number;

  @IsNumber()
  unitPrice!: number;
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

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  deliveryDateTime?: Date;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsString()
  @IsOptional()
  recurrencePattern?: string;
}
