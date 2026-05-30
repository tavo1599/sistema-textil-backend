import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * KardexService — Costo Promedio Ponderado (CPP)
 * -------------------------------------------------------------------------
 * Servicio CENTRAL de movimientos de inventario valorizados.
 *
 * Regla del CPP:
 *  - En cada INGRESO se recalcula el costo promedio:
 *      nuevoPromedio = (stockAnt*costoAnt + cantIngreso*costoIngreso)
 *                      / (stockAnt + cantIngreso)
 *  - En cada SALIDA NO se recalcula: se usa el costo promedio vigente.
 *
 * IMPORTANTE: todos los métodos reciben `tx` (el cliente transaccional de
 * Prisma) para escribir DENTRO de la misma transacción de la venta/compra/orden.
 * Así, si algo falla, el kardex no queda a medias.
 *
 * El costo promedio se lleva a nivel de VARIANTE (producto+color+talla),
 * global (no por bodega).
 */
@Injectable()
export class KardexService {
  constructor(private prisma: PrismaService) {}

  // Tipo del cliente transaccional (lo que entrega prisma.$transaction)
  // Se acepta también el PrismaService normal por si se llama fuera de tx.
  private get db() {
    return this.prisma;
  }

  // ======================================================================
  // INGRESO: compra, producción terminada, ingreso libre, traslado entrante
  // ======================================================================
  async registrarIngreso(
    tx: Prisma.TransactionClient,
    params: {
      productoId: number;
      color: string;
      talla: string;
      bodegaId: number;
      cantidad: number;
      costoUnitario: number; // costo al que entra esta mercadería
      motivo: string;
      tipoMovimiento?: string; // por defecto 'INGRESO'
      referenciaId?: number | null;
      actualizarStockFisico?: boolean; // si true, también hace upsert en InventarioTerminado
    },
  ) {
    const cantidad = Math.trunc(Number(params.cantidad));
    const costoUnitario = Number(params.costoUnitario);

    if (cantidad <= 0)
      throw new BadRequestException('La cantidad a ingresar debe ser mayor a 0.');
    if (costoUnitario < 0)
      throw new BadRequestException('El costo unitario no puede ser negativo.');

    // 1. Leer / crear el registro de costo promedio de la variante
    const costoActual = await tx.costoPromedioProducto.findUnique({
      where: {
        productoId_color_talla: {
          productoId: params.productoId,
          color: params.color,
          talla: params.talla,
        },
      },
    });

    const stockAnt = costoActual?.stockValorado ?? 0;
    const promedioAnt = Number(costoActual?.costoPromedio ?? 0);

    // 2. Recalcular el Costo Promedio Ponderado
    const valorAnterior = stockAnt * promedioAnt;
    const valorIngreso = cantidad * costoUnitario;
    const nuevoStock = stockAnt + cantidad;
    const nuevoPromedio =
      nuevoStock > 0 ? (valorAnterior + valorIngreso) / nuevoStock : 0;

    // 3. Persistir el nuevo promedio
    await tx.costoPromedioProducto.upsert({
      where: {
        productoId_color_talla: {
          productoId: params.productoId,
          color: params.color,
          talla: params.talla,
        },
      },
      update: { costoPromedio: nuevoPromedio, stockValorado: nuevoStock },
      create: {
        productoId: params.productoId,
        color: params.color,
        talla: params.talla,
        costoPromedio: nuevoPromedio,
        stockValorado: nuevoStock,
      },
    });

    // 4. (Opcional) actualizar el stock físico de la bodega
    if (params.actualizarStockFisico) {
      await tx.inventarioTerminado.upsert({
        where: {
          productoId_bodegaId_color_talla: {
            productoId: params.productoId,
            bodegaId: params.bodegaId,
            color: params.color,
            talla: params.talla,
          },
        },
        update: { stock: { increment: cantidad } },
        create: {
          productoId: params.productoId,
          bodegaId: params.bodegaId,
          color: params.color,
          talla: params.talla,
          stock: cantidad,
        },
      });
    }

    // 5. Escribir la fila del kardex valorizado
    return tx.movimientoInventario.create({
      data: {
        tipoMovimiento: params.tipoMovimiento ?? 'INGRESO',
        motivo: params.motivo,
        cantidad: cantidad, // positivo
        productoId: params.productoId,
        color: params.color,
        talla: params.talla,
        bodegaId: params.bodegaId,
        referenciaId: params.referenciaId ?? null,
        costoUnitario: costoUnitario,
        costoTotal: valorIngreso,
        saldoCantidad: nuevoStock,
        saldoCostoProm: nuevoPromedio,
        saldoValor: nuevoStock * nuevoPromedio,
      },
    });
  }

  // ======================================================================
  // SALIDA: venta, traslado saliente, merma, ajuste negativo
  // Usa el costo promedio VIGENTE (no lo recalcula).
  // ======================================================================
  async registrarSalida(
    tx: Prisma.TransactionClient,
    params: {
      productoId: number;
      color: string;
      talla: string;
      bodegaId: number;
      cantidad: number; // se pasa en POSITIVO; aquí se guarda en negativo
      motivo: string;
      tipoMovimiento?: string; // por defecto 'SALIDA'
      referenciaId?: number | null;
      actualizarStockFisico?: boolean;
    },
  ) {
    const cantidad = Math.trunc(Number(params.cantidad));
    if (cantidad <= 0)
      throw new BadRequestException('La cantidad a retirar debe ser mayor a 0.');

    // 1. Costo promedio vigente de la variante
    const costoActual = await tx.costoPromedioProducto.findUnique({
      where: {
        productoId_color_talla: {
          productoId: params.productoId,
          color: params.color,
          talla: params.talla,
        },
      },
    });

    const promedioVigente = Number(costoActual?.costoPromedio ?? 0);
    const stockAnt = costoActual?.stockValorado ?? 0;
    const nuevoStock = stockAnt - cantidad;

    // 2. Actualizar el stock valorado (el promedio NO cambia en una salida)
    if (costoActual) {
      await tx.costoPromedioProducto.update({
        where: { id: costoActual.id },
        data: { stockValorado: nuevoStock < 0 ? 0 : nuevoStock },
      });
    }

    // 3. (Opcional) descontar stock físico de la bodega
    if (params.actualizarStockFisico) {
      const fisico = await tx.inventarioTerminado.findFirst({
        where: {
          productoId: params.productoId,
          bodegaId: params.bodegaId,
          color: params.color,
          talla: params.talla,
        },
      });
      if (!fisico || fisico.stock < cantidad) {
        throw new BadRequestException(
          `Stock insuficiente para producto ${params.productoId} (${params.color}-${params.talla}). Disponible: ${fisico?.stock ?? 0}`,
        );
      }
      await tx.inventarioTerminado.update({
        where: { id: fisico.id },
        data: { stock: { decrement: cantidad } },
      });
    }

    // 4. Fila del kardex valorizado (cantidad negativa, costo = promedio vigente)
    const valorSalida = cantidad * promedioVigente;
    return tx.movimientoInventario.create({
      data: {
        tipoMovimiento: params.tipoMovimiento ?? 'SALIDA',
        motivo: params.motivo,
        cantidad: -cantidad, // negativo
        productoId: params.productoId,
        color: params.color,
        talla: params.talla,
        bodegaId: params.bodegaId,
        referenciaId: params.referenciaId ?? null,
        costoUnitario: promedioVigente,
        costoTotal: valorSalida,
        saldoCantidad: nuevoStock < 0 ? 0 : nuevoStock,
        saldoCostoProm: promedioVigente,
        saldoValor: (nuevoStock < 0 ? 0 : nuevoStock) * promedioVigente,
      },
    });
  }

  // ======================================================================
  // CONSULTA: kardex valorizado de una variante (orden cronológico)
  // ======================================================================
  async obtenerKardexValorizado(filtros: {
    productoId: number;
    color: string;
    talla: string;
    bodegaId?: number;
  }) {
    return this.prisma.movimientoInventario.findMany({
      where: {
        productoId: filtros.productoId,
        color: filtros.color,
        talla: filtros.talla,
        ...(filtros.bodegaId ? { bodegaId: filtros.bodegaId } : {}),
      },
      orderBy: { fecha: 'asc' }, // ascendente: así se lee como un kardex contable
      include: {
        producto: { select: { nombre: true, skuBase: true } },
        bodega: { select: { nombre: true } },
      },
    });
  }

  // ======================================================================
  // CONSULTA: valor total del inventario (capital inmovilizado)
  // ======================================================================
  async obtenerInventarioValorizado() {
    const costos = await this.prisma.costoPromedioProducto.findMany({
      where: { stockValorado: { gt: 0 } },
      include: { producto: { select: { nombre: true, skuBase: true } } },
    });

    let valorTotal = 0;
    let unidadesTotal = 0;
    const detalle = costos.map((c) => {
      const valor = c.stockValorado * Number(c.costoPromedio);
      valorTotal += valor;
      unidadesTotal += c.stockValorado;
      return {
        producto: c.producto.nombre,
        sku: c.producto.skuBase,
        color: c.color,
        talla: c.talla,
        unidades: c.stockValorado,
        costoPromedio: Number(c.costoPromedio),
        valorTotal: valor,
      };
    });

    return {
      valorTotalInventario: Number(valorTotal.toFixed(2)),
      unidadesTotales: unidadesTotal,
      detalle,
    };
  }
}