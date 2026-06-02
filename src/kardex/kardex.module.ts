import { Module } from '@nestjs/common';
import { KardexService } from './kardex.service';
import { InsumoKardexService } from './insumo-kardex.service';

@Module({
  providers: [KardexService, InsumoKardexService],
  exports: [KardexService, InsumoKardexService],
})
export class KardexModule {}