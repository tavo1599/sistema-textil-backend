import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InsumoKardexService } from '../kardex/insumo-kardex.service';

@Injectable()
export class InsumosService {
  constructor(
    private prisma: PrismaService,
    private insumoKardex: InsumoKardexService,
  ) {}

  // 1. CREAR
  async create(data: any) {
    // Validar que el código no exista para evitar caídas en Prisma
    const existe = await this.prisma.insumo.findUnique({ where: { codigo: data.codigo } });
    if (existe) throw new BadRequestException(`El código ${data.codigo} ya está registrado.`);

    const stockInicial = Number(data.stockActual) || 0;
    const costoUnitario = Number(data.costoUnitario) || 0;

    return this.prisma.$transaction(async (tx) => {
      // Creamos el insumo SIN stock; el stock se carga vía kardex para dejar rastro.
      const insumo = await tx.insumo.create({
        data: {
          codigo: data.codigo,
          nombre: data.nombre,
          tipo: data.tipo,
          unidadMedida: data.unidadMedida,
          costoUnitario: costoUnitario,
          stockActual: 0,
        },
      });

      // Si trae stock inicial, lo registramos como INGRESO en el kardex
      // (esto también deja stockActual en el valor correcto).
      if (stockInicial > 0) {
        await this.insumoKardex.registrarIngreso(tx, {
          insumoId: insumo.id,
          cantidad: stockInicial,
          costoUnitario: costoUnitario,
          motivo: 'Stock inicial (alta de insumo)',
          tipoMovimiento: 'INGRESO',
        });
      }

      return tx.insumo.findUnique({ where: { id: insumo.id } });
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
    const insumo = await this.findOne(id);

    const stockNuevo = Number(data.stockActual);
    const stockAnterior = Number(insumo.stockActual);

    return this.prisma.$transaction(async (tx) => {
      // Actualizamos los datos descriptivos (el stock NO se toca aquí directamente).
      await tx.insumo.update({
        where: { id },
        data: {
          codigo: data.codigo,
          nombre: data.nombre,
          tipo: data.tipo,
          unidadMedida: data.unidadMedida,
          costoUnitario: Number(data.costoUnitario),
        },
      });

      // Si el usuario cambió el stock a mano, lo registramos como AJUSTE en el kardex,
      // así el historial nunca se desincroniza del stock real.
      if (!isNaN(stockNuevo) && stockNuevo !== stockAnterior) {
        const delta = stockNuevo - stockAnterior;
        if (delta > 0) {
          await this.insumoKardex.registrarIngreso(tx, {
            insumoId: id,
            cantidad: delta,
            costoUnitario: Number(data.costoUnitario),
            motivo: 'Ajuste manual de stock (edición)',
            tipoMovimiento: 'AJUSTE',
          });
        } else {
          await this.insumoKardex.registrarSalida(tx, {
            insumoId: id,
            cantidad: Math.abs(delta),
            costoUnitario: Number(data.costoUnitario),
            motivo: 'Ajuste manual de stock (edición)',
            tipoMovimiento: 'AJUSTE',
          });
        }
      }

      return tx.insumo.findUnique({ where: { id } });
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