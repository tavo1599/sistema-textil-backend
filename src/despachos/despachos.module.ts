import { Module } from '@nestjs/common';
import { DespachosController } from './despachos.controller';
import { DespachosService } from './despachos.service';
import { PrismaService } from '../prisma/prisma.service'; // Asegúrate de que esta ruta apunte a tu PrismaService

@Module({
  controllers: [DespachosController],
  providers: [DespachosService, PrismaService], // Pasamos los servicios aquí
})
export class DespachosModule {} // <-- ESTE ES EL EXPORT QUE NESTJS ESTÁ PIDIENDO A GRITOS