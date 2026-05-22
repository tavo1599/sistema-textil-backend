import { Module } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { ClientesController } from './clientes.controller';
import { PrismaModule } from '../prisma/prisma.module'; // ⚠️ Asegúrate de que esta ruta apunte a tu PrismaModule

@Module({
  imports: [PrismaModule], // Inyectamos Prisma para poder usar la BD
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class ClientesModule {}