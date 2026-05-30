import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KardexService } from '../kardex/kardex.service';

@Injectable()
export class OrdenesService {
  constructor(
    private prisma: PrismaService,
    private kardex: KardexService,
  ) {}

  // ====================================================================
  // 1. CREAR ORDEN, DESCONTAR INSUMOS Y CALCULAR COSTO *ESTIMADO*
  // ====================================================================
  // CAMBIOS vs versión anterior:
  //  - Valida que el lote no sea 0 (evita división por cero -> Infinity).
  //  - Lee márgenes que vengan del frontend (slider de la calculadora);
  //    si no vienen, usa los valores por defecto del schema (0.35 / 0.70).
  //  - El costo calculado aquí es ESTIMADO (usa cantidad programada).
  //    El costo REAL se recalcula al marcar la orden como "Terminada".
  // ====================================================================
  async create(dto: any) {
    return this.prisma.$transaction(async (tx) => {

      // 1. Crear la cabecera de la OP y sus rutas/gastos
      const orden = await tx.ordenProduccion.create({
        data: {
          codigoOp: dto.codigoOp,
          productoId: dto.productoId,
          estado: 'En Proceso',
          rutas: {
            create: dto.servicios.map((s) => ({
              tipoServicio: s.tipo,
              tallerId: s.tallerId,
              costoUnitarioPactado: s.costoPactado,
              ordenSecuencia: 1,
            })),
          },
          gastosCif: {
            create: dto.cif.map((c) => ({
              concepto: c.concepto,
              costoTotal: c.costoTotal,
            })),
          },
        },
      });

      // 2. Filtrar la matriz (solo guardar las tallas mayores a 0)
      const matrizValida = Object.entries(dto.matriz).filter(
        ([_, cant]) => Number(cant) > 0,
      );
      let totalPrendasAFabricar = 0;

      // 3. Preparar la data para guardar masivamente
      const detallesData: any[] = matrizValida.map(([key, cant]) => {
        const [colorNombre, tallaNombre] = key.split('-');
        totalPrendasAFabricar += Number(cant);

        return {
          ordenId: orden.id,
          color: colorNombre,
          talla: tallaNombre,
          cantidadProgramada: Number(cant),
        };
      });

      // 🛡️ BLINDAJE: una orden sin prendas no tiene sentido y rompería el costeo
      if (totalPrendasAFabricar <= 0) {
        throw new BadRequestException(
          'La orden no tiene prendas programadas (la matriz de tallas está vacía).',
        );
      }

      // Guardar todo de golpe
      await tx.ordenDetalleMatriz.createMany({ data: detallesData });

      // 4. Extraer Ficha Técnica y descontar stock de insumos (avíos)
      const receta = await tx.productoBom.findMany({
        where: { productoId: dto.productoId },
        include: { insumo: true },
      });

      if (receta.length === 0)
        throw new BadRequestException('El producto no tiene Ficha Técnica (BOM).');

      let costoTotalInsumosPorPrenda = 0;

      for (const item of receta) {
        const cantReq = Number(item.cantidadRequerida);
        const merma = Number(item.mermaEstimadaPct || 0);
        const consumoPorPrenda = cantReq * (1 + merma / 100);

        costoTotalInsumosPorPrenda +=
          consumoPorPrenda * Number(item.insumo.costoUnitario);

        const totalADescontar = consumoPorPrenda * totalPrendasAFabricar;
        const stockActual = Number(item.insumo.stockActual);

        if (stockActual < totalADescontar) {
          throw new BadRequestException(
            `Falta stock de ${item.insumo.nombre}. Necesitas ${totalADescontar.toFixed(2)} pero hay ${stockActual}.`,
          );
        }

        await tx.insumo.update({
          where: { id: item.insumoId },
          data: { stockActual: stockActual - totalADescontar },
        });
      }

      // 5. Cálculos Financieros (ESTIMADOS, sobre cantidad programada)
      const costoServiciosUnitario = dto.servicios.reduce(
        (sum, s) => sum + Number(s.costoPactado),
        0,
      );
      const totalGastoCif = dto.cif.reduce(
        (sum, c) => sum + Number(c.costoTotal),
        0,
      );
      const cifUnitario = totalGastoCif / totalPrendasAFabricar;

      const costoFinalNetoUnitario =
        costoTotalInsumosPorPrenda + costoServiciosUnitario + cifUnitario;

      // 6. MÁRGENES CONFIGURABLES (vienen del slider de la calculadora)
      //    Se aceptan tanto en formato 0.40 como en formato 40 (porcentaje).
      const margenMayorista = this.normalizarMargen(dto.margenMayorista, 0.35);
      const margenMinorista = this.normalizarMargen(dto.margenMinorista, 0.70);

      const igvFactor = 1.18;
      const precioMayoristaNeto = costoFinalNetoUnitario * (1 + margenMayorista);
      const precioMinoristaNeto = costoFinalNetoUnitario * (1 + margenMinorista);

      await tx.ordenCosteoFinal.create({
        data: {
          ordenId: orden.id,
          loteProducidoReal: totalPrendasAFabricar, // estimado por ahora; se corrige al terminar
          costoTotalUnitarioNeto: costoFinalNetoUnitario,
          margenMayorista: margenMayorista,
          margenMinorista: margenMinorista,
          precioMayorista: precioMayoristaNeto,
          precioMinorista: precioMinoristaNeto,
        },
      });

      return {
        mensaje: 'Orden procesada con éxito (costo ESTIMADO)',
        ordenId: orden.id,
        codigo: orden.codigoOp,
        costoUnitario: costoFinalNetoUnitario,
        totalInversion: costoFinalNetoUnitario * totalPrendasAFabricar,
        desglose: {
          insumos: costoTotalInsumosPorPrenda,
          manoDeObra: costoServiciosUnitario,
          cif: cifUnitario,
        },
        comercial: {
          margenMayorista,
          margenMinorista,
          mayoristaNeto: precioMayoristaNeto,
          mayoristaConIgv: precioMayoristaNeto * igvFactor,
          minoristaNeto: precioMinoristaNeto,
          minoristaConIgv: precioMinoristaNeto * igvFactor,
          igvMontoMayorista: precioMayoristaNeto * 0.18,
        },
      };
    });
  }

  // ====================================================================
  // 2. LISTAR TODAS LAS ÓRDENES
  // ====================================================================
  async findAll() {
    return this.prisma.ordenProduccion.findMany({
      include: {
        producto: true,
        costeoFinal: true,
      },
      orderBy: {
        fechaInicio: 'desc',
      },
    });
  }

  // ====================================================================
  // 3. BUSCAR UNA ORDEN ESPECÍFICA
  // ====================================================================
  async findOne(id: number) {
    return this.prisma.ordenProduccion.findUnique({
      where: { id: id },
      include: {
        producto: true,
        detallesMatriz: true,
        rutas: {
          include: { taller: true },
        },
        gastosCif: true,
        costeoFinal: true,
      },
    });
  }

  // ====================================================================
  // 4. ACTUALIZAR ESTADO (con recálculo de COSTO REAL al terminar)
  // ====================================================================
  // El frontend ahora puede mandar, además del estado:
  //   - cantidadRealProducida: número de prendas BUENAS que de verdad salieron.
  //   - (opcional) margenMayorista / margenMinorista, por si se reajusta al cerrar.
  // ====================================================================
  async actualizarEstado(id: number, estado: string, extra?: any) {
    return this.prisma.$transaction(async (tx) => {
      const orden = await tx.ordenProduccion.findUnique({
        where: { id },
        include: { detallesMatriz: true, costeoFinal: true },
      });

      if (!orden) throw new BadRequestException('Orden no encontrada');
      if (orden.estado === estado) return orden;

      // 🔴 CASO 1: ANULAR ORDEN -> DEVOLVER INSUMOS A ALMACÉN
      if (orden.estado === 'En Proceso' && estado === 'Anulada') {
        const totalPrendas = orden.detallesMatriz.reduce(
          (sum, d) => sum + Number(d.cantidadProgramada),
          0,
        );

        const receta = await tx.productoBom.findMany({
          where: { productoId: orden.productoId },
        });

        for (const item of receta) {
          const consumoPorPrenda =
            Number(item.cantidadRequerida) *
            (1 + Number(item.mermaEstimadaPct || 0) / 100);
          const totalDevolver = consumoPorPrenda * totalPrendas;

          await tx.insumo.update({
            where: { id: item.insumoId },
            data: { stockActual: { increment: totalDevolver } },
          });
        }
      }

      // 🟢 CASO 2: TERMINAR ORDEN -> RECALCULAR COSTO REAL + INGRESAR A ALMACÉN
      if (orden.estado === 'En Proceso' && estado === 'Terminada') {

        const totalProgramado = orden.detallesMatriz.reduce(
          (sum, d) => sum + Number(d.cantidadProgramada),
          0,
        );

        // 👉 Cantidad REAL de prendas buenas (la ingresa el usuario al cerrar).
        //    Si no la manda, asumimos que salió todo lo programado.
        const cantidadRealProducida =
          extra?.cantidadRealProducida != null
            ? Number(extra.cantidadRealProducida)
            : totalProgramado;

        if (cantidadRealProducida <= 0) {
          throw new BadRequestException(
            'La cantidad real producida debe ser mayor a 0 para cerrar la orden.',
          );
        }
        if (cantidadRealProducida > totalProgramado) {
          throw new BadRequestException(
            `La cantidad real (${cantidadRealProducida}) no puede superar lo programado (${totalProgramado}).`,
          );
        }

        // 🔥 RECÁLCULO DEL COSTO REAL
        // La inversión total (insumos + mano de obra + CIF) se reparte ahora
        // entre las prendas que DE VERDAD salieron buenas, no entre las programadas.
        let costoRealUnitario = 0;
        if (orden.costeoFinal) {
          const inversionTotal =
            Number(orden.costeoFinal.costoTotalUnitarioNeto) * totalProgramado;

          costoRealUnitario = inversionTotal / cantidadRealProducida;

          // Márgenes: se respetan los guardados, salvo que el usuario los reajuste al cerrar.
          const margenMay =
            extra?.margenMayorista != null
              ? this.normalizarMargen(extra.margenMayorista, 0.35)
              : Number(orden.costeoFinal.margenMayorista);
          const margenMin =
            extra?.margenMinorista != null
              ? this.normalizarMargen(extra.margenMinorista, 0.70)
              : Number(orden.costeoFinal.margenMinorista);

          await tx.ordenCosteoFinal.update({
            where: { ordenId: orden.id },
            data: {
              loteProducidoReal: cantidadRealProducida,
              costoTotalUnitarioNeto: costoRealUnitario,
              margenMayorista: margenMay,
              margenMinorista: margenMin,
              precioMayorista: costoRealUnitario * (1 + margenMay),
              precioMinorista: costoRealUnitario * (1 + margenMin),
            },
          });
        }

        // Ingreso de productos terminados al almacén (bodega activa)
        const bodegaPrincipal = await tx.bodega.findFirst({
          where: { estado: true },
        });

        if (!bodegaPrincipal) {
          throw new BadRequestException(
            'No se encontró ninguna Bodega activa para guardar los productos. Crea una bodega primero.',
          );
        }

        // 🔥 KARDEX VALORIZADO: el ingreso se reparte por variante (color/talla).
        // Repartimos las prendas BUENAS proporcionalmente a lo programado de cada
        // variante, para no inventar de qué talla salió cada falla. La última
        // variante recibe el ajuste de redondeo para que el total cuadre exacto.
        const variantes = orden.detallesMatriz;
        let prendasRepartidas = 0;
        for (let i = 0; i < variantes.length; i++) {
          const detalle = variantes[i];
          const progVariante = Number(detalle.cantidadProgramada);

          let cantidadVariante: number;
          if (i === variantes.length - 1) {
            // última variante: recibe el resto para cuadrar el total exacto
            cantidadVariante = cantidadRealProducida - prendasRepartidas;
          } else {
            cantidadVariante = Math.round(
              (progVariante / totalProgramado) * cantidadRealProducida,
            );
          }
          prendasRepartidas += cantidadVariante;

          if (cantidadVariante <= 0) continue;

          await this.kardex.registrarIngreso(tx, {
            productoId: orden.productoId,
            color: (detalle as any).color,
            talla: (detalle as any).talla,
            bodegaId: bodegaPrincipal.id,
            cantidad: cantidadVariante,
            costoUnitario: costoRealUnitario, // 🔥 costo REAL por prenda
            motivo: `Producción terminada - ${orden.codigoOp}`,
            tipoMovimiento: 'INGRESO',
            referenciaId: orden.id,
            actualizarStockFisico: true, // actualiza InventarioTerminado
          });
        }
      }

      // Actualizamos el estado visual en la DB
      return tx.ordenProduccion.update({
        where: { id },
        data: { estado },
      });
    });
  }

  // ====================================================================
  // AYUDANTE: acepta el margen como 0.40 o como 40 y lo deja en 0.40
  // ====================================================================
  private normalizarMargen(valor: any, porDefecto: number): number {
    if (valor == null || valor === '') return porDefecto;
    const n = Number(valor);
    if (isNaN(n) || n < 0) return porDefecto;
    // Si mandan 40, 70, 150 -> lo tratamos como porcentaje y dividimos /100
    return n > 3 ? n / 100 : n;
  }
}