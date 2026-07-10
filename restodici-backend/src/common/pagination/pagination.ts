import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** Query params de pagination réutilisables (?page=1&limit=20). */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Normalise page/limit → { take, skip, page } avec un plafond dur. */
export function paginationParams(page = 1, limit = 20, maxLimit = 100) {
  const take = Math.min(Math.max(Number(limit) || 20, 1), maxLimit);
  const p = Math.max(Number(page) || 1, 1);
  return { take, skip: (p - 1) * take, page: p };
}

/** Construit l'enveloppe paginée à partir d'un résultat findAndCount. */
export function buildPaginated<T>(
  items: T[],
  total: number,
  page: number,
  take: number,
): Paginated<T> {
  return {
    items,
    total,
    page,
    limit: take,
    totalPages: Math.max(1, Math.ceil(total / take)),
  };
}
