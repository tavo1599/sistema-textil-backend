import { Module } from '@nestjs/common';
import { OrdenesService } from './ordenes.service';
import { OrdenesController } from './ordenes.controller';
import { PrismaModule } from '../prisma/prisma.module'; // <-- MUY IMPORTANTE

@Module({
  imports: [PrismaModule], // <-- Agrégalo aquí
  controllers: [OrdenesController],
  providers: [OrdenesService],
})
export class OrdenesModule {}