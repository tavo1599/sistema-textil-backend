import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateGuiaDto } from './dto/create-guia.dto';
import { PrismaService } from '../prisma/prisma.service';
import { RetornoGuiaDto } from './dto/update-guia.dto';

@Injectable()
export class GuiasService {
  constructor(private prisma: PrismaService) {}

async create(dto: CreateGuiaDto) {
  // --- BLOQUE DE DIAGNÓSTICO ---
  const ordenExiste = await this.prisma.ordenProduccion.findUnique({ where: { id: dto.ordenId } });
  const tallerExiste = await this.prisma.proveedorTaller.findUnique({ where: { id: dto.tallerId } });

  if (!ordenExiste) throw new NotFoundException(`Error: La Orden con ID ${dto.ordenId} no existe.`);
  if (!tallerExiste) throw new NotFoundException(`Error: El Taller con ID ${dto.tallerId} no existe.`);
  // -----------------------------

  return this.prisma.$transaction(async (tx) => {
    const guia = await tx.guiaServicio.create({
      data: {
        correlativo: dto.correlativo,
        tipoGuia: dto.tipoGuia,
        ordenId: dto.ordenId,
        tallerId: dto.tallerId,
        estado: 'En Transito'
      },
    });

    const detallesPromesas = dto.detalles.map((d) =>
      tx.guiaDetalle.create({
        data: {
          guiaId: guia.id,
          colorId: d.colorId,
          tallaId: d.tallaId,
          cantidadEnviada: d.cantidadEnviada,
        },
      }),
    );
    await Promise.all(detallesPromesas);

    if (dto.tipoGuia === 'Salida') {
      await tx.ordenProduccion.update({
        where: { id: dto.ordenId },
        data: { estado: 'En Taller' }
      });
    }

    return { mensaje: 'Guía generada correctamente', guiaId: guia.id };
  });
}

async procesarRetorno(dto: RetornoGuiaDto) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Creamos la Guía de Retorno
    const guiaRetorno = await tx.guiaServicio.create({
      data: {
        correlativo: dto.correlativoRetorno,
        tipoGuia: 'Retorno',
        ordenId: 0, // Esto lo vincularemos internamente
        tallerId: 0, 
        estado: 'Finalizado'
      }
    });

    // 2. Procesamos cada prenda evaluando calidad
    for (const d of dto.detalles) {
      await tx.guiaDetalle.create({
        data: {
          guiaId: guiaRetorno.id,
          colorId: d.colorId,
          tallaId: d.tallaId,
          cantidadEnviada: d.cantPrimera + d.cantSegunda + d.cantFalla, // Lo que físicamente llegó
          // Aquí podrías añadir campos de calidad a tu esquema después
        }
      });
      
      // 3. Generar Alerta de Memo si hay faltantes
      if (d.cantFaltante > 0) {
        console.log(`ALERTA: Generando descuento por ${d.cantFaltante} prendas faltantes.`);
        // Aquí conectaremos luego con el módulo de Finanzas/Caja
      }
    }

    return { mensaje: 'Retorno procesado y calidad registrada' };
  });
}
  // Ver todas las guías con el nombre del taller y de la OP
  async findAll() {
    return this.prisma.guiaServicio.findMany({
      include: {
        taller: true,
        orden: true,
        detalles: {
          include: { color: true, talla: true }
        }
      }
    });
  }

  async findOne(id: number) {
    return this.prisma.guiaServicio.findUnique({
      where: { id: id },
      include: { detalles: true }
    });
  }
}