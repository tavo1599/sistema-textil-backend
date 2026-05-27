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
    // 🔥 EL AUTOSANADOR: Lo movemos AFUERA de la transacción. 
    // Así obligamos a la base de datos a crearlo y confirmar su existencia primero.
    let almacenPrincipal = await this.prisma.almacen.findFirst({ orderBy: { id: 'asc' } });
    
    if (!almacenPrincipal) {
      almacenPrincipal = await this.prisma.almacen.create({
        data: {
          nombre: 'Almacén Central POS',
          tipo: 'Principal'
        }
      });
    }

    const idAlmacenReal = Number(almacenPrincipal.id);

    // 👇 AQUÍ RECIÉN EMPIEZA LA TRANSACCIÓN SEGURA
    return this.prisma.$transaction(async (tx) => {
      
      const idBodegaReal = Number(data.bodegaDestinoId);

      // 1. Guardamos la "Cabecera" de la compra
      const nuevaCompra = await tx.compra.create({
        data: {
          correlativo: data.correlativo,
          proveedorId: Number(data.proveedorId),
          totalCompra: Number(data.totalCompra),
          detalles: {
            create: data.detalles.map((d: any) => ({
              tipoItem: d.tipoItem,
              insumoId: d.insumoId ? Number(d.insumoId) : null,
              productoId: d.productoId ? Number(d.productoId) : null,
              color: d.color,
              talla: d.talla,
              skuProveedor: d.skuProveedor,
              cantidad: Number(d.cantidad),
              costoUnitario: Number(d.costoUnitario),
              subtotal: Number(d.subtotal),
            })),
          },
        },
      });

      // 2. Analizamos cada fila y repartimos a donde corresponda
      for (const detalle of data.detalles) {
        
        if (detalle.tipoItem === 'INSUMO') {
          await tx.insumo.update({
            where: { id: Number(detalle.insumoId) },
            data: { stockActual: { increment: Number(detalle.cantidad) } },
          });
        } 
        
        else if (detalle.tipoItem === 'PRENDA') {
          
          await tx.inventarioTerminado.upsert({
            where: {
              productoId_bodegaId_color_talla: {
                productoId: Number(detalle.productoId),
                bodegaId: idBodegaReal, 
                color: detalle.color,
                talla: detalle.talla,
              },
            },
            update: { stock: { increment: Number(detalle.cantidad) } },
            create: {
              productoId: Number(detalle.productoId),
              bodegaId: idBodegaReal,
              color: detalle.color,
              talla: detalle.talla,
              stock: Number(detalle.cantidad),
            },
          });

          if (detalle.skuProveedor && detalle.skuProveedor.trim() !== '') {
            // 🔥 REEMPLAZAMOS EL UPSERT POR VALIDACIÓN CLÁSICA PARA EVITAR BUGS DE PRISMA
            const existeQR = await tx.stockPrenda.findUnique({
              where: { skuBarras: detalle.skuProveedor }
            });

            if (existeQR) {
              await tx.stockPrenda.update({
                where: { skuBarras: detalle.skuProveedor },
                data: { 
                  cantidad: { increment: Number(detalle.cantidad) },
                  almacenId: idAlmacenReal 
                }
              });
            } else {
              await tx.stockPrenda.create({
                data: {
                  skuBarras: detalle.skuProveedor,
                  cantidad: Number(detalle.cantidad),
                  productoId: Number(detalle.productoId),
                  color: detalle.color,
                  talla: detalle.talla,
                  almacenId: idAlmacenReal,
                }
              });
            }
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