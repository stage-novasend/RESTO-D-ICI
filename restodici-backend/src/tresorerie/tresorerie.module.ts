import { Module } from '@nestjs/common';
import { TresorerieController } from './tresorerie.controller';
import { TresorerieService } from './tresorerie.service';

@Module({
  controllers: [TresorerieController],
  providers: [TresorerieService],
  exports: [TresorerieService],
})
export class TresorerieModule {}
