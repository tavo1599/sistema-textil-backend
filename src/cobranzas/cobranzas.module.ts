import { Module } from '@nestjs/common';
import { CobranzasService } from './cobranzas.service';
import { CobranzasController } from './cobranzas.controller';

@Module({
  controllers: [CobranzasController],
  providers: [CobranzasService],
})
export class CobranzasModule {}
