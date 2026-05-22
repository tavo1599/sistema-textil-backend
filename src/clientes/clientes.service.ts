import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientesService {
  constructor(private prisma: PrismaService) {}

  // 🔍 Devuelve todos los clientes mayoristas registrados para el POS
  async findAll() {
    return this.prisma.cliente.findMany({
      orderBy: {
        nombre: 'asc',
      },
    });
  }

  // 📝 Crear un nuevo cliente mayorista blindado
  async create(data: { nombre: string; documento?: string; limiteCredito: number }) {
    return this.prisma.cliente.create({
      data: {
        nombre: data.nombre,
        // 🔥 SI VIENE VACÍO O UNDEFINED, SE GUARDA COMO NULL EN POSTGRESQL
        documento: data.documento || null, 
        limiteCredito: Number(data.limiteCredito), 
        saldoPendiente: 0, 
      }
    });
  }
}