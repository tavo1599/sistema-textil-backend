import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVentaDto } from './dto/create-venta.dto';

@Injectable()
export class VentasService {
  constructor(private prisma: PrismaService) {}

  async registrarVenta(dto: CreateVentaDto) {
    // 🔥 TRANSACCIÓN ATÓMICA: Todo se guarda junto o nada se guarda
    return this.prisma.$transaction(async (tx) => {
      let totalVenta = 0;
      let totalPrendasVendidas = 0;

      // ========================================================
      // 1. VALIDAR STOCK Y DESCONTAR EN INVENTARIO (Atomicidad)
      // ========================================================
      for (const item of dto.detalles) {
        // Usamos el índice único compuesto que creamos en el schema para búsquedas ultra rápidas
        const registroStock = await tx.inventarioTerminado.findUnique({
          where: {
            productoId_bodegaId_color_talla: {
              productoId: Number(item.productoId),
              bodegaId: Number(dto.almacenId),
              color: String(item.color),
              talla: String(item.talla),
            }
          }
        });

        if (!registroStock || registroStock.stock < item.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para el producto ID ${item.productoId} (${item.color} - Talla ${item.talla}) en esta bodega. Stock actual: ${registroStock?.stock || 0}`
          );
        }

        // 📉 Descuento atómico de Prisma (Previene sobreventas por concurrencia)
        await tx.inventarioTerminado.update({
          where: { id: registroStock.id },
          data: { 
            stock: { decrement: Number(item.cantidad) } 
          }
        });

        totalVenta += Number(item.cantidad) * Number(item.precioUnitario);
        totalPrendasVendidas += Number(item.cantidad);
      }

      // ========================================================
      // 2. CREAR HISTORIAL: CABECERA Y DETALLES DE LA VENTA
      // ========================================================
      const correlativoVenta = `VEN-${Date.now().toString().slice(-6)}`;
      const metodoEntregaFinal = dto.metodoEntrega || (dto.requiereEnvio ? 'ENVIO_AGENCIA' : 'ENTREGA_INMEDIATA');

      const nuevaVenta = await tx.venta.create({
        data: {
          correlativo: correlativoVenta,
          clienteNombre: dto.clienteNombre || 'Cliente de Mostrador',
          tipoVenta: dto.tipoVenta || 'MINORISTA',
          metodoEntrega: metodoEntregaFinal,
          destinoEnvio: dto.destinoEnvio,
          totalPagado: totalVenta,
          bodegaId: Number(dto.almacenId),
          estado: dto.requiereEnvio || metodoEntregaFinal === 'ENVIO_AGENCIA' ? 'Pendiente Despacho' : 'Completada',
          
          // Prisma permite crear los detalles anidados en la misma operación
          detalles: {
            create: dto.detalles.map(item => ({
              productoId: Number(item.productoId),
              color: String(item.color),
              talla: String(item.talla),
              cantidad: Number(item.cantidad),
              precioUnitario: Number(item.precioUnitario),
              subtotal: Number(item.cantidad) * Number(item.precioUnitario)
            }))
          }
        }
      });

      // ========================================================
      // 3. REGISTRAR KARDEX (AUDITORÍA DE MOVIMIENTOS)
      // ========================================================
      for (const item of dto.detalles) {
        await tx.movimientoInventario.create({
          data: {
            tipoMovimiento: 'SALIDA',
            motivo: 'VENTA',
            cantidad: Number(item.cantidad),
            referenciaId: nuevaVenta.id, // Vinculamos la salida a esta venta
            productoId: Number(item.productoId),
            color: String(item.color),
            talla: String(item.talla),
            bodegaId: Number(dto.almacenId)
          }
        });
      }

      // ========================================================
      // 4. ¡EL ENCHUFE CON LOGÍSTICA! 🚚
      // ========================================================
      if (dto.requiereEnvio || metodoEntregaFinal === 'ENVIO_AGENCIA') {
        const codigoGuiaGenerado = `GR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        await tx.despachoVenta.create({
          data: {
            codigoGuia: codigoGuiaGenerado,
            cliente: dto.clienteNombre|| 'Cliente Mayorista',
            destino: dto.destinoEnvio || 'Recojo en Agencia',
            prendas: totalPrendasVendidas,
            estado: 'Listo para Empaque',
            ventaId: nuevaVenta.id // 🔥 Enlazamos el despacho a la venta que acabamos de crear
          }
        });
      }

      // ========================================================
      // 5. RETORNO AL FRONTEND (Para imprimir el Ticket)
      // ========================================================
      return {
        id: nuevaVenta.id,
        correlativo: nuevaVenta.correlativo,
        mensaje: (dto.requiereEnvio || metodoEntregaFinal === 'ENVIO_AGENCIA') 
          ? "Venta registrada y Orden enviada a Despachos 🚚" 
          : "Venta realizada con éxito ✅",
        cliente: nuevaVenta.clienteNombre,
        totalCobrado: totalVenta.toFixed(2),
        fecha: nuevaVenta.fecha
      };
    });
  }

  // Ahora si consultas los despachos, puedes traer la info de la venta original
  async obtenerDespachosPendientes() {
    return this.prisma.despachoVenta.findMany({
      orderBy: { fecha: 'desc' },
      include: { 
        venta: {
          include: { detalles: true } // El almacenero podrá ver exactamente qué empacar
        } 
      }
    });
  }
}