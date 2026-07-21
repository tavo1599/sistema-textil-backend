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

        // Crédito ILIMITADO: ya no se bloquea la venta por límite de crédito.
        // (Antes, si el cliente tenía deuda previa, la venta se rechazaba.)

        await tx.cliente.update({
          where: { id: Number(dto.clienteId) },
          data: { saldoPendiente: nuevoSaldo }
        });
      }

      // ========================================================
      // 3. CREAR CABECERA Y DETALLES DE LA VENTA
      // ========================================================
      const correlativoVenta = await this.generarCorrelativo(tx);
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

  // ========================================================
  // PRIVADO: correlativo secuencial seguro dentro de una tx
  // Lee el último número registrado y suma 1, evitando
  // colisiones si dos ventas se registran al mismo tiempo.
  // ========================================================
  // ========================================================
  // DEVOLUCIONES / CAMBIOS
  // Devuelve prendas de una venta: reingresa el stock al almacén,
  // ajusta el total de la venta y la deuda del cliente si era a crédito.
  // ========================================================
  async registrarDevolucion(data: {
    ventaId: number;
    bodegaId: number;
    motivo?: string;
    items: { detalleId: number; cantidad: number }[];
  }) {
    if (!data.items?.length) throw new BadRequestException('Selecciona al menos una prenda a devolver.');

    return this.prisma.$transaction(async (tx) => {
      const venta = await tx.venta.findUnique({
        where: { id: Number(data.ventaId) },
        include: { detalles: true },
      });
      if (!venta) throw new BadRequestException('Venta no encontrada.');

      let montoDevuelto = 0;

      for (const item of data.items) {
        const cant = Number(item.cantidad);
        if (cant <= 0) continue;

        const detalle = venta.detalles.find((d) => d.id === Number(item.detalleId));
        if (!detalle) throw new BadRequestException('Una de las prendas no pertenece a esta venta.');
        if (cant > detalle.cantidad) {
          throw new BadRequestException(`No puedes devolver ${cant}; solo se vendieron ${detalle.cantidad}.`);
        }

        montoDevuelto += cant * Number(detalle.precioUnitario);

        // 1. El stock vuelve al almacén elegido
        const existente = await tx.inventarioTerminado.findFirst({
          where: {
            productoId: detalle.productoId,
            bodegaId: Number(data.bodegaId),
            color: detalle.color,
            talla: detalle.talla,
          },
        });
        if (existente) {
          await tx.inventarioTerminado.update({
            where: { id: existente.id },
            data: { stock: existente.stock + cant },
          });
        } else {
          await tx.inventarioTerminado.create({
            data: {
              productoId: detalle.productoId,
              bodegaId: Number(data.bodegaId),
              color: detalle.color,
              talla: detalle.talla,
              stock: cant,
            },
          });
        }

        // 2. Kardex
        await tx.movimientoInventario.create({
          data: {
            tipoMovimiento: 'INGRESO',
            motivo: data.motivo || `Devolución venta ${venta.correlativo}`,
            cantidad: cant,
            productoId: detalle.productoId,
            color: detalle.color,
            talla: detalle.talla,
            bodegaId: Number(data.bodegaId),
          },
        });

        // 3. Ajustamos el detalle de la venta
        const nuevaCantidad = detalle.cantidad - cant;
        if (nuevaCantidad <= 0) {
          await tx.ventaDetalle.delete({ where: { id: detalle.id } });
        } else {
          await tx.ventaDetalle.update({
            where: { id: detalle.id },
            data: {
              cantidad: nuevaCantidad,
              subtotal: nuevaCantidad * Number(detalle.precioUnitario),
            },
          });
        }
      }

      if (montoDevuelto <= 0) throw new BadRequestException('No se devolvió ninguna prenda.');

      // 4. Recalculamos la venta
      const totalVentaAnt = Number(venta.totalVenta);
      const totalPagadoAnt = Number(venta.totalPagado);
      const nuevoTotalVenta = Math.max(totalVentaAnt - montoDevuelto, 0);
      // Si ya había pagado más de lo que ahora cuesta, ese excedente se le devuelve en efectivo
      const nuevoTotalPagado = Math.min(totalPagadoAnt, nuevoTotalVenta);
      const efectivoADevolver = totalPagadoAnt - nuevoTotalPagado;

      // Cuánto baja la deuda del cliente
      const deudaAntes = totalVentaAnt - totalPagadoAnt;
      const deudaDespues = nuevoTotalVenta - nuevoTotalPagado;
      const reduccionDeuda = Math.max(deudaAntes - deudaDespues, 0);

      const estadoPago =
        nuevoTotalPagado >= nuevoTotalVenta ? 'PAGADO' : nuevoTotalPagado > 0 ? 'PAGO_PARCIAL' : 'PENDIENTE';

      await tx.venta.update({
        where: { id: venta.id },
        data: { totalVenta: nuevoTotalVenta, totalPagado: nuevoTotalPagado, estadoPago },
      });

      if (venta.clienteId && reduccionDeuda > 0) {
        await tx.cliente.update({
          where: { id: venta.clienteId },
          data: { saldoPendiente: { decrement: reduccionDeuda } },
        });
      }

      return {
        mensaje: 'Devolución registrada ✅',
        correlativo: venta.correlativo,
        montoDevuelto: montoDevuelto.toFixed(2),
        efectivoADevolver: efectivoADevolver.toFixed(2),
        deudaReducida: reduccionDeuda.toFixed(2),
        nuevoTotalVenta: nuevoTotalVenta.toFixed(2),
      };
    });
  }

  // ========================================================
  // CIERRE DE CAJA: resumen de lo vendido en un día
  // ========================================================
  async cierreDeCaja(fechaStr?: string, bodegaId?: number) {
    const base = fechaStr ? new Date(`${fechaStr}T00:00:00`) : new Date();
    const desde = new Date(base);
    desde.setHours(0, 0, 0, 0);
    const hasta = new Date(base);
    hasta.setHours(23, 59, 59, 999);

    const ventas = await this.prisma.venta.findMany({
      where: {
        fecha: { gte: desde, lte: hasta },
        ...(bodegaId ? { bodegaId: Number(bodegaId) } : {}),
      },
      include: {
        bodega: { select: { nombre: true } },
        detalles: { select: { cantidad: true } },
      },
      orderBy: { fecha: 'asc' },
    });

    let totalVendido = 0;
    let totalCobrado = 0; // lo que realmente entró (adelantos + contado)
    let totalCredito = 0; // lo que quedó como deuda
    let prendas = 0;

    const porCondicion: Record<string, { cantidad: number; monto: number }> = {};

    for (const v of ventas) {
      const tv = Number(v.totalVenta);
      const tp = Number(v.totalPagado);
      totalVendido += tv;
      totalCobrado += tp;
      totalCredito += tv - tp;
      prendas += v.detalles.reduce((s, d) => s + d.cantidad, 0);

      const key = v.condicionPago || 'CONTADO';
      if (!porCondicion[key]) porCondicion[key] = { cantidad: 0, monto: 0 };
      porCondicion[key].cantidad++;
      porCondicion[key].monto += tv;
    }

    // Abonos de cobranzas cobrados ese mismo día (dinero que también entró a caja)
    const abonos = await this.prisma.abono.findMany({
      where: { fecha: { gte: desde, lte: hasta } },
      select: { monto: true, metodoPago: true },
    });
    const porMetodoAbono: Record<string, { cantidad: number; monto: number }> = {};
    let totalAbonos = 0;
    for (const a of abonos) {
      const m = Number(a.monto);
      totalAbonos += m;
      const key = a.metodoPago || 'OTRO';
      if (!porMetodoAbono[key]) porMetodoAbono[key] = { cantidad: 0, monto: 0 };
      porMetodoAbono[key].cantidad++;
      porMetodoAbono[key].monto += m;
    }

    return {
      fecha: desde.toISOString().slice(0, 10),
      resumen: {
        numeroVentas: ventas.length,
        prendasVendidas: prendas,
        totalVendido: totalVendido.toFixed(2),
        totalCobrado: totalCobrado.toFixed(2),
        totalCredito: totalCredito.toFixed(2),
        totalAbonosCobranzas: totalAbonos.toFixed(2),
        totalEnCaja: (totalCobrado + totalAbonos).toFixed(2),
      },
      porCondicion,
      porMetodoAbono,
      ventas: ventas.map((v) => ({
        id: v.id,
        correlativo: v.correlativo,
        hora: v.fecha,
        cliente: v.clienteNombre,
        bodega: v.bodega?.nombre,
        condicionPago: v.condicionPago,
        estadoPago: v.estadoPago,
        totalVenta: Number(v.totalVenta).toFixed(2),
        totalPagado: Number(v.totalPagado).toFixed(2),
      })),
    };
  }

  // Busca una venta por su correlativo (para la pantalla de devoluciones)
  async buscarVentaPorCorrelativo(correlativo: string) {
    const venta = await this.prisma.venta.findFirst({
      where: { correlativo: { equals: correlativo.trim(), mode: 'insensitive' } },
      include: { detalles: { include: { producto: { select: { nombre: true } } } }, cliente: true },
    });
    if (!venta) throw new BadRequestException('No se encontró una venta con ese código.');
    return venta;
  }

  private async generarCorrelativo(tx: any): Promise<string> {
    const ultima = await tx.venta.findFirst({
      orderBy: { id: 'desc' },
      select: { correlativo: true },
    });

    let siguiente = 1;
    if (ultima?.correlativo) {
      const match = ultima.correlativo.match(/(\d+)$/);
      if (match) siguiente = parseInt(match[1], 10) + 1;
    }

    return `VEN-${String(siguiente).padStart(6, '0')}`;
  }
}