import { Module } from '@nestjs/common';
import { TiendaService } from './tienda.service';
import { TiendaController } from './tienda.controller';
import { WebAdminController } from './web-admin.controller';
import { PrismaService } from '../prisma/prisma.service';
import { VentasModule } from '../ventas/ventas.module';

@Module({
  imports: [VentasModule],
  controllers: [TiendaController, WebAdminController],
  providers: [TiendaService, PrismaService],
})
export class TiendaModule {}
