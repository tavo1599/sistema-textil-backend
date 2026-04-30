import { Module } from '@nestjs/common';
import { AlmacenTerminadosService } from './almacen-terminados.service';
import { AlmacenTerminadosController } from './almacen-terminados.controller';
import { PrismaModule } from '../prisma/prisma.module'; // <-- IMPORTANTE AÑADIR ESTO

@Module({
  imports: [PrismaModule], // <-- Y AÑADIR ESTO AQUÍ
  controllers: [AlmacenTerminadosController],
  providers: [AlmacenTerminadosService],
})
export class AlmacenTerminadosModule {}