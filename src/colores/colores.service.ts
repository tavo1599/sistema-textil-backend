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

  // Actualizar un color
  async update(id: number, data: { nombre: string; codigo: string; codigoHex?: string }) {
    return this.prisma.color.update({
      where: { id },
      data: {
        nombre: data.nombre,
        codigo: data.codigo.toUpperCase(),
        codigoHex: data.codigoHex,
      },
    });
  }

  // Eliminar un color
  async remove(id: number) {
    // Nota: Si el color ya tiene prendas en stock, Prisma bloqueará la eliminación para proteger tus datos.
    return this.prisma.color.delete({ where: { id } });
  }

  // Buscar un color por ID (útil para validaciones)
  async findOne(id: number) {
    return this.prisma.color.findUnique({ where: { id } });
  }
}