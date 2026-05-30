import { Module } from '@nestjs/common';
import { KardexService } from './kardex.service';

@Module({
  providers: [KardexService],
  exports: [KardexService], // se exporta para que ventas, compras y ordenes lo usen
})
export class KardexModule {}