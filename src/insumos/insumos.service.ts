import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InsumosService {
  constructor(private prisma: PrismaService) {}

  // 1. CREAR
  async create(data: any) {
    // Validar que el código no exista para evitar caídas en Prisma
    const existe = await this.prisma.insumo.findUnique({ where: { codigo: data.codigo } });
    if (existe) throw new BadRequestException(`El código ${data.codigo} ya está registrado.`);

    return this.prisma.insumo.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        tipo: data.tipo,
        unidadMedida: data.unidadMedida,
        costoUnitario: Number(data.costoUnitario),
        stockActual: Number(data.stockActual),
      }
    });
  }

  // 2. LEER TODOS
  async findAll() {
    return this.prisma.insumo.findMany({
      orderBy: { id: 'desc' }
    });
  }

  // 3. LEER UNO
  async findOne(id: number) {
    const insumo = await this.prisma.insumo.findUnique({ where: { id } });
    if (!insumo) throw new NotFoundException('Insumo no encontrado');
    return insumo;
  }

  // 4. ACTUALIZAR (EDITAR)
  async update(id: number, data: any) {
    // Verificamos que el insumo exista
    await this.findOne(id);

    return this.prisma.insumo.update({
      where: { id },
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        tipo: data.tipo,
        unidadMedida: data.unidadMedida,
        costoUnitario: Number(data.costoUnitario),
        stockActual: Number(data.stockActual),
      }
    });
  }

  // 5. ELIMINAR
async remove(id: number) {
  try {
    await this.findOne(id); // Verificamos que exista
    return await this.prisma.insumo.delete({ where: { id } });
  } catch (error: any) {
    // Si el error es de Prisma P2003 (Foreign key constraint failed)
    if (error.code === 'P2003') {
      throw new BadRequestException(
        'No se puede eliminar: Este insumo ya está siendo usado en una Ficha Técnica o en una Orden de Producción.'
      );
    }
    throw error;
  }
}
}