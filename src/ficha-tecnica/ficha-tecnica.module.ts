import { Module } from '@nestjs/common';
import { FichaTecnicaService } from './ficha-tecnica.service';
import { FichaTecnicaController } from './ficha-tecnica.controller';

@Module({
  controllers: [FichaTecnicaController],
  providers: [FichaTecnicaService],
})
export class FichaTecnicaModule {}
