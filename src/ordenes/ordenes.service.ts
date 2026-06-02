import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KardexService } from '../kardex/kardex.service';
import { InsumoKardexService } from '../kardex/insumo-kardex.service';

@Injectable()
export class OrdenesService {
  constructor(
    private prisma: PrismaService,
    private kardex: KardexService,
    private insumoKardex: InsumoKardexService,
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
            create: dto.servicios.map((s, index) => ({
              tipoServicio: s.tipo,
              tallerId: s.tallerId,
              costoUnitarioPactado: s.costoPactado,
              ordenSecuencia: s.ordenSecuencia ?? index + 1,
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

        await this.insumoKardex.registrarSalida(tx, {
          insumoId: item.insumoId,
          cantidad: totalADescontar,
          costoUnitario: Number(item.insumo.costoUnitario),
          motivo: `Consumo OP - ${dto.codigoOp}`,
          tipoMovimiento: 'SALIDA',
          referenciaId: orden.id,
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

        const recetaConCosto = await tx.productoBom.findMany({
          where: { productoId: orden.productoId },
          include: { insumo: true },
        });

        for (const item of recetaConCosto) {
          const consumoPorPrenda =
            Number(item.cantidadRequerida) *
            (1 + Number(item.mermaEstimadaPct || 0) / 100);
          const totalDevolver = consumoPorPrenda * totalPrendas;

          await this.insumoKardex.registrarIngreso(tx, {
            insumoId: item.insumoId,
            cantidad: totalDevolver,
            costoUnitario: Number(item.insumo.costoUnitario),
            motivo: `Devolución por anulación OP - ${orden.codigoOp}`,
            tipoMovimiento: 'DEVOLUCION',
            referenciaId: orden.id,
          });
        }
      }

      // 🟢 NOTA: El ingreso de prendas al almacén y el recálculo de costo real
      // YA NO ocurren aquí. Ahora se hacen en recepcionar() (Recepción de Taller),
      // que registra Buenas/Lavado/Falla por variante. Así evitamos duplicar stock.
      // Este método solo cambia el estado (Anular devuelve insumos arriba).

      // Actualizamos el estado visual en la DB
      return tx.ordenProduccion.update({
        where: { id },
        data: { estado },
      });
    });
  }

  // ====================================================================
  // 5. BUSCAR ORDEN POR CÓDIGO (para la pantalla de Recepción de Taller)
  // ====================================================================
  async buscarPorCodigo(codigo: string) {
    const orden = await this.prisma.ordenProduccion.findUnique({
      where: { codigoOp: codigo },
      include: {
        producto: true,
        detallesMatriz: true,
        rutas: { include: { taller: true }, orderBy: { ordenSecuencia: 'asc' } },
        costeoFinal: true,
      },
    });

    if (!orden) {
      throw new BadRequestException(`No existe la Orden de Producción "${codigo}".`);
    }
    if (orden.estado === 'Terminada') {
      throw new BadRequestException(`La orden "${codigo}" ya fue recepcionada/terminada.`);
    }
    if (orden.estado === 'Anulada') {
      throw new BadRequestException(`La orden "${codigo}" está anulada.`);
    }
    return orden;
  }

  // ====================================================================
  // 6. RECEPCIONAR DESDE TALLER (ESCANEO CON PISTOLA, 3 CLASIFICACIONES)
  // ====================================================================
  // Por variante (color/talla) se cuenta cuántas prendas son:
  //   - Buenas    -> ingresan al almacén destino (stock vendible)
  //   - Falla     -> ingresan a la bodega de Merma (si existe)
  //   - Derivar   -> NO entran al almacén; se envían de vuelta a otro
  //                  taller/lavado (se genera una Guía de Salida).
  // El costo real por prenda = inversión total / prendas aprovechables
  // (buenas + derivadas, porque ambas terminarán siendo producto vendible).
  // Si quedan prendas derivadas, la orden sigue ABIERTA (vuelve "En Proceso")
  // para poder recepcionar el resto cuando regresen; si no, se marca Terminada.
  // ====================================================================
  async recepcionar(id: number, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const orden = await tx.ordenProduccion.findUnique({
        where: { id },
        include: { detallesMatriz: true, costeoFinal: true },
      });

      if (!orden) throw new BadRequestException('Orden no encontrada.');
      if (orden.estado === 'Terminada')
        throw new BadRequestException('Esta orden ya fue recepcionada.');

      const items = Array.isArray(dto.items) ? dto.items : [];
      if (items.length === 0)
        throw new BadRequestException('No se enviaron prendas para recepcionar.');

      // Normalizamos y sumamos
      let totalBuenas = 0;
      let totalFalla = 0;
      let totalDerivar = 0;
      const normalizados = items.map((it: any) => {
        const buenas = Number(it.cantidadBuena) || 0;
        const falla = Number(it.cantidadFalla) || 0;
        const derivar = Number(it.cantidadDerivar) || 0;
        totalBuenas += buenas;
        totalFalla += falla;
        totalDerivar += derivar;
        return { color: String(it.color), talla: String(it.talla), buenas, falla, derivar };
      });

      const totalRecibido = totalBuenas + totalFalla + totalDerivar;
      if (totalRecibido <= 0) {
        throw new BadRequestException('Debes registrar al menos una prenda escaneada.');
      }

      const totalProgramado = orden.detallesMatriz.reduce(
        (sum, d) => sum + Number(d.cantidadProgramada),
        0,
      );

      // 🔥 COSTO REAL: la inversión total se reparte entre las prendas aprovechables
      // (buenas + derivadas). Si todo fue merma, se reparte entre lo recibido.
      const aprovechables = totalBuenas + totalDerivar;
      const divisorCosto = aprovechables > 0 ? aprovechables : totalRecibido;

      let costoRealUnitario = 0;
      if (orden.costeoFinal) {
        const inversionTotal =
          Number(orden.costeoFinal.costoTotalUnitarioNeto) * totalProgramado;
        costoRealUnitario = inversionTotal / divisorCosto;

        const margenMay = Number(orden.costeoFinal.margenMayorista);
        const margenMin = Number(orden.costeoFinal.margenMinorista);

        await tx.ordenCosteoFinal.update({
          where: { ordenId: orden.id },
          data: {
            loteProducidoReal: aprovechables,
            costoTotalUnitarioNeto: costoRealUnitario,
            precioMayorista: costoRealUnitario * (1 + margenMay),
            precioMinorista: costoRealUnitario * (1 + margenMin),
          },
        });
      }

      // Bodega destino para prendas buenas
      let bodegaDestino = dto.bodegaId
        ? await tx.bodega.findUnique({ where: { id: Number(dto.bodegaId) } })
        : null;
      if (!bodegaDestino) {
        bodegaDestino = await tx.bodega.findFirst({
          where: { estado: true, tipo: { not: 'Merma' } },
        });
      }
      if (!bodegaDestino) {
        throw new BadRequestException(
          'No se encontró una bodega activa para guardar las prendas buenas.',
        );
      }

      // Bodega de merma (opcional): solo si existe una de tipo 'Merma'
      const bodegaMerma = await tx.bodega.findFirst({
        where: { estado: true, tipo: 'Merma' },
      });

      // Ingresamos por variante: buenas -> almacén, falla -> merma
      for (const v of normalizados) {
        if (v.buenas > 0) {
          await this.kardex.registrarIngreso(tx, {
            productoId: orden.productoId,
            color: v.color,
            talla: v.talla,
            bodegaId: bodegaDestino.id,
            cantidad: v.buenas,
            costoUnitario: costoRealUnitario,
            motivo: `Recepción taller - ${orden.codigoOp}`,
            tipoMovimiento: 'INGRESO',
            referenciaId: orden.id,
            actualizarStockFisico: true,
          });
        }
        if (v.falla > 0 && bodegaMerma) {
          await this.kardex.registrarIngreso(tx, {
            productoId: orden.productoId,
            color: v.color,
            talla: v.talla,
            bodegaId: bodegaMerma.id,
            cantidad: v.falla,
            costoUnitario: costoRealUnitario,
            motivo: `Merma recepción - ${orden.codigoOp}`,
            tipoMovimiento: 'MERMA',
            referenciaId: orden.id,
            actualizarStockFisico: true,
          });
        }
      }

      // DERIVADAS: no entran al almacén. Si se eligió un taller destino,
      // generamos una Guía de Salida para reenviarlas a re-proceso.
      let guiaDerivacion: string | null = null;
      if (totalDerivar > 0 && dto.derivarTallerId) {
        const taller = await tx.proveedorTaller.findUnique({
          where: { id: Number(dto.derivarTallerId) },
        });
        if (!taller) throw new BadRequestException('El taller de derivación no existe.');

        const correlativo = `DER-${Date.now().toString().slice(-6)}`;
        await tx.guiaServicio.create({
          data: {
            correlativo,
            tipoGuia: 'Salida',
            estado: 'En Transito',
            ordenId: orden.id,
            tallerId: taller.id,
            detalles: {
              create: normalizados
                .filter((v) => v.derivar > 0)
                .map((v) => ({
                  color: v.color,
                  talla: v.talla,
                  cantidadEnviada: v.derivar,
                })),
            },
          },
        });
        guiaDerivacion = correlativo;
      }

      // Estado: si quedan prendas derivadas (en re-proceso), la orden sigue abierta;
      // si no, se finaliza.
      const nuevoEstado = totalDerivar > 0 ? 'En Proceso' : 'Terminada';
      await tx.ordenProduccion.update({
        where: { id },
        data: { estado: nuevoEstado },
      });

      return {
        mensaje:
          totalDerivar > 0
            ? 'Recepción registrada. Quedan prendas derivadas a re-proceso (orden sigue abierta).'
            : 'Recepción registrada y orden finalizada.',
        codigoOp: orden.codigoOp,
        prendasBuenas: totalBuenas,
        prendasMerma: totalFalla,
        prendasDerivadas: totalDerivar,
        mermaRegistrada: totalFalla > 0 ? (bodegaMerma ? 'Sí' : 'No hay bodega de Merma') : 'N/A',
        guiaDerivacion: guiaDerivacion || (totalDerivar > 0 ? 'Sin taller asignado (solo registro)' : null),
        costoRealUnitario: Number(costoRealUnitario.toFixed(4)),
        bodegaDestino: bodegaDestino.nombre,
        estadoOrden: nuevoEstado,
      };
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