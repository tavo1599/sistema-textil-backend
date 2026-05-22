import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async obtenerDatosDirectivos() {
    const hoy = new Date();
    const primerDiaMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const primerDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const ultimoDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59);

    // 1. INGRESOS Y CRECIMIENTO
    const ventasMesActual = await this.prisma.venta.findMany({
      where: { fecha: { gte: primerDiaMesActual } },
      select: { totalVenta: true, detalles: true }
    });

    const ventasMesAnterior = await this.prisma.venta.aggregate({
      _sum: { totalVenta: true },
      where: { fecha: { gte: primerDiaMesAnterior, lte: ultimoDiaMesAnterior } }
    });

    const ingresosMes = ventasMesActual.reduce((sum, v) => sum + Number(v.totalVenta), 0);
    const ingresosMesAnterior = Number(ventasMesAnterior._sum.totalVenta || 0);

    let crecimientoIngresos = 0;
    if (ingresosMesAnterior > 0) {
      crecimientoIngresos = ((ingresosMes - ingresosMesAnterior) / ingresosMesAnterior) * 100;
    } else if (ingresosMes > 0) {
      crecimientoIngresos = 100; // Si el mes pasado fue 0 y este mes hay ventas, es 100% de crecimiento
    }

    // 2. PRENDAS VENDIDAS ESTE MES
    let prendasVendidasMes = 0;
    ventasMesActual.forEach(venta => {
      venta.detalles.forEach((det: any) => prendasVendidasMes += Number(det.cantidad));
    });

    // 3. DINERO EN LA CALLE (Deuda total de clientes)
    const clientesDeudores = await this.prisma.cliente.aggregate({
      _sum: { saldoPendiente: true },
      _count: { id: true },
      where: { saldoPendiente: { gt: 0 } }
    });

    // 4. DESPACHOS PENDIENTES (Logística)
    const despachosPendientes = await this.prisma.despachoVenta.count({
      where: { estado: { not: 'Entregado' } }
    });

    // 5. RIESGO DE QUIEBRE (Stock <= 5)
    const insumosCriticos = await this.prisma.inventarioTerminado.count({
      where: { stock: { lte: 5 } }
    });

    // 6. TOP 3 PRODUCTOS MÁS RENTABLES DEL MES
    const todosLosDetalles = await this.prisma.venta.findMany({
      where: { fecha: { gte: primerDiaMesActual } },
      select: {
        detalles: {
          // Asumimos que tienes relación 'producto' en VentaDetalle. Si falla, el código tiene un fallback.
          include: { producto: true } 
        }
      }
    });

    const rankingMap = new Map();
    todosLosDetalles.forEach(venta => {
      venta.detalles.forEach((det: any) => {
        const id = det.productoId;
        if (!rankingMap.has(id)) {
          rankingMap.set(id, {
            id: id,
            nombre: det.producto?.nombre || `SKU / Producto ID: ${id}`,
            ventas: 0,
            ingreso: 0
          });
        }
        const item = rankingMap.get(id);
        item.ventas += Number(det.cantidad);
        item.ingreso += Number(det.cantidad) * Number(det.precioUnitario);
      });
    });

    // Ordenar de mayor a menor ingreso y tomar los 3 primeros
    const topVentas = Array.from(rankingMap.values())
      .sort((a, b) => b.ingreso - a.ingreso)
      .slice(0, 3);

    // 7. ÚLTIMOS MOVIMIENTOS (Actividad Reciente)
    const ultimosMovimientos = await this.prisma.movimientoInventario.findMany({
      take: 5,
      orderBy: { fecha: 'desc' },
      select: { id: true, motivo: true, cantidad: true, tipoMovimiento: true, fecha: true }
    });

    return {
      kpis: {
        ingresosMes,
        crecimientoIngresos,
        cuentasPorCobrar: Number(clientesDeudores._sum.saldoPendiente || 0),
        clientesConDeuda: clientesDeudores._count.id,
        despachosPendientes,
        prendasVendidasMes,
        insumosCriticos
      },
      topVentas,
      ultimosMovimientos
    };
  }
}