import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KardexService } from '../kardex/kardex.service';

@Injectable()
export class ReportesService {
  constructor(
    private prisma: PrismaService,
    private kardex: KardexService,
  ) {}

  // ====================================================================
  // 1. RESUMEN GENERAL (dashboard) — ahora con inventario valorizado REAL
  // ====================================================================
  // Antes valorizaba solo con la materia prima del BOM (ignoraba mano de obra
  // y CIF). Ahora usa el costo promedio del kardex, que sí incluye todo.
  async obtenerResumenGeneral() {
    const inventario = await this.kardex.obtenerInventarioValorizado();

    const ordenesPorEstado = await this.prisma.ordenProduccion.groupBy({
      by: ['estado'],
      _count: { id: true },
    });

    return {
      inventario: {
        totalUnidades: inventario.unidadesTotales,
        valorTotal: inventario.valorTotalInventario,
        mensaje: 'Capital invertido en stock físico, valorizado a costo promedio (incluye insumos, mano de obra y CIF).',
      },
      produccion: {
        resumenEstados: ordenesPorEstado,
      },
      fechaReporte: new Date(),
    };
  }

  // ====================================================================
  // 2. INVENTARIO VALORIZADO (detalle por variante)
  // ====================================================================
  async obtenerInventarioValorizado() {
    return this.kardex.obtenerInventarioValorizado();
  }

  // ====================================================================
  // 3. RENTABILIDAD POR PERÍODO
  // ====================================================================
  // Para cada línea de venta: utilidad = (precioVenta - costoPromedio) * cantidad.
  // El costo lo tomamos del movimiento de inventario asociado a la venta
  // (que guardó el costo promedio vigente al momento de vender).
  async obtenerRentabilidad(desde?: string, hasta?: string) {
    const fechaDesde = desde ? new Date(desde) : new Date(0);
    const fechaHasta = hasta ? new Date(hasta) : new Date();
    fechaHasta.setHours(23, 59, 59, 999);

    const ventas = await this.prisma.venta.findMany({
      where: { fecha: { gte: fechaDesde, lte: fechaHasta } },
      include: { detalles: true },
      orderBy: { fecha: 'desc' },
    });

    // Traemos los movimientos de SALIDA por venta para conocer el costo real
    const ventaIds = ventas.map((v) => v.id);
    const movimientos = await this.prisma.movimientoInventario.findMany({
      where: {
        tipoMovimiento: 'SALIDA',
        referenciaId: { in: ventaIds.length ? ventaIds : [-1] },
      },
    });

    // Mapa rápido: clave venta+producto+color+talla -> costo unitario
    const costoMap = new Map<string, number>();
    for (const m of movimientos) {
      const key = `${m.referenciaId}|${m.productoId}|${m.color}|${m.talla}`;
      costoMap.set(key, Number(m.costoUnitario ?? 0));
    }

    let totalVendido = 0;
    let totalCosto = 0;
    const detalleVentas = ventas.map((venta) => {
      let ingresoVenta = 0;
      let costoVenta = 0;

      for (const d of venta.detalles) {
        const ingreso = Number(d.subtotal);
        const key = `${venta.id}|${d.productoId}|${d.color}|${d.talla}`;
        const costoUnit = costoMap.get(key) ?? 0;
        const costo = costoUnit * Number(d.cantidad);

        ingresoVenta += ingreso;
        costoVenta += costo;
      }

      totalVendido += ingresoVenta;
      totalCosto += costoVenta;

      const utilidad = ingresoVenta - costoVenta;
      const margenPct = ingresoVenta > 0 ? (utilidad / ingresoVenta) * 100 : 0;

      return {
        correlativo: venta.correlativo,
        fecha: venta.fecha,
        cliente: venta.clienteNombre,
        ingreso: Number(ingresoVenta.toFixed(2)),
        costo: Number(costoVenta.toFixed(2)),
        utilidad: Number(utilidad.toFixed(2)),
        margenPct: Number(margenPct.toFixed(1)),
      };
    });

    const utilidadTotal = totalVendido - totalCosto;

    return {
      periodo: { desde: fechaDesde, hasta: fechaHasta },
      resumen: {
        totalVendido: Number(totalVendido.toFixed(2)),
        totalCosto: Number(totalCosto.toFixed(2)),
        utilidadBruta: Number(utilidadTotal.toFixed(2)),
        margenPromedio:
          totalVendido > 0
            ? Number(((utilidadTotal / totalVendido) * 100).toFixed(1))
            : 0,
      },
      ventas: detalleVentas,
    };
  }

  // ====================================================================
  // 4. PRODUCTOS MÁS RENTABLES (no solo los más vendidos)
  // ====================================================================
  async obtenerProductosRentables(desde?: string, hasta?: string) {
    const fechaDesde = desde ? new Date(desde) : new Date(0);
    const fechaHasta = hasta ? new Date(hasta) : new Date();
    fechaHasta.setHours(23, 59, 59, 999);

    const detalles = await this.prisma.ventaDetalle.findMany({
      where: { venta: { fecha: { gte: fechaDesde, lte: fechaHasta } } },
      include: { producto: { select: { nombre: true, skuBase: true } }, venta: true },
    });

    // Costos por venta (movimientos de salida)
    const ventaIds = [...new Set(detalles.map((d) => d.ventaId))];
    const movimientos = await this.prisma.movimientoInventario.findMany({
      where: {
        tipoMovimiento: 'SALIDA',
        referenciaId: { in: ventaIds.length ? ventaIds : [-1] },
      },
    });
    const costoMap = new Map<string, number>();
    for (const m of movimientos) {
      costoMap.set(
        `${m.referenciaId}|${m.productoId}|${m.color}|${m.talla}`,
        Number(m.costoUnitario ?? 0),
      );
    }

    const acumulado = new Map<
      number,
      { nombre: string; sku: string; unidades: number; ingreso: number; costo: number }
    >();

    for (const d of detalles) {
      const costoUnit =
        costoMap.get(`${d.ventaId}|${d.productoId}|${d.color}|${d.talla}`) ?? 0;
      const prev =
        acumulado.get(d.productoId) ?? {
          nombre: d.producto.nombre,
          sku: d.producto.skuBase,
          unidades: 0,
          ingreso: 0,
          costo: 0,
        };
      prev.unidades += Number(d.cantidad);
      prev.ingreso += Number(d.subtotal);
      prev.costo += costoUnit * Number(d.cantidad);
      acumulado.set(d.productoId, prev);
    }

    const ranking = [...acumulado.values()]
      .map((p) => {
        const utilidad = p.ingreso - p.costo;
        return {
          producto: p.nombre,
          sku: p.sku,
          unidadesVendidas: p.unidades,
          ingreso: Number(p.ingreso.toFixed(2)),
          costo: Number(p.costo.toFixed(2)),
          utilidad: Number(utilidad.toFixed(2)),
          margenPct:
            p.ingreso > 0 ? Number(((utilidad / p.ingreso) * 100).toFixed(1)) : 0,
        };
      })
      .sort((a, b) => b.utilidad - a.utilidad);

    return { periodo: { desde: fechaDesde, hasta: fechaHasta }, ranking };
  }

  // ====================================================================
  // 5. CUENTAS POR COBRAR (créditos pendientes)
  // ====================================================================
  async obtenerCuentasPorCobrar() {
    const clientes = await this.prisma.cliente.findMany({
      where: { saldoPendiente: { gt: 0 } },
      orderBy: { saldoPendiente: 'desc' },
    });

    const cuotasVencidas = await this.prisma.cuotaCredito.findMany({
      where: {
        estado: { not: 'PAGADA' },
        fechaVencimiento: { lt: new Date() },
      },
      include: { venta: { select: { correlativo: true, clienteNombre: true } } },
      orderBy: { fechaVencimiento: 'asc' },
    });

    const totalPorCobrar = clientes.reduce(
      (sum, c) => sum + Number(c.saldoPendiente),
      0,
    );

    return {
      totalPorCobrar: Number(totalPorCobrar.toFixed(2)),
      clientesConDeuda: clientes.map((c) => ({
        nombre: c.nombre,
        documento: c.documento,
        telefono: c.telefono,
        limiteCredito: Number(c.limiteCredito),
        saldoPendiente: Number(c.saldoPendiente),
      })),
      cuotasVencidas: cuotasVencidas.map((q) => ({
        venta: q.venta.correlativo,
        cliente: q.venta.clienteNombre,
        numeroCuota: q.numeroCuota,
        montoEsperado: Number(q.montoEsperado),
        montoPagado: Number(q.montoPagado),
        saldo: Number(q.montoEsperado) - Number(q.montoPagado),
        fechaVencimiento: q.fechaVencimiento,
      })),
    };
  }

  // ====================================================================
  // 6. KARDEX VALORIZADO DE UNA VARIANTE (para exportar)
  // ====================================================================
  async obtenerKardexValorizado(
    productoId: number,
    color: string,
    talla: string,
    bodegaId?: number,
  ) {
    const movimientos = await this.kardex.obtenerKardexValorizado({
      productoId,
      color,
      talla,
      bodegaId,
    });

    return movimientos.map((m) => ({
      fecha: m.fecha,
      tipo: m.tipoMovimiento,
      motivo: m.motivo,
      producto: m.producto.nombre,
      sku: m.producto.skuBase,
      bodega: m.bodega.nombre,
      cantidad: m.cantidad,
      costoUnitario: m.costoUnitario != null ? Number(m.costoUnitario) : null,
      costoTotal: m.costoTotal != null ? Number(m.costoTotal) : null,
      saldoCantidad: m.saldoCantidad,
      saldoCostoProm: m.saldoCostoProm != null ? Number(m.saldoCostoProm) : null,
      saldoValor: m.saldoValor != null ? Number(m.saldoValor) : null,
    }));
  }
}