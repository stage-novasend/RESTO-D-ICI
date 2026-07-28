// src/menu/dto/update-article.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateArticleDto } from './create-article.dto';

//  Rend tous les champs de CreateArticleDto optionnels
export class UpdateArticleDto extends PartialType(CreateArticleDto) {}
