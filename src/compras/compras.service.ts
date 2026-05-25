import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Ajuste la ruta según su proyecto

@Injectable()
export class ComprasService {
  constructor(private prisma: PrismaService) {}

  async obtenerProveedores() {
    return this.prisma.proveedor.findMany({
      orderBy: { razonSocial: 'asc' }
    });
  }

async registrarCompra(data: any) {
    return this.prisma.$transaction(async (tx) => {
      
      // Capturamos la bodega exacta que eligió el usuario en pantalla
      const idBodegaReal = data.bodegaDestinoId;

      // (Nota: Como en su base de datos "Bodega" y "Almacen" son tablas separadas, 
      // mantenemos el findFirst solo para la tabla Almacen que usa el escáner POS)
      const almacenPrincipal = await tx.almacen.findFirst({ orderBy: { id: 'asc' } });
      const idAlmacenReal = almacenPrincipal ? almacenPrincipal.id : idBodegaReal;

      // 1. Guardamos la "Cabecera" de la compra
      const nuevaCompra = await tx.compra.create({
        data: {
          correlativo: data.correlativo,
          proveedorId: data.proveedorId,
          totalCompra: data.totalCompra,
          detalles: {
            create: data.detalles.map((d: any) => ({
              tipoItem: d.tipoItem,
              insumoId: d.insumoId,
              productoId: d.productoId,
              color: d.color,
              talla: d.talla,
              skuProveedor: d.skuProveedor,
              cantidad: d.cantidad,
              costoUnitario: d.costoUnitario,
              subtotal: d.subtotal,
            })),
          },
        },
      });

      // 2. Analizamos cada fila y repartimos
      for (const detalle of data.detalles) {
        
        if (detalle.tipoItem === 'INSUMO') {
          // Los avíos siguen sumándose a la tabla general de insumos
          await tx.insumo.update({
            where: { id: detalle.insumoId },
            data: { stockActual: { increment: detalle.cantidad } },
          });
        } 
        
        else if (detalle.tipoItem === 'PRENDA') {
          // 🔥 AQUÍ ESTÁ EL CAMBIO: La ropa entra a la Bodega que el usuario escogió
          await tx.inventarioTerminado.upsert({
            where: {
              productoId_bodegaId_color_talla: {
                productoId: detalle.productoId,
                bodegaId: idBodegaReal, 
                color: detalle.color,
                talla: detalle.talla,
              },
            },
            update: { stock: { increment: detalle.cantidad } },
            create: {
              productoId: detalle.productoId,
              bodegaId: idBodegaReal,
              color: detalle.color,
              talla: detalle.talla,
              stock: detalle.cantidad,
            },
          });

          // Si trajo código de barras del proveedor, lo enlazamos al escáner
          if (detalle.skuProveedor && detalle.skuProveedor.trim() !== '') {
            await tx.stockPrenda.upsert({
              where: { skuBarras: detalle.skuProveedor },
              update: { cantidad: { increment: detalle.cantidad } },
              create: {
                skuBarras: detalle.skuProveedor,
                cantidad: detalle.cantidad,
                productoId: detalle.productoId,
                color: detalle.color,
                talla: detalle.talla,
                almacenId: idAlmacenReal,
              },
            });
          }
        }
      }

      return nuevaCompra;
    });
  }

  async crearProveedor(data: any) {
    return this.prisma.proveedor.create({
      data: {
        ruc: data.ruc || null,
        razonSocial: data.razonSocial,
        telefono: data.telefono || null,
        tipo: data.tipo || 'GENERAL'
      }
    });
  }
}