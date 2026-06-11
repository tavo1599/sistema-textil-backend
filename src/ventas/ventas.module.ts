import { Module } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';
import { KardexModule } from '../kardex/kardex.module';

@Module({
  imports: [KardexModule],
  controllers: [VentasController],
  providers: [VentasService],
  exports: [VentasService], // lo usa el módulo Tienda para convertir pedidos web en ventas
})
export class VentasModule {}