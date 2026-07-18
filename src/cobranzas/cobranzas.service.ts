import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CobranzasService {
  constructor(private prisma: PrismaService) {}

  // ========================================================
  // 1. OBTENER LISTA DE CLIENTES MOROSOS / CON DEUDA
  // ========================================================
  async obtenerDeudores() {
    return this.prisma.cliente.findMany({
      where: { 
        saldoPendiente: { gt: 0 } // Solo trae a los que deben más de 0
      },
      orderBy: { 
        saldoPendiente: 'desc' // Los que deben más dinero salen primero
      },
      // Traemos el detalle de qué ventas deben para mostrarlo en Vue
      include: {
        ventas: {
          where: { estadoPago: { not: 'PAGADO' } },
          orderBy: { fecha: 'asc' } // Las más antiguas primero
        }
      }
    });
  }

  // ========================================================
  // 2. REGISTRAR PAGO Y DISTRIBUIRLO (EFECTO CASCADA)
  // ========================================================
  async registrarAbono(data: { clienteId: number, monto: number, metodoPago: string, referencia?: string }) {
    return this.prisma.$transaction(async (tx) => {
      let dineroDisponible = Number(data.monto);

      // 1. Validamos al cliente
      const cliente = await tx.cliente.findUnique({ where: { id: data.clienteId }});
      if (!cliente) throw new BadRequestException('Cliente no encontrado');
      
      if (dineroDisponible > Number(cliente.saldoPendiente)) {
        throw new BadRequestException(`El monto (S/ ${dineroDisponible}) supera la deuda total del cliente (S/ ${cliente.saldoPendiente}).`);
      }

      // 2. Buscamos todas sus ventas que aún no están pagadas, de la más antigua a la más nueva
      const ventasConDeuda = await tx.venta.findMany({
        where: { clienteId: data.clienteId, estadoPago: { not: 'PAGADO' } },
        orderBy: { fecha: 'asc' } 
      });

      // 3. Empezamos a pagar las ventas una por una hasta que se acabe la plata
      for (const venta of ventasConDeuda) {
        if (dineroDisponible <= 0) break; // Si ya se nos acabó el dinero del Yape/Efectivo, paramos.

        const deudaDeEstaVenta = Number(venta.totalVenta) - Number(venta.totalPagado);
        let montoUsadoEnEstaVenta = 0;

        if (dineroDisponible >= deudaDeEstaVenta) {
          // El dinero alcanza para pagar TODA esta venta
          montoUsadoEnEstaVenta = deudaDeEstaVenta;
          
          await tx.venta.update({
            where: { id: venta.id },
            data: { totalPagado: Number(venta.totalVenta), estadoPago: 'PAGADO' }
          });

          // Cancelamos todas sus cuotas pendientes
          await tx.cuotaCredito.updateMany({
            where: { ventaId: venta.id },
            data: { estado: 'PAGADO' }
          });
          
        } else {
          // El dinero NO alcanza para pagar toda la venta, solo hace un abono parcial
          montoUsadoEnEstaVenta = dineroDisponible;
          
          await tx.venta.update({
            where: { id: venta.id },
            data: { 
              totalPagado: Number(venta.totalPagado) + montoUsadoEnEstaVenta, 
              estadoPago: 'PAGO_PARCIAL' 
            }
          });
        }

        // 4. Registramos el recibo de pago para esta venta
        await tx.abono.create({
          data: {
            ventaId: venta.id,
            monto: montoUsadoEnEstaVenta,
            metodoPago: data.metodoPago || 'TRANSFERENCIA',
            anotacion: data.referencia || 'Abono general a cuenta de cliente'
          }
        });

        // Restamos el dinero que acabamos de usar
        dineroDisponible -= montoUsadoEnEstaVenta;
      }

      // Cuánto se pudo aplicar realmente a ventas (lo que quedó sin usar NO se descuenta)
      const totalAplicado = Number(data.monto) - dineroDisponible;
      if (totalAplicado <= 0) {
        // No había ninguna venta pendiente donde registrar el abono → no descontamos a ciegas
        throw new BadRequestException('No hay deudas pendientes registradas para aplicar este pago. Revisa las ventas del cliente.');
      }

      // 5. Finalmente, actualizamos la billetera principal del cliente (solo lo aplicado)
      const clienteActualizado = await tx.cliente.update({
        where: { id: data.clienteId },
        data: { saldoPendiente: { decrement: totalAplicado } }
      });

      return {
        mensaje: 'Abono registrado y distribuido con éxito ✅',
        nuevoSaldoDeudor: clienteActualizado.saldoPendiente
      };
    });
  }

  async obtenerHistorialPagos(clienteId: number) {
    return this.prisma.abono.findMany({
      where: {
        venta: {
          clienteId: clienteId
        }
      },
      include: {
        venta: { select: { correlativo: true } } // Traemos el código de la factura que pagó
      },
      orderBy: { id: 'desc' } // Los pagos más recientes primero
    });
  }

async crearDeudaManual(data: { clienteId: number; monto: number; concepto: string }) {
    const correlativoManual = `MAN-${Date.now().toString().slice(-6)}`;

    return this.prisma.$transaction(async (tx) => {
      
      // 1. Incrementamos el saldoPendiente del cliente afectado
      await tx.cliente.update({
        where: { id: data.clienteId },
        data: {
          saldoPendiente: {
            increment: data.monto,
          },
        },
      });

      // 2. Creamos el registro con todos los campos que exige Prisma
      return tx.venta.create({
        data: {
          clienteId: data.clienteId,
          correlativo: correlativoManual,
          totalVenta: data.monto,
          totalPagado: 0,
          condicionPago: 'CREDITO',
          estadoPago: 'PENDIENTE', // 🔥 clave: sin esto quedaba "PAGADO" (default) y el abono no se registraba

          // Campos obligatorios
          tipoVenta: 'MAYORISTA',
          metodoEntrega: 'ENTREGA_INMEDIATA',
          bodegaId: 1, // Asignamos la deuda a la bodega principal
        },
      });
    });
  }
}