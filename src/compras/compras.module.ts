import { Module } from '@nestjs/common';
import { ComprasController } from './compras.controller';
import { ComprasService } from './compras.service';
import { KardexModule } from '../kardex/kardex.module';

@Module({
  imports: [KardexModule],
  controllers: [ComprasController],
  providers: [ComprasService],
})
export class ComprasModule {}