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
      // 1. Guardamos la "Cabecera" de la compra (Factura) y sus detalles en el historial
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

      // 2. Analizamos cada fila de la compra para repartir el stock a donde pertenece
      for (const detalle of data.detalles) {
        
        if (detalle.tipoItem === 'INSUMO') {
          // Si es tela, hilo, cierre... Va directo a engordar el stock de Avíos
          await tx.insumo.update({
            where: { id: detalle.insumoId },
            data: { stockActual: { increment: detalle.cantidad } },
          });
        } 
        
        else if (detalle.tipoItem === 'PRENDA') {
          // Si es ropa terminada, la inyectamos a la Bodega Principal (ID 1)
          await tx.inventarioTerminado.upsert({
            where: {
              productoId_bodegaId_color_talla: {
                productoId: detalle.productoId,
                bodegaId: 1, // Asumimos Bodega Central para ingresos de compras
                color: detalle.color,
                talla: detalle.talla,
              },
            },
            update: { stock: { increment: detalle.cantidad } },
            create: {
              productoId: detalle.productoId,
              bodegaId: 1,
              color: detalle.color,
              talla: detalle.talla,
              stock: detalle.cantidad,
            },
          });

          // 🔥 EL TOQUE MAESTRO: Si la ropa trajo su propio código (QR), lo enlazamos al POS
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
                almacenId: 1,
              },
            });
          }
        }
      }

      return nuevaCompra;
    });
  }
}