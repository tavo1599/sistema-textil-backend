import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVentaDto } from './dto/create-venta.dto';

@Injectable()
export class VentasService {
  constructor(private prisma: PrismaService) {}

  async registrarVenta(dto: CreateVentaDto) {
    return this.prisma.$transaction(async (tx) => {
      let totalVenta = 0;
      let totalPrendasVendidas = 0;

      // 1 y 2. Verificar y Descontar Stock en la tabla correcta
      for (const item of dto.detalles) {
        // 🔍 Buscamos en 'inventarioTerminado' que es donde el Ingreso Libre guarda el stock
        const registroStock = await tx.inventarioTerminado.findFirst({
          where: {
            productoId: Number(item.productoId),
            color: String(item.color),
            talla: String(item.talla),
            bodegaId: Number(dto.almacenId) // En Prisma es 'bodegaId'
          }
        });

        // Validamos si existe el registro y si hay suficiente stock
        if (!registroStock || registroStock.stock < item.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para el producto ID ${item.productoId} (${item.color} - Talla ${item.talla}) en esta bodega.`
          );
        }

        // 📉 Actualizamos la cantidad restando la venta
        await tx.inventarioTerminado.update({
          where: { id: registroStock.id },
          data: { 
            stock: registroStock.stock - Number(item.cantidad) 
          }
        });

        totalVenta += Number(item.cantidad) * Number(item.precioUnitario);
        totalPrendasVendidas += Number(item.cantidad);
      }

      // 3. ¡EL ENCHUFE CON LOGÍSTICA! 🚚
      if (dto.requiereEnvio) {
        const codigoGuiaGenerado = `GR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        await tx.despachoVenta.create({
          data: {
            codigoGuia: codigoGuiaGenerado,
            cliente: dto.clienteNombre || 'Cliente de Mostrador',
            destino: dto.destinoEnvio || 'Recojo en Tienda',
            prendas: totalPrendasVendidas,
            estado: 'Listo para Empaque'
          }
        });
      }

      

      // 4. Retornar el resumen financiero al Frontend
      return {
        mensaje: dto.requiereEnvio 
          ? "Venta registrada y enviada a Despachos 🚚" 
          : "Venta realizada con éxito ✅",
        cliente: dto.clienteNombre || 'Cliente de Mostrador',
        totalCobrado: totalVenta.toFixed(2),
        fecha: new Date()
      };
    });
  }

  async obtenerDespachosPendientes() {
  return this.prisma.despachoVenta.findMany({
    orderBy: { fecha: 'desc' },
    // Podrías filtrar por estado: where: { estado: 'Listo para Empaque' }
  });
}
}