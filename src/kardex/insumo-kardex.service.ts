import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * InsumoKardexService
 * Registra todos los movimientos de insumos (avíos y tela) en MovimientoInsumo,
 * manteniendo siempre sincronizado el stockActual del Insumo.
 *
 * Igual que KardexService, todos los métodos reciben `tx` para operar
 * dentro de la transacción del llamador (compra, orden, anulación).
 */
@Injectable()
export class InsumoKardexService {
  constructor(private prisma: PrismaService) {}

  // ======================================================================
  // INGRESO: compra de insumos
  // ======================================================================
  async registrarIngreso(
    tx: Prisma.TransactionClient,
    params: {
      insumoId: number;
      cantidad: number;
      costoUnitario: number;
      motivo: string;
      tipoMovimiento?: string;
      referenciaId?: number | null;
    },
  ) {
    const cantidad = Number(params.cantidad);
    const costoUnitario = Number(params.costoUnitario);

    if (cantidad <= 0)
      throw new BadRequestException('La cantidad a ingresar debe ser mayor a 0.');
    if (costoUnitario < 0)
      throw new BadRequestException('El costo unitario no puede ser negativo.');

    const insumo = await tx.insumo.findUnique({ where: { id: params.insumoId } });
    if (!insumo) throw new BadRequestException(`Insumo ${params.insumoId} no encontrado.`);

    const nuevoStock = Number(insumo.stockActual) + cantidad;

    await tx.insumo.update({
      where: { id: params.insumoId },
      data: { stockActual: nuevoStock },
    });

    return tx.movimientoInsumo.create({
      data: {
        tipoMovimiento: params.tipoMovimiento ?? 'INGRESO',
        motivo: params.motivo,
        cantidad: cantidad,
        insumoId: params.insumoId,
        costoUnitario: costoUnitario,
        costoTotal: cantidad * costoUnitario,
        saldoResultante: nuevoStock,
        referenciaId: params.referenciaId ?? null,
      },
    });
  }

  // ======================================================================
  // SALIDA: consumo por orden de producción
  // ======================================================================
  async registrarSalida(
    tx: Prisma.TransactionClient,
    params: {
      insumoId: number;
      cantidad: number;
      costoUnitario: number;
      motivo: string;
      tipoMovimiento?: string;
      referenciaId?: number | null;
    },
  ) {
    const cantidad = Number(params.cantidad);
    const costoUnitario = Number(params.costoUnitario);

    if (cantidad <= 0)
      throw new BadRequestException('La cantidad a retirar debe ser mayor a 0.');

    const insumo = await tx.insumo.findUnique({ where: { id: params.insumoId } });
    if (!insumo) throw new BadRequestException(`Insumo ${params.insumoId} no encontrado.`);

    const stockActual = Number(insumo.stockActual);
    if (stockActual < cantidad) {
      throw new BadRequestException(
        `Stock insuficiente de "${insumo.nombre}". Necesitas ${cantidad.toFixed(4)} pero hay ${stockActual}.`,
      );
    }

    const nuevoStock = stockActual - cantidad;

    await tx.insumo.update({
      where: { id: params.insumoId },
      data: { stockActual: nuevoStock },
    });

    return tx.movimientoInsumo.create({
      data: {
        tipoMovimiento: params.tipoMovimiento ?? 'SALIDA',
        motivo: params.motivo,
        cantidad: -cantidad, // negativo para salidas
        insumoId: params.insumoId,
        costoUnitario: costoUnitario,
        costoTotal: cantidad * costoUnitario,
        saldoResultante: nuevoStock,
        referenciaId: params.referenciaId ?? null,
      },
    });
  }

  // ======================================================================
  // CONSULTA: historial de movimientos de un insumo
  // ======================================================================
  async obtenerHistorial(insumoId: number) {
    return this.prisma.movimientoInsumo.findMany({
      where: { insumoId },
      orderBy: { fecha: 'asc' },
      include: { insumo: { select: { nombre: true, codigo: true, unidadMedida: true } } },
    });
  }
}
