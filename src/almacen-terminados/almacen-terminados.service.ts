import { Injectable } from '@nestjs/common';
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

  async addInventario(data: { productoId: number; bodegaId: number; color: string; talla: string; cantidad: number }) {
    // 1. Buscamos si ya existe exactamente este pantalón en esa bodega
    const existente = await this.prisma.inventarioTerminado.findFirst({
      where: {
        productoId: data.productoId,
        bodegaId: data.bodegaId,
        color: data.color,
        talla: data.talla
      }
    });

    if (existente) {
      // 2. Si ya existe, le SUMAMOS la nueva cantidad al stock actual
      return this.prisma.inventarioTerminado.update({
        where: { id: existente.id },
        data: { stock: existente.stock + data.cantidad }
      });
    } else {
      // 3. Si no existe, lo creamos por primera vez
      return this.prisma.inventarioTerminado.create({
        data: {
          productoId: data.productoId,
          bodegaId: data.bodegaId,
          color: data.color,
          talla: data.talla,
          stock: data.cantidad
        }
      });
    }
  }

  async transferirInventario(data: { origenId: number; destinoId: number; productoId: number; color: string; talla: string; cantidad: number }) {
    if (data.origenId === data.destinoId) throw new Error("El origen y destino no pueden ser la misma bodega.");

    return this.prisma.$transaction(async (tx) => {
      // 1. Verificamos que el origen tenga stock suficiente
      const origen = await tx.inventarioTerminado.findFirst({
        where: { bodegaId: data.origenId, productoId: data.productoId, color: data.color, talla: data.talla }
      });

      if (!origen || origen.stock < data.cantidad) {
        throw new Error("No hay stock suficiente en la bodega de origen para este traslado.");
      }

      // 2. Le restamos la cantidad al origen
      await tx.inventarioTerminado.update({
        where: { id: origen.id },
        data: { stock: origen.stock - data.cantidad }
      });

      // 3. Buscamos si el destino ya tiene esa misma prenda
      const destino = await tx.inventarioTerminado.findFirst({
        where: { bodegaId: data.destinoId, productoId: data.productoId, color: data.color, talla: data.talla }
      });

      if (destino) {
        // Si ya tiene, le sumamos
        await tx.inventarioTerminado.update({
          where: { id: destino.id },
          data: { stock: destino.stock + data.cantidad }
        });
      } else {
        // Si no tiene, creamos la fila por primera vez en esa bodega
        await tx.inventarioTerminado.create({
          data: {
            bodegaId: data.destinoId,
            productoId: data.productoId,
            color: data.color,
            talla: data.talla,
            stock: data.cantidad
          }
        });
      }

      return { success: true, message: "Traslado completado con éxito" };
    });
  }

  // --- SALIDAS / VENTAS (PUNTO DE VENTA) ---
  async registrarSalida(data: { bodegaId: number; items: { productoId: number; color: string; talla: string; cantidad: number }[] }) {
    // Usamos una transacción para que, si falla un pantalón, no se cobre nada y se cancele todo
    return this.prisma.$transaction(async (tx) => {
      for (const item of data.items) {
        // 1. Buscamos el pantalón exacto en la bodega
        const inventario = await tx.inventarioTerminado.findFirst({
          where: { bodegaId: data.bodegaId, productoId: item.productoId, color: item.color, talla: item.talla }
        });

        // 2. Verificamos que nadie lo haya vendido hace 1 segundo
        if (!inventario || inventario.stock < item.cantidad) {
          throw new Error(`Stock insuficiente para el producto ID ${item.productoId} (${item.color} Talla ${item.talla})`);
        }

        // 3. Restamos el stock
        await tx.inventarioTerminado.update({
          where: { id: inventario.id },
          data: { stock: inventario.stock - item.cantidad }
        });
      }
      return { success: true, message: "Salida registrada correctamente" };
    });
  }

  async updateBodega(id: number, data: { nombre?: string; tipo?: string; direccion?: string; estado?: boolean }) {
    return this.prisma.bodega.update({
      where: { id },
      data
    });
  }
}