import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVentaDto } from './dto/create-venta.dto';

@Injectable()
export class VentasService {
  constructor(private prisma: PrismaService) {}

  async registrarVenta(dto: CreateVentaDto) {
    return this.prisma.$transaction(async (tx) => {
      let totalVenta = 0;

      for (const item of dto.detalles) {
        // 1. Verificar si hay stock suficiente
        const stock = await tx.stockPrenda.findFirst({
          where: {
            productoId: item.productoId,
            colorId: item.colorId,
            tallaId: item.tallaId,
            almacenId: dto.almacenId
          }
        });

        if (!stock || stock.cantidad < item.cantidad) {
          throw new BadRequestException(`Stock insuficiente para el producto ID ${item.productoId}`);
        }

        // 2. Descontar del stock
        await tx.stockPrenda.update({
          where: { id: stock.id },
          data: { cantidad: stock.cantidad - item.cantidad }
        });

        totalVenta += item.cantidad * item.precioUnitario;
      }

      // 3. Registrar la venta en una tabla de Historial (puedes crearla en el schema luego)
      // Por ahora devolvemos el resumen financiero
      return {
        mensaje: "Venta realizada con éxito",
        cliente: dto.clienteNombre,
        canal: dto.tipoVenta,
        totalCobrado: totalVenta.toFixed(2),
        fecha: new Date()
      };
    });
  }
}