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
      // Traemos el detalle de qué ventas deben para mostrarlo en Vue.
      //
      // ⚠️ Filtramos por SALDO REAL, no por el flag `estadoPago`. Ese flag se
      // desincronizó en producción (las deudas manuales nacían con el default
      // 'PAGADO' del esquema) y la tarjeta terminaba mostrando la deuda del
      // cliente con la lista de ventas vacía debajo: se veía el monto pero no
      // había forma de cobrarlo. La plata es la fuente de verdad, no el flag.
      include: {
        ventas: {
          where: { totalPagado: { lt: this.prisma.venta.fields.totalVenta } },
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
      if (!(dineroDisponible > 0)) {
        throw new BadRequestException('El monto del abono debe ser mayor a cero.');
      }

      // 1. Validamos al cliente
      const cliente = await tx.cliente.findUnique({ where: { id: data.clienteId }});
      if (!cliente) throw new BadRequestException('Cliente no encontrado');

      // 2. Buscamos sus ventas con deuda, de la más antigua a la más nueva.
      //
      // 🔒 Se seleccionan por SALDO REAL (totalPagado < totalVenta), NO por el
      // flag `estadoPago`. Antes se filtraba por el flag y bastaba que estuviera
      // mal puesto para que la deuda quedara imposible de cobrar: el cliente
      // aparecía debiendo pero el abono no encontraba dónde aplicarse y reventaba
      // con "No hay deudas pendientes registradas". Yendo por la plata, el cobro
      // funciona igual aunque el flag esté mal, y el bucle lo deja corregido.
      const ventasConDeuda = await tx.venta.findMany({
        where: {
          clienteId: data.clienteId,
          totalPagado: { lt: this.prisma.venta.fields.totalVenta }
        },
        orderBy: { fecha: 'asc' }
      });

      // La deuda que realmente respaldan las ventas. `cliente.saldoPendiente` es
      // solo un acumulado que puede venir desfasado, así que no se valida contra él.
      const deudaReal = ventasConDeuda.reduce(
        (suma, v) => suma + (Number(v.totalVenta) - Number(v.totalPagado)),
        0
      );

      if (deudaReal <= 0) {
        throw new BadRequestException('Este cliente no tiene ventas con saldo pendiente.');
      }

      if (dineroDisponible > deudaReal) {
        throw new BadRequestException(`El monto (S/ ${dineroDisponible.toFixed(2)}) supera la deuda real del cliente (S/ ${deudaReal.toFixed(2)}).`);
      }

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
        // No debería llegar aquí: `deudaReal` ya garantizó que había dónde aplicar.
        // Queda como red de seguridad para no descontar a ciegas.
        throw new BadRequestException('No se pudo aplicar el pago a ninguna venta. Revisa las ventas del cliente.');
      }

      // 5. Actualizamos la billetera del cliente.
      //
      // 🔒 Se RECALCULA desde las ventas en vez de descontar a ciegas. Antes se
      // hacía `decrement: monto`, y si la ficha venía desfasada el desfase se
      // arrastraba para siempre. Así, cada cobro deja al cliente cuadrado con su
      // ledger real: cualquier descuadre heredado se corrige solo al primer pago.
      const clienteActualizado = await tx.cliente.update({
        where: { id: data.clienteId },
        data: { saldoPendiente: deudaReal - totalAplicado }
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
    return this.prisma.$transaction(async (tx) => {
      // ⚠️ Antes se usaba Date.now() cortado a 6 dígitos, que se repite cada ~16 min
      // y podía chocar. Ahora es un correlativo secuencial real (MAN-000001, ...).
      const ultimaManual = await tx.venta.findFirst({
        where: { correlativo: { startsWith: 'MAN-' } },
        orderBy: { correlativo: 'desc' },
        select: { correlativo: true },
      });
      let numeroManual = 1;
      if (ultimaManual?.correlativo) {
        const m = ultimaManual.correlativo.match(/(\d+)$/);
        if (m) numeroManual = parseInt(m[1], 10) + 1;
      }
      const correlativoManual = `MAN-${String(numeroManual).padStart(6, '0')}`;


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