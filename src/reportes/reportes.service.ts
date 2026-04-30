import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

  async obtenerResumenGeneral() {
    // 1. Valorización de Inventario (¿Cuánto dinero hay en el almacén?)
    const stock = await this.prisma.stockPrenda.findMany({
      include: { producto: { include: { boms: { include: { insumo: true } } } } }
    });

    let valorTotalInventario = 0;
    let totalPrendas = 0;

    stock.forEach(item => {
      // Calculamos el costo de materia prima de esta prenda
      let costoMateriaPrima = 0;
      item.producto.boms.forEach(bom => {
        costoMateriaPrima += Number(bom.cantidadRequerida) * Number(bom.insumo.costoUnitario);
      });
      
      valorTotalInventario += costoMateriaPrima * item.cantidad;
      totalPrendas += item.cantidad;
    });

    // 2. Estado de Órdenes de Producción
    const ordenesPorEstado = await this.prisma.ordenProduccion.groupBy({
      by: ['estado'],
      _count: { id: true }
    });

    return {
      inventario: {
        totalUnidades: totalPrendas,
        valorEstimadoMateriaPrima: valorTotalInventario.toFixed(2),
        mensaje: "Este es el capital que tienes invertido en stock físico."
      },
      produccion: {
        resumenEstados: ordenesPorEstado
      },
      fechaReporte: new Date()
    };
  }
}