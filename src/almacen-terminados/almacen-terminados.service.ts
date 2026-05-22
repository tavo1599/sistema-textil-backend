import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlmacenTerminadosService {
  constructor(private prisma: PrismaService) {}

  // --- BODEGAS ---
  async getBodegas() {
    return this.prisma.bodega.findMany();
  }

  async createBodega(data: { nombre: string; tipo: string; direccion?: string }) {
    return this.prisma.bodega.create({ data });
  }

  async updateBodega(id: number, data: { nombre?: string; tipo?: string; direccion?: string; estado?: boolean }) {
    return this.prisma.bodega.update({
      where: { id },
      data
    });
  }

  // --- INVENTARIO (KARDEX) ---
  async getInventario() {
    return this.prisma.inventarioTerminado.findMany({
      include: {
        producto: true,
        bodega: true
      },
      orderBy: { bodegaId: 'asc' }
    });
  }

  async addInventario(data: { productoId: number; bodegaId: number; color: string; talla: string; cantidad: number; motivo?: string }) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Actualizamos o creamos el stock
      const existente = await tx.inventarioTerminado.findFirst({
        where: {
          productoId: data.productoId,
          bodegaId: data.bodegaId,
          color: data.color,
          talla: data.talla
        }
      });

      let inventarioActualizado;

      if (existente) {
        inventarioActualizado = await tx.inventarioTerminado.update({
          where: { id: existente.id },
          data: { stock: existente.stock + Number(data.cantidad) }
        });
      } else {
        inventarioActualizado = await tx.inventarioTerminado.create({
          data: {
            productoId: data.productoId,
            bodegaId: data.bodegaId,
            color: data.color,
            talla: data.talla,
            stock: Number(data.cantidad)
          }
        });
      }

      // 2. 🔥 REGISTRO EN EL KARDEX
      await tx.movimientoInventario.create({
        data: {
          tipoMovimiento: 'INGRESO',
          motivo: data.motivo || 'Ingreso libre de producción',
          cantidad: Number(data.cantidad),
          productoId: Number(data.productoId),
          color: data.color,
          talla: data.talla,
          bodegaId: Number(data.bodegaId)
        }
      });

      return inventarioActualizado;
    });
  }

  async transferirInventario(data: { 
    origenId: number; 
    destinoId: number; 
    detalles: { productoId: number; color: string; talla: string; cantidad: number }[] // 🔥 Ahora recibe una lista (Array)
  }) {
    if (data.origenId === data.destinoId) {
      throw new BadRequestException("El origen y destino no pueden ser la misma bodega.");
    }
    if (!data.detalles || data.detalles.length === 0) {
      throw new BadRequestException("Debe seleccionar al menos un producto para trasladar.");
    }

    return this.prisma.$transaction(async (tx) => {
      
      // 🔥 Abrimos el bucle para procesar cada prenda de la lista
      for (const item of data.detalles) {
        
        // 1. Validamos y restamos del origen
        const origen = await tx.inventarioTerminado.findFirst({
          where: { bodegaId: data.origenId, productoId: item.productoId, color: item.color, talla: item.talla }
        });

        if (!origen || origen.stock < item.cantidad) {
          throw new BadRequestException(`No hay stock suficiente para la prenda ID: ${item.productoId} (${item.color} - ${item.talla}) en el origen.`);
        }

        await tx.inventarioTerminado.update({
          where: { id: origen.id },
          data: { stock: origen.stock - Number(item.cantidad) }
        });

        // 🔥 KARDEX ORIGEN
        await tx.movimientoInventario.create({
          data: {
            tipoMovimiento: 'SALIDA',
            motivo: `Traslado LOTE saliente hacia bodega ID: ${data.destinoId}`,
            cantidad: -Number(item.cantidad),
            productoId: item.productoId,
            color: item.color,
            talla: item.talla,
            bodegaId: data.origenId
          }
        });

        // 2. Sumamos al destino
        const destino = await tx.inventarioTerminado.findFirst({
          where: { bodegaId: data.destinoId, productoId: item.productoId, color: item.color, talla: item.talla }
        });

        if (destino) {
          await tx.inventarioTerminado.update({
            where: { id: destino.id },
            data: { stock: destino.stock + Number(item.cantidad) }
          });
        } else {
          await tx.inventarioTerminado.create({
            data: {
              bodegaId: data.destinoId,
              productoId: item.productoId,
              color: item.color,
              talla: item.talla,
              stock: Number(item.cantidad)
            }
          });
        }

        // 🔥 KARDEX DESTINO
        await tx.movimientoInventario.create({
          data: {
            tipoMovimiento: 'INGRESO',
            motivo: `Traslado LOTE entrante desde bodega ID: ${data.origenId}`,
            cantidad: Number(item.cantidad),
            productoId: item.productoId,
            color: item.color,
            talla: item.talla,
            bodegaId: data.destinoId
          }
        });
      } // Fin del bucle

      return { success: true, message: `Traslado de ${data.detalles.length} ítems completado con éxito` };
    });
  }

  // --- SALIDAS / VENTAS (PUNTO DE VENTA) ---
  async registrarSalida(data: { bodegaId: number; items: { productoId: number; color: string; talla: string; cantidad: number }[]; motivo?: string; referenciaId?: number }) {
    return this.prisma.$transaction(async (tx) => {
      for (const item of data.items) {
        const inventario = await tx.inventarioTerminado.findFirst({
          where: { bodegaId: data.bodegaId, productoId: item.productoId, color: item.color, talla: item.talla }
        });

        if (!inventario || inventario.stock < item.cantidad) {
          throw new BadRequestException(`Stock insuficiente para el producto ID ${item.productoId} (${item.color} Talla ${item.talla})`);
        }

        await tx.inventarioTerminado.update({
          where: { id: inventario.id },
          data: { stock: inventario.stock - Number(item.cantidad) }
        });

        // 🔥 REGISTRO EN EL KARDEX: Venta o Salida general
        await tx.movimientoInventario.create({
          data: {
            tipoMovimiento: 'SALIDA',
            motivo: data.motivo || 'Salida de mercancía (Venta)',
            cantidad: -Number(item.cantidad),
            productoId: item.productoId,
            color: item.color,
            talla: item.talla,
            bodegaId: data.bodegaId,
            referenciaId: data.referenciaId || null
          }
        });
      }
      return { success: true, message: "Salida registrada correctamente" };
    });
  }

  // --- DESHACER Y AJUSTES ---
  async revertirIngreso(data: any) {
    const { bodegaId, productoId, color, talla, cantidad, motivo } = data;
    const cantRestar = Number(cantidad);

    return this.prisma.$transaction(async (tx) => {
      const itemExistente = await tx.inventarioTerminado.findFirst({
        where: { bodegaId: Number(bodegaId), productoId: Number(productoId), color, talla }
      });

      if (!itemExistente || itemExistente.stock < cantRestar) {
        throw new BadRequestException('No hay stock suficiente para deshacer esta acción.');
      }

      const actualizado = await tx.inventarioTerminado.update({
        where: { id: itemExistente.id },
        data: { stock: itemExistente.stock - cantRestar },
      });

      // 🔥 REGISTRO EN EL KARDEX: Anulación
      await tx.movimientoInventario.create({
        data: {
          tipoMovimiento: 'SALIDA',
          motivo: motivo || 'Acción Deshacer: Ingreso anulado por el usuario',
          cantidad: -cantRestar,
          productoId: Number(productoId),
          color,
          talla,
          bodegaId: Number(bodegaId)
        }
      });

      return actualizado;
    });
  }

  async ajustarStockManual(data: any) {
    const { inventarioId, nuevoStock, motivo } = data;

    return this.prisma.$transaction(async (tx) => {
      const registroActual = await tx.inventarioTerminado.findUnique({
        where: { id: Number(inventarioId) }
      });

      if (!registroActual) throw new BadRequestException('El registro de inventario no existe');

      const diferencia = Number(nuevoStock) - registroActual.stock;

      // Si no hay diferencia, no saturamos el kardex con datos inútiles
      if (diferencia === 0) return registroActual;

      const actualizado = await tx.inventarioTerminado.update({
        where: { id: Number(inventarioId) },
        data: { stock: Number(nuevoStock) },
      });

      // 🔥 REGISTRO EN EL KARDEX: Ajuste Manual (Registra la diferencia matemática)
      await tx.movimientoInventario.create({
        data: {
          tipoMovimiento: 'AJUSTE',
          motivo: motivo || 'Ajuste manual de inventario',
          cantidad: diferencia,
          productoId: registroActual.productoId,
          color: registroActual.color,
          talla: registroActual.talla,
          bodegaId: registroActual.bodegaId
        }
      });

      return actualizado;
    });
  }

  // --- CONSULTAS DEL KARDEX ---
  async obtenerHistorialMovimientos(productoId: number, bodegaId: number, color: string, talla: string) {
    return this.prisma.movimientoInventario.findMany({
      where: {
        productoId: productoId,
        bodegaId: bodegaId,
        color: color,
        talla: talla,
      },
      orderBy: {
        fecha: 'desc', // Lo más reciente primero para el modal
      },
      include: {
        producto: { select: { nombre: true, skuBase: true } },
        bodega: { select: { nombre: true } }
      }
    });
  }
}