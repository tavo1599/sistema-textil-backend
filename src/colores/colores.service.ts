import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Ajusta la ruta según tu proyecto

@Injectable()
export class ColoresService {
  constructor(private prisma: PrismaService) {}

  // Listar todos los colores
  async findAll() {
    return this.prisma.color.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  // Crear un nuevo color
  async create(data: { nombre: string; codigo: string; codigoHex?: string }) {
    return this.prisma.color.create({
      data: {
        nombre: data.nombre,
        codigo: data.codigo.toUpperCase(), // Siempre en mayúsculas para el SKU
        codigoHex: data.codigoHex,
      },
    });
  }

  // Buscar un color por ID (útil para validaciones)
  async findOne(id: number) {
    return this.prisma.color.findUnique({ where: { id } });
  }
}