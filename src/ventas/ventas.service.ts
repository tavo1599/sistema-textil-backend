import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVentaDto } from './dto/create-venta.dto'; 
import { KardexService } from '../kardex/kardex.service';

@Injectable()
export class VentasService {
  constructor(
    private prisma: PrismaService,
    private kardex: KardexService,
  ) {}

  async registrarVenta(dto: any) { 
    // 🔥 TRANSACCIÓN ATÓMICA: Todo se guarda junto o nada se guarda
    return this.prisma.$transaction(async (tx) => {
      let totalVenta = 0;
      let totalPrendasVendidas = 0;

      // ========================================================
      // 1. VALIDAR STOCK Y SUMAR TOTALES
      //    (el descuento físico + kardex valorizado se hace en el paso 4)
      // ========================================================
      for (const item of dto.detalles) {
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

        totalVenta += Number(item.cantidad) * Number(item.precioUnitario);
        totalPrendasVendidas += Number(item.cantidad);
      }

      // ========================================================
      // 2. 🔥 LÓGICA DE CRÉDITOS Y BILLETERA DEL CLIENTE
      // ========================================================
      const condicionPago = dto.condicionPago || 'CONTADO';
      const montoAdelanto = condicionPago === 'CONTADO' ? totalVenta : (Number(dto.adelanto) || 0);
      const saldoRestante = totalVenta - montoAdelanto;

      if (condicionPago !== 'CONTADO') {
        if (!dto.clienteId) throw new BadRequestException("Debe seleccionar un cliente registrado para ventas al crédito.");

        const cliente = await tx.cliente.findUnique({ where: { id: Number(dto.clienteId) } });
        if (!cliente) throw new BadRequestException("Cliente no encontrado.");

        const nuevoSaldo = Number(cliente.saldoPendiente) + saldoRestante;

        if (nuevoSaldo > Number(cliente.limiteCredito)) {
          throw new BadRequestException(
            `Excede límite de crédito. Límite: S/ ${cliente.limiteCredito}, Deuda proyectada: S/ ${nuevoSaldo}`
          );
        }

        await tx.cliente.update({
          where: { id: Number(dto.clienteId) },
          data: { saldoPendiente: nuevoSaldo }
        });
      }

      // ========================================================
      // 3. CREAR CABECERA Y DETALLES DE LA VENTA
      // ========================================================
      const correlativoVenta = `VEN-${Date.now().toString().slice(-6)}`;
      const metodoEntregaFinal = dto.metodoEntrega || (dto.requiereEnvio ? 'ENVIO_AGENCIA' : 'ENTREGA_INMEDIATA');

      let estadoPagoFinal = 'PENDIENTE';
      if (saldoRestante <= 0 || condicionPago === 'CONTADO') estadoPagoFinal = 'PAGADO';
      else if (montoAdelanto > 0) estadoPagoFinal = 'PAGO_PARCIAL';

      const nuevaVenta = await tx.venta.create({
        data: {
          correlativo: correlativoVenta,
          clienteId: dto.clienteId ? Number(dto.clienteId) : null,
          clienteNombre: dto.clienteNombre || 'Cliente de Mostrador',
          tipoVenta: dto.tipoVenta || 'MINORISTA',
          metodoEntrega: metodoEntregaFinal,
          destinoEnvio: dto.destinoEnvio,
          
          condicionPago: condicionPago,
          estadoPago: estadoPagoFinal,
          totalVenta: totalVenta,
          totalPagado: montoAdelanto,
          
          bodegaId: Number(dto.almacenId),
          estado: dto.requiereEnvio || metodoEntregaFinal === 'ENVIO_AGENCIA' ? 'Pendiente Despacho' : 'Completada',
          
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
      // 4. REGISTRAR KARDEX VALORIZADO (SALIDA) + DESCUENTO FÍSICO
      //    Usa el costo promedio vigente (CPP) de cada prenda.
      // ========================================================
      for (const item of dto.detalles) {
        await this.kardex.registrarSalida(tx, {
          productoId: Number(item.productoId),
          color: String(item.color),
          talla: String(item.talla),
          bodegaId: Number(dto.almacenId),
          cantidad: Number(item.cantidad),
          motivo: `VENTA - ${nuevaVenta.correlativo}`,
          tipoMovimiento: 'SALIDA',
          referenciaId: nuevaVenta.id,
          actualizarStockFisico: true, // descuenta InventarioTerminado
        });
      }

      // ========================================================
      // 5. 🔥 MÓDULO DE COBROS: ABONOS Y CUOTAS 
      // ========================================================
      if (condicionPago !== 'CONTADO') {
        if (montoAdelanto > 0) {
          await tx.abono.create({
            data: {
              ventaId: nuevaVenta.id,
              monto: montoAdelanto,
              metodoPago: 'EFECTIVO', 
              anotacion: 'Adelanto inicial en Punto de Venta'
            }
          });
        }

        if (saldoRestante > 0) {
          if (condicionPago === 'CREDITO_FLEXIBLE') {
            await tx.cuotaCredito.create({
              data: { ventaId: nuevaVenta.id, numeroCuota: 1, montoEsperado: saldoRestante }
            });
          } else if (condicionPago === 'CREDITO_ESTRICTO') {
            const cantidadCuotas = Number(dto.numeroCuotas) || 1;
            const montoPorCuota = saldoRestante / cantidadCuotas;
            const fechaBase = new Date(); 

            for (let i = 1; i <= cantidadCuotas; i++) {
              let fechaVencimiento = new Date(fechaBase.getTime());
              
              if (dto.frecuenciaPago === 'SEMANAL') fechaVencimiento.setDate(fechaBase.getDate() + (7 * i));
              else if (dto.frecuenciaPago === 'QUINCENAL') fechaVencimiento.setDate(fechaBase.getDate() + (15 * i));
              else if (dto.frecuenciaPago === 'MENSUAL') fechaVencimiento.setMonth(fechaBase.getMonth() + i);

              await tx.cuotaCredito.create({
                data: {
                  ventaId: nuevaVenta.id,
                  numeroCuota: i,
                  montoEsperado: montoPorCuota,
                  fechaVencimiento: fechaVencimiento,
                  estado: 'PENDIENTE'
                }
              });
            }
          }
        }
      }

      // ========================================================
      // 6. ¡EL ENCHUFE CON LOGÍSTICA! 🚚
      // ========================================================
      if (dto.requiereEnvio || metodoEntregaFinal === 'ENVIO_AGENCIA') {
        const codigoGuiaGenerado = `GR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        await tx.despachoVenta.create({
          data: {
            codigoGuia: codigoGuiaGenerado,
            cliente: dto.clienteNombre || 'Cliente Mayorista',
            destino: dto.destinoEnvio || 'Recojo en Agencia',
            prendas: totalPrendasVendidas,
            estado: 'Listo para Empaque',
            ventaId: nuevaVenta.id 
          }
        });
      }

      return {
        id: nuevaVenta.id,
        correlativo: nuevaVenta.correlativo,
        mensaje: (dto.requiereEnvio || metodoEntregaFinal === 'ENVIO_AGENCIA') 
          ? "Venta registrada y Orden enviada a Despachos 🚚" 
          : "Venta realizada con éxito ✅",
        cliente: nuevaVenta.clienteNombre,
        condicionPago: condicionPago,
        totalFacturado: totalVenta.toFixed(2),
        totalCobrado: montoAdelanto.toFixed(2),
        saldoPendiente: saldoRestante.toFixed(2),
        fecha: nuevaVenta.fecha
      };
    });
  }

  async obtenerDespachosPendientes() {
    return this.prisma.despachoVenta.findMany({
      orderBy: { fecha: 'desc' },
      include: { 
        venta: { include: { detalles: true } } 
      }
    });
  }

  // ========================================================
  // 🟢 NUEVA FUNCIÓN PARA EL DASHBOARD DE VUE
  // ========================================================
  async obtenerReporteGeneral() {
    // Traemos las últimas ventas mapeando la relación con "bodega"
    const ventasBD = await this.prisma.venta.findMany({
      orderBy: { fecha: 'desc' },
      take: 50,
      include: {
        bodega: true, // Asumimos que la relación en Prisma se llama 'bodega' por el campo 'bodegaId'
        detalles: true
      }
    });

    const ultimasVentas = ventasBD.map(venta => ({
      id: venta.id,
      correlativo: venta.correlativo || `VEN-${String(venta.id).padStart(5, '0')}`,
      createdAt: venta.fecha,
      metodoPago: venta.condicionPago || 'CONTADO',
      almacen: venta.bodega?.nombre || 'Almacén Principal',
      total: Number(venta.totalVenta),
      estado: venta.estadoPago === 'PAGADO' ? 'Completada' : 'Crédito / Pendiente'
    }));

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const ventasHoy = ventasBD.filter(v => new Date(v.fecha) >= hoy);
    const totalSolesHoy = ventasHoy.reduce((sum, v) => sum + Number(v.totalVenta), 0);
    
    let totalPrendasHoy = 0;
    ventasHoy.forEach(venta => {
      venta.detalles.forEach(detalle => {
        totalPrendasHoy += Number(detalle.cantidad);
      });
    });

    // Contamos cuántos SKUs (combinación de talla/color/bodega) tienen stock menor a 5
    const stockCritico = await this.prisma.inventarioTerminado.count({
      where: { stock: { lte: 5 } }
    });

    return {
      ultimasVentas,
      kpis: {
        ventasHoy: totalSolesHoy.toFixed(2),
        prendasVendidas: totalPrendasHoy,
        stockBajo: stockCritico
      }
    };
  }

  // ========================================================
  // 🟢 ESCÁNER DE PUNTO DE VENTA (Conecta QR con Inventario)
  // ========================================================
  async buscarPorCodigoEscaner(codigo: string) {
    // 1. Buscamos el código exacto de la etiqueta en la tabla StockPrenda
    const prendaEscaneada = await this.prisma.stockPrenda.findUnique({
      where: { skuBarras: codigo },
      include: { 
        producto: true // Traemos el nombre y detalles base
      }
    });

    if (!prendaEscaneada) {
      throw new BadRequestException(`El código escaneado (${codigo}) no existe en el sistema.`);
    }

    // 2. Buscamos el stock físico real para asegurar que hay prendas disponibles
    const inventarioFisico = await this.prisma.inventarioTerminado.findFirst({
      where: {
        productoId: prendaEscaneada.productoId,
        color: prendaEscaneada.color,
        talla: prendaEscaneada.talla,
        stock: { gt: 0 } // Que tenga al menos 1 en stock
      }
    });

    if (!inventarioFisico) {
      throw new BadRequestException(`El código existe, pero no hay stock físico de esta prenda (${prendaEscaneada.color} - ${prendaEscaneada.talla}).`);
    }

    // 3. Devolvemos el "molde" exacto que su Carrito de Ventas necesita
    return {
      productoId: prendaEscaneada.productoId,
      nombre: prendaEscaneada.producto.nombre,
      color: prendaEscaneada.color,
      talla: prendaEscaneada.talla,
      stockDisponible: inventarioFisico.stock,
      bodegaId: inventarioFisico.bodegaId
    };
  }
}